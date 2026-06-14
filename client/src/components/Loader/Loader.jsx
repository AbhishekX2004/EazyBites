import React from 'react';
import { motion } from 'framer-motion';
import "./Loader.css";

const Loader = () => (
    <div className="spinner-container">
        <motion.div
            className="spinner-dot"
            animate={{
                scale: [1, 1.5, 1],
                rotate: [0, 360],
                borderRadius: ["50%", "25%", "50%"]
            }}
            transition={{
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
            }}
        />
        <motion.div
            className="spinner-ring"
            animate={{ rotate: 360 }}
            transition={{
                duration: 1.5,
                ease: "linear",
                repeat: Infinity
            }}
        />
    </div>
)

export default Loader;