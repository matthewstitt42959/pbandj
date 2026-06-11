import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import './CharacterTabs.css';

const ABILITY_SKILLS = {
  str: [{ key: 'athletics', label: 'Athletics' }],
  dex: [
    { key: 'acrobatics', label: 'Acrobatics' },
    { key: 'sleightOfHand', label: 'Sleight of Hand' },
    { key: 'stealth', label: 'Stealth' },
  ],
  con: [],
  int: [
    { key: 'arcana', label: 'Arcana' },
    { key: 'history', label: 'History' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'nature', label: 'Nature' },
    { key: 'religion', label: 'Religion' },
  ],
  wis: [
    { key: 'animalHandling', label: 'Animal Handling' },
    { key: 'insight', label: 'Insight' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'perception', label: 'Perception' },
    { key: 'survival', label: 'Survival' },
  ],
  cha: [
    { key: 'deception', label: 'Deception' },
    { key: 'intimidation', label: 'Intimidation' },
    { key: 'performance', label: 'Performance' },
    { key: 'persuasion', label: 'Persuasion' },
  ],
};

const ALL_SKILLS = Object.entries(ABILITY_SKILLS)
  .flatMap(([ability, skills]) => skills.map(s => ({ ...s, ability })))
  .sort((a, b) => a.label.localeCompare(b.label));

function profBonus(level) {
  return Math.ceil(level / 4) + 1;
}

function fmtMod(n) {
  return (n >= 0 ? '+' : '') + n;
}

const StatsTab = ({ character }) => {
  const { activeCharacterIndex, updateCharacter } = useGame();
  const [expandedAbility, setExpandedAbility] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);

  if (!character) return null;

  const { hp, ac, speed, abilities, skills = {}, level } = character;
  const hpPercent = (hp.current / hp.max) * 100;
  const prof = profBonus(level);

  const toggleSkill = (skillKey) => {
    updateCharacter(activeCharacterIndex, {
      skills: { ...skills, [skillKey]: !skills[skillKey] },
    });
  };

  const skillMod = (abilityKey, skillKey) => {
    const base = abilities[abilityKey]?.modifier ?? 0;
    return base + (skills[skillKey] ? prof : 0);
  };

  const toggleAbility = (key) => {
    if (!ABILITY_SKILLS[key]?.length) return;
    setExpandedAbility(prev => (prev === key ? null : key));
  };

  return (
    <div className="tab-panel">
      <h4>{character.name}</h4>
      <p style={{ marginBottom: '1rem', color: '#b8bcc8' }}>
        Level {level} {character.class} &mdash; Prof +{prof}
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
          <div className="stat-box__value">{speed}ft</div>
        </div>
      </div>

      <h4>Abilities</h4>
      {Object.entries(abilities).map(([key, { score, modifier }]) => {
        const hasSkills = ABILITY_SKILLS[key]?.length > 0;
        const isOpen = expandedAbility === key;
        return (
          <div key={key}>
            <button
              className={`ability-row ${hasSkills ? 'ability-row--clickable' : ''} ${isOpen ? 'ability-row--open' : ''}`}
              onClick={() => toggleAbility(key)}
              disabled={!hasSkills}
            >
              <span className="ability-row__name">{key.toUpperCase()}</span>
              <span>{score}</span>
              <span style={{ color: modifier >= 0 ? '#7dcea0' : '#e88' }}>
                {fmtMod(modifier)}
              </span>
              {hasSkills && (
                <span className="ability-row__chevron">{isOpen ? '▲' : '▼'}</span>
              )}
            </button>
            {isOpen && (
              <div className="skill-list">
                {ABILITY_SKILLS[key].map(({ key: sk, label }) => {
                  const proficient = !!skills[sk];
                  const mod = skillMod(key, sk);
                  return (
                    <button
                      key={sk}
                      className={`skill-row ${proficient ? 'skill-row--proficient' : ''}`}
                      onClick={() => toggleSkill(sk)}
                      title={proficient ? 'Click to remove proficiency' : 'Click to add proficiency'}
                    >
                      <span className={`skill-dot ${proficient ? 'skill-dot--filled' : ''}`} />
                      <span className="skill-name">{label}</span>
                      <span className="skill-mod">{fmtMod(mod)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <button
        className="all-skills-toggle"
        onClick={() => setShowAllSkills(s => !s)}
      >
        {showAllSkills ? '▲' : '▼'} All skills
      </button>

      {showAllSkills && (
        <div className="skill-list skill-list--all">
          {ALL_SKILLS.map(({ key: sk, label, ability }) => {
            const proficient = !!skills[sk];
            const mod = skillMod(ability, sk);
            return (
              <button
                key={sk}
                className={`skill-row ${proficient ? 'skill-row--proficient' : ''}`}
                onClick={() => toggleSkill(sk)}
                title={proficient ? 'Click to remove proficiency' : 'Click to add proficiency'}
              >
                <span className={`skill-dot ${proficient ? 'skill-dot--filled' : ''}`} />
                <span className="skill-name">{label}</span>
                <span className="skill-ability">{ability.toUpperCase()}</span>
                <span className="skill-mod">{fmtMod(mod)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatsTab;
