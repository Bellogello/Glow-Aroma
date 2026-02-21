import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/contact.css';

const Contact = () => {
  return (
    <div className="home-container">
      <Navbar />
      
      <div className="contact-wrapper">
        <h1>Contact Us</h1>
        <hr className="hr--small" />
        
        {/* Swapped to a <form> tag for better web standards */}
        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          
          {/* Top Row: Name and Number */}
          <div className="input-row">
            <input type="text" className="form-input" placeholder="Name" />
            <input type="tel" className="form-input" placeholder="Phone Number" />
          </div>
          
          {/* Middle Row: Email */}
          <input type="email" className="form-input" placeholder="email@example.com" />
          
          {/* Bottom Row: Message (Changed to textarea!) */}
          <textarea className="form-textarea" placeholder="Message"></textarea>
          
          {/* Added text to the button so it isn't invisible */}
          <button type="submit" className="send-btn">Send Message</button>
          
        </form>
      </div>
    </div>
  );
};

export default Contact;