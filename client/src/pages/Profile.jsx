import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/profile.css'

const Profile = () => {
  return (
    <div className="home-container">
      <Navbar />
      <h1>Profile Page</h1>
      <p>Welcome to Glow Aroma - Premium Candles</p>
    </div>
  );
};

export default Profile;