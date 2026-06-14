import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebaseConfig';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

const CategoryModal = ({ isOpen, onClose, onSubmit, category, mode = 'add', vendorType }) => {
    const [formData, setFormData] = useState({
        categoryName: '',
        visible: true,
        photoURL: ''
    });
    const [selectedPhoto, setSelectedPhoto] = useState(null); // Store file object and preview
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Determine if category name should be editable
    const isCategoryNameEditable = !(vendorType === 'stall' && mode === 'edit');

    useEffect(() => {
        if (category && mode === 'edit') {
            setFormData({
                categoryName: category.categoryName,
                visible: category.visibility ?? true,
                photoURL: category.photoURL || ''
            });
            
            // Set existing photo if available
            if (category.photoURL) {
                setSelectedPhoto({
                    preview: category.photoURL,
                    file: null,
                    isExisting: true
                });
            }
        }
    }, [category, mode]);

    // Cleanup preview on unmount
    useEffect(() => {
        return () => {
            if (selectedPhoto && selectedPhoto.preview && !selectedPhoto.isExisting) {
                URL.revokeObjectURL(selectedPhoto.preview);
            }
        };
    }, []);

    const validateFile = (file) => {
        if (file.size > MAX_FILE_SIZE) {
            setError(`File ${file.name} exceeds 5MB limit`);
            return false;
        }
        if (!file.type.startsWith('image/')) {
            setError(`File ${file.name} is not an image`);
            return false;
        }
        return true;
    };

    const validateCategoryName = (name) => {
        if (vendorType === 'shop') {
            const categoryName = name.toLowerCase();
            const restrictedNames = ['stall', 'stalls'];
            
            if (restrictedNames.includes(categoryName) || categoryName.includes('stall')) {
                setError('Category name cannot be "stall", "stalls", or contain words with similar meaning.');
                return false;
            }
        }
        return true;
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files[0];
        
        if (!file) return;
        
        if (!validateFile(file)) return;
        
        // Clear previous photo if it exists and not from database
        if (selectedPhoto && !selectedPhoto.isExisting) {
            URL.revokeObjectURL(selectedPhoto.preview);
        }
        
        setSelectedPhoto({
            file,
            preview: URL.createObjectURL(file),
            isExisting: false
        });
        setError('');
    };

    const removePhoto = () => {
        if (selectedPhoto && !selectedPhoto.isExisting) {
            URL.revokeObjectURL(selectedPhoto.preview);
        }
        setSelectedPhoto(null);
        setFormData({ ...formData, photoURL: '' });
    };

    const uploadPhoto = async () => {
        // If no new photo is selected or it's an existing photo, return the existing URL
        if (!selectedPhoto || selectedPhoto.isExisting) {
            return selectedPhoto?.preview || '';
        }

        const timestamp = Date.now();
        const fileName = `categories/${timestamp}_${selectedPhoto.file.name}`;
        const storageRef = ref(storage, fileName);
        
        const uploadTask = uploadBytesResumable(storageRef, selectedPhoto.file);
        
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    setError(`Error uploading ${selectedPhoto.file.name}`);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setUploadProgress(0);
                    resolve(downloadURL);
                }
            );
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        // Validate category name based on vendor type
        if (!validateCategoryName(formData.categoryName)) {
            setIsSubmitting(false);
            return;
        }

        try {
            const uploadedURL = await uploadPhoto();
            await onSubmit({
                categoryName: formData.categoryName,
                visibility: formData.visible,
                photoURL: uploadedURL
            });
            
            if (mode === 'add') {
                setFormData({ categoryName: '', visible: true, photoURL: '' });
                setSelectedPhoto(null);
            }
        } catch (error) {
            setError('Error submitting form');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="MyMenu-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="MyMenu-modal"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2>{mode === 'add' ? 'Add New Category' : 'Edit Category'}</h2>
                        {error && (
                            <div className="MyMenu-error-message" style={{ color: 'red' }}>
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="MyMenu-form-group">
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.categoryName}
                                    onChange={e => {
                                        setFormData({ ...formData, categoryName: e.target.value });
                                        setError(''); // Clear error when user types
                                    }}
                                    disabled={!isCategoryNameEditable}
                                    className={!isCategoryNameEditable ? "MyMenu-input-disabled" : ""}
                                />
                                {!isCategoryNameEditable && (
                                    <small className="MyMenu-helper-text">
                                        *Stalls cannot change their category name
                                    </small>
                                )}
                            </div>
                            
                            <div className="MyMenu-form-group">
                                <label>Category Image (Max 5MB)</label>
                                <div className="MyMenu-photo-grid">
                                    {selectedPhoto && (
                                        <div className="MyMenu-photo-container">
                                            <img 
                                                src={selectedPhoto.preview}
                                                alt="Category" 
                                                className="MyMenu-photo-preview"
                                            />
                                            <button
                                                type="button"
                                                onClick={removePhoto}
                                                className="MyMenu-photo-remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                    {!selectedPhoto && (
                                        <div className="MyMenu-photo-upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoSelect}
                                                className="MyMenu-photo-input"
                                            />
                                        </div>
                                    )}
                                </div>
                                {uploadProgress > 0 && (
                                    <div className="MyMenu-upload-progress">
                                        Uploading: {Math.round(uploadProgress)}%
                                    </div>
                                )}
                            </div>
                            
                            <div className="MyMenu-form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.visible}
                                        onChange={e => setFormData({ ...formData, visible: e.target.checked })}
                                    />
                                    Visible to Customers
                                </label>
                            </div>
                            <div className="MyMenu-modal-actions">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="MyMenu-cancel-btn"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="MyMenu-submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : mode === 'add' ? 'Add Category' : 'Update Category'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CategoryModal;