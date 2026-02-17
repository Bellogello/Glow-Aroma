import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom'; 
import '../styles/products.css'; // Use your existing products CSS!
import ProductCard from '../components/ProductCard';
import CreateYourOwn from '../components/CreateYourOwn';

const Products = () => {
  return (
    <div className="products-container">
      <Navbar />
      <h1>Our Candles</h1>
      <div className='AllProducts'>
        <div>
        <CreateYourOwn />
        </div>
  <div className="product-list">
          {/* These will now sit 3 in a row */}
          <div className="product-card">...</div>
          <div className="product-card">...</div>
          <div className="product-card">...</div>
        </div>
        </div>
        </div>
  );
};

export default Products;