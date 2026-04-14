import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom'; 
import '../styles/products.css'; 
import ProductCard from '../components/ProductCard';
import CreateYourOwn from '../components/CreateYourOwn';
import '../styles/CreateYourOwn.css';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
// 1. Import the "Central Brain"
import { API_BASE_URL } from '../config';

const Products = () => {
  useTitle("Products");
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2. Fetch using the Universal API URL
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

  return (
    <div className="products-container">
      <Navbar />
      <h1>Our Candles</h1>
      
      <div className='AllProducts'>
        <div>
          <CreateYourOwn />
        </div>

        {loading ? (
          <h2 style={{ textAlign: 'center' }}>Loading candles...</h2>
        ) : (
          <div className="product-list">
            
            {products.length === 0 ? (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                No products found in the database!
              </p>
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