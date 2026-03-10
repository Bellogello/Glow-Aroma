import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Import the tools to switch pages
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart'
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import Create from './pages/Create';
import SignIn from './pages/Sign-in';
import Signup from './pages/Sign-up';
import Dashboard from './pages/Dashboard'; // <--- 1. ADDED IMPORT HERE

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/Cart" element={<Cart />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Contact" element={<Contact />} />        
        <Route path="/Create" element={<Create />} />
        <Route path="/Sign-in" element={<SignIn />} />   
        <Route path="/Sign-up" element={<Signup />} />   
         
        {/* <--- 2. ADDED THE DASHBOARD ROUTE HERE */}
        <Route path="/Dashboard" element={<Dashboard />} /> 

      </Routes>
    </div>
  );
}

export default App;