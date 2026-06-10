import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="nav-bar">
      <div className="nav-header">
        <NavLink to="/" className="nav-title" onClick={() => setMenuOpen(false)}>
          PB & Jay
        </NavLink>
        <button className="hamburger" onClick={() => setMenuOpen((prev) => !prev)} aria-label="Toggle Menu">
          ☰
        </button>
      </div>
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <li>
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
        </li>
        <li>
          <NavLink to="/game" onClick={() => setMenuOpen(false)}>Game Board</NavLink>
        </li>
        <li>
          <NavLink to="/settings" onClick={() => setMenuOpen(false)}>Setup</NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
