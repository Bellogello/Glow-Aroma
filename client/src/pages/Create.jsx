import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import candle from "../assets/candle.png";
import "../styles/create.css";

const Create = () => {
  // 1. Setup state to hold the data from your database
  const [cups, setCups] = useState([]);
  const [scents, setScents] = useState([]);
  const [colors, setColors] = useState([]);

  // NEW: State to track what cup color the user picked so we can filter sizes
  const [selectedCupColor, setSelectedCupColor] = useState("default");

  // 2. Fetch the data when the page loads
  useEffect(() => {
    // Fetch Cups
    fetch('http://localhost:5000/api/cups')
      .then(res => res.json())
      .then(data => setCups(data))
      .catch(err => console.error("Error fetching cups:", err));

    // Fetch Scents
    fetch('http://localhost:5000/api/scents')
      .then(res => res.json())
      .then(data => setScents(data))
      .catch(err => console.error("Error fetching scents:", err));

    // Fetch Colors
    fetch('http://localhost:5000/api/colors')
      .then(res => res.json())
      .then(data => setColors(data))
      .catch(err => console.error("Error fetching colors:", err));
  }, []);

  // 3. Extract unique cup colors so the dropdown doesn't repeat options
  const uniqueCupColors = [...new Set(cups.map(cup => cup.color))].filter(Boolean);

  return (
    <div className="home-container">
      <Navbar />
      <h1>Create Your Own Candle</h1>
      <hr className="hr--create" />
      <div className='creation'>
        
        <div className='candle-div'>
          <img className="candle-preview" src={candle} alt="Candle Preview" />
        </div>
        
        <div className='choices'> 
          <div className='selections'>
            
            {/* 4. Cascading Step 1: Cup Color */}
            <select 
              className='cup_color'
              value={selectedCupColor}
              onChange={(e) => setSelectedCupColor(e.target.value)}
            >
              <option value="default">Cup Color</option>
              {uniqueCupColors.map((colorName, index) => (
                <option key={index} value={colorName}>
                  {colorName}
                </option>
              ))}
            </select>

            {/* 5. Cascading Step 2: Cup Size (Filtered by Color) */}
            <select className='cup_size' disabled={selectedCupColor === "default"}>
              <option value="default">
                {selectedCupColor === "default" ? "Pick a color first" : "Cup Size"}
              </option>
              {cups
                .filter((cup) => cup.color === selectedCupColor)
                .map((cup) => (
                  <option key={cup.id} value={cup.id}>
                    {cup.size_ml} ml - ${cup.price}
                  </option>
                ))}
            </select>

            {/* 6. Scents Dropdown */}
            <select className='scents'>
              <option value="default">Scent</option>
              {scents.map((scent) => (
                <option key={scent.id} value={scent.id}>
                  {scent.name}
                </option>
              ))}
            </select>

            {/* 7. Candle Colors Dropdown */}
            <select className='color'>
              <option value="default">Candle Color</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name} {/* Fixed to color.name based on DB schema */}
                </option>
              ))}
            </select>        
            
            <button className='confirm'>Confirm Candle</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;