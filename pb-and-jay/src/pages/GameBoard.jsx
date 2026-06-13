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
import AiUnlockModal from '../components/AiUnlockModal';
import DmAssist from '../components/DmAssist';
import { useAuth } from '../context/AuthContext';
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

  const { user } = useAuth();
  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';
  const [activeTab, setActiveTab] = useState('stats');
  const [postAs, setPostAs] = useState('character');
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLocked, setAiLocked] = useState(false);
  const [aiAuthenticated, setAiAuthenticated] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [mobileTab, setMobileTab] = useState('log');
  const [logScrollKey, setLogScrollKey] = useState(0);
  const [diceInsert, setDiceInsert] = useState(null);
  const [assistInsert, setAssistInsert] = useState(null);

  const handleMobileTab = (tab) => {
    setMobileTab(tab);
    if (tab === 'log') setLogScrollKey((k) => k + 1);
  };

  const refreshAiStatus = () => {
    checkAIStatus().then((status) => {
      setAiAvailable(!!status.hasApiKey);
      setAiLocked(!!status.aiLocked);
      setAiAuthenticated(!status.aiLocked || !!status.authenticated);
    });
  };

  useEffect(() => { refreshAiStatus(); }, []);

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
    setDiceInsert({ text: resultText, ts: Date.now() });
    if (mobileTab !== 'log') handleMobileTab('log');
  };

  const handlePost = (content) => {
    if (postAs === 'dm') {
      submitDMPost(content);
    } else {
      submitCharacterPost(content);
    }
  };

  return (
    <>
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
              onClick={() => {
                if (aiLocked && !aiAuthenticated) {
                  setShowUnlockModal(true);
                } else {
                  setPlayMode('ai');
                }
              }}
              disabled={!aiAvailable}
              title={
                !aiAvailable ? 'Add an API key in Setup to enable'
                : aiLocked && !aiAuthenticated ? 'Subscription required — click to unlock'
                : 'AI responds after each character post'
              }
            >
              {aiLocked && !aiAuthenticated ? '🔒 AI DM' : 'AI DM'}
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

      <nav className="mobile-tab-bar">
        <button
          className={`mobile-tab-bar__btn ${mobileTab === 'log' ? 'active' : ''}`}
          onClick={() => handleMobileTab('log')}
        >
          <span className="mobile-tab-bar__icon">&#9776;</span>
          Log
        </button>
        <button
          className={`mobile-tab-bar__btn ${mobileTab === 'party' ? 'active' : ''}`}
          onClick={() => handleMobileTab('party')}
        >
          <span className="mobile-tab-bar__icon">&#9876;</span>
          Party
        </button>
        <button
          className={`mobile-tab-bar__btn ${mobileTab === 'stats' ? 'active' : ''}`}
          onClick={() => handleMobileTab('stats')}
        >
          <span className="mobile-tab-bar__icon">&#9654;</span>
          Stats
        </button>
      </nav>

      <div className="gameboard-wrapper">
        <aside className={`character-panel${mobileTab !== 'party' ? ' mobile-hidden' : ''}`}>
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

        <section className={`encounter-log${mobileTab !== 'log' ? ' mobile-hidden' : ''}`}>
          <h3>Encounter Log</h3>
          <EncounterLog posts={posts} isLoading={isLoadingDM} scrollKey={logScrollKey} />

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
            appendText={postAs === 'character' ? diceInsert : (postAs === 'dm' ? assistInsert : null)}
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

          {isDm && postAs === 'dm' && (
            <DmAssist
              campaign={campaign}
              posts={posts}
              characters={characters}
              onInsert={(text) => setAssistInsert({ text, ts: Date.now() })}
            />
          )}
        </section>

        <aside className={`action-panel${mobileTab !== 'stats' ? ' mobile-hidden' : ''}`}>
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

    {showUnlockModal && (
      <AiUnlockModal
        onUnlocked={() => {
          setShowUnlockModal(false);
          setAiAuthenticated(true);
          setPlayMode('ai');
        }}
        onClose={() => setShowUnlockModal(false)}
      />
    )}
    </>
  );
};

export default GameBoard;
