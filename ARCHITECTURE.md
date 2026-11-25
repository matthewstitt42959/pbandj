# Architecture

This is a one-person indie arcade: one Hub, several games, not all built the same way.
This doc exists so the next game doesn't have to be a judgment call about where it goes.

## The three kinds of "game" here

| Kind | Examples | Lives in |
|---|---|---|
| **Arcade-wide** | the Hub (`/`), sign-in (`/login`, `/register`, password reset) | this app's own router |
| **Internal mini-game** | Aerial War, Dogfight 21, Chess at Sea | this app's own router, under `/games/<slug>` |
| **PB & Jay** (the flagship) | the D&D campaign app itself | this app's own router, flat top-level paths (`/pbj`, `/dashboard`, `/campaigns`, `/dm`, `/admin`, `/character/*`, `/wiki`, `/rules`) |
| **Separate app** | Skyward Islands, cwb-foundry | its own repo, its own Render service — just linked from the Hub |

The PB & Jay routes being flat (not nested under `/pbj/*`) is a known inconsistency —
not worth renaming on a live app for existing bookmarks/links, but **new PB & Jay
features should still conceptually belong to PB & Jay**, not be mistaken for
arcade-wide routes just because the URL doesn't say so.

## Where does a new game go?

- **Another plane-card-style mini-game, built in this app** → a page under
  `src/pages/`, a route under `/games/<slug>` in `src/App.jsx`, and an entry in
  `src/data/arcadeGames.js` (that one array feeds both the Hub's game grid and
  `ArcadeMenu`'s in-game hamburger — only add it there, not in both places by hand).
- **A new PB & Jay feature** → a route at the top level (matching the existing flat
  style), wrapped in `<PrivateRoute>` if it needs login.
- **A whole separate app/deploy** (different stack, different team of one working on
  it separately, etc.) → its own repo and Render service, with a standalone card on
  the Hub (`src/pages/HubPage.jsx`, `hub-secondary-row`) linking out via a
  `*_URL` constant (dev override + prod default — see `SKYWARD_ISLANDS_URL` /
  `CWB_FOUNDRY_URL` for the pattern). Don't try to fold a separate app into this
  app's own router or Render service — different stack, different deploy cadence,
  and coupling them would make a crash or redeploy in one take down the other.

## Chrome: who gets the navbar

`src/App.jsx`'s `AppShell` decides this with `hideChrome`: the Hub, `/games/*`, and
the auth routes render with no navbar at all (arcade-wide pages shouldn't look like
they belong to PB & Jay specifically). Everything else gets PB & Jay's `<Navbar>`.
If a new arcade-wide route needs to exist, it almost certainly wants to be added to
that `hideChrome` check too.

## Identity

There's one user table (`User`, in this app's own Postgres schema via Prisma,
`prisma/schema.prisma`), not one per game. Login issues a JWT (`server/index.js`,
`jwt.sign({userId, email, username, role}, SESSION_SECRET, {expiresIn: '30d'})`),
verified on every request by `server/auth-middleware.js`. The frontend keeps it in
`localStorage` (`pb-and-jay-token`, `src/context/AuthContext.jsx`) and sends it as
`Authorization: Bearer <token>`.

Because the token is a portable, self-contained JWT rather than a server-side
session, **a separate app can recognize the same logged-in user without touching
this app's database at all** — it just needs the same `SESSION_SECRET` to verify
the token's signature independently. cwb-foundry does exactly this:

1. `AuthContext.jsx` exports `getToken()` so other code in this app can read the
   current token.
2. The Hub's card for that app appends it as a URL fragment when the visitor is
   logged in (`#token=...` — a fragment because browsers never send those to a
   server or log them anywhere, unlike a query string).
3. The other app reads that fragment once, stores it under its own key, and
   verifies it server-side using the same `SESSION_SECRET` env var.

This is the template for any future app that wants to recognize these same
accounts: no new login UI, no shared database table, just the same secret and the
fragment handoff. An app that *doesn't* need to know who's logged in (Skyward
Islands, so far) just gets a plain link with no token at all.

## Data and deployment

- **Database**: one Supabase Postgres instance, managed here via Prisma
  (`prisma/schema.prisma`, `server/prisma.js`). A separate app sharing this same
  Supabase project (cwb-foundry) gets its *own* Postgres schema
  (`?schema=cwb_foundry` on its connection string) so its tables can never collide
  with this app's — never add another app's tables into this app's own schema.
- **Deployment**: Render, one service per app (`render.yaml` here covers only this
  app). Secrets (`SESSION_SECRET`, `DATABASE_URL`, etc.) are set directly in the
  Render dashboard for this service, never committed. A separate app that needs to
  share one of these values (cwb-foundry's `SESSION_SECRET`, for the identity
  handoff above) gets it copied into *its own* service's dashboard — still never
  written into either repo.
