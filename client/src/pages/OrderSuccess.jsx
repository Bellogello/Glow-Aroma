import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import useTitle from '../components/useTitles';
import '../styles/OrderSuccess.css'; 

const OrderSuccess = () => {
  useTitle("Order Status | Glow Aroma");
  const [searchParams] = useSearchParams();

  // Paymob adds ?success=true or ?success=false to the redirect URL
  const hasPaymobParams = searchParams.has('success');
  const isSuccess = searchParams.get('success') === 'true';
  
  // Paymob sends the order ID as 'id', or you might pass it from COD as 'order'
  const orderId = searchParams.get('order') || searchParams.get('id') || "Pending";

  // Clear the cart from localStorage if the order was successful
  useEffect(() => {
    if (isSuccess || !hasPaymobParams) {
      // If you decide to add a 'clear cart' endpoint later, you'd call it here
      console.log("Order successful, ready to clear cart session.");
    }
  }, [hasPaymobParams, isSuccess]);

  return (
    <div className="home-container">
      <Navbar />
      
      <div className="success-wrapper">
        {(!hasPaymobParams || isSuccess) ? (
          // --- SUCCESS UI ---
          <div className="status-card success-card">
            <div className="icon-circle success-icon">
              <span>✓</span>
            </div>
            <h1>Payment Successful!</h1>
            <p className="status-message">
              Thank you for your purchase. Your order has been received and is currently being processed.
            </p>
            <div className="order-details-box">
              <p>Order Reference: <strong>#{orderId}</strong></p>
            </div>
            <Link to="/" className="btn-continue-shopping">
              Continue Shopping
            </Link>
          </div>
        ) : (
          // --- FAILURE UI ---
          <div className="status-card error-card">
            <div className="icon-circle error-icon">
              <span>✕</span>
            </div>
            <h1>Payment Failed</h1>
            <p className="status-message">
              Unfortunately, we could not process your payment. Please ensure your card details are correct or try a different payment method.
            </p>
            <div className="order-details-box">
              <p>Attempted Order: <strong>#{orderId}</strong></p>
            </div>
            <Link to="/checkout" className="btn-retry-payment">
              Return to Checkout
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default OrderSuccess;