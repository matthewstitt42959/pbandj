import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDMPrompt } from './dmPrompt.js';
import { buildPlayerPrompt } from './playerPrompt.js';
import { parseWorldFacts } from './parseWorldFacts.js';
import { createHmac } from 'crypto';
import { getProvider, listProviders } from './providers/index.js';
import prisma from './prisma.js';
import { requireAuth } from './auth-middleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// --- AI DM auth ---
function makeToken(password) {
  const secret = process.env.SESSION_SECRET || 'pbandj-secret';
  return createHmac('sha256', secret).update(password).digest('hex');
}

function validateAiToken(token) {
  const password = process.env.AI_DM_PASSWORD;
  if (!password) return true; // no lock configured — open access
  if (!token) return false;
  return token === makeToken(password);
}

function requireAiAuth(req, res, next) {
  if (!process.env.AI_DM_PASSWORD) return next();
  if (!validateAiToken(req.headers['x-ai-token'])) {
    return res.status(401).json({ error: 'AI DM requires authentication', code: 'UNAUTHORIZED' });
  }
  next();
}

if (!isProduction) {
  app.use(cors());
}
app.use(express.json({ limit: '1mb' }));

function buildUserPrompt(posts) {
  const recent = (posts ?? []).slice(-8);
  const lastPlayerPosts = recent.filter(p => p.type !== 'dm');

  if (lastPlayerPosts.length === 0) {
    return 'Start the session. Set the opening scene — vivid but brief. End somewhere that makes them want to act.';
  }

  const actionLines = lastPlayerPosts
    .map(p => `${p.author}: "${p.content}"`)
    .join('\n');

  return `The party just acted:\n${actionLines}\n\nWrite the DM response. React directly to what they did. Match their energy — short posts get short responses. Do not contradict or override any player action.`;
}

// --- Custom auth (email + password) ---
const JWT_SECRET = process.env.SESSION_SECRET || 'pbandj-secret';

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, username, displayName } = req.body;
  if (!email || !password || !username || !displayName) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscores)' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: email.trim().toLowerCase(), password: hash, username: cleanUsername, displayName: displayName.trim() },
    });
    res.status(201).json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `That ${field} is already in use` });
    }
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed — please try again' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed — please try again' });
  }
});

// --- AI DM paywall unlock ---
app.post('/api/auth/unlock', (req, res) => {
  const password = process.env.AI_DM_PASSWORD;
  if (!password) return res.json({ token: 'open' }); // no lock
  if (req.body.password !== password) {
    return res.status(401).json({ error: 'Incorrect access code' });
  }
  res.json({ token: makeToken(password) });
});

app.post('/api/dm/respond', requireAiAuth, async (req, res) => {
  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!provider.isConfigured()) {
    return res.status(503).json({
      error: `No API key configured. Add ${provider.envKey} to your .env file.`,
      provider: provider.id,
    });
  }

  const { campaign, posts, characters, worldFacts } = req.body;

  try {
    const wikiEntries = await prisma.wikiEntry.findMany({ orderBy: [{ category: 'asc' }, { title: 'asc' }] });
    const { raw } = await provider.generateDMResponse({
      systemPrompt: buildDMPrompt({ campaign, posts, characters, worldFacts, wikiEntries }),
      userPrompt: buildUserPrompt(posts),
    });

    const { narrative, facts } = parseWorldFacts(raw);
    res.json({ narrative, facts, provider: provider.id });
  } catch (err) {
    console.error(`DM API error (${provider.id}):`, err.message);
    res.status(502).json({ error: err.message, provider: provider.id });
  }
});

app.post('/api/player/respond', requireAiAuth, async (req, res) => {
  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!provider.isConfigured()) {
    return res.status(503).json({
      error: `No API key configured. Add ${provider.envKey} to your .env file.`,
      provider: provider.id,
    });
  }

  const { character, campaign, posts, characters, worldFacts } = req.body;

  try {
    const { raw } = await provider.generateDMResponse({
      systemPrompt: buildPlayerPrompt({ character, campaign, posts, characters, worldFacts }),
      userPrompt: `It is ${character.name}'s turn. What does ${character.name} do or say?`,
    });

    res.json({ action: raw.trim(), provider: provider.id });
  } catch (err) {
    console.error(`Player API error (${provider.id}):`, err.message);
    res.status(502).json({ error: err.message, provider: provider.id });
  }
});

app.get('/api/game', async (_req, res) => {
  try {
    const game = await prisma.game.findUnique({ where: { id: 'singleton' } });
    res.json({ state: game?.state ?? null });
  } catch (err) {
    console.error('Game load error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/game', async (req, res) => {
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: 'Missing state' });
  try {
    await prisma.game.upsert({
      where: { id: 'singleton' },
      update: { state },
      create: { id: 'singleton', state },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Game save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- User profile endpoints ---

app.get('/api/users/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser.id },
      include: { characters: { orderBy: { createdAt: 'desc' } } },
    });
    if (!user) return res.status(404).json({ error: 'Profile not found' });
    res.json(user);
  } catch (err) {
    console.error('GET /api/users/me error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/me', requireAuth, async (req, res) => {
  const { username, displayName } = req.body;
  if (!username || !displayName) {
    return res.status(400).json({ error: 'username and displayName are required' });
  }
  try {
    const user = await prisma.user.create({
      data: { id: req.authUser.id, email: req.authUser.email, username, displayName },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username already taken — please choose another' });
    }
    console.error('POST /api/users/me error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Character endpoints ---

app.get('/api/characters', requireAuth, async (req, res) => {
  try {
    const characters = await prisma.character.findMany({
      where: { userId: req.authUser.id },
      orderBy: [{ isRetired: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(characters);
  } catch (err) {
    console.error('GET /api/characters error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/characters/:id', requireAuth, async (req, res) => {
  try {
    const character = await prisma.character.findFirst({
      where: { id: req.params.id, userId: req.authUser.id },
    });
    if (!character) return res.status(404).json({ error: 'Character not found' });
    res.json(character);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters', requireAuth, async (req, res) => {
  const { name, species, class: charClass, background, backstory,
    level, abilityScores, hp, maxHp, ac, skills } = req.body;

  if (!name || !species || !charClass || !background || !abilityScores || hp == null || maxHp == null) {
    return res.status(400).json({ error: 'Missing required character fields' });
  }

  // Enforce 2-character limit
  const activeCount = await prisma.character.count({
    where: { userId: req.authUser.id, isRetired: false },
  });
  if (activeCount >= 2) {
    return res.status(409).json({ error: 'You can have at most 2 active characters. Retire one first.' });
  }

  try {
    const character = await prisma.character.create({
      data: {
        userId: req.authUser.id,
        name, species,
        class: charClass,
        background, backstory,
        level: level ?? 1,
        abilityScores,
        hp, maxHp,
        ac: ac ?? 10,
        skills: skills ?? {},
        inventory: [],
        spells: [],
        conditions: [],
      },
    });
    res.status(201).json(character);
  } catch (err) {
    console.error('POST /api/characters error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/characters/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.character.findFirst({
      where: { id: req.params.id, userId: req.authUser.id },
    });
    if (!existing) return res.status(404).json({ error: 'Character not found' });

    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/characters/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters/:id/retire', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.character.findFirst({
      where: { id: req.params.id, userId: req.authUser.id },
    });
    if (!existing) return res.status(404).json({ error: 'Character not found' });

    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: { isRetired: true, retiredAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    console.error('POST /api/characters/:id/retire error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters/:id/assign', requireAuth, async (req, res) => {
  const { campaignId } = req.body;
  try {
    const existing = await prisma.character.findFirst({
      where: { id: req.params.id, userId: req.authUser.id },
    });
    if (!existing) return res.status(404).json({ error: 'Character not found' });
    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: { campaignId: campaignId ?? 'singleton' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const HIT_DICE = {
  barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
  monk: 8, cleric: 8, druid: 8, rogue: 8, warlock: 8, bard: 8,
  sorcerer: 6, wizard: 6,
};
function serverHitDie(cls) { return HIT_DICE[cls?.toLowerCase()] ?? 8; }

// DM-only: level up all characters currently assigned to the campaign
app.post('/api/campaign/levelup', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') {
    return res.status(403).json({ error: 'DM access required' });
  }
  try {
    const assigned = await prisma.character.findMany({
      where: { campaignId: { not: null }, isRetired: false },
    });
    const updates = await Promise.all(
      assigned.map(async (char) => {
        const hitDie = serverHitDie(char.class);
        const conScore = char.abilityScores?.con ?? 10;
        const conMod = Math.floor((conScore - 10) / 2);
        const gain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
        return prisma.character.update({
          where: { id: char.id },
          data: { level: char.level + 1, maxHp: char.maxHp + gain, hp: char.hp + gain },
        });
      })
    );
    res.json({ leveled: updates.length, characters: updates });
  } catch (err) {
    console.error('Level up error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters/:id/unassign', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.character.findFirst({
      where: { id: req.params.id, userId: req.authUser.id },
    });
    if (!existing) return res.status(404).json({ error: 'Character not found' });
    const updated = await prisma.character.update({
      where: { id: req.params.id },
      data: { campaignId: null },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Campaign endpoints ────────────────────────────────────────────────────────

const CAMPAIGN_SELECT = {
  id: true, name: true, setting: true, openingScene: true,
  hooks: true, npcs: true, dmNotes: true, status: true, isActive: true,
  rejectedNote: true, approvedAt: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, username: true, displayName: true } },
  approvedBy: { select: { id: true, username: true, displayName: true } },
  dm:          { select: { id: true, username: true, displayName: true } },
};

function canEditCampaign(campaign, authUser) {
  if (authUser.role === 'SUPER_DM') return true;
  if (authUser.role === 'DM' && campaign.createdById === authUser.id) return true;
  return false;
}

// Active campaign — public, used by GameContext on load
app.get('/api/campaigns/active', async (_req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { isActive: true },
      select: CAMPAIGN_SELECT,
    });
    res.json(campaign ?? null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate a campaign (SUPER_DM only) — deactivates any currently active one first
app.post('/api/campaigns/:id/activate', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM access required' });
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.status !== 'APPROVED') return res.status(409).json({ error: 'Only APPROVED campaigns can be activated' });

    await prisma.campaign.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { isActive: true },
      select: CAMPAIGN_SELECT,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deactivate (SUPER_DM only)
app.post('/api/campaigns/:id/deactivate', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM access required' });
  try {
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: CAMPAIGN_SELECT,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List — DMs see their own; Super DM sees all
app.get('/api/campaigns', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  try {
    const where = req.authUser.role === 'SUPER_DM' ? {} : { createdById: req.authUser.id };
    const campaigns = await prisma.campaign.findMany({
      where,
      select: CAMPAIGN_SELECT,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single
app.get('/api/campaigns/:id', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      select: { ...CAMPAIGN_SELECT, createdById: true },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (req.authUser.role === 'DM' && campaign.createdById !== req.authUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create
app.post('/api/campaigns', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Campaign name is required' });
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: name.trim(),
        setting: req.body.setting ?? '',
        openingScene: req.body.openingScene ?? '',
        hooks: req.body.hooks ?? [],
        npcs: req.body.npcs ?? [],
        dmNotes: req.body.dmNotes ?? '',
        createdById: req.authUser.id,
        dmId: req.authUser.id,
      },
      select: { ...CAMPAIGN_SELECT, createdById: true },
    });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update (only DRAFT or REJECTED)
app.patch('/api/campaigns/:id', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (!canEditCampaign(existing, req.authUser)) return res.status(403).json({ error: 'Access denied' });
    if (!['DRAFT', 'REJECTED'].includes(existing.status) && req.authUser.role !== 'SUPER_DM') {
      return res.status(409).json({ error: 'Only SUPER_DM can edit a submitted or approved campaign' });
    }
    const { name, setting, openingScene, hooks, npcs, dmNotes } = req.body;
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), setting, openingScene, hooks, npcs, dmNotes },
      select: { ...CAMPAIGN_SELECT, createdById: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit for review
app.post('/api/campaigns/:id/submit', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.createdById !== req.authUser.id && req.authUser.role !== 'SUPER_DM') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
      return res.status(409).json({ error: 'Campaign is already submitted or approved' });
    }
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'PENDING_REVIEW', rejectedNote: null },
      select: CAMPAIGN_SELECT,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve (SUPER_DM only)
app.post('/api/campaigns/:id/approve', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM access required' });
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedById: req.authUser.id, approvedAt: new Date(), rejectedNote: null },
      select: CAMPAIGN_SELECT,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject (SUPER_DM only)
app.post('/api/campaigns/:id/reject', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM access required' });
  const { note } = req.body;
  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectedNote: note ?? null, approvedById: null, approvedAt: null },
      select: CAMPAIGN_SELECT,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign DM to campaign — SUPER_DM can assign anyone; DM can claim their own campaign
app.post('/api/campaigns/:id/assign-dm', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  const { userId } = req.body;
  const targetId = userId ?? req.authUser.id;

  if (req.authUser.role === 'DM' && targetId !== req.authUser.id) {
    return res.status(403).json({ error: 'DMs can only assign themselves' });
  }

  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    if (req.authUser.role === 'DM' && existing.createdById !== req.authUser.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'PLAYER') return res.status(400).json({ error: 'Cannot assign a PLAYER as DM' });

    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { dmId: targetId },
      select: { ...CAMPAIGN_SELECT, createdById: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI generate campaign content
app.post('/api/campaigns/:id/generate', requireAuth, async (req, res) => {
  if (req.authUser.role === 'PLAYER') return res.status(403).json({ error: 'DM access required' });
  let provider;
  try { provider = getProvider(); } catch (err) { return res.status(500).json({ error: err.message }); }
  if (!provider.isConfigured()) return res.status(503).json({ error: 'No AI provider configured' });

  const { prompt } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const existing = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (!canEditCampaign(existing, req.authUser)) return res.status(403).json({ error: 'Access denied' });

    const { raw } = await provider.generateDMResponse({
      systemPrompt: `You are a creative D&D 2024 campaign designer. Given a prompt, generate a rich campaign outline in JSON format with exactly these fields:
{
  "name": "Campaign title",
  "setting": "World/location description (2-3 paragraphs)",
  "openingScene": "The very first scene the players encounter (1-2 paragraphs)",
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "npcs": [{"name": "NPC Name", "description": "Role and personality"}]
}
Return only valid JSON, no markdown, no extra text.`,
      userPrompt: prompt.trim(),
    });

    let generated;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      generated = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return res.status(502).json({ error: 'AI returned invalid JSON — try again or edit manually' });
    }

    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        name: generated.name ?? existing.name,
        setting: generated.setting ?? existing.setting,
        openingScene: generated.openingScene ?? existing.openingScene,
        hooks: generated.hooks ?? existing.hooks,
        npcs: generated.npcs ?? existing.npcs,
      },
      select: { ...CAMPAIGN_SELECT, createdById: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Rules ──────────────────────────────────────────────────────────────────

const DEFAULT_RULES = [
  {
    title: 'Respect Everyone at the Table',
    body: 'Treat every player and the DM with kindness and respect. Real-world insults, harassment, or targeted aggression are not acceptable — in character or out.',
    order: 1,
  },
  {
    title: 'Collaborate, Don\'t Compete',
    body: 'This is a cooperative game. Work together as a party. Stealing from teammates, sabotaging plans, or intentionally disrupting other players\' moments undermines the fun for everyone.',
    order: 2,
  },
  {
    title: 'Share the Spotlight',
    body: 'Every player deserves moments to shine. Be mindful of how much airtime you\'re taking. Encourage quieter players and give space for everyone\'s character to develop.',
    order: 3,
  },
  {
    title: 'Communicate Openly',
    body: 'If something in the game makes you uncomfortable, say so — to the DM privately or to the group. Likewise, celebrate what\'s working. Good communication keeps the game fun for everyone.',
    order: 4,
  },
  {
    title: 'Good Sportsmanship',
    body: 'Accept both success and failure gracefully. Dice don\'t always go your way — that\'s what makes the story interesting. Avoid arguing with DM rulings mid-game; bring concerns up after the session.',
    order: 5,
  },
  {
    title: 'Come Prepared',
    body: 'Know your character\'s abilities, have your sheet up to date, and be ready when it\'s your turn. Showing up prepared is a sign of respect for everyone\'s time.',
    order: 6,
  },
  {
    title: 'What Happens at the Table, Stays There',
    body: 'Campaign secrets, plot twists, and in-game drama belong at the table. Don\'t spoil story moments for absent players, and keep out-of-character knowledge separate from in-character decisions.',
    order: 7,
  },
];

// Seed default rules if the table is empty
async function seedRules() {
  try {
    const count = await prisma.rule.count();
    if (count === 0) {
      await prisma.rule.createMany({ data: DEFAULT_RULES });
      console.log('Seeded default rules.');
    }
  } catch (err) {
    console.warn('Could not seed rules:', err.message);
  }
}

// ── DM Assist (writing helper, not full AI DM) ─────────────────────────────

app.post('/api/dm/assist', requireAuth, async (req, res) => {
  if (!['DM', 'SUPER_DM'].includes(req.authUser.role)) {
    return res.status(403).json({ error: 'DM only' });
  }

  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (!provider.isConfigured()) {
    return res.status(503).json({ error: `No API key configured. Add ${provider.envKey} to your environment.` });
  }

  const { prompt, campaign, posts, characters } = req.body ?? {};
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });

  const recentPosts = (posts ?? [])
    .slice(-6)
    .map(p => `[${p.author}] ${p.content}`)
    .join('\n');

  const partyLine = (characters ?? [])
    .map(c => `${c.name} (${c.class} Lv${c.level})`)
    .join(', ');

  const systemPrompt = `You are a writing assistant helping a Dungeon Master write better tabletop narration. Your job is to give short, immediately usable suggestions — the DM pastes what they want and discards the rest.

Current campaign: ${campaign?.name ?? 'Unknown'}
Scene: ${campaign?.currentScene ?? ''}
Party: ${partyLine || 'Unknown'}

Recent log:
${recentPosts || 'Session just started.'}

Rules:
- Be brief. 1–4 sentences max unless the DM explicitly asks for more.
- Write in the style of a skilled human DM — direct, vivid, a little dry.
- Give the DM something they can use immediately. No caveats, no explanations, just the goods.
- If the request is for NPC dialogue, just write the dialogue.
- If the request is for a scene description, just describe it.
- Do not narrate what the players do — only what the world and NPCs do.`;

  try {
    const { raw } = await provider.generateDMResponse({
      systemPrompt,
      userPrompt: prompt.trim(),
    });
    res.json({ suggestion: raw.trim() });
  } catch (err) {
    console.error('DM assist error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// GET /api/rules — public
app.get('/api/rules', async (_req, res) => {
  try {
    const rules = await prisma.rule.findMany({ orderBy: { order: 'asc' } });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rules — SUPER_DM only
app.post('/api/rules', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM only' });
  const { title, body, order } = req.body ?? {};
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'title and body required' });
  try {
    const maxOrder = await prisma.rule.aggregate({ _max: { order: true } });
    const rule = await prisma.rule.create({
      data: { title: title.trim(), body: body.trim(), order: order ?? (maxOrder._max.order ?? 0) + 1 },
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/rules/:id — SUPER_DM only
app.patch('/api/rules/:id', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM only' });
  const { title, body, order } = req.body ?? {};
  try {
    const rule = await prisma.rule.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(body !== undefined && { body: body.trim() }),
        ...(order !== undefined && { order }),
      },
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rules/:id — SUPER_DM only
app.delete('/api/rules/:id', requireAuth, async (req, res) => {
  if (req.authUser.role !== 'SUPER_DM') return res.status(403).json({ error: 'Super DM only' });
  try {
    await prisma.rule.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin (SUPER_DM only) ---

function requireSuperDM(req, res, next) {
  if (req.authUser?.role !== 'SUPER_DM') return res.status(403).json({ error: 'Forbidden' });
  next();
}

function generateTempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

app.get('/api/admin/users', requireAuth, requireSuperDM, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, displayName: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
});

app.patch('/api/admin/users/:id/role', requireAuth, requireSuperDM, async (req, res) => {
  const { role } = req.body;
  if (!['PLAYER', 'DM', 'SUPER_DM'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id === req.authUser.userId) return res.status(400).json({ error: 'Cannot change your own role' });
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, username: true, displayName: true, role: true, createdAt: true },
  });
  res.json({ user });
});

app.patch('/api/admin/users/:id/password', requireAuth, requireSuperDM, async (req, res) => {
  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { password: hash } });
  res.json({ tempPassword });
});

// ── Wiki ──────────────────────────────────────────────────────────────────────

function requireDM(req, res, next) {
  if (req.authUser?.role === 'DM' || req.authUser?.role === 'SUPER_DM') return next();
  return res.status(403).json({ error: 'DM access required' });
}

app.get('/api/wiki', async (_req, res) => {
  const entries = await prisma.wikiEntry.findMany({ orderBy: [{ category: 'asc' }, { title: 'asc' }] });
  res.json(entries);
});

app.post('/api/wiki', requireAuth, requireDM, async (req, res) => {
  const { title, category, content } = req.body;
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Title and content required' });
  const entry = await prisma.wikiEntry.create({
    data: { title: title.trim(), category: (category || 'General').trim(), content: content.trim() },
  });
  res.status(201).json(entry);
});

app.patch('/api/wiki/:id', requireAuth, requireDM, async (req, res) => {
  const { title, category, content } = req.body;
  const entry = await prisma.wikiEntry.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(category !== undefined && { category: category.trim() }),
      ...(content !== undefined && { content: content.trim() }),
    },
  });
  res.json(entry);
});

app.delete('/api/wiki/:id', requireAuth, requireDM, async (req, res) => {
  await prisma.wikiEntry.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }

  const aiLocked = !!process.env.AI_DM_PASSWORD;
  const authenticated = validateAiToken(req.headers['x-ai-token']);

  res.json({
    ok: true,
    hasApiKey: provider.isConfigured(),
    aiLocked,
    authenticated,
    provider: provider.id,
    providerName: provider.name,
    model: provider.getModel(),
    envKey: provider.envKey,
    availableProviders: listProviders(),
  });
});

if (isProduction) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  seedRules();
  try {
    const provider = getProvider();
    console.log(`PB & Jay running on port ${PORT}`);
    if (isProduction) {
      console.log('Serving production build from /dist');
    }
    console.log(`AI provider: ${provider.name} (${provider.getModel()})`);
    if (!provider.isConfigured()) {
      console.warn(`Warning: ${provider.envKey} is not set — AI DM will not respond.`);
    }
  } catch (err) {
    console.log(`PB & Jay API running on http://localhost:${PORT}`);
    console.error(err.message);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use.`);
    console.error('Close other PB & Jay terminals, or run:');
    console.error(`  npx kill-port ${PORT}\n`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
