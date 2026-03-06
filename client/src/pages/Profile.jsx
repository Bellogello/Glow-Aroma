import React from 'react';
import { Navigate } from 'react-router-dom'; // Imports the redirect tool
import Navbar from '../components/Navbar';

const Profile = () => {
  // 1. Check the browser's memory for the token
  const token = localStorage.getItem("token");

  // 2. THE BOUNCER: If there is no token, stop rendering and redirect instantly
  if (!token) {
    // 'replace' means they can't hit the back button to return to the profile page
    return <Navigate to="/Sign-in" replace />; 
  }

  // 3. If they pass the check, grab their name to display
  const userName = localStorage.getItem("userName");

  return (
    <div className="home-container">
      <Navbar />
      <div style={{ padding: '20px' }}>
        <h1>My Account</h1>
        <hr />
        <h2>Welcome back, {userName}!</h2>
        
        <p>This is your private profile page. Only signed-in users can see this!</p>
        
        {/* Later, you will map over their previous candle orders here */}
      </div>
    </div>
  );
};

export default Profile;