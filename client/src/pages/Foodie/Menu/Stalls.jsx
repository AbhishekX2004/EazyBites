import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import VendorCard from "../Vendor/VendorCard";
import Card from "../../../components/FoodItemCard/Card";
import { motion, AnimatePresence } from "framer-motion";

const Stalls = ({ vendorStatus, vendorTypes }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [showingFoodItems, setShowingFoodItems] = useState(false);
  const initialLoadCompleted = useRef(false);

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

  // Fetch stalls
  const fetchStalls = async () => {
    setLoading(true);
    try {
      if (!vendorStatus || !vendorTypes) {
        setVendors([]);
        return;
      }

      // Filter to stall type and active vendors
      const stallVendors = Object.entries(vendorTypes)
        .filter(([vendorId, vendorType]) => {
          return vendorType?.toLowerCase() === "stall" && vendorStatus[vendorId] === true;
        })
        .map(([vendorId]) => vendorId);

      setVendors(stallVendors);
    } catch (error) {
      console.error("Error fetching stalls:", error);
      setVendors([]);
    } finally {
      setLoading(false);
      initialLoadCompleted.current = true;
    }
  };

  // Fetch food items for a specific stall
  const fetchStallFoodItems = async (vendorId) => {
    setLoading(true);
    try {
      const allFoodItems = [];

      // For stalls, find the category (usually named "stall" or similar)
      const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      // Process each category (stalls usually have just one)
      for (const categoryDoc of categoriesSnapshot.docs) {
        const categoryId = categoryDoc.id;
        
        // Get items in this category
        const categoryItemsRef = collection(db, `users/${vendorId}/myMenu/${categoryId}/categoryItems`);
        const categoryItemsSnapshot = await getDocs(categoryItemsRef);

        // Add the items to our collection
        const items = categoryItemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          vendorId: vendorId,
          categoryId: categoryId,
        }));

        allFoodItems.push(...items);
      }

      setFoodItems(allFoodItems);
    } catch (error) {
      console.error("Error fetching stall food items:", error);
      setFoodItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (Object.keys(vendorStatus || {}).length > 0 && Object.keys(vendorTypes || {}).length > 0) {
      fetchStalls();
    }
  }, [vendorStatus, vendorTypes]);

  // Handle real-time updates for vendor status changes
  useEffect(() => {
    if (!initialLoadCompleted.current) return;

    if (showingFoodItems && selectedVendorId) {
      // If the selected vendor is no longer active, go back to stalls view
      if (vendorStatus[selectedVendorId] !== true) {
        setShowingFoodItems(false);
        setSelectedVendorId(null);
      }
    } else {
      // Update stalls list when vendor status changes
      fetchStalls();
    }
  }, [vendorStatus, selectedVendorId, showingFoodItems]);

  // Handle vendor click
  const handleVendorClick = async (vendorId) => {
    // Check if vendor is still active
    if (vendorStatus[vendorId] !== true) {
      console.log("This vendor is no longer active");
      return;
    }

    setSelectedVendorId(vendorId);
    setShowingFoodItems(true);
    await fetchStallFoodItems(vendorId);
  };

  // Handle back button click
  const handleBack = () => {
    setSelectedVendorId(null);
    setShowingFoodItems(false);
    setFoodItems([]);
  };

  return (
    <div>
      {showingFoodItems && selectedVendorId && (
        <button className="Menu-back-button" onClick={handleBack}>
          ← Back to Stalls
        </button>
      )}

      <div className="Menu-grid">
        {loading ? (
          <motion.div className="Menu-loading" initial="hidden" animate="visible" variants={containerVariants}>
            <div className="loading-text">
              {showingFoodItems ? "Loading stall items" : "Discovering open stalls"}
            </div>
            <div className="loading-dots">
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
              <motion.span variants={dotVariants} className="dot">
                ●
              </motion.span>
            </div>
          </motion.div>
        ) : showingFoodItems ? (
          foodItems.length > 0 ? (
            <AnimatePresence>
              {foodItems.map((item, index) => (
                <motion.div
                  key={`${item.vendorId}-${item.categoryId}-${item.id}`}
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
              No food items available at this stall.
            </motion.p>
          )
        ) : vendors.length > 0 ? (
          <AnimatePresence>
            {vendors.map((vendorId, index) => (
              <motion.div
                key={vendorId}
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
        ) : (
          <motion.p
            className="Menu-no-items"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            No stalls are open currently.
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default Stalls;