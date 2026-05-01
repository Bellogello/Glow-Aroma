import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import '../styles/ProductCard.css';
import FallbackCandle from '../assets/candle.png'; 
import { API_BASE_URL } from '../config';

// 1. Import the notification hook
import { useNotification } from '../components/NotificationContext';

const ProductCard = ({ product }) => {
  const [isAdding, setIsAdding] = useState(false);
  
  // 2. Initialize the hook
  const { success, error, warning } = useNotification();

  // Check if it's completely out of stock
  const isOutOfStock = product?.stock_quantity <= 0;

  const handleAddToCart = async (e) => {
    e.preventDefault(); 
    
    if (isOutOfStock) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      // 3a. Replaced alert
      warning("You need to be logged in to add stuff to your cart!");
      return;
    }

    setIsAdding(true);

    const payload = {
      userId: userId,
      prebuiltCandleId: product.id, 
      quantity: 1
    };

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // 3b. Replaced alert
        success(`${product.name} added to cart! 🛒`);
      } else {
        // 3c. Replaced alert
        error("Wait: " + data.error);
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
      // Added an error toast for network failures
      error("Connection failed. Try again.");
    } finally {
      setIsAdding(false);
    }
  };

  if (!product) return null;

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
              className={`add-btn`}
              Link to={`/product/${product.id}`}
            >
              {("View Product")}
            </button>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;