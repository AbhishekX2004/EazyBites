import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, get } from 'firebase/database';
import axios from 'axios';
import { auth, db, database } from '../../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import CategoryCard from './Category/CategoryCard';
import CategoryModal from './Category/CategoryModal';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';
import './MyMenu.css';

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
        <h3>No Categories Added Yet</h3>
        <p>Start adding categories using the + button below!</p>
    </motion.div>
);

const MyMenu = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [modalMode, setModalMode] = useState('add');
    const [vendorType, setVendorType] = useState(null);
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

                try {
                    const vendorTypeRef = ref(database, `vendorType/${user.uid}`);
                    const vendorTypeSnapshot = await get(vendorTypeRef);
                    
                    if (vendorTypeSnapshot.exists()) {
                        const vendorTypeValue = vendorTypeSnapshot.val();
                        setVendorType(vendorTypeValue);
                        console.log("VendorType: ", vendorTypeValue); // Use vendorTypeValue instead of vendorType state
                    } else {
                        console.log("No vendor type found in realtime database");
                        setVendorType(null);
                    }
                } catch (rtdError) {
                    console.error("Error fetching vendor type from realtime database:", rtdError);
                    setVendorType(null);
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

    const fetchCategories = async (isInitial = false) => {
        try {
            const response = await axios.get(
                `${API}/categories/${auth.currentUser.uid}?${lastDoc && !isInitial ? `lastDoc=${lastDoc}&` : ''}limit=10`
            );
            const data = response.data;

            setCategories(isInitial ? data.categories : [...categories, ...data.categories]);
            setLastDoc(data.lastDoc);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authState.isAuthenticated && authState.isAuthorized) {
            fetchCategories(true);
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [authState.isAuthenticated, authState.isAuthorized, authLoading]);

    const handleAddCategory = async (formData) => {
        try {
            if (vendorType === 'shop') {
                const categoryName = formData.categoryName.toLowerCase();
                console.log(categoryName);
                const restrictedNames = ['stall', 'stalls'];
                
                if (restrictedNames.includes(categoryName) || categoryName.includes('stall')) {
                    alert('Category name cannot be "stall", "stalls", or contain words with similar meaning.');
                    return;
                }
            }
            await axios.post(`${API}/categories/${auth.currentUser.uid}/add`, formData);
            setIsModalOpen(false);
            fetchCategories(true);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleEditCategory = async (formData) => {
        try {
            if (vendorType === 'shop') {
                const categoryName = formData.categoryName.toLowerCase();
                const restrictedNames = ['stall', 'stalls'];
                
                if (restrictedNames.includes(categoryName) || categoryName.includes('stall')) {
                    alert('Category name cannot be "stall", "stalls", or contain words with similar meaning.');
                    return;
                }
            }
            await axios.put(`${API}/categories/${auth.currentUser.uid}/update/${selectedCategory.id}`, formData);
            setIsModalOpen(false);
            setSelectedCategory(null);
            fetchCategories(true);
        } catch (error) {
            console.error('Error updating category:', error);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await axios.delete(`${API}/categories/${auth.currentUser.uid}/delete/${categoryId}`);
                fetchCategories(true);
            } catch (error) {
                console.error('Error deleting category:', error);
            }
        }
    };

    const handleCategoryClick = (category) => {
        navigate(`/my-menu/category/${category.id}`);
        console.log('Clicked category:', category);
    };

    const openAddModal = () => {
        if (vendorType === 'stall' && categories.length > 0) {
            alert('Stalls can only have one category. You cannot add more categories.');
            return;
        }
        setModalMode('add');
        setSelectedCategory(null);
        setIsModalOpen(true);
    };

    const openEditModal = (category) => {
        setModalMode('edit');
        setSelectedCategory(category);
        setIsModalOpen(true);
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
                <h1>Your Categories</h1>
                <p className="MyMenu-header-subtitle">Manage your food categories</p>
            </motion.header>
            {loading ? (
                <Loader />
            ) : (
                <>
                    {categories.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="MyMenu-grid">
                            <AnimatePresence>
                                {categories.map(category => (
                                    <CategoryCard
                                        key={category.id}
                                        category={category}
                                        onEdit={openEditModal}
                                        onDelete={handleDeleteCategory}
                                        onClick={() => handleCategoryClick(category)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {hasMore && (
                        <motion.button
                            className="MyMenu-load-more"
                            onClick={() => fetchCategories()}
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
                        <span className="MyMenu-add-text">Add category</span>
                    </motion.button>

                    <CategoryModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedCategory(null);
                        }}
                        onSubmit={modalMode === 'add' ? handleAddCategory : handleEditCategory}
                        category={selectedCategory}
                        mode={modalMode}
                        vendorType={vendorType}
                    />
                </>
            )}
        </div>
    );
};

export default MyMenu;