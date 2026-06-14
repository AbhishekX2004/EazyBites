import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ref, update, get, onValue, remove } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import { database, db } from "../../firebaseConfig";
import { FaCheck, FaTimes, FaClock, FaUtensils, FaCheckCircle, FaHourglassHalf } from "react-icons/fa";
import CountdownTimer from "./CountdownTimer";
import WaitTimeModal from "./WaitTimeModal";

const OrderCard = ({ order, onStatusChange }) => {
    const [showWaitTimeModal, setShowWaitTimeModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showTimer, setShowTimer] = useState(false);
    const [foodieResponseTimer, setFoodieResponseTimer] = useState(60);
    const [currentStatus, setCurrentStatus] = useState(order.status);

    const sellerTimeoutRef = useRef(null);
    const foodieTimeoutRef = useRef(null);

    // Helper function to cleanup order from Realtime Database
    const cleanupRealTimeOrder = async (orderId) => {
        try {
            const orderRef = ref(database, `orders/${orderId}`);
            await remove(orderRef);
            console.log(`Order ${orderId} removed from Realtime Database`);
        } catch (error) {
            console.error("Error removing order from Realtime Database:", error);
        }
    };

    useEffect(() => {
        const orderRef = ref(database, `orders/${order.id}`);
        const unsubscribe = onValue(orderRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.status !== currentStatus) {
                setCurrentStatus(data.status);
                if (sellerTimeoutRef.current) {
                    clearTimeout(sellerTimeoutRef.current);
                    sellerTimeoutRef.current = null;
                }
                if (foodieTimeoutRef.current) {
                    clearTimeout(foodieTimeoutRef.current);
                    foodieTimeoutRef.current = null;
                }
                
                // Check if new status is a terminal status and cleanup from Realtime DB
                if (["timeoutSeller", "timeoutFoodie", "foodieDeclined", "completed", "rejected", "cancelled"].includes(data.status)) {
                    cleanupRealTimeOrder(order.id);
                }
            }
        });

        return () => unsubscribe();
    }, [order.id, currentStatus]);

    useEffect(() => {
        if (sellerTimeoutRef.current) {
            clearTimeout(sellerTimeoutRef.current);
            sellerTimeoutRef.current = null;
        }

        if (currentStatus === "created") {
            const orderTime = new Date(order.timestamp);
            const currentTime = new Date();
            const timeDiff = (currentTime - orderTime) / 1000;

            if (timeDiff < 60) {
                setShowTimer(true);
                const timeoutDelay = Math.max(0, 60 - timeDiff) * 1000;
                sellerTimeoutRef.current = setTimeout(() => {
                    handleSellerTimeout();
                }, timeoutDelay);
            } else {
                handleSellerTimeout();
            }
        } else {
            setShowTimer(false);
        }

        return () => {
            if (sellerTimeoutRef.current) {
                clearTimeout(sellerTimeoutRef.current);
                sellerTimeoutRef.current = null;
            }
        };
    }, [currentStatus, order.timestamp]);

    useEffect(() => {
        if (foodieTimeoutRef.current) {
            clearTimeout(foodieTimeoutRef.current);
            foodieTimeoutRef.current = null;
        }

        if (currentStatus === "accepted") {
            const acceptedTime = order.acceptedTimestamp ? new Date(order.acceptedTimestamp) : new Date();
            const currentTime = new Date();
            const elapsedSeconds = Math.floor((currentTime - acceptedTime) / 1000);
            const remainingSeconds = Math.max(0, 60 - elapsedSeconds);

            setFoodieResponseTimer(remainingSeconds);
            setShowTimer(true);

            foodieTimeoutRef.current = setTimeout(() => {
                handleFoodieTimeout();
            }, remainingSeconds * 1000);
        } else if (currentStatus !== "created") {
            setShowTimer(false);
        }

        return () => {
            if (foodieTimeoutRef.current) {
                clearTimeout(foodieTimeoutRef.current);
                foodieTimeoutRef.current = null;
            }
        };
    }, [currentStatus, order.acceptedTimestamp]);

    const handleSellerTimeout = async () => {
        try {
            const orderRef = ref(database, `orders/${order.id}`);
            const snapshot = await get(orderRef);
            const dbData = snapshot.val();

            if (!dbData || dbData.status !== "created") return;

            setIsUpdating(true);
            await update(orderRef, { status: "timeoutSeller" });
            await updateDoc(doc(db, "users", order.uid, "orders", order.userOrderId), {
                status: "timeoutSeller"
            });
            await updateDoc(doc(db, "orders", order.id), {
                status: "timeoutSeller"
            });

            setCurrentStatus("timeoutSeller");
            onStatusChange(order.id, "timeoutSeller");
            
            // Clean up from Realtime Database
            await cleanupRealTimeOrder(order.id);
        } catch (error) {
            console.error("Error handling seller timeout:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFoodieTimeout = async () => {
        try {
            const orderRef = ref(database, `orders/${order.id}`);
            const snapshot = await get(orderRef);
            const dbData = snapshot.val();

            if (!dbData || dbData.status !== "accepted") return;

            setIsUpdating(true);
            await update(orderRef, { status: "timeoutFoodie" });
            await updateDoc(doc(db, "users", order.uid, "orders", order.userOrderId), {
                status: "timeoutFoodie"
            });
            await updateDoc(doc(db, "orders", order.id), {
                status: "timeoutFoodie"
            });

            setCurrentStatus("timeoutFoodie");
            onStatusChange(order.id, "timeoutFoodie");
            
            // Clean up from Realtime Database
            await cleanupRealTimeOrder(order.id);
        } catch (error) {
            console.error("Error handling foodie timeout:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAccept = () => {
        setShowWaitTimeModal(true);
    };

    const handleReject = async () => {
        try {
            setIsUpdating(true);
            await update(ref(database, `orders/${order.id}`), { status: "rejected" });
            await updateDoc(doc(db, "users", order.uid, "orders", order.userOrderId), {
                status: "rejected"
            });
            await updateDoc(doc(db, "orders", order.id), {
                status: "rejected"
            });

            setCurrentStatus("rejected");
            onStatusChange(order.id, "rejected");
            
            // Clean up from Realtime Database
            await cleanupRealTimeOrder(order.id);
        } catch (error) {
            console.error("Error rejecting order:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleWaitTimeSubmit = async (waitTimeValue) => {
        try {
            setIsUpdating(true);
            const acceptedTimestamp = new Date();

            await update(ref(database, `orders/${order.id}`), {
                status: "accepted",
                waitingTime: waitTimeValue,
                acceptedTimestamp: acceptedTimestamp
            });
            await updateDoc(doc(db, "users", order.uid, "orders", order.userOrderId), {
                status: "accepted",
                waitingTime: waitTimeValue,
                acceptedTimestamp: acceptedTimestamp
            });
            await updateDoc(doc(db, "orders", order.id), {
                status: "accepted",
                waitingTime: waitTimeValue,
                acceptedTimestamp: acceptedTimestamp
            });

            setCurrentStatus("accepted");
            onStatusChange(order.id, "accepted", waitTimeValue, acceptedTimestamp);
            setShowWaitTimeModal(false);
        } catch (error) {
            console.error("Error accepting order:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartCooking = async () => {
        try {
            setIsUpdating(true);
            await update(ref(database, `orders/${order.id}`), { status: "cooking" });
            await updateDoc(doc(db, "users", order.uid, "orders", order.userOrderId), {
                status: "cooking"
            });
            await updateDoc(doc(db, "orders", order.id), {
                status: "cooking"
            });

            setCurrentStatus("cooking");
            onStatusChange(order.id, "cooking");
        } catch (error) {
            console.error("Error updating cooking status:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCompleteOrder = async () => {
        try {
            setIsUpdating(true);
            await update(ref(database, `orders/${order.id}`), { 
                status: "completed",
                completedAt: new Date()
            });
            await updateDoc(doc(db, "users", order.uid, "orders", order.userOrderId), {
                status: "completed",
                completedAt: new Date()
            });
            await updateDoc(doc(db, "orders", order.id), {
                status: "completed",
                completedAt: new Date()
            });

            setCurrentStatus("completed");
            onStatusChange(order.id, "completed");
            
            // Clean up from Realtime Database
            await cleanupRealTimeOrder(order.id);
        } catch (error) {
            console.error("Error completing order:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const renderToken = () => {
        if (order.token) {
            return (
                <div className="order-token">
                    <span className="token-label">Token:</span>
                    <span className="token-number">{order.token}</span>
                </div>
            );
        }
        return null;
    };

    const renderOrderStatus = () => {
        switch (currentStatus) {
            case "created":
                return (
                    <div className="order-actions">
                        {showTimer && (
                            <CountdownTimer seconds={getRemainingTime()} onComplete={() => {}} />
                        )}
                        <motion.button
                            className="action-btn accept-btn"
                            onClick={handleAccept}
                            disabled={isUpdating}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaCheck /> Accept
                        </motion.button>
                        <motion.button
                            className="action-btn reject-btn"
                            onClick={handleReject}
                            disabled={isUpdating}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaTimes /> Reject
                        </motion.button>
                    </div>
                );
            case "accepted":
                return (
                    <div className="order-actions">
                        {showTimer && (
                            <CountdownTimer seconds={foodieResponseTimer} onComplete={() => {}} />
                        )}
                        <div className="order-cooking-section">
                            <div className="order-wait-time">
                                <FaClock /> Wait time: {order.waitingTime} min
                            </div>
                            <div className="waiting-for-foodie">
                                <FaHourglassHalf /> Waiting for foodie to agree
                            </div>
                        </div>
                    </div>
                );
            case "cooking":
                return (
                    <div className="order-cooking-section">
                        <div className="order-status cooking">
                            <FaUtensils /> Cooking | {renderToken()}
                        </div>
                        <motion.button
                            className="action-btn complete-btn"
                            onClick={handleCompleteOrder}
                            disabled={isUpdating}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaCheckCircle /> Complete Order
                        </motion.button>
                    </div>
                );
            case "foodieAgreed":
                return (
                    <div className="order-cooking-section">
                        {renderToken()}
                        <motion.button
                            className="action-btn cooking-btn"
                            onClick={handleStartCooking}
                            disabled={isUpdating}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaUtensils /> Start Cooking
                        </motion.button>
                    </div>
                );
            case "timeoutSeller":
            case "timeoutFoodie":
            case "completed":
            case "foodieDeclined":
            case "rejected":
            case "cancelled":
                return null;
            default:
                return <div className="order-status">Status: {currentStatus}</div>;
        }
    };

    const getRemainingTime = () => {
        if (currentStatus !== "created") return 0;

        const orderTime = new Date(order.timestamp);
        const currentTime = new Date();
        const elapsedSeconds = Math.floor((currentTime - orderTime) / 1000);
        return Math.max(0, 60 - elapsedSeconds);
    };

    if (["timeoutSeller", "timeoutFoodie", "foodieDeclined", "completed", "rejected", "cancelled"].includes(currentStatus)) {
        return null;
    }

    return (
        <motion.div
            className="order-card"
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
        >
            <div className="order-info">
                <h3 className="order-item-name">{order.itemName}</h3>
                <div className="order-details">
                    <span className="order-quantity">Qty: {order.quantity}</span>
                    <span className="order-cost">₹{order.totalCost}</span>
                </div>
                <div className="order-timestamp">
                    {new Date(order.timestamp).toLocaleTimeString()}
                </div>
            </div>

            {renderOrderStatus()}

            <AnimatePresence>
                {showWaitTimeModal && (
                    <WaitTimeModal
                        onClose={() => setShowWaitTimeModal(false)}
                        onConfirm={handleWaitTimeSubmit}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default OrderCard;