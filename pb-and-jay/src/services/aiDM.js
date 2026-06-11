import { getAiToken } from './auth.js';

const API_BASE = '/api';

function aiHeaders() {
  const token = getAiToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'X-AI-Token': token } : {}),
  };
}

export async function checkAIStatus() {
  try {
    const res = await fetch(`${API_BASE}/health`, { headers: aiHeaders() });
    if (!res.ok) return { ok: false, hasApiKey: false, aiLocked: false, authenticated: false };
    return res.json();
  } catch {
    return { ok: false, hasApiKey: false, aiLocked: false, authenticated: false };
  }
}

export async function requestDMResponse({ campaign, posts, characters, worldFacts, playerAction, allActed, aiActions }) {
  const res = await fetch(`${API_BASE}/dm/respond`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({ campaign, posts, characters, worldFacts, playerAction, allActed, aiActions }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'DM request failed');
  return data;
}

export async function requestPlayerResponse({ character, campaign, posts, characters, worldFacts }) {
  const res = await fetch(`${API_BASE}/player/respond`, {
    method: 'POST',
    headers: aiHeaders(),
    body: JSON.stringify({ character, campaign, posts, characters, worldFacts }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Player request failed');
  return data;
}
