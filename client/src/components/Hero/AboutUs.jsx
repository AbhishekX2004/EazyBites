import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import TeamCard from './TeamCard';
import './AboutUs.css';

const AboutUs = forwardRef((props, ref) => {
  const teamMembers = [
    {
      name: "Abhishek Verma",
      email: "abhishek@example.com",
      details: "Lorem ipsum dolor sit amet, consectetur",
      image: "/images/Team/AbhishekVerma.jpg",
      linkedin: "#",
      instagram: "#",
      twitter: "#"
    },
    {
      name: "Anjali Mayda",
      email: "anjali@example.com",
      details: "Lorem ipsum dolor sit amet, consectetur",
      image: "/images/Team/AnjaliMayda.jpeg",
      linkedin: "#",
      instagram: "#",
      twitter: "#"
    },
    {
      name: "Akshay Kumar Joshi",
      email: "akshay@example.com",
      details: "Lorem ipsum dolor sit amet, consectetur",
      image: "/images/Team/AkshayKumarJoshi.jpg",
      linkedin: "#",
      instagram: "#",
      twitter: "#"
    }
  ];

  return (
    <div className="about-us-container" ref={ref} id="about-us-section" >
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="about-us-title"
      >
        About Us
      </motion.h1>
      <div className="team-grid">
        {teamMembers.map((member, index) => (
          <TeamCard 
            key={index}
            member={member}
            custom={index}
          />
        ))}
      </div>
    </div>
  );
});

export default AboutUs;