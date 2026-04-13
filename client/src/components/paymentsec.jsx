import React from 'react';
import { CardElement } from '@stripe/react-stripe-js';

const PaymentSection = ({ stripeError }) => {
  return (
    <div className="stripe-container" style={{ 
      padding: '20px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '8px',
      marginTop: '15px' 
    }}>
      <label style={{ marginBottom: '10px', display: 'block', color: '#76594C' }}>
        Card Details
      </label>
      <CardElement options={{
        style: {
          base: {
            fontSize: '16px',
            color: '#4a3b32',
            '::placeholder': { color: '#aab7c4' },
          },
          invalid: { color: '#9e2146' },
        },
      }} />
      {stripeError && <p className="error-msg" style={{ color: 'red', marginTop: '10px' }}>{stripeError}</p>}
    </div>
  );
};

export default PaymentSection;