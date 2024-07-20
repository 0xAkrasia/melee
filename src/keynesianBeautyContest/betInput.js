import React from "react";
import "../css/betInput.css"; // Ensure the CSS file exists and is imported
import "@fortawesome/fontawesome-free/css/all.min.css"; // Import Font Awesome CSS

const BetInput = ({ value, onValueChange, maxValue, onMaxClick }) => {
  return (
    <div className="bet-input-wrapper">
      <div className="bet-input-container">
        <div className="bet-input-icon">
          <i className="fab fa-ethereum"></i> {/* Ethereum icon */}
        </div>
        <input
          type="text"
          className="bet-input"
          value={value}
          onChange={onValueChange}
        />
        <div className="bet-input-max">
          <span>{maxValue}</span>
          <button className="max-button" onClick={onMaxClick}>Max</button>
        </div>
      </div>
    </div>
  );
};

export default BetInput;