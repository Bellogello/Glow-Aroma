import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import FallbackCandle from '../assets/candle.png';
import '../styles/ProductDetails.css';
import { API_BASE_URL } from '../config';
import { useNotification } from '../components/NotificationContext';

// 1. Import Socket.io client
import { io } from 'socket.io-client';

// Initialize socket outside the component to prevent multiple connections on re-renders
const socket = io(API_BASE_URL);

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error, warning } = useNotification();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [inCartQuantity, setInCartQuantity] = useState(0);

  // 2. State for live viewers
  const [viewers, setViewers] = useState(1);

  useTitle(product ? `${product.name} | Glow Aroma` : "Loading Product...");

  // 3. Socket.io Effect for Live Viewers
useEffect(() => {
  if (!id) return;

  // Create a new socket connection for this product
  const socket = io(API_BASE_URL);

  socket.emit('join_product', id);

  socket.on('update_viewers', (count) => {
    setViewers(count);
  });

  // Cleanup — disconnect fully when leaving the page
  return () => {
    socket.emit('leave_product', id);
    socket.off('update_viewers');
    socket.disconnect(); // ← fully close the connection
  };
}, [id]);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setInCartQuantity(0);

    const fetchProductAndCart = async () => {
      try {
        const prodRes = await fetch(`${API_BASE_URL}/products/${id}`);
        if (!prodRes.ok) throw new Error("Product not found");
        const prodData = await prodRes.json();
        setProduct(prodData);

        const userId = localStorage.getItem("userId");
        if (userId) {
          const cartRes = await fetch(`${API_BASE_URL}/cart/${userId}`);
          const cartData = await cartRes.json();
          
          if (Array.isArray(cartData)) {
            const existingItem = cartData.find(item => !item.is_custom && item.name === prodData.name);
            
            if (existingItem) {
              setInCartQuantity(existingItem.quantity);
            } else {
              setInCartQuantity(0); 
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchProductAndCart();
  }, [id]);

  const handleAddToCart = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      warning("Please log in to add items to your cart!");
      return;
    }

    setIsAdding(true);

    const payload = {
      userId: userId,
      prebuiltCandleId: product.id,
      quantity: quantity
    };

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        success(`${quantity}x ${product.name} added to your cart! 🛒`);
        navigate('/cart'); 
      } else {
        error("Wait: " + data.error); 
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
      error("Server connection failed. Try again.");
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) return <div className="home-container"><Navbar /><div className="loading-state"><h2>Loading details...</h2></div><Footer /></div>;
  if (!product) return <div className="home-container"><Navbar /><div className="loading-state"><h2>Product not found.</h2></div><Footer /></div>;

  const displayImage = product.image_url 
    ? (product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL}${product.image_url}`)
    : FallbackCandle;

  const availableToBuy = product.stock_quantity - inCartQuantity;
  const isCompletelySoldOut = product.stock_quantity <= 0;
  const isMaxedInCart = availableToBuy <= 0 && !isCompletelySoldOut;

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="product-details-wrapper">
        <div className="product-details-container">
          
          <div className="product-image-section">
            <img src={displayImage} alt={product.name} className="main-product-image" />
          </div>

          <div className="product-info-section">
            {/* 4. Live Viewer Badge */}
            {viewers > 1 && (
              <div className="live-viewer-badge">
                <span className="pulse-dot"></span>
                {viewers} people are viewing this right now
              </div>
            )}

            <h1 className="detail-title">{product.name}</h1>
            <p className="detail-price">{Number(product.price).toFixed(2)} L.E.</p>
            
            <div className="detail-description">
              <p>{product.description || "A beautifully crafted prebuilt candle, perfect for any setting."}</p>
            </div>

            <div className="stock-status">
              {isCompletelySoldOut ? (
                <span className="out-of-stock-badge">Sold Out</span>
              ) : isMaxedInCart ? (
                <span className="out-of-stock-badge" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                  Maximum limit reached in your cart
                </span>
              ) : (
                <span className="in-stock-badge">
                  In Stock ({availableToBuy} available to add)
                </span>
              )}
            </div>

            {!isCompletelySoldOut && !isMaxedInCart && (
              <div className="detail-actions">
                <div className="detail-quantity-controls">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >−</button>
                  <span>{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(availableToBuy, quantity + 1))}
                    disabled={quantity >= availableToBuy}
                  >+</button>
                </div>
                
                <button 
                  className="btn-add-massive" 
                  onClick={handleAddToCart}
                  disabled={isAdding}
                >
                  {isAdding ? "Adding..." : `Add to Cart - ${(product.price * quantity).toFixed(2)} L.E.`}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetails;