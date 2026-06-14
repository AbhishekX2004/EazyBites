import React from "react";
import { useNavigate } from "react-router-dom";
import "./Unauthorized.css";

const UnauthorizedPage = ({
  title = "Not Authorized",
  message = "You don't have permission to access this page.",
  returnPath = "/",
  returnText = "Go to Home"
}) => {
  const navigate = useNavigate();

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h1 className="unauthorized-title">{title}</h1>
      <p className="unauthorized-message">{message}</p>
      <button
        className="unauthorized-button"
        onClick={() => navigate(returnPath)}
      >
        {returnText}
      </button>
    </div>
  );
};

export default UnauthorizedPage;