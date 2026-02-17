import React from 'react';
import { Link } from 'react-router-dom'; 
import logo from '../assets/logo.png'; 
// Make sure this path points to your actual CSS file!
import '../styles/style.css'; 

const Navbar = () => {
  return (
    <div className="top">
      <img src={logo} className="logo" alt="Glow Aroma Logo" />
      <Link to="/" className="home">Home</Link>
      <Link to="/contact" className="contact">Contact</Link>
      <Link to="/products" className="products">Products</Link>
      <Link to="/cart" className="cart"></Link>
      <Link to="/Profile" className="profile"></Link>
    </div>
  );
};

export default Navbar;