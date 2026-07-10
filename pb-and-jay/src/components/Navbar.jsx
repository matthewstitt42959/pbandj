import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const close = () => setMenuOpen(false);

  const handleSignOut = () => { close(); signOut(); };

  return (
    <nav className="nav-bar">
      <div className="nav-inner">
        <NavLink to="/pbj" className="nav-title" onClick={close}>
          <img src="/bluejay-logo.svg" alt="" className="nav-logo" aria-hidden="true" />
          PB & Jay
        </NavLink>

        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><NavLink to="/pbj" end onClick={close}>Home</NavLink></li>
          <li><NavLink to="/rules" onClick={close}>Rules</NavLink></li>
          <li><NavLink to="/wiki" onClick={close}>World Wiki</NavLink></li>
          {user && (
            <>
              <li><NavLink to="/dashboard" onClick={close}>My Characters</NavLink></li>
              <li><NavLink to="/game" onClick={close}>Game Board</NavLink></li>
              <li><NavLink to="/campaigns" onClick={close}>Campaigns</NavLink></li>
              {(user.role === 'DM' || user.role === 'SUPER_DM') && (
                <li><NavLink to="/dm" onClick={close}>DM Panel</NavLink></li>
              )}
              {user.role === 'SUPER_DM' && (
                <li><NavLink to="/admin" onClick={close}>Admin</NavLink></li>
              )}
            </>
          )}
        </ul>

        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-auth__username">@{user.username}</span>
              <button className="nav-auth__btn" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <NavLink to="/login" className="nav-auth__btn nav-auth__btn--signin" onClick={close}>
              Sign in
            </NavLink>
          )}
          <button className="hamburger" onClick={() => setMenuOpen(p => !p)} aria-label="Toggle Menu">
            ☰
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <ul className="nav-links nav-links--mobile">
          <li><NavLink to="/pbj" end onClick={close}>Home</NavLink></li>
          <li><NavLink to="/rules" onClick={close}>Rules</NavLink></li>
          <li><NavLink to="/wiki" onClick={close}>World Wiki</NavLink></li>
          {user ? (
            <>
              <li><NavLink to="/dashboard" onClick={close}>My Characters</NavLink></li>
              <li><NavLink to="/game" onClick={close}>Game Board</NavLink></li>
              <li><NavLink to="/campaigns" onClick={close}>Campaigns</NavLink></li>
              {(user.role === 'DM' || user.role === 'SUPER_DM') && (
                <li><NavLink to="/dm" onClick={close}>DM Panel</NavLink></li>
              )}
              {user.role === 'SUPER_DM' && (
                <li><NavLink to="/admin" onClick={close}>Admin</NavLink></li>
              )}
              <li><button className="nav-mobile-signout" onClick={handleSignOut}>Sign out</button></li>
            </>
          ) : (
            <li><NavLink to="/login" onClick={close}>Sign in</NavLink></li>
          )}
        </ul>
      )}
    </nav>
  );
};

export default Navbar;
