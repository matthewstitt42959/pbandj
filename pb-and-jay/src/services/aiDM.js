const API_BASE = '/api';

export async function checkAIStatus() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { ok: false, hasApiKey: false };
    return res.json();
  } catch {
    return { ok: false, hasApiKey: false };
  }
}

export async function requestDMResponse({ campaign, posts, characters, worldFacts, playerAction }) {
  const res = await fetch(`${API_BASE}/dm/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign, posts, characters, worldFacts, playerAction }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'DM request failed');
  return data;
}
