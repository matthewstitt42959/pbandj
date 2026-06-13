import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import mockCharacters from '../data/mockCharacters';
import { createNewCampaign } from '../data/defaultCampaign';
import { requestDMResponse, requestPlayerResponse } from '../services/aiDM';
import { rollDice, parseRollCommand } from '../services/dice';
import { levelUpGameChar, generateCompanionStats } from '../utils/characterUtils';

const STORAGE_KEY = 'pb-and-jay-game';

const SKILL_KEYS = [
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleightOfHand', 'stealth', 'survival',
];

export function mapDbCharToGame(dbChar) {
  const scores = dbChar.abilityScores ?? {};
  const modOf = s => Math.floor((s - 10) / 2);
  const profMap = dbChar.skills ?? {};

  const inventory = (Array.isArray(dbChar.inventory) ? dbChar.inventory : [])
    .map(i => typeof i === 'string' ? i : [i.name, (i.qty ?? 1) > 1 ? `(×${i.qty})` : '', i.notes].filter(Boolean).join(' '));

  const spells = (Array.isArray(dbChar.spells) ? dbChar.spells : [])
    .map(s => typeof s === 'string' ? s : s.name);

  return {
    name: dbChar.name,
    isAI: false,
    class: dbChar.class,
    level: dbChar.level,
    hp: { current: dbChar.hp, max: dbChar.maxHp },
    ac: dbChar.ac,
    speed: 30,
    abilities: Object.fromEntries(
      ['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [
        k, { score: scores[k] ?? 10, modifier: modOf(scores[k] ?? 10) },
      ])
    ),
    skills: Object.fromEntries(SKILL_KEYS.map(sk => [sk, (profMap[sk] ?? 0) > 0])),
    inventory,
    spells,
    conditions: Array.isArray(dbChar.conditions) ? dbChar.conditions : [],
    dbId: dbChar.id,
  };
}

const initialState = {
  characters: mockCharacters,
  benchedCompanions: [],
  campaign: null,
  posts: [],
  worldFacts: [],
  activeCharacterIndex: 0,
  playMode: 'manual',
  isLoadingDM: false,
  loadingPlayerIndex: null,
  dmError: null,
  sessionsAtLevel: 0,
  totalSessions: 0,
  initialized: false,
};

function migrateState(saved) {
  if (saved.characters) {
    saved.characters = saved.characters.map((char, i) => ({
      isAI: i !== 0,
      ...char,
    }));
  }
  return { playMode: 'manual', sessionsAtLevel: 0, totalSessions: 0, benchedCompanions: [], ...saved };
}

function loadLocalGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function applyRollToContent(content) {
  const rollNotation = parseRollCommand(content);
  if (!rollNotation) return content;

  const result = rollDice(rollNotation);
  if (!result) return content;

  const modPart = result.modifier
    ? ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}`
    : '';
  return `${content}\n🎲 ${result.notation}: [${result.rolls.join(', ')}]${modPart} = **${result.total}**`;
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, initialized: true };

    case 'START_CAMPAIGN': {
      const fresh = createNewCampaign();
      return {
        ...state,
        campaign: fresh.campaign,
        posts: fresh.posts,
        worldFacts: fresh.worldFacts,
        playMode: 'manual',
        dmError: null,
      };
    }

    case 'RESET_CAMPAIGN':
      return { ...initialState, characters: state.characters, initialized: true };

    case 'SET_CHARACTER':
      return { ...state, activeCharacterIndex: action.index };

    case 'SET_PLAY_MODE':
      return { ...state, playMode: action.mode, dmError: null };

    case 'TOGGLE_CHARACTER_AI':
      if (action.index === 0) return state; // player 1 is always human
      return {
        ...state,
        characters: state.characters.map((char, i) =>
          i === action.index ? { ...char, isAI: !char.isAI } : char
        ),
      };

    case 'ADD_POST':
      return { ...state, posts: [...state.posts, action.post], dmError: null };

    case 'ADD_WORLD_FACTS':
      return {
        ...state,
        worldFacts: [
          ...state.worldFacts,
          ...action.facts.map((f, i) => ({
            id: `fact-${Date.now()}-${i}`,
            title: f.title,
            content: f.content,
          })),
        ],
      };

    case 'SET_LOADING_DM':
      return { ...state, isLoadingDM: action.loading, dmError: action.error ?? null };

    case 'SET_LOADING_PLAYER':
      return { ...state, loadingPlayerIndex: action.index };

    case 'UPDATE_CHARACTER':
      return {
        ...state,
        characters: state.characters.map((char, i) =>
          i === action.index ? { ...char, ...action.updates } : char
        ),
      };

    case 'MARK_SESSION':
      return {
        ...state,
        sessionsAtLevel: state.sessionsAtLevel + 1,
        totalSessions: state.totalSessions + 1,
      };

    case 'SET_PLAYER_CHARACTER':
      return {
        ...state,
        characters: state.characters.map((char, i) =>
          i === 0 ? { ...action.character, isAI: false } : char
        ),
      };

    case 'ADD_TO_PARTY': {
      const companion = state.benchedCompanions.find(c => c.name === action.name);
      if (!companion) return state;
      const aiSlots = state.characters.filter((_, i) => i !== 0).length;
      if (aiSlots >= 4) return state; // party full (max 5 including player)
      return {
        ...state,
        characters: [...state.characters, { ...companion, isAI: true }],
        benchedCompanions: state.benchedCompanions.filter(c => c.name !== action.name),
      };
    }

    case 'BENCH_COMPANION': {
      const companion = state.characters.find((c, i) => i !== 0 && c.name === action.name);
      if (!companion) return state;
      return {
        ...state,
        characters: state.characters.filter((c, i) => i === 0 || c.name !== action.name),
        benchedCompanions: [...state.benchedCompanions, companion],
        activeCharacterIndex: 0, // reset to player if benched char was selected
      };
    }

    case 'CREATE_COMPANION': {
      const comp = action.companion;
      const aiSlots = state.characters.filter((_, i) => i !== 0).length;
      const goToParty = aiSlots < 4;
      return {
        ...state,
        characters: goToParty ? [...state.characters, comp] : state.characters,
        benchedCompanions: goToParty ? state.benchedCompanions : [...state.benchedCompanions, comp],
      };
    }

    case 'DELETE_COMPANION':
      return {
        ...state,
        benchedCompanions: state.benchedCompanions.filter(c => c.name !== action.name),
      };

    case 'LEVEL_UP_ALL':
      return {
        ...state,
        characters: state.characters.map(levelUpGameChar),
        benchedCompanions: state.benchedCompanions.map(levelUpGameChar),
        sessionsAtLevel: 0,
      };

    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    async function init() {
      // Try server first (enables cross-device sync)
      try {
        const res = await fetch('/api/game');
        if (res.ok) {
          const { state } = await res.json();
          if (state) {
            dispatch({ type: 'INIT', payload: migrateState(state) });
            return;
          }
        }
      } catch {
        // Server unreachable — fall through to localStorage
      }
      const local = loadLocalGame();
      dispatch({ type: 'INIT', payload: local ?? {} });
    }
    init();
  }, []);

  useEffect(() => {
    if (!state.initialized) return;
    const { initialized, isLoadingDM, loadingPlayerIndex, dmError, ...toSave } = state;

    // Always save locally for fast reload
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

    // Debounced server save for cross-device sync
    const timer = setTimeout(() => {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: toSave }),
      }).catch(() => {}); // silently ignore if offline
    }, 1000);

    return () => clearTimeout(timer);
  }, [state]);

  const startCampaign = useCallback(() => {
    dispatch({ type: 'START_CAMPAIGN' });
  }, []);

  const resetCampaign = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'RESET_CAMPAIGN' });
  }, []);

  const setActiveCharacter = useCallback((index) => {
    dispatch({ type: 'SET_CHARACTER', index });
  }, []);

  const setPlayMode = useCallback((mode) => {
    dispatch({ type: 'SET_PLAY_MODE', mode });
  }, []);

  const toggleCharacterAI = useCallback((index) => {
    if (index === 0) return;
    dispatch({ type: 'TOGGLE_CHARACTER_AI', index });
  }, []);

  const addPost = useCallback((author, content, type = 'player', aiActions = null) => {
    const post = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author,
      type,
      content,
      timestamp: Date.now(),
      ...(aiActions?.length ? { aiActions } : {}),
    };
    dispatch({ type: 'ADD_POST', post });
    return post;
  }, []);

  const submitCharacterPost = useCallback(
    async (content) => {
      if (!state.campaign) return;

      const character = state.characters[state.activeCharacterIndex];
      const finalContent = applyRollToContent(content);
      const humanPost = addPost(character.name, finalContent, 'player');

      if (state.playMode !== 'ai') return;

      // Snapshot state for this entire round so mid-chain renders don't cause stale reads
      const { campaign, characters, worldFacts } = state;
      let runningPosts = [...state.posts, humanPost];

      dispatch({ type: 'SET_LOADING_DM', loading: true, error: null });

      // AI players take their turns sequentially — collected silently, not shown in log
      const aiActions = [];
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        if (!char.isAI) continue;

        dispatch({ type: 'SET_LOADING_PLAYER', index: i });

        try {
          const { action } = await requestPlayerResponse({
            character: char,
            campaign,
            posts: runningPosts,
            characters,
            worldFacts,
          });
          aiActions.push({ character: char.name, action });
          // Add to running context so DM sees all actions, but don't put in the visible log
          runningPosts = [...runningPosts, {
            id: `ctx-${Date.now()}-${i}`,
            author: char.name,
            type: 'player',
            content: action,
            timestamp: Date.now(),
          }];
        } catch (err) {
          dispatch({ type: 'SET_LOADING_DM', loading: false, error: `${char.name}: ${err.message}` });
          dispatch({ type: 'SET_LOADING_PLAYER', index: null });
          return;
        }
      }

      dispatch({ type: 'SET_LOADING_PLAYER', index: null });

      // DM narrates the full round, with AI actions attached for the expandable accordion
      try {
        const { narrative, facts } = await requestDMResponse({
          campaign,
          posts: runningPosts,
          characters,
          worldFacts,
          playerAction: { author: character.name, content: finalContent },
          allActed: characters.some((c) => c.isAI),
          aiActions,
        });

        addPost('DM', narrative, 'dm', aiActions.length ? aiActions : null);

        if (facts?.length) {
          dispatch({ type: 'ADD_WORLD_FACTS', facts });
        }
      } catch (err) {
        dispatch({ type: 'SET_LOADING_DM', loading: false, error: err.message });
        return;
      }

      dispatch({ type: 'SET_LOADING_DM', loading: false, error: null });
    },
    [state, addPost]
  );

  const updateCharacter = useCallback((index, updates) => {
    dispatch({ type: 'UPDATE_CHARACTER', index, updates });
  }, []);

  const setPlayerCharacter = useCallback((dbChar) => {
    dispatch({ type: 'SET_PLAYER_CHARACTER', character: mapDbCharToGame(dbChar) });
  }, []);

  const levelUpParty = useCallback(() => {
    dispatch({ type: 'LEVEL_UP_ALL' });
  }, []);

  const markSessionComplete = useCallback(() => {
    dispatch({ type: 'MARK_SESSION' });
  }, []);

  const addToParty = useCallback((name) => {
    dispatch({ type: 'ADD_TO_PARTY', name });
  }, []);

  const benchCompanion = useCallback((name) => {
    dispatch({ type: 'BENCH_COMPANION', name });
  }, []);

  const createCompanion = useCallback(({ name, className, personality }) => {
    const currentLevel = state.characters[0]?.level ?? 1;
    const stats = generateCompanionStats(className, currentLevel);
    dispatch({
      type: 'CREATE_COMPANION',
      companion: { ...stats, name, class: className, personality: personality ?? '', isAI: true },
    });
  }, [state.characters]);

  const deleteCompanion = useCallback((name) => {
    dispatch({ type: 'DELETE_COMPANION', name });
  }, []);

  const submitDMPost = useCallback(
    (content) => {
      if (!state.campaign || !content.trim()) return;
      addPost('DM', content.trim(), 'dm');
    },
    [state.campaign, addPost]
  );

  const value = {
    ...state,
    activeCharacter: state.characters[state.activeCharacterIndex],
    isManualMode: state.playMode === 'manual',
    startCampaign,
    resetCampaign,
    setActiveCharacter,
    setPlayMode,
    toggleCharacterAI,
    addPost,
    submitCharacterPost,
    submitDMPost,
    updateCharacter,
    setPlayerCharacter,
    levelUpParty,
    markSessionComplete,
    addToParty,
    benchCompanion,
    createCompanion,
    deleteCompanion,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
