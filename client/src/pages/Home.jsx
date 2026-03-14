import React from 'react';
import Navbar from '../components/Navbar';
import HeroSlideshow from "../components/heroslideshow";
const Home = () => {
  return (
    <div className="home-container">
      <Navbar />
      <HeroSlideshow />
      <h1>Home Page</h1>
      <p>2oom wl3lak sham3a!</p>
    </div>
  );
};

export default Home;