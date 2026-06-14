import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import Card from "../../../components/FoodItemCard/Card";
import { motion, AnimatePresence } from "framer-motion";

const Food = ({ vendorStatus, categoryStatuses, searchResults, searchLoading, isSearchMode }) => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadCompleted = useRef(false);
  const initialLoadAttempted = useRef(false); // Track if we've attempted initial load
  const previousVendorStatus = useRef({});
  const previousCategoryStatuses = useRef({});
  const fetchedItemsCache = useRef(new Map());
  const processingStatusChange = useRef(false);

  // Console logs for debugging
  useEffect(() => {
    console.log("Food component mounted or updated");
    console.log("Is search mode:", isSearchMode);
    console.log("Vendor status keys:", Object.keys(vendorStatus || {}).length);
    console.log("Initial load completed:", initialLoadCompleted.current);
  }, [isSearchMode, vendorStatus]);

  // Item animation variants
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
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

  // Fetch items for a specific vendor and category
  const fetchItemsForCategory = async (vendorId, categoryId) => {
    try {
      const cacheKey = `${vendorId}:${categoryId}`;
      
      // Return cached items if available
      if (fetchedItemsCache.current.has(cacheKey)) {
        return fetchedItemsCache.current.get(cacheKey);
      }
      
      const categoryItemsRef = collection(db, `users/${vendorId}/myMenu/${categoryId}/categoryItems`);
      const categoryItemsSnapshot = await getDocs(categoryItemsRef);
      
      const items = categoryItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        vendorId: vendorId,
        categoryId: categoryId,
        key: `${vendorId}-${categoryId}-${doc.id}`, // Unique key for React
      }));
      
      // Cache the items
      fetchedItemsCache.current.set(cacheKey, items);
      
      return items;
    } catch (error) {
      console.error(`Error fetching items for vendor ${vendorId}, category ${categoryId}:`, error);
      return [];
    }
  };

  // Fetch categories for a specific vendor
  const fetchCategoriesForVendor = async (vendorId) => {
    try {
      const categoriesRef = collection(db, `users/${vendorId}/myMenu`);
      const categoriesSnapshot = await getDocs(categoriesRef);
      
      return categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        vendorId: vendorId,
      }));
    } catch (error) {
      console.error(`Error fetching categories for vendor ${vendorId}:`, error);
      return [];
    }
  };

  // Initial fetch of food items
  const fetchAllFoodItems = async (initialLoad = false) => {
    if (isSearchMode) return;

    console.log("Fetching all food items, initial load:", initialLoad);
    setLoading(true);

    try {
      const allFoodItems = [];

      // Get all active vendors
      const liveVendors = Object.entries(vendorStatus || {})
        .filter(([_, isLive]) => isLive === true)
        .map(([vendorId]) => vendorId);

      console.log("Live vendors found:", liveVendors.length);

      if (liveVendors.length === 0) {
        console.log("No live vendors found, setting empty food items");
        setFoodItems([]);
        setLoading(false);
        if (initialLoad) initialLoadCompleted.current = true;
        return;
      }

      // Process each vendor
      for (const vendorId of liveVendors) {
        // Get this vendor's categories
        const vendorCategories = await fetchCategoriesForVendor(vendorId);
        console.log(`Vendor ${vendorId}: Found ${vendorCategories.length} categories`);
        
        // Get category statuses for this vendor
        const vendorCategoryStatuses = categoryStatuses?.[vendorId] || {};

        // Process each category
        for (const category of vendorCategories) {
          const categoryId = category.id;

          // Only include active categories - ensure we have a default to true if no status is set
          const isCategoryActive = vendorCategoryStatuses[categoryId] !== false;
          
          if (isCategoryActive) {
            // Get items in this category
            const items = await fetchItemsForCategory(vendorId, categoryId);
            console.log(`Category ${categoryId}: Found ${items.length} items`);
            allFoodItems.push(...items);
          }
        }
      }

      console.log(`Total food items found: ${allFoodItems.length}`);
      setFoodItems(allFoodItems);

      // Mark initial load as complete
      if (initialLoad) {
        console.log("Marking initial load as completed");
        initialLoadCompleted.current = true;
      }
    } catch (error) {
      console.error("Error fetching all food items:", error);
      setFoodItems([]);
      // Even on error, mark as completed to prevent perpetual loading state
      if (initialLoad) initialLoadCompleted.current = true;
    } finally {
      setLoading(false);
    }
  };

  // Handle initial data fetching - completely rewritten for reliability
  useEffect(() => {
    // Skip if we're in search mode
    if (isSearchMode) {
      setLoading(false);
      return;
    }
    
    // Skip if we've already completed initial load
    if (initialLoadCompleted.current) return;
    
    // Skip if we don't have vendor status data yet
    if (!vendorStatus || Object.keys(vendorStatus).length === 0) {
      // But if we've waited too long, try loading anyway
      const timeoutId = setTimeout(() => {
        if (!initialLoadAttempted.current) {
          console.log("No vendor status after timeout, attempting load anyway");
          initialLoadAttempted.current = true;
          fetchAllFoodItems(true);
        }
      }, 3000); // Wait 3 seconds then try anyway
      
      return () => clearTimeout(timeoutId);
    }
    
    console.log("Starting initial data fetch");
    initialLoadAttempted.current = true;
    
    const fetchInitialData = async () => {
      await fetchAllFoodItems(true);
      previousVendorStatus.current = { ...vendorStatus };
      previousCategoryStatuses.current = JSON.parse(JSON.stringify(categoryStatuses || {}));
    };

    fetchInitialData();
  }, [vendorStatus, categoryStatuses, isSearchMode]);

  // Handle changes in vendor status (vendors going online/offline)
  useEffect(() => {
    if (!initialLoadCompleted.current || isSearchMode) return;
    if (processingStatusChange.current) return;
    
    const handleVendorStatusChanges = async () => {
      processingStatusChange.current = true;
      
      try {
        // Only process if there are actual changes
        const hasChanges = JSON.stringify(vendorStatus) !== JSON.stringify(previousVendorStatus.current);
        if (!hasChanges) {
          processingStatusChange.current = false;
          return;
        }
      
        console.log("Processing vendor status changes");
        
        // Find vendors that just came online
        const newlyActiveVendors = Object.entries(vendorStatus)
          .filter(([vendorId, isActive]) => 
            isActive === true && (!previousVendorStatus.current[vendorId] || previousVendorStatus.current[vendorId] === false)
          )
          .map(([vendorId]) => vendorId);
          
        // Find vendors that just went offline
        const newlyInactiveVendors = Object.entries(vendorStatus)
          .filter(([vendorId, isActive]) => 
            isActive === false && previousVendorStatus.current[vendorId] === true
          )
          .map(([vendorId]) => vendorId);
        
        console.log("Newly active vendors:", newlyActiveVendors);
        console.log("Newly inactive vendors:", newlyInactiveVendors);
        
        // Remove items from vendors that went offline
        if (newlyInactiveVendors.length > 0) {
          setFoodItems(prevItems => {
            const filteredItems = prevItems.filter(item => !newlyInactiveVendors.includes(item.vendorId));
            console.log(`Removed ${prevItems.length - filteredItems.length} items from inactive vendors`);
            return filteredItems;
          });
        }
        
        // Add items from newly active vendors
        if (newlyActiveVendors.length > 0) {
          const newItems = [];
          
          for (const vendorId of newlyActiveVendors) {
            const categories = await fetchCategoriesForVendor(vendorId);
            const vendorCategoryStatuses = categoryStatuses?.[vendorId] || {};
            
            for (const category of categories) {
              // Default to active if no status is specified
              const isCategoryActive = vendorCategoryStatuses[category.id] !== false;
              
              if (isCategoryActive) {
                const items = await fetchItemsForCategory(vendorId, category.id);
                if (items.length > 0) {
                  newItems.push(...items);
                }
              }
            }
          }
          
          if (newItems.length > 0) {
            console.log(`Adding ${newItems.length} items from newly active vendors`);
            setFoodItems(prevItems => [...prevItems, ...newItems]);
          }
        }
        
        // Update previous state reference
        previousVendorStatus.current = { ...vendorStatus };
      } finally {
        processingStatusChange.current = false;
      }
    };
    
    handleVendorStatusChanges();
  }, [vendorStatus, isSearchMode, categoryStatuses]);

  // Handle changes in category status
  useEffect(() => {
    if (!initialLoadCompleted.current || isSearchMode || !categoryStatuses) return;
    if (processingStatusChange.current) return;
    
    const handleCategoryStatusChanges = async () => {
      processingStatusChange.current = true;
      
      try {
        // Only process if there are actual changes
        const hasChanges = JSON.stringify(categoryStatuses) !== JSON.stringify(previousCategoryStatuses.current);
        if (!hasChanges) {
          processingStatusChange.current = false;
          return;
        }
        
        console.log("Processing category status changes");
        
        let removedItems = [];
        let addedItems = [];
        
        // Check for each vendor
        for (const vendorId in categoryStatuses) {
          // Skip if vendor is not active
          if (vendorStatus[vendorId] !== true) continue;
          
          const currentVendorCategories = categoryStatuses[vendorId] || {};
          const previousVendorCategories = previousCategoryStatuses.current[vendorId] || {};
          
          // Find categories that just became active
          const newlyActiveCategories = Object.entries(currentVendorCategories)
            .filter(([categoryId, isActive]) => 
              isActive === true && previousVendorCategories[categoryId] !== true
            )
            .map(([categoryId]) => categoryId);
            
          // Find categories that just became inactive
          const newlyInactiveCategories = Object.entries(currentVendorCategories)
            .filter(([categoryId, isActive]) => 
              isActive === false && previousVendorCategories[categoryId] === true
            )
            .map(([categoryId]) => categoryId);
          
          console.log("Newly active categories:", newlyActiveCategories);
          console.log("Newly inactive categories:", newlyInactiveCategories);
          
          // Track items to be removed
          if (newlyInactiveCategories.length > 0) {
            // Find items to remove based on category
            const itemsToRemove = foodItems
              .filter(item => item.vendorId === vendorId && newlyInactiveCategories.includes(item.categoryId))
              .map(item => `${item.vendorId}-${item.categoryId}-${item.id}`);
              
            removedItems = [...removedItems, ...itemsToRemove];
          }
          
          // Add items from categories that became active
          if (newlyActiveCategories.length > 0) {
            for (const categoryId of newlyActiveCategories) {
              const newCategoryItems = await fetchItemsForCategory(vendorId, categoryId);
              if (newCategoryItems.length > 0) {
                addedItems = [...addedItems, ...newCategoryItems];
              }
            }
          }
        }
        
        console.log(`Items to remove: ${removedItems.length}, Items to add: ${addedItems.length}`);
        
        // Apply changes in a single update to maintain smooth animations
        if (removedItems.length > 0 || addedItems.length > 0) {
          setFoodItems(prevItems => {
            // First remove items
            const filteredItems = removedItems.length > 0 
              ? prevItems.filter(item => {
                  const itemKey = `${item.vendorId}-${item.categoryId}-${item.id}`;
                  return !removedItems.includes(itemKey);
                })
              : prevItems;
            
            // Then add new items
            return addedItems.length > 0 
              ? [...filteredItems, ...addedItems]
              : filteredItems;
          });
        }
        
        // Update previous state reference
        previousCategoryStatuses.current = JSON.parse(JSON.stringify(categoryStatuses));
      } finally {
        processingStatusChange.current = false;
      }
    };
    
    handleCategoryStatusChanges();
  }, [categoryStatuses, vendorStatus, isSearchMode, foodItems]);

  // Safety check - if no items after a certain time, try once more
  useEffect(() => {
    // Only run this if initial load is completed but we have no items
    if (!initialLoadCompleted.current || foodItems.length > 0 || isSearchMode) return;
    
    const safetyTimeout = setTimeout(() => {
      console.log("Safety check: No items after initial load, trying again");
      fetchAllFoodItems();
    }, 5000); // 5 seconds after initial load
    
    return () => clearTimeout(safetyTimeout);
  }, [initialLoadCompleted.current, foodItems.length, isSearchMode]);

  // Get items to display
  const getDisplayItems = () => {
    if (isSearchMode && searchResults) {
      return searchResults.map((fid) => ({ id: fid, key: `search-${fid}` }));
    }
    return foodItems;
  };

  const displayItems = getDisplayItems();

  // Log when display items change
  useEffect(() => {
    console.log(`Display items count: ${displayItems.length}`);
  }, [displayItems.length]);

  return (
    <div className="Menu-grid">
      {isSearchMode && searchLoading ? (
        <motion.div className="Menu-loading" initial="hidden" animate="visible" variants={containerVariants}>
          <div className="loading-text">Searching for delicious options</div>
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
      ) : loading && !isSearchMode ? (
        <motion.div className="Menu-loading" initial="hidden" animate="visible" variants={containerVariants}>
          <div className="loading-text">Discovering what's cooking</div>
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
      ) : displayItems.length > 0 ? (
        <AnimatePresence mode="popLayout">
          {displayItems.map((item) => (
            <motion.div
              key={item.key || (isSearchMode ? `search-${item.id}` : `${item.vendorId}-${item.categoryId}-${item.id}`)}
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
          {isSearchMode
            ? "No matching food items found. Try a different search term."
            : "No food items available."}
        </motion.p>
      )}
    </div>
  );
};

export default Food;