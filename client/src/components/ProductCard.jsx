import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import '../styles/ProductCard.css';
import FallbackCandle from '../assets/candle.png'; 
// 1. Import the "Central Brain"
import { API_BASE_URL } from '../config';

const ProductCard = ({ product }) => {
  const [isAdding, setIsAdding] = useState(false);

  // Check if it's completely out of stock
  const isOutOfStock = product?.stock_quantity <= 0;

  const handleAddToCart = async (e) => {
    e.preventDefault(); 
    
    if (isOutOfStock) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("You need to be logged in to add stuff to your cart!");
      return;
    }

    setIsAdding(true);

    const payload = {
      userId: userId,
      prebuiltCandleId: product.id, 
      quantity: 1
    };

    try {
      // 2. Used API_BASE_URL for the cart action
      const response = await fetch(`${API_BASE_URL}/cart/add`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`${product.name} added to cart! 🛒`);
      } else {
        alert("Wait: " + data.error);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) return null;

  // 3. Fixed Display Image logic to use API_BASE_URL
  const displayImage = product.image_url 
    ? (product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL}${product.image_url}`)
    : FallbackCandle;

  return (
    <div className="product-card-container">
      <Link to={`/product/${product.id}`} className="product-card">
        
        <div className="image-wrapper">
          <img src={displayImage} className="candle-img" alt={product.name}/>
          {isOutOfStock && <div className="sold-out-badge">Sold Out</div>}
        </div>
      
        <div className="card-overlay">
            <h3 className="product-name">{product.name}</h3>
            <p className="price">{Number(product.price).toFixed(2)} L.E.</p>
            
            <button 
              className={`add-btn ${isOutOfStock ? 'disabled-btn' : ''}`} 
              onClick={handleAddToCart}
              disabled={isAdding || isOutOfStock}
            >
              {isOutOfStock ? "Out of Stock" : (isAdding ? "Adding..." : "Add to Cart")}
            </button>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;