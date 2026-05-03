import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Lenis from '@studio-freight/lenis';

// --- NEW: Import your ScrollToTop component ---
import ScrollToTop from './components/ScrollToTop';

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
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

function App() {

  return (
    <div className="App">
      {/* --- NEW: Drop it right here --- */}
      <ScrollToTop />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/Cart" element={<Cart />} />
        <Route path="/Profile" element={<Profile />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/Create" element={<Create />} />  
        <Route path="/Sign-in" element={<SignIn />} />
        <Route path="/Sign-up" element={<Signup />} />
        <Route path="/dashboard" element={
          <Suspense fallback={<div>Loading...</div>}>
            <Dashboard />
          </Suspense>
        } />        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/checkout" element={<Elements stripe={stripePromise}><Checkout /></Elements>} />
      </Routes> 
    </div>
  );
}

export default App;