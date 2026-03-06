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
      <div style={{ padding: '20px' }}>
        <h1>My Account</h1>
        <hr />
        <h2>Welcome back, {userName}!</h2>
        
        <p>This is your private profile page.</p>
        
        {/* 5. Attach the function to your button */}
        <button 
          onClick={handleLogout} 
          className="btn btn-danger"
          style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Log Out
        </button>

      </div>
    </div>
  );
};

export default Profile;