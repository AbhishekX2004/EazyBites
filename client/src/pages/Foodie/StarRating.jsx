import { motion } from 'framer-motion';
import { useState } from 'react';
import axios from 'axios';

//API
const API = process.env.REACT_APP_API;

const StarRating = ({ initialRating = 0, onRatingChange, readOnly = false }) => {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  
  const handleClick = (value) => {
    if (!readOnly) {
      setRating(value);
      if (onRatingChange) onRatingChange(value);
    }
  };
  
  return (
    <div className="StarRating-container">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.div
          key={star}
          className="StarRating-star"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleClick(star)}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill={star <= (hoverRating || rating) ? "#FFD700" : "none"} 
            stroke="#FFD700" 
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </motion.div>
      ))}
      {!readOnly && (
        <div className="StarRating-value">{rating.toFixed(1)}</div>
      )}
    </div>
  );
};

// Modal component for rating
const RatingModal = ({ order, onClose, onRatingSubmit }) => {
  console.log(order);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };
  
  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setSubmitting(true);
    
    try {
        // Call API to submit rating
        const response = await axios.post(`${API}/orders/rate/${order.uid}/${order.id}`, {
          rating,
          fid: order.fid,
          userOrderId: order.userOrderId || null,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.status !== 200) {
          throw new Error('Failed to submit rating');
        }
        
        onRatingSubmit(rating);
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setSubmitting(false);
      onClose();
    }
  };
  
  return (
    <motion.div 
      className="RatingModal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="RatingModal-content"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
      >
        <h3>Rate Your Order</h3>
        <p>How was your {order.foodItem || "order"}?</p>
        
        <div className="RatingModal-stars">
          <StarRating 
            initialRating={rating} 
            onRatingChange={handleRatingChange} 
          />
        </div>
        
        <div className="RatingModal-actions">
          <button 
            className="RatingModal-cancel" 
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            className="RatingModal-submit" 
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? 'Submitting...' : 'Rate Now'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export { StarRating, RatingModal };