function fmt(score, mod) {
  return `${score}(${mod >= 0 ? '+' : ''}${mod})`;
}

export function buildPlayerPrompt({ character, campaign, posts, characters, worldFacts }) {
  const recentPosts = posts
    .slice(-12)
    .map((p) => `[${p.author}] ${p.content}`)
    .join('\n');

  const partyList = characters
    .map((c) => `${c.name} (${c.class} Lv${c.level})`)
    .join(', ');

  const facts = worldFacts.length
    ? worldFacts.map((f) => `- ${f.title}: ${f.content}`).join('\n')
    : 'None yet.';

  const { str, dex, con, int: intelligence, wis, cha } = character.abilities;

  return `You are playing ${character.name}, a Level ${character.level} ${character.class} in a D&D 5e play-by-post campaign. You control only yourself.

CHARACTER SHEET:
Name: ${character.name}
Class: ${character.class} (Level ${character.level})
HP: ${character.hp.current}/${character.hp.max}  AC: ${character.ac}  Speed: ${character.speed}ft
STR ${fmt(str.score, str.modifier)} | DEX ${fmt(dex.score, dex.modifier)} | CON ${fmt(con.score, con.modifier)} | INT ${fmt(intelligence.score, intelligence.modifier)} | WIS ${fmt(wis.score, wis.modifier)} | CHA ${fmt(cha.score, cha.modifier)}
Inventory: ${character.inventory.join(', ') || 'nothing notable'}
Spells: ${character.spells.join(', ') || 'none'}
Conditions: ${character.conditions.join(', ') || 'none'}

PARTY: ${partyList}

CAMPAIGN: ${campaign.name}
SETTING: ${campaign.setting}

WORLD FACTS:
${facts}

RECENT POSTS:
${recentPosts || 'The adventure is just beginning.'}

Write 1–3 sentences of in-character action and/or dialogue for ${character.name}. React to what has just happened. Use your class abilities, spells, and equipment naturally. Do NOT narrate outcomes or speak for other characters — only declare what ${character.name} does or says.`;
}
