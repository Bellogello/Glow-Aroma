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
        <div className='top'>
          <input type="text" className='name' placeholder='Name'></input>
          <input typr='number' className='number' placeholder='Number'></input>
        </div>
        <div className='middle'>
          <input type='email' className='email' placeholder='email@example.com'></input>
        </div>
        <div className='bottom'>
          <input type="text" className='message' placeholder='Message'></input>
        </div>
        <div className='BUTTON'>
          <button className='send'></button>
        </div>
      </div>
      </div>
  );
};

export default Contact;