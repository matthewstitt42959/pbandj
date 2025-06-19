import React, { useState } from 'react';
import StatsTab from '../components/Tabs/StatsTab';
import InventoryTab from '../components/Tabs/InventoryTab';
import SpellsTab from '../components/Tabs/SpellsTab';
import ConditionsTab from '../components/Tabs/ConditionsTab';
import mockCharacters from '../data/mockCharacters';

const GameBoard = () => {
  const [activeCharacter, setActiveCharacter] = useState(mockCharacters[0]);
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <div className="gameboard-wrapper">
      
      {/* Character Panel */}
      <aside className="character-panel">
        <h3>Character Panel</h3>
        {mockCharacters.map((char, index) => (
          <button
            key={index}
            className={`character-btn ${char.name === activeCharacter.name ? 'active' : ''}`}
            onClick={() => setActiveCharacter(char)}
          >
            {char.name}
          </button>
        ))}
        <hr />
        <button onClick={() => setActiveTab('stats')}>Stats</button>
        <button onClick={() => setActiveTab('inventory')}>Inventory</button>
        <button onClick={() => setActiveTab('spells')}>Spells</button>
        <button onClick={() => setActiveTab('conditions')}>Conditions</button>
      </aside>

      {/* Encounter Log */}
      <section className="encounter-log">
        <h3>Encounter Log</h3>
        <div className="log-window">
          <p><strong>DM:</strong> A fog creeps over the hillside…</p>
          <p><strong>You:</strong> I ready my bow and kneel.</p>
          {/* Later: map post entries from state */}
        </div>
      </section>

      {/* Action Panel / Tab Content */}
      <aside className="action-panel">
        <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
        {activeTab === 'stats' && <StatsTab character={activeCharacter} />}
        {activeTab === 'inventory' && <InventoryTab character={activeCharacter} />}
        {activeTab === 'spells' && <SpellsTab character={activeCharacter} />}
        {activeTab === 'conditions' && <ConditionsTab character={activeCharacter} />}
      </aside>

    </div>
  );
};

export default GameBoard;