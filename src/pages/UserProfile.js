// src/pages/UserProfile.js
import React, { useState, useEffect } from 'react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';
import { ref, get, update } from 'firebase/database';
import { 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaCamera, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaIdCard, 
  FaMapMarkerAlt, 
  FaCity, 
  FaFlag, 
  FaMailBulk,
  FaRupeeSign // Added missing import
} from 'react-icons/fa';

const UserProfile = () => {
  const [profile, setProfile] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewURL, setPreviewURL] = useState('');
  const [errors, setErrors] = useState({});
  const [editMode, setEditMode] = useState(false);

  const currentUser = auth.currentUser;

  // Validation rules only for editable fields (address-related)
  const validationRules = {
    address: {
      minLength: 10,
      maxLength: 200,
      message: "Address must be 10-200 characters"
    },
    city: {
      required: true,
      minLength: 2,
      maxLength: 30,
      pattern: /^[a-zA-Z\s]+$/,
      message: "City must be 2-30 characters and contain only letters"
    },
    state: {
      required: true,
      minLength: 2,
      maxLength: 30,
      pattern: /^[a-zA-Z\s]+$/,
      message: "State must be 2-30 characters and contain only letters"
    },
    pin: {
      required: true,
      pattern: /^\d{6}$/,
      message: "PIN code must be exactly 6 digits"
    }
  };

  // Editable fields array
  const editableFields = ['address', 'city', 'state', 'pin'];

  useEffect(() => {
    if (!currentUser) return;

    const uid = currentUser.uid;
    const userPath = ref(db, `HTAMS/users/${uid}`);

    get(userPath)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setProfile(data);
          if (data.passportPhoto) setPhotoURL(data.passportPhoto);
        }
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const validateField = (name, value) => {
    const rule = validationRules[name];
    if (!rule) return '';

    // Required validation
    if (rule.required && !value?.trim()) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value?.trim() && !rule.required) return '';

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must not exceed ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return rule.message;
    }

    return '';
  };

  const isFieldEditable = (fieldName) => {
    return editableFields.includes(fieldName);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow changes to editable fields
    if (!isFieldEditable(name)) return;
    
    // Format specific fields
    let formattedValue = value;
    
    if (name === 'pin') {
      // Allow only numbers for PIN
      formattedValue = value.replace(/\D/g, '').slice(0, 6);
    } else if (name === 'city' || name === 'state') {
      // Allow only letters and spaces
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    setProfile((prev) => ({ ...prev, [name]: formattedValue }));
    
    // Validate field
    const error = validateField(name, formattedValue);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          photo: 'Photo size must be less than 5MB'
        }));
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          photo: 'Please select a valid image file'
        }));
        return;
      }

      setPhotoFile(file);
      const preview = URL.createObjectURL(file);
      setPreviewURL(preview);
      setErrors(prev => ({
        ...prev,
        photo: ''
      }));
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !currentUser) return null;
    const photoRef = storageRef(storage, `HTAMS/profilePhotos/${currentUser.uid}`);
    await uploadBytes(photoRef, photoFile);
    return await getDownloadURL(photoRef);
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate only editable fields
    editableFields.forEach(fieldName => {
      const error = validateField(fieldName, profile[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const handleToggleEdit = () => {
    if (editMode) {
      // Cancel edit mode - reload original data
      const uid = currentUser.uid;
      const userPath = ref(db, `HTAMS/users/${uid}`);
      
      get(userPath).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setProfile(data);
          if (data.passportPhoto) setPhotoURL(data.passportPhoto);
        }
      });
      
      // Clear preview and file
      setPreviewURL('');
      setPhotoFile(null);
      setErrors({});
    }
    setEditMode(!editMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('Please fix all validation errors before submitting', 'error');
      return;
    }

    setSaving(true);

    try {
      const uid = currentUser.uid;
      const userPath = ref(db, `HTAMS/users/${uid}`);

      const photo = await handlePhotoUpload();
      
      // Only update address-related fields and photo
      const updatedData = {
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pin: profile.pin || '',
        ...(photo && { passportPhoto: photo }),
      };

      await update(userPath, updatedData);
      
      if (photo) {
        setPhotoURL(photo);
        setPreviewURL('');
        setPhotoFile(null);
      }
      
      // Turn off edit mode after successful update
      setEditMode(false);
      showNotification('Address information updated successfully!', 'success');
      
    } catch (err) {
      console.error('Error updating profile:', err);
      showNotification('Failed to update address information. Please try again.', 'error');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Mobile Header */}
      {/* <div className="mobile-header">
        <h1 className="mobile-title">
          <FaUser className="header-icon" />
          My Profile
        </h1>
        <p className="mobile-subtitle">Manage your personal information</p>
      </div> */}

      {/* Profile Card */}
      <div className="profile-card">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="header-content">
            <div className="photo-section">
              <div className="photo-wrapper">
                {(previewURL || photoURL) ? (
                  <img src={previewURL || photoURL} alt="Profile" className="profile-photo"/>
                ) : (
                  <div className="photo-placeholder">
                    <FaUser className="placeholder-icon" />
                  </div>
                )}
                {editMode && (
                  <div className="photo-overlay">
                    <label htmlFor="photo-upload" className="photo-upload-btn">
                      <FaCamera />
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="photo-input"
                      />
                    </label>
                  </div>
                )}
              </div>
              {errors.photo && <span className="error-message photo-error">{errors.photo}</span>}
            </div>
            
            <div className="user-info">
              <h2 className="user-name">{profile.name || 'Your Name'}</h2>
              <div className="user-details">
                <span className="user-role">{profile.role || 'User'}</span>
                <span className="user-status">{profile.status || 'Active'}</span>
              </div>
              {editMode && (
                <div className="edit-mode-badge">
                  <FaEdit className="badge-icon" />
                  Editing Address Information
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="form-container">
          <form onSubmit={handleSubmit} className="profile-form">
            
            {/* Personal Information Section - Read Only */}
            <div className="section personal-section">
              <div className="section-header">
                <div className="section-title">
                  <FaUser className="section-icon" />
                  <h3>Personal Information</h3>
                </div>
                <p className="section-description">Your personal details (Read Only)</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FaUser className="label-icon" />
                    Full Name
                  </label>
                  <input 
                    name="name" 
                    value={profile.name || ''} 
                    readOnly
                    placeholder="Not provided"
                    className="form-input readonly-field"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <FaEnvelope className="label-icon" />
                    Email Address
                  </label>
                  <input 
                    name="email" 
                    type="email" 
                    value={profile.email || ''} 
                    readOnly
                    placeholder="Not provided"
                    className="form-input readonly-field"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <FaPhone className="label-icon" />
                    Mobile Number
                  </label>
                  <input 
                    name="mobile" 
                    type="tel" 
                    value={profile.mobile || ''} 
                    readOnly
                    placeholder="Not provided"
                    className="form-input readonly-field"
                  />
                </div>
              </div>
            </div>

            {/* Document Information Section - Read Only */}
            <div className="section document-section">
              <div className="section-header">
                <div className="section-title">
                  <FaIdCard className="section-icon" />
                  <h3>Document Information</h3>
                </div>
                <p className="section-description">Your document details (Read Only)</p>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FaIdCard className="label-icon" />
                    Aadhar Number
                  </label>
                  <input 
                    name="aadhar" 
                    value={profile.aadhar || ''} 
                    readOnly
                    placeholder="Not provided"
                    className="form-input readonly-field"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <FaIdCard className="label-icon" />
                    PAN Card
                  </label>
                  <input 
                    name="pan" 
                    value={profile.pan || ''} 
                    readOnly
                    placeholder="Not provided"
                    className="form-input readonly-field"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <FaUser className="label-icon" />
                    Role
                  </label>
                  <input 
                    name="role" 
                    value={profile.role || ''} 
                    readOnly
                    placeholder="Not assigned"
                    className="form-input readonly-field"
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section - Editable */}
            <div className={`section address-section ${editMode ? 'edit-mode' : ''}`}>
              <div className="section-header">
                <div className="section-title">
                  <FaMapMarkerAlt className="section-icon" />
                  <h3>Address Information</h3>
                </div>
                <p className={`section-description ${editMode ? 'edit-mode-text' : ''}`}>
                  {editMode ? 'Update your address details below' : 'Your address details (Click Edit to modify)'}
                </p>
              </div>
              
              <div className="form-grid address-grid">
                <div className="form-group full-width">
                  <label>
                    <FaMapMarkerAlt className="label-icon" />
                    Complete Address
                  </label>
                  <textarea 
                    name="address" 
                    value={profile.address || ''} 
                    onChange={editMode ? handleChange : undefined}
                    readOnly={!editMode}
                    placeholder="Enter your complete address (10-200 characters)"
                    className={`form-textarea ${errors.address ? 'error' : ''} ${!editMode ? 'readonly-field' : 'editable-field'}`}
                    maxLength="200"
                    rows="3"
                  />
                  {errors.address && <span className="error-message">{errors.address}</span>}
                  {editMode && !errors.address && (
                    <span className="character-count">{(profile.address || '').length}/200 characters</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label>
                    <FaCity className="label-icon" />
                    City *
                  </label>
                  <input 
                    name="city" 
                    value={profile.city || ''} 
                    onChange={editMode ? handleChange : undefined}
                    readOnly={!editMode}
                    placeholder="Enter city name"
                    className={`form-input ${errors.city ? 'error' : ''} ${!editMode ? 'readonly-field' : 'editable-field'}`}
                    maxLength="30"
                  />
                  {errors.city && <span className="error-message">{errors.city}</span>}
                </div>
                
                <div className="form-group">
                  <label>
                    <FaFlag className="label-icon" />
                    State *
                  </label>
                  <input 
                    name="state" 
                    value={profile.state || ''} 
                    onChange={editMode ? handleChange : undefined}
                    readOnly={!editMode}
                    placeholder="Enter state name"
                    className={`form-input ${errors.state ? 'error' : ''} ${!editMode ? 'readonly-field' : 'editable-field'}`}
                    maxLength="30"
                  />
                  {errors.state && <span className="error-message">{errors.state}</span>}
                </div>
                
                <div className="form-group">
                  <label>
                    <FaMailBulk className="label-icon" />
                    PIN Code *
                  </label>
                  <input 
                    name="pin" 
                    value={profile.pin || ''} 
                    onChange={editMode ? handleChange : undefined}
                    readOnly={!editMode}
                    placeholder="Enter 6-digit PIN code"
                    className={`form-input ${errors.pin ? 'error' : ''} ${!editMode ? 'readonly-field' : 'editable-field'}`}
                    maxLength="6"
                  />
                  {errors.pin && <span className="error-message">{errors.pin}</span>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              {!editMode ? (
                <button 
                  type="button" 
                  onClick={handleToggleEdit}
                  className="edit-button"
                >
                  <FaEdit className="button-icon" />
                  Edit Address Information
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    type="button" 
                    onClick={handleToggleEdit}
                    className="cancel-button"
                    disabled={saving}
                  >
                    <FaTimes className="button-icon" />
                    Cancel Changes
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button" 
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <div className="button-spinner"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <FaSave className="button-icon" />
                        Save Address
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container */
        .profile-container {
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          padding: 16px;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Loading Styles */
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f8fafc;
        }

        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .loading-spinner p {
          color: #64748b;
          font-size: 1rem;
          font-weight: 500;
          margin: 0;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Mobile Header */
        .mobile-header {
  
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .mobile-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .header-icon {
          font-size: 1.25rem;
          color: #6366f1;
        }

        .mobile-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        /* Profile Card */
        .profile-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        /* Profile Header */
        .profile-header {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 14px 12px;
        }

        .header-content {
          display: flex;
          // flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }

        .photo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .photo-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid white;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .profile-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .placeholder-icon {
          font-size: 2rem;
        }

        .photo-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .photo-wrapper:hover .photo-overlay {
          opacity: 1;
        }

        .photo-upload-btn {
          color: white;
          cursor: pointer;
          font-size: 1.5rem;
          transition: transform 0.2s ease;
        }

        .photo-upload-btn:hover {
          transform: scale(1.1);
        }

        .photo-input {
          display: none;
        }

        .photo-error {
          color: #fef2f2;
          background: rgba(239, 68, 68, 0.9);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .user-details {
          display: flex;
          // flex-direction: column;
          gap: 20px;
          margin-left: 8px;
          align-items: center;

          margin-bottom: 12px;
        }

        .user-role,
        .user-status {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .edit-mode-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }

        .badge-icon {
          font-size: 0.75rem;
        }

        /* Form Container */
        .form-container {
          padding: 24px 20px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Sections */
        .section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .section.edit-mode {
          background: #f0f9ff;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .section-header {
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .section-title h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .section-icon {
          font-size: 1.1rem;
          color: #6366f1;
        }

        .section-description {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
          transition: color 0.3s ease;
        }

        .edit-mode-text {
          color: #0ea5e9 !important;
          font-weight: 600;
        }

        /* Form Grid */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label-icon {
          font-size: 0.875rem;
          color: #6366f1;
        }

        .form-input,
        .form-textarea {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          transition: all 0.3s ease;
          background: white;
          box-sizing: border-box;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .readonly-field {
          background: #f8fafc !important;
          cursor: not-allowed !important;
          color: #64748b !important;
          border-color: #e2e8f0 !important;
        }

        .readonly-field:focus {
          border-color: #e2e8f0 !important;
          box-shadow: none !important;
        }

        .editable-field {
          border-color: #0ea5e9 !important;
          background: white !important;
          color: #1e293b !important;
        }

        .editable-field:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .form-input.error,
        .form-textarea.error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }

        .character-count {
          color: #6b7280;
          font-size: 0.75rem;
          text-align: right;
          margin-top: 4px;
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          justify-content: center;
          padding-top: 24px;
          border-top: 2px solid #e5e7eb;
          margin-top: 20px;
        }

        .edit-button {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .edit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }

        .edit-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          width: 100%;
        }

        .cancel-button,
        .submit-button {
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 140px;
        }

        .cancel-button {
          background: #6b7280;
          color: white;
        }

        .cancel-button:hover:not(:disabled) {
          background: #4b5563;
          transform: translateY(-1px);
        }

        .submit-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .submit-button:disabled,
        .cancel-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .button-icon {
          font-size: 0.875rem;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Notifications */
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          left: 20px;
          padding: 16px 20px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          z-index: 1000;
          animation: slideInNotification 0.3s ease-out;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .success-notification {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .error-notification {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        @keyframes slideInNotification {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Custom Scrollbar */
        .form-container::-webkit-scrollbar {
          width: 6px;
        }

        .form-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .form-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .form-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Tablet Styles (768px and up) */
        @media (min-width: 768px) {
          .profile-container {
            padding: 24px;
            max-width: 900px;
            margin: 0 auto;
          }

          .mobile-header {
            display: none;
            padding-top:30px
          }

          .profile-card {
            border-radius: 20px;
          }

          .profile-header {
            padding: 32px;
          }

          .header-content {
            flex-direction: row;
            text-align: left;
            gap: 32px;
          }

          .photo-wrapper {
            width: 120px;
            height: 120px;
          }

          .user-name {
            font-size: 2rem;
          }

          .user-details {
            flex-direction: row;
            gap: 12px;
          }

          .form-container {
            padding: 32px;
            max-height: none;
          }

          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .section {
            padding: 24px;
          }

          .edit-actions {
            justify-content: flex-end;
            width: auto;
          }

          .notification {
            right: 32px;
            left: auto;
            max-width: 400px;
          }
        }

        /* Desktop Styles (1024px and up) */
        @media (min-width: 1024px) {
          .profile-container {
            padding: 32px;
            max-width: 1000px;
          }

          .form-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }

          .address-grid {
            grid-template-columns: 1fr 1fr;
          }

          .address-grid .form-group.full-width {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
};

export default UserProfile;
