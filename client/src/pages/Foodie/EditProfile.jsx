import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import PhoneInput from 'react-phone-input-2';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth, db } from '../../firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Loader from '../../components/Loader/Loader';
import UnauthorizedPage from '../Unauthorized/Unauthorized';
import './EditProfile.css';

const API = process.env.REACT_APP_API;

const EditProfile = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    photoURL: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [originalPhone, setOriginalPhone] = useState('');
  const [isPhoneChanged, setIsPhoneChanged] = useState(false);
  const [changeCounters, setChangeCounters] = useState({ email: 0, phoneNumber: 0 });
  const [uploadProgress, setUploadProgress] = useState({});
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
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

        // Check if user is a Foodie
        if (userData.signupType !== "Foodie") {
          setAuthState({
            isAuthenticated: true,
            isAuthorized: false,
            authError: {
              title: "Not Authorized",
              message: "This page is only accessible to Foodies.",
              returnPath: userData.signupType === "Food Seller" ? "/seller-edit-profile" : "/",
              returnText: userData.signupType === "Food Seller" ? "Go to Seller Profile" : "Go to Home"
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

        // Fetch detailed user data for the form
        fetchUserData(user.uid);

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

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const fetchUserData = async (uid) => {
    try {
      const response = await axios.get(`${API}/users/${uid}`);
      setFormData(response.data);
      setOriginalPhone(response.data.phoneNumber);
      setChangeCounters(response.data.changeCounters || { email: 0, phoneNumber: 0 });
      setLoading(false);
    } catch (err) {
      setError('Error fetching user data');
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });
    }
  };

  const handleGoBack = () => {
    navigate(-1); // This will take the user to the previous page
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    const newPhone = `+${value}`;
    setFormData(prev => ({ ...prev, phoneNumber: newPhone }));
    setIsPhoneChanged(newPhone !== originalPhone);
    setIsPhoneVerified(false);
  };

  const validateFile = (file) => {
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
    
    if (file.size > MAX_FILE_SIZE) {
      setError(`File ${file.name} exceeds 3MB limit`);
      return false;
    }
    if (!file.type.startsWith('image/')) {
      setError(`File ${file.name} is not an image`);
      return false;
    }
    return true;
  };

  const handleFileUpload = async (file) => {
    if (!file || !validateFile(file)) return;

    try {
      const uid = auth.currentUser.uid;
      const storageRef = ref(storage, `profile-photos/${uid}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, profile: progress }));
        },
        (error) => setError('Error uploading file'),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, photoURL: downloadURL }));
          setUploadProgress(prev => ({ ...prev, profile: 0 }));
        }
      );
    } catch (err) {
      setError('Error uploading file');
    }
  };

  const sendOTP = async () => {
    if (!formData.phoneNumber) {
      setError('Please enter a valid phone number');
      return;
    }

    setSendingOtp(true);
    setError('');

    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formData.phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setIsVerifying(true);
      setTimer(60);
      setSuccessMessage('OTP sent successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error sending OTP:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please check and try again.');
      } else {
        setError('Error sending OTP. Please try again.');
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setVerifyingOtp(true);
    setError('');

    try {
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
      await linkWithCredential(auth.currentUser, credential);
      setIsPhoneVerified(true);
      setIsVerifying(false);
      setSuccessMessage('Phone number verified successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      
      // Handle specific error types
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This phone number is already linked to another account. Please use a different number.');
      } else if (err.code === 'auth/invalid-verification-code') {
        setError('The verification code is invalid. Please enter the correct code.');
      } else if (err.code === 'auth/code-expired') {
        setError('The verification code has expired. Please request a new one.');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isPhoneChanged && !isPhoneVerified) {
      setError('Please verify your new phone number before updating profile');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const uid = auth.currentUser.uid;
      await axios.patch(`${API}/users/${uid}`, formData);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        setTimeout(() => navigate(`/foodie`), 1000);
      }, 2000);
    } catch (err) {
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.join(", "));
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
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

  if (loading) {
    return <Loader />;
  }

  return (
    <motion.div
      className="Edit-Foodie-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="Edit-Foodie-title">Edit Profile</h1>
      {error && (
        <motion.div
          className="Edit-Foodie-error"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {error}
        </motion.div>
      )}
      {successMessage && (
        <motion.div
          className="Edit-Foodie-success"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {successMessage}
        </motion.div>
      )}
      
      <form onSubmit={handleSubmit} className="Edit-Foodie-form">
        <div className="Edit-Foodie-photo-section">
          <div 
            className={`Edit-Foodie-photo-container ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {formData.photoURL ? (
              <motion.img 
                src={formData.photoURL} 
                alt="Profile" 
                className="Edit-Foodie-profile-photo" 
                whileHover={{ scale: 1.05 }}
              />
            ) : (
              <div className="Edit-Foodie-photo-placeholder">
                Upload Profile Photo
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e.target.files[0])} 
              className="Edit-Foodie-file-input"
            />
          </div>
          <div className="Edit-Foodie-photo-instructions">
            Click to edit or drop an image to change
          </div>
          {uploadProgress.profile > 0 && (
            <div className="Edit-Foodie-upload-progress">
              Uploading: {Math.round(uploadProgress.profile)}%
            </div>
          )}
        </div>

        <div className="Edit-Foodie-form-group">
          <label>Username</label>
          <input 
            type="text" 
            name="username" 
            value={formData.username} 
            onChange={handleInputChange} 
            required 
            className="Edit-Foodie-input" 
          />
        </div>

        <div className="Edit-Foodie-form-group">
          <label>Email</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleInputChange}
            className="Edit-Foodie-input" 
            disabled={changeCounters.email >= 1} 
          />
          {changeCounters.email >= 1 && (
            <small style={{color: '#666', marginTop: '4px'}}>
              Email can only be changed once. Contact support for more changes.
            </small>
          )}
        </div>

        <div className="Edit-Foodie-form-group">
          <label>Phone Number</label>
          <div className="Edit-Foodie-phone-section">
            <PhoneInput
              country={'in'}
              value={formData.phoneNumber ? formData.phoneNumber.replace('+', '') : ''}
              onChange={handlePhoneChange}
              inputClass="Edit-Foodie-phone-input"
              containerClass="Edit-Foodie-phone-container"
              disabled={changeCounters.phoneNumber >= 1} 
            />
            {isPhoneChanged && !isPhoneVerified && (
              <motion.button
                type="button"
                onClick={sendOTP}
                className={`Edit-Foodie-verify-btn ${sendingOtp ? 'Edit-Foodie-btn-loading' : ''}`}
                disabled={timer > 0 || sendingOtp}
                whileHover={{ scale: timer > 0 || sendingOtp ? 1 : 1.05 }}
                whileTap={{ scale: timer > 0 || sendingOtp ? 1 : 0.95 }}
              >
                {sendingOtp ? '' : timer > 0 ? `Resend in ${timer}s` : 'Verify Phone'}
              </motion.button>
            )}
          </div>
          {changeCounters.phoneNumber >= 1 && (
            <small style={{color: '#666', marginTop: '4px'}}>
              Phone number can only be changed once. Contact support for more changes.
            </small>
          )}
        </div>

        {isVerifying && (
          <motion.div 
            className="Edit-Foodie-form-group"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <label>Enter OTP</label>
            <div className="Edit-Foodie-otp-section">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="Edit-Foodie-input"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
              />
              <motion.button
                type="button"
                onClick={verifyOTP}
                className={`Edit-Foodie-verify-btn ${verifyingOtp ? 'Edit-Foodie-btn-loading' : ''}`}
                disabled={!otp || otp.length < 6 || verifyingOtp}
                whileHover={{ scale: !otp || otp.length < 6 || verifyingOtp ? 1 : 1.05 }}
                whileTap={{ scale: !otp || otp.length < 6 || verifyingOtp ? 1 : 0.95 }}
              >
                {verifyingOtp ? '' : 'Verify OTP'}
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="Edit-Foodie-buttons">
          <motion.button 
            type="submit" 
            className="Edit-Foodie-submit-btn"
            disabled={isSubmitting || (isPhoneChanged && !isPhoneVerified)}
            whileHover={{ scale: isSubmitting || (isPhoneChanged && !isPhoneVerified) ? 1 : 1.05 }}
            whileTap={{ scale: isSubmitting || (isPhoneChanged && !isPhoneVerified) ? 1 : 0.95 }}
          >
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </motion.button>
          <motion.button 
            type="button" 
            className="Edit-Foodie-cancel-btn" 
            onClick={handleGoBack}
            disabled={isSubmitting}
            whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          >
            Go Back
          </motion.button>
        </div>
      </form>

      <div id="recaptcha-container"></div>
    </motion.div>
  );
};

export default EditProfile;