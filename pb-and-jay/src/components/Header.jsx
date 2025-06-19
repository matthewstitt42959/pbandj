import React from 'react';
import Navbar from './Navbar';
import './Header.css'; 

const Header = () => {
  return (
<header className="site-header">
  <h1 className="site-title">PB and Jay - Solo Play-by-Post D&D</h1>
  <Navbar />
  </header>
  );
};

export default Header;