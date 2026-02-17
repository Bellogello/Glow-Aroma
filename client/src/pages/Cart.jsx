import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/cart.css';

const Cart = () => {
  return (
    <div className="home-container">
      <Navbar />
      <h1>Cart Page</h1>
      <p>Welcome to Glow Aroma - Premium Candles</p>
    </div>
  );
};

export default Cart;