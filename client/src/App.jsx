import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Import the tools to switch pages
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart'
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import Create from './pages/Create';

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

        {/* We can add /cart and /profile here next! */}
      </Routes>
    </div>
  );
}

export default App;