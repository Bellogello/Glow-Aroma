import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import '../styles/contact.css';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import { API_BASE_URL } from '../config';
import { useNotification } from '../components/NotificationContext';

const Contact = () => {
  useTitle("Contact");
  const { success, error } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    orderId: '', 
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [userOrders, setUserOrders] = useState([]);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    
    if (userId) {
      fetch(`${API_BASE_URL}/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setFormData(prev => ({
              ...prev,
              name: data.name || '',
              email: data.email || '',
              phone: data.phone || ''
            }));
          }
        })
        .catch(err => console.error("Failed to fetch user for auto-fill:", err));

      fetch(`${API_BASE_URL}/orders/user/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUserOrders(data);
          }
        })
        .catch(err => console.error("Failed to fetch orders:", err));
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectOrder = (orderId) => {
    setFormData({ ...formData, orderId: orderId.toString() });
    setShowOrderDialog(false);
    success(`Order #${orderId} selected`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          orderId: formData.orderId,
          message: formData.message
        }),
      });

      const data = await response.json();

      if (response.ok) {
        success('Message sent successfully! We will get back to you soon.');
        setFormData(prev => ({ ...prev, orderId: '', message: '' }));
      } else {
        error(data.error || 'Failed to send message.');
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      error('Server error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="contact-wrapper">
        <h1>Contact Us</h1>
        <hr className="hr--contact" />
        
        <form className="contact-form" onSubmit={handleSubmit}>

          <div className="input-row">
            <input 
              type="text" 
              name="name"
              className="form-input" 
              placeholder="Name" 
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input 
              type="tel" 
              name="phone"
              className="form-input" 
              placeholder="Phone Number (Optional)" 
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          
          <div className="input-row">
            <input 
              type="email" 
              name="email"
              className="form-input" 
              placeholder="email@example.com" 
              value={formData.email}
              onChange={handleChange}
              required
            />
            
            <div className="order-id-wrapper">
              <input 
                type="text" 
                name="orderId"
                className={`form-input ${userOrders.length > 0 ? 'order-id-input-with-btn' : ''}`} 
                placeholder="Order ID (Optional)" 
                value={formData.orderId}
                onChange={handleChange}
              />
              
              {userOrders.length > 0 && (
                <button 
                  type="button"
                  className="btn-select-order"
                  onClick={() => setShowOrderDialog(true)}
                >
                  Select
                </button>
              )}
            </div>
          </div>
          
          <textarea 
            name="message"
            className="form-textarea" 
            placeholder="How can we help you today?" 
            value={formData.message}
            onChange={handleChange}
            required
            rows="5"
          ></textarea>
          
          <button type="submit" className="send-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
          
        </form>
      </div>

      {showOrderDialog && (
        <div className="order-dialog-overlay">
          <div className="order-dialog-box">
            <div className="order-dialog-header">
              <h3 className="order-dialog-title">Select a Previous Order</h3>
              <button 
                className="order-dialog-close"
                onClick={() => setShowOrderDialog(false)}
              >&times;</button>
            </div>
            
            <p className="order-dialog-text">
              Click an order below to attach it to your message, or close this window to type it manually.
            </p>

            <div className="order-list-container">
              {userOrders.map(order => (
                <div 
                  key={order.id} 
                  className="order-select-item"
                  onClick={() => handleSelectOrder(order.id)}
                >
                  <div>
                    <span className="order-item-title">Order #{order.id}</span>
                    <span className="order-item-date">
                      {new Date(order.created_at).toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <span className="order-item-price">{Number(order.total).toFixed(2)} L.E.</span>
                </div>
              ))}
            </div>

            <button 
              className="order-dialog-cancel-btn"
              onClick={() => setShowOrderDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Contact;