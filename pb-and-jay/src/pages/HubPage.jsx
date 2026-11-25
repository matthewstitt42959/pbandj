import { Link } from 'react-router-dom';
import './HubPage.css';
import ArcadeMenu from '../components/ArcadeMenu';
import { ARCADE_GAMES } from '../data/arcadeGames';
import { KOFI_URL } from '../lib/support';
import { getToken, useAuth } from '../context/AuthContext';

// In dev, point at a locally-running Skyward Islands instead of prod so you
// can actually test changes — override with VITE_SKYWARD_ISLANDS_URL in
// .env.local if it's running on a non-default port.
const SKYWARD_ISLANDS_URL =
  import.meta.env.VITE_SKYWARD_ISLANDS_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173' : 'https://islands.playbyjayrpg.com');

// Same pattern as Skyward Islands: a separately-hosted app, not one of the
// plane-card family. Override with VITE_CWB_FOUNDRY_URL in .env.local.
const CWB_FOUNDRY_URL =
  import.meta.env.VITE_CWB_FOUNDRY_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://cwb-foundry.onrender.com');

export default function HubPage() {
  const { user, signOut } = useAuth();
  // cwb-foundry has no login of its own — it recognizes this same account by
  // verifying the token we already have, handed off via a URL fragment (never
  // sent to a server, never logged, unlike a query param).
  const token = user ? getToken() : null;
  const cwbFoundryHref = token ? `${CWB_FOUNDRY_URL}/#token=${encodeURIComponent(token)}` : CWB_FOUNDRY_URL;
  return (
    <div className="hub-page">
      <div className="hub-menu">
        {user ? (
          <div className="hub-account">
            <span className="hub-account__name">@{user.username}</span>
            <button type="button" className="hub-account__btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        ) : (
          <Link to="/login" className="hub-account__btn hub-account__btn--signin">
            Sign up / Log in
          </Link>
        )}
        <ArcadeMenu />
      </div>
      <header className="hub-hero">
        <h1 className="hub-title">Play by Jay</h1>
        <p className="hub-tagline">A one-person indie arcade — new worlds added as they're built.</p>
      </header>

      <section className="hub-about" aria-labelledby="hub-about-title">
        <h2 id="hub-about-title" className="hub-about-title">What is this place?</h2>
        <p>
          This is my lab. I use it to test out game ideas and post the results where anyone can
          play them. Some games are polished, some are rough drafts, and all of them are works
          in progress.
        </p>
        <p>
          New here? <strong>Pick a game below and jump in.</strong> The arcade games need no
          account. PB &amp; Jay, a full play-by-post D&amp;D campaign, does.
          {user ? null : (
            <>
              {' '}<Link to="/register">Sign up</Link> or <Link to="/login">log in</Link> to play it.
            </>
          )}
        </p>
      </section>

      <Link to="/pbj" className="hub-feature">
        <h2>PB &amp; Jay</h2>
        <p>Play-by-post D&amp;D — AI dungeon master, real adventures</p>
        <span className="hub-feature-cta">Play Now &rarr;</span>
      </Link>

      <section className="hub-secondary">
        <p className="hub-secondary-label">Also in the arcade</p>
        <div className="hub-secondary-row">
          <a
            href={SKYWARD_ISLANDS_URL}
            target="_blank"
            rel="noreferrer"
            className="hub-card hub-card--standalone"
          >
            <h3>Skyward Islands</h3>
            <p>Climb floating islands, then terraform and trade on them</p>
          </a>

          <a
            href={cwbFoundryHref}
            target="_blank"
            rel="noreferrer"
            className="hub-card hub-card--standalone"
          >
            <span className="hub-card-badge">Construction in progress</span>
            <h3>Cards With Borders Foundry</h3>
            <p>Mix-and-match TCG engine — build a deck, play it against an AI</p>
          </a>

          <div className="hub-card-group">
            <p className="hub-card-group-label">Plane-card arcade</p>
            <div className="hub-card-group-items">
              {ARCADE_GAMES.map((game) => (
                <Link key={game.to} to={game.to} className="hub-card hub-card--compact">
                  <h3>{game.title}</h3>
                  <p>{game.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="hub-footer">
        <a href={KOFI_URL} target="_blank" rel="noreferrer">
          Enjoying the lab? Support it on Ko-fi
        </a>
        <br />
        A catalogued property of the Broken Archive —{' '}
        <a href="https://broken-archive.com" target="_blank" rel="noreferrer">
          browse the archive &rarr;
        </a>
      </footer>
    </div>
  );
}
