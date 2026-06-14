import React from 'react';
import { motion } from 'framer-motion';
import './ScrollIndicator.css';

const ScrollIndicator = ({ onClick }) => {
  return (
    <motion.div
      className="scroll-indicator"
      onClick={onClick}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8 }}
    >
      {/* <div className="scroll-text">Scroll Down</div> */}
      <motion.div 
        className="scroll-icon-container"
        animate={{ y: [0, 8, 0] }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.8, 
          ease: "easeInOut"
        }}
      >
        <motion.div 
          className="scroll-circle"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <motion.div 
            className="scroll-arrow"
            animate={{ y: [0, 4, 0] }}
            transition={{ 
              repeat: Infinity, 
              duration: 1.8, 
              ease: "easeInOut",
              delay: 0.1
            }}
          >
            ↓
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ScrollIndicator;