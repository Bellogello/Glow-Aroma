import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import AddressForm from '../components/AddressForm'; 
import '../styles/profile.css'; 
import { API_BASE_URL } from '../config';

const Profile = () => {
  useTitle("My Profile | Glow Aroma");
  const navigate = useNavigate();

  // --- AUTH & USER INFO ---
  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName");
  const userId = localStorage.getItem("userId");

  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  // MATCHING CHECKOUT INITIALIZATION: Pre-filling the name and keeping keys exact
  const [newAddress, setNewAddress] = useState({
    fullName: userName || '', 
    phone: '', 
    governorate: '', 
    area: '', 
    street: '', 
    building: '', 
    notes: ''
  });

  // --- ORDER HISTORY DATA ---
  const [orders] = useState([
    { id: "#8821", date: "March 15, 2026", item: "Midnight Jasmine Jar", price: "350 L.E.", status: "Delivered" },
    { id: "#8754", date: "Feb 10, 2026", item: "Vanilla Dream & Rose Petal", price: "660 L.E.", status: "Shipped" }
  ]);

  // --- INITIAL DATA FETCH (Identical Logic to Checkout) ---
  useEffect(() => {
    if (!userId) return;

    const loadProfileData = async () => {
      try {
        // Fetch addresses and user details simultaneously like in Checkout
        const [addrRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/addresses/${userId}`),
          fetch(`${API_BASE_URL}/users/${userId}`)
        ]);

        const addresses = await addrRes.json();
        const user = await userRes.json();

        if (Array.isArray(addresses)) setSavedAddresses(addresses);
        
        // If the user has a phone number in their account, pre-fill it to trigger autocomplete
        if (!user.error && user.phone) {
          setNewAddress(prev => ({ ...prev, phone: user.phone }));
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [userId]);

  // --- ADDRESS ACTIONS ---
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/${addressId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedAddresses(prev => prev.filter(addr => addr.id !== addressId));
      } else {
        alert("Failed to delete address. Check server logs.");
      }
    } catch (err) {
      alert("Server connection error.");
    }
  };

  const handleEditClick = (addr) => {
    setEditingId(addr.id);
    setNewAddress({
      fullName: addr.full_name || addr.fullName,
      phone: addr.phone,
      governorate: addr.governorate,
      area: addr.area,
      street: addr.street,
      building: addr.building || '',
      notes: addr.notes || ''
    });
    setIsAddingAddress(true);
  };

  const handleInputChange = (e) => {
    setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
  };

  const handleSaveNewAddress = async (e) => {
    if (e) e.preventDefault();
    const { fullName, phone, governorate, area, street } = newAddress;
    
    if (!fullName || !phone || !governorate || !area || !street) {
      alert("Please fill in all required fields.");
      return;
    }

    const url = editingId ? `${API_BASE_URL}/addresses/${editingId}` : `${API_BASE_URL}/addresses/${userId}`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress)
      });

      if (res.ok) {
        // Refresh the list from the database to ensure sync
        const addrRes = await fetch(`${API_BASE_URL}/addresses/${userId}`);
        const data = await addrRes.json();
        setSavedAddresses(data);
        
        setIsAddingAddress(false);
        setEditingId(null);
        setNewAddress({ fullName: userName, phone: '', governorate: '', area: '', street: '', building: '', notes: '' });
      }
    } catch (err) {
      alert("Failed to save changes.");
    }
  };

  if (!token) return <Navigate to="/Sign-in" replace />;

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="profile-wrapper">
        <div className="profile-sidebar">
          <div className="avatar-circle">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <h2 className="profile-welcome">Welcome, {userName}!</h2>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="logout-btn-minimal">
            Log Out
          </button>
        </div>

        <div className="profile-content">
          
          {/* SECTION: SHIPPING ADDRESSES */}
          <div className="profile-section-card">
            <div className="section-header">
              <h3>Shipping Addresses</h3>
              {!isAddingAddress && (
                <button className="edit-toggle-btn" onClick={() => { setEditingId(null); setIsAddingAddress(true); }}>
                  + Add New
                </button>
              )}
            </div>

            {isAddingAddress ? (
              <div className="add-address-container">
                <h4 className="form-title">{editingId ? "Edit Address" : "New Address"}</h4>
                {/* Form is wrapped in <form> inside AddressForm component */}
                <AddressForm formData={newAddress} onChange={handleInputChange} />
                <div className="profile-form-actions">
                  <button className="btn-save-address" onClick={handleSaveNewAddress}>
                    {editingId ? "Update" : "Save"}
                  </button>
                  <button className="btn-cancel-minimal" onClick={() => { setIsAddingAddress(false); setEditingId(null); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="saved-addresses-list">
                {loading ? (
                  <p className="text-muted">Loading...</p>
                ) : savedAddresses.length > 0 ? (
                  savedAddresses.map(addr => (
                    <div key={addr.id} className="address-item-display">
                      <div className="address-info">
                        <strong>{addr.full_name || addr.fullName}</strong>
                        <p>{addr.building ? `${addr.building}, ` : ''}{addr.street}, {addr.area}</p>
                        <span className="addr-phone">📞 {addr.phone}</span>
                      </div>
                      <div className="address-actions">
                        <button className="action-link edit" onClick={() => handleEditClick(addr)}>Edit</button>
                        <button className="action-link delete" onClick={() => handleDeleteAddress(addr.id)}>Delete</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">No addresses saved yet.</p>
                )}
              </div>
            )}
          </div>

          {/* SECTION: PURCHASE HISTORY */}
          <div className="profile-section-card">
            <div className="section-header">
              <h3>Recent Purchases</h3>
            </div>
            <hr className="mini-divider" />
            <div className="order-history-list">
              {orders.map((order) => (
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
              ))}
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;