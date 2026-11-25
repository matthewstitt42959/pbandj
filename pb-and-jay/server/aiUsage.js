// Per-user daily cap on AI requests (DM + AI-player calls share one budget).
// Counts live in the existing Setting table (key: AI_USAGE:<userId>:<YYYY-MM-DD>, UTC day)
// so no schema change is needed. SUPER_DMs are exempt. Limit of 0 = unlimited.

export const DEFAULT_DAILY_LIMIT = 20;

export function getDailyLimit(env = process.env) {
  const raw = env.AI_DAILY_LIMIT;
  if (raw === undefined || raw === '') return DEFAULT_DAILY_LIMIT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_DAILY_LIMIT;
}

export function usageKey(userId, now = new Date()) {
  return `AI_USAGE:${userId}:${now.toISOString().slice(0, 10)}`;
}

// Reserve one AI call. Returns { allowed, used, limit }.
export async function reserveAiCall(prisma, userId, { limit = getDailyLimit(), now = new Date() } = {}) {
  if (limit === 0) return { allowed: true, used: 0, limit: 0 };
  const key = usageKey(userId, now);
  const row = await prisma.setting.findUnique({ where: { key } });
  const used = row ? Number(row.value) || 0 : 0;
  if (used >= limit) return { allowed: false, used, limit };
  await prisma.setting.upsert({
    where: { key },
    update: { value: String(used + 1) },
    create: { key, value: '1' },
  });
  // Drop this user's counters from earlier days so the table doesn't grow forever.
  prisma.setting
    .deleteMany({ where: { key: { startsWith: `AI_USAGE:${userId}:`, not: key } } })
    .catch(() => {});
  return { allowed: true, used: used + 1, limit };
}

// Give a reserved call back (used when the provider call fails — don't charge the user).
export async function refundAiCall(prisma, userId, { limit = getDailyLimit(), now = new Date() } = {}) {
  if (limit === 0) return;
  const key = usageKey(userId, now);
  const row = await prisma.setting.findUnique({ where: { key } });
  const used = row ? Number(row.value) || 0 : 0;
  if (used > 0) await prisma.setting.update({ where: { key }, data: { value: String(used - 1) } });
}

// Express middleware — place after requireAuth. Reserves a call up front and
// refunds it automatically if the response ends in an error.
export function requireAiQuota(prisma) {
  return async function aiQuota(req, res, next) {
    const user = req.authUser;
    if (!user) return res.status(401).json({ error: 'Sign in to use the AI DM', code: 'UNAUTHORIZED' });
    if (user.role === 'SUPER_DM') return next();
    try {
      const limit = getDailyLimit();
      const result = await reserveAiCall(prisma, user.id, { limit });
      if (!result.allowed) {
        return res.status(429).json({
          error: `Daily AI limit reached (${result.limit} requests per day). It resets at midnight UTC — try again tomorrow.`,
          code: 'AI_LIMIT',
          limit: result.limit,
        });
      }
      // A failed request (validation, missing key, provider error...) shouldn't use up the user's budget.
      res.on('finish', () => {
        if (res.statusCode >= 400) refundAiCall(prisma, user.id, { limit }).catch(() => {});
      });
      next();
    } catch (err) {
      console.error('AI quota error:', err.message);
      res.status(500).json({ error: 'Could not check AI usage — please try again' });
    }
  };
}
