import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={styles.navbar}>
      <Link style={styles.link} to="/">Home</Link>
      <Link style={styles.link} to="/characters">Characters</Link>
      <Link style={styles.link} to="/journal">Journal</Link>
      <Link style={styles.link} to="/encyclopedia">Site-Opedia</Link>
    </nav>
  );
};

const styles = {
  navbar: {
    padding: '1rem',
    backgroundColor: '#333',
    display: 'flex',
    gap: '1rem',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
  }
};

export default Navbar;