import React from 'react';
import Navbar from '../components/Navbar';
import candle from "../assets/candle.png"
import "../styles/create.css"

const Create = () => {
  return (
    <div className="home-container">
      <Navbar />
      <h1>Create Your Own Page</h1>
      <div className='creation'>

        <div className='candle-div'>
        <img className="candle-preview" src={candle}></img>
      </div>
      <div className='choices'> 

        <div className='selections'>
        <select className='cup'>
          <option value="default">Choose Your Cup</option>
        </select>

        <select className='scents'>
          <option value="default">Select a Scent</option>
        </select>



        <select className='color'>
          <option value="default">Choose The Color</option>
        </select>        
        <button className='confirm'>Confirm Candle</button>

                </div>

  

</div>
    </div>
    </div>
  );
};

export default Create;