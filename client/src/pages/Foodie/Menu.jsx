import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../firebaseConfig";
import Food from "./Menu/Food";
import Stalls from "./Menu/Stalls";
import Cafes from "./Menu/Cafes";
import axios from "axios";
import "./Menu.css";

// API
const API = process.env.REACT_APP_API;

const Menu = () => {
  const [activeView, setActiveView] = useState("food"); // "food", "stalls", "cafes"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [vendorStatus, setVendorStatus] = useState({});
  const [categoryStatuses, setCategoryStatuses] = useState({});
  const [vendorTypes, setVendorTypes] = useState({});

  // Debounce function to limit API calls
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Debounced search function
  const debouncedSearch = React.useCallback(
    debounce((query) => {
      if (query.trim().length > 0) {
        fetchSearchResults(query);
      } else {
        setSearchResults(null);
      }
    }, 300),
    []
  );

  // Function to fetch search results from API using Axios
  const fetchSearchResults = async (query) => {
    setSearchLoading(true);
    try {
      const response = await axios.get(`${API}/search`, {
        params: { q: query },
        headers: {
          "Content-Type": "application/json",
        },
      });

      setSearchResults(response.data.results);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Set up real-time listeners for vendor types
  useEffect(() => {
    const vendorTypeRef = ref(database, "vendorType");

    const vendorTypeListener = onValue(vendorTypeRef, (snapshot) => {
      const types = snapshot.val() || {};
      setVendorTypes(types);
    });

    return () => {
      vendorTypeListener();
    };
  }, []);

  // Set up real-time listeners for vendor status
  useEffect(() => {
    const vendorStatusRef = ref(database, "vendorStatus");

    const vendorStatusListener = onValue(vendorStatusRef, (snapshot) => {
      const newStatus = snapshot.val() || {};
      setVendorStatus(newStatus);
    });

    return () => {
      vendorStatusListener();
    };
  }, []);

  // Listen for all category status changes globally
  useEffect(() => {
    const categoryStatusRef = ref(database, "categoryStatus");

    const categoryStatusListener = onValue(categoryStatusRef, (snapshot) => {
      const newStatuses = snapshot.val() || {};
      setCategoryStatuses(newStatuses);
    });

    return () => {
      categoryStatusListener();
    };
  }, []);

  // View toggle handlers
  const showAllFood = () => {
    setSearchQuery("");
    setSearchResults(null);
    setActiveView("food");
  };

  const showStalls = () => {
    setSearchQuery("");
    setSearchResults(null);
    setActiveView("stalls");
  };

  const showCafes = () => {
    setSearchQuery("");
    setSearchResults(null);
    setActiveView("cafes");
  };

  const isSearchMode = searchQuery.trim().length > 0;

  const renderActiveView = () => {
    // If in search mode, always render the search results
    if (isSearchMode) {
      return (
        <Food 
          searchResults={searchResults} 
          searchLoading={searchLoading} 
          isSearchMode={true} 
        />
      );
    }

    // Otherwise render the selected view
    switch (activeView) {
      case "food":
        return (
          <Food 
            vendorStatus={vendorStatus} 
            categoryStatuses={categoryStatuses} 
            isSearchMode={false} 
          />
        );
      case "stalls":
        return (
          <Stalls 
            vendorStatus={vendorStatus} 
            vendorTypes={vendorTypes} 
          />
        );
      case "cafes":
        return (
          <Cafes 
            vendorStatus={vendorStatus} 
            vendorTypes={vendorTypes} 
            categoryStatuses={categoryStatuses} 
          />
        );
      default:
        return <Food vendorStatus={vendorStatus} categoryStatuses={categoryStatuses} />;
    }
  };

  return (
    <div className="Menu-container">
      <h1 className="Menu-heading">What's Craving?</h1>

      <div className="Menu-search-nav">
        <div className="Menu-search">
          <input
            type="text"
            placeholder="Search food items..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="Menu-search-input"
          />
        </div>

        {!isSearchMode && (
          <div className="Menu-nav-buttons">
            <button
              className={`Menu-nav-button ${activeView === "food" ? "active" : ""}`}
              onClick={showAllFood}
            >
              All Food
            </button>
            <button 
              className={`Menu-nav-button ${activeView === "stalls" ? "active" : ""}`} 
              onClick={showStalls}
            >
              Stalls
            </button>
            <button 
              className={`Menu-nav-button ${activeView === "cafes" ? "active" : ""}`} 
              onClick={showCafes}
            >
              Cafes
            </button>
          </div>
        )}
      </div>

      {renderActiveView()}
    </div>
  );
};

export default Menu;