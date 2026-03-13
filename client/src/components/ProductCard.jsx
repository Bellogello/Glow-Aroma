import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import '../styles/ProductCard.css';
import FallbackCandle from '../assets/candle.png'; // We use this if the DB doesn't have an image

// 1. Accept the 'product' prop we passed from Products.jsx
const ProductCard = ({ product }) => {
  const [isAdding, setIsAdding] = useState(false);

  // 2. The Add to Cart function
  const handleAddToCart = async (e) => {
    e.preventDefault(); // <-- CRITICAL: Stops the <Link> from triggering when you click the button!

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("You need to be logged in to add stuff to your cart!");
      return;
    }

    setIsAdding(true);

    // Using the prebuiltCandleId for your new database structure
    const payload = {
      userId: userId,
      prebuiltCandleId: product.id, 
      quantity: 1
    };

    try {
      const response = await fetch('http://localhost:5000/cart/add', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`${product.name} added to cart! 🛒`);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // If React renders this before the database loads, don't crash
  if (!product) return null;

  return (
    <div className="product-card-container">
      {/* 3. Make the link dynamic based on the specific candle ID */}
      <Link to={`/product/${product.id}`} className="product-card">
        
        {/* 4. Use the database image, or fallback to your local candle asset */}
        <img src={product.image_url || FallbackCandle} className="candle-img" alt={product.name}/>
      
        <div className="card-overlay">
            {/* 5. Dynamically inject the name and price */}
            <h3 className="product-name">{product.name}</h3>
            <p className="price">{Number(product.price).toFixed(2)} L.E.</p>
            
            <button 
              className="add-btn" 
              onClick={handleAddToCart}
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "Add to Cart"}
            </button>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;