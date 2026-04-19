import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom'; 
import '../styles/products.css'; 
import ProductCard from '../components/ProductCard';
import CreateYourOwn from '../components/CreateYourOwn';
import '../styles/CreateYourOwn.css';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import { API_BASE_URL } from '../config';

const Products = () => {
  useTitle("Products");
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW STATE FOR SEARCH AND FILTER ---
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

  // --- NEW FILTERING LOGIC ---
  // This automatically updates the list instantly whenever the user types or clicks a filter
  const filteredProducts = products.filter((product) => {
    // 1. Check if the product name matches the search box
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Check if the product category matches the selected button
    // NOTE: Make sure 'product.category' matches your actual database column name! 
    // It might be 'product.type', 'product.material', etc.
    const matchesFilter = activeFilter === 'All' || product.category === activeFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="products-container">
      <Navbar />
      <h1>Our Candles</h1>
      
      <div className='AllProducts'>
        <div>
          <CreateYourOwn />
        </div>

        {/* --- NEW SEARCH & FILTER SECTION --- */}
        <div className="search-filter-section">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search candles by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="filter-buttons">
            {/* The categories here should match the categories in your database */}
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
        {/* ---------------------------------- */}

        {loading ? (
          <h2 style={{ textAlign: 'center' }}>Loading candles...</h2>
        ) : (
          <div className="product-list">
            
            {/* Notice we changed this from 'products' to 'filteredProducts' */}
            {filteredProducts.length === 0 ? (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
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
        )}
      </div>
      <Footer />
    </div>
    
  );
  
};

export default Products;