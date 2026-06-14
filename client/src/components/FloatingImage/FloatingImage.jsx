import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./FloatingImage.css";

const FloatingImages = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  const foodImages = [
    { 
      id: 1, 
      src: "images/poha.jpg", 
      alt: "Poha",
      desktopPosition: { top: "15%", left: "8%" },
      animationDelay: 0
    },
    { 
      id: 2, 
      src: "images/momos.jpg", 
      alt: "Momos",
      desktopPosition: { top: "28%", left: "36%" },
      animationDelay: 1.5
    },
    { 
      id: 3, 
      src: "images/noodles.jpg", 
      alt: "Noodles",
      desktopPosition: { top: "64%", left: "15%" },
      animationDelay: 3
    },
    { 
      id: 4, 
      src: "images/idli.jpg", 
      alt: "Idli",
      desktopPosition: { top: "15%", left: "65%" },
      animationDelay: 2
    },
    { 
      id: 5, 
      src: "images/dosa.jpg", 
      alt: "Dosa",
      desktopPosition: { top: "64%", left: "55%" },
      animationDelay: 0.5
    },
  ];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get the style for desktop positioning
  const getDesktopPositionStyle = (image) => {
    if (windowWidth >= 768) {
      return image.desktopPosition;
    }
    return {};
  };

  return (
    <div className="floating-images-container">
      {foodImages.map((image) => (
        <motion.div
          key={image.id}
          className="floating-image"
          style={getDesktopPositionStyle(image)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            transition: { 
              duration: 0.8,
              delay: image.animationDelay * 0.1
            }
          }}
          whileInView={{
            y: [0, -15, 0],
            rotate: [0, 2, 0, -2, 0],
            transition: {
              y: {
                duration: 3 + image.animationDelay * 0.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              },
              rotate: {
                duration: 5 + image.animationDelay * 0.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop" 
              }
            }
          }}
          whileHover={{ 
            scale: 1.15,
            rotate: [0, 5, -5, 0],
            transition: { 
              duration: 0.6,
              rotate: {
                duration: 0.8
              }
            } 
          }}
        >
          <img src={image.src} alt={image.alt} className="floating-image-item" />
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingImages;
