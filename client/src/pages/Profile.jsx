import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import Navbar from '../components/Navbar';

const Profile = () => {
  // 2. Setup the navigation tool
  const navigate = useNavigate(); 

  // The Bouncer: Checks if they are allowed on the page when it loads
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/Sign-in" replace />; 
  }

  const userName = localStorage.getItem("userName");

  // 3. The Instant Logout Function
  const handleLogout = () => {
    // Trash the data
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");

    // 4. THE MAGIC LINE: Instantly push them to the sign-in page
    // This forces React to change the page without needing a refresh!
    navigate('/Sign-in'); 
  };

  return (
    <div className="home-container">
      <Navbar />
      
      {/* Wraps the profile in the centered layout */}
      <div className="login-wrapper">
        
        {/* Uses the rounded beige card style */}
        <div className="login-card-beige">
          <h1 className="profile-title">My Account</h1>
          <hr className="profile-divider" />
          
          <h2 className="profile-welcome">Welcome back, {userName}!</h2>
          <p className="profile-text">This is your private profile page.</p>
          
          {/* Using the pill-shaped button to match the rest of the site */}
          <button 
            onClick={handleLogout} 
            className="btn custom-pill-btn logout-btn"
          >
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
};

export default Profile;