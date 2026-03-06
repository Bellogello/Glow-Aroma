import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Teleports the user after logging in
import Navbar from '../components/Navbar';
import '../styles/profile.css';

const Signin = () => {
  // 1. Create the containers for what the user types
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  
  // 2. Setup the navigation tool
  const navigate = useNavigate();

  // 3. The function that runs when they click Submit
  const handleSignin = async (e) => {
    e.preventDefault(); // Stop the page refresh

    const loginData = {
      email: email,
      password: password
    };

    try {
      // 4. Send the credentials to your new backend login route
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        // 5. Save the wristband (JWT token) and their name!
        localStorage.setItem("token", data.token);
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userId", data.userId);
        
        // 6. Teleport them instantly to the account/profile page
        navigate('/profile'); 
      } else {
        // If the password or email is wrong, show them the error
        alert("Login failed: " + data.error);
      }
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      
      {/* Attach the function to the form */}
      <form onSubmit={handleSignin}>
        <div className="form-group">
          <label htmlFor="exampleInputEmail1">Email address</label>
          <input 
            type="email" 
            className="signin-email" 
            id="exampleInputEmail1" 
            aria-describedby="emailHelp" 
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <small id="emailHelp" className="form-text text-muted">We'll never share your email with anyone else.</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="exampleInputPassword1">Password</label>
          <input 
            type="password" 
            className="password" 
            id="exampleInputPassword1" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group form-check">
          <input type="checkbox" className="form-check-input" id="exampleCheck1" />
          <label className="form-check-label" htmlFor="exampleCheck1">Check me out</label>
        </div>
        
        <button type="submit" className="btn btn-primary">Submit</button>
      </form>
    </div>
  );
};

export default Signin;