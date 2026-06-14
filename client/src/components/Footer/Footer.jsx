import React from "react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer id="footer-container">
      <div className="footer-content">
        <p className="footer-text">&copy; {new Date().getFullYear()} EazyBites. All rights reserved.</p>
        <ul className="footer-links">
          {/* <li><a href="/about" className="footer-link">About</a></li> */}
          <li><a href="/terms-and-conditions" className="footer-link">Terms and Conditions</a></li>
          <li><a href="/privacy-policy" className="footer-link">Privacy Policy</a></li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;