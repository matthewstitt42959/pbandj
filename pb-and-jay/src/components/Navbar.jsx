import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const close = () => setMenuOpen(false);

  return (
    <nav className="nav-bar">
      <div className="nav-header">
        <NavLink to="/" className="nav-title" onClick={close}>
          PB & Jay
        </NavLink>
        <button className="hamburger" onClick={() => setMenuOpen((prev) => !prev)} aria-label="Toggle Menu">
          ☰
        </button>
      </div>
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <li><NavLink to="/" end onClick={close}>Home</NavLink></li>
        {user ? (
          <>
            <li><NavLink to="/dashboard" onClick={close}>My Characters</NavLink></li>
            <li><NavLink to="/game" onClick={close}>Game Board</NavLink></li>
            <li><NavLink to="/settings" onClick={close}>Setup</NavLink></li>
          </>
        ) : (
          <li><NavLink to="/login" onClick={close}>Sign In</NavLink></li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
