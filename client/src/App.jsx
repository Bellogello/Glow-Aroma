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
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';

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
        <Route path="/Dashboard" element={<Dashboard />} /> 
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/checkout" element={<Checkout />} />

      </Routes>
    </div>
  );
}

export default App;