import prisma from './prisma.js';

// Entries that belong to the Broken Archive novel — remove from PB & Jay wiki
const novelEntries = [
  'The Harrow',
  'The Flower-Borne',
  'The Witness',
  'MARS',
  'The Wrought',
  'Max Co.',
  'The Broken Archive',
  'Western Fiefdom Lords',
  'Northeast — Kimerian Presence',
];

// Corrected entries — world geography and general Kimerian conflict only
const updates = [
  {
    title: 'Teraphobia',
    category: 'History',
    content: 'The name given to what remains of the United States after the collapse. No longer a nation — a fractured map of directional territories (North, Northeast, West, South, East) with fiefdoms scattered throughout. Some settlements are human-run, some are Kimerian-held, many are contested. The collapse began the moment the first rip opened between this world and Kimeria.',
  },
  {
    title: 'Kimeria',
    category: 'Locations',
    content: 'The world attached to Teraphobia through dimensional rips. A train runs the entire perimeter of Kimeria — its purpose, operators, and schedule are unknown. Kimerians who have crossed into Teraphobia describe it in contradictory terms. The interior is unmapped from the Teraphobia side.',
  },
  {
    title: 'The Rip',
    category: 'History',
    content: 'The connection between Teraphobia and Kimeria is not a gate — it is a tear in the boundary between worlds. Rips open without warning, sometimes for hours, sometimes for years. Kimerians cross through them into the human world. Occasionally humans fall through in the other direction. No known way to close a rip once opened.',
  },
  {
    title: 'Kimerians',
    category: 'Creatures',
    content: 'The broad term for all beings originating from Kimeria. In this world they fill the role that monsters fill in standard fantasy — the primary non-human faction players will encounter. Kimerians range widely in nature, intelligence, and temperament. Some have crossed into Teraphobia and settled, living alongside humans in an uneasy coexistence. Others are actively hostile. The human-Kimerian conflict defines the politics, danger, and daily fear of life in Teraphobia.',
  },
  {
    title: 'The Northeast',
    category: 'Locations',
    content: 'The most human-controlled region in Teraphobia. Organized settlements, functional trade routes, and the closest thing to governance that still exists. The Northeast is where human resistance has held longest — and where the tension with Kimerian presence is most politically charged. Kimerian enclaves sit within miles of human settlements. New York City, once the region\'s crown, is gone.',
  },
  {
    title: 'New York City',
    category: 'Locations',
    content: 'A fallen city in the Northeast. Whatever took it down did so completely — it is a dead zone now. The fall of New York is the Before and After line for everyone who lived through it. Archive teams that have entered have not reliably returned. What remains inside is unknown.',
  },
  {
    title: 'Mid-Michigan',
    category: 'Locations',
    content: 'A region within the Northeast that draws an unusual concentration of danger. Before the collapse it was unremarkable — rust belt towns, farmland, Great Lakes access. Something changed here during the collapse and it has not recovered. Locals who remain do so by choice or by inability to leave.',
  },
  {
    title: 'The Collapse',
    category: 'History',
    content: 'Not a single event. The period when the United States ceased to function — government dissolved, supply chains broke, communications went dark. The timeline is disputed but most accounts place it roughly 30 years before the present. The rips began appearing in the same window. Whether the rips caused the Collapse or the Collapse caused the rips remains unanswered.',
  },
  {
    title: 'Kimerian Enclaves',
    category: 'Locations',
    content: 'Areas where Kimerians have settled in high enough numbers that the territory takes on a distinctly Kimerian character. These zones feel different from the rest of Teraphobia — the atmosphere shifts, the rules of the world bend toward Kimeria\'s logic. They carry a fantasy quality in the middle of a broken modern world. Enclaves are not always hostile to human visitors but they are not built for them. The Northeast has the highest concentration.',
  },
  {
    title: 'Human Settlements',
    category: 'Factions',
    content: 'Organized human communities exist primarily in the Northeast and Louisiana. The Northeast holds the largest concentration — walled towns, militia-run sectors, and loose coalitions between neighboring settlements. Louisiana operates as a more cohesive regional authority. Everywhere else, human habitation is smaller, more isolated, and more vulnerable.',
  },
  {
    title: 'Dinosaur-Type Creatures',
    category: 'Creatures',
    content: 'Large apex predators controlling California and the broader western fiefdoms. Their origin is unknown — no confirmed connection to Kimeria has been established. They are territorial, intelligent enough to hold and defend land, and large enough that conventional weapons are minimally effective. The western fiefdoms are organized around them.',
  },
];

async function run() {
  // Delete novel-specific entries
  for (const title of novelEntries) {
    const deleted = await prisma.wikiEntry.deleteMany({ where: { title } });
    if (deleted.count > 0) console.log(`  - removed: ${title}`);
  }

  // Also remove the seeded enclaves/northeast entries added by update script
  await prisma.wikiEntry.deleteMany({ where: { id: { in: ['seed-kimerian-enclaves', 'seed-northeast-kimerian'] } } });

  // Upsert corrected entries
  for (const entry of updates) {
    await prisma.wikiEntry.upsert({
      where: { id: `corrected-${entry.title.toLowerCase().replace(/\s+/g, '-')}` },
      create: { id: `corrected-${entry.title.toLowerCase().replace(/\s+/g, '-')}`, ...entry },
      update: { category: entry.category, content: entry.content },
    });
    // Also update any existing entry with same title from original seed
    await prisma.wikiEntry.updateMany({ where: { title: entry.title }, data: { content: entry.content, category: entry.category } });
    console.log(`  ✓ ${entry.category}: ${entry.title}`);
  }

  console.log('\nWiki reset to world-only content.');
  await prisma.$disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
