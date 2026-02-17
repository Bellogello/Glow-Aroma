import React from 'react';
import { Link } from 'react-router-dom'; 
import logo from '../assets/logo.png'; 
import '../styles/CreateYourOwn.css';
import Candle from '../assets/candle.png'
const CreateYourOwn = () => {
  return (
    <button Link to="/" className='create'>Create Your Own Candle</button>
  );
};

export default CreateYourOwn;