import prisma from './prisma.js';

const entries = [

  // ── World Structure ──────────────────────────────────────────────────────────

  {
    title: 'Teraphobia',
    category: 'History',
    content: 'The name given to what remains of the United States after the collapse. The country no longer functions as a nation — it exists as a fractured map of directional territories (North, Northeast, West, South, East) with fiefdoms scattered throughout. Some settlements are human-run, some are Kimerian-held, many are contested. The collapse was not a single event but a slow unraveling that began the moment the first rip opened between this world and Kimeria.',
  },
  {
    title: 'Kimeria',
    category: 'Locations',
    content: 'The world attached to Teraphobia through dimensional rips. Its interior geography is still being mapped. What is known: a train runs the entire perimeter of Kimeria — its purpose, operators, and schedule are undocumented. Kimerians who have crossed into Teraphobia describe it in contradictory terms. Some call it paradise. Others do not speak of it at all.',
  },
  {
    title: 'The Rip',
    category: 'History',
    content: 'The connection between Teraphobia and Kimeria is not a door or a gate — it is a tear. Rips open without warning, sometimes for hours, sometimes for years. Kimerians cross through them into the human world. Occasionally humans fall through in the other direction. The Broken Archive catalogues known rip locations but cannot predict new ones. There is no known way to close a rip once opened.',
  },
  {
    title: 'The Fiefdoms',
    category: 'Locations',
    content: 'Scattered throughout all five regions of Teraphobia are fiefdoms — small territories carved out and held by whoever was strong enough to hold them. Leadership varies: human survivors, Kimerian clans, warlords, former military units, and in the West, something else entirely. Fiefdoms trade, fight, absorb each other, and collapse. The Archive tracks the larger ones but does not attempt to govern them.',
  },

  // ── Regions ──────────────────────────────────────────────────────────────────

  {
    title: 'The Northeast',
    category: 'Locations',
    content: 'The most human-controlled region in Teraphobia. Organized settlements, functional trade routes, and the closest thing to governance that still exists. The Northeast is where human resistance has held longest — and where the tension with Kimerian incursion is most politically charged. Mid-Michigan falls within this region. New York City, once its crown, is gone.',
  },
  {
    title: 'New York City',
    category: 'Locations',
    content: 'The first major human city destroyed by the Wrought. NYC was the proving ground — the moment the Wrought demonstrated it could take down not just people but civilization itself. The city is a dead zone. Archive operatives have entered and not returned. What remains inside is classified at the highest level. The fall of New York is the Before and After line for everyone who lived through it.',
  },
  {
    title: 'Mid-Michigan',
    category: 'Locations',
    content: 'Location of MARS. Before the collapse it was unremarkable — rust belt towns, farmland, Great Lakes access. Now it is one of the most dangerous regions in the Northeast. The Archive maintains a perimeter but does not enter the core zone without cause. Locals who remain do so by choice or by inability to leave.',
  },
  {
    title: 'Louisiana',
    category: 'Locations',
    content: 'Human-run territory in the South. One of the more stable regions in Teraphobia — organized, defended, and operating with something close to local government. The Gulf geography made it defensible and the culture made it resilient. The Archive has field operatives stationed here. Several documented incidents in the area have been attributed to Kimerian crossings from rips along the bayou.',
  },
  {
    title: 'The West / California',
    category: 'Locations',
    content: 'California is gone. What replaced it is a patchwork of fiefdoms controlled by large dinosaur-type creatures and similar apex predators. The entire western region carries a frontier character — lawless, vast, and operating by rules that predate human civilization. Human settlements exist in the West but they are isolated and heavily fortified. The Archive has limited presence here. Most intelligence comes from traders who cross the region.',
  },

  // ── Factions ─────────────────────────────────────────────────────────────────

  {
    title: 'MARS',
    category: 'Factions',
    content: 'A chaos force based in mid-Michigan. MARS predates the Wrought — it was the first large-scale threat that made it clear the collapse was not survivable by conventional means. Its exact nature is classified. The Archive\'s MARS dossiers are among the most restricted documents in the system. Field operatives are advised not to engage MARS directly. Extraction protocols exist but have rarely succeeded.',
  },
  {
    title: 'The Wrought',
    category: 'Factions',
    content: 'The force responsible for the fall of New York City and the most documented large-scale Kimerian threat in the northeast. The Wrought appear to be ancient — predating MARS, possibly predating the rips themselves. How they first entered Teraphobia is unknown. The Archive\'s working theory is that they did not come through a rip at all. They were already here.',
  },
  {
    title: 'The Broken Archive',
    category: 'Factions',
    content: 'The organization responsible for documenting anomalous events, Kimerian incursions, and threats across Teraphobia. Operates field teams, maintains classified case files, and manages the Harrow Division. The Archive is not a government — it has no territory and makes no laws. Its authority is informational. People listen to the Archive because ignoring it tends to get people killed.',
  },
  {
    title: 'Max Co.',
    category: 'Factions',
    content: 'The dominant pre-collapse corporation. Max Co. sold everything — cola, politics, infrastructure, optimism. Its mascot broadcast on every channel and his smile never changed. After the collapse, the broadcasts continued. Max Co. vending machines still hum in abandoned sectors. Some infrastructure still runs on Max Co. systems. Whether anything human is still operating it is unknown. The Archive treats active Max Co. signals as anomalous events.',
  },
  {
    title: 'Human Settlements',
    category: 'Factions',
    content: 'Organized human communities exist primarily in the Northeast and Louisiana. The Northeast holds the largest concentration — walled towns, militia-run sectors, and loose coalitions between neighboring settlements. Louisiana operates more as a regional authority. Everywhere else, human habitation is smaller, more isolated, and more vulnerable. Relations between settlements vary from cooperative trade to open hostility.',
  },
  {
    title: 'Western Fiefdom Lords',
    category: 'Factions',
    content: 'The dominant power structure in California and the broader West. Large dinosaur-type creatures control territory the way warlords control armies — through size, strength, and the willingness to destroy anything that challenges them. Some fiefdoms have human populations living within them under a kind of uneasy coexistence. Most do not. The Archive does not send field teams into western fiefdom cores.',
  },

  // ── Creatures ────────────────────────────────────────────────────────────────

  {
    title: 'Kimerians',
    category: 'Creatures',
    content: 'Hybrid beings originating from Kimeria who have crossed into Teraphobia through the rips. They are not uniformly hostile — many Kimerians work regular jobs in human settlements, attempt to integrate, and are watched with suspicion regardless. The human-Kimerian conflict is political as much as physical. In D&D terms, Kimerians fill the monster role — they are the primary non-human faction players will encounter, ranging from ordinary to deeply dangerous depending on type.',
  },
  {
    title: 'The Harrow',
    category: 'Creatures',
    content: 'Human-shaped shells whose souls have been stolen. The Harrow are mindless, driven by some residual instinct that researchers have not been able to map. They retain physical form and physical strength but exhibit no awareness, no communication, and no response to verbal command. A Harrow that has "breached restraint protocols" is a field emergency. The Harrow Division manages containment. Origin of the soul-theft process is undocumented.',
  },
  {
    title: 'The Flower-Borne',
    category: 'Creatures',
    content: 'The godlike race of Kimeria. Humanoid in form with flower blooms replacing human head features. The Flower-Borne emit low distortion waves that interfere with memory and self-perception in humans nearby — extended exposure causes identity degradation. They are both warriors and something close to priests. The Archive treats Flower-Borne encounters as high-priority events. They are rarely seen in Teraphobia. When they cross through a rip, it means something significant is happening on the Kimerian side.',
  },
  {
    title: 'The Witness',
    category: 'Creatures',
    content: 'Kimerian god of memory and identity transmission. The Witness is believed to have heralds among the Flower-Borne population. The Archive has documented references to the Witness in recovered Kimerian material but has not catalogued a direct encounter. Worship of the Witness appears connected to the Flower-Borne\'s relationship with memory disruption — what they take, the Witness keeps.',
  },
  {
    title: 'Dinosaur-Type Creatures',
    category: 'Creatures',
    content: 'Large apex predators controlling California and the western fiefdoms. Their origin is debated — early Archive theories connected them to Kimerian influence but no rip activity has been confirmed in the deep West. Current classification: endemic. They are territorial, intelligent enough to hold and defend land, and large enough that conventional human weapons are minimally effective. The western fiefdoms operate around them, not against them.',
  },

  // ── General ──────────────────────────────────────────────────────────────────

  {
    title: 'The Collapse',
    category: 'History',
    content: 'Not a single event. The Collapse is the name given to the period when the United States ceased to function — government dissolved, supply chains broke, communications went dark except for Max Co. broadcasts. The timeline is disputed. Most Archive-dated records place the beginning approximately 30 years before the present day. The rips began appearing in the same window. Whether the rips caused the Collapse or the Collapse caused the rips is the central unanswered question of the Archive\'s founding documents.',
  },
  {
    title: 'Fear',
    category: 'General',
    content: 'The operating philosophy of the Broken Archive and the defining characteristic of life in Teraphobia. "Fear is not weakness. It is early warning." Survivors who dismiss threat assessment die. The world rewards caution, preparation, and the willingness to retreat. Recklessness is documented — usually in incident reports filed after the fact.',
  },

];

async function seed() {
  console.log(`Seeding ${entries.length} wiki entries…`);
  let created = 0;
  for (const entry of entries) {
    const existing = await prisma.wikiEntry.findFirst({ where: { title: entry.title } });
    if (!existing) {
      await prisma.wikiEntry.create({ data: entry });
      console.log(`  + ${entry.category}: ${entry.title}`);
      created++;
    } else {
      console.log(`  · skipped (exists): ${entry.title}`);
    }
  }
  console.log(`Done. ${created} new entries created.`);
  await prisma.$disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
