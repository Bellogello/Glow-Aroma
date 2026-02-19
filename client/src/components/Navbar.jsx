import React from 'react';
import { Link } from 'react-router-dom'; 
import logo from '../assets/logo.png'; 
// Make sure this path points to your actual CSS file! 
import '../styles/Navbar.css'; 

const Navbar = () => {
  return (
    <div className="navbar">
      <div className='left'>
        <img src={logo} className="logo" alt="Glow Aroma Logo" />
        </div>
        <div className='right'>
      <Link to="/" className="home">Home</Link>
      <Link to="/contact" className="contact">Contact</Link>
      <Link to="/products" className="products">Products</Link>
      <Link to="/cart" className="cart"></Link>
      <Link to="/Profile.jsx" className="profile"></Link>
      </div>
    </div>
  );
};

export default Navbar;