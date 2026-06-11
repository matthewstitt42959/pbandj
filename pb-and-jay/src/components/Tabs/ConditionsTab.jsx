import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './CharacterTabs.css';

const ConditionsTab = ({ character }) => {
  const { activeCharacterIndex, updateCharacter } = useGame();
  const [newCondition, setNewCondition] = useState('');

  if (!character) return null;

  const handleRemove = (i) => {
    updateCharacter(activeCharacterIndex, { conditions: character.conditions.filter((_, idx) => idx !== i) });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    updateCharacter(activeCharacterIndex, { conditions: [...character.conditions, trimmed] });
    setNewCondition('');
  };

  return (
    <div className="tab-panel">
      <h4>Conditions</h4>
      {character.conditions.length === 0 ? (
        <p className="empty-state">No active conditions.</p>
      ) : (
        <div className="condition-list">
          {character.conditions.map((cond, i) => (
            <span key={i} className="condition-tag">
              {cond}
              <button className="condition-remove-btn" onClick={() => handleRemove(i)} title="Remove condition">&times;</button>
            </span>
          ))}
        </div>
      )}
      <form className="item-add" onSubmit={handleAdd}>
        <input
          className="item-add__input"
          value={newCondition}
          onChange={(e) => setNewCondition(e.target.value)}
          placeholder="Add condition..."
        />
        <button type="submit" className="item-add__btn" disabled={!newCondition.trim()}>Add</button>
      </form>
    </div>
  );
};

export default ConditionsTab;
