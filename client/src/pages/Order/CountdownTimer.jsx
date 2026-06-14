import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const CountdownTimer = ({ seconds, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, onComplete]);
  
  // Calculate the percentage for the circular progress
  const progress = 1 - (timeLeft / seconds);
  
  return (
    <div className="countdown-timer">
      <motion.svg
        className="timer-circle"
        viewBox="0 0 42 42"
      >
        <motion.circle
          cx="21"
          cy="21"
          r="20"
          stroke="#f44336"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray={`${Math.PI * 40} ${Math.PI * 40}`}
          strokeDashoffset={Math.PI * 40 * (1 - progress)}
          initial={{ strokeDashoffset: Math.PI * 40 }}
          animate={{ strokeDashoffset: Math.PI * 40 * (1 - progress) }}
          transition={{ duration: 1, ease: "linear" }}
          transform="rotate(-90 21 21)"
        />
      </motion.svg>
      {timeLeft}
    </div>
  );
};

export default CountdownTimer;