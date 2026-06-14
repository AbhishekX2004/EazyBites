// Testimonials.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import "./Testimonials.css"

const testimonials = [
    {
        id: 1,
        name: "Aman",
        description: "The service exceeded my expectations. The team was incredibly professional and delivered outstanding results.",
        image: "/images/stalls/stall1.jpg"
    },
    {
        id: 2,
        name: "Uday",
        description: "I'm amazed by the quality and attention to detail. Would definitely recommend to anyone looking for excellence.",
        image: "/images/stalls/stall2.jpg"
    },
    {
        id: 3,
        name: "Amar",
        description: "Working with this team has been a game-changer for our business. Their expertise is unmatched.",
        image: "/images/stalls/stall3.jpg"
    }
];

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prevIndex) =>
                prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
            );
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="testimonials-container">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="about-us-title"
            >
                Testimonials
            </motion.h1>
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="testimonials-card"
                >
                    <div className="testimonials-content">
                        <motion.div
                            className="testimonials-image-container"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <img
                                src={testimonials[currentIndex].image}
                                alt={testimonials[currentIndex].name}
                                className="testimonials-image"
                            />
                        </motion.div>

                        <div className="testimonials-text-content">
                            <motion.h3
                                className="testimonials-name"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {testimonials[currentIndex].name}
                            </motion.h3>

                            <motion.p
                                className="testimonials-description"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {testimonials[currentIndex].description}
                            </motion.p>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="testimonials-indicators">
                {testimonials.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`testimonials-indicator-dot ${index === currentIndex ? 'active' : ''
                            }`}
                        aria-label={`Go to testimonial ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default Testimonials;