export function parseWorldFacts(text) {
  const facts = [];
  const worldRegex = /\[WORLD:\s*([^|]+)\|\s*([^\]]+)\]/g;
  let match;
  while ((match = worldRegex.exec(text)) !== null) {
    facts.push({ title: match[1].trim(), content: match[2].trim() });
  }
  const narrative = text.replace(worldRegex, '').trim();
  return { narrative, facts };
}
