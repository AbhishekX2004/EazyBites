import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, get, set } from 'firebase/database';
import { auth, db, database } from '../../firebaseConfig';
import Loader from '../../components/Loader/Loader';
import './FoodSeller.css';

const FoodSeller = () => {
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [vendorType, setVendorType] = useState('stall');

    useEffect(() => {
        const checkUserAndType = async (firebaseUser) => {
            if (!firebaseUser) {
                setLoading(false);
                navigate('/login');
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (!userDoc.exists()) {
                    setLoading(false);
                    navigate('/login');
                    return;
                } else if (userDoc.data().signupType !== 'Food Seller' && userDoc.data().signupType === 'Foodie') {
                    navigate('/foodie');
                    return;
                }

                // Check vendor type in the real-time database
                const vendorTypeRef = ref(database, `vendorType/${firebaseUser.uid}`);
                const vendorTypeSnapshot = await get(vendorTypeRef);
                
                if (vendorTypeSnapshot.exists()) {
                    const type = vendorTypeSnapshot.val();
                    setVendorType(type);
                }

                setUser({
                    uid: firebaseUser.uid,
                    username: userDoc.data().username,
                    ...userDoc.data()
                });
            } catch (error) {
                console.error("Error fetching user data:", error);
                navigate('/login');
            }
            setLoading(false);
        };

        const setTimeBasedGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting('Good Morning');
            else if (hour < 18) setGreeting('Good Afternoon');
            else setGreeting('Good Evening');
        };

        setTimeBasedGreeting();
        const unsubscribe = onAuthStateChanged(auth, checkUserAndType);

        return () => unsubscribe();
    }, [navigate]);

    const updateStallStatus = async (uid, status) => {
        try {
            const stallStatusRef = ref(database, `vendorStatus/${uid}`);
            await set(stallStatusRef, status);
            console.log(`${vendorType === 'shop' ? 'Cafe' : 'Stall'} status updated to ${status}`);
        } catch (error) {
            console.error(`Error updating ${vendorType === 'shop' ? 'cafe' : 'stall'} status:`, error);
        }
    };

    const handleLogout = async () => {
        try {
            if (user && user.uid) {
                // Update stall status to false in real-time database
                await updateStallStatus(user.uid, false);
            }
            
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const LogoutModal = () => (
        <motion.div
            className="foodSellerDash-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutModal(false)}
        >
            <motion.div
                className="foodSellerDash-modal"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <h2>Confirm Logout</h2>
                <p>Are you sure you want to logout?</p>
                <div className="foodSellerDash-modal-buttons">
                    <button
                        className="foodSellerDash-modal-button-cancel"
                        onClick={() => setShowLogoutModal(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="foodSellerDash-modal-button-confirm"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const tileVariants = {
        hidden: {
            opacity: 0,
            y: 20
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5
            }
        },
        hover: {
            scale: 1.05,
            boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
            transition: {
                duration: 0.3
            }
        }
    };

    if (loading) {
        return (
            <Loader />
        );
    }

    if (!user) return null;

    // Dynamic text based on vendor type
    const stallOrCafe = vendorType === 'shop' ? 'Cafe' : 'Stall';

    return (
        <div className="foodSellerDash-container">
            <AnimatePresence>
                {showLogoutModal && <LogoutModal />}
            </AnimatePresence>
            <div className="foodSellerDash-header">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {greeting}, {user.username}!
                </motion.h1>
            </div>

            <motion.div
                className="foodSellerDash-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="foodSellerDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => {
                        if (auth.currentUser) {
                            navigate(`/seller-edit-profile`);
                        }
                    }}
                >
                    <svg className="foodSellerDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span>Edit Profile</span>
                </motion.div>

                <motion.div
                    className="foodSellerDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => navigate('/my-stall')}
                >
                    <svg className="foodSellerDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                    </svg>
                    <span>My {stallOrCafe}</span>
                </motion.div>

                <motion.div
                    className="foodSellerDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => {
                        if (auth.currentUser) {
                            navigate(`/seller-menu`);
                        }
                    }}
                >
                    <svg className="foodSellerDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
                    </svg>
                    <span>My Menu</span>
                </motion.div>

                <motion.div
                    className="foodSellerDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => setShowLogoutModal(true)}
                >
                    <svg className="foodSellerDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                    </svg>
                    <span>Logout</span>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default FoodSeller;