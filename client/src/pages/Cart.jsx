import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import '../styles/cart.css';
import Footer from '../components/Footer';

const Cart = () => {
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

  // --- NEW QUANTITY FUNCTION ---
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
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  // --- THE NEW REMOVE FUNCTION ---
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
        <h2>Loading your cart...</h2>
      </div>
    );
  }

  // FIXED: Now looking for item.price instead of item.total_price
  const cartTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="cart-content">
        {cartItems.length === 0 ? (
          <h3>Your cart is empty. Head to the Create page to build a candle!</h3>
        ) : (
          <div className="cart-list">
            
            {cartItems.map(item => (
              <div key={item.cart_item_id} className="cart-item">
                
                {/* FIXED: Now correctly displays the new unified name */}
                <h3>{item.name}</h3>
                
                {/* FIXED: Only shows Color and Scent if it is a Custom Candle */}
                {item.is_custom ? (
                  <>
                    <p><strong>Color:</strong> {item.color}</p>
                    <p><strong>Scent:</strong> {item.scent}</p>
                  </>
                ) : (
                  /* Shows the image if it is a pre-built store candle */
                  item.image && <img src={item.image} alt={item.name} style={{ width: "80px", marginBottom: "10px" }} />
                )}
                
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
                
                {/* FIXED: Displays item.price and changed to L.E. */}
                <p><strong>Price:</strong> {Number(item.price).toFixed(2)} L.E.</p>
                
                <button 
                  className="btn-remove" 
                  onClick={() => handleRemove(item.cart_item_id)}
                >
                  Remove
                </button>
              </div>
            ))}
            
            <div className="cart-summary">
              {/* FIXED: Correctly pulls the new total and uses L.E. */}
              <h2>Total: {cartTotal.toFixed(2)} L.E.</h2>
              <button className="btn btn-primary">Proceed to Checkout</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
        <Footer />

};

export default Cart;