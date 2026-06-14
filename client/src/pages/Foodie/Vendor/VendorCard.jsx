import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./VendorCard.css";

// API
const API = process.env.REACT_APP_API;

const VendorCard = ({ vendorid, onVendorClick }) => {
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const response = await fetch(`${API}/users/${vendorid}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setVendorData(data);
      } catch (error) {
        console.error("Error fetching vendor data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorid) {
      fetchVendorData();
    }
  }, [vendorid, API]);

  const nextPhoto = (e) => {
    e.stopPropagation(); // Prevent card click event
    if (vendorData?.stallPhotos?.length > 0) {
      setCurrentPhotoIndex((prevIndex) => 
        prevIndex === vendorData.stallPhotos.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const prevPhoto = (e) => {
    e.stopPropagation(); // Prevent card click event
    if (vendorData?.stallPhotos?.length > 0) {
      setCurrentPhotoIndex((prevIndex) => 
        prevIndex === 0 ? vendorData.stallPhotos.length - 1 : prevIndex - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="vendor-card vendor-card-loading">
        <div className="vendor-card-loading-animation"></div>
      </div>
    );
  }

  if (!vendorData) {
    return null;
  }

  return (
    <motion.div 
      className="vendor-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => onVendorClick(vendorid, vendorData)}
    >
      <div className="vendor-card-image-carousel">
        {vendorData.stallPhotos && vendorData.stallPhotos.length > 0 ? (
          <>
            <div className="vendor-card-carousel-container">
              <motion.img 
                key={currentPhotoIndex}
                src={vendorData.stallPhotos[currentPhotoIndex]} 
                alt={vendorData.stallName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              
              {vendorData.stallPhotos.length > 1 && (
                <>
                  <button 
                    className="vendor-card-carousel-btn prev-btn" 
                    onClick={prevPhoto}
                  >
                    &lt;
                  </button>
                  <button 
                    className="vendor-card-carousel-btn next-btn" 
                    onClick={nextPhoto}
                  >
                    &gt;
                  </button>
                  <div className="vendor-card-carousel-dots">
                    {vendorData.stallPhotos.map((_, index) => (
                      <span 
                        key={index} 
                        className={`vendor-card-carousel-dot ${index === currentPhotoIndex ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex(index);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="vendor-card-placeholder-image">
            {vendorData.stallName ? vendorData.stallName.charAt(0).toUpperCase() : "V"}
          </div>
        )}
      </div>

      <div className="vendor-card-content">
        <h3 className="vendor-card-name">{vendorData.stallName || "Unnamed Vendor"}</h3>
        <p className="vendor-card-description">{vendorData.stallDescription || "No description available"}</p>
        {vendorData.landMark && (
          <p className="vendor-card-landmark"><small>Near: {vendorData.landMark}</small></p>
        )}
      </div>
    </motion.div>
  );
};

export default VendorCard;