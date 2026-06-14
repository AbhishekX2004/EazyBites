import React, { useState } from "react";
import { motion } from "framer-motion";

const WaitTimeModal = ({ onClose, onConfirm }) => {
  const [waitTime, setWaitTime] = useState("10");
  const [customWaitTime, setCustomWaitTime] = useState("");

  const waitTimeOptions = [
    { value: "5", label: "5 min" },
    { value: "10", label: "10 min" },
    { value: "15", label: "15 min" },
    { value: "20", label: "20 min" },
    { value: "30", label: "30 min" },
    { value: "custom", label: "Custom" }
  ];

  const handleCustomWaitTimeChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomWaitTime(value);
  };

  const handleConfirm = () => {
    const finalWaitTime = waitTime === "custom" ? customWaitTime : waitTime;
    onConfirm(finalWaitTime);
  };

  return (
    <div className="modal-overlay">
      <motion.div 
        className="modal-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <h3>Set Wait Time</h3>
        <div className="wait-time-options">
          {waitTimeOptions.map(option => (
            <button 
              key={option.value}
              className={`wait-time-btn ${waitTime === option.value ? 'selected' : ''}`}
              onClick={() => setWaitTime(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {waitTime === "custom" && (
          <div className="custom-wait-time">
            <input
              type="text"
              value={customWaitTime}
              onChange={handleCustomWaitTimeChange}
              placeholder="Enter minutes"
              maxLength={3}
            />
          </div>
        )}
        
        <div className="modal-actions">
          <button 
            className="modal-btn cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="modal-btn confirm-btn"
            onClick={handleConfirm}
            disabled={waitTime === "custom" && !customWaitTime}
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default WaitTimeModal;