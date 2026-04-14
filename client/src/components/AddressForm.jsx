import React from 'react';
import '../styles/AddressForm.css';

// 1. THE STATIC DICTIONARY: Always works regardless of .env or backend status
const egyptLocations = {
  "Cairo": ["Nasr City", "Maadi", "Heliopolis", "New Cairo (Tagamoa)", "Zamalek", "Downtown", "Madinaty", "Shorouk", "Rehab", "Shoubra", "Mokattam", "Other"],
  "Giza": ["6th of October", "Sheikh Zayed", "Mohandeseen", "Dokki", "Agouza", "Haram", "Faisal", "Imbaba", "Other"],
  "Alexandria": ["Smouha", "Sidi Gaber", "Miami", "Gleem", "Loran", "Camp Caesar", "Agami", "Borg El Arab", "Other"],
  "Qalyubia": ["Banha", "Shubra El Kheima", "Qalyub", "Obour City", "Khanka", "Other"],
  "Port Said": ["Port Fouad", "Al-Sharq", "Al-Zohour", "Al-Dawahy", "Other"],
  "Suez": ["Suez", "Arbaeen", "Ataqah", "Faisal", "Other"],
  "Dakahlia": ["Mansoura", "Talkha", "Mit Ghamr", "Dekernes", "Aga", "Other"],
  "Sharqia": ["Zagazig", "10th of Ramadan", "Minya El Qamh", "Belbeis", "Faqous", "Other"],
  "Gharbia": ["Tanta", "El Mahalla El Kubra", "Zifta", "Kafr El Zayat", "Other"],
  "Red Sea": ["Hurghada", "Safaga", "El Gouna", "Marsa Alam", "Other"],
  "South Sinai": ["Sharm El Sheikh", "Dahab", "Nuweiba", "Other"],
  "Other": ["Other Area"]
};

const AddressForm = ({ formData, onChange }) => {
  
  // Safety check: ensure formData exists before looking up governorate
  const currentGov = formData?.governorate || '';
  const availableAreas = egyptLocations[currentGov] || [];

  return (
    <div className="address-form-wrapper">
      <div className="form-row">
        <div className="form-group flex-fill">
          <label>Full Name</label>
          <input 
            type="text" 
            name="fullName" 
            required 
            placeholder="e.g. Amina Hassan" 
            value={formData?.fullName || ''} 
            onChange={onChange} 
          />
        </div>
        <div className="form-group flex-fill">
          <label>Phone Number</label>
          <input 
            type="tel" 
            name="phone" 
            required 
            placeholder="01X XXXX XXXX" 
            value={formData?.phone || ''} 
            onChange={onChange} 
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-fill">
          <label>Governorate</label>
          <select name="governorate" required value={currentGov} onChange={onChange}>
            <option value="">Select Governorate...</option>
            {Object.keys(egyptLocations).map(gov => (
              <option key={gov} value={gov}>{gov}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group flex-fill">
          <label>Area / District</label>
          <select 
            name="area" 
            required 
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
        <label>Street Name</label>
        <input 
          type="text" 
          name="street" 
          required 
          placeholder="e.g. 9th Street, Degla" 
          value={formData?.street || ''} 
          onChange={onChange} 
        />
      </div>

      <div className="form-row">
        <div className="form-group flex-fill">
          <label>Building No.</label>
          <input 
            type="text" 
            name="building" 
            required 
            placeholder="e.g. Building 12" 
            value={formData?.building || ''} 
            onChange={onChange} 
          />
        </div>
        <div className="form-group flex-fill">
          <label>Floor & Apt</label>
          <input 
            type="text" 
            name="floorApt" 
            required 
            placeholder="e.g. Floor 3, Apt 11" 
            value={formData?.floorApt || ''} 
            onChange={onChange} 
          />
        </div>
      </div>

      <div className="form-group">
        <label>Nearest Landmark / Delivery Notes</label>
        <textarea 
          name="notes" 
          rows="2" 
          placeholder="e.g. Next to the pharmacy, please call before arriving..." 
          value={formData?.notes || ''} 
          onChange={onChange}
        ></textarea>
      </div>
    </div>
  );
};

export default AddressForm;