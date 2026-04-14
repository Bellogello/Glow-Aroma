import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import Navbar from '../components/Navbar';
import '../styles/signup.css'
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';
import validator from 'validator';

const Signup = () => {
  useTitle("Sign up");

  // SAFE URL LOGIC: Bypasses the Windows/OneDrive ".env" issue
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://glow-aroma-production.up.railway.app';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    // 1. Validations
    if (!validator.isEmail(email)) {
      alert("Please enter a valid email address.");
      return; 
    }

    if (password !== repeatPassword) {
      alert("Your passwords do not match!");
      return; 
    }

    const isStrong = validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0, 
    });

    if (!isStrong) {
      alert("Password is too weak! It must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.");
      return; 
    }

    // 2. Build the payload
    const newUserData = {
      name: name,
      email: email,
      phone: phone.trim() === '' ? null : phone, 
      password_hash: password 
    };

    try {
      // FIX: Using API_BASE_URL to ensure the request goes to Railway
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData), 
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.userName);
        localStorage.setItem("roleId", "1"); 
        
        navigate('/profile'); 
      } else {
        alert("Error: " + (data.error || data.message));
      }
    } catch (error) {
      console.error("Failed to push data:", error);
      alert("Server error. Please check your internet connection.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="login-wrapper">
        <div className="login-card-beige">
          <form onSubmit={handleSignup}>
            
            <div className="form-row">
              <input 
                type="text" 
                className="custom-pill-input" 
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input 
                type="tel" 
                className="custom-pill-input" 
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <input 
                type="email" 
                className="custom-pill-input" 
                placeholder="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <input 
                type="password" 
                className="custom-pill-input" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <input 
                type="password" 
                className="custom-pill-input" 
                placeholder="Repeat Password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
              />
            </div>
          
            <button type="submit" className="btn custom-pill-btn">Create Account</button>

            <div className="signup-link-container">
              <Link to="/Sign-in" className="signup-link">Already Have an Account? Sign In</Link>
            </div>

          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Signup;