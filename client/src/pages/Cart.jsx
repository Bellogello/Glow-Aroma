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
        // DEFENSIVE CHECK: Did the backend send an error instead of an array?
        if (data.error) {
          console.error("Backend Error:", data.error);
          setCartItems([]); // Force it to be an empty array so .reduce() doesn't crash!
        } else {
          setCartItems(data); 
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch failed:", err);
        setCartItems([]); // Fallback to empty array
        setLoading(false);
      });
  }, []);
  // Show a simple loading state while waiting for the database
  if (loading) {
    return (
      <div className="home-container">
        <Navbar />
        <h2>Loading your cart...</h2>
      </div>
    );
  }

  // Calculate the final cart total
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
            
            {/* Map over the fetched items and display them */}
            {cartItems.map(item => (
              <div key={item.cart_item_id} className="cart-item">
                <h3>{item.cup_name} ({item.size_ml}ml)</h3>
                <p><strong>Color:</strong> {item.color_name}</p>
                <p><strong>Scent:</strong> {item.scent_name}</p>
                <p><strong>Quantity:</strong> {item.quantity}</p>
                <p><strong>Price:</strong> ${item.total_price}</p>
                
                {/* Placeholder for the delete button */}
                <button className="btn-remove">Remove</button>
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