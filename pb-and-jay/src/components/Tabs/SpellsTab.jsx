import React from 'react';
import './CharacterTabs.css';

const SpellsTab = ({ character }) => {
  if (!character) return null;

  return (
    <div className="tab-panel">
      <h4>Spells & Abilities</h4>
      {character.spells.length === 0 ? (
        <p className="empty-state">No spells — this class relies on martial prowess.</p>
      ) : (
        <ul className="item-list">
          {character.spells.map((spell, i) => (
            <li key={i}>{spell}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SpellsTab;
