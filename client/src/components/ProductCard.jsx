import React from 'react';
import { Link } from 'react-router-dom'; 
import logo from '../assets/logo.png'; 
import '../styles/ProductCard.css';
import Candle from '../assets/candle.png'

const ProductCard = () => {
  return (
    <div className="product-card-container">
      <Link to='/product/lavender' className="product-card">
        <img src={Candle} className="candle-img" alt="Lavender Glow"/>
        
        {/* This div holds the overlay info shown in your image */}
        <div className="card-overlay">
          <p className="price">200 L.E.</p>
          <button className="add-btn"></button> {/* The grey rectangle button */}
        </div>
      </Link>
      <h3 className="product-title">Lavender Glow</h3>
    </div>
  );
};

export default ProductCard;