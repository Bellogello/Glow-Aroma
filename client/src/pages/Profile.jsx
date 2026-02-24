import React from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import '../styles/profile.css'

const Profile = () => {
  return (
    <div className="home-container">
      <Navbar />
      <h1>Profile Page</h1>
      <p>Welcome to Glow Aroma - Premium Candles</p>
      <Link to="/Sign-in">Sign-in</Link>
      <Link to="/Sign-up">Create a New Account</Link>

    </div>
  );
};

export default Profile;