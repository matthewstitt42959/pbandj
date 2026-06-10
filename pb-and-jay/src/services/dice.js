export function rollDice(notation) {
  const match = notation.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return null;

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  if (count < 1 || count > 20 || sides < 2 || sides > 100) return null;

  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  const modStr = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '';
  return { notation: `${count}d${sides}${modStr}`, rolls, modifier, total };
}

export function parseRollCommand(text) {
  const match = text.match(/\/roll\s+(\d+d\d+(?:[+-]\d+)?)/i);
  return match ? match[1] : null;
}
