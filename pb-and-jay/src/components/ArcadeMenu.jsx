import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ARCADE_GAMES } from '../data/arcadeGames';
import './ArcadeMenu.css';

// Shared nav for the plane-card arcade (Hub + every game under it) — a
// hamburger so adding another game later doesn't mean redesigning a header
// full of links every time.
export default function ArcadeMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="arcade-menu" ref={rootRef}>
      <button
        type="button"
        className="arcade-menu-toggle"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div className="arcade-menu-panel" role="menu">
          <Link to="/" className="arcade-menu-link" role="menuitem" onClick={() => setOpen(false)}>
            ← Hub
          </Link>
          <div className="arcade-menu-divider" />
          {ARCADE_GAMES.map((game) => (
            <Link
              key={game.to}
              to={game.to}
              className="arcade-menu-link"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {game.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
