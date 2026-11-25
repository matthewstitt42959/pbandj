import { describe, it, expect } from 'vitest';
import { getDailyLimit, usageKey, reserveAiCall, refundAiCall, requireAiQuota, DEFAULT_DAILY_LIMIT } from './aiUsage.js';

function fakePrisma() {
  const rows = new Map();
  return {
    rows,
    setting: {
      findUnique: async ({ where }) => (rows.has(where.key) ? { key: where.key, value: rows.get(where.key) } : null),
      upsert: async ({ where, update, create }) => { rows.set(where.key, rows.has(where.key) ? update.value : create.value); },
      update: async ({ where, data }) => { rows.set(where.key, data.value); },
      deleteMany: async ({ where }) => {
        const prefix = where.key.startsWith;
        for (const k of [...rows.keys()]) if (k.startsWith(prefix) && k !== where.key.not) rows.delete(k);
        return {};
      },
    },
  };
}

const day1 = new Date('2026-11-25T10:00:00Z');
const day2 = new Date('2026-11-26T00:05:00Z');

describe('getDailyLimit', () => {
  it('defaults when unset or invalid', () => {
    expect(getDailyLimit({})).toBe(DEFAULT_DAILY_LIMIT);
    expect(getDailyLimit({ AI_DAILY_LIMIT: 'abc' })).toBe(DEFAULT_DAILY_LIMIT);
    expect(getDailyLimit({ AI_DAILY_LIMIT: '-3' })).toBe(DEFAULT_DAILY_LIMIT);
  });
  it('reads a numeric env value, 0 meaning unlimited', () => {
    expect(getDailyLimit({ AI_DAILY_LIMIT: '5' })).toBe(5);
    expect(getDailyLimit({ AI_DAILY_LIMIT: '0' })).toBe(0);
  });
});

describe('reserveAiCall', () => {
  it('allows up to the limit then blocks', async () => {
    const db = fakePrisma();
    for (let i = 1; i <= 3; i++) {
      const r = await reserveAiCall(db, 'u1', { limit: 3, now: day1 });
      expect(r).toMatchObject({ allowed: true, used: i });
    }
    expect((await reserveAiCall(db, 'u1', { limit: 3, now: day1 })).allowed).toBe(false);
  });
  it('is per user', async () => {
    const db = fakePrisma();
    await reserveAiCall(db, 'u1', { limit: 1, now: day1 });
    expect((await reserveAiCall(db, 'u2', { limit: 1, now: day1 })).allowed).toBe(true);
  });
  it('resets on a new UTC day and clears old counters', async () => {
    const db = fakePrisma();
    await reserveAiCall(db, 'u1', { limit: 1, now: day1 });
    expect((await reserveAiCall(db, 'u1', { limit: 1, now: day2 })).allowed).toBe(true);
    expect(db.rows.has(usageKey('u1', day1))).toBe(false);
  });
  it('limit 0 means unlimited and writes nothing', async () => {
    const db = fakePrisma();
    expect((await reserveAiCall(db, 'u1', { limit: 0, now: day1 })).allowed).toBe(true);
    expect(db.rows.size).toBe(0);
  });
  it('refund gives a call back', async () => {
    const db = fakePrisma();
    await reserveAiCall(db, 'u1', { limit: 1, now: day1 });
    await refundAiCall(db, 'u1', { limit: 1, now: day1 });
    expect((await reserveAiCall(db, 'u1', { limit: 1, now: day1 })).allowed).toBe(true);
  });
});

describe('requireAiQuota middleware', () => {
  const run = async (db, authUser) => {
    const res = { on() {}, code: null, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    let nexted = false;
    await requireAiQuota(db)({ authUser }, res, () => { nexted = true; });
    return { res, nexted };
  };
  it('rejects anonymous users', async () => {
    const { res, nexted } = await run(fakePrisma(), undefined);
    expect(res.code).toBe(401);
    expect(nexted).toBe(false);
  });
  it('exempts SUPER_DM', async () => {
    const db = fakePrisma();
    const { nexted } = await run(db, { id: 'a', role: 'SUPER_DM' });
    expect(nexted).toBe(true);
    expect(db.rows.size).toBe(0);
  });
  it('returns 429 with AI_LIMIT once the cap is hit', async () => {
    const db = fakePrisma();
    db.rows.set(usageKey('p'), String(DEFAULT_DAILY_LIMIT));
    const { res, nexted } = await run(db, { id: 'p', role: 'PLAYER' });
    expect(nexted).toBe(false);
    expect(res.code).toBe(429);
    expect(res.body.code).toBe('AI_LIMIT');
  });
  it('refunds automatically when the response ends in an error', async () => {
    const db = fakePrisma();
    let onFinish;
    const res = { statusCode: 502, on: (_e, fn) => { onFinish = fn; }, status() { return this; }, json() { return this; } };
    await requireAiQuota(db)({ authUser: { id: 'p', role: 'PLAYER' } }, res, () => {});
    expect(db.rows.get(usageKey('p'))).toBe('1');
    onFinish();
    await new Promise(r => setTimeout(r, 0));
    expect(db.rows.get(usageKey('p'))).toBe('0');
  });
});
