// These are helper functions to interact with the Realtime Database
// You can add these to a separate file or include them in your Menu component

// Function to check the vendor type from the realtime database
export const getVendorType = async (vendorId, database) => {
    try {
      const { ref, get } = await import('firebase/database');
      const vendorTypeRef = ref(database, `vendorType/${vendorId}`);
      const snapshot = await get(vendorTypeRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error("Error getting vendor type:", error);
      return null;
    }
  };
  
  // Function to check if a vendor is live
  export const isVendorLive = async (vendorId, database) => {
    try {
      const { ref, get } = await import('firebase/database');
      const vendorStatusRef = ref(database, `vendorStatus/${vendorId}`);
      const snapshot = await get(vendorStatusRef);
      return snapshot.exists() ? snapshot.val() === true : false;
    } catch (error) {
      console.error("Error checking vendor status:", error);
      return false;
    }
  };
  
  // Function to check if a category is active
  export const isCategoryActive = async (vendorId, categoryId, database) => {
    try {
      const { ref, get } = await import('firebase/database');
      const categoryStatusRef = ref(database, `categoryStatus/${vendorId}/${categoryId}`);
      const snapshot = await get(categoryStatusRef);
      return snapshot.exists() ? snapshot.val() === true : false;
    } catch (error) {
      console.error("Error checking category status:", error);
      return false;
    }
  };