import React from "react";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import FoodSeller from "./pages/FoodSeller/FoodSeller";
import Foodie from "./pages/Foodie/Foodie";
import EditProfileFoodie from "./pages/Foodie/EditProfile";
import EditProfileSeller from "./pages/FoodSeller/EditProfile";
import MyMenu from "./pages/FoodSeller/MyMenu";
import TermsAndConditions from "./pages/TermsAndConditions/TC";
import PrivacyPolicy from "./pages/PrivacyPolicy/PrivacyPolicy"; 
import MyStall from "./pages/FoodSeller/MyStall";
import Menu from "./pages/Foodie/Menu";
import Order from "./pages/Order/Order";
import MyOrders from "./pages/Foodie/MyOrders";
import MyCategoryMenu from "./pages/FoodSeller/Category/MyCategoryMenu";

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="content-wrapper">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/food-seller" element={<FoodSeller />} />
            <Route path="/foodie" element={<Foodie />} />
            <Route path="/foodie-edit-profile" element={<EditProfileFoodie />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/seller-edit-profile" element={<EditProfileSeller />} />
            <Route path="/seller-menu" element={<MyMenu />} />
            <Route path="/my-stall" element={<MyStall />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/order" element={<Order />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/my-menu/category/:cid" element={<MyCategoryMenu />} />
          </Routes>
        </div>
        <div className="footer-wrapper">
          <Footer />
        </div>
      </div>
    </Router>
  );
}

export default App;