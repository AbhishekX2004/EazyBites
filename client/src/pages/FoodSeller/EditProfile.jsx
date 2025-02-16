import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import PhoneInput from 'react-phone-input-2';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithCredential, PhoneAuthProvider } from 'firebase/auth';
import './EditProfile.css';

const API = process.env.REACT_APP_API;
const MAX_STALL_PHOTOS = 5;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

const EditProfile = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const uid = searchParams.get("uid");

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phoneNumber: '',
        photoURL: '',
        stallName: '',
        stallDescription: '',
        landMark: '',
        stallPhotos: []
    });

    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        fetchUserData();
    }, [uid]);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const fetchUserData = async () => {
        try {
            const response = await axios.get(`${API}/users/${uid}`);
            const userData = {
                ...response.data,
                stallPhotos: response.data.stallPhotos || []
            };
            setFormData(userData);
            setOriginalPhone(response.data.phoneNumber);
            setChangeCounters(response.data.changeCounters || { email: 0, phoneNumber: 0 });
            setLoading(false);
        } catch (err) {
            setError('Error fetching seller data');
            setLoading(false);
        }
    };

    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => { }
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

    const handleProfilePhotoUpload = async (file) => {
        if (!file || !validateFile(file)) return;

        try {
            const storageRef = ref(storage, `seller-profiles/${uid}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, profile: progress }));
                },
                (error) => setError('Error uploading profile photo'),
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setFormData(prev => ({ ...prev, photoURL: downloadURL }));
                    setUploadProgress(prev => ({ ...prev, profile: 0 }));
                }
            );
        } catch (err) {
            setError('Error uploading profile photo');
        }
    };

    const handleStallPhotoUpload = async (e) => {
        const files = Array.from(e.target.files);

        if (formData.stallPhotos.length + files.length > MAX_STALL_PHOTOS) {
            setError(`Maximum ${MAX_STALL_PHOTOS} stall photos allowed`);
            return;
        }

        for (const file of files) {
            if (!validateFile(file)) continue;

            try {
                const storageRef = ref(storage, `stall-photos/${uid}/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
                    },
                    (error) => setError(`Error uploading ${file.name}`),
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setFormData(prev => ({
                            ...prev,
                            stallPhotos: [...prev.stallPhotos, downloadURL]
                        }));
                        setUploadProgress(prev => {
                            const newProgress = { ...prev };
                            delete newProgress[file.name];
                            return newProgress;
                        });
                    }
                );
            } catch (err) {
                setError(`Error uploading ${file.name}`);
            }
        }
    };

    const removeStallPhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            stallPhotos: prev.stallPhotos.filter((_, i) => i !== index)
        }));
    };

    const sendOTP = async () => {
        if (!formData.phoneNumber) {
            setError('Please enter a valid phone number');
            return;
        }

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
            setError('Error sending OTP. Please try again.');
        }
    };

    const verifyOTP = async () => {
        if (!otp) {
            setError('Please enter the OTP');
            return;
        }

        try {
            const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
            await linkWithCredential(auth.currentUser, credential);
            setIsPhoneVerified(true);
            setIsVerifying(false);
            setSuccessMessage('Phone number verified successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError('Invalid OTP. Please try again.');
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
            handleProfilePhotoUpload(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isPhoneChanged && !isPhoneVerified) {
            setError('Please verify your new phone number before updating profile');
            return;
        }

        setIsSubmitting(true);

        try {
            await axios.patch(`${API}/users/${uid}`, formData);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => {
                setSuccessMessage('');
                setTimeout(() => navigate(`/food-seller`), 1000);
            }, 2000);
        } catch (err) {
            if (err.response?.data?.errors) {
                setError(err.response.data.errors.join(", "));
            } else {
                setError("An unexpected error occurred.");
            }
        }
    };

    if (loading) {
        return (
            <div className="Edit-FoodSeller-loading">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="Edit-FoodSeller-spinner"
                />
                Loading...
            </div>
        );
    }

    return (
        <motion.div
            className="Edit-FoodSeller-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <h1 className="Edit-FoodSeller-title">Edit Seller Profile</h1>
            {error && (
                <motion.div
                    className="Edit-FoodSeller-error"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    {error}
                </motion.div>
            )}
            {successMessage && (
                <motion.div
                    className="Edit-FoodSeller-success"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    {successMessage}
                </motion.div>
            )}

            <form onSubmit={handleSubmit} className="Edit-FoodSeller-form">
                <div className="Edit-FoodSeller-photo-section">
                    <div
                        className={`Edit-FoodSeller-photo-container ${dragActive ? 'drag-active' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {formData.photoURL ? (
                            <motion.img
                                src={formData.photoURL}
                                alt="Profile"
                                className="Edit-FoodSeller-profile-photo"
                                whileHover={{ scale: 1.05 }}
                            />
                        ) : (
                            <div className="Edit-FoodSeller-photo-placeholder">
                                Upload Profile Photo
                            </div>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleProfilePhotoUpload(e.target.files[0])}
                            className="Edit-FoodSeller-file-input"
                        />
                    </div>
                    {uploadProgress.profile > 0 && (
                        <div className="Edit-FoodSeller-upload-progress">
                            Uploading: {Math.round(uploadProgress.profile)}%
                        </div>
                    )}
                </div>

                <div className="Edit-FoodSeller-form-group">
                    <label>Username</label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        className="Edit-FoodSeller-input"
                    />
                </div>

                <div className="Edit-FoodSeller-form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="Edit-FoodSeller-input"
                        disabled={changeCounters.email >= 1}
                    />
                </div>

                <div className="Edit-FoodSeller-form-group">
                    <label>Phone Number</label>
                    <div className="Edit-FoodSeller-phone-section">
                        <PhoneInput
                            country={'in'}
                            value={formData.phoneNumber}
                            onChange={handlePhoneChange}
                            inputClass="Edit-FoodSeller-phone-input"
                            containerClass="Edit-FoodSeller-phone-container"
                            disabled={changeCounters.phoneNumber >= 1}
                        />
                        {isPhoneChanged && !isPhoneVerified && (
                            <motion.button
                                type="button"
                                onClick={sendOTP}
                                className="Edit-FoodSeller-verify-btn"
                                disabled={timer > 0}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {timer > 0 ? `Resend OTP in ${timer}s` : 'Verify Phone'}
                            </motion.button>
                        )}
                    </div>
                </div>

                {isVerifying && (
                    <motion.div
                        className="Edit-FoodSeller-form-group"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                    >
                        <label>Enter OTP</label>
                        <div className="Edit-FoodSeller-otp-section">
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="Edit-FoodSeller-input"
                                maxLength={6}
                                placeholder="Enter 6-digit OTP"
                            />
                            <motion.button
                                type="button"
                                onClick={verifyOTP}
                                className="Edit-FoodSeller-verify-btn"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Verify OTP
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                <div className="Edit-FoodSeller-form-group">
                    <label>Stall Name</label>
                    <input
                        type="text"
                        name="stallName"
                        value={formData.stallName}
                        onChange={handleInputChange}
                        required
                        className="Edit-FoodSeller-input"
                    />
                </div>

                <div className="Edit-FoodSeller-form-group">
                    <label>Stall Description</label>
                    <textarea
                        name="stallDescription"
                        value={formData.stallDescription}
                        onChange={handleInputChange}
                        required
                        className="Edit-FoodSeller-textarea"
                        rows={4}
                    />
                </div>

                <div className="Edit-FoodSeller-form-group">
                    <label>Landmark</label>
                    <input
                        type="text"
                        name="landMark"
                        value={formData.landMark}
                        onChange={handleInputChange}
                        required
                        className="Edit-FoodSeller-input"
                    />
                </div>

                <div className="Edit-FoodSeller-form-group">
                    <label>Stall Photos (Max 5 photos, 3MB each)</label>
                    <div className="Edit-FoodSeller-stall-photos">
                        {formData.stallPhotos.map((photo, index) => (
                            <motion.div
                                key={index}
                                className="Edit-FoodSeller-stall-photo-container"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <img src={photo} alt={`Stall ${index + 1}`} className="Edit-FoodSeller-stall-photo" />
                                <button
                                    type="button"
                                    onClick={() => removeStallPhoto(index)}
                                    className="Edit-FoodSeller-remove-photo"
                                >
                                    ×
                                </button>
                            </motion.div>
                        ))}
                        {formData.stallPhotos.length < MAX_STALL_PHOTOS && (
                            <div className="Edit-FoodSeller-stall-photo-upload">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleStallPhotoUpload}
                                    className="Edit-FoodSeller-stall-photo-input"
                                />
                                <div className="Edit-FoodSeller-upload-icon">+</div>
                                <div className="Edit-FoodSeller-upload-text">Add Photos</div>
                            </div>
                        )}
                    </div>
                    {Object.entries(uploadProgress).map(([filename, progress]) => (
                        filename !== 'profile' && (
                            <div key={filename} className="Edit-FoodSeller-upload-progress">
                                {filename}: {Math.round(progress)}%
                            </div>
                        )
                    ))}
                </div>

                <div id="recaptcha-container"></div>

                <div className="Edit-FoodSeller-button-group">
                    <motion.button
                        type="submit"
                        className="Edit-FoodSeller-submit"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isSubmitting || (isPhoneChanged && !isPhoneVerified)}
                    >
                        Update Profile
                    </motion.button>
                    <motion.button
                        onClick={handleGoBack}
                        className="Edit-FoodSeller-back-btn"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Go Back
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default EditProfile;