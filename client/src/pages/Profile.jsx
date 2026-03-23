import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import '../styles/profile.css'; 

const Profile = () => {
  useTitle("Profile");
  const navigate = useNavigate();

  // 1. Auth Check
  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName");

  // 2. State for Address
  const [isEditing, setIsEditing] = useState(false);
  const [address, setAddress] = useState(localStorage.getItem("userAddress") || "No address saved yet.");

  // 3. Mock Data for Purchase History
  const [orders] = useState([
    { 
      id: "#8821", 
      date: "March 15, 2026", 
      item: "Midnight Jasmine Jar", 
      price: "350 L.E.", 
      status: "Delivered" 
    },
    { 
      id: "#8754", 
      date: "Feb 10, 2026", 
      item: "Vanilla Dream & Rose Petal", 
      price: "660 L.E.", 
      status: "Shipped" 
    }
  ]);

  if (!token) {
    return <Navigate to="/Sign-in" replace />;
  }

  const handleLogout = () => {
    localStorage.clear(); 
    window.location.href = "/";
  };

  const handleSaveAddress = () => {
    localStorage.setItem("userAddress", address);
    setIsEditing(false);
  };

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="profile-wrapper">
        {/* Left Side: User Info Sidebar */}
        <div className="profile-sidebar">
          <div className="avatar-circle">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <h2 className="profile-welcome">Welcome, {userName}!</h2>
          <button onClick={handleLogout} className="logout-btn-minimal">
            Log Out
          </button>
        </div>

        {/* Right Side: Address & Order History */}
        <div className="profile-content">
          
          {/* Section: Saved Address */}
          <div className="profile-section-card">
            <div className="section-header">
              <h3>Shipping Address</h3>
              <button 
                className="edit-toggle-btn" 
                onClick={isEditing ? handleSaveAddress : () => setIsEditing(true)}
              >
                {isEditing ? "Save Address" : "Edit"}
              </button>
            </div>
            {isEditing ? (
              <textarea 
                className="address-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            ) : (
              <p className="address-display">{address}</p>
            )}
          </div>

          {/* Section: Purchase History */}
          <div className="profile-section-card">
            <h3>Recent Purchases</h3>
            <hr className="mini-divider" />
            
            <div className="order-history-list">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <div key={order.id} className="history-item-row">
                    <div className="order-info-left">
                      <span className="order-number">{order.id}</span>
                      <p className="order-product-name">{order.item}</p>
                      <span className="order-timestamp">{order.date}</span>
                    </div>
                    
                    <div className="order-info-right">
                      <p className="order-price-tag">{order.price}</p>
                      <span className={`status-badge ${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="order-item-placeholder">
                  <p>No recent purchases found.</p>
                  <button className="shop-now-btn" onClick={() => navigate('/products')}>
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Profile;