import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import "../styles/create.css";
import useTitle from '../components/useTitles';
import Footer from '../components/Footer';

const Create = () => {

  useTitle("Create Your Own");

  const [scents, setScents] = useState([]);
  const [colors, setColors] = useState([]);
  const [cupSizes, setCupSizes] = useState([]);
  const [cupColors, setCupColors] = useState([]);

  const [quantity, setQuantity] = useState(1);
  const [selectedScentId, setSelectedScentId] = useState("default");
  const [selectedCupSize, setSelectedCupSize] = useState("default");
  const [selectedCupColor, setSelectedCupColor] = useState("default");
  const [selectedCandleColor, setSelectedCandleColor] = useState("default");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/scents`)
      .then(res => res.json())
      .then(data => setScents(data))
      .catch(err => console.error("Error fetching scents:", err));

    fetch(`${import.meta.env.VITE_API_URL}/colors`)
      .then(res => res.json())
      .then(data => setColors(data))
      .catch(err => console.error("Error fetching colors:", err));

    fetch(`${import.meta.env.VITE_API_URL}/cup-sizes`)
      .then(res => res.json())
      .then(data => setCupSizes(data))
      .catch(err => console.error("Error fetching cup sizes:", err));

    fetch(`${import.meta.env.VITE_API_URL}/cup-colors`)
      .then(res => res.json())
      .then(data => setCupColors(data))
      .catch(err => console.error("Error fetching cup colors:", err));
  }, []);

  const handleConfirm = async () => {
    if (selectedCupSize === "default") return alert("Please pick a cup size!");
    if (selectedCupColor === "default") return alert("Please pick a cup color!");
    if (selectedCandleColor === "default") return alert("Please pick a candle wax color!");
    if (selectedScentId === "default") return alert("Please pick a scent!");

    let totalPrice = 0;

    const scent = scents.find(s => s.id.toString() === selectedScentId.toString());
    if (scent) totalPrice += Number(scent.price);

    const size = cupSizes.find(s => s.id.toString() === selectedCupSize.toString());
    if (size) totalPrice += Number(size.price_modifier);

    const waxColor = colors.find(c => c.id.toString() === selectedCandleColor.toString());
    if (waxColor) totalPrice += Number(waxColor.price);

    const userId = localStorage.getItem("userId");
    if (!userId) return alert("You need to be logged in to add stuff to your cart!");

    const payload = {
      type: 'cup',
      userId,
      quantity,
      scentId: selectedScentId,
      totalPrice: Number(totalPrice.toFixed(2)),
      cupShapeId: 1, // default shape since we removed that option
      cupSizeId: selectedCupSize,
      cupColorId: selectedCupColor,
      candleColorId: selectedCandleColor,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Success! Your custom candle was added to the cart.");
        setQuantity(1);
        setSelectedScentId("default");
        setSelectedCupSize("default");
        setSelectedCupColor("default");
        setSelectedCandleColor("default");
      } else {
        alert("Error from server: " + data.error);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
      alert("Server is acting up. Did you make sure it's running?");
    }
  };

  return (
    <div className="home-container">
      <Navbar />
      <h1 style={{ textAlign: 'center' }}>Create Your Own Candle</h1>
      <hr className="hr--create" />

      <div className="selections" style={{ maxWidth: '500px', margin: '0 auto', padding: '0 20px' }}>

        <select value={selectedCupColor} onChange={(e) => setSelectedCupColor(e.target.value)}>
          <option value="default">Cup Color</option>
          {cupColors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
        </select>

        <select value={selectedCupSize} onChange={(e) => setSelectedCupSize(e.target.value)}>
          <option value="default">Cup Size</option>
          {cupSizes.map(size => <option key={size.id} value={size.id}>{size.size_ml} ml</option>)}
        </select>

        <select value={selectedCandleColor} onChange={(e) => setSelectedCandleColor(e.target.value)}>
          <option value="default">Candle Wax Color</option>
          {colors.map(color => <option key={color.id} value={color.id}>{color.name}</option>)}
        </select>

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
          <button className="confirm" onClick={handleConfirm}>Confirm Candle</button>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default Create;