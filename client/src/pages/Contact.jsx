import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import '../styles/contact.css';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';

const Contact = () => {
  useTitle("Contact");

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // MAGIC AUTO-FILL: Runs once when the Contact page loads
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    
    if (userId) {
      fetch(`http://localhost:5000/users/${userId}`)
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
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:5000/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({ type: 'success', text: 'Message sent successfully! We will get back to you soon.' });
        // THE FIX: Only clear the message box, keep the rest!
        setFormData(prev => ({ ...prev, message: '' }));
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to send message.' });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setFeedback({ type: 'error', text: 'Server error. Please try again later.' });
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
          
          {feedback.text && (
            <div 
              style={{ 
                color: feedback.type === 'success' ? '#28a745' : '#dc3545', 
                backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '15px', 
                textAlign: 'center',
                fontWeight: 'bold'
              }}
            >
              {feedback.text}
            </div>
          )}

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
          
          <input 
            type="email" 
            name="email"
            className="form-input" 
            placeholder="email@example.com" 
            value={formData.email}
            onChange={handleChange}
            required
          />
          
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
      <Footer />
    </div>
  );
};

export default Contact;