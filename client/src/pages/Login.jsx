import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    signInWithPopup,
    GoogleAuthProvider,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./Login.css";

const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: (response) => {
                console.log("Recaptcha resolved:", response);
            },
        });
    }
};

const Login = () => {
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
        });
    
        return () => unsubscribe();
    }, []);

    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [timer, setTimer] = useState(0);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [showSignupPrompt, setShowSignupPrompt] = useState(false);
    const [signupUser, setSignupUser] = useState(null);
    const provider = new GoogleAuthProvider();

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);
        } else {
            setIsButtonDisabled(false);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const redirectToDashboard = async (user) => {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userType = userData.signupType;

                if (userType === "Foodie") {
                    navigate("/foodie");
                } else if (userType === "Food Seller") {
                    navigate("/food-seller");
                } else {
                    console.error("Invalid signup type:", userType);
                    navigate("/login");
                }
            } else {
                // If user does not exist, show signup prompt
                await user.delete();
                console.log("Unauthorized login attempt detected. Account deleted.");
                setSignupUser(null);
                setShowSignupPrompt(true);
            }
        } catch (error) {
            console.error("Error checking user:", error);
        }
    };

    const handleSignup = (type) => {
        navigate(`/signup?type=${type}`);
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            await redirectToDashboard(result.user);
        } catch (error) {
            console.error("Google Login Error:", error);
        }
    };

    const sendOTP = async () => {
        if (!phone) {
            alert("Please enter a valid phone number");
            return;
        }

        setIsButtonDisabled(true);

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            const formattedPhone = `+${phone}`;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setIsVerifying(true);
            setTimer(60);
            console.log("OTP sent successfully");
        } catch (error) {
            console.error("Phone Login Error:", error);
            alert("Error sending OTP. Please try again.");
            setIsButtonDisabled(false);
        }
    };

    const verifyOtp = async () => {
        if (!otp) {
            alert("Please enter the OTP");
            return;
        }

        try {
            const result = await confirmationResult.confirm(otp);
            await redirectToDashboard(result.user);
        } catch (error) {
            console.error("OTP Verification Error:", error);
            alert("Invalid OTP. Please try again.");
        }
    };

    const handleResendOTP = async () => {
        if (timer > 0) return;
        setIsButtonDisabled(true);

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            const formattedPhone = `+${phone}`;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

            setConfirmationResult(confirmation);
            setIsVerifying(true);
            setTimer(60);
            console.log("OTP resent successfully");
        } catch (error) {
            console.error("Resend OTP Error:", error);
            alert("Error resending OTP. Please try again.");
        }

        setIsButtonDisabled(false);
    };

    return (
        <div className="login-container">
            <h2 className="login-title">Login</h2>
            {!showSignupPrompt ? (
                <>
                    {!isVerifying && (
                        <>
                            <div className="login-phone-container">
                                <PhoneInput
                                    country={'in'}
                                    value={phone}
                                    onChange={setPhone}
                                    inputClass="login-input"
                                    containerClass="phone-input-container"
                                    buttonClass="country-dropdown"
                                    placeholder="Enter phone number"
                                />
                                <button
                                    className="login-submit-btn"
                                    onClick={sendOTP}
                                    disabled={isButtonDisabled}
                                >
                                    Send OTP
                                </button>
                            </div>
                            <div>
                                <p className="login-or-divider" id="or">OR</p>
                            </div>
                            <button
                                className="login-google-btn"
                                onClick={handleGoogleLogin}
                            >
                                <img src="/images/googleLogo.png" alt="Google logo" className="google-logo" />
                                Login with Google
                            </button>

                            <div className="login-signup-section">
                                <p>Don't have an account?</p>
                                <div className="login-signup-buttons">
                                    <button
                                        className="login-hero-button"
                                        onClick={() => handleSignup("Foodie")}
                                    >
                                        Signup as Foodie
                                    </button>
                                    <button
                                        className="login-hero-button"
                                        onClick={() => handleSignup("Food Seller")}
                                    >
                                        Signup as Food Seller
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {isVerifying && (
                        <div className="login-otp-container">
                            <input
                                className="login-input"
                                type="text"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                            />
                            <button
                                className="login-submit-btn"
                                onClick={verifyOtp}
                                disabled={otp.length !== 6}
                            >
                                Verify OTP
                            </button>
                            {timer > 0 ? (
                                <div className="timer">Resend OTP in {timer}s</div>
                            ) : (
                                <button
                                    className="resend-btn"
                                    onClick={handleResendOTP}
                                    disabled={isButtonDisabled}
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="signup-prompt">
                    <p>You don't have an account yet. Please sign up first.</p>
                    <button className="signup-btn" onClick={() => navigate("/signup?type=Foodie")}>
                        Signup as Foodie
                    </button>
                    <button className="signup-btn" onClick={() => navigate("/signup?type=Food Seller")}>
                        Signup as Food Seller
                    </button>
                </div>
            )}

            <div id="recaptcha-container"></div>
        </div>
    );
};

export default Login;