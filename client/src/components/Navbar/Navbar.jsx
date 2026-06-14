import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ref, get } from "firebase/database";
import { db, database } from "../../firebaseConfig";
import "./Navbar.css";
import { useScrollNavigation } from '../../hooks/useScrollNavigation';

const Navbar = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const { navigateAndScroll } = useScrollNavigation();

  const [user, setUser] = useState(null);
  const [signupType, setSignupType] = useState(null);
  const [photoURL, setPhotoURL] = useState("");
  const [vendorType, setVendorType] = useState("stall"); // Default to 'stall'

  const dummyPhoto = "images/dummy-user-image.jpg";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setPhotoURL(currentUser.photoURL || dummyPhoto);
  
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSignupType(userData.signupType);
          
          // Check vendor type if user is a Food Seller
          if (userData.signupType === "Food Seller") {
            try {
              const vendorTypeRef = ref(database, `vendorType/${currentUser.uid}`);
              const vendorTypeSnapshot = await get(vendorTypeRef);
              
              if (vendorTypeSnapshot.exists()) {
                const type = vendorTypeSnapshot.val();
                setVendorType(type);
              }
            } catch (error) {
              console.error("Error fetching vendor type:", error);
            }
          }
  
          // Force a state update to trigger re-render of profile pic
          setTimeout(() => {
            setPhotoURL(userData.photoURL || dummyPhoto);
          }, 100); 
        }
      } else {
        setUser(null);
        setSignupType(null);
        setPhotoURL(dummyPhoto);
        setVendorType("stall"); // Reset to default
      }
    });
  
    return () => unsubscribe();
  }, [auth]);
  
  const handleLogoClick = () => {
    if (!user) {
      navigate("/");
    } else {
      navigate(signupType === "Foodie" ? "/foodie" : "/food-seller");
    }
  };

  const handleAboutUsClick = () => {
    navigateAndScroll('/', 'Menu');
  };

  // Dynamic text based on vendor type
  const stallOrCafe = vendorType === 'shop' ? 'Cafe' : 'Stall';

  return (
    <nav className="nav-container">
      <div className="nav-left" >
        <img src="images/EazyBites.png" className="nav-name" alt="logo" onClick={handleLogoClick} style={{ cursor: "pointer" }} />
      </div>
      <div className="nav-center" >
        <img src="logo.png" alt="Logo" className="nav-logo" onClick={handleLogoClick} style={{ cursor: "pointer" }} />
      </div>
      <div className="nav-right">
        {user ? (
          <>
            <button className="nav-dashboard" onClick={() => navigate(signupType === "Foodie" ? "/foodie" : "/food-seller")}>
              <img src={photoURL} alt="User" className="nav-profile-pic" referrerPolicy="no-referrer" />
            </button>
            <button
              className="nav-button"
              onClick={() => navigate(signupType === "Foodie" ? "/my-orders" : "/my-stall")}
            >
              {signupType === "Foodie" ? "My Orders" : `My ${stallOrCafe}`}
            </button>
          </>
        ) : (
          <>
            <button className="nav-button" onClick={handleAboutUsClick}>
              Our Menu
            </button>
            <button className="nav-button" onClick={() => navigate("/login")}>Login</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;