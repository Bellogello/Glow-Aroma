import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSlideshow from "../components/heroslideshow";
import Footer from '../components/Footer';
import '../styles/Home.css';
import { API_BASE_URL } from '../config';
import FallbackCandle from '../assets/candle.png';

// 1. Import the notification hook
import { useNotification } from '../components/NotificationContext';

const Home = () => {
  useEffect(() => { document.title = "Glow Aroma"; }, []);

  const scrollRef = useRef(null);
  const navigate = useNavigate();
  
  // 2. Initialize the hook
  const { success, error, warning } = useNotification();

  const [bestSellers, setBestSellers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);


  useEffect(() => {
    fetch(`${API_BASE_URL}/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // 1. Sort the data from highest sales to lowest
          const sortedData = data.sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0));
          
          // 2. Grab the top 6 for the carousel
          setBestSellers(sortedData.slice(0, 6));
        }
      })
      .catch(err => console.error("Failed to fetch products:", err))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleQuickBuy = (product) => {
      navigate(`/product/${product.id}`);
  };

  return (
    <div className="home-container">
      <Navbar />
      <HeroSlideshow />

      <section className="best-sellers-section">
        <h1 className="products-title">Best Sellers</h1>

        {loadingProducts ? (
          <p style={{ textAlign: 'center', color: '#a89f91' }}>Loading...</p>
        ) : bestSellers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#a89f91' }}>No products yet.</p>
        ) : (
          <div className="carousel-wrapper">
            <div className="carousel-container" ref={scrollRef}>
              {bestSellers.map((product) => {
                const displayImage = product.image_url
                  ? (product.image_url.startsWith('http') ? product.image_url : `${API_BASE_URL}${product.image_url}`)
                  : FallbackCandle;

                return (
                  <div
                    key={product.id}
                    className="mini-product-card"
                    onClick={() => handleQuickBuy(product)}
                  >
                    <div className="mini-image-wrapper">
                      <img src={displayImage} alt={product.name} className="mini-img" />
                      {product.stock_quantity <= 0 && (
                        <div className="sold-out-badge">Sold Out</div>
                      )}
                    </div>
                    <div className="mini-details">
                      <h3 className="mini-name">{product.name}</h3>
                      <p className="mini-price">{Number(product.price).toFixed(2)} L.E.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Home;