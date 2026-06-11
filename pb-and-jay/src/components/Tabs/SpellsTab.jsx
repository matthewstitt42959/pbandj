import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './CharacterTabs.css';

const SpellsTab = ({ character }) => {
  const { activeCharacterIndex, updateCharacter } = useGame();
  const [newSpell, setNewSpell] = useState('');

  if (!character) return null;

  const handleRemove = (i) => {
    updateCharacter(activeCharacterIndex, { spells: character.spells.filter((_, idx) => idx !== i) });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newSpell.trim();
    if (!trimmed) return;
    updateCharacter(activeCharacterIndex, { spells: [...character.spells, trimmed] });
    setNewSpell('');
  };

  return (
    <div className="tab-panel">
      <h4>Spells & Abilities</h4>
      {character.spells.length === 0 ? (
        <p className="empty-state">No spells — this class relies on martial prowess.</p>
      ) : (
        <ul className="item-list">
          {character.spells.map((spell, i) => (
            <li key={i} className="item-list__row">
              <span>{spell}</span>
              <button className="item-remove-btn" onClick={() => handleRemove(i)} title="Remove spell">&times;</button>
            </li>
          ))}
        </ul>
      )}
      <form className="item-add" onSubmit={handleAdd}>
        <input
          className="item-add__input"
          value={newSpell}
          onChange={(e) => setNewSpell(e.target.value)}
          placeholder="Add spell or ability..."
        />
        <button type="submit" className="item-add__btn" disabled={!newSpell.trim()}>Add</button>
      </form>
    </div>
  );
};

export default SpellsTab;
