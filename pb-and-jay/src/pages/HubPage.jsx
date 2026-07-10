import { Link } from 'react-router-dom';
import './HubPage.css';

// In dev, point at a locally-running Skyward Islands instead of prod so you
// can actually test changes — override with VITE_SKYWARD_ISLANDS_URL in
// .env.local if it's running on a non-default port.
const SKYWARD_ISLANDS_URL =
  import.meta.env.VITE_SKYWARD_ISLANDS_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173' : 'https://islands.playbyjayrpg.com');

const GAMES = [
  {
    title: 'PB & Jay',
    tagline: 'Play-by-post D&D — AI dungeon master, real adventures',
    to: '/pbj',
    external: false,
  },
  {
    title: 'Skyward Islands',
    tagline: 'Climb floating islands, then terraform and trade on them',
    to: SKYWARD_ISLANDS_URL,
    external: true,
    badge: 'Under Construction',
  },
  {
    title: 'Aerial War',
    tagline: 'WWI & WWII plane card game — a fast round of War',
    to: '/games/aerial-war',
    external: false,
    badge: 'Under Construction',
  },
];

export default function HubPage() {
  return (
    <div className="hub-page">
      <header className="hub-hero">
        <h1 className="hub-title">Play by Jay</h1>
        <p className="hub-tagline">A one-person indie arcade — new worlds added as they're built.</p>
        <p className="hub-subtext">
          PB &amp; Jay is live and ready to play. Skyward Islands and Aerial War are still under
          construction — jump in anyway and see how they're coming along.
        </p>
      </header>

      <div className="hub-grid">
        {GAMES.map((game) =>
          game.external ? (
            <a key={game.title} href={game.to} target="_blank" rel="noreferrer" className="hub-card">
              {game.badge && <span className="hub-card-badge">{game.badge}</span>}
              <h2>{game.title}</h2>
              <p>{game.tagline}</p>
            </a>
          ) : (
            <Link key={game.title} to={game.to} className="hub-card">
              {game.badge && <span className="hub-card-badge">{game.badge}</span>}
              <h2>{game.title}</h2>
              <p>{game.tagline}</p>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
