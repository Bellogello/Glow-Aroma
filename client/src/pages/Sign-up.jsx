import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/profile.css'

const Signup = () => {
  return (
    <div className="home-container">
      <Navbar />
        <form>
        <div class="form-row">
            <div class="form-group col-md-6">
            <input type="email" class="signup-email" id="signup-email" placeholder="Email"></input>
            </div>
            <div class="form-group col-md-6">
            <input type="password" class="signup-password" id="signup-password" placeholder="Password"></input>
            </div>
        <button type="submit" class="btn btn-primary">Sign in</button>
        </div>
        </form>
        </div>
  );
};

export default Signup;