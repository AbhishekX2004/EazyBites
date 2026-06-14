import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import Loader from '../../components/Loader/Loader';
import './Foodie.css';

const Foodie = () => {
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

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
                } else if (userDoc.data().signupType !== 'Foodie' && userDoc.data().signupType === 'Food Seller') {
                    navigate('/food-seller');
                    return;
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

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const LogoutModal = () => (
        <motion.div
            className="foodieDash-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogoutModal(false)}
        >
            <motion.div
                className="foodieDash-modal"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <h2>Confirm Logout</h2>
                <p>Are you sure you want to logout?</p>
                <div className="foodieDash-modal-buttons">
                    <button
                        className="foodieDash-modal-button-cancel"
                        onClick={() => setShowLogoutModal(false)}
                    >
                        Cancel
                    </button>
                    <button
                        className="foodieDash-modal-button-confirm"
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

    return (
        <div className="foodieDash-container">
            <AnimatePresence>
                {showLogoutModal && <LogoutModal />}
            </AnimatePresence>
            <div className="foodieDash-header">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {greeting}, {user.username}!
                </motion.h1>
            </div>

            <motion.div
                className="foodieDash-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="foodieDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => {
                        if (auth.currentUser) {
                           navigate(`/foodie-edit-profile`);
                        }
                    }}
                >
                    <svg className="foodieDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span>Edit Profile</span>
                </motion.div>

                <motion.div
                    className="foodieDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => navigate('/my-orders')}
                >
                    <svg className="foodieDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                    <span>My Orders</span>
                </motion.div>

                <motion.div
                    className="foodieDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => navigate('/menu')}
                >
                    <svg className="foodieDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
                    </svg>
                    <span>Menu</span>
                </motion.div>

                <motion.div
                    className="foodieDash-tile"
                    variants={tileVariants}
                    whileHover="hover"
                    onClick={() => setShowLogoutModal(true)}
                >
                    <svg className="foodieDash-icon" viewBox="0 0 24 24" width="24" height="24">
                        <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                    </svg>
                    <span>Logout</span>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Foodie;