import React, { useState } from 'react';
import './CharacterTabs.css';

const SpellsTab = ({ character }) => {
  const [expandedDesc, setExpandedDesc] = useState(new Set());

  if (!character) return null;

  const spells = Array.isArray(character.spells) ? character.spells : [];

  const toggleDesc = (i) => {
    setExpandedDesc(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const byLevel = spells.reduce((acc, s, i) => {
    const entry = typeof s === 'string' ? { name: s, level: 0, _idx: i } : { ...s, _idx: i };
    const lvl = entry.level ?? 0;
    if (!acc[lvl]) acc[lvl] = [];
    acc[lvl].push(entry);
    return acc;
  }, {});

  return (
    <div className="tab-panel">
      <h4>Spells &amp; Abilities</h4>
      <p className="spells-tab-hint">Manage your spell list on your Character Sheet.</p>
      {spells.length === 0 ? (
        <p className="empty-state">No spells added yet — visit your Character Sheet to pick spells.</p>
      ) : (
        Object.entries(byLevel)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([lvl, group]) => (
            <div key={lvl} className="spells-level-group">
              <h5 className="spells-level-heading">
                {Number(lvl) === 0 ? 'Cantrips' : `Level ${lvl}`}
              </h5>
              <ul className="item-list">
                {group.map((spell) => (
                  <li key={spell._idx} className="item-list__row item-list__row--spell">
                    <div className="spell-row-main">
                      <span className="spell-row-name">{spell.name}</span>
                      {spell.description && (
                        <button
                          className="spell-desc-btn"
                          onClick={() => toggleDesc(spell._idx)}
                        >
                          {expandedDesc.has(spell._idx) ? 'hide' : 'details'}
                        </button>
                      )}
                    </div>
                    {spell.notes && (
                      <p className="spell-row-notes">{spell.notes}</p>
                    )}
                    {expandedDesc.has(spell._idx) && spell.description && (
                      <p className="spell-row-desc">{spell.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
      )}
    </div>
  );
};

export default SpellsTab;
