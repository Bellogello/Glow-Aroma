import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MiniCandleViewer from './MiniCandleViewer';
import { API_BASE_URL } from '../config';
import '../styles/CreateYourOwn.css';

const CreateYourOwnCard = () => {
  const [designs, setDesigns] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE_URL}/showcase`)
      .then(res => res.json())
      .then(data => setDesigns(data));
  }, []);

  useEffect(() => {
    if (designs.length < 2) return;
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % designs.length);
    }, 5000); // Change design every 5 seconds
    return () => clearInterval(timer);
  }, [designs]);

  const active = designs[currentIdx];

  return (
    <div className="custom-candle-card">
      <div className="custom-card-3d-container">
        {active ? (
          <MiniCandleViewer 
            key={active.id} 
            modelUrl={active.model_url} 
            waxColor={active.hex_color} 
          />
        ) : <p>Loading Studio Designs...</p>}
      </div>
      <div className="custom-card-info">
        <h3>{active?.name || "Craft Your Own"}</h3>
        <Link to="/create" className="pulsing-cta-btn">Start Customizing</Link>
      </div>
    </div>
  );
};

export default CreateYourOwnCard;