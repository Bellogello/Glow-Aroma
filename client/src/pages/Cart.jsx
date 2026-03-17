import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer'; 
import '../styles/cart.css';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import useTitle from '../components/useTitles';

const Cart = () => {
  useTitle("Cart");
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      setLoading(false);
      return; 
    }

    fetch(`http://localhost:5000/cart/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("Backend Error:", data.error);
          setCartItems([]); 
        } else {
          setCartItems(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch failed:", err);
        setCartItems([]); 
        setLoading(false);
      });
  }, []);

  const handleQuantityChange = async (cartItemId, action) => {
    try {
      const response = await fetch(`http://localhost:5000/cart/update/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setCartItems(prevItems => prevItems.map(item => {
          if (item.cart_item_id === cartItemId) {
            const newQty = action === 'increase' ? item.quantity + 1 : Math.max(1, item.quantity - 1);
            return { ...item, quantity: newQty };
          }
          return item;
        }));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Cannot update quantity.");
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  const handleRemove = async (cartItemId) => {
    try {
      const response = await fetch(`http://localhost:5000/cart/remove/${cartItemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCartItems(prevItems => prevItems.filter(item => item.cart_item_id !== cartItemId));
      } else {
        const data = await response.json();
        alert("Error removing item: " + data.error);
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <Navbar />
        <div className="cart-content">
          <h2>Loading your cart...</h2>
        </div>
        <Footer />
      </div>
    );
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="cart-content">
        {cartItems.length === 0 ? (
          <div className="empty-cart-container">
            <div className="floating-icon">
              <ShoppingBag size={80} color="#4a3728" strokeWidth={1} />
            </div>
            <h2 className="empty-cart-text">Your cart is feeling a bit light...</h2>
            <p>Head to the Create page to build your perfect candle!</p>
            <Link to="/products" className="shop-now-btn">Explore Products</Link>
          </div>
        ) : (
          <div className="cart-list">
            <h1 className="cart-page-title">Shopping Cart</h1>
            {cartItems.map(item => (
              <div key={item.cart_item_id} className="cart-item">
                
                {/* 1. IMAGE SECTION (Left) */}
                <div className="cart-item-image">
                  {item.is_custom ? (
                    <div className="custom-candle-placeholder">✨</div>
                  ) : (
                    item.image && (
                      <img 
                        src={item.image.startsWith('http') ? item.image : `http://localhost:5000${item.image}`} 
                        alt={item.name} 
                      />
                    ) 
                  )}
                </div>

                {/* 2. DETAILS SECTION (Middle) */}
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  {item.is_custom && (
                    <div className="custom-specs">
                      <p><span>Color:</span> {item.color}</p>
                      <p><span>Scent:</span> {item.scent}</p>
                    </div>
                  )}
                  <p className="cart-item-price">{Number(item.price).toFixed(2)} L.E.</p>
                </div>
                
                {/* 3. ACTIONS SECTION (Right) */}
                <div className="cart-item-actions">
                  <div className="quantity-controls">
                    <button className="btn-qty" onClick={() => handleQuantityChange(item.cart_item_id, 'decrease')}>−</button>
                    <span className="qty-amount">{item.quantity}</span>
                    <button 
                      className="btn-qty" 
                      onClick={() => handleQuantityChange(item.cart_item_id, 'increase')}
                      disabled={item.quantity >= item.max_stock}
                      style={{ 
                        opacity: item.quantity >= item.max_stock ? 0.4 : 1, 
                        cursor: item.quantity >= item.max_stock ? 'not-allowed' : 'pointer' 
                      }}
                      title={item.quantity >= item.max_stock ? "Maximum stock reached" : ""}
                    >
                      +
                    </button>
                  </div>
                  {item.quantity >= item.max_stock && !item.is_custom && (
                    <span className="stock-warning">Max Stock!</span>
                  )}
                  {/* Swapped bulky button for a sleek text link */}
                  <button className="btn-remove-text" onClick={() => handleRemove(item.cart_item_id)}>Remove</button>
                </div>

              </div>
            ))}
            
            <div className="cart-summary">
              <h2>Total: {cartTotal.toFixed(2)} L.E.</h2>
              <button className="btn btn-primary">Proceed to Checkout</button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Cart;