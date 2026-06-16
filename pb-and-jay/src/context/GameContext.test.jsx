import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// ── Module stubs (GameContext deps not under test) ────────────────────────────

vi.mock('../data/defaultCampaign', () => ({
  createNewCampaign: () => ({ campaign: { id: 'new', name: 'New' }, posts: [], worldFacts: [] }),
}));
vi.mock('../services/aiDM', () => ({
  requestDMResponse: vi.fn(),
  requestPlayerResponse: vi.fn(),
}));
vi.mock('../services/dice', () => ({
  rollDice: vi.fn(() => null),
  parseRollCommand: vi.fn(() => null),
}));
vi.mock('../utils/characterUtils', () => ({
  levelUpGameChar: vi.fn(c => c),
  generateCompanionStats: vi.fn(() => ({})),
}));

import { gameReducer, initialState, GameProvider, useGame } from './GameContext';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CAMPAIGN = { id: 'c1', name: 'Test Campaign', setting: '', currentScene: '', isAiGame: false };
const POSTS = [
  { id: 'p1', author: 'DM', type: 'dm', content: 'Scene begins', timestamp: 1000 },
  { id: 'p2', author: 'Aria', type: 'player', content: 'I approach.', timestamp: 2000 },
];

const mkPost = (id, overrides = {}) => ({
  id, author: 'DM', type: 'dm', content: 'Hello', timestamp: 1000, ...overrides,
});

// ── gameReducer: INIT ─────────────────────────────────────────────────────────

describe('gameReducer — INIT', () => {
  it('marks state as initialized', () => {
    const next = gameReducer(initialState, { type: 'INIT', payload: { campaign: CAMPAIGN, posts: [] } });
    expect(next.initialized).toBe(true);
  });

  it('sets the campaign from the payload', () => {
    const next = gameReducer(initialState, { type: 'INIT', payload: { campaign: CAMPAIGN, posts: [] } });
    expect(next.campaign.id).toBe('c1');
  });

  it('starts with empty posts on first load (no prior campaign)', () => {
    const next = gameReducer(initialState, { type: 'INIT', payload: { campaign: CAMPAIGN, posts: [] } });
    expect(next.posts).toEqual([]);
  });

  it('preserves existing posts when reinitializing with the SAME campaign (Strict Mode fix)', () => {
    const loaded = { ...initialState, campaign: CAMPAIGN, posts: POSTS, initialized: true };
    const next = gameReducer(loaded, { type: 'INIT', payload: { campaign: CAMPAIGN, posts: [] } });
    expect(next.posts).toHaveLength(2);
    expect(next.posts[0].id).toBe('p1');
  });

  it('resets posts when switching to a DIFFERENT campaign', () => {
    const loaded = { ...initialState, campaign: CAMPAIGN, posts: POSTS, initialized: true };
    const next = gameReducer(loaded, {
      type: 'INIT',
      payload: { campaign: { ...CAMPAIGN, id: 'c2' }, posts: [] },
    });
    expect(next.posts).toEqual([]);
  });

  it('resets posts when payload has no campaign', () => {
    const loaded = { ...initialState, campaign: CAMPAIGN, posts: POSTS, initialized: true };
    const next = gameReducer(loaded, { type: 'INIT', payload: { campaign: null, posts: [] } });
    expect(next.posts).toEqual([]);
  });
});

// ── gameReducer: SET_POSTS ────────────────────────────────────────────────────

describe('gameReducer — SET_POSTS', () => {
  it('replaces the posts array', () => {
    const s = { ...initialState, posts: [mkPost('old')] };
    const next = gameReducer(s, { type: 'SET_POSTS', posts: POSTS });
    expect(next.posts).toHaveLength(2);
    expect(next.posts[0].id).toBe('p1');
  });

  it('can clear posts with an empty array', () => {
    const s = { ...initialState, posts: POSTS };
    const next = gameReducer(s, { type: 'SET_POSTS', posts: [] });
    expect(next.posts).toEqual([]);
  });
});

// ── gameReducer: ADD_POST ─────────────────────────────────────────────────────

describe('gameReducer — ADD_POST', () => {
  it('appends a post', () => {
    const next = gameReducer(initialState, { type: 'ADD_POST', post: mkPost('p1') });
    expect(next.posts).toHaveLength(1);
    expect(next.posts[0].id).toBe('p1');
  });

  it('preserves order across multiple adds', () => {
    const s1 = gameReducer(initialState, { type: 'ADD_POST', post: mkPost('p1') });
    const s2 = gameReducer(s1, { type: 'ADD_POST', post: mkPost('p2') });
    expect(s2.posts.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('clears dmError on add', () => {
    const s = { ...initialState, dmError: 'oops' };
    const next = gameReducer(s, { type: 'ADD_POST', post: mkPost('p1') });
    expect(next.dmError).toBeNull();
  });
});

// ── gameReducer: UPDATE_POST / REMOVE_POST ────────────────────────────────────

describe('gameReducer — UPDATE_POST / REMOVE_POST', () => {
  const base = { ...initialState, posts: [mkPost('p1', { content: 'original' }), mkPost('p2')] };

  it('updates content in place', () => {
    const next = gameReducer(base, { type: 'UPDATE_POST', post: { ...mkPost('p1'), content: 'edited' } });
    expect(next.posts.find(p => p.id === 'p1').content).toBe('edited');
    expect(next.posts).toHaveLength(2);
  });

  it('removes the specified post and keeps the rest', () => {
    const next = gameReducer(base, { type: 'REMOVE_POST', postId: 'p1' });
    expect(next.posts).toHaveLength(1);
    expect(next.posts[0].id).toBe('p2');
  });
});

// ── gameReducer: manual play ──────────────────────────────────────────────────

describe('gameReducer — manual play', () => {
  it('SET_PLAY_MODE switches mode', () => {
    const toAI = gameReducer(initialState, { type: 'SET_PLAY_MODE', mode: 'ai' });
    expect(toAI.playMode).toBe('ai');
    const back = gameReducer(toAI, { type: 'SET_PLAY_MODE', mode: 'manual' });
    expect(back.playMode).toBe('manual');
  });

  it('SET_PLAY_MODE clears dmError', () => {
    const s = { ...initialState, dmError: 'failure' };
    expect(gameReducer(s, { type: 'SET_PLAY_MODE', mode: 'manual' }).dmError).toBeNull();
  });

  it('RECORD_ROUND_POST tracks who has posted this round', () => {
    const next = gameReducer(initialState, { type: 'RECORD_ROUND_POST', name: 'Aria' });
    expect(next.roundPosters).toContain('Aria');
  });

  it('RECORD_ROUND_POST is idempotent — no duplicate entries', () => {
    const s1 = gameReducer(initialState, { type: 'RECORD_ROUND_POST', name: 'Aria' });
    const s2 = gameReducer(s1, { type: 'RECORD_ROUND_POST', name: 'Aria' });
    expect(s2.roundPosters.filter(n => n === 'Aria')).toHaveLength(1);
  });

  it('multiple characters can post in the same round', () => {
    const s1 = gameReducer(initialState, { type: 'RECORD_ROUND_POST', name: 'Aria' });
    const s2 = gameReducer(s1, { type: 'RECORD_ROUND_POST', name: 'Borin' });
    expect(s2.roundPosters).toContain('Aria');
    expect(s2.roundPosters).toContain('Borin');
  });

  it('CLEAR_ROUND resets all round posters', () => {
    const s = { ...initialState, roundPosters: ['Aria', 'Borin'] };
    const next = gameReducer(s, { type: 'CLEAR_ROUND' });
    expect(next.roundPosters).toEqual([]);
  });
});

// ── Poll integration (renderHook + fetch mock) ────────────────────────────────
// These tests do NOT use vi.useFakeTimers — fake timers block waitFor's internal
// setTimeout and cause tests to hang. The fetch mocks resolve as microtasks, so
// real timers + waitFor is sufficient.

const Wrapper = ({ children }) => <GameProvider>{children}</GameProvider>;

function setupFetch({ gameState = { campaign: CAMPAIGN, posts: [] }, polls = POSTS } = {}) {
  global.fetch = vi.fn((url, options) => {
    const method = (options?.method ?? 'GET').toUpperCase();

    if (url === '/api/game' && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ state: gameState }) });
    }
    if (url === '/api/game' && method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    }
    if (typeof url === 'string' && url.endsWith('/posts') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(polls) });
    }
    if (typeof url === 'string' && url.includes('/posts') && method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mkPost('new')) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
  });
}

describe('post polling integration', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('loads posts from the server on mount', async () => {
    setupFetch();
    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.postsReady).toBe(true), { timeout: 3000 });
    expect(result.current.posts).toHaveLength(2);
    expect(result.current.posts[0].id).toBe('p1');
    expect(result.current.posts[1].id).toBe('p2');
  });

  it('postsReady becomes true after the first successful fetch', async () => {
    setupFetch();
    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    // Initially false
    expect(result.current.postsReady).toBe(false);
    await waitFor(() => expect(result.current.postsReady).toBe(true), { timeout: 3000 });
  });

  it('postsFetchError is set when the posts endpoint fails', async () => {
    global.fetch = vi.fn((url, options) => {
      const method = (options?.method ?? 'GET').toUpperCase();
      if (url === '/api/game' && method === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ state: { campaign: CAMPAIGN, posts: [] } }) });
      }
      if (url === '/api/game' && method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      }
      if (typeof url === 'string' && url.endsWith('/posts') && method === 'GET') {
        return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable', text: () => Promise.resolve('') });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
    });

    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.postsReady).toBe(true), { timeout: 3000 });
    expect(result.current.postsFetchError).toMatch(/503/);
    expect(result.current.posts).toHaveLength(0);
  });

  it('postsReady stays false while the campaign is not set', async () => {
    global.fetch = vi.fn((url, options) => {
      const method = (options?.method ?? 'GET').toUpperCase();
      if (url === '/api/game' && method === 'GET') {
        // No campaign in state → poll never fires
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ state: { campaign: null, posts: [] } }) });
      }
      if (url === '/api/game' && method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      }
      // /api/campaigns/active — return null (no active campaign)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(null) });
    });

    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    // Wait long enough that if polling was going to fire, it would have
    await act(async () => await new Promise(r => setTimeout(r, 200)));
    expect(result.current.postsReady).toBe(false);
    expect(result.current.posts).toHaveLength(0);
  });

  it('hasPostedThisRound correctly identifies who has and has not posted', async () => {
    setupFetch();
    const { result } = renderHook(() => useGame(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.initialized).toBe(true), { timeout: 3000 });

    expect(result.current.hasPostedThisRound('Aria')).toBe(false);
    expect(result.current.hasPostedThisRound('Borin')).toBe(false);
  });
});
