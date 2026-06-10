import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import StatsTab from '../components/Tabs/StatsTab';
import InventoryTab from '../components/Tabs/InventoryTab';
import SpellsTab from '../components/Tabs/SpellsTab';
import ConditionsTab from '../components/Tabs/ConditionsTab';
import EncounterLog from '../components/EncounterLog';
import PostComposer from '../components/PostComposer';
import DiceRoller from '../components/DiceRoller';
import SiteOpediaPanel from '../components/SiteOpediaPanel';
import { checkAIStatus } from '../services/aiDM';
import './Gameboard.css';

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'spells', label: 'Spells' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'world', label: 'World' },
];

const GameBoard = () => {
  const {
    campaign,
    characters,
    posts,
    worldFacts,
    activeCharacter,
    activeCharacterIndex,
    playMode,
    isLoadingDM,
    loadingPlayerIndex,
    dmError,
    setActiveCharacter,
    setPlayMode,
    toggleCharacterAI,
    submitCharacterPost,
    submitDMPost,
    addPost,
    resetCampaign,
  } = useGame();

  const [activeTab, setActiveTab] = useState('stats');
  const [postAs, setPostAs] = useState('character');
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    checkAIStatus().then((status) => {
      setAiAvailable(!!status.hasApiKey);
    });
  }, []);

  if (!campaign) {
    return (
      <div className="game-setup">
        <div className="game-setup__card">
          <h2>No Active Campaign</h2>
          <p>Start an adventure from the home page to begin playing.</p>
          <Link to="/" className="btn btn--primary">Go Home</Link>
        </div>
      </div>
    );
  }

  const handleDiceRoll = (resultText) => {
    addPost(activeCharacter.name, resultText, 'system');
  };

  const handlePost = (content) => {
    if (postAs === 'dm') {
      submitDMPost(content);
    } else {
      submitCharacterPost(content);
    }
  };

  return (
    <div className="gameboard-page">
      <header className="gameboard-header">
        <div>
          <h1 className="gameboard-header__title">{campaign.name}</h1>
          <p className="gameboard-header__scene">{campaign.currentScene}</p>
        </div>
        <div className="gameboard-header__controls">
          <div className="mode-toggle">
            <span className="mode-toggle__label">Mode</span>
            <button
              type="button"
              className={`mode-toggle__btn ${playMode === 'manual' ? 'active' : ''}`}
              onClick={() => setPlayMode('manual')}
            >
              Manual
            </button>
            <button
              type="button"
              className={`mode-toggle__btn ${playMode === 'ai' ? 'active' : ''}`}
              onClick={() => setPlayMode('ai')}
              disabled={!aiAvailable}
              title={aiAvailable ? 'AI responds after each character post' : 'Add an API key in Setup to enable'}
            >
              AI DM
            </button>
          </div>
          <button className="btn btn--ghost" onClick={resetCampaign} title="Reset campaign">
            New Campaign
          </button>
        </div>
      </header>

      {playMode === 'manual' && (
        <p className="gameboard-banner gameboard-banner--manual">
          Manual mode — write character posts and DM narration yourself. No API needed.
        </p>
      )}
      {playMode === 'ai' && (
        <p className="gameboard-banner gameboard-banner--ai">
          AI mode — <strong>{characters[0].name}</strong> is you. AI plays all other characters unless you take control of a slot.
        </p>
      )}

      <div className="gameboard-wrapper">
        <aside className="character-panel">
          <h3>Party</h3>
          {characters.map((char, index) => (
            <div key={char.name} className="character-row">
              <button
                className={`character-btn ${index === activeCharacterIndex ? 'active' : ''}`}
                onClick={() => setActiveCharacter(index)}
              >
                <div className="character-btn__top">
                  <span className="character-btn__name">{char.name}</span>
                  <span className={`character-badge ${char.isAI ? 'character-badge--ai' : 'character-badge--human'}`}>
                    {index === 0 ? 'You' : char.isAI ? 'AI' : 'Human'}
                  </span>
                </div>
                <span className="character-btn__class">{char.class} {char.level}</span>
              </button>
              {index === loadingPlayerIndex && (
                <span className="character-thinking">{char.name} is acting…</span>
              )}
              {index !== 0 && (
                <button
                  className="character-control-btn"
                  onClick={() => toggleCharacterAI(index)}
                  title={char.isAI ? 'Take control of this character' : 'Let AI play this character'}
                >
                  {char.isAI ? '→ Take control' : '→ Let AI play'}
                </button>
              )}
            </div>
          ))}

          <DiceRoller onRollResult={handleDiceRoll} />
        </aside>

        <section className="encounter-log">
          <h3>Encounter Log</h3>
          <EncounterLog posts={posts} isLoading={isLoadingDM} />

          <div className="post-as-toggle">
            <button
              type="button"
              className={`post-as-toggle__btn ${postAs === 'character' ? 'active' : ''}`}
              onClick={() => setPostAs('character')}
            >
              Character
            </button>
            <button
              type="button"
              className={`post-as-toggle__btn ${postAs === 'dm' ? 'active' : ''}`}
              onClick={() => setPostAs('dm')}
            >
              DM Narration
            </button>
          </div>

          <PostComposer
            authorName={postAs === 'dm' ? 'DM' : activeCharacter.name}
            onSubmit={handlePost}
            disabled={isLoadingDM}
            error={playMode === 'ai' ? dmError : null}
            submitLabel={
              postAs === 'dm'
                ? 'Post DM Narration'
                : playMode === 'ai'
                  ? 'Post & Ask AI'
                  : 'Post Action'
            }
            placeholder={
              postAs === 'dm'
                ? 'Write what happens next — scene description, NPC dialogue, consequences...'
                : 'Describe your action... (tip: type /roll 1d20+3 for dice rolls)'
            }
          />
        </section>

        <aside className="action-panel">
          <nav className="tab-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab-nav__btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="tab-content">
            {activeTab === 'stats' && <StatsTab character={activeCharacter} />}
            {activeTab === 'inventory' && <InventoryTab character={activeCharacter} />}
            {activeTab === 'spells' && <SpellsTab character={activeCharacter} />}
            {activeTab === 'conditions' && <ConditionsTab character={activeCharacter} />}
            {activeTab === 'world' && <SiteOpediaPanel facts={worldFacts} />}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default GameBoard;
