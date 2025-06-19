import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  return (
    <nav className="nav-bar">
      <div className="nav-header">
        <span className="nav-title">PB & Jay</span>
        <button className="hamburger" onClick={toggleMenu} aria-label="Toggle Menu">
          ☰
        </button>
      </div>
      <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <li>
          <NavLink to="/" exact="true" activeClassName="active">Home</NavLink>
        </li>
        <li>
          <NavLink to="/game" activeClassName="active">Game Board</NavLink>
        </li>
        <li>
          <NavLink to="/characters" activeClassName="active">Characters</NavLink>
        </li>
        <li>
          <NavLink to="/log" activeClassName="active">Game Log</NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;