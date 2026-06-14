import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Card.css';

// API
const API = process.env.REACT_APP_API;

const Card = ({ fid }) => {
  const navigate = useNavigate();
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const fetchItemData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/food/foodItem/${fid}`);
        setItemData(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching item data:', error);
        setError('Could not load item data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchItemData();
  }, [fid]);

  const handleOrderNow = () => {
    navigate(`/order?fid=${fid}`);
  };

  if (loading) {
    return (
      <div className="Card-container Card-loading">
        <motion.div className="Card-loader-container">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="Card-loader-dot"
              initial={{ y: 0 }}
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "loop",
                delay: index * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </div>
    );
  }
  
  if (error || !itemData) {
    return <div className="Card-container Card-error">{error || 'Error loading item'}</div>;
  }
  
  const { name, description, price, rating, photoURLs, stallName } = itemData;
  const roundedRating = rating ? rating.toFixed(2) : "N/A";
  
  return (
    <motion.div 
      className="Card-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div 
        className="Card-image-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {photoURLs && photoURLs.length > 0 && (
          <>
            <motion.img 
              src={photoURLs[0]} 
              alt={name}
              className="Card-image"
              initial={{ opacity: 1 }}
              animate={{ opacity: isHovered && photoURLs.length > 1 ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            />
            {photoURLs.length > 1 && (
              <motion.img 
                src={photoURLs[1]} 
                alt={`${name} - alternate view`}
                className="Card-image Card-image-hover"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </>
        )}
      </div>
      <div className="Card-content">
        <div className="Card-header">
          <motion.h3 
            className="Card-name"
            whileHover={{ scale: 1.03 }}
          >
            {name}
          </motion.h3>
          <div className="Card-rating">
            <span>Rating: {roundedRating}</span>
          </div>
        </div>
        <div className="Card-stall">
          <p>Stall: {stallName}</p>
        </div>
        {/* <p className="Card-description">{description}</p> */}
        <div className="Card-price-order">
          <p className="Card-price">₹{parseFloat(price).toFixed(2)}</p>
          <motion.button 
            className="Card-order-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOrderNow}
          >
            Order Now
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Card;
