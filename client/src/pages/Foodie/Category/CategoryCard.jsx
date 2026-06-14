import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./CategoryCard.css";

// API
const API = process.env.REACT_APP_API;

const CategoryCard = ({ vendorId, categoryId, onCategoryClick }) => {
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        const response = await fetch(`${API}/categories/${vendorId}/${categoryId}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        setCategoryData(data);
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [API, vendorId, categoryId]);

  if (loading) {
    return (
      <div className="category-card category-card-loading">
        <div className="category-card-loading-animation"></div>
      </div>
    );
  }

  if (!categoryData) {
    return null;
  }

  return (
    <motion.div 
      className="category-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => onCategoryClick(vendorId, categoryId, categoryData)}
    >
      <div className="category-card-image">
        {categoryData.photoURL ? (
          <img src={categoryData.photoURL} alt={categoryData.categoryName} />
        ) : (
          <div className="category-card-placeholder-image">
            {categoryData.categoryName ? categoryData.categoryName.charAt(0).toUpperCase() : "C"}
          </div>
        )}
      </div>
      <div className="category-card-content">
        <h3 className="category-card-name">{categoryData.categoryName || "Unnamed Category"}</h3>
      </div>
    </motion.div>
  );
};

export default CategoryCard;