export const defaultCampaign = {
  name: 'The Whispering Hollow',
  setting:
    'A mist-shrouded valley in the borderlands, where an ancient druid circle has gone silent and villagers speak of lights in the woods.',
  currentScene: 'The party arrives at the crossroads tavern, The Gilded Stag, at dusk.',
};

export const openingPosts = [
  {
    id: 'opening-1',
    author: 'DM',
    type: 'dm',
    content:
      'Rain drums on the thatched roof of The Gilded Stag as you push through the door. The common room smells of wet wool, hearth-smoke, and spiced ale. A handful of locals huddle over their cups, speaking in low voices. Behind the bar, a broad-shouldered woman with iron-grey hair eyes your party with cautious interest.\n\n"Travelers?" she calls. "You\'ve picked a strange night to be on the road. The woods have been… restless."\n\nWhat do you do?',
    timestamp: Date.now(),
  },
];

export function createNewCampaign() {
  return {
    campaign: { ...defaultCampaign },
    posts: [...openingPosts],
    worldFacts: [
      {
        id: 'fact-1',
        title: 'The Gilded Stag',
        content: 'Crossroads tavern at the edge of Whispering Hollow. Run by Marta.',
      },
      {
        id: 'fact-2',
        title: 'Whispering Hollow',
        content: 'A misty valley where a druid circle has recently gone silent.',
      },
    ],
    startedAt: Date.now(),
  };
}
