import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import AddressForm from '../components/AddressForm';
import '../styles/Checkout.css';

const Checkout = () => {
  useTitle("Checkout | Glow Aroma");
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- NEW: Address Book State ---
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new'); 

  // Form State
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '', phone: '', governorate: '', area: '', street: '', building: '', floorApt: '', notes: ''
  });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate('/signin');
      return;
    }

    // 1. Fetch Cart
    fetch(`http://localhost:5000/cart/${userId}`)
      .then(res => res.json())
      .then(data => { if (!data.error) setCartItems(data); });

    // 2. Fetch User Profile to AUTO-FILL the name and phone!
    fetch(`http://localhost:5000/users/${userId}`)
      .then(res => res.json())
      .then(user => {
        setShippingDetails(prev => ({ ...prev, fullName: user.name, phone: user.phone || '' }));
      });

    // 3. Fetch Saved Addresses (The Address Book!)
    fetch(`http://localhost:5000/addresses/${userId}`)
      .then(res => res.json())
      .then(data => {
        // Did the backend send an actual array, or an error object?
        if (Array.isArray(data)) {
          setSavedAddresses(data);
          if (data.length > 0) {
            setSelectedAddressId(data[0].id); // Auto-select their first address
          }
        } else {
          console.error("Backend sent an error instead of addresses:", data.error);
          setSavedAddresses([]); // Force it to be an empty array so React doesn't crash!
        }
      })
      .catch(err => {
        console.error("Network error fetching addresses:", err);
        setSavedAddresses([]); 
      })
      .finally(() => setLoading(false));

  }, [navigate]);

  const handleInputChange = (e) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem("userId");
    if (cartItems.length === 0) return alert("Your cart is empty!");
    
    setIsProcessing(true);

    try {
      let finalShippingDetails = {};

      // If they are entering a BRAND NEW address, save it to their address book first!
    if (selectedAddressId === 'new') {
        const addressRes = await fetch(`http://localhost:5000/addresses/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shippingDetails)
        });
        
        // UPGRADE: Grab the exact error message from the backend database!
        if (!addressRes.ok) {
          const errorData = await addressRes.json();
          throw new Error(`Database Error: ${errorData.error || "Unknown error"}`);
        }
        finalShippingDetails = shippingDetails;
      } 
      // If they picked a saved address, grab it from the list
      else {
        const pickedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
        finalShippingDetails = {
          fullName: pickedAddress.full_name, phone: pickedAddress.phone,
          governorate: pickedAddress.governorate, area: pickedAddress.area,
          street: pickedAddress.street, building: pickedAddress.building,
          floorApt: pickedAddress.floor_apt, notes: pickedAddress.notes
        };
      }

      // Finally, place the order!
      const response = await fetch('http://localhost:5000/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, shippingDetails: finalShippingDetails })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`🎉 Order placed successfully! Your Order ID is #${data.orderId}`);
        navigate('/'); 
      } else {
        alert("Checkout failed: " + data.error);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="home-container"><Navbar /><div className="checkout-loading"><h2>Preparing checkout...</h2></div><Footer /></div>;

  const orderTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  return (
    <div className="home-container checkout-bg">
      <Navbar />
      <div className="checkout-wrapper">
        <h1 className="checkout-page-title">Complete Your Order</h1>

        <div className="checkout-grid">
          <div className="checkout-form-section">
            <h2>Select Delivery Address</h2>

            {/* ADDRESS SELECTOR */}
            <div className="address-selector">
              {savedAddresses.map(addr => (
                <label key={addr.id} className={`address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="addressSelection" 
                    checked={selectedAddressId === addr.id} 
                    onChange={() => setSelectedAddressId(addr.id)} 
                  />
                  <div className="address-card-info">
                    <strong>{addr.full_name}</strong> - <span>{addr.phone}</span>
                    <p>{addr.building}, {addr.street}, {addr.area}, {addr.governorate}</p>
                  </div>
                </label>
              ))}

              <label className={`address-card ${selectedAddressId === 'new' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="addressSelection" 
                  checked={selectedAddressId === 'new'} 
                  onChange={() => setSelectedAddressId('new')} 
                />
                <div className="address-card-info">
                  <strong>+ Add New Address</strong>
                </div>
              </label>
            </div>

            {/* If "Add New" is selected, show the form! */}
            <form id="checkout-form" onSubmit={handlePlaceOrder}>
              {selectedAddressId === 'new' && (
                <div className="new-address-slide-down">
                  <AddressForm formData={shippingDetails} onChange={handleInputChange} />
                </div>
              )}
            </form>

          </div>

          <div className="checkout-summary-section">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item.cart_item_id} className="summary-item">
                  <div className="summary-item-info">
                    <span className="summary-qty">{item.quantity}x</span>
                    <span className="summary-name">{item.name}</span>
                  </div>
                  <span className="summary-price">{(Number(item.price) * item.quantity).toFixed(2)} L.E.</span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{orderTotal.toFixed(2)} L.E.</span>
              </div>
              <div className="totals-row grand-total">
                <span>Total</span>
                <span>{orderTotal.toFixed(2)} L.E.</span>
              </div>
            </div>

            <button 
              type="submit"
              form="checkout-form"
              className="btn-place-order" 
              disabled={isProcessing || cartItems.length === 0}
            >
              {isProcessing ? "Processing..." : "Place Order"}
            </button>
            <p className="secure-checkout-note">🔒 Secure Cash on Delivery Checkout</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;