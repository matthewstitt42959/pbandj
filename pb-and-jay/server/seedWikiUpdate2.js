import prisma from './prisma.js';

async function run() {
  // Expand Max Co. with its pre-collapse advertising-agency origin
  await prisma.wikiEntry.updateMany({
    where: { title: 'Max Co.' },
    data: {
      content: 'Before the collapse, Max Co. was an advertising and media agency first — not a company so much as an atmosphere, buying out competitors and running their old campaigns alongside its own until there was no outside left to advertise from. What began as a pitch deck became the only remaining infrastructure: Max Co. sold everything — cola, politics, infrastructure, optimism. Its mascot broadcast on every channel and his smile never changed. After the collapse, the broadcasts continued. Max Co. vending machines still hum in abandoned sectors. Some infrastructure still runs on Max Co. systems. Whether anything human is still operating it is unknown. The Archive treats active Max Co. signals as anomalous events.',
    },
  });

  console.log('Wiki updated — Max Co. expanded with advertising-agency origin.');
  await prisma.$disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
