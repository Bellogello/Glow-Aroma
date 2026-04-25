import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import "../styles/create.css";
import CandlePreview3D from '../components/CandlePreview3D';
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';
import { API_BASE_URL } from '../config';
import { useNotification } from '../components/NotificationContext';

const Create = () => {
  useTitle("Create Your Own");
  const { success, error, warning } = useNotification();
  const previewRef = useRef(null);

  const [scents, setScents] = useState([]);
  const [colors, setColors] = useState([]);
  const [cupShapes, setCupShapes] = useState([]);
  const [cupSizes, setCupSizes] = useState([]);
  const [cupColors, setCupColors] = useState([]);
  const [moldShapes, setMoldShapes] = useState([]);
  
  // --- NEW: State to hold the 3D Models library data ---
  const [dbModels, setDbModels] = useState([]); 

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
    const fetchData = (endpoint, setter) => {
      fetch(`${API_BASE_URL}/${endpoint}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setter(data);
          else setter([]);
        })
        .catch(err => {
          console.error(`Error fetching ${endpoint}:`, err);
          setter([]);
        });
    };

    fetchData('scents', setScents);
    fetchData('colors', setColors);
    fetchData('cup-shapes', setCupShapes);
    fetchData('cup-sizes', setCupSizes);
    fetchData('cup-colors', setCupColors);
    fetchData('mold-shapes', setMoldShapes);
    
    // --- NEW: Fetch the library models to get the mesh names ---
    fetchData('admin/models', setDbModels); 
  }, []);

  useEffect(() => {
    if (candleType === 'cup' && Array.isArray(cupShapes) && cupShapes.length > 0 && selectedCupShape === 'default') {
      setSelectedCupShape(cupShapes[0].id);
    } else if (candleType === 'mold' && Array.isArray(moldShapes) && moldShapes.length > 0 && selectedMoldShape === 'default') {
      setSelectedMoldShape(moldShapes[0].id);
    }
  }, [cupShapes, moldShapes, candleType, selectedCupShape, selectedMoldShape]);

  useEffect(() => {
    if (selectedMoldShape !== "default" && Array.isArray(moldShapes)) {
      const shape = moldShapes.find(m => m.id.toString() === selectedMoldShape.toString());
      if (shape) {
        setMoldLayers(Array(shape.layers || 1).fill("default"));
      }
    } else {
      setMoldLayers([]);
    }
  }, [selectedMoldShape, moldShapes]);

  const currentModelUrl = (candleType === 'cup' && Array.isArray(cupShapes))
    ? cupShapes.find(s => String(s.id) === String(selectedCupShape))?.model_url
    : (Array.isArray(moldShapes) ? moldShapes.find(s => String(s.id) === String(selectedMoldShape))?.model_url : null);
      
  const handleLayerColorChange = (index, colorId) => {
    const newLayers = [...moldLayers];
    newLayers[index] = colorId;
    setMoldLayers(newLayers);
  };

  const handleConfirm = async () => {
    if (selectedScentId === "default") return warning("Please pick a scent!");

    let totalPrice = 0;
    const scent = scents.find(s => s.id.toString() === selectedScentId.toString());
    if (scent) totalPrice += Number(scent.price_modifier || 0);

    if (candleType === 'cup') {
      if (selectedCupShape === "default" || selectedCupSize === "default" || selectedCupColor === "default" || selectedCandleColor === "default") {
        return warning("Please fill out all Cup options!");
      }
      const shape = cupShapes.find(s => s.id.toString() === selectedCupShape.toString());
      const size = cupSizes.find(s => s.id.toString() === selectedCupSize.toString());
      const waxColor = colors.find(c => c.id.toString() === selectedCandleColor.toString());

      if (shape) totalPrice += Number(shape.price_modifier || 0);
      if (size) totalPrice += Number(size.price_modifier || 0);
      if (waxColor) totalPrice += Number(waxColor.price_modifier || 0);

    } else {
      if (selectedMoldShape === "default") return warning("Please pick a Mold Shape!");
      if (moldLayers.includes("default")) return warning("Please pick a color for every layer!");

      const shape = moldShapes.find(s => s.id.toString() === selectedMoldShape.toString());
      if (shape) totalPrice += Number(shape.price_modifier || 0);

      moldLayers.forEach(layerColorId => {
        const color = colors.find(c => c.id.toString() === layerColorId.toString());
        if (color) totalPrice += Number(color.price_modifier || 0);
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
        success("Success! Your custom candle was added to the cart.");
        setQuantity(1);
        setSelectedScentId("default");
      } else {
        error("Error from server: " + data.error);
      }
    } catch (err) {
      error("Server error. Please try again later.");
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      {/* --- TEMPORARY DEBUG BANNER --- */}
      <div style={{ background: 'black', color: 'lime', padding: '10px', textAlign: 'center', fontFamily: 'monospace' }}>
        <strong>DEBUG DATA:</strong><br/>
        Cups Loaded: {cupShapes.length} | 
        Molds Loaded: {moldShapes.length} | 
        Scents Loaded: {scents.length}
      </div>
      {/* ------------------------------ */}
      <h1 style={{ textAlign: 'center' }}>Create Your Own Candle</h1>
      <hr className="hr--create" />
      
      <div className='creation'>
        <div className='candle-div'>
          <CandlePreview3D
            ref={previewRef}
            modelUrl={currentModelUrl}
            
            // --- NEW: Look up the model by URL to find your configured mesh names! ---
            colorableParts={(() => {
              if (!currentModelUrl || dbModels.length === 0) return [];
              const modelObj = dbModels.find(m => m.model_url === currentModelUrl);
              if (!modelObj || !modelObj.colorable_parts) return [];
              
              try {
                return typeof modelObj.colorable_parts === 'string' 
                  ? JSON.parse(modelObj.colorable_parts) 
                  : modelObj.colorable_parts;
              } catch (e) {
                return [];
              }
            })()}
            
            layerColors={
              candleType === 'mold'
                ? moldLayers.map(colorId => {
                    const colorObj = colors.find(c => String(c.id) === String(colorId));
                    return colorObj ? colorObj.hex_code : '#ffffff';
                  })
                : []
            }

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