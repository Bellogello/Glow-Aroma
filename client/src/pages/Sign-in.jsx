import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { useGoogleLogin } from '@react-oauth/google'; // <-- NEW IMPORT
import Navbar from '../components/Navbar';
import '../styles/profile.css';

const Signin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // Standard Email/Password Login
  const handleSignin = async (e) => {
    e.preventDefault();
    // ... your existing sign-in fetch logic stays exactly the same ...
  };

  // --- NEW GOOGLE LOGIN FUNCTION ---
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google Token:", tokenResponse.access_token);
      // Here you will eventually send tokenResponse.access_token to your backend
      // to verify it and log the user in!
    },
    onError: () => console.log('Google Login Failed'),
  });

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="login-wrapper">
        <div className="login-card-beige">
          
          <form onSubmit={handleSignin}>
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
          
            <button type="submit" className="btn custom-pill-btn">Sign In</button>

            {/* --- NEW DIVIDER --- */}
            <div className="divider">
              <span>OR</span>
            </div>

            {/* --- NEW GOOGLE BUTTON --- */}
            <button 
              type="button" 
              onClick={() => loginWithGoogle()} 
              className="btn custom-pill-btn google-btn"
            >
              {/* Google SVG Logo */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Sign in with Google
            </button>

            <div className="signup-link-container">
              <Link to="/sign-up" className="signup-link">Don't have an account? Sign Up</Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Signin;