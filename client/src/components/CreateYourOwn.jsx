import React from 'react';
import { Link } from 'react-router-dom'; 
import logo from '../assets/logo.png'; 
import '../styles/CreateYourOwn.css';
import Candle from '../assets/candle.png'
const CreateYourOwn = () => {
  return (
    <Link to ="/" className='button'>
    <button className='createyourown'></button>
    </Link>
  );
};

export default CreateYourOwn;