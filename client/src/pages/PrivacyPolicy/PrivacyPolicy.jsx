//PrivacyPolicy.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./PrivacyPolicy.css";

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleBack = () => {
        if (location.key !== "default") {
            navigate(-1); // Go back if navigated from another page
        } else {
            navigate("/"); // Go to home if opened directly in a new tab
        }
    };

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
            className="PP-container"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.h1 
                className="PP-heading"
                variants={itemVariants}
            >
                Privacy Policy
            </motion.h1>
            
            <motion.div 
                className="PP-terms-box"
                variants={itemVariants}
            >
                <motion.p 
                    className="PP-paragraph"
                    variants={itemVariants}
                >
                    At EazyBites, we are committed to protecting your privacy. This policy outlines how we collect, use, and safeguard your information.
                </motion.p>

                {[1, 2, 3, 4, 5, 6, 7].map((section) => (
                    <motion.div key={section} variants={itemVariants}>
                        <h3 className="PP-subheading">
                            {section}. {getSectionTitle(section)}
                        </h3>
                        <p className="PP-paragraph">
                            {getSectionContent(section)}
                        </p>
                    </motion.div>
                ))}
            </motion.div>

            <motion.button 
                id="PP-back-btn"
                onClick={handleBack}
                className="PP-button"
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                Back
            </motion.button>
        </motion.div>
    );
};

const getSectionTitle = (section) => {
    const titles = {
        1: "Information We Collect",
        2: "How We Use Information",
        3: "Data Security",
        4: "Sharing of Information",
        5: "Cookies",
        6: "Changes to This Policy",
        7: "Contact Us"
    };
    return titles[section];
};

const getSectionContent = (section) => {
    const content = {
        1: "We may collect your name, email, phone number, and other necessary details for registration and order processing.",
        2: "Your information is used to improve our services, provide customer support, and process orders efficiently.",
        3: "We implement industry-standard security measures like Firebase Authentication to protect your data.",
        4: "Your data will never be sold. We only share information with trusted service providers for essential operations.",
        5: "We use cookies to improve your browsing experience. You can modify cookie settings in your browser.",
        6: "We may update this policy to reflect improvements or legal changes. Please check this page periodically.",
        7: "For privacy-related concerns, please reach out to our support team via the EazyBites app or website."
    };
    return content[section];
};

export default PrivacyPolicy;