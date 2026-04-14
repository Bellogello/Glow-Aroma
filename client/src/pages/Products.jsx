import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom'; 
import '../styles/products.css'; 
import ProductCard from '../components/ProductCard';
import CreateYourOwn from '../components/CreateYourOwn';
import '../styles/CreateYourOwn.css';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';

const Products = () => {
  useTitle("Products");
  
  // 1. Start completely empty and turn the loading screen ON
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Fetch the real inventory from your MySQL database
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Backend sent weird data:", data);
        }
        setLoading(false); // Turn off the loading screen
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setLoading(false); // Turn off loading even if it fails, so it doesn't spin forever
      });
  }, []);

  return (
    <div className="products-container">
      <Navbar />
      <h1>Our Candles</h1>
      
      <div className='AllProducts'>
        <div>
          <CreateYourOwn />
        </div>

        {/* 3. Show a loading message until the backend replies */}
        {loading ? (
          <h2 style={{ textAlign: 'center' }}>Loading candles...</h2>
        ) : (
          <div className="product-list">
            
            {/* 4. Display the real products, or a fallback message if the database is empty */}
            {products.length === 0 ? (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No products found in the database!</p>
            ) : (
              products.map((product) => (
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