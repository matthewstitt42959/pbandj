const TOKEN_KEY = 'pb-and-jay-ai-token';

export function getAiToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAiToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAiToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function unlockAiDM(password) {
  const res = await fetch('/api/auth/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unlock failed');
  setAiToken(data.token);
  return data.token;
}
