import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroSlideshow from "../components/heroslideshow";
import Footer from '../components/Footer';
import '../styles/Home.css';
// 1. Import the "Central Brain"
import { API_BASE_URL } from '../config';

const Home = () => {
  useEffect(() => {
    document.title = "Glow Aroma";
  }, []);

  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const bestSellers = [
    { id: 101, name: "Midnight Jasmine", price: "350", image: "/assets/candle1.jpg" },
    { id: 102, name: "Vanilla Bean", price: "320", image: "/assets/candle2.jpg" },
    { id: 103, name: "Spiced Sandalwood", price: "380", image: "/assets/candle3.jpg" },
    { id: 104, name: "Rose Petal", price: "340", image: "/assets/candle4.jpg" },
    { id: 105, name: "Ocean Breeze", price: "360", image: "/assets/candle5.jpg" }
  ];

  const handleQuickBuy = async (product) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please login to shop!");
      return;
    }

    try {
      // 2. Used API_BASE_URL and fixed the template literal backticks
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          is_custom: false 
        }),
      });

      if (response.ok) {
        navigate('/cart'); 
      } else {
        const errorData = await response.json();
        alert("Failed to add to cart: " + (errorData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Quick buy failed:", error);
      alert("Server connection failed. Try again later.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      <HeroSlideshow />

      <section className="best-sellers-section">
        <h1 className="products-title">Best Sellers</h1>
        
        <div className="carousel-wrapper">
          <div className="carousel-container" ref={scrollRef}>
            {bestSellers.map((product) => (
              <div 
                key={product.id} 
                className="mini-product-card" 
                onClick={() => handleQuickBuy(product)}
              >
                <div className="mini-image-wrapper">
                  <img src={product.image} alt={product.name} className="mini-img" />
                </div>
                <div className="mini-details">
                  <h3 className="mini-name">{product.name}</h3>
                  <p className="mini-price">{product.price} L.E.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;