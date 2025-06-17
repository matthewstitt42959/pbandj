import React from 'react';
import StatsTab from './Tabs/StatsTab';
import InventoryTab from './Tabs/InventoryTab';
import SpellsTab from './Tabs/SpellsTab';
import ConditionsTab from './Tabs/ConditionsTab';

export default function CharacterModal({ character, isOpen, onClose }) {
  const [activeTab, setActiveTab] = React.useState('stats');

  if (!isOpen || !character) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{character.name} – Level {character.level} {character.class}</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="tab-buttons">
          <button onClick={() => setActiveTab('stats')}>Stats</button>
          <button onClick={() => setActiveTab('inventory')}>Inventory</button>
          <button onClick={() => setActiveTab('spells')}>Spells</button>
          <button onClick={() => setActiveTab('conditions')}>Conditions</button>
        </div>

        <div className="tab-content">
          {activeTab === 'stats' && <StatsTab character={character} />}
          {activeTab === 'inventory' && <InventoryTab inventory={character.inventory} />}
          {activeTab === 'spells' && <SpellsTab spells={character.spells} />}
          {activeTab === 'conditions' && <ConditionsTab conditions={character.conditions} />}
        </div>
      </div>
    </div>
  );
}