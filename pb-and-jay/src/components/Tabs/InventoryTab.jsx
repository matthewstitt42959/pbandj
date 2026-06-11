import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './CharacterTabs.css';

const InventoryTab = ({ character }) => {
  const { activeCharacterIndex, updateCharacter } = useGame();
  const [newItem, setNewItem] = useState('');

  if (!character) return null;

  const handleRemove = (i) => {
    const updated = character.inventory.filter((_, idx) => idx !== i);
    updateCharacter(activeCharacterIndex, { inventory: updated });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;
    updateCharacter(activeCharacterIndex, { inventory: [...character.inventory, trimmed] });
    setNewItem('');
  };

  return (
    <div className="tab-panel">
      <h4>Inventory</h4>
      {character.inventory.length === 0 ? (
        <p className="empty-state">Nothing in your pack.</p>
      ) : (
        <ul className="item-list">
          {character.inventory.map((item, i) => (
            <li key={i} className="item-list__row">
              <span>{item}</span>
              <button
                className="item-remove-btn"
                onClick={() => handleRemove(i)}
                title="Remove item"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="item-add" onSubmit={handleAdd}>
        <input
          className="item-add__input"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
        />
        <button type="submit" className="item-add__btn" disabled={!newItem.trim()}>
          Add
        </button>
      </form>
    </div>
  );
};

export default InventoryTab;
