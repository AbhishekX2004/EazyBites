import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_PHOTOS = 2;

const FoodModal = ({ isOpen, onClose, onSubmit, foodItem, mode = 'add' }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        photoURLs: []
    });
    
    const [selectedPhotos, setSelectedPhotos] = useState([]); // Store file objects and previews
    const [uploadProgress, setUploadProgress] = useState({});
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (foodItem && mode === 'edit') {
            setFormData({
                name: foodItem.name,
                description: foodItem.description || '',
                price: foodItem.price,
                photoURLs: foodItem.photoURLs || []
            });
            // Safely handle potentially undefined photoURLs
            setSelectedPhotos((foodItem.photoURLs || []).map(url => ({
                preview: url,
                file: null,
                isExisting: true
            })));
        }
    }, [foodItem, mode]);

    // Cleanup previews on unmount
    useEffect(() => {
        return () => {
            selectedPhotos.forEach(photo => {
                if (photo.preview && !photo.isExisting) {
                    URL.revokeObjectURL(photo.preview);
                }
            });
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

    const handlePhotoSelect = (e) => {
        const files = Array.from(e.target.files);
        
        if (selectedPhotos.length + files.length > MAX_PHOTOS) {
            setError(`Maximum ${MAX_PHOTOS} photos allowed`);
            return;
        }

        const newPhotos = files.filter(validateFile).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            isExisting: false
        }));

        setSelectedPhotos(prev => [...prev, ...newPhotos]);
        setError('');
    };

    const removePhoto = (index) => {
        setSelectedPhotos(prev => {
            const newPhotos = [...prev];
            if (!newPhotos[index].isExisting) {
                URL.revokeObjectURL(newPhotos[index].preview);
            }
            newPhotos.splice(index, 1);
            return newPhotos;
        });
    };

    const uploadPhotos = async () => {
        const uploadPromises = selectedPhotos.map(async (photo, index) => {
            // Skip if it's an existing photo
            if (photo.isExisting) return photo.preview;

            const timestamp = Date.now();
            const fileName = `food-items/${timestamp}_${photo.file.name}`;
            const storageRef = ref(storage, fileName);
            
            const uploadTask = uploadBytesResumable(storageRef, photo.file);
            
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(prev => ({ ...prev, [fileName]: progress }));
                    },
                    (error) => {
                        setError(`Error uploading ${photo.file.name}`);
                        reject(error);
                    },
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setUploadProgress(prev => {
                            const newProgress = { ...prev };
                            delete newProgress[fileName];
                            return newProgress;
                        });
                        resolve(downloadURL);
                    }
                );
            });
        });

        return Promise.all(uploadPromises);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const uploadedURLs = await uploadPhotos();
            await onSubmit({
                ...formData,
                photoURLs: uploadedURLs
            });
            
            if (mode === 'add') {
                setFormData({ name: '', description: '', price: '', photoURLs: [] });
                setSelectedPhotos([]);
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
                        <h2>{mode === 'add' ? 'Add New Food Item' : 'Edit Food Item'}</h2>
                        {error && (
                            <div className="MyMenu-error-message">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="MyMenu-form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="MyMenu-form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="MyMenu-form-group">
                                <label>Price *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                            <div className="MyMenu-form-group">
                                <label>Photos * (Max 2 photos, 5MB each)</label>
                                <div className="MyMenu-photo-grid">
                                    {selectedPhotos.map((photo, index) => (
                                        <div key={index} className="MyMenu-photo-container">
                                            <img 
                                                src={photo.preview}
                                                alt={`Food ${index + 1}`} 
                                                className="MyMenu-photo-preview"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="MyMenu-photo-remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {selectedPhotos.length < MAX_PHOTOS && (
                                        <div className="MyMenu-photo-upload">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                max="2"
                                                onChange={handlePhotoSelect}
                                                className="MyMenu-photo-input"
                                            />
                                        </div>
                                    )}
                                </div>
                                {Object.entries(uploadProgress).map(([filename, progress]) => (
                                    <div key={filename} className="MyMenu-upload-progress">
                                        Uploading: {Math.round(progress)}%
                                    </div>
                                ))}
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
                                    disabled={isSubmitting || selectedPhotos.length === 0}
                                >
                                    {isSubmitting ? 'Submitting...' : mode === 'add' ? 'Add Item' : 'Update Item'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FoodModal;