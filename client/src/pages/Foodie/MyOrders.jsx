import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { db, auth, database } from '../../firebaseConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, query, orderByChild, equalTo, onValue, off, get, update, remove } from 'firebase/database';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './MyOrders.css';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';
import { RatingModal, StarRating } from './StarRating';

//API
const API = process.env.REACT_APP_API;

const MyOrders = () => {
  const [orders, setOrders] = useState({ active: [], history: [] });
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isAuthorized: false,
    authError: null,
    userData: null
  });

  // API function for fetching past orders
  const fetchPastOrders = useCallback(async (userId, lastId = null) => {
    try {
      setHistoryLoading(true);
            const response = await axios.get(`${API}/orders/history/${userId}`, {
        params: { lastOrderId: lastId || '' }
      });
      const data = response.data;
      const newHistoryOrders = [];      
      for (const [orderId, orderData] of Object.entries(data.orders)) {
        newHistoryOrders.push({
          id: orderId,
          ...orderData,
          createdAt: orderData.orderTime,
        });
      }
      
      setOrders(prev => ({
        ...prev,
        history: lastId ? [...prev.history, ...newHistoryOrders] : newHistoryOrders
      }));
      
      setHasMoreHistory(data.hasMore);
      setLastOrderId(data.lastOrderId);
      setHistoryLoading(false);
      
    } catch (error) {
      console.error("Error fetching past orders:", error);
      setHistoryLoading(false);
    }
  }, []);

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // User is not logged in
        setAuthState({
          isAuthenticated: false,
          isAuthorized: false,
          authError: {
            title: "Authentication Required",
            message: "Please login to access this page.",
            returnPath: "/login",
            returnText: "Go to Login"
          },
          userData: null
        });
        setAuthLoading(false);
        return;
      }

      try {
        // User is logged in, fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        if (!userData) {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "User Profile Not Found",
              message: "Your user profile could not be found.",
              returnPath: "/",
              returnText: "Go to Home"
            },
            userData: null
          });
          setAuthLoading(false);
          return;
        }

        // Check if user is a Foodie
        if (userData.signupType !== "Foodie") {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "Not Authorized",
              message: "This page is only accessible to Foodies.",
              returnPath: userData.signupType === "Food Seller" ? "/seller-edit-profile" : "/",
              returnText: userData.signupType === "Food Seller" ? "Go to Seller Profile" : "Go to Home"
            },
            userData
          });
          setAuthLoading(false);
          return;
        }

        // User is authenticated and authorized
        setAuthState({
          isAuthenticated: true,
          isAuthorized: true,
          authError: null,
          userData
        });
        setAuthLoading(false);

        // Fetch active orders directly from RTD
        setupActiveOrdersListener(user.uid);
        
        // Fetch past orders from API
        if (activeTab === 'history') {
          fetchPastOrders(user.uid);
        }

      } catch (error) {
        console.error("Error fetching user data:", error);
        setAuthState({
          isAuthenticated: true,
          isAuthorized: false,
          authError: {
            title: "Error",
            message: "An error occurred while verifying your access. Please try again.",
            returnPath: "/",
            returnText: "Go to Home"
          },
          userData: null
        });
        setAuthLoading(false);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [fetchPastOrders, activeTab]);

  // Fetch history orders when tab changes to history
  useEffect(() => {
    if (activeTab === 'history' && authState.isAuthenticated && authState.isAuthorized && !orders.history.length) {
      fetchPastOrders(auth.currentUser.uid);
    }
  }, [activeTab, authState.isAuthenticated, authState.isAuthorized, orders.history.length, fetchPastOrders, auth]);

  // Set up real-time listener for active orders directly from RTD
  const setupActiveOrdersListener = (userId) => {
    setLoading(true);
    
    // Query active orders where uid matches the current user
    const activeOrdersRef = ref(database, 'orders');
    const activeOrdersQuery = query(
      activeOrdersRef, 
      orderByChild('uid'),
      equalTo(userId)
    );
    
    onValue(activeOrdersQuery, (snapshot) => {
      const activeOrdersData = [];
      
      snapshot.forEach((childSnapshot) => {
        const orderData = childSnapshot.val();
        const orderId = childSnapshot.key;
        
        // Only include orders with cooking or foodieAgreed status
        if (orderData && (orderData.status === 'cooking' || orderData.status === 'foodieAgreed')) {
          activeOrdersData.push({
            id: orderId,
            ...orderData
          });
        }
      });
      
      // Sort by creation time (newest first)
      activeOrdersData.sort((a, b) => b.createdAt - a.createdAt);
      
      setOrders(prev => ({
        ...prev,
        active: activeOrdersData
      }));
      
      setLoading(false);
    });
    
    // Return cleanup function
    return () => off(activeOrdersQuery);
  };

  // Cancel order function
  const handleCancelOrder = async (orderId) => {
    if (!auth.currentUser) return;
  
  try {
    setCancelLoading(true);
    
    // Get current timestamp
    const cancelledAt = Date.now();
    
    // order status in Realtime Database
    const orderRef = ref(database, `orders/${orderId}`);
    await update(orderRef, { status: "cancelled" });
    const orderSnapshot = await get(orderRef);
    const orderData = orderSnapshot.val();
    
    if (!orderData) {
      throw new Error("Order not found in Realtime Database");
    }
    
    const userOrderId = orderData.userOrderId;
    
    // Update order in Firestore (orders collection)
    const orderDocRef = doc(db, "orders", orderId);
    await updateDoc(orderDocRef, {
      status: 'cancelled',
      cancelledAt,
      cancellationReason: 'Cancelled by user'
    });
    
    //Update order in user's orders subcollection
    if (userOrderId) {
      const userOrderRef = doc(db, "users", auth.currentUser.uid, "orders", userOrderId);
      await updateDoc(userOrderRef, {
        status: 'cancelled',
        cancelledAt,
        cancellationReason: 'Cancelled by user'
      });
    }
    
    //Finally delete the order from Realtime Database after updating all references
    await remove(orderRef);
    
    setCancelLoading(false);
    } catch (error) {
      console.error("Error cancelling order:", error);
      setCancelLoading(false);
    }
  };
  
  // Cleanup real-time listener when component unmounts
  useEffect(() => {
    return () => {
      if (auth.currentUser) {
        const activeOrdersRef = ref(database, 'orders');
        const activeOrdersQuery = query(
          activeOrdersRef, 
          orderByChild('uid'),
          equalTo(auth.currentUser.uid)
        );
        off(activeOrdersQuery);
      }
    };
  }, [auth, database]);

  // Handle load more history orders
  const handleLoadMoreHistory = () => {
    if (hasMoreHistory && !historyLoading && lastOrderId) {
      fetchPastOrders(auth.currentUser.uid, lastOrderId);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    if (timestamp._seconds !== undefined && timestamp._nanoseconds !== undefined) {
      const milliseconds = timestamp._seconds * 1000 + Math.floor(timestamp._nanoseconds / 1000000);
      const date = new Date(milliseconds);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    // regular JS string timestamp
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status display text and color
  const getStatusInfo = (status) => {
    const statusMap = {
      cooking: { text: "Cooking", color: "#FF9800" },
      foodieAgreed: { text: "Confirmed", color: "#2196F3" },
      completed: { text: "Completed", color: "#4CAF50" },
      cancelled: { text: "Cancelled", color: "#F44336" }
    };
    
    return statusMap[status] || { text: status, color: "#757575" };
  };

  if (authLoading) {
    return <Loader />;
  }

  if (!authState.isAuthenticated || !authState.isAuthorized) {
    return <UnauthorizedPage error={authState.authError} />;
  }

  return (
    <div className="MyOrders-container">
      <h1 className="MyOrders-title">My Orders</h1>
      
      <div className="MyOrders-tabs">
        <button 
          className={`MyOrders-tab ${activeTab === 'active' ? 'MyOrders-tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Orders
        </button>
        <button 
          className={`MyOrders-tab ${activeTab === 'history' ? 'MyOrders-tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Order History
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="MyOrders-list"
        >
          {activeTab === 'active' && (
            loading ? (
              <div className="MyOrders-loading">
                <Loader />
              </div>
            ) : (
              orders.active && orders.active.length > 0 ? (
                orders.active.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order}
                    formatDate={formatDate}
                    getStatusInfo={getStatusInfo}
                    isActiveOrder={true}
                    onCancelOrder={handleCancelOrder}
                    cancelLoading={cancelLoading}
                  />
                ))
              ) : (
                <div className="MyOrders-empty">No active orders found</div>
              )
            )
          )}
          
          {activeTab === 'history' && (
            <>
              {orders.history && orders.history.length > 0 ? (
                <>
                  {orders.history.map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order} 
                      foodItem={order.foodItem ? { name: order.foodItem } : null}
                      formatDate={formatDate}
                      getStatusInfo={getStatusInfo}
                      images={order.photoURL}
                      isActiveOrder={false}
                    />
                  ))}
                  
                  {hasMoreHistory && (
                    <div className="MyOrders-load-more">
                      <button 
                        className="MyOrders-load-more-button"
                        onClick={handleLoadMoreHistory}
                        disabled={historyLoading}
                      >
                        {historyLoading ? (
                          <span className="MyOrders-load-more-loading">
                            Loading more...
                          </span>
                        ) : (
                          "Load More Orders"
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                historyLoading ? (
                  <motion.div 
                    className="MyOrders-loading-history"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="MyOrders-loading-spinner"></div>
                    <p>Loading your order history...</p>
                  </motion.div>
                ) : (
                  <div className="MyOrders-empty">No order history found</div>
                )
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, foodItem, formatDate, getStatusInfo, images, isActiveOrder, onCancelOrder, cancelLoading }) => {
  const { text: statusText, color: statusColor } = getStatusInfo(order.status);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  // For history orders that come from API and have multiple images
  const hasMultipleImages = !isActiveOrder && order.photoURL && order.photoURL.length > 1;
  
  const nextImage = () => {
    if (hasMultipleImages) {
      setActiveImageIndex(prev => (prev + 1) % order.photoURL.length);
    }
  };
  
  const prevImage = () => {
    if (hasMultipleImages) {
      setActiveImageIndex(prev => (prev - 1 + order.photoURL.length) % order.photoURL.length);
    }
  };

  // Show cancel confirmation
  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  // Confirm cancellation
  const handleConfirmCancel = () => {
    onCancelOrder(order.id);
    setShowCancelConfirm(false);
  };

  // Cancel the cancellation
  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  // Open rating modal
  const handleRateClick = () => {
    setShowRatingModal(true);
  };
  
  // Handle rating submission
  const handleRatingSubmit = (rating) => {
    console.log(`Order ${order.id} rated: ${rating}`);
  };
  
  // Render different card layouts based on active vs history
  return (
    <motion.div 
      className="MyOrders-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isActiveOrder ? (
        // Active Order Card - RTD data structure
        <div className="MyOrders-card-content">
          <div className="MyOrders-active-order">
            <div className="MyOrders-active-header">
              <h3 className="MyOrders-card-title">
                {order.itemName || foodItem?.name || "Loading..."}
              </h3>
              <div 
                className="MyOrders-card-status"
                style={{ backgroundColor: statusColor + '20', color: statusColor }}
              >
                {statusText}
              </div>
            </div>
            
            <div className="MyOrders-active-details">
              <div className="MyOrders-active-main-info">
                <p className="MyOrders-card-seller">
                  <strong>Seller:</strong> {order.stallName || "Unknown"}
                </p>
                <p><strong>Token:</strong> {order.token || "N/A"}</p>
                <p><strong>Quantity:</strong> {order.quantity || 0}</p>
                <p><strong>Price:</strong> ₹{order.totalCost || 0}</p>
              </div>
              
              <div className="MyOrders-active-time-info">
                <p><strong>Created:</strong> {formatDate(order.timestamp)}</p>
                {order.acceptedTimestamp && (
                  <p><strong>Accepted:</strong> {formatDate(new Date(order.acceptedTimestamp).getTime())}</p>
                )}
                <p><strong>Est. Wait Time:</strong> {order.waitingTime || "N/A"} mins</p>
              </div>
            </div>
            
            {/* Cancel button only for foodieAgreed status */}
            {order.status === 'foodieAgreed' && !showCancelConfirm && (
              <button 
                className="MyOrders-cancel-button"
                onClick={handleCancelClick}
                disabled={cancelLoading}
              >
                Cancel Order
              </button>
            )}

            {/* Cancel confirmation dialog */}
            {showCancelConfirm && (
              <div className="MyOrders-cancel-confirm">
                <p>Are you sure you want to cancel this order?</p>
                <div className="MyOrders-cancel-actions">
                  <button 
                    className="MyOrders-cancel-yes"
                    onClick={handleConfirmCancel}
                    disabled={cancelLoading}
                  >
                    {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
                  </button>
                  <button 
                    className="MyOrders-cancel-no"
                    onClick={handleCancelCancel}
                    disabled={cancelLoading}
                  >
                    No, Keep Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="MyOrders-card-content">
          <div className="MyOrders-card-image-container">
            {hasMultipleImages ? (
              <div className="MyOrders-carousel">
                <div className="MyOrders-carousel-images">
                  <img 
                    src={order.photoURL[activeImageIndex]} 
                    alt={order.foodItem || "Food item"} 
                    className="MyOrders-card-image"
                  />
                </div>
                <div className="MyOrders-carousel-controls">
                  <button onClick={prevImage} className="MyOrders-carousel-button">
                    &#8249;
                  </button>
                  <div className="MyOrders-carousel-dots">
                    {order.photoURL.map((_, index) => (
                      <span 
                        key={index} 
                        className={`MyOrders-carousel-dot ${index === activeImageIndex ? 'active' : ''}`}
                        onClick={() => setActiveImageIndex(index)}
                      />
                    ))}
                  </div>
                  <button onClick={nextImage} className="MyOrders-carousel-button">
                    &#8250;
                  </button>
                </div>
              </div>
            ) : (
              <div className="MyOrders-card-image">
                {order.photoURL && order.photoURL.length > 0 ? (
                  <img src={order.photoURL[0]} alt={order.foodItem || "Food item"} />
                ) : (
                  <div className="MyOrders-card-image-placeholder">
                    <span>No Image Available</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="MyOrders-card-details">
            <h3 className="MyOrders-card-title">
              {order.foodItem || "Order Item"}
            </h3>
            
            <p className="MyOrders-card-seller">
              Seller: {order.stallName || "Unknown"}
            </p>
            
            <div className="MyOrders-card-info">
              <p>Quantity: {order.quantity || 0}</p>
              <p>Price: ₹{order.price || 0}</p>
              <p>Ordered on: {formatDate(order.orderTime)}</p>
            </div>
            
            <div className="MyOrders-card-status-container">
              <div 
                className="MyOrders-card-status"
                style={{ backgroundColor: statusColor + '20', color: statusColor }}
              >
                {statusText}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isActiveOrder && order.status === 'completed' && (
        <div className="MyOrders-card-rating">
          {order.rating ? (
            <div className="MyOrders-card-rating-display">
              <p>Your Rating:</p>
              <StarRating initialRating={order.rating} readOnly={true} />
            </div>
          ) : (
            <motion.button 
              className="MyOrders-rating-button"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05, backgroundColor: "#FF5722" }}
              onClick={handleRateClick}
            >
              Rate Now
            </motion.button>
          )}
        </div>
      )}
      
      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <RatingModal 
            order={order} 
            onClose={() => setShowRatingModal(false)} 
            onRatingSubmit={handleRatingSubmit}
          />
        )}
      </AnimatePresence>
      
      {/* Additional information common to both active and history orders */}
      {order.note && (
        <div className="MyOrders-card-note">
          <p><strong>Note:</strong> {order.note}</p>
        </div>
      )}
      
      {/* Completion information */}
      {!isActiveOrder && order.status === 'completed' && order.completedAt && (
        <div className="MyOrders-card-completed">
          <p>Completed on: {formatDate(order.completedAt)}</p>
        </div>
      )}
      
      {/* Cancellation information */}
      {!isActiveOrder && order.status === 'cancelled' && order.cancelledAt && (
        <div className="MyOrders-card-cancelled">
          <p>Cancelled on: {formatDate(order.cancelledAt)}</p>
          {order.cancellationReason && (
            <p>Reason: {order.cancellationReason}</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MyOrders;