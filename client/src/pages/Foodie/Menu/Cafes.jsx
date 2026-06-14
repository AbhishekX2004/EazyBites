import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import VendorCard from "../Vendor/VendorCard";
import CategoryCard from "../Category/CategoryCard";
import Card from "../../../components/FoodItemCard/Card";
import { motion, AnimatePresence } from "framer-motion";
import "../Menu.css";

const Cafes = ({ vendorStatus, vendorTypes, categoryStatuses }) => {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [viewMode, setViewMode] = useState("cafes"); // "cafes", "categories", "food"
  const initialLoadCompleted = useRef(false);
  const categoriesMapRef = useRef(new Map());

  // Item animation variants
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  };

  // Loading animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const dotVariants = {
    hidden: { y: 0 },
    visible: {
      y: [0, -15, 0],
      transition: {
        repeat: Infinity,
        duration: 1,
      },
    },
  };

  // Fetch cafes
  const fetchCafes = async () => {
    setLoading(true);
    try {
      if (!vendorStatus || !vendorTypes) {
        setVendors([]);
        return;
      }

      // Filter to shop/cafe type and active vendors
      const cafeVendors = Object.entries(vendorTypes)
        .filter(([vendorId, vendorType]) => {
          return vendorType?.toLowerCase() === "shop" && vendorStatus[vendorId] === true;
        })
        .map(([vendorId]) => vendorId);

      setVendors(cafeVendors);
    } catch (error) {
      console.error("Error fetching cafes:", error);
      setVendors([]);
    } finally {
      setLoading(false);
      initialLoadCompleted.current = true;
    }
  };

  // Fetch categories for a specific cafe
  const fetchCategories = async () => {
    setLoading(true);
    try {
      if (!selectedVendorId || vendorStatus[selectedVendorId] !== true) {
        setCategories([]);
        return;
      }

      const categoriesRef = collection(db, `users/${selectedVendorId}/myMenu`);
      const categoriesSnapshot = await getDocs(categoriesRef);

      // Get category status for this vendor
      const vendorCategoryStatus = categoryStatuses?.[selectedVendorId] || {};

      // Store all categories for this vendor
      const allCategories = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        vendorId: selectedVendorId,
      }));

      categoriesMapRef.current.set(selectedVendorId, allCategories);

      // Filter to only active categories
      const activeCategories = allCategories.filter((category) => 
        vendorCategoryStatus[category.id] === true
      );

      setCategories(activeCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch food items for a specific category
  const fetchCategoryFoodItems = async () => {
    setLoading(true);
    try {
      if (!selectedVendorId || !selectedCategoryId || 
          vendorStatus[selectedVendorId] !== true || 
          categoryStatuses?.[selectedVendorId]?.[selectedCategoryId] !== true) {
        setFoodItems([]);
        return;
      }

      const categoryItemsRef = collection(
        db, 
        `users/${selectedVendorId}/myMenu/${selectedCategoryId}/categoryItems`
      );
      const categoryItemsSnapshot = await getDocs(categoryItemsRef);

      // Add the items to our collection
      const items = categoryItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        vendorId: selectedVendorId,
        categoryId: selectedCategoryId,
      }));

      setFoodItems(items);
    } catch (error) {
      console.error("Error fetching category food items:", error);
      setFoodItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (Object.keys(vendorStatus || {}).length > 0 && Object.keys(vendorTypes || {}).length > 0) {
      fetchCafes();
    }
  }, [vendorStatus, vendorTypes]);

  // Handle real-time updates for vendor status changes
  useEffect(() => {
    if (!initialLoadCompleted.current) return;

    if (viewMode === "categories" || viewMode === "food") {
      // If the selected vendor is no longer active, go back to cafes view
      if (selectedVendorId && vendorStatus[selectedVendorId] !== true) {
        setViewMode("cafes");
        setSelectedVendorId(null);
        setSelectedCategoryId(null);
      }
    } else {
      // Update cafes list when vendor status changes
      fetchCafes();
    }
  }, [vendorStatus, viewMode, selectedVendorId]);

  // Handle real-time updates for category status changes
  useEffect(() => {
    if (!initialLoadCompleted.current) return;

    if (viewMode === "food" && selectedVendorId && selectedCategoryId) {
      // If the selected category is no longer active, go back to categories view
      if (categoryStatuses?.[selectedVendorId]?.[selectedCategoryId] !== true) {
        setViewMode("categories");
        setSelectedCategoryId(null);
      }
    } else if (viewMode === "categories" && selectedVendorId) {
      // Update categories when status changes
      fetchCategories();
    }
  }, [categoryStatuses, viewMode, selectedVendorId, selectedCategoryId]);

  // Fetch categories when a vendor is selected
  useEffect(() => {
    if (viewMode === "categories" && selectedVendorId) {
      fetchCategories();
    }
  }, [selectedVendorId, viewMode]);

  // Fetch food items when a category is selected
  useEffect(() => {
    if (viewMode === "food" && selectedVendorId && selectedCategoryId) {
      fetchCategoryFoodItems();
    }
  }, [selectedCategoryId, viewMode]);

  // Handle vendor click
  const handleVendorClick = (vendorId) => {
    // Check if vendor is still active
    if (vendorStatus[vendorId] !== true) {
      console.log("This vendor is no longer active");
      return;
    }

    setSelectedVendorId(vendorId);
    setSelectedCategoryId(null);
    setViewMode("categories");
  };

  // Handle category click
  const handleCategoryClick = (vendorId, categoryId) => {
    // Check if vendor and category are still active
    if (vendorStatus[vendorId] !== true || categoryStatuses?.[vendorId]?.[categoryId] !== true) {
      console.log("This vendor or category is no longer active");
      return;
    }

    setSelectedCategoryId(categoryId);
    setViewMode("food");
  };

  // Handle back button
  const handleBack = () => {
    if (viewMode === "food") {
      setViewMode("categories");
      setSelectedCategoryId(null);
    } else if (viewMode === "categories") {
      setViewMode("cafes");
      setSelectedVendorId(null);
    }
  };

  // Get back button text
  const getBackButtonText = () => {
    if (viewMode === "categories") {
      return "Back to Cafes";
    } else if (viewMode === "food") {
      return "Back to Categories";
    }
    return null;
  };

  // Function to get item key for AnimatePresence
  const getItemKey = (item, index) => {
    if (viewMode === "cafes") {
      return item; // vendorId
    } else if (viewMode === "categories") {
      return `${item.vendorId}-${item.id}`;
    } else if (viewMode === "food") {
      return `${item.vendorId}-${item.categoryId}-${item.id}`;
    }
    return index;
  };

  return (
    <div className="Menu-container">
      {getBackButtonText() && (
        <button className="Menu-back-button" onClick={handleBack}>
          ← {getBackButtonText()}
        </button>
      )}

      <div className="Menu-grid">
        {loading ? (
          <motion.div className="Menu-loading" initial="hidden" animate="visible" variants={containerVariants}>
            <div className="loading-text">
              {viewMode === "cafes" 
                ? "Finding open cafes" 
                : viewMode === "categories" 
                  ? "Loading menu categories" 
                  : "Loading food items"}
            </div>
            <div className="loading-dots">
              <motion.span variants={dotVariants} className="dot">●</motion.span>
              <motion.span variants={dotVariants} className="dot">●</motion.span>
              <motion.span variants={dotVariants} className="dot">●</motion.span>
            </div>
          </motion.div>
        ) : viewMode === "cafes" && vendors.length > 0 ? (
          <AnimatePresence>
            {vendors.map((vendorId, index) => (
              <motion.div
                key={getItemKey(vendorId, index)}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <VendorCard vendorid={vendorId} onVendorClick={() => handleVendorClick(vendorId)} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : viewMode === "categories" && categories.length > 0 ? (
          <AnimatePresence>
            {categories.map((category, index) => (
              <motion.div
                key={getItemKey(category, index)}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <CategoryCard
                  vendorId={category.vendorId}
                  categoryId={category.id}
                  onCategoryClick={handleCategoryClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : viewMode === "food" && foodItems.length > 0 ? (
          <AnimatePresence>
            {foodItems.map((item, index) => (
              <motion.div
                key={getItemKey(item, index)}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <Card fid={item.id} />
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <motion.p 
            className="Menu-no-items" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5 }}
          >
            {viewMode === "cafes"
              ? "No cafes are open currently."
              : viewMode === "categories"
                ? "No menu categories available for this cafe."
                : "No food items available in this category."}
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Cafes;