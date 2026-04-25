import React, { useEffect } from 'react'; // <-- Added useEffect here
import { Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Lenis from '@studio-freight/lenis'; // <-- Added Lenis import

// Import your pages
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import Create from './pages/Create';
import SignIn from './pages/Sign-in';
import Signup from './pages/Sign-up';
import ProductDetails from './pages/ProductDetails';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import OrderSuccess from './pages/OrderSuccess';
import Inventory from './pages/Inventory';

const stripePromise = loadStripe('pk_test_51TLsHTFTbNVdlFGS8I4gWECo2WMYrPt9uci7WvSBet1AUBUJbVYNdCXlML8mmgPfJquqtZCsx8PBA15Ifv3zoqZd00IMWU0jTR');

function App() {
  
  // --- NEW: Lenis Smooth Scrolling Engine ---
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2, // Controls the "weight" and glide of the scroll
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      smoothWheel: true,
      wheelMultiplier: 1, // Change to > 1 to make mouse wheels scroll faster
    });

    // Synchronize the scroll animation with your monitor's refresh rate
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Clean up memory if the app unmounts
    return () => {
      lenis.destroy();
    };
  }, []);
  // ------------------------------------------

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/Cart" element={<Cart />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/Create" element={<Create />} />  {/* Capital C! */}
        <Route path="/Sign-in" element={<SignIn />} />
        <Route path="/Sign-up" element={<Signup />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/checkout" element={<Elements stripe={stripePromise}><Checkout /></Elements>} />
      </Routes> 
    </div>
  );
}

export default App;