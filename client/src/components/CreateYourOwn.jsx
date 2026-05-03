import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MiniCandleViewer from './MiniCandleViewer';
import { API_BASE_URL } from '../config';
import '../styles/CreateYourOwn.css';

const CreateYourOwnCard = () => {
  const [designs, setDesigns] = useState([]);
  const [dbModels, setDbModels] = useState([]); // Added to fetch flat_shading info
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Fetch the showcase designs
    fetch(`${API_BASE_URL}/showcase`)
      .then(res => res.json())
      .then(data => setDesigns(data));

    // Fetch the master models table so we know which ones need flat shading
    fetch(`${API_BASE_URL}/admin/models`)
      .then(res => res.json())
      .then(data => setDbModels(data));
  }, []);

  useEffect(() => {
    if (designs.length < 2) return;
    
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % designs.length);
        setIsFading(false);
      }, 500); 
    }, 5500); 
    
    return () => clearInterval(timer);
  }, [designs]);

  const active = designs[currentIdx];
  
  // Cross-reference the active model URL with dbModels to check for flat_shading
  const activeModelInfo = active ? dbModels.find(m => m.model_url === active.model_url) : null;
  const needsFlatShading = activeModelInfo ? activeModelInfo.flat_shading : false;

  return (
    <div className="custom-candle-card horizontal-layout">
      {/* Wrapper no longer fades. Text stays static! */}
      <div className="custom-card-content">
        
        {/* LEFT SIDE: TEXT & CTA */}
        <div className="custom-card-info">
          <span className="featured-badge">Glow Studio</span>
          <h2>Craft Your Signature Candle</h2>
          <p className="card-subtitle">Endless shapes, dynamic layers, and premium scents. Bring your exact vision to life in 3D.</p>
          <Link to="/create" className="pulsing-cta-btn">Start Customizing</Link>
        </div>

        {/* RIGHT SIDE: 3D VIEWER (Only this fades now!) */}
        <div className={`custom-card-3d-container ${isFading ? 'fade-out' : 'fade-in'}`}>
          {active ? (
            <MiniCandleViewer 
              key={active.id} 
              modelUrl={active.model_url} 
              waxColor={active.hex_color}
              layers={active.layers_json ? (typeof active.layers_json === 'string' ? JSON.parse(active.layers_json) : active.layers_json) : []}
              cupColor={active.cup_color}
              flatShading={needsFlatShading}
            />
          ) : (
            <div className="loading-studio">Loading Studio...</div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreateYourOwnCard;