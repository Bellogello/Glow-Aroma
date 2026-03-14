import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react'; // Clean, modern icon
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        {/* Brand Section */}
        <div className="footer-section">
          <h3 className="footer-logo-text">Glow Aroma</h3>
          <p>Handcrafted scents to light up your soul.</p>
        </div>

        {/* Contact Section */}
        <div className="footer-section">
          <h4>Contact Us</h4>
          <p>Location: Cairo, Egypt</p>
          
          {/* Social Media Link */}
          <div className="social-links">
            <a 
              href="https://www.instagram.com/glow_aroma_/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="instagram-icon"
            >
              <Instagram size={24} />
              <span>@glow_aroma_</span>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/products">Shop All</Link></li>
            <li><Link to="/Create">Make Your Own</Link></li>
            <li><Link to="/contact">Support</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 Glow Aroma Candle Shop. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;