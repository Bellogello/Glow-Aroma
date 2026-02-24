import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/signup.css'

const Signup = () => {
  return (
    <div className="home-container">
      <Navbar />
        <form>
           <div className='signup-box'>

            <input type='text' className='signup-name' id="signup-name" placeholder='Name'></input>
            <input type="text" className='signup-phone' id='signup-phone' placeholder='Phone Number'></input>

            <input type="email" class="signup-email" id="signup-email" placeholder="Email"></input>
            <input type="password" class="signup-password" id="signup-password" placeholder="Password"></input>
            <input type="password" class="signup-password" id="signup-repeatpassword" placeholder="Repeat Password"></input>
            <button type="submit" class="btn btn-primary">Create Account</button>
        </div>

      </form>
    </div>
  );
};

export default Signup;