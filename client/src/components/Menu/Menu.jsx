import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Card from "../FoodItemCard/Card";
import "./Menu.css";

const API = process.env.REACT_APP_API;

const Menu = React.forwardRef((props, ref) => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [centerIndex, setCenterIndex] = useState(0);
  
  useEffect(() => {
    const fetchFoodItems = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API}/food/foodItems`);
        if (!response.ok) {
          throw new Error("Failed to fetch food items");
        }
        const data = await response.json();
        setFoodItems(data.foodItems);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFoodItems();
  }, []);
  
  const handleNext = () => {
    setCenterIndex((prevIndex) => 
      prevIndex + 1 >= foodItems.length ? 0 : prevIndex + 1
    );
  };
  
  const handlePrev = () => {
    setCenterIndex((prevIndex) => 
      prevIndex - 1 < 0 ? foodItems.length - 1 : prevIndex - 1
    );
  };
  
  const getPositionStyles = (index) => {
    // Calculate offset relative to the center index
    const totalItems = foodItems.length;
    if (totalItems <= 1) return { 
      x: 0,
      scale: 1.2, 
      zIndex: 10,
      opacity: 1
    };
    
    let offset = index - centerIndex;
    
    // Wrap around
    if (offset > totalItems / 2) offset -= totalItems;
    if (offset < -totalItems / 2) offset += totalItems;
    
    // Limit visible cards
    const maxVisibleOffset = 2;
    if (Math.abs(offset) > maxVisibleOffset) {
      return {
        x: offset > 0 ? 500 : -500, // Push far off-screen
        opacity: 0,
        scale: 0.5,
        zIndex: 0
      };
    }
    
    // Calculate horizontal position (x) with increased spacing
    const xOffset = offset * 280; // Wider spacing between cards
    
    // Calculate z-index (center items in front)
    const zIndex = 10 - Math.abs(offset);
    
    // Calculate opacity
    const opacity = 1 - Math.abs(offset) * 0.2;
    
    // Calculate scale - center card bigger, others progressively smaller
    const scale = 1 - Math.abs(offset) * 0.15;
    
    return {
      x: xOffset,
      scale,
      zIndex,
      opacity,
      rotateY: offset * 15 // Slight rotation for 3D effect
    };
  };
  
  const handleCardClick = (index) => {
    if (index === centerIndex) {
      // If center card is clicked, go to menu page
      window.location.href = "/menu";
    } else {
      // If other card is clicked, make it the center card
      setCenterIndex(index);
    }
  };
  
  return (
    <section className="Menu-section">
      <div className="Menu-container" id="Menu" ref={ref}>
        <h2 className="Menu-title">Our Menu</h2>
        
        {loading ? (
          <div className="Menu-loader">
            <div className="Menu-loader-spinner"></div>
            <p>Loading delicious items...</p>
          </div>
        ) : error ? (
          <div className="Menu-error">
            <p>Oops! {error}</p>
            <button className="Menu-retry-button" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        ) : (
          <div className="Menu-content">
            <button className="Menu-arrow Menu-arrow-left" onClick={handlePrev}>
              <span>❮</span>
            </button>
            
            <div className="Menu-carousel-container">
              <div className="Menu-carousel">
                {foodItems.map((fid, index) => (
                  <motion.div
                    key={fid}
                    className={`Menu-card-wrapper ${index === centerIndex ? 'Menu-card-center' : ''}`}
                    style={{ transformPerspective: 1000 }}
                    animate={getPositionStyles(index)}
                    initial={getPositionStyles(index)}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25
                    }}
                    onClick={() => handleCardClick(index)}
                  >
                    <div className="Menu-card-container">
                      <Card fid={fid} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <button className="Menu-arrow Menu-arrow-right" onClick={handleNext}>
              <span>❯</span>
            </button>
          </div>
        )}
        
        {!loading && !error && foodItems.length > 0 && (
          <motion.div 
            className="Menu-view-all-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.a 
              href="/menu"
              className="Menu-view-all-button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Full Menu
            </motion.a>
          </motion.div>
        )}
      </div>
    </section>
  );
});

export default Menu;