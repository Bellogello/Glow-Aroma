import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom'; 
import '../styles/products.css'; 
import ProductCard from '../components/ProductCard';
import CreateYourOwn from '../components/CreateYourOwn';
import '../styles/CreateYourOwn.css';

// ==========================================
// --- DUMMY DATA FOR UI TESTING ---
// ==========================================
const dummyProducts = [
  {
    id: 1,
    name: "Vanilla Dream Jar",
    price: "150.00",
    description: "A sweet, comforting classic vanilla scent.",
    image_url: "https://via.placeholder.com/200/F5DEB3/5a4a3a?text=Vanilla+Dream" // Fake image URL
  },
  {
    id: 2,
    name: "Ocean Breeze Tin",
    price: "120.00",
    description: "Crisp and refreshing ocean notes for any room.",
    image_url: "https://via.placeholder.com/200/ADD8E6/5a4a3a?text=Ocean+Breeze"
  },
  {
    id: 3,
    name: "Lavender Serenity",
    price: "165.00",
    description: "Calming lavender essential oils for a peaceful night.",
    image_url: "https://via.placeholder.com/200/E6E6FA/5a4a3a?text=Lavender"
  },
  {
    id: 4,
    name: "Spiced Pumpkin Glass",
    price: "180.00",
    description: "Warm spices and autumn vibes, perfect for cozy evenings.",
    image_url: "https://via.placeholder.com/200/FF7F50/5a4a3a?text=Spiced+Pumpkin"
  }
];

const Products = () => {
  // 1. Initialize state WITH the dummy data instead of an empty array
  const [products, setProducts] = useState(dummyProducts);
  
  // Set loading to false immediately since we already have the dummy data
  const [loading, setLoading] = useState(false);

  // 2. We comment out the fetch so it doesn't overwrite our dummy data!
  /*
  useEffect(() => {
    fetch('http://localhost:5000/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error("Backend sent weird data:", data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  }, []);
  */

  return (
    <div className="products-container">
      <Navbar />
      <h1>Our Candles</h1>
      
      <div className='AllProducts'>
        <div>
          <CreateYourOwn />
        </div>

        {/* 3. Loading message (won't show up right now because loading is false) */}
        {loading ? (
          <h2 style={{ textAlign: 'center' }}>Loading candles...</h2>
        ) : (
          <div className="product-list">
            
            {/* 4. The Magic Loop! Maps over our dummy data */}
            {products.length === 0 ? (
              <p style={{ textAlign: 'center', gridColumn: '1 / -1' }}>No products found!</p>
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
      
    </div>
  );
};

export default Products;