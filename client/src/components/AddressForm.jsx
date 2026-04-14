import React from 'react';
import '../styles/AddressForm.css';

const egyptLocations = {
  "Cairo": [
    "New Cairo", "Nasr City", "Maadi", "Heliopolis", "Downtown", 
    "Zamalek", "Garden City", "Shoubra", "Ain Shams", "Mokattam", 
    "Basateen", "Helwan", "Madinaty", "Shorouk", "Rehab", 
    "Obour City", "Badr City", "El Marg", "Matareya"
  ],
  "Giza": [
    "6th of October City", "Sheikh Zayed", "Haram", "Faisal", 
    "Dokki", "Mohandeseen", "Agouza", "Imbaba", "Hadayek Al Ahram", 
    "Muneera", "Smart Village", "Badrasheen", "Hawamdia"
  ],
  "Alexandria": [
    "Smouha", "Sidi Gaber", "Miami", "Gleem", "Loran", "Camp Caesar", 
    "Agami", "Borg El Arab", "Montaza", "Abu Qir", "Mandara", 
    "Kafr Abdou", "Roushdy"
  ],
  "Qalyubia": ["Banha", "Shubra El Kheima", "Obour", "Qalyub", "Khanka"],
  "Dakahlia": ["Mansoura", "Talkha", "Mit Ghamr", "Dekernes"],
  "Sharkia": ["Zagazig", "10th of Ramadan City", "Bilbeis", "Faqus"],
  "Gharbia": ["Tanta", "Kafr El Zayat", "Mahalla El Kubra", "Zefta"],
  "Monufia": ["Shibin El Kom", "Menouf", "Ashmoun", "Quwaysna"],
  "Beheira": ["Damanhour", "Kafr El Dawar", "Rashid", "Kom Hamada"],
  "Ismailia": ["Ismailia City", "Fayed", "Qantara"],
  "Port Said": ["Port Said City", "Port Fouad"],
  "Suez": ["Suez City", "Ain Sokhna"],
  "Fayoum": ["Fayoum City", "Tamiya", "Senouris"],
  "Beni Suef": ["Beni Suef City", "Nasser", "Wasta"],
  "Minya": ["Minya City", "Malawi", "Maghagha"],
  "Assiut": ["Assiut City", "Dayrout", "Manfalut"],
  "Sohag": ["Sohag City", "Akhmim", "Tahta"],
  "Qena": ["Qena City", "Luxor", "Nag Hammadi"], // Often grouped for shipping
  "Red Sea": ["Hurghada", "Gouna", "Safaga", "Marsa Alam"],
  "Matrouh": ["Marsa Matrouh", "North Coast (Sahel)"],
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
              {Object.keys(egyptLocations).sort().map(gov => (
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