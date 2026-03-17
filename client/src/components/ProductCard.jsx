import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import '../styles/ProductCard.css';
import FallbackCandle from '../assets/candle.png'; // We use this if the DB doesn't have an image

const ProductCard = ({ product }) => {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault(); // <-- CRITICAL: Stops the <Link> from triggering when you click the button!

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

  if (!product) return null;

  // THE FIX: If the DB has an image, point it to the backend server (port 5000). 
  // If it's a dummy HTTP link, leave it alone. If there's no image, use the fallback!
  const displayImage = product.image_url 
    ? (product.image_url.startsWith('http') ? product.image_url : `http://localhost:5000${product.image_url}`)
    : FallbackCandle;

  return (
    <div className="product-card-container">
      <Link to={`/product/${product.id}`} className="product-card">
        
        {/* Drop our fixed image variable right here */}
        <img src={displayImage} className="candle-img" alt={product.name}/>
      
        <div className="card-overlay">
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