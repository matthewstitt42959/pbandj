import React, { createContext, useContext, useReducer, useState, useEffect, useCallback, useRef } from 'react';
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

export const initialState = {
  characters: [],
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
  roundPosters: [],
  initialized: false,
};

const SANDBOX_NAME = 'The Whispering Hollow';

function migrateState(saved) {
  // Wipe legacy local-only sandbox data — only when there is no real DB campaign id
  if (saved.campaign?.name === SANDBOX_NAME && !saved.campaign?.id) {
    saved.campaign = null;
    saved.posts = [];
    saved.worldFacts = [];
  }
  // Wipe persisted mock characters (no dbId = not a real DB character)
  if (saved.characters?.length && !saved.characters[0].dbId) {
    saved.characters = [];
  }
  if (saved.characters?.length) {
    saved.characters = saved.characters.map((char, i) => ({
      isAI: i !== 0,
      ...char,
    }));
  }
  return { playMode: 'manual', sessionsAtLevel: 0, totalSessions: 0, benchedCompanions: [], roundPosters: [], ...saved };
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

async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1200) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, baseDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
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

export function gameReducer(state, action) {
  switch (action.type) {
    case 'INIT': {
      // React Strict Mode double-invokes effects, producing a second INIT for the same campaign
      // after SET_POSTS has already populated posts. Preserve posts when reinitializing with the
      // same campaign so the Strict Mode re-mount doesn't wipe what polling just loaded.
      const sameCampaign =
        action.payload.campaign?.id && action.payload.campaign.id === state.campaign?.id;
      return {
        ...state,
        ...action.payload,
        posts: sameCampaign ? state.posts : [],
        initialized: true,
      };
    }

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

    case 'LOAD_CAMPAIGN_CHARACTERS':
      return { ...state, characters: action.characters, activeCharacterIndex: 0 };

    case 'SET_POSTS':
      return { ...state, posts: action.posts };

    case 'UPDATE_POST':
      return { ...state, posts: state.posts.map(p => p.id === action.post.id ? action.post : p) };

    case 'REMOVE_POST':
      return { ...state, posts: state.posts.filter(p => p.id !== action.postId) };

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

    case 'RECORD_ROUND_POST':
      if (state.roundPosters.includes(action.name)) return state;
      return { ...state, roundPosters: [...state.roundPosters, action.name] };

    case 'CLEAR_ROUND':
      return { ...state, roundPosters: [] };

    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    async function init() {
      const tok = localStorage.getItem('pb-and-jay-token');
      const authHeaders = tok ? { Authorization: `Bearer ${tok}` } : {};

      // If a "Play" action requested a specific campaign, load that campaign's own state slot
      const switchId = localStorage.getItem('pb-and-jay-load-campaign');
      if (switchId) {
        localStorage.removeItem('pb-and-jay-load-campaign');
        try {
          const [gr, cr] = await Promise.all([
            fetch(`/api/game?campaign=${encodeURIComponent(switchId)}`, { headers: authHeaders }),
            fetch(`/api/campaigns/${switchId}`, { headers: authHeaders }),
          ]);
          const { state: saved } = gr.ok ? await gr.json() : { state: null };
          const c = cr.ok ? await cr.json() : null;
          const payload = saved ? migrateState(saved) : { ...initialState };
          if (c) {
            payload.campaign = {
              id: c.id, name: c.name, setting: c.setting,
              currentScene: c.openingScene, isAiGame: c.isAiGame ?? false,
            };
            if (c.isAiGame) payload.playMode = 'ai';
          }
          payload.posts = [];
          dispatch({ type: 'INIT', payload });
          return;
        } catch {}
      }

      // Try server first (enables cross-device sync).
      // Use the per-campaign slot if we know which campaign was last active.
      const lastCampaignId = localStorage.getItem('pb-and-jay-last-campaign');
      const gameUrl = lastCampaignId
        ? `/api/game?campaign=${encodeURIComponent(lastCampaignId)}`
        : '/api/game';
      try {
        const res = await fetch(gameUrl, { headers: authHeaders });
        if (res.ok) {
          const { state } = await res.json();
          if (state) {
            const migrated = migrateState(state);
            // If saved state has no campaign, fetch the active one
            if (!migrated.campaign?.id) {
              try {
                const cr = await fetch('/api/campaigns/active', { headers: { ...(localStorage.getItem('pb-and-jay-token') ? { Authorization: `Bearer ${localStorage.getItem('pb-and-jay-token')}` } : {}) } });
                if (cr.ok) {
                  const active = await cr.json();
                  if (active) {
                    migrated.campaign = {
                      id: active.id,
                      name: active.name,
                      setting: active.setting,
                      currentScene: active.openingScene,
                      isAiGame: active.isAiGame ?? false,
                    };
                    if (active.isAiGame) migrated.playMode = 'ai';
                  }
                }
              } catch {}
            }
            // Always use AI mode for AI campaigns
            if (migrated.campaign?.isAiGame) migrated.playMode = 'ai';
            // One-time migration: save any legacy blob posts to the DB
            if (migrated.campaign?.id && migrated.posts?.length > 0) {
              const tok = localStorage.getItem('pb-and-jay-token');
              for (const p of migrated.posts) {
                await fetch(`/api/campaigns/${migrated.campaign.id}/posts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
                  body: JSON.stringify({ author: p.author, type: p.type, content: p.content }),
                }).catch(() => {});
              }
            }
            migrated.posts = []; // poll will load them from DB
            dispatch({ type: 'INIT', payload: migrated });
            return;
          }
        }
      } catch {
        // Server unreachable — fall through to localStorage
      }
      // Default to empty object so new users (no localStorage) still get the active campaign
      const local = loadLocalGame() ?? {};
      // If no campaign or a stale one without an id, fetch the active campaign
      if (!local.campaign?.id) {
        try {
          const cr = await fetch('/api/campaigns/active', { headers: { ...(localStorage.getItem('pb-and-jay-token') ? { Authorization: `Bearer ${localStorage.getItem('pb-and-jay-token')}` } : {}) } });
          if (cr.ok) {
            const active = await cr.json();
            if (active) {
              local.campaign = {
                id: active.id,
                name: active.name,
                setting: active.setting,
                currentScene: active.openingScene,
                isAiGame: active.isAiGame ?? false,
              };
              if (active.isAiGame) local.playMode = 'ai';
            }
          }
        } catch {}
      }
      // Always use AI mode for AI campaigns
      if (local.campaign?.isAiGame) local.playMode = 'ai';
      if (local.campaign?.id && local.posts?.length > 0) {
        const tok = localStorage.getItem('pb-and-jay-token');
        for (const p of local.posts) {
          await fetch(`/api/campaigns/${local.campaign.id}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
            body: JSON.stringify({ author: p.author, type: p.type, content: p.content }),
          }).catch(() => {});
        }
        local.posts = [];
      }
      dispatch({ type: 'INIT', payload: local });
    }
    init();
  }, []);

  useEffect(() => {
    if (!state.initialized) return;
    // Exclude posts — they live in the DB now, not the state blob
    const { initialized, isLoadingDM, loadingPlayerIndex, dmError, posts, ...toSave } = state;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

    const timer = setTimeout(() => {
      const tok = localStorage.getItem('pb-and-jay-token');
      const cId = toSave.campaign?.id;
      if (cId) localStorage.setItem('pb-and-jay-last-campaign', cId);
      const saveUrl = cId ? `/api/game?campaign=${encodeURIComponent(cId)}` : '/api/game';
      fetch(saveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ state: toSave }),
      }).catch(() => {});
    }, 1000);

    return () => clearTimeout(timer);
  }, [state]);

  // Track whether the first post fetch has completed so the log can show a loading state
  const [postsReady, setPostsReady] = useState(false);
  const [postsFetchError, setPostsFetchError] = useState(null);

  // Poll for posts from the DB every 5 seconds when a real campaign is active
  useEffect(() => {
    const campaignId = state.campaign?.id;
    if (!campaignId) { setPostsReady(false); setPostsFetchError(null); return; }

    setPostsReady(false);
    setPostsFetchError(null);
    const token = () => localStorage.getItem('pb-and-jay-token');
    let lastPostId = null;
    const fetchPosts = () =>
      fetch(`/api/campaigns/${campaignId}/posts`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
        .then(async r => {
          if (r.ok) return r.json();
          const text = await r.text().catch(() => '');
          throw new Error(`${r.status} ${text || r.statusText}`);
        })
        .then(posts => {
          setPostsReady(true);
          setPostsFetchError(null);
          const newestId = posts[posts.length - 1]?.id ?? null;
          if (newestId !== lastPostId) {
            lastPostId = newestId;
            dispatch({ type: 'SET_POSTS', posts });
          }
        })
        .catch(err => {
          setPostsReady(true);
          setPostsFetchError(err.message);
        });

    fetchPosts();
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, [state.campaign?.id]);

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

  const addPost = useCallback(async (author, content, type = 'player', aiActions = null) => {
    const campaignId = state.campaign?.id;
    if (campaignId) {
      try {
        const tok = localStorage.getItem('pb-and-jay-token');
        const res = await fetch(`/api/campaigns/${campaignId}/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
          body: JSON.stringify({ author, type, content, aiActions }),
        });
        if (res.ok) {
          const post = await res.json();
          dispatch({ type: 'ADD_POST', post });
          return post;
        }
      } catch {}
    }
    // Fallback for sandbox / offline
    const post = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author, type, content, timestamp: Date.now(),
      ...(aiActions?.length ? { aiActions } : {}),
    };
    dispatch({ type: 'ADD_POST', post });
    return post;
  }, [state.campaign?.id]);

  const submitCharacterPost = useCallback(
    (content) => {
      if (!state.campaign) return;
      // Always post as the viewer's own character, not just the selected one
      const character = state.characters.find(c => c.isOwn) ?? state.characters[state.activeCharacterIndex];
      if (!character) return;
      const finalContent = applyRollToContent(content);
      addPost(character.name, finalContent, 'player');
      dispatch({ type: 'RECORD_ROUND_POST', name: character.name });
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

  // Load real characters from the active campaign. currentUserId identifies which char belongs to the viewer.
  // All characters in a real campaign are human — isAI is reserved for future AI-companion feature.
  const loadCampaignCharacters = useCallback((dbChars, currentUserId) => {
    const characters = dbChars.map(c => ({
      ...mapDbCharToGame(c),
      isAI: false,
      isOwn: c.userId === currentUserId,
      ownerId: c.userId,
      ownerName: c.user?.displayName ?? c.user?.username ?? '',
    }));
    // Put the current user's character first if present
    const myIndex = characters.findIndex(c => c.isOwn);
    if (myIndex > 0) {
      const [mine] = characters.splice(myIndex, 1);
      characters.unshift(mine);
    }
    dispatch({ type: 'LOAD_CAMPAIGN_CHARACTERS', characters });
  }, []);

  const editPost = useCallback(async (postId, content) => {
    const campaignId = state.campaign?.id;
    if (!campaignId) return;
    const tok = localStorage.getItem('pb-and-jay-token');
    const res = await fetch(`/api/campaigns/${campaignId}/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const post = await res.json();
      dispatch({ type: 'UPDATE_POST', post });
    }
  }, [state.campaign?.id]);

  const deletePost = useCallback(async (postId) => {
    const campaignId = state.campaign?.id;
    if (!campaignId) return;
    const tok = localStorage.getItem('pb-and-jay-token');
    const res = await fetch(`/api/campaigns/${campaignId}/posts/${postId}`, {
      method: 'DELETE',
      headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    });
    if (res.ok) dispatch({ type: 'REMOVE_POST', postId });
  }, [state.campaign?.id]);

  const submitDMPost = useCallback(
    (content) => {
      if (!state.campaign || !content.trim()) return;
      addPost('DM', content.trim(), 'dm');
    },
    [state.campaign, addPost]
  );

  // Runs AI companion turns (visible) then AI DM response.
  // Retries each network call up to 3x on failure.
  // Companions that already posted this round (from a prior failed attempt) are skipped.
  const runAiRound = useCallback(
    async () => {
      if (!state.campaign || state.isLoadingDM || state.playMode !== 'ai') return;

      const { campaign, characters, worldFacts, posts, roundPosters } = state;
      let runningPosts = [...posts];

      dispatch({ type: 'SET_LOADING_DM', loading: true, error: null });

      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        if (!char.isAI) continue;

        // Skip companions that already posted (handles retry after partial failure)
        if (roundPosters.includes(char.name)) {
          const existing = [...posts].reverse().find(p => p.author === char.name);
          if (existing && !runningPosts.find(p => p.id === existing.id)) {
            runningPosts = [...runningPosts, existing];
          }
          continue;
        }

        dispatch({ type: 'SET_LOADING_PLAYER', index: i });

        try {
          const { action } = await withRetry(() =>
            requestPlayerResponse({ character: char, campaign, posts: runningPosts, characters, worldFacts })
          );
          const companionPost = await addPost(char.name, action, 'player');
          dispatch({ type: 'RECORD_ROUND_POST', name: char.name });
          runningPosts = [...runningPosts, companionPost];
        } catch (err) {
          dispatch({ type: 'SET_LOADING_DM', loading: false, error: `${char.name} couldn't post — tap "Get DM Response" to retry.` });
          dispatch({ type: 'SET_LOADING_PLAYER', index: null });
          return;
        }
      }

      dispatch({ type: 'SET_LOADING_PLAYER', index: null });

      try {
        const { narrative, facts } = await withRetry(() =>
          requestDMResponse({ campaign, posts: runningPosts, characters, worldFacts, allActed: characters.some(c => c.isAI) })
        );
        await addPost('DM', narrative, 'dm');
        if (facts?.length) dispatch({ type: 'ADD_WORLD_FACTS', facts });
      } catch (err) {
        dispatch({ type: 'SET_LOADING_DM', loading: false, error: 'DM response failed — tap "Get DM Response" to retry.' });
        return;
      }

      dispatch({ type: 'SET_LOADING_DM', loading: false, error: null });
      dispatch({ type: 'CLEAR_ROUND' });
    },
    [state, addPost]
  );

  const switchCampaign = useCallback(async (campaignId) => {
    const tok = localStorage.getItem('pb-and-jay-token');
    const authHeaders = tok ? { Authorization: `Bearer ${tok}` } : {};
    try {
      const [gr, cr] = await Promise.all([
        fetch(`/api/game?campaign=${encodeURIComponent(campaignId)}`, { headers: authHeaders }),
        fetch(`/api/campaigns/${campaignId}`, { headers: authHeaders }),
      ]);
      const { state: saved } = gr.ok ? await gr.json() : { state: null };
      const c = cr.ok ? await cr.json() : null;
      const payload = saved ? migrateState(saved) : { ...initialState };
      if (c) {
        payload.campaign = {
          id: c.id, name: c.name, setting: c.setting,
          currentScene: c.openingScene, isAiGame: c.isAiGame ?? false,
        };
        if (c.isAiGame) payload.playMode = 'ai';
      }
      payload.posts = [];
      localStorage.setItem('pb-and-jay-last-campaign', campaignId);
      dispatch({ type: 'INIT', payload });
    } catch {}
  }, []);

  const value = {
    ...state,
    postsReady,
    postsFetchError,
    activeCharacter: state.characters[state.activeCharacterIndex],
    isManualMode: state.playMode === 'manual',
    hasPostedThisRound: (name) => state.roundPosters.includes(name),
    startCampaign,
    resetCampaign,
    setActiveCharacter,
    setPlayMode,
    toggleCharacterAI,
    addPost,
    editPost,
    deletePost,
    submitCharacterPost,
    submitDMPost,
    runAiRound,
    updateCharacter,
    setPlayerCharacter,
    levelUpParty,
    markSessionComplete,
    addToParty,
    benchCompanion,
    createCompanion,
    deleteCompanion,
    loadCampaignCharacters,
    switchCampaign,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
