import React from 'react';
import Navbar from '../components/Navbar';

const Create = () => {
  return (
    <div className="home-container">
      <Navbar />
      <h1>Create Your Own Page</h1>
      <p>Welcome to Glow Aroma - Premium Candles</p>
      <select className='scents' name='Scent'></select>
    </div>
  );
};

export default Create;