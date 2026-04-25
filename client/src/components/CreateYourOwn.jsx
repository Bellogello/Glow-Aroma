import React from 'react';
import { Link } from 'react-router-dom';
import BannerImage from '../assets/makeyourowncandle.png'; 
import '../styles/CreateYourOwn.css';

const CreateYourOwn = () => {
  return (
    <Link to="/create" className="create-banner-link">
      <img 
        src={BannerImage} 
        alt="Make Your Own Candle - Customize Scents and Colors" 
        className="banner-image-only" 
        // Adding a basic error handler to help you debug on Windows
        onError={(e) => {
          console.error("Banner image failed to load. Check path: ../assets/makeyourowncandle.png");
          e.target.style.display = 'none'; // Hides the broken icon if the file is missing
        }}
      />
    </Link>
  );
};

export default CreateYourOwn;