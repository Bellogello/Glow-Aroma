import React from 'react';
import Navbar from '../components/Navbar';
import HeroSlideshow from "../components/heroslideshow";
import Footer from '../components/Footer';

const Home = () => {
  return (
    <div className="home-container">
      <Navbar />
      
      {/* 1. Main Visuals */}
      <HeroSlideshow />
      
      {/* 2. Welcome Content */}
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#4a3728' }}>
          Glow Aroma
        </h1>
       
      </div>
      

      {/* 3. Footer always stays at the bottom */}
      <Footer />
    </div>
  );
};

export default Home;