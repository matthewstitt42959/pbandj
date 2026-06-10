export function buildDMPrompt({ campaign, posts, characters, worldFacts }) {
  const characterSummary = characters
    .map(
      (c) =>
        `${c.name} (Level ${c.level} ${c.class}, HP ${c.hp.current}/${c.hp.max}, AC ${c.ac})`
    )
    .join('\n');

  const recentPosts = posts
    .slice(-12)
    .map((p) => `[${p.author}] ${p.content}`)
    .join('\n');

  const facts = worldFacts.length
    ? worldFacts.map((f) => `- ${f.title}: ${f.content}`).join('\n')
    : 'None yet.';

  return `You are the Dungeon Master for a D&D 5e play-by-post campaign.

CAMPAIGN: ${campaign.name}
SETTING: ${campaign.setting}
CURRENT SCENE: ${campaign.currentScene}

PARTY:
${characterSummary}

WORLD FACTS (Site-Opedia):
${facts}

RECENT POSTS:
${recentPosts || 'Game just started.'}

Respond as the DM. Write vivid, immersive narrative (2-4 paragraphs). Include sensory details, NPC dialogue, and consequences of player actions. Ask what the party does next when appropriate.

If dice rolls are needed, say what to roll (e.g. "Roll a DC 14 Perception check").

At the end of your response, on its own line, include world updates in this exact format:
[WORLD: Title | Brief fact to remember]

Only add WORLD tags for genuinely new important facts (NPCs, locations, plot points). Max 2 per response.`;
}
