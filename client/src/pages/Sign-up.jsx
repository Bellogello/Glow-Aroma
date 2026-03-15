import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Brought in Link for smooth routing
import Navbar from '../components/Navbar';
import '../styles/signup.css'

const Signup = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== repeatPassword) {
      alert("Your passwords do not match!");
      return; 
    }

    const newUserData = {
      name: name,
      email: email,
      phone: phone,
      password_hash: password 
    };

    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData), 
      });

      if (response.ok) {
        alert("Account created successfully!");
        setName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setRepeatPassword('');
      } else {
        const data = await response.json();
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Failed to push data:", error);
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
                placeholder="Email"
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
    </div>
  );
};

export default Signup;