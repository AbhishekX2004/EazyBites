import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./TC.css";

const TermsAndConditions = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key !== "default") {
      navigate(-1); // Go back if navigated from another page
    } else {
      navigate("/"); // Go to home if opened directly in a new tab
    }
  };

  // Animation variants - updated to match PrivacyPolicy
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  return (
    <motion.div 
      className="TC-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h1 
        className="TC-heading"
        variants={itemVariants}
      >
        Terms and Conditions
      </motion.h1>
      
      <motion.div 
        className="TC-terms-box"
        variants={itemVariants}
      >
        <motion.p 
          className="TC-paragraph"
          variants={itemVariants}
        >
          Welcome to EazyBites! Before using our platform, please read the terms carefully.
        </motion.p>

        {[1, 2, 3, 4, 5, 6].map((section) => (
          <motion.div key={section} variants={itemVariants}>
            <h3 className="TC-subheading">
              {section}. {getSectionTitle(section)}
            </h3>
            <p className="TC-paragraph">
              {getSectionContent(section)}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <motion.button 
        id="TC-back-btn" 
        onClick={handleBack} 
        className="TC-button"
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {location.key !== "default" ? "Back" : "Home"}
      </motion.button>
    </motion.div>
  );
};

const getSectionTitle = (section) => {
  const titles = {
    1: "Introduction",
    2: "User Responsibilities",
    3: "Ordering and Payment",
    4: "Privacy & Security",
    5: "Liability",
    6: "Changes to Terms"
  };
  return titles[section];
};

const getSectionContent = (section) => {
  const content = {
    1: "These Terms govern your use of EazyBites, an online food ordering service.",
    2: "Users must provide accurate information and comply with platform rules.",
    3: "Orders are subject to availability. Payments must be made at pickup.",
    4: "We use Firebase for authentication and data security.",
    5: "We are not responsible for food quality or delays.",
    6: "We reserve the right to update these terms at any time."
  };
  return content[section];
};

export default TermsAndConditions;