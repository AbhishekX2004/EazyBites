import React, { useEffect, useRef, useState } from "react";
import Home from "./Home/Home";
import Menu from "../components/Menu/Menu"; 
import Loader from "../components/Loader/Loader";  // Import the Loader component
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const menuContentRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);  // Add loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userType = userDoc.data().signupType;
                    navigate(userType === "Foodie" ? "/foodie" : "/food-seller");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        }
        // Set loading to false after auth check completes regardless of result
        setLoading(false);
    });

    return () => unsubscribe();
}, [navigate]);

  useEffect(() => {
    const handleScrollToMenu = () => {
      if (menuContentRef.current) {
        menuContentRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    window.addEventListener("scrollToMenu", handleScrollToMenu);
    return () => window.removeEventListener("scrollToMenu", handleScrollToMenu);
  }, []);

  // Show loader while auth state is being determined
  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <Home />
      <Menu ref={menuContentRef} />
    </>
  );
};

export default Landing;