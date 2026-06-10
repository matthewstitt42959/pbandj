import React from 'react';
import './CharacterTabs.css';

const InventoryTab = ({ character }) => {
  if (!character) return null;

  return (
    <div className="tab-panel">
      <h4>Inventory</h4>
      {character.inventory.length === 0 ? (
        <p className="empty-state">Nothing in your pack.</p>
      ) : (
        <ul className="item-list">
          {character.inventory.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default InventoryTab;
