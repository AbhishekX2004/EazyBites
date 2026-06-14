import React from 'react';
import { motion } from 'framer-motion';
import "./CategoryCard.css";

const CategoryCard = ({ category, onEdit, onDelete, onClick }) => {    
    return (
        <motion.div
            className="CategoryCard-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
        >
            <div className="CategoryCard-image-container">
                <img 
                    src={category.photoURL} 
                    alt={category.categoryName} 
                    className="CategoryCard-image" 
                    onError={(e) => {
                        e.target.src = '/api/placeholder/400/200';
                    }}
                />
            </div>
            <div className="CategoryCard-content">
                <h3 className="CategoryCard-name">{category.categoryName}</h3>
                <div className="CategoryCard-status">
                    <span 
                        className={`CategoryCard-visibility ${category.visibility ? 'CategoryCard-visible' : 'CategoryCard-hidden'}`}
                    >
                        {category.visibility ? 'Visible' : 'Hidden'}
                    </span>
                </div>
                <div className="CategoryCard-actions">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(category);
                        }} 
                        className="CategoryCard-edit-btn"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(category.id);
                        }} 
                        className="CategoryCard-delete-btn"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default CategoryCard;