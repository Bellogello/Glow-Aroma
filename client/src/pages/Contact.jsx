import React from 'react';
import Navbar from '../components/Navbar';
import '../styles/contact.css'

const Contact = () => {
  return (
    <div className="home-container">
      <Navbar />
      <h1>Contact Us</h1>
      <hr className='hr--small'></hr>
      <div className='inputs'>
      <input className='name'></input>
      <input className='number'></input>
      <input className='email'></input>
      <input className='message'></input>
      <button className='send'>Send</button>
      </div>
    </div>
  );
};

export default Contact;