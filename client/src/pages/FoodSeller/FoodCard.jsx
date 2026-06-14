import React from 'react';
import { motion } from 'framer-motion';

const FoodCard = ({ item, onEdit, onDelete }) => {
    return (
        <motion.div
            className="MyMenu-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: 1.02 }}
        >
            <img src={item.photoURLs} alt={item.name} className="MyMenu-card-image" />
            <div className="MyMenu-card-content">
                <div className="MyMenu-card-header">
                    <h3>{item.name}</h3>
                    <p className="MyMenu-price">₹{item.price}</p>
                </div>
                <div className="MyMenu-rating">
                    Rating: {item.rating}/5
                </div>
                <div className="MyMenu-card-actions">
                    <button onClick={() => onEdit(item)} className="MyMenu-edit-btn">Edit</button>
                    <button onClick={() => onDelete(item.id)} className="MyMenu-delete-btn">Delete</button>
                </div>
            </div>
        </motion.div>
    );
};

export default FoodCard;