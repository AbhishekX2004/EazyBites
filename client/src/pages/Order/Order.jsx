import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { ref, set, update, onValue, off, remove } from 'firebase/database';
import { auth, db, database } from '../../firebaseConfig';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';
import CountdownTimer from './CountdownTimer';
import './Order.css';

const API = process.env.REACT_APP_API;

const ORDER_STATUS = {
    CREATED: 'created',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    FOODIE_AGREED: 'foodieAgreed',
    FOODIE_DECLINED: 'foodieDeclined',
    COMPLETED: 'completed',
    TIMEOUT_SELLER: 'timeoutSeller',
    TIMEOUT_FOODIE: 'timeoutFoodie'
};

const Order = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const fid = searchParams.get('fid');
    const [itemData, setItemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [orderStatus, setOrderStatus] = useState(null);
    const [waitingTime, setWaitingTime] = useState(null);
    const [orderToken, setOrderToken] = useState(null);
    const [currentOrderIds, setCurrentOrderIds] = useState({
        globalOrderId: null,
        userOrderId: null
    });
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(null);
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        isAuthorized: false,
        authError: null,
        userData: null
    });
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const carouselIntervalRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setAuthState({
                    isAuthenticated: false,
                    isAuthorized: false,
                    authError: {
                        title: "Authentication Required",
                        message: "Please login to place an order.",
                        returnPath: "/login",
                        returnText: "Go to Login"
                    },
                    userData: null
                });
                setLoading(false);
                return;
            }

            try {
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
                    setLoading(false);
                    return;
                }

                if (userData.signupType !== "Foodie" || !userData.phoneNumber) {
                    setAuthState({
                        isAuthenticated: true,
                        isAuthorized: false,
                        authError: {
                            title: "Not Authorized",
                            message: userData.signupType !== "Foodie"
                                ? "Only Foodies can place orders."
                                : "Please complete your profile by adding a phone number.",
                            returnPath: userData.signupType !== "Foodie" ? "/" : "/foodie-edit-profile",
                            returnText: userData.signupType !== "Foodie" ? "Go to Home" : "Complete Profile"
                        },
                        userData
                    });
                    setLoading(false);
                    return;
                }

                setAuthState({
                    isAuthenticated: true,
                    isAuthorized: true,
                    authError: null,
                    userData
                });
                setLoading(false);
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
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchItemData = async () => {
            if (authState.isAuthenticated && authState.isAuthorized) {
                setDataLoading(true);
                try {
                    const response = await axios.get(`${API}/food/foodItem/${fid}`);
                    const data = response.data;
                    
                    // Combine food item photos with stall photos if available
                    if (data.stallPhotos && data.stallPhotos.length > 0) {
                        data.photoURLs = [...data.photoURLs, ...data.stallPhotos];
                    }
                    
                    setItemData(data);
                } catch (error) {
                    console.error('Error fetching item data:', error);
                } finally {
                    setDataLoading(false);
                }
            }
        };

        fetchItemData();
    }, [fid, authState.isAuthenticated, authState.isAuthorized, API]);

    // Set up image carousel
    useEffect(() => {
        if (itemData?.photoURLs?.length > 1) {
            carouselIntervalRef.current = setInterval(() => {
                setCurrentImageIndex(prevIndex => 
                    (prevIndex + 1) % itemData.photoURLs.length
                );
            }, 5000); // Change image every 5 seconds
        }
        
        return () => {
            if (carouselIntervalRef.current) {
                clearInterval(carouselIntervalRef.current);
            }
        };
    }, [itemData]);

    useEffect(() => {
        if (!currentOrderIds.globalOrderId) return;

        const orderRef = ref(database, `orders/${currentOrderIds.globalOrderId}`);
        const orderListener = onValue(orderRef, (snapshot) => {
            const orderData = snapshot.val();
            if (!orderData) return;

            setOrderStatus(orderData.status);

            switch (orderData.status) {
                case ORDER_STATUS.ACCEPTED:
                    setWaitingTime(orderData.waitingTime);
                    setShowModal(true);
                    setModalType('sellerResponse');
                    break;
                case ORDER_STATUS.REJECTED:
                    setShowModal(true);
                    setModalType('sellerRejected');
                    break;
                case ORDER_STATUS.FOODIE_AGREED:
                    setOrderToken(orderData.token);
                    setShowModal(true);
                    setModalType('orderConfirmed');
                    break;
                case ORDER_STATUS.TIMEOUT_SELLER:
                    setShowModal(true);
                    setModalType('sellerTimeout');
                    break;
                case ORDER_STATUS.TIMEOUT_FOODIE:
                    setShowModal(true);
                    setModalType('foodieTimeout');
                    break;
                default:
                    break;
            }
        });

        return () => off(orderRef, 'value', orderListener);
    }, [currentOrderIds.globalOrderId]);

    const handleQuantityChange = (newQuantity) => {
        if (newQuantity >= 1 && newQuantity <= 5) {
            setQuantity(newQuantity);
        }
    };

    const handlePlaceOrder = async () => {
        try {
            const totalCost = parseFloat(itemData.price) * quantity;

            const ordersCollectionRef = collection(db, 'orders');
            const newOrderDoc = await addDoc(ordersCollectionRef, {
                uid: auth.currentUser.uid,
                fid: fid,
                sid: itemData.seller,
                quantity: quantity,
                totalCost: totalCost,
                timestamp: new Date(),
                status: ORDER_STATUS.CREATED
            });

            const userOrderRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/orders`), {
                orderId: newOrderDoc.id,
                status: ORDER_STATUS.CREATED,
                timestamp: new Date()
            });

            const userOrderId = userOrderRef.id;
            const orderId = newOrderDoc.id;

            setCurrentOrderIds({
                globalOrderId: orderId,
                userOrderId
            });

            const orderRtdbRef = ref(database, `orders/${orderId}`);
            await set(orderRtdbRef, {
                uid: auth.currentUser.uid,
                fid: fid,
                sid: itemData.seller,
                quantity: quantity,
                totalCost: totalCost,
                itemName: itemData.name,
                stallName: itemData.stallName,
                status: ORDER_STATUS.CREATED,
                timestamp: Date.now(),
                userOrderId: userOrderId
            });

            setShowModal(true);
            setModalType('waitingForSeller');
        } catch (error) {
            console.error("Error placing order:", error);
            alert("Failed to place order. Please try again.");
        }
    };

    const handleFoodieResponse = async (agreed) => {
        if (!currentOrderIds.globalOrderId) return;

        const newStatus = agreed ? ORDER_STATUS.FOODIE_AGREED : ORDER_STATUS.FOODIE_DECLINED;

        try {
            let token;

            // Generate token if agreed
            if (agreed) {
                token = Math.floor(1000 + Math.random() * 9000);
                setOrderToken(token);
            }

            // Update Firestore 'orders'
            await updateDoc(doc(db, 'orders', currentOrderIds.globalOrderId), {
                status: newStatus,
                ...(agreed && { token })
            });

            // Update Firestore 'users/orders'
            await updateDoc(doc(db, `users/${auth.currentUser.uid}/orders`, currentOrderIds.userOrderId), {
                status: newStatus,
                ...(agreed && { token })
            });

            // Directly set data in Realtime Database
            await update(ref(database, `orders/${currentOrderIds.globalOrderId}`), {
                status: newStatus,
                ...(agreed && { token })
            });

            if (!agreed) {
                try {
                    const orderRef = ref(database, `orders/${currentOrderIds.globalOrderId}`);
                    await remove(orderRef);
                    console.log(`Order ${currentOrderIds.globalOrderId} removed from Realtime Database after decline`);
                } catch (error) {
                    console.error("Error removing declined order from Realtime Database:", error);
                }
                setShowModal(false);
                navigate('/menu');
            }
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Failed to update order. Please try again.");
        }

    };

    const handleSellerTimeout = () => {
        setModalType('sellerTimeout');
    }

    const handleFoodieTimeout = async () => {
        if (!currentOrderIds.globalOrderId) return;

        try {
            const orderSnapshot = await getDoc(doc(db, 'orders', currentOrderIds.globalOrderId));
            const currentStatus = orderSnapshot.data()?.status;
            if (currentStatus !== ORDER_STATUS.ACCEPTED) return;

            await updateDoc(doc(db, 'orders', currentOrderIds.globalOrderId), {
                status: ORDER_STATUS.TIMEOUT_FOODIE
            });

            await updateDoc(doc(db, `users/${auth.currentUser.uid}/orders`, currentOrderIds.userOrderId), {
                status: ORDER_STATUS.TIMEOUT_FOODIE
            });

            const orderRtdbRef = ref(database, `orders/${currentOrderIds.globalOrderId}`);
            const snapshot = await getDoc(doc(db, 'orders', currentOrderIds.globalOrderId));
            const orderData = snapshot.data();

            await set(orderRtdbRef, {
                ...orderData,
                status: ORDER_STATUS.TIMEOUT_FOODIE
            });
        } catch (error) {
            console.error("Error handling foodie timeout:", error);
        }
    };

    const handlePrevImage = () => {
        if (!itemData?.photoURLs?.length) return;
        setCurrentImageIndex(prevIndex => 
            prevIndex === 0 ? itemData.photoURLs.length - 1 : prevIndex - 1
        );
    };

    const handleNextImage = () => {
        if (!itemData?.photoURLs?.length) return;
        setCurrentImageIndex(prevIndex => 
            (prevIndex + 1) % itemData.photoURLs.length
        );
    };

    if (loading || (authState.isAuthenticated && authState.isAuthorized && dataLoading)) {
        return <Loader />;
    }

    if (!fid) {
        return <div className="Order-error">No food item ID provided in the URL</div>;
    }

    if (!authState.isAuthenticated || !authState.isAuthorized) {
        return (
            <UnauthorizedPage
                title={authState.authError.title}
                message={authState.authError.message}
                returnPath={authState.authError.returnPath}
                returnText={authState.authError.returnText}
            />
        );
    }

    if (!dataLoading && !itemData) {
        return <div className="Order-error">Unable to load item details</div>;
    }

    return (
        <div className="Order-container">
            <motion.div
                className="Order-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="Order-image-gallery">
                    {itemData?.photoURLs?.length > 0 && (
                        <div className="Order-carousel-container">
                            <div className="Order-carousel-navigation">
                                <button 
                                    className="Order-carousel-arrow Order-carousel-arrow-left"
                                    onClick={handlePrevImage}
                                    aria-label="Previous image"
                                >
                                    &#10094;
                                </button>
                                <motion.img
                                    key={currentImageIndex}
                                    src={itemData.photoURLs[currentImageIndex]}
                                    alt={`${itemData.name}`}
                                    className="Order-image"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                />
                                <button 
                                    className="Order-carousel-arrow Order-carousel-arrow-right"
                                    onClick={handleNextImage}
                                    aria-label="Next image"
                                >
                                    &#10095;
                                </button>
                            </div>
                            <div className="Order-carousel-dots">
                                {itemData.photoURLs.map((_, index) => (
                                    <span 
                                        key={index} 
                                        className={`Order-carousel-dot ${index === currentImageIndex ? 'Order-carousel-dot-active' : ''}`}
                                        onClick={() => setCurrentImageIndex(index)}
                                    ></span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="Order-details">
                    {itemData && (
                        <>
                            <motion.h1 className="Order-name" whileHover={{ scale: 1.05 }}>
                                {itemData.name}
                            </motion.h1>
                            <div className="Order-info">
                                <div className="Order-info-item">
                                    <span className="Order-info-label">Stall:</span> 
                                    <span className="Order-info-value">{itemData.stallName}</span>
                                </div>
                                <div className="Order-info-item">
                                    <span className="Order-info-label">Rating:</span> 
                                    <span className="Order-info-value">
                                        {itemData.rating ? `${itemData.rating.toFixed(1)} ★ (${itemData.totalRatings} ratings)` : "N/A"}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="Order-description-container">
                                <p className="Order-description">{itemData.description}</p>
                            </div>

                            <div className="Order-stall-details">
                                <h3 className="Order-section-title">Stall Information</h3>
                                <div className="Order-stall-info-grid">
                                    <div className="Order-stall-info-item">
                                        <span className="Order-stall-info-label">Owner:</span>
                                        <span className="Order-stall-info-value">{itemData.stallOwner}</span>
                                    </div>
                                    <div className="Order-stall-info-item">
                                        <span className="Order-stall-info-label">Location:</span>
                                        <span className="Order-stall-info-value">{itemData.landmark}</span>
                                    </div>
                                    <div className="Order-stall-info-item">
                                        <span className="Order-stall-info-label">Phone:</span>
                                        <span className="Order-stall-info-value">{itemData.stallPhoneNumber}</span>
                                    </div>
                                    <div className="Order-stall-info-item">
                                        <span className="Order-stall-info-label">Email:</span>
                                        <span className="Order-stall-info-value">{itemData.sellerEmail}</span>
                                    </div>
                                </div>
                                {itemData.stallDescription && (
                                    <div className="Order-stall-description">
                                        <span className="Order-stall-info-label">About:</span>
                                        <p className="Order-stall-description-text">{itemData.stallDescription}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="Order-purchase-section">
                                <div className="Order-price">
                                    <span>₹{parseFloat(itemData.price).toFixed(2)}</span>
                                </div>
                                <div className="Order-quantity-container">
                                    <button
                                        onClick={() => handleQuantityChange(quantity - 1)}
                                        disabled={quantity <= 1}
                                        className="Order-quantity-btn"
                                        aria-label="Decrease quantity"
                                    >
                                        -
                                    </button>
                                    <span className="Order-quantity-display">{quantity}</span>
                                    <button
                                        onClick={() => handleQuantityChange(quantity + 1)}
                                        disabled={quantity >= 5}
                                        className="Order-quantity-btn"
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <motion.button
                                className="Order-place-button"
                                onClick={handlePlaceOrder}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Place Order
                            </motion.button>
                        </>
                    )}
                </div>
            </motion.div>

            {itemData && (
                <div className="Order-mobile-bottom-bar">
                    <div className="Order-mobile-price-qty">
                        <div className="Order-mobile-price">
                            ₹{parseFloat(itemData.price).toFixed(2)}
                        </div>
                        <div className="Order-mobile-quantity-container">
                            <button
                                onClick={() => handleQuantityChange(quantity - 1)}
                                disabled={quantity <= 1}
                                className="Order-mobile-quantity-btn"
                                aria-label="Decrease quantity"
                            >
                                -
                            </button>
                            <span className="Order-mobile-quantity-display">{quantity}</span>
                            <button
                                onClick={() => handleQuantityChange(quantity + 1)}
                                disabled={quantity >= 5}
                                className="Order-mobile-quantity-btn"
                                aria-label="Increase quantity"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <motion.button
                        className="Order-mobile-place-button"
                        onClick={handlePlaceOrder}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Place Order
                    </motion.button>
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="Order-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="Order-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                        >
                            {modalType === 'waitingForSeller' && (
                                <div className="Order-modal-content">
                                    <h2 className="Order-modal-title">⏳ Waiting for Seller...</h2>
                                    <p className="Order-modal-message">Your order is being processed. The seller will respond within 1 minute.</p>
                                    <div className="Order-timer-container">
                                        {/* <CountdownTimer seconds={60} onComplete={() => { }} /> */}
                                        <CountdownTimer seconds={60} onComplete={handleSellerTimeout} />
                                    </div>
                                </div>
                            )}
                            {modalType === 'sellerResponse' && (
                                <div className="Order-modal-content">
                                    <h2 className="Order-modal-title">🎉 Order Accepted!</h2>
                                    <p className="Order-modal-message">
                                        The seller has accepted your order and estimates it will be ready in <span className="Order-wait-time">{waitingTime} minutes</span>.
                                    </p>
                                    <p className="Order-modal-submessage">Do you agree to wait?</p>
                                    <div className="Order-timer-container">
                                        <CountdownTimer seconds={60} onComplete={handleFoodieTimeout} />
                                    </div>
                                    <div className="Order-modal-actions">
                                        <button
                                            className="Order-modal-btn Order-modal-btn-decline"
                                            onClick={() => handleFoodieResponse(false)}
                                        >
                                            ❌ Decline
                                        </button>
                                        <button
                                            className="Order-modal-btn Order-modal-btn-agree"
                                            onClick={() => handleFoodieResponse(true)}
                                        >
                                            ✅ Agree
                                        </button>
                                    </div>
                                </div>
                            )}
                            {modalType === 'sellerRejected' && (
                                <div className="Order-modal-content">
                                    <h2 className="Order-modal-title">😕 Order Rejected</h2>
                                    <p className="Order-modal-message">
                                        The seller has rejected your order. This may be due to unavailability of the item or other reasons.
                                    </p>
                                    <button
                                        className="Order-modal-btn Order-modal-btn-close"
                                        onClick={() => {
                                            setShowModal(false);
                                            navigate('/menu');
                                        }}
                                    >
                                        🍽️ Back to Menu
                                    </button>
                                </div>
                            )}
                            {modalType === 'orderConfirmed' && (
                                <div className="Order-modal-content">
                                    <h2 className="Order-modal-title">🥳 Order Confirmed!</h2>
                                    <p className="Order-modal-message">
                                        Your order has been confirmed. Please approach the stall.
                                    </p>
                                    <div className="Order-token-container">
                                        <h3 className="Order-token-label">🎫 Your Token:</h3>
                                        <div className="Order-token-number">{orderToken}</div>
                                    </div>
                                    <button
                                        className="Order-modal-btn Order-modal-btn-close"
                                        onClick={() => {
                                            setShowModal(false);
                                            navigate('/menu');
                                        }}
                                    >
                                        👍 Close
                                    </button>
                                </div>
                            )}
                            {modalType === 'sellerTimeout' && (
                                <div className="Order-modal-content">
                                    <h2 className="Order-modal-title">⏰ Order Timed Out</h2>
                                    <p className="Order-modal-message">
                                        The seller did not respond in time. Your order has been cancelled.
                                    </p>
                                    <button
                                        className="Order-modal-btn Order-modal-btn-close"
                                        onClick={() => {
                                            setShowModal(false);
                                            navigate('/menu');
                                        }}
                                    >
                                        🍽️ Back to Menu
                                    </button>
                                </div>
                            )}
                            {modalType === 'foodieTimeout' && (
                                <div className="Order-modal-content">
                                    <h2 className="Order-modal-title">⏰ Response Timed Out</h2>
                                    <p className="Order-modal-message">
                                        You did not respond in time. Your order has been automatically cancelled.
                                    </p>
                                    <button
                                        className="Order-modal-btn Order-modal-btn-close"
                                        onClick={() => {
                                            setShowModal(false);
                                            navigate('/menu');
                                        }}
                                    >
                                        🍽️ Back to Menu
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Order;