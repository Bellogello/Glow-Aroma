import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer'; 
import '../styles/cart.css';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import useTitle from '../components/useTitles';
import { API_BASE_URL } from '../config';

// 1. Import the notification hook
import { useNotification } from '../components/NotificationContext';

const Cart = () => {
  useTitle("Cart");
  
  // 2. Initialize the hook
  const { success, error, warning } = useNotification();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) { setLoading(false); return; }

    fetch(`${API_BASE_URL}/cart/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) { console.error("Backend Error:", data.error); setCartItems([]); }
        else setCartItems(data);
        setLoading(false);
      })
      .catch(err => { console.error("Fetch failed:", err); setCartItems([]); setLoading(false); });
  }, []);

  const handleQuantityChange = async (cartItemId, action) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/update/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }), // FIX: was sending wrong body (total/items instead of action)
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
        // 3a. Replaced alert
        error(errorData.error || "Cannot update quantity.");
      }
    } catch (err) {
      console.error("Failed to update quantity:", err);
      // Added network fallback
      error("Connection error. Could not update quantity.");
    }
  };

  const handleRemove = async (cartItemId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/remove/${cartItemId}`, { method: 'DELETE' });
      if (response.ok) {
        setCartItems(prevItems => prevItems.filter(item => item.cart_item_id !== cartItemId));
        // 3b. Added a subtle success toast so the user knows it worked
        success("Item removed from cart.");
      } else {
        const data = await response.json();
        // 3c. Replaced alert
        error("Error removing item: " + data.error);
      }
    } catch (err) {
      console.error("Failed to delete item:", err);
      // Added network fallback
      error("Connection error. Could not remove item.");
    }
  };

  if (loading) return (
    <div className="home-container">
      <Navbar />
      <div className="cart-content"><h2>Loading your cart...</h2></div>
      <Footer />
    </div>
  );

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

                <div className="cart-item-image">
                  {item.is_custom ? (
                    item.snapshot ? (
                      <img
                        src={item.snapshot}
                        alt="Custom candle preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
                      />
                    ) : (
                      <div className="custom-candle-placeholder">✨</div>
                    )
                  ) : (
                    item.image && (
                      <img
                        src={item.image.startsWith('http') ? item.image : `${API_BASE_URL}${item.image}`}
                        alt={item.name}
                      />
                    )
                  )}
                </div>

                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  {item.is_custom && (
                    <div className="custom-specs">
                      <p><span>Color:</span> {item.color_info}</p>
                      <p><span>Scent:</span> {item.scent}</p>
                    </div>
                  )}
                  <p className="cart-item-price">{Number(item.price).toFixed(2)} L.E.</p>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-controls">
                    <button className="btn-qty" onClick={() => handleQuantityChange(item.cart_item_id, 'decrease')}>−</button>
                    <span className="qty-amount">{item.quantity}</span>
                    <button
                      className="btn-qty"
                      onClick={() => handleQuantityChange(item.cart_item_id, 'increase')}
                      disabled={item.quantity >= item.max_stock}
                      style={{ opacity: item.quantity >= item.max_stock ? 0.4 : 1, cursor: item.quantity >= item.max_stock ? 'not-allowed' : 'pointer' }}
                      title={item.quantity >= item.max_stock ? "Maximum stock reached" : ""}
                    >+</button>
                  </div>
                  {item.quantity >= item.max_stock && !item.is_custom && (
                    <span className="stock-warning">Max Stock!</span>
                  )}
                  <button className="btn-remove-text" onClick={() => handleRemove(item.cart_item_id)}>Remove</button>
                </div>

              </div>
            ))}

            <div className="cart-summary">
              <h2>Total: {cartTotal.toFixed(2)} L.E.</h2>
              <Link to="/checkout" className="btn btn-primary">Proceed to Checkout</Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Cart;