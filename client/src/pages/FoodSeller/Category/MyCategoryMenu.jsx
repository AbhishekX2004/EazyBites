import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { auth, db } from '../../../firebaseConfig';
import FoodCard from '../FoodCard';
import FoodModal from '../FoodModal';
import Loader from '../../../components/Loader/Loader';
import UnauthorizedPage from '../../Unauthorized/Unauthorized';
import '../MyMenu.css';

// API URL
const API = process.env.REACT_APP_API;

// Empty State Component
const EmptyState = () => (
    <motion.div
        className="MyMenu-empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <h3>No Items in This Category Yet</h3>
        <p>Start adding items to this category using the + button below!</p>
    </motion.div>
);

const MyCategoryMenu = () => {
    const { cid } = useParams(); // Get category ID from URL
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [modalMode, setModalMode] = useState('add');
    const [categoryName, setCategoryName] = useState('');
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        isAuthorized: false,
        authError: null,
        userData: null
    });

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

                // Check if user is a Food Seller
                if (userData.signupType !== "Food Seller") {
                    setAuthState({
                        isAuthenticated: true,
                        isAuthorized: false,
                        authError: {
                            title: "Not Authorized",
                            message: "This page is only accessible to Food Sellers.",
                            returnPath: userData.signupType === "Foodie" ? "/foodie" : "/",
                            returnText: userData.signupType === "Foodie" ? "Go to Foodie Dashboard" : "Go to Home"
                        },
                        userData
                    });
                    setAuthLoading(false);
                    return;
                }

                // Check if seller has set stallName
                if (!userData.stallName) {
                    setAuthState({
                        isAuthenticated: true,
                        isAuthorized: false,
                        authError: {
                            title: "Profile Incomplete",
                            message: "Please set your stall name before accessing this page.",
                            returnPath: "/seller-edit-profile",
                            returnText: "Complete Your Profile"
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
    }, []);

    const fetchCategoryItems = async (isInitial = false) => {
        try {
            const response = await axios.get(
                `${API}/categories/${auth.currentUser.uid}/${cid}/items`, {
                    params: {
                        limit: 10,
                        lastDocId: isInitial ? null : lastDoc
                    }
                }
            );
            const data = response.data;
    
            // Fetch category name if it's the first load
            if (isInitial && data.categoryName) {
                setCategoryName(data.categoryName);
            }
    
            setItems(isInitial ? data.items : [...items, ...data.items]);
            setLastDoc(data.lastDoc);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error fetching category items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authState.isAuthenticated && authState.isAuthorized) {
            fetchCategoryItems(true);
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [authState.isAuthenticated, authState.isAuthorized, authLoading]);

    const handleAddItem = async (formData) => {
        try {
            // Include category ID when adding an item
            await axios.post(`${API}/categories/${auth.currentUser.uid}/items/${cid}/add`, formData);
            setIsModalOpen(false);
            fetchCategoryItems(true);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleEditItem = async (formData) => {
        try {
            // await axios.put(`${API}/categories/${auth.currentUser.uid}/items/${cid}/update/${selectedItem.fid}`, formData);
            await axios.put(`${API}/seller/${auth.currentUser.uid}/update/${cid}/${selectedItem.fid}`, formData);
            setIsModalOpen(false);
            setSelectedItem(null);
            fetchCategoryItems(true);
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleDeleteItem = async (fid) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await axios.delete(`${API}/seller/${auth.currentUser.uid}/item/${cid}/${fid}`);
                fetchCategoryItems(true);
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    const openAddModal = () => {
        setModalMode('add');
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = async (item) => {
        try {
            // Fetch complete item details before opening modal
            const response = await axios.get(`${API}/seller/${auth.currentUser.uid}/items/${cid}/${item.id}`);
            setModalMode('edit');
            setSelectedItem(response.data);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching item details:', error);
            alert('Failed to load item details. Please try again.');
        }
    };

    const handleModalSubmit = (formData) => {
        if (modalMode === 'add') {
            handleAddItem(formData);
        } else {
            handleEditItem(formData);
        }
    };

    if (authLoading) {
        return <Loader />;
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

    return (
        <div className="MyMenu-container">
            <motion.header
                className="MyMenu-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1>{categoryName} Items</h1>
                <p className="MyMenu-header-subtitle">Manage items in this category</p>
            </motion.header>
            {loading ? (
                <Loader />
            ) : (
                <>
                    {items.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="MyMenu-grid">
                            <AnimatePresence>
                                {items.map(item => (
                                    <FoodCard
                                        key={item.fid}
                                        item={item}
                                        onEdit={openEditModal}
                                        onDelete={handleDeleteItem}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {hasMore && (
                        <motion.button
                            className="MyMenu-load-more"
                            onClick={() => fetchCategoryItems()}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Load More
                        </motion.button>
                    )}

                    <motion.button
                        className="MyMenu-add-button"
                        onClick={openAddModal}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <span className="MyMenu-add-icon">+</span>
                        <span className="MyMenu-add-text">Add food item</span>
                    </motion.button>

                    <FoodModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedItem(null);
                        }}
                        onSubmit={handleModalSubmit}
                        foodItem={selectedItem}
                        mode={modalMode}
                        categoryId={cid}
                    />
                </>
            )}
        </div>
    );
};

export default MyCategoryMenu;