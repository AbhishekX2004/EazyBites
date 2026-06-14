import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
    signInWithPopup,
    GoogleAuthProvider,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./Signup.css";
import { useNavigate, Link } from "react-router-dom";

const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: (response) => {
                // console.log("Recaptcha resolved:", response);
            },
        });
    }
};

const Signup = () => {
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
    const [searchParams] = useSearchParams();
    const [signupType, setSignupType] = useState("Foodie");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [timer, setTimer] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [userExists, setUserExists] = useState(false);
    const provider = new GoogleAuthProvider();

    useEffect(() => {
        const type = searchParams.get("type");
        if (type === "Foodie" || type === "Food Seller") {
            setSignupType(type);
        }
    }, [searchParams]);

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

    const checkUserExists = async (uid) => {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        return userSnap.exists();
    };

    const saveUserToFirestore = async (user, isGoogleSignup) => {
        const exists = await checkUserExists(user.uid);
        if (exists) {
            setUserExists(true);
            await auth.signOut();
            console.log("User Already exists.");
            alert("Account already exists. Redirecting to Login...");
            navigate("/login");
            return;
        }

        const userDoc = isGoogleSignup
            ? {
                email: user.email || "",
                displayName: user.displayName || "",
                photoURL: user.photoURL || "",
                signupType: signupType,
                username: username.trim() || user.displayName || "Anonymous User",
                createdAt: user.metadata.creationTime,
                changeCounters: {
                    email: 1,
                    phoneNumber: 0,
                },
            }
            : {
                phoneNumber: user.phoneNumber || "",
                signupType: signupType,
                username: username.trim() || "Anonymous User",
                createdAt: new Date(),
                changeCounters: {
                    email: 0,
                    phoneNumber: 1,
                },
            };
        await setDoc(doc(db, "users", user.uid), userDoc);
        navigate(signupType === "Foodie" ? "/foodie" : "/food-seller");
    };

    const handleGoogleSignup = async () => {
        if (!acceptedTerms) {
            alert("Please accept the Terms and Conditions");
            return;
        }

        try {
            const result = await signInWithPopup(auth, provider);
            const exists = await checkUserExists(result.user.uid);
            if (exists) {
                console.log("Google account already exists. Redirecting to login...");
                await auth.signOut(); // Force logout
                alert("Account already exists. Redirecting to Login...");
                navigate("/login");
                return;
            }
            await saveUserToFirestore(result.user, true);
        } catch (error) {
            console.error("Google Signup Error:", error);
        }
    };

    const sendOTP = async () => {
        if (!phone) {
            alert("Please enter a valid phone number");
            return;
        }
        if (!acceptedTerms) {
            alert("Please accept the Terms and Conditions");
            return;
        }

        setIsButtonDisabled(true);

        try {
            setupRecaptcha(); // Ensure reCAPTCHA is properly set
            const appVerifier = window.recaptchaVerifier;
            const formattedPhone = `+${phone}`;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setIsVerifying(true);
            setTimer(60);
            console.log("OTP sent successfully");
        } catch (error) {
            console.error("Phone Signup Error:", error);
            alert("Error sending OTP. Please try again.");
            setIsButtonDisabled(false);
        }
    };

    const handlePhoneSignup = async () => {
        await sendOTP();
    };

    const handleResendOTP = async () => {
        if (timer > 0) return; // Prevent multiple clicks

        setIsButtonDisabled(true);

        try {
            setupRecaptcha(); // Ensure fresh reCAPTCHA instance
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

    const verifyOtp = async () => {
        if (!otp) {
            alert("Please enter the OTP");
            return;
        }

        try {
            const result = await confirmationResult.confirm(otp);
            const exists = await checkUserExists(result.user.uid);
            if (exists) {
                console.log("Phone account already exists. Redirecting to login...");
                await auth.signOut(); // Force Logout
                alert("Account already exists. Redirecting to Login...");
                navigate("/login");
                return;
            }
            await saveUserToFirestore(result.user, false);
            console.log("Phone User:", result.user);
        } catch (error) {
            console.error("OTP Verification Error:", error);
            alert("Invalid OTP. Please try again.");
        }
    };

    return (
        <div className="signup-container">
            <h2 className="signup-title">Signup as {signupType}</h2>
            {userExists ? (
                <div className="signup-prompt">
                    <p>This account already exists. Please log in instead.</p>
                    <button className="signup-btn" onClick={() => navigate("/login")}>
                        Go to Login
                    </button>
                </div>
            ) : (
                <>
                    <div className="signup-input-container">
                        <input
                            className="signup-input"
                            type="text"
                            placeholder="Enter username (Optional)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isVerifying}
                        />
                    </div>

                    <div className="signup-type-selector">
                        <label className="signup-type-label">
                            <input
                                className="signup-type-radio"
                                type="radio"
                                name="signupType"
                                value="Foodie"
                                checked={signupType === "Foodie"}
                                onChange={() => setSignupType("Foodie")}
                                disabled={isVerifying}
                            />
                            Foodie
                        </label>
                        <label className="signup-type-label">
                            <input
                                className="signup-type-radio"
                                type="radio"
                                name="signupType"
                                value="Food Seller"
                                checked={signupType === "Food Seller"}
                                onChange={() => setSignupType("Food Seller")}
                                disabled={isVerifying}
                            />
                            Food Seller
                        </label>
                    </div>


                    {!isVerifying && (
                        <>
                            <div className="signup-phone-container">
                                <PhoneInput
                                    country={'in'}
                                    value={phone}
                                    onChange={setPhone}
                                    inputClass="signup-input"
                                    containerClass="phone-input-container"
                                    buttonClass="country-dropdown"
                                    placeholder="Enter phone number"
                                    disabled={isVerifying}
                                />
                                <button
                                    className="signup-submit-btn"
                                    onClick={handlePhoneSignup}
                                    disabled={isButtonDisabled}
                                >
                                    Send OTP
                                </button>
                            </div>
                            <div>
                                <p className="signup-or-divider" id="or">OR</p>
                            </div>
                            <button
                                className="signup-google-btn"
                                onClick={handleGoogleSignup}
                                disabled={isVerifying}
                            >
                                <img src="/images/googleLogo.png" alt="Google logo" className="google-logo" />
                                Sign Up with Google
                            </button>
                        </>
                    )}
                    <div className="terms-container">
                        <label className="terms-label">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                disabled={isVerifying}
                            />
                            I accept the &nbsp;
                            <Link to="/terms-and-conditions" className="terms-link">
                                Terms and Conditions
                            </Link>
                            &nbsp;and the&nbsp; 
                            <Link to="/privacy-policy" className="terms-link">
                                Privacy Policy
                            </Link>
                        </label>
                    </div>

                    {isVerifying && (
                        <div className="signup-otp-container">
                            <input
                                className="signup-input"
                                type="text"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                            />
                            <button
                                className="signup-submit-btn"
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
                    <div className="signup-login-container">
                        <p className="signup-login-text">Already have an account?</p>
                        <button className="signup-login-btn" onClick={() => navigate("/login")}>Login</button>
                    </div>
                </>
            )}

            <div id="recaptcha-container"></div>
        </div>
    );
};

export default Signup;
