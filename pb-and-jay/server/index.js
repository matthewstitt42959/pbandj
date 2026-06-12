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

function buildUserPrompt(playerAction, allActed, aiActions) {
  if (allActed) {
    const actionLines = aiActions?.length
      ? aiActions.map(a => `${a.character}: ${a.action}`).join('\n')
      : null;
    const actionBlock = actionLines
      ? `The party took the following actions this round:\n\n${actionLines}\n\n`
      : 'All players have taken their turns. ';
    return `${actionBlock}Narrate the outcome of their combined actions in an engaging way, then describe what happens next and invite the party to respond.`;
  }
  return playerAction
    ? `The player (${playerAction.author}) posts:\n"${playerAction.content}"\n\nRespond as the DM.`
    : 'Begin the adventure. Set the opening scene and invite the party to act.';
}

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

  const { campaign, posts, characters, worldFacts, playerAction, allActed, aiActions } = req.body;

  try {
    const { raw } = await provider.generateDMResponse({
      systemPrompt: buildDMPrompt({ campaign, posts, characters, worldFacts }),
      userPrompt: buildUserPrompt(playerAction, allActed, aiActions),
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

app.post('/api/characters', requireAuth, async (req, res) => {
  const { name, species, class: charClass, background, backstory,
    level, abilityScores, hp, maxHp, ac, skills } = req.body;

  if (!name || !species || !charClass || !background || !abilityScores || hp == null || maxHp == null) {
    return res.status(400).json({ error: 'Missing required character fields' });
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
