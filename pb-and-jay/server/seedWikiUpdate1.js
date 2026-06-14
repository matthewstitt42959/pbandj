import prisma from './prisma.js';

async function run() {
  // Add Kimerian Enclaves entry
  await prisma.wikiEntry.upsert({
    where: { id: 'seed-kimerian-enclaves' },
    create: {
      id: 'seed-kimerian-enclaves',
      title: 'Kimerian Enclaves',
      category: 'Locations',
      content: 'Scattered throughout Teraphobia — and concentrated most heavily in the Northeast — are Kimerian enclaves: areas where Kimerians have settled in high enough numbers that the territory takes on a distinctly Kimerian character. These zones feel different from the rest of Teraphobia. The architecture shifts, the air is different, the rules of the world bend slightly toward Kimeria\'s logic. Humans entering an enclave describe it as stepping into something adjacent to fantasy — older, stranger, and operating by principles that predate the collapse. Enclaves are not always hostile to human visitors but they are not designed for them either.',
    },
    update: {},
  });

  // Add Northeast Kimerian Presence entry
  await prisma.wikiEntry.upsert({
    where: { id: 'seed-northeast-kimerian' },
    create: {
      id: 'seed-northeast-kimerian',
      title: 'Northeast — Kimerian Presence',
      category: 'Locations',
      content: 'Despite being the most human-controlled region, the Northeast has the highest documented concentration of Flower-Borne activity and Broken Archive field subjects. Most of the beings catalogued in the Archive\'s art and field records originate from or operate within the Northeast. The tension between human control and Kimerian enclave growth is most acute here — settlements that are largely human-run sit within a few miles of enclaves that are unmistakably Kimerian. This proximity is the source of most of the region\'s documented incidents.',
    },
    update: {},
  });

  // Update the Flower-Borne entry to note Northeast concentration
  await prisma.wikiEntry.updateMany({
    where: { title: 'The Flower-Borne' },
    data: {
      content: 'The godlike race of Kimeria. Humanoid in form with flower blooms replacing human head features. The Flower-Borne emit low distortion waves that interfere with memory and self-perception in humans nearby — extended exposure causes identity degradation. They are both warriors and something close to priests. The majority of documented Flower-Borne activity in Teraphobia is concentrated in the Northeast — they operate within or near Kimerian enclaves, rarely venturing into the deeper human-controlled zones. The Archive treats Flower-Borne encounters as high-priority events. When they cross through a rip in numbers, something significant is happening on the Kimerian side.',
    },
  });

  // Update the Northeast entry to reflect Kimerian tension
  await prisma.wikiEntry.updateMany({
    where: { title: 'The Northeast' },
    data: {
      content: 'The most human-controlled region in Teraphobia — and also the most contested. Organized settlements, functional trade routes, and the closest thing to governance that still exists. The Northeast is where human resistance has held longest. It is also where Kimerian enclaves are most concentrated, where the Flower-Borne are most active, and where most of the Broken Archive\'s documented field subjects originate. Mid-Michigan falls within this region. New York City, once its crown, is gone. The Northeast is a region that has maintained human control not by being safe, but by being organized enough to respond.',
    },
  });

  console.log('Wiki updated — Kimerian enclaves and Northeast presence added.');
  await prisma.$disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
