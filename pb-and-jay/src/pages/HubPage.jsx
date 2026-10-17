import { Link } from 'react-router-dom';
import './HubPage.css';
import ArcadeMenu from '../components/ArcadeMenu';
import { ARCADE_GAMES } from '../data/arcadeGames';

// In dev, point at a locally-running Skyward Islands instead of prod so you
// can actually test changes — override with VITE_SKYWARD_ISLANDS_URL in
// .env.local if it's running on a non-default port.
const SKYWARD_ISLANDS_URL =
  import.meta.env.VITE_SKYWARD_ISLANDS_URL ||
  (import.meta.env.DEV ? 'http://localhost:5173' : 'https://islands.playbyjayrpg.com');

export default function HubPage() {
  return (
    <div className="hub-page">
      <div className="hub-menu">
        <ArcadeMenu />
      </div>
      <header className="hub-hero">
        <h1 className="hub-title">Play by Jay</h1>
        <p className="hub-tagline">A one-person indie arcade — new worlds added as they're built.</p>
      </header>

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
        A catalogued property of the Broken Archive —{' '}
        <a href="https://broken-archive.com" target="_blank" rel="noreferrer">
          browse the archive &rarr;
        </a>
      </footer>
    </div>
  );
}
