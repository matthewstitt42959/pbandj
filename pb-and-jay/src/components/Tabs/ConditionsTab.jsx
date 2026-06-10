import React from 'react';
import './CharacterTabs.css';

const ConditionsTab = ({ character }) => {
  if (!character) return null;

  return (
    <div className="tab-panel">
      <h4>Conditions</h4>
      {character.conditions.length === 0 ? (
        <p className="empty-state">No active conditions.</p>
      ) : (
        <div>
          {character.conditions.map((cond, i) => (
            <span key={i} className="condition-tag">{cond}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConditionsTab;
