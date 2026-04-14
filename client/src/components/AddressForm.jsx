import React from 'react';
import '../styles/AddressForm.css';

const egyptLocations = {
  "Cairo": ["Nasr City", "Maadi", "Heliopolis", "New Cairo (Tagamoa)", "Zamalek", "Downtown", "Madinaty", "Shorouk", "Rehab", "Shoubra", "Mokattam", "Other"],
  "Giza": ["6th of October", "Sheikh Zayed", "Mohandeseen", "Dokki", "Agouza", "Haram", "Faisal", "Imbaba", "Other"],
  "Alexandria": ["Smouha", "Sidi Gaber", "Miami", "Gleem", "Loran", "Camp Caesar", "Agami", "Borg El Arab", "Other"],
  "Other": ["Other Area"]
};

const AddressForm = ({ formData, onChange }) => {
  const currentGov = formData?.governorate || '';
  const availableAreas = egyptLocations[currentGov] || [];

  return (
    <div className="address-form-wrapper profile-pill-form">
      {/* Autocomplete="on" and the form wrapper enable the browser's address book logic */}
      <form autoComplete="on">
        
        <div className="form-row">
          <div className="form-group flex-fill">
            <label htmlFor="fullName">Full Name</label>
            <input 
              type="text" 
              name="fullName" 
              id="fullName"
              autoComplete="name" 
              required 
              className="custom-pill-input"
              placeholder="e.g. Belal" 
              value={formData?.fullName || ''} 
              onChange={onChange} 
            />
          </div>
          <div className="form-group flex-fill">
            <label htmlFor="phone">Phone Number</label>
            <input 
              type="tel" 
              name="phone" 
              id="phone"
              autoComplete="tel" 
              required 
              className="custom-pill-input"
              placeholder="01X XXXX XXXX" 
              value={formData?.phone || ''} 
              onChange={onChange} 
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group flex-fill">
            <label htmlFor="governorate">Governorate</label>
            <select 
              name="governorate" 
              id="governorate"
              autoComplete="address-level1"
              required 
              className="custom-pill-input pill-select" 
              value={currentGov} 
              onChange={onChange}
            >
              <option value="">Select Governorate...</option>
              {Object.keys(egyptLocations).map(gov => (
                <option key={gov} value={gov}>{gov}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group flex-fill">
            <label htmlFor="area">Area / District</label>
            <select 
              name="area" 
              id="area"
              autoComplete="address-level2"
              required 
              className="custom-pill-input pill-select"
              value={formData?.area || ''} 
              onChange={onChange}
              disabled={!currentGov} 
            >
              <option value="">{currentGov ? "Select Area..." : "Select Governorate first"}</option>
              {availableAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="street">Street Name</label>
          <input 
            type="text" 
            name="street" 
            id="street"
            autoComplete="address-line1"
            required 
            className="custom-pill-input"
            placeholder="e.g. 9th Street" 
            value={formData?.street || ''} 
            onChange={onChange} 
          />
        </div>

        <div className="form-row">
          <div className="form-group flex-fill">
            <label htmlFor="building">Building & Floor/Apt</label>
            <input 
              type="text" 
              name="building" 
              id="building"
              autoComplete="address-line2"
              required 
              className="custom-pill-input"
              placeholder="e.g. Bldg 12, Floor 3" 
              value={formData?.building || ''} 
              onChange={onChange} 
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Landmark / Notes</label>
          <textarea 
            name="notes" 
            id="notes"
            rows="2" 
            className="custom-pill-input pill-textarea"
            placeholder="e.g. Next to the pharmacy..." 
            value={formData?.notes || ''} 
            onChange={onChange}
          ></textarea>
        </div>
      </form>
    </div>
  );
};

// Essential to prevent the SyntaxError: doesn't provide an export named: 'default'
export default AddressForm;