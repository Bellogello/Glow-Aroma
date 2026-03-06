import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/signup.css'

const Signup = () => {
  // 1. Create the dedicated containers and tools for each input box
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  // 2. The function that triggers when "Create Account" is clicked
  const handleSignup = async (e) => {
    e.preventDefault(); // Stops the page from refreshing

    // A quick check to make sure the user didn't make a typo in their password
    if (password !== repeatPassword) {
      alert("Your passwords do not match!");
      return; // Stops the function here so it doesn't send broken data to the database
    }

    // 3. Package the data exactly how your Express server expects it
    const newUserData = {
      name: name,
      email: email,
      phone: phone,
      password_hash: password 
      // Note: We are ignoring 'phone' here for a specific reason (see notes below)
    };

    try {
      // 4. "Push" the data to your backend
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData), 
      });

      if (response.ok) {
        alert("Account created successfully!");
        // Clear all the boxes so the form is empty again
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
      
      {/* Attach the submit tool to the form itself */}
      <form onSubmit={handleSignup}>
        <div className='signup-box'>

          <input 
            type='text' 
            className='signup-name' 
            placeholder='Name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input 
            type="text" 
            className='signup-phone' 
            placeholder='Phone Number'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <input 
            type="email" 
            className="signup-email" 
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input 
            type="password" 
            className="signup-password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input 
            type="password" 
            className="signup-password" 
            placeholder="Repeat Password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">Create Account</button>
        </div>
        <a className='alreadyhaveanaccount' href="/Sign-in">Already Have an Account?</a>
      </form>
    </div>
  );
};

export default Signup;