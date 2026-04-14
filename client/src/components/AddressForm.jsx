import React from 'react';
import '../styles/AddressForm.css';

const AddressForm = ({ formData, onChange }) => {
  return (
    <div className="address-form-wrapper profile-pill-form">
      {/* 1. Use a real form tag with name and autocomplete on */}
      <form name="address-book" autoComplete="on">
        
        <div className="form-row">
          <div className="form-group flex-fill">
            <label htmlFor="fullName">Full Name</label>
            <input 
              type="text" 
              name="fullName" 
              id="fullName" 
              autoComplete="name" 
              className="custom-pill-input"
              value={formData?.fullName || ''} 
              onChange={onChange} 
              required 
            />
          </div>
          
          <div className="form-group flex-fill">
            <label htmlFor="phone">Phone Number</label>
            <input 
              type="tel" 
              name="phone"  /* MUST be phone */
              id="phone"    /* MUST be phone */
              autoComplete="tel" /* Browser signal */
              className="custom-pill-input"
              placeholder="01X XXXX XXXX" 
              value={formData?.phone || ''} 
              onChange={onChange} 
              required 
            />
          </div>
        </div>

        {/* ... Rest of your fields following the id/htmlFor pattern ... */}

      </form>
    </div>
  );
};