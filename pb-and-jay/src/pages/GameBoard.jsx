import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const {
    campaign,
    characters,
    posts,
    postsReady,
    postsFetchError,
    worldFacts,
    activeCharacter,
    activeCharacterIndex,
    playMode,
    isLoadingDM,
    loadingPlayerIndex,
    dmError,
    roundPosters,
    setActiveCharacter,
    setPlayMode,
    toggleCharacterAI,
    submitCharacterPost,
    submitDMPost,
    runAiRound,
    addPost,
    resetCampaign,
    loadCampaignCharacters,
    editPost,
    deletePost,
  } = useGame();

  const { user, authFetch } = useAuth();
  const isDm = user?.role === 'DM' || user?.role === 'SUPER_DM';
  const isAiCampaign = campaign?.isAiGame ?? false;
  const isAssigned = isDm || (
    Array.isArray(user?.characters) &&
    user.characters.some(c => !c.isRetired && c.campaignId === campaign?.id)
  );

  // Load real campaign characters whenever the active campaign changes
  useEffect(() => {
    if (!campaign?.id || !user) return;
    authFetch(`/api/campaigns/${campaign.id}/characters`)
      .then(chars => loadCampaignCharacters(chars, user.id))
      .catch(() => {});
  }, [campaign?.id, user?.id]);

  // The character that belongs to the current viewer (for posting)
  const myCharacter = characters.find(c => c.isOwn) ?? null;
  const hasOwnCharacter = !!myCharacter;

  // For AI mode: only require the current viewer's character to have posted
  const allHumansPosted = !myCharacter || roundPosters.includes(myCharacter.name);
  const [activeTab, setActiveTab] = useState('stats');
  // Characters may not be loaded on first render, so always start as 'character' and
  // flip to 'dm' only for DMs that truly have no character after the fetch resolves.
  const [postAs, setPostAs] = useState('character');
  const [postAsManual, setPostAsManual] = useState(false);

  useEffect(() => {
    if (postAsManual) return;
    if (isDm && !myCharacter) setPostAs('dm');
    else if (myCharacter) setPostAs('character');
  }, [myCharacter?.id, isDm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetPostAs = (mode) => {
    setPostAsManual(true);
    setPostAs(mode);
  };
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLocked, setAiLocked] = useState(false);
  const [aiAuthenticated, setAiAuthenticated] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [mobileTab, setMobileTab] = useState('log');
  const [logScrollKey, setLogScrollKey] = useState(0);
  const [diceInsert, setDiceInsert] = useState(null);
  const [assistInsert, setAssistInsert] = useState(null);
  const [dmDiceResult, setDmDiceResult] = useState(null);
  const [dmDiceCount, setDmDiceCount] = useState(1);
  const [dmDiceMod, setDmDiceMod] = useState(0);
  const [showDmDice, setShowDmDice] = useState(false);

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
          <p>Select a campaign to start playing, or return home.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/campaigns" className="btn btn--primary">Browse Campaigns</Link>
            <Link to="/pbj" className="btn btn--ghost">Go Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAssigned) {
    return (
      <div className="gameboard-page">
        <header className="gameboard-header">
          <div>
            <h1 className="gameboard-header__title">{campaign.name}</h1>
            <p className="gameboard-header__scene">{campaign.currentScene}</p>
          </div>
        </header>
        <div className="spectator-notice">
          <span className="spectator-notice__icon">👁</span>
          <span>You're watching this campaign. Contact the DM to be assigned a character and join.</span>
        </div>
        <div className="spectator-log-wrap">
          <EncounterLog posts={posts} isLoading={false} scrollKey={0} isDm={isDm} onEdit={editPost} onDelete={deletePost} />
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
          {isAiCampaign && isDm && (
            <div className="mode-toggle">
              <span className="mode-toggle__label">Mode</span>
              <button
                type="button"
                className={`mode-toggle__btn ${playMode === 'manual' ? 'active' : ''}`}
                onClick={() => setPlayMode('manual')}
              >
                Pause AI
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
                  : 'AI assists with narration and companions'
                }
              >
                {aiLocked && !aiAuthenticated ? '🔒 AI Active' : 'AI Active'}
              </button>
            </div>
          )}
          <button className="btn btn--ghost" onClick={resetCampaign} title="Reset campaign">
            New Campaign
          </button>
        </div>
      </header>

      {isAiCampaign && playMode === 'manual' && (
        <p className="gameboard-banner gameboard-banner--manual">
          AI paused — DM is narrating this round directly.
        </p>
      )}
      {isAiCampaign && playMode === 'ai' && (
        <p className="gameboard-banner gameboard-banner--ai">
          AI-assisted — post your action, then click <strong>Get DM Response</strong> when the party is ready.
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
          {characters.length === 0 && (
            <p className="party-empty">No players assigned yet.</p>
          )}
          {characters.map((char, index) => (
            <div key={char.dbId ?? char.name} className="character-row">
              <button
                className={`character-btn ${index === activeCharacterIndex ? 'active' : ''}`}
                onClick={() => setActiveCharacter(index)}
              >
                <div className="character-btn__top">
                  <span className="character-btn__name">{char.name}</span>
                  <span className={`character-badge ${char.isAI ? 'character-badge--ai' : char.isOwn ? 'character-badge--human' : 'character-badge--other'}`}>
                    {char.isAI ? 'AI' : char.isOwn ? 'You' : char.ownerName || 'Player'}
                  </span>
                </div>
                <span className="character-btn__class">{char.class} {char.level}</span>
              </button>
              {char.dbId && (
                <Link
                  to={`/character/${char.dbId}`}
                  state={{ from: '/game', fromLabel: 'Game Board' }}
                  className="character-edit-link"
                  title={`Edit ${char.name}`}
                >✎</Link>
              )}
            </div>
          ))}

          <DiceRoller onRollResult={handleDiceRoll} />
        </aside>

        <section className={`encounter-log${mobileTab !== 'log' ? ' mobile-hidden' : ''}`}>
          <h3>Encounter Log</h3>
          <EncounterLog posts={posts} isLoading={isLoadingDM} postsReady={postsReady} postsFetchError={postsFetchError} scrollKey={logScrollKey} isDm={isDm} onEdit={editPost} onDelete={deletePost} />

          {isDm && myCharacter && (
            <div className="post-as-toggle">
              <button
                type="button"
                className={`post-as-toggle__btn ${postAs === 'character' ? 'active' : ''}`}
                onClick={() => handleSetPostAs('character')}
              >
                {myCharacter.name}
              </button>
              <button
                type="button"
                className={`post-as-toggle__btn ${postAs === 'dm' ? 'active' : ''}`}
                onClick={() => handleSetPostAs('dm')}
              >
                DM Narration
              </button>
            </div>
          )}

          {(myCharacter || isDm) && (
            <PostComposer
              authorName={postAs === 'dm' ? 'DM' : myCharacter?.name}
              appendText={postAs === 'character'
                ? diceInsert
                : postAs === 'dm'
                  ? (!diceInsert ? assistInsert : !assistInsert ? diceInsert : diceInsert.ts > assistInsert.ts ? diceInsert : assistInsert)
                  : null}
              onSubmit={handlePost}
              disabled={isLoadingDM}
              submitLabel={postAs === 'dm' ? 'Post DM Narration' : 'Post Action'}
              placeholder={
                postAs === 'dm'
                  ? 'Write what happens next — scene description, NPC dialogue, consequences...'
                  : 'Describe your action... (tip: type /roll 1d20+3 for dice rolls)'
              }
            />
          )}

          {isAiCampaign && playMode === 'ai' && (
            <div className="dm-response-row">
              <button
                className="btn btn--primary"
                onClick={aiLocked && !aiAuthenticated ? () => setShowUnlockModal(true) : runAiRound}
                disabled={isLoadingDM || (!allHumansPosted && aiAuthenticated)}
                title={
                  aiLocked && !aiAuthenticated ? 'Unlock AI DM first'
                  : !allHumansPosted ? 'Post your action first'
                  : 'Run AI companions then get DM narration'
                }
              >
                {isLoadingDM ? 'DM is responding...'
                  : aiLocked && !aiAuthenticated ? '🔒 Unlock AI DM'
                  : 'Get DM Response'}
              </button>
              {!allHumansPosted && aiAuthenticated && !isLoadingDM && (
                <span className="dm-response-hint">Post your action first</span>
              )}
              {dmError && (
                <p className="dm-response-error">{dmError}</p>
              )}
            </div>
          )}

          {isDm && postAs === 'dm' && (
            <>
              {isAiCampaign && playMode === 'ai' && (
                <DmAssist
                  campaign={campaign}
                  posts={posts}
                  characters={characters}
                  onInsert={(text) => setAssistInsert({ text, ts: Date.now() })}
                />
              )}

              {/* Scene starters */}
              <div className="dm-scene-starters">
                <span className="dm-scene-label">Scene starters</span>
                {[
                  { label: 'Combat starts', text: 'Roll for initiative.' },
                  { label: 'Enter location', text: 'You push through and stop.\n\n' },
                  { label: 'NPC speaks', text: '"Listen carefully," they say, dropping their voice. "What I\'m about to tell you doesn\'t leave this room."\n\n' },
                  { label: 'Scene ends', text: 'The immediate threat has passed. For now.\n\n' },
                  { label: 'Ambush', text: 'Something moves in the shadows — then they\'re on you.\n\n' },
                  { label: 'Travel', text: 'The road stretches ahead. Hours pass.\n\n' },
                  { label: 'Rest', text: 'You make camp as darkness settles. The fire crackles low.\n\n' },
                  { label: 'Revelation', text: 'That\'s when it clicks.\n\n' },
                ].map(s => (
                  <button
                    key={s.label}
                    className="btn btn--ghost btn--xs"
                    onClick={() => setAssistInsert({ text: s.text, ts: Date.now() })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* DM private dice roller */}
              <div className="dm-private-dice">
                <button className="dm-private-dice__toggle" onClick={() => setShowDmDice(s => !s)}>
                  {showDmDice ? '▲' : '▼'} DM Dice (private — not logged)
                </button>
                {showDmDice && (
                  <div className="dm-private-dice__panel">
                    <div className="dm-private-dice__controls">
                      <input
                        className="dm-dice-input"
                        type="number"
                        min={1}
                        max={20}
                        value={dmDiceCount}
                        onChange={e => setDmDiceCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        title="Number of dice"
                      />
                      <span className="dm-dice-sep">×</span>
                      {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                        <button
                          key={sides}
                          className="btn btn--ghost btn--xs"
                          onClick={() => {
                            const rolls = Array.from({ length: dmDiceCount }, () => Math.floor(Math.random() * sides) + 1);
                            const total = rolls.reduce((a, b) => a + b, 0) + dmDiceMod;
                            setDmDiceResult({ notation: `${dmDiceCount}d${sides}${dmDiceMod >= 0 ? '+' : ''}${dmDiceMod || ''}`, rolls, total });
                          }}
                        >
                          d{sides}
                        </button>
                      ))}
                      <span className="dm-dice-sep">+</span>
                      <input
                        className="dm-dice-input"
                        type="number"
                        value={dmDiceMod}
                        onChange={e => setDmDiceMod(parseInt(e.target.value) || 0)}
                        title="Modifier"
                      />
                    </div>
                    {dmDiceResult && (
                      <div className="dm-private-dice__result">
                        <span className="dm-dice-notation">{dmDiceResult.notation}</span>
                        <span className="dm-dice-rolls">[{dmDiceResult.rolls.join(', ')}]</span>
                        <span className="dm-dice-total">= {dmDiceResult.total}</span>
                        <button className="dm-dice-clear" onClick={() => setDmDiceResult(null)}>✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
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
            {activeTab === 'stats' && <StatsTab character={activeCharacter} onRollResult={handleDiceRoll} />}
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
