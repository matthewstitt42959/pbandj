import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDMPrompt } from './dmPrompt.js';
import { parseWorldFacts } from './parseWorldFacts.js';
import { getProvider, listProviders } from './providers/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const isProduction = process.env.NODE_ENV === 'production';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

if (!isProduction) {
  app.use(cors());
}
app.use(express.json({ limit: '1mb' }));

function buildUserPrompt(playerAction) {
  return playerAction
    ? `The player (${playerAction.author}) posts:\n"${playerAction.content}"\n\nRespond as the DM.`
    : 'Begin the adventure. Set the opening scene and invite the party to act.';
}

app.post('/api/dm/respond', async (req, res) => {
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

  const { campaign, posts, characters, worldFacts, playerAction } = req.body;

  try {
    const { raw } = await provider.generateDMResponse({
      systemPrompt: buildDMPrompt({ campaign, posts, characters, worldFacts }),
      userPrompt: buildUserPrompt(playerAction),
    });

    const { narrative, facts } = parseWorldFacts(raw);
    res.json({ narrative, facts, provider: provider.id });
  } catch (err) {
    console.error(`DM API error (${provider.id}):`, err.message);
    res.status(502).json({ error: err.message, provider: provider.id });
  }
});

app.get('/api/health', (_req, res) => {
  let provider;
  try {
    provider = getProvider();
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }

  res.json({
    ok: true,
    hasApiKey: provider.isConfigured(),
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
