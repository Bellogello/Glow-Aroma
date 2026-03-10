//replace this code with the cart.jsx to see what the cart page would look like if you replaced an order//

import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import '../styles/cart.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // -----------------------------------------------------------------
    // DUMMY DATA SETUP: 
    // We are simulating a fast load so you can see the design instantly.
    // When you are ready for the real database, delete this setTimeout 
    // block and uncomment the fetch block below!
    // -----------------------------------------------------------------
    setTimeout(() => {
      setCartItems([
        {
          cart_item_id: 1,
          cup_name: "Matte Black Jar",
          size_ml: 250,
          color_name: "Midnight Black",
          scent_name: "Vanilla Bean",
          quantity: 2,
          total_price: "24.99"
        },
        {
          cart_item_id: 2,
          cup_name: "Classic Glass",
          size_ml: 150,
          color_name: "Amber",
          scent_name: "Sandalwood",
          quantity: 1,
          total_price: "18.50"
        }
      ]);
      setLoading(false);
    }, 300); // 300ms fake loading delay

    /* --- REAL DATABASE FETCH (Uncomment this when ready!) ---
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
    ---------------------------------------------------------- */
  }, []);

  const handleQuantityChange = async (cartItemId, action) => {
    // For testing the UI, we will just update the React state instantly 
    // so you can see the numbers change and the total update!
    setCartItems(prevItems => prevItems.map(item => {
      if (item.cart_item_id === cartItemId) {
        const newQty = action === 'increase' ? item.quantity + 1 : Math.max(1, item.quantity - 1);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemove = async (cartItemId) => {
    // For testing the UI, we just instantly filter it out of the screen!
    setCartItems(prevItems => prevItems.filter(item => item.cart_item_id !== cartItemId));
  };

  if (loading) {
    return (
      <div className="home-container">
        <Navbar />
        <div className="cart-content">
            <h2>Loading your cart...</h2>
        </div>
      </div>
    );
  }

  // Calculates the total price based on the quantities
  const cartTotal = cartItems.reduce((sum, item) => sum + (Number(item.total_price) * item.quantity), 0);

  return (
    <div className="home-container">
      <Navbar />
      
      {/* Wrapped everything inside cart-content so it centers nicely */}
      <div className="cart-content">
        <h1>Your Cart</h1>
        <p>Welcome to Glow Aroma - Premium Candles</p>
        <hr />

        {cartItems.length === 0 ? (
          <h3>Your cart is empty. Head to the Create page to build a candle!</h3>
        ) : (
          <div className="cart-list">
            
            {cartItems.map(item => (
              <div key={item.cart_item_id} className="cart-item">
                <h3>{item.cup_name} ({item.size_ml}ml)</h3>
                <p><strong>Color:</strong> {item.color_name}</p>
                <p><strong>Scent:</strong> {item.scent_name}</p>
                <p><strong>Price:</strong> ${item.total_price}</p>
                
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
                </div> 
                
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