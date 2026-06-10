import React from 'react';
import './CharacterTabs.css';

const StatsTab = ({ character }) => {
  if (!character) return null;

  const { hp, ac, speed, abilities } = character;
  const hpPercent = (hp.current / hp.max) * 100;

  return (
    <div className="tab-panel">
      <h4>{character.name}</h4>
      <p style={{ marginBottom: '1rem', color: '#b8bcc8' }}>
        Level {character.level} {character.class}
      </p>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-box__label">HP</div>
          <div className="stat-box__value">{hp.current}/{hp.max}</div>
          <div className="hp-bar" style={{ marginTop: '0.25rem' }}>
            <div className="hp-bar__fill" style={{ width: `${hpPercent}%` }} />
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">AC</div>
          <div className="stat-box__value">{ac}</div>
        </div>
        <div className="stat-box">
          <div className="stat-box__label">Speed</div>
          <div className="stat-box__value">{speed} ft</div>
        </div>
      </div>

      <h4>Abilities</h4>
      {Object.entries(abilities).map(([name, { score, modifier }]) => (
        <div key={name} className="ability-row">
          <span className="ability-row__name">{name}</span>
          <span>{score}</span>
          <span style={{ color: modifier >= 0 ? '#7dcea0' : '#e88' }}>
            {modifier >= 0 ? '+' : ''}{modifier}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StatsTab;
