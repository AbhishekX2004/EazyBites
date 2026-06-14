// HeroSection.jsx

import React from "react";
import { motion } from "framer-motion";
import FloatingImage from "../FloatingImage/FloatingImage";
import "./HeroSection.css";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {

  const navigate = useNavigate();

  const handleSignup = (type) => {
    navigate(`/signup?type=${type}`);
  };

  return (
    <section className="hero-container">
      {/* Left Side - Floating Images */}
      <div className="hero-left">
        <h1 className="hero-title">Crave. Order. Enjoy.</h1>
        <p className="hero-subtitle">Delicious food, just a bite away.</p>
        
        <div className="hero-images">
          <FloatingImage src="images/poha.jpg" alt="Food 1" id="floating-image-1"/>
          <FloatingImage src="images/momos.jpg" alt="Food 2" id="floating-image-2"/>
          <FloatingImage src="images/noodles.jpg" alt="Food 3" id="floating-image-3"/>
          <FloatingImage src="images/idli.jpg" alt="Food 4" id="floating-image-4"/>
          <FloatingImage src="images/dosa.jpg" alt="Food 5" id="floating-image-5"/>
        </div>

        <div className="hero-small-image">
          <img src="images/samosa-removebg-preview.png" alt="Food Icon" />
        </div>
      </div>

      {/* Right Side - Signup Section */}
      <motion.div
        className="hero-signup"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2>Get Started Today</h2>
        <button className="hero-button" onClick={() => handleSignup("Foodie")}>Signup as Foodie</button>
        <button className="hero-button" onClick={() => handleSignup("Food Seller")}>Signup as Food Seller</button>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="scroll-indicator"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        ↓ Scroll Down ↓
      </motion.div>
    </section>
  );
};

export default HeroSection;
