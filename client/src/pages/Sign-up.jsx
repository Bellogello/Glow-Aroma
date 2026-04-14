import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // FIX: Brought in useNavigate
import Navbar from '../components/Navbar';
import '../styles/signup.css'
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';
import validator from 'validator';


  const Signup = () => {

  useTitle("Sign up");
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  
  const navigate = useNavigate(); // FIX: Initialized the navigator

const handleSignup = async (e) => {
    e.preventDefault();

    // 1. The clean, professional email check
    if (!validator.isEmail(email)) {
      alert("Please enter a valid email address.");
      return; 
    }

    // 2. Password match check
    if (password !== repeatPassword) {
      alert("Your passwords do not match!");
      return; 
    }

    // 3. Password length check
// 3. The Ultimate Password Strength Check
    // You can customize these numbers! I set symbols to 0 so it's not too annoying for a candle shop.
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

    // 4. Build the payload for the database
    const newUserData = {
      name: name,
      email: email,
      // THE FIX: If phone is empty, send a true null instead of ""
      phone: phone.trim() === '' ? null : phone, 
      password_hash: password 
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData), 
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-Login: grab the token and set the user session
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.userName);
        localStorage.setItem("roleId", "1"); 
        
        // Teleport them straight to their profile
        navigate('/profile'); 
      } else {
        alert("Error: " + (data.error || data.message));
      }
    } catch (error) {
      console.error("Failed to push data:", error);
      alert("Server error. Please try again later.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      
      {/* 1. Centers the card on the screen */}
      <div className="login-wrapper">
        
        {/* 2. The matching beige card */}
        <div className="login-card-beige">
          
          <form onSubmit={handleSignup}>
            
            {/* 3. A special row just for the side-by-side inputs */}
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
          
            {/* 4. The Submit Button */}
            <button type="submit" className="btn custom-pill-btn">Create Account</button>

            {/* 5. Pulled the link inside the card and centered it! */}
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