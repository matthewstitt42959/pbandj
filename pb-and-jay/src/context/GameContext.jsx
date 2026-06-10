import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import mockCharacters from '../data/mockCharacters';
import { createNewCampaign } from '../data/defaultCampaign';
import { requestDMResponse } from '../services/aiDM';
import { rollDice, parseRollCommand } from '../services/dice';

const STORAGE_KEY = 'pb-and-jay-game';

const initialState = {
  characters: mockCharacters,
  campaign: null,
  posts: [],
  worldFacts: [],
  activeCharacterIndex: 0,
  playMode: 'manual',
  isLoadingDM: false,
  dmError: null,
  initialized: false,
};

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return { playMode: 'manual', ...saved };
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

    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    const saved = loadSavedGame();
    if (saved) {
      dispatch({ type: 'INIT', payload: saved });
    } else {
      dispatch({ type: 'INIT', payload: {} });
    }
  }, []);

  useEffect(() => {
    if (!state.initialized) return;
    const { initialized, isLoadingDM, dmError, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
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

  const addPost = useCallback((author, content, type = 'player') => {
    const post = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author,
      type,
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_POST', post });
    return post;
  }, []);

  const requestAIResponse = useCallback(
    async (playerPost, finalContent, characterName) => {
      dispatch({ type: 'SET_LOADING_DM', loading: true, error: null });

      try {
        const { narrative, facts } = await requestDMResponse({
          campaign: state.campaign,
          posts: [...state.posts, playerPost],
          characters: state.characters,
          worldFacts: state.worldFacts,
          playerAction: { author: characterName, content: finalContent },
        });

        addPost('DM', narrative, 'dm');

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

  const submitCharacterPost = useCallback(
    async (content) => {
      if (!state.campaign) return;

      const character = state.characters[state.activeCharacterIndex];
      const finalContent = applyRollToContent(content);
      const playerPost = addPost(character.name, finalContent, 'player');

      if (state.playMode === 'ai') {
        await requestAIResponse(playerPost, finalContent, character.name);
      }
    },
    [state, addPost, requestAIResponse]
  );

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
    addPost,
    submitCharacterPost,
    submitDMPost,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
