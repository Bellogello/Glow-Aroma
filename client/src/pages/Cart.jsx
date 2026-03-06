import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import '../styles/cart.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      setLoading(false);
      return; 
    }

    fetch(`http://localhost:5000/api/cart/${userId}`)
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
// --- NEW QUANTITY FUNCTION ---
  const handleQuantityChange = async (cartItemId, action) => {
    try {
      // 1. Tell the backend to update the database
      const response = await fetch(`http://localhost:5000/api/cart/update/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // 2. Instantly update the React screen so it doesn't lag
        setCartItems(prevItems => prevItems.map(item => {
          if (item.cart_item_id === cartItemId) {
            const newQty = action === 'increase' ? item.quantity + 1 : Math.max(1, item.quantity - 1);
            return { ...item, quantity: newQty };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };
  // --- THE NEW REMOVE FUNCTION ---
  const handleRemove = async (cartItemId) => {
    try {
      // 1. Tell the backend to delete it
      const response = await fetch(`http://localhost:5000/api/cart/remove/${cartItemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 2. Instantly update the screen by filtering out the deleted item
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
        <h2>Loading your cart...</h2>
      </div>
    );
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + (Number(item.total_price) * item.quantity), 0);

  return (
    <div className="home-container">
      <Navbar />
      <h1>Cart Page</h1>
      <p>Welcome to Glow Aroma - Premium Candles</p>
      <hr />
      
      <div className="cart-content">
        {cartItems.length === 0 ? (
          <h3>Your cart is empty. Head to the Create page to build a candle!</h3>
        ) : (
          <div className="cart-list">
            
            {cartItems.map(item => (
              <div key={item.cart_item_id} className="cart-item">
                <h3>{item.cup_name} ({item.size_ml}ml)</h3>
                <p><strong>Color:</strong> {item.color_name}</p>
                <p><strong>Scent:</strong> {item.scent_name}</p>
                
                <div className="quantity-wrapper">
                  <strong>Quantity:</strong> 
                  <div className="quantity-controls">
                    <button 
                      className="btn-qty"
                      onClick={() => handleQuantityChange(item.cart_item_id, 'decrease')}
                    >
                      −
                    </button>
                    <span className="qty-amount">{item.quantity}</span>
                    <button 
                      className="btn-qty"
                      onClick={() => handleQuantityChange(item.cart_item_id, 'increase')}
                    >
                      +
                    </button>
                  </div>
                </div>                <p><strong>Price:</strong> ${item.total_price}</p>
                
                {/* --- ATTACH THE FUNCTION TO THE BUTTON --- */}
                {/* We use an arrow function () => so it doesn't run automatically on page load */}
                <button 
                  className="btn-remove" 
                  onClick={() => handleRemove(item.cart_item_id)}
                >
                  Remove
                </button>
              </div>
            ))}
            
            <div className="cart-summary">
              <h2>Total: ${cartTotal.toFixed(2)}</h2>
              <button className="btn btn-primary">Proceed to Checkout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;