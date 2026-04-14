import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import AddressForm from '../components/AddressForm';
import '../styles/Checkout.css';
// 1. Import the "Central Brain"
import { API_BASE_URL } from '../config';

const Checkout = () => {
  useTitle("Checkout | Glow Aroma");
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- Payment State ---
  const [paymentMethod, setPaymentMethod] = useState('cod'); 
  const [paymobToken, setPaymobToken] = useState(null);
  const [paymobIframeId, setPaymobIframeId] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null); 

  // --- Address Book State ---
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

    // 2. Used API_BASE_URL for initial loading
    Promise.all([
      fetch(`${API_BASE_URL}/cart/${userId}`).then(res => res.json()),
      fetch(`${API_BASE_URL}/users/${userId}`).then(res => res.json()),
      fetch(`${API_BASE_URL}/addresses/${userId}`).then(res => res.json())
    ]).then(([cart, user, addresses]) => {
      if (!cart.error) setCartItems(cart);
      if (!user.error) setShippingDetails(prev => ({ ...prev, fullName: user.name, phone: user.phone || '' }));
      
      if (Array.isArray(addresses)) {
        setSavedAddresses(addresses);
        if (addresses.length > 0) setSelectedAddressId(addresses[0].id);
      }
    })
    .catch(err => console.error("Initialization error:", err))
    .finally(() => setLoading(false));
  }, [navigate]);

  const handleInputChange = (e) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault();
    const userId = localStorage.getItem("userId");
    
    if (cartItems.length === 0 && !pendingOrderId) return alert("Your cart is empty!");

    setIsProcessing(true);

    try {
      let finalDetails = {};
      let currentOrderId = pendingOrderId; 

      // 3. Resolve Address & Create Order (Using API_BASE_URL)
      if (!currentOrderId) {
        if (selectedAddressId === 'new') {
          const addrRes = await fetch(`${API_BASE_URL}/addresses/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shippingDetails)
          });
          if (!addrRes.ok) {
            const err = await addrRes.json();
            throw new Error(err.error || "Failed to save address");
          }
          finalDetails = shippingDetails;
        } else {
          const picked = savedAddresses.find(a => a.id === selectedAddressId);
          finalDetails = {
            fullName: picked.full_name, phone: picked.phone,
            governorate: picked.governorate, area: picked.area,
            street: picked.street, building: picked.building,
            floorApt: picked.floor_apt, notes: picked.notes
          };
        }

        const orderRes = await fetch(`${API_BASE_URL}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, shippingDetails: finalDetails, paymentMethod })
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok) throw new Error(orderData.error);
        
        currentOrderId = orderData.orderId;
        
        if (paymentMethod === 'online') {
          setPendingOrderId(currentOrderId);
        }
      }

      // 4. Handle Paymob Initiation (Using API_BASE_URL)
      if (paymentMethod === 'online') {
        const orderTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
        
        const pmRes = await fetch(`${API_BASE_URL}/paymob/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            shippingDetails: finalDetails, 
            orderId: currentOrderId,      
            amountCents: Math.round(orderTotal * 100),
            items: cartItems.map(i => ({ name: i.name, amount_cents: Math.round(i.price * 100), quantity: i.quantity }))
          })
        });

        const pmData = await pmRes.json();
        if (!pmRes.ok) throw new Error(pmData.error || "Failed to initiate payment");

        setPaymobToken(pmData.paymentToken);
        setPaymobIframeId(pmData.iframeId);
      } else {
        navigate(`/order-success?success=true&order=${currentOrderId}`);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const orderTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  if (loading) return <div className="loading-screen">Preparing checkout...</div>;

  return (
    <div className="home-container checkout-bg">
      <Navbar />
      
      {paymobToken && (
        <div className="payment-iframe-overlay">
          <div className="iframe-container">
            <button className="close-iframe" onClick={() => setPaymobToken(null)}>Close & Return</button>
            <iframe
              title="Paymob Payment"
              src={`https://accept.paymob.com/api/acceptance/iframes/${paymobIframeId}?payment_token=${paymobToken}`}
              width="100%"
              height="600px"
            />
          </div>
        </div>
      )}

      <div className="checkout-wrapper">
        <h1 className="checkout-page-title">Complete Your Order</h1>

        <div className="checkout-grid">
          <div className="checkout-form-section">
            <section className="address-section">
              <h2>1. Delivery Address</h2>
              <div className="address-selector">
                {savedAddresses.map(addr => (
                  <label key={addr.id} className={`address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}>
                    <input type="radio" name="addr" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} />
                    <div className="address-card-info">
                      <strong>{addr.full_name}</strong>
                      <p>{addr.street}, {addr.area}</p>
                    </div>
                  </label>
                ))}
                <label className={`address-card ${selectedAddressId === 'new' ? 'selected' : ''}`}>
                  <input type="radio" name="addr" checked={selectedAddressId === 'new'} onChange={() => setSelectedAddressId('new')} />
                  <div className="address-card-info"><strong>+ Add New Address</strong></div>
                </label>
              </div>
              {selectedAddressId === 'new' && <AddressForm formData={shippingDetails} onChange={handleInputChange} />}
            </section>

            <section className="payment-section-box">
              <h2>2. Payment Method</h2>
              <div className="payment-options">
                <label className={`pay-option ${paymentMethod === 'cod' ? 'active' : ''}`}>
                  <input type="radio" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} />
                  Cash on Delivery
                </label>
                <label className={`pay-option ${paymentMethod === 'online' ? 'active' : ''}`}>
                  <input type="radio" value="online" checked={paymentMethod === 'online'} onChange={(e) => setPaymentMethod(e.target.value)} />
                  Online Card / Wallet
                </label>
              </div>
            </section>
          </div>

          <div className="checkout-summary-section">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item.cart_item_id} className="summary-item">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{(item.price * item.quantity).toFixed(2)} L.E.</span>
                </div>
              ))}
            </div>
            <div className="summary-totals">
              <div className="totals-row grand-total">
                <span>Total</span>
                <span>{orderTotal.toFixed(2)} L.E.</span>
              </div>
            </div>

            <button 
              className="btn-place-order" 
              onClick={handlePlaceOrder} 
              disabled={isProcessing || (cartItems.length === 0 && !pendingOrderId)}
            >
              {isProcessing ? "Processing..." : paymentMethod === 'online' ? "Pay Now" : "Place Order"}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;