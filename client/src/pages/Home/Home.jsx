import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import ScrollIndicator from "../../components/ScrollIndicator/ScrollIndicator"; // Import the new component
import FloatingImages from "../../components/FloatingImage/FloatingImage";

const DancingSamosa = () => {
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);
  
  // Random movement function
  const randomMovement = () => {
    const animations = [
      // Flip
      {
        rotate: [0, -20, 20, -10, 10, 0],
        scale: [1, 1.1, 0.9, 1.05, 1],
        y: [0, -15, -5, -10, 0],
        transition: { duration: 1.5 }
      },
      // Bounce
      {
        y: [0, -30, 0, -15, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
        rotate: [-5, 5, -3, 3, 0],
        transition: { duration: 1.8 }
      },
      // Spin
      {
        rotate: [0, 180, 360],
        scale: [1, 1.2, 1],
        transition: { duration: 2 }
      },
      // Wiggle
      {
        x: [0, 10, -10, 8, -8, 0],
        rotate: [0, 10, -10, 5, -5, 0],
        transition: { duration: 1.3 }
      }
    ];
    
    // Select a random animation
    const randomIndex = Math.floor(Math.random() * animations.length);
    return animations[randomIndex];
  };
  
  // Periodic random animations
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        controls.start(randomMovement());
      }
    }, 4000); // Play animation every 4 seconds
    
    return () => clearInterval(interval);
  }, [controls, isHovered]);
  
  // Hover animation
  const handleHoverStart = () => {
    setIsHovered(true);
    controls.start({
      scale: 1.3,
      rotate: [0, -15, 15, -10, 10, 0],
      transition: { duration: 0.8 }
    });
  };
  
  const handleHoverEnd = () => {
    setIsHovered(false);
    controls.start({
      scale: 1,
      transition: { duration: 0.5 }
    });
  };
  
  return (
    <motion.div 
      className="Home-samosa-image"
      animate={controls}
      initial={{ rotate: -25, scale: 0.8, opacity: 0 }}
      whileInView={{ opacity: 1 }}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        zIndex: 10,
        cursor: "pointer"
      }}
    >
      <img src="images/samosa-removebg-preview.png" alt="Samosa Mascot" />
    </motion.div>
  );
};

const Home = ({ scrollRef }) => {
  const navigate = useNavigate();
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonialIndex((prevIndex) =>
        prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  const handleSignup = (type) => {
    navigate(`/signup?type=${type}`);
  };

  const handleScrollDown = () => {
    if (scrollRef && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      window.dispatchEvent(new CustomEvent("scrollToMenu"));
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="Home-hero-section">
        {/* Left Side - Content and Floating Images */}
        <div className="Home-hero-left">
          <motion.h1 
            className="Home-hero-title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Crave. Order. Enjoy.
          </motion.h1>
          
          <motion.p 
            className="Home-hero-subtitle"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Delicious food, just a bite away.
          </motion.p>
          <FloatingImages/>
        </div>

        {/* Right Side - Signup Section */}
        <motion.div
          className="Home-hero-signup"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2>Get Started Today</h2>
          <button 
            className="Home-hero-button" 
            onClick={() => handleSignup("Foodie")}
          >
            Signup as Foodie
          </button>
          <button 
            className="Home-hero-button" 
            onClick={() => handleSignup("Food Seller")}
          >
            Signup as Food Seller
          </button>
        </motion.div>

        {/* New ScrollIndicator Component */}
        <ScrollIndicator onClick={handleScrollDown} />

        <DancingSamosa />
      </section>

      {/* Testimonials Section */}
      <section className="Home-testimonials-section">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="Home-testimonials-title"
        >
          Our Testimonials
        </motion.h2>

        <div className="Home-testimonials-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTestimonialIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="Home-testimonials-card"
            >
              <div className="Home-testimonials-content">
                <motion.div
                  className="Home-testimonials-image-container"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <img
                    src={testimonials[currentTestimonialIndex].image}
                    alt={testimonials[currentTestimonialIndex].name}
                    className="Home-testimonials-image"
                  />
                </motion.div>

                <div className="Home-testimonials-text-content">
                  <motion.h3
                    className="Home-testimonials-name"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {testimonials[currentTestimonialIndex].name}
                  </motion.h3>

                  <motion.p
                    className="Home-testimonials-description"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {testimonials[currentTestimonialIndex].description}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="Home-testimonials-indicators">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonialIndex(index)}
                className={`Home-testimonials-indicator-dot ${
                  index === currentTestimonialIndex ? 'Home-active' : ''
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;