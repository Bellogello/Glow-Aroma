import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import "../styles/create.css";
import CandlePreview3D from '../components/CandlePreview3D';
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config';

// 1. Import the notification hook
import { useNotification } from '../components/NotificationContext';

const Create = () => {
  useTitle("Create Your Own");
  
  // 2. Initialize the hook
  const { success, error, warning } = useNotification();

  const previewRef = useRef(null);

  const [scents, setScents] = useState([]);
  const [colors, setColors] = useState([]);
  const [cupShapes, setCupShapes] = useState([]);
  const [cupSizes, setCupSizes] = useState([]);
  const [cupColors, setCupColors] = useState([]);
  const [moldShapes, setMoldShapes] = useState([]);

  const [candleType, setCandleType] = useState('cup'); 
  const [quantity, setQuantity] = useState(1);
  const [selectedScentId, setSelectedScentId] = useState("default");

  const [selectedCupShape, setSelectedCupShape] = useState("default");
  const [selectedCupSize, setSelectedCupSize] = useState("default");
  const [selectedCupColor, setSelectedCupColor] = useState("default");
  const [selectedCandleColor, setSelectedCandleColor] = useState("default");

  const [selectedMoldShape, setSelectedMoldShape] = useState("default");
  const [moldLayers, setMoldLayers] = useState([]); 

  useEffect(() => {
    fetch(`${API_BASE_URL}/scents`)
      .then(res => res.json())
      .then(data => setScents(data))
      .catch(err => console.error("Error fetching scents:", err));

    fetch(`${API_BASE_URL}/colors`)
      .then(res => res.json())
      .then(data => setColors(data))
      .catch(err => console.error("Error fetching colors:", err));

    fetch(`${API_BASE_URL}/cup-shapes`)
      .then(res => res.json())
      .then(data => setCupShapes(data))
      .catch(err => console.error("Error fetching cup shapes:", err));

    fetch(`${API_BASE_URL}/cup-sizes`)
      .then(res => res.json())
      .then(data => setCupSizes(data))
      .catch(err => console.error("Error fetching cup sizes:", err));

    fetch(`${API_BASE_URL}/cup-colors`)
      .then(res => res.json())
      .then(data => setCupColors(data))
      .catch(err => console.error("Error fetching cup colors:", err));

    fetch(`${API_BASE_URL}/mold-shapes`)
      .then(res => res.json())
      .then(data => setMoldShapes(data))
      .catch(err => console.error("Error fetching mold shapes:", err));
  }, []);

  useEffect(() => {
    if (selectedMoldShape !== "default") {
      const shape = moldShapes.find(m => m.id.toString() === selectedMoldShape.toString());
      if (shape) {
        setMoldLayers(Array(shape.layers).fill("default"));
      }
    } else {
      setMoldLayers([]);
    }
  }, [selectedMoldShape, moldShapes]);

  const handleLayerColorChange = (index, colorId) => {
    const newLayers = [...moldLayers];
    newLayers[index] = colorId;
    setMoldLayers(newLayers);
  };

  const handleConfirm = async () => {
    // 3a. Replaced alert with a warning toast
    if (selectedScentId === "default") return warning("Please pick a scent!");

    let totalPrice = 0;
    
    const scent = scents.find(s => s.id.toString() === selectedScentId.toString());
    if (scent) totalPrice += Number(scent.price);

    if (candleType === 'cup') {
      if (selectedCupShape === "default" || selectedCupSize === "default" || selectedCupColor === "default" || selectedCandleColor === "default") {
        // 3b. Replaced alert
        return warning("Please fill out all Cup options!");
      }
      
      const shape = cupShapes.find(s => s.id.toString() === selectedCupShape.toString());
      const size = cupSizes.find(s => s.id.toString() === selectedCupSize.toString());
      const waxColor = colors.find(c => c.id.toString() === selectedCandleColor.toString());

      if (shape) totalPrice += Number(shape.base_price);
      if (size) totalPrice += Number(size.price_modifier);
      if (waxColor) totalPrice += Number(waxColor.price);

    } else {
      // 3c. Replaced alerts
      if (selectedMoldShape === "default") return warning("Please pick a Mold Shape!");
      if (moldLayers.includes("default")) return warning("Please pick a color for every layer of your mold!");

      const shape = moldShapes.find(s => s.id.toString() === selectedMoldShape.toString());
      if (shape) totalPrice += Number(shape.base_price);

      moldLayers.forEach(layerColorId => {
        const color = colors.find(c => c.id.toString() === layerColorId.toString());
        if (color) totalPrice += Number(color.price);
      });
    }

    const userId = localStorage.getItem("userId");
    if (!userId) return warning("You need to be logged in to add stuff to your cart!");

    const snapshot = previewRef.current?.getSnapshot() || null;

    const payload = {
      type: candleType,
      userId,
      quantity,
      scentId: selectedScentId,
      totalPrice: Number(totalPrice.toFixed(2)),
      snapshot,
      ...(candleType === 'cup' 
        ? { cupShapeId: selectedCupShape, cupSizeId: selectedCupSize, cupColorId: selectedCupColor, candleColorId: selectedCandleColor }
        : { moldShapeId: selectedMoldShape, layers: moldLayers }
      )
    };

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // 3d. Replaced alert with a nice success toast
        success("Success! Your custom candle was added to the cart.");
        setQuantity(1);
        setSelectedScentId("default");
        setSelectedCupShape("default");
        setSelectedCupSize("default");
        setSelectedCupColor("default");
        setSelectedCandleColor("default");
        setSelectedMoldShape("default");
        setMoldLayers([]);
      } else {
        // 3e. Replaced alert
        error("Error from server: " + data.error);
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
      // 3f. Replaced alert
      error("Server error. Please try again later.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      <h1 style={{ textAlign: 'center' }}>Create Your Own Candle</h1>
      <hr className="hr--create" />
      
      <div className='creation'>
        <div className='candle-div'>
          <CandlePreview3D
            ref={previewRef}
            cupColor={
              cupColors.find(c => c.id.toString() === selectedCupColor.toString())?.hex_code ?? '#ffffff'
            }
            waxColor={
              colors.find(c => c.id.toString() === selectedCandleColor.toString())?.hex_code ?? '#ffffff'
            }
            cupSize={
              selectedCupSize === 'default' ? 'medium' :
              (() => {
                const s = cupSizes.find(s => s.id.toString() === selectedCupSize.toString());
                if (!s) return 'medium';
                const ml = Number(s.size_ml);
                if (ml <= 200) return 'small';
                if (ml <= 400) return 'medium';
                return 'large';
              })()
            }
          />
        </div>
        
        <div className='choices'> 
          <div className="type-toggle">
            <label className={`radio-label ${candleType === 'cup' ? 'active-radio' : ''}`}>
              <input 
                type="radio" 
                value="cup" 
                className="radio-input"
                checked={candleType === 'cup'} 
                onChange={() => setCandleType('cup')}
              />
              Cup Candle
            </label>
            <label className={`radio-label ${candleType === 'mold' ? 'active-radio' : ''}`}>
              <input 
                type="radio" 
                value="mold" 
                className="radio-input"
                checked={candleType === 'mold'} 
                onChange={() => setCandleType('mold')}
              />
              Mold Candle
            </label>
          </div>

          <div className='selections'>
            
            {candleType === 'cup' && (
              <>
                <select value={selectedCupShape} onChange={(e) => setSelectedCupShape(e.target.value)}>
                  <option value="default">Cup Shape</option>
                  {cupShapes.map(shape => <option key={shape.id} value={shape.id}>{shape.name}</option>)}
                </select>

                <select value={selectedCupSize} onChange={(e) => setSelectedCupSize(e.target.value)}>
                  <option value="default">Cup Size</option>
                  {cupSizes.map(size => <option key={size.id} value={size.id}>{size.size_ml} ml</option>)}
                </select>

                <select value={selectedCupColor} onChange={(e) => setSelectedCupColor(e.target.value)}>
                  <option value="default">Cup Color</option>
                  {cupColors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>

                <select value={selectedCandleColor} onChange={(e) => setSelectedCandleColor(e.target.value)}>
                  <option value="default">Candle Wax Color</option>
                  {colors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
                </select>
              </>
            )}

            {candleType === 'mold' && (
              <>
                <select value={selectedMoldShape} onChange={(e) => setSelectedMoldShape(e.target.value)}>
                  <option value="default">Mold Shape</option>
                  {moldShapes.map(shape => (
                    <option key={shape.id} value={shape.id}>
                      {shape.name} ({shape.layers} {shape.layers === 1 ? 'Layer' : 'Layers'})
                    </option>
                  ))}
                </select>

                {moldLayers.map((selectedColor, index) => (
                  <select 
                    key={index} 
                    className="layer-select"
                    value={selectedColor} 
                    onChange={(e) => handleLayerColorChange(index, e.target.value)}
                  >
                    <option value="default">Layer {index + 1} Color</option>
                    {colors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
                  </select>
                ))}
              </>
            )}

            <select value={selectedScentId} onChange={(e) => setSelectedScentId(e.target.value)}>
              <option value="default">Scent</option>
              {scents.map(scent => <option key={scent.id} value={scent.id}>{scent.name}</option>)}
            </select>

            <div className="confirmation-area">
              <div className="quantity-wrapper">
                <button className="btn-qty" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="qty-amount">{quantity}</span>
                <button className="btn-qty" onClick={() => setQuantity(quantity + 1)}>+</button>            
              </div>
              
              <button className="confirm" onClick={handleConfirm}>
                Confirm Candle
              </button>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Create;