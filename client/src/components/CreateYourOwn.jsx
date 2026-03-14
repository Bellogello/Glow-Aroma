import React from 'react';
import { Link } from 'react-router-dom';
import BannerImage from '../assets/makeyourowncandle.png'; 
import '../styles/CreateYourOwn.css';

const CreateYourOwn = () => {
  return (
    <Link to="/Create" className="create-banner-link">
      <img 
        src={BannerImage} 
        alt="Make Your Own Candle" 
        className="banner-image-only" 
      />
    </Link>
  );
};

export default CreateYourOwn;