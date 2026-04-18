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

  const token = localStorage.getItem("token");
  const userName = localStorage.getItem("userName");
  const userId = localStorage.getItem("userId");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newAddress, setNewAddress] = useState({
    fullName: userName || '',
    phone: '',
    governorate: '',
    area: '',
    street: '',
    building: '',
    floorApt: '',
    notes: ''
  });

  useEffect(() => {
    if (!userId) return;
    loadProfileData();
    loadOrderHistory();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      const [addrRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/addresses/${userId}`),
        fetch(`${API_BASE_URL}/users/${userId}`)
      ]);
      const addresses = await addrRes.json();
      const user = await userRes.json();
      if (Array.isArray(addresses)) setSavedAddresses(addresses);
      if (!user.error && user.phone) {
        setNewAddress(prev => ({ ...prev, phone: user.phone }));
      }
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/user/${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error("Failed to load order history:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusBadgeClass = (statusId) => {
    if (statusId === 1) return 'processing';
    if (statusId === 2) return 'shipped';
    if (statusId === 3) return 'delivered';
    return 'processing';
  };

  const getStatusLabel = (statusId) => {
    if (statusId === 1) return 'Processing';
    if (statusId === 2) return 'Shipped';
    if (statusId === 3) return 'Delivered';
    return 'Processing';
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/${addressId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedAddresses(prev => prev.filter(addr => addr.id !== addressId));
      } else {
        alert("Could not delete. It may be linked to an existing order.");
      }
    } catch (err) {
      alert("Server connection error.");
    }
  };

  const handleEditClick = (addr) => {
    setEditingId(addr.id);
    setNewAddress({
      fullName: addr.full_name || '',
      phone: addr.phone || '',
      governorate: addr.governorate || '',
      area: addr.area || '',
      street: addr.street || '',
      building: addr.building || '',
      floorApt: addr.floor_apt || '',
      notes: addr.notes || ''
    });
    setIsAddingAddress(true);
  };

  const handleSaveNewAddress = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;
    const { fullName, phone, governorate, area, street } = newAddress;
    if (!fullName || !phone || !governorate || !area || !street) {
      alert("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const url = editingId ? `${API_BASE_URL}/addresses/${editingId}` : `${API_BASE_URL}/addresses/${userId}`;
    const method = editingId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress)
      });
      if (res.ok) {
        await loadProfileData();
        setIsAddingAddress(false);
        setEditingId(null);
        setNewAddress({ fullName: userName, phone: '', governorate: '', area: '', street: '', building: '', floorApt: '', notes: '' });
      } else {
        alert("Failed to save. Please try again.");
      }
    } catch (err) {
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) return <Navigate to="/Sign-in" replace />;

  return (
    <div className="home-container">
      <Navbar />
      <div className="profile-wrapper">

        <div className="profile-sidebar">
          <div className="avatar-circle">{userName ? userName.charAt(0).toUpperCase() : "U"}</div>
          <h2 className="profile-welcome">Welcome, {userName}!</h2>
          <button onClick={() => { localStorage.clear(); navigate('/'); }} className="logout-btn-minimal">Log Out</button>
        </div>

        <div className="profile-content">

          {/* ADDRESSES */}
          <div className="profile-section-card">
            <div className="section-header">
              <h3>Shipping Addresses</h3>
              {!isAddingAddress && (
                <button className="edit-toggle-btn" onClick={() => { setEditingId(null); setIsAddingAddress(true); }}>+ Add New</button>
              )}
            </div>

            {isAddingAddress ? (
              <div className="add-address-container">
                <h4 className="form-title">{editingId ? "Edit Address" : "New Address"}</h4>
                <AddressForm formData={newAddress} onChange={(e) => setNewAddress({ ...newAddress, [e.target.name]: e.target.value })} />
                <div className="profile-form-actions">
                  <button className="btn-save-address" onClick={handleSaveNewAddress} disabled={submitting}>
                    {submitting ? "Saving..." : (editingId ? "Update" : "Save")}
                  </button>
                  <button className="btn-cancel-minimal" onClick={() => { setIsAddingAddress(false); setEditingId(null); }} disabled={submitting}>
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
                        <strong>{addr.full_name}</strong>
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

          {/* ORDER HISTORY */}
          <div className="profile-section-card">
            <div className="section-header"><h3>Recent Purchases</h3></div>
            <hr className="mini-divider" />
            <div className="order-history-list">
              {ordersLoading ? (
                <p className="text-muted">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="text-muted">No orders yet. Go treat yourself! 🕯️</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="history-item-row">
                    <div className="order-info-left">
                      <span className="order-number">#{order.id}</span>
                      <p className="order-product-name">{order.item_summary}</p>
                      <span className="order-timestamp">
                        {new Date(order.created_at).toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="order-info-right">
                      <p className="order-price-tag">{Number(order.total).toFixed(2)} L.E.</p>
                      <span className={`status-badge ${getStatusBadgeClass(order.status_id)}`}>
                        {getStatusLabel(order.status_id)}
                      </span>
                    </div>
                  </div>
                ))
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