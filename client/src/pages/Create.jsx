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

  // Data States
  const [scents, setScents] = useState([]);
  const [waxColors, setWaxColors] = useState([]); 
  const [cupShapes, setCupShapes] = useState([]);
  const [moldShapes, setMoldShapes] = useState([]);
  const [dbModels, setDbModels] = useState([]); 

  // Selection States
  const [candleType, setCandleType] = useState('cup'); 
  const [quantity, setQuantity] = useState(1);
  const [selectedScentId, setSelectedScentId] = useState("default");

  const [selectedCupShape, setSelectedCupShape] = useState("default");
  const [selectedCupSizeIdx, setSelectedCupSizeIdx] = useState("default"); 
  const [selectedCupColor, setSelectedCupColor] = useState("default"); 
  const [selectedCandleColor, setSelectedCandleColor] = useState("default");

  const [selectedMoldShape, setSelectedMoldShape] = useState("default");
  const [moldLayers, setMoldLayers] = useState([]); 

  useEffect(() => {
    const fetchData = (endpoint, setter) => {
      fetch(`${API_BASE_URL}/${endpoint}`)
        .then(res => res.json())
        .then(data => setter(Array.isArray(data) ? data : []))
        .catch(err => console.error(`Error fetching ${endpoint}:`, err));
    };

    fetchData('scents', setScents);
    fetchData('colors', setWaxColors);
    fetchData('admin/inventory/cup-shapes', setCupShapes);
    fetchData('mold-shapes', setMoldShapes);
    fetchData('admin/models', setDbModels); 
  }, []);

  // --- Master Cup Data Parsing ---
  const activeCup = cupShapes.find(s => String(s.id) === String(selectedCupShape));
  const availableSizes = activeCup ? (typeof activeCup.sizes === 'string' ? JSON.parse(activeCup.sizes) : (activeCup.sizes || [])) : [];
  const availableCupColors = activeCup ? (typeof activeCup.colors === 'string' ? JSON.parse(activeCup.colors) : (activeCup.colors || [])) : [];

  const currentModelUrl = candleType === 'cup'
    ? activeCup?.model_url
    : moldShapes.find(s => String(s.id) === String(selectedMoldShape))?.model_url;

  useEffect(() => {
    if (candleType === 'cup' && cupShapes.length > 0 && selectedCupShape === 'default') {
      setSelectedCupShape(cupShapes[0].id);
    }
  }, [cupShapes, candleType, selectedCupShape]);

  useEffect(() => {
    if (selectedMoldShape !== "default") {
      const shape = moldShapes.find(m => m.id.toString() === selectedMoldShape.toString());
      if (shape) setMoldLayers(Array(shape.layers || 1).fill("default"));
    }
  }, [selectedMoldShape, moldShapes]);

  const handleConfirm = async () => {
    if (selectedScentId === "default") return warning("Please pick a scent!");

    let totalPrice = 0;
    const scent = scents.find(s => String(s.id) === String(selectedScentId));
    if (scent) totalPrice += Number(scent.price_modifier || 0);

    // Prepare payload-specific variables
    let finalCupSize = null;

    if (candleType === 'cup') {
      if (selectedCupShape === "default" || selectedCupSizeIdx === "default" || selectedCupColor === "default") {
        return warning("Please complete your selections!");
      }
      const sizeObj = availableSizes[selectedCupSizeIdx];
      const colorObj = availableCupColors.find(c => c.hex_code === selectedCupColor);
      const waxObj = waxColors.find(c => String(c.id) === String(selectedCandleColor));

      totalPrice += Number(activeCup.price_modifier || 0);
      if (sizeObj) {
        totalPrice += Number(sizeObj.price_modifier || 0);
        finalCupSize = sizeObj.ml; // This is what fixes the nullml issue
      }
      if (colorObj) totalPrice += Number(colorObj.price_modifier || 0);
      if (waxObj) totalPrice += Number(waxObj.price_modifier || 0);
    } else {
      const shape = moldShapes.find(s => String(s.id) === String(selectedMoldShape));
      if (shape) totalPrice += Number(shape.price_modifier || 0);
      moldLayers.forEach(id => {
        const c = waxColors.find(wc => String(wc.id) === String(id));
        if (c) totalPrice += Number(c.price_modifier || 0);
      });
    }

    const userId = localStorage.getItem("userId");
    if (!userId) return warning("Log in to add to cart!");

    // Capture snapshot (Angle is handled inside CandlePreview3D useImperativeHandle)
    const snapshot = previewRef.current?.getSnapshot() || null;

    const payload = {
      type: candleType,
      userId,
      quantity,
      scentId: selectedScentId,
      totalPrice: Number(totalPrice.toFixed(2)),
      snapshot: snapshot,
      ...(candleType === 'cup' 
        ? { 
            cupShapeId: selectedCupShape, 
            cupSize: finalCupSize, // Explicitly sending the ML value
            cupColor: selectedCupColor, 
            candleColorId: selectedCandleColor 
          }
        : { moldShapeId: selectedMoldShape, layers: moldLayers }
      )
    };

    try {
      const res = await fetch(`${API_BASE_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) success("Added to cart!");
      else error("Failed to add.");
    } catch (err) { error("Server error."); }
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
            modelUrl={currentModelUrl}
            flatShading={dbModels.find(m => m.model_url === currentModelUrl)?.flat_shading}
            colorableParts={(() => {
              const modelObj = dbModels.find(m => m.model_url === currentModelUrl);
              if (!modelObj || !modelObj.colorable_parts) return [];
              try { return typeof modelObj.colorable_parts === 'string' ? JSON.parse(modelObj.colorable_parts) : modelObj.colorable_parts; }
              catch { return []; }
            })()}
            cupColor={selectedCupColor === 'default' ? 'rgba(255,255,255,0.45)' : selectedCupColor}
            waxColor={waxColors.find(c => String(c.id) === String(selectedCandleColor))?.hex_code ?? '#ffffff'}
            layerColors={moldLayers.map(id => waxColors.find(c => String(c.id) === String(id))?.hex_code || '#ffffff')}
            cupSize={
                // availableSizes[selectedCupSizeIdx]?.ml <= 200 ? 'small' : 
                availableSizes[selectedCupSizeIdx]?.ml <= 400 ? 'medium' : 'large'
            }
          />
        </div>
        
        <div className='choices'> 
          <div className="type-toggle">
            <label className={`radio-label ${candleType === 'cup' ? 'active-radio' : ''}`}>
              <input type="radio" checked={candleType === 'cup'} onChange={() => setCandleType('cup')} className="radio-input" />
              Cup Candle
            </label>
            <label className={`radio-label ${candleType === 'mold' ? 'active-radio' : ''}`}>
              <input type="radio" checked={candleType === 'mold'} onChange={() => setCandleType('mold')} className="radio-input" />
              Mold Candle
            </label>
          </div>

          <div className='selections'>
            {candleType === 'cup' && (
              <>
                <select value={selectedCupShape} onChange={(e) => { setSelectedCupShape(e.target.value); setSelectedCupSizeIdx("default"); setSelectedCupColor("default"); }}>
                  <option value="default">Cup Shape</option>
                  {cupShapes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>

                <select value={selectedCupSizeIdx} onChange={(e) => setSelectedCupSizeIdx(e.target.value)}>
                  <option value="default">Cup Size</option>
                  {availableSizes.map((s, i) => <option key={i} value={i}>{s.ml} ml</option>)}
                </select>

                <select value={selectedCupColor} onChange={(e) => setSelectedCupColor(e.target.value)}>
                  <option value="default">Cup Color</option>
                  {availableCupColors.map((c, i) => <option key={i} value={c.hex_code}>{c.name}</option>)}
                </select>

                <select value={selectedCandleColor} onChange={(e) => setSelectedCandleColor(e.target.value)}>
                  <option value="default">Candle Wax Color</option>
                  {waxColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}

            {candleType === 'mold' && (
              <>
                <select value={selectedMoldShape} onChange={(e) => setSelectedMoldShape(e.target.value)}>
                  <option value="default">Mold Shape</option>
                  {moldShapes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {moldLayers.map((val, i) => (
                  <select key={i} value={val} onChange={(e) => { const n = [...moldLayers]; n[i] = e.target.value; setMoldLayers(n); }} className="layer-select">
                    <option value="default">Layer {i+1} Color</option>
                    {waxColors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ))}
              </>
            )}

            <select value={selectedScentId} onChange={(e) => setSelectedScentId(e.target.value)}>
              <option value="default">Scent</option>
              {scents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="confirmation-area">
              <div className="quantity-wrapper">
                <button className="btn-qty" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="qty-amount">{quantity}</span>
                <button className="btn-qty" onClick={() => setQuantity(quantity + 1)}>+</button>            
              </div>
              <button className="confirm" onClick={handleConfirm}>Confirm Candle</button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Create;