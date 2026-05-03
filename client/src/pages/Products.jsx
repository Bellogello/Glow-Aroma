import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom'; 
import '../styles/products.css'; 
import ProductCard from '../components/ProductCard';
// Make sure to import the NEW card component we talked about!
import CreateYourOwnCard from '../components/CreateYourOwn.jsx'; 
import '../styles/CreateYourOwn.css';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import { API_BASE_URL } from '../config';

const Products = () => {
  useTitle("Products");
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    fetch(`${API_BASE_URL}/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Backend sent unexpected data format:", data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setLoading(false); 
      });
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || 
      (product.description && product.description.toLowerCase().includes(activeFilter.toLowerCase())) ||
      (product.name && product.name.toLowerCase().includes(activeFilter.toLowerCase()));
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="products-container">
      <Navbar />

      <div className='AllProducts'>
        
        <h2 className="catalog-title" style={{ textAlign: 'center', marginBottom: '20px', color: '#4a3728' }}>
          Shop Our Collection
        </h2>

        <div className="search-filter-section">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search candles by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="filter-buttons">
            {['All', 'Jar', 'Glass', 'Tin'].map((category) => (
              <button 
                key={category}
                className={`filter-btn ${activeFilter === category ? 'active' : ''}`}
                onClick={() => setActiveFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <h2 style={{ textAlign: 'center', margin: '40px 0' }}>Loading candles...</h2>
        ) : (
          <>
            {/* --- 1. THE CUSTOM CANDLE BANNER --- */}
            {/* Moved OUTSIDE of the product-list grid so it spans full width! */}
            {activeFilter === 'All' && searchQuery === '' && (
              <div style={{ marginBottom: '3rem', padding: '0 1rem' }}>
                <CreateYourOwnCard />
              </div>
            )}

            {/* --- 2. THE STANDARD PRODUCT GRID --- */}
            <div className="product-list">
              {filteredProducts.length === 0 ? (
                <p style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0' }}>
                  No products found matching your search.
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id}   
                    product={product}  
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Products;