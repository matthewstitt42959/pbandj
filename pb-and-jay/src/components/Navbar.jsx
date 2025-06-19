import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false); 

  const toggleMenu = () => {
    setMenuOpen(prev => !prev); 
  }; 

  return (
    <nav className='nav-bar'>
      <div className='nav-header'>
        <span className='nav-title'> PB & Jay </span>
        <button className='hamburger' onClick={toggleMenu} aria-label='Toggle Menu'></button>
      </div>
      <Link style={styles.link} to="/">Home</Link>
      <Link style={styles.link} to="/characters">Characters</Link>
      <Link style={styles.link} to="/journal">Journal</Link>
      <Link style={styles.link} to="/encyclopedia">Site-Opedia</Link>
    </nav>
  );
};

export default Navbar;