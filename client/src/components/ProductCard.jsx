import React from 'react';
import { Link } from 'react-router-dom'; 
import logo from '../assets/logo.png'; 
import '../styles/ProductCard.css';
import Candle from '../assets/candle.png'
const ProductCard = () => {
  return (
        <div className="product-card">
          <img link to="/" src={Candle} className="candle"/>
          <h3>Lavender Glow</h3>
          <p>$15.00</p>
          <button>Add to Cart</button>
          </div>
  );
};

export default ProductCard;