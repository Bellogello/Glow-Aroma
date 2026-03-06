import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import candle from "../assets/candle.png";
import "../styles/create.css";

const Create = () => {
  // 1. Setup state to hold the data from your database
  const [cups, setCups] = useState([]);
  const [scents, setScents] = useState([]);
  const [colors, setColors] = useState([]);

  // State to track what cup color the user picked so we can filter sizes
  const [selectedCupColor, setSelectedCupColor] = useState("default");

  // State to track the exact IDs the user selects to send to the database
  const [selectedCupId, setSelectedCupId] = useState("default");
  const [selectedScentId, setSelectedScentId] = useState("default");
  const [selectedColorId, setSelectedColorId] = useState("default");

  // 2. Fetch the data when the page loads
  useEffect(() => {
    fetch('http://localhost:5000/api/cups')
      .then(res => res.json())
      .then(data => setCups(data))
      .catch(err => console.error("Error fetching cups:", err));

    fetch('http://localhost:5000/api/scents')
      .then(res => res.json())
      .then(data => setScents(data))
      .catch(err => console.error("Error fetching scents:", err));

    fetch('http://localhost:5000/api/colors')
      .then(res => res.json())
      .then(data => setColors(data))
      .catch(err => console.error("Error fetching colors:", err));
  }, []);

  // 3. Extract unique cup colors so the dropdown doesn't repeat options
  const uniqueCupColors = [...new Set(cups.map(cup => cup.color))].filter(Boolean);

  // 4. The holy grail function that pushes this shit to the cart
  const handleConfirm = async () => {
    // Basic idiot-check: did they actually pick everything?
    if (selectedCupId === "default" || selectedScentId === "default" || selectedColorId === "default") {
      alert("Bro, you gotta pick a size, scent, and color before confirming!");
      return;
    }

    // Grab the user ID from local storage
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      alert("You need to be logged in to add stuff to your cart!");
      return;
    }

    // Big brain move: calculate the real total price instead of hardcoding $15
// Big brain move: force them to be real numbers before adding!
const selectedCup = cups.find(c => c.id.toString() === selectedCupId.toString());
    const selectedScent = scents.find(s => s.id.toString() === selectedScentId.toString());
    const selectedColor = colors.find(c => c.id.toString() === selectedColorId.toString());

    // 2. Convert prices to clean numbers so the database doesn't crash
    const cupPrice = Number(selectedCup?.price || 0);
    const scentPrice = Number(selectedScent?.price || 0);
    const colorPrice = Number(selectedColor?.price || 0);

    // 3. Add them up and format to 2 decimal places
    const totalPrice = Number((cupPrice + scentPrice + colorPrice).toFixed(2));

    // Package the payload
    const candleData = {
      userId: userId,
      cupId: selectedCupId,
      colorId: selectedColorId,
      scentId: selectedScentId,
      totalPrice: totalPrice 
    };

    try {
      // Send it to the backend route we just made
      const response = await fetch('http://localhost:5000/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candleData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Candle added to cart! 🔥");
        // Reset the form so they can build another one
        setSelectedCupColor("default");
        setSelectedCupId("default");
        setSelectedScentId("default");
        setSelectedColorId("default");
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Server is acting up, check the console.");
    }
  };

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
            
            {/* Cascading Step 1: Cup Color */}
            <select 
              className='cup_color'
              value={selectedCupColor}
              onChange={(e) => {
                setSelectedCupColor(e.target.value);
                setSelectedCupId("default"); // Reset the size if they change the color
              }}
            >
              <option value="default">Cup Color</option>
              {uniqueCupColors.map((colorName, index) => (
                <option key={index} value={colorName}>
                  {colorName}
                </option>
              ))}
            </select>

            {/* Cascading Step 2: Cup Size (Filtered by Color) */}
            <select 
              className='cup_size' 
              value={selectedCupId}
              onChange={(e) => setSelectedCupId(e.target.value)}
              disabled={selectedCupColor === "default"}
            >
              <option value="default">
                {selectedCupColor === "default" ? "Pick a color first" : "Cup Size"}
              </option>
              {cups
                .filter((cup) => cup.color === selectedCupColor)
                .map((cup) => (
                  <option key={cup.id} value={cup.id}>
                    {cup.size_ml} ml
                  </option>
                ))}
            </select>

            {/* Scents Dropdown */}
            <select 
              className='scents'
              value={selectedScentId}
              onChange={(e) => setSelectedScentId(e.target.value)}
            >
              <option value="default">Scent</option>
              {scents.map((scent) => (
                <option key={scent.id} value={scent.id}>
                  {scent.name}
                </option>
              ))}
            </select>

            {/* Candle Colors Dropdown */}
            <select 
              className='color'
              value={selectedColorId}
              onChange={(e) => setSelectedColorId(e.target.value)}
            >
              <option value="default">Candle Color</option>
              {colors.map((color) => (
                <option key={color.id} value={color.id}>
                  {color.name}
                </option>
              ))}
            </select>        
            
            {/* Attach the confirm handler to the button! */}
            <button className='confirm' onClick={handleConfirm}>Confirm Candle</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;