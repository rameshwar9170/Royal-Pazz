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
  FaRupeeSign,
  FaBuilding, // For agency
  FaChartLine // For level
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
                {/* <span className="user-role">{profile.role || 'User'}</span> */}
                <span className="user-status">{profile.status || 'Active'}</span>
                {/* Display Agency/Current Level */}
                {profile.currentLevel && (
                  <span className="user-level">
                    <FaChartLine className="level-icon" />
                     {profile.currentLevel}
                  </span>
                )}
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

                {/* Display Agency/Current Level in form */}
                {profile.currentLevel && (
                  <div className="form-group">
                    <label>
                      <FaChartLine className="label-icon" />
                      Current Level
                    </label>
                    <input 
                      name="currentLevel" 
                      value={`Level ${profile.currentLevel}`} 
                      readOnly
                      className="form-input readonly-field level-field"
                    />
                  </div>
                )}
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

  /* Reset and Base Styles */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Base Container - Mobile-first approach */
  .profile-container {
    font-family: 'Inter', sans-serif;
    background: #f8fafc;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* Loading Styles - Mobile Optimized */
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #f8fafc;
    padding: 20px;
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
    width: 100%;
    max-width: 280px;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .loading-spinner p {
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Profile Card - Native app style */
  .profile-card {
    background: white;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    position: relative;
  }

  /* Profile Header - Compact Mobile Design */
  .profile-header {
    background: #002B5C;
    color: white;
    padding: 12px 16px 16px 16px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Photo Section - Minimized for mobile */
  .photo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }

  .photo-wrapper {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
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
    font-size: 18px;
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

  .photo-wrapper:active .photo-overlay {
    opacity: 1;
  }

  .photo-upload-btn {
    color: white;
    cursor: pointer;
    font-size: 14px;
    transition: transform 0.2s ease;
  }

  .photo-input {
    display: none;
  }

  .photo-error {
    color: #fef2f2;
    background: rgba(239, 68, 68, 0.9);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    margin-top: 4px;
  }

  /* User Info - Optimized for mobile */
  .user-info {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 4px 0;
    color: white;
    line-height: 1.2;
    word-break: break-word;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 6px;
  }

  .user-role,
  .user-status {
    font-size: 12px;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .user-level {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 11px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: fit-content;
  }

  .level-icon {
    font-size: 10px;
  }

  .edit-mode-badge {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    width: fit-content;
  }

  .badge-icon {
    font-size: 9px;
  }

  /* Ultra-Compact Professional Form Container */
  .form-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    background: #fafbfc;
    -webkit-overflow-scrolling: touch;
    position: relative;
  }

  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 12px;
    max-width: 100%;
  }

  /* Ultra-Compact Sections */
  .section {
    background: white;
    border: 1px solid #e8ebed;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 4px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
  }

  .section.edit-mode {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-color: #0ea5e9;
    box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.2);
  }

  .section-header {
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f1f3f4;
    position: relative;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
  }

  .section-title h3 {
    font-size: 13px;
    font-weight: 700;
    color: #1a1d21;
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.2px;
  }

  .section-icon {
    font-size: 11px;
    color: #6366f1;
    width: 14px;
    height: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .section-description {
    color: #6b7280;
    font-size: 10px;
    margin: 0;
    line-height: 1.3;
    font-weight: 500;
    opacity: 0.8;
  }

  .edit-mode-text {
    color: #0ea5e9 !important;
    font-weight: 600;
    opacity: 1;
  }

  /* Compact Form Grid */
  .form-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    position: relative;
  }

  .form-group.full-width {
    width: 100%;
  }

  .form-group label {
    font-size: 11px;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
    line-height: 1.2;
  }

  .label-icon {
    font-size: 10px;
    color: #6366f1;
    width: 12px;
    height: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Ultra-Compact Form Inputs */
  .form-input,
  .form-textarea {
    padding: 8px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    background: white;
    line-height: 1.3;
    min-height: 36px;
    color: #1f2937;
    position: relative;
  }

  .form-textarea {
    resize: vertical;
    min-height: 60px;
    line-height: 1.4;
  }

  .form-input:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    background: #fefefe;
  }

  .readonly-field {
    background: #f8fafc !important;
    cursor: not-allowed !important;
    color: #6b7280 !important;
    border-color: #e2e8f0 !important;
    font-weight: 400;
  }

  .readonly-field:focus {
    border-color: #e2e8f0 !important;
    box-shadow: none !important;
  }

  .editable-field {
    border-color: #0ea5e9 !important;
    background: white !important;
    color: #1f2937 !important;
    box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.2);
  }

  .editable-field:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  .form-input.error,
  .form-textarea.error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
    background: #fef2f2;
  }

  .error-message {
    color: #ef4444;
    font-size: 10px;
    font-weight: 600;
    margin-top: 2px;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .character-count {
    color: #9ca3af;
    font-size: 9px;
    text-align: right;
    margin-top: 2px;
    font-weight: 500;
  }

  /* Professional Input Placeholders */
  .form-input::placeholder,
  .form-textarea::placeholder {
    color: #9ca3af;
    font-weight: 400;
    opacity: 1;
  }

  /* Compact Input Groups for Related Fields */
  .input-group {
    display: flex;
    gap: 6px;
    align-items: flex-end;
  }

  .input-group .form-group {
    flex: 1;
  }

  .input-group .form-group:first-child {
    flex: 2;
  }

  /* Professional Section Indicators */
  .section::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .section.edit-mode::before {
    opacity: 1;
    background: linear-gradient(180deg, #0ea5e9 0%, #06b6d4 100%);
  }

  /* Compact Required Field Indicator */
  .required-field::after {
    content: '*';
    color: #ef4444;
    margin-left: 2px;
    font-weight: 700;
    font-size: 10px;
  }

  /* Professional Form Validation */
  .form-group.valid .form-input,
  .form-group.valid .form-textarea {
    border-color: #10b981;
    background: #f0fdf4;
  }

  .form-group.valid::after {
    content: '✓';
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #10b981;
    font-size: 12px;
    font-weight: 700;
    pointer-events: none;
  }

  /* Compact Custom Select Style */
  .form-select {
    padding: 8px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    background: white;
    color: #1f2937;
    min-height: 36px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .form-select:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }

  /* Professional Loading State */
  .form-loading {
    position: relative;
    pointer-events: none;
  }

  .form-loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Form Actions - Native app style */
  .form-actions {
    display: flex;
    justify-content: center;
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: white;
    position: sticky;
    bottom: 0;
    z-index: 10;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }

  /* Buttons - Touch optimized */
  .edit-button {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .edit-button:active {
    transform: scale(0.98);
  }

  .edit-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    width: 100%;
  }

  .cancel-button,
  .submit-button {
    flex: 1;
    padding: 14px 16px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 48px;
  }

  .cancel-button {
    background: #6b7280;
    color: white;
    box-shadow: 0 2px 8px rgba(107, 114, 128, 0.3);
  }

  .cancel-button:active {
    transform: scale(0.98);
    background: #4b5563;
  }

  .submit-button {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .submit-button:active {
    transform: scale(0.98);
  }

  .submit-button:disabled,
  .cancel-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .button-icon {
    font-size: 14px;
  }

  .button-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Notifications - Mobile positioned */
  .notification {
    position: fixed;
    top: 80px;
    left: 16px;
    right: 16px;
    padding: 12px 16px;
    border-radius: 12px;
    color: white;
    font-weight: 600;
    font-size: 14px;
    z-index: 1000;
    animation: slideInNotification 0.3s ease-out;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
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

  /* Custom Scrollbar - Mobile friendly */
  .form-container::-webkit-scrollbar {
    width: 2px;
  }

  .form-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .form-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }

  /* Professional Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .section {
    animation: fadeInUp 0.3s ease forwards;
  }

  .section:nth-child(1) { animation-delay: 0.05s; }
  .section:nth-child(2) { animation-delay: 0.1s; }
  .section:nth-child(3) { animation-delay: 0.15s; }
  .section:nth-child(4) { animation-delay: 0.2s; }
  .section:nth-child(5) { animation-delay: 0.25s; }

  /* Safe Area Support for iOS */
  @supports (padding-top: env(safe-area-inset-top)) {
    .profile-header {
      padding-top: calc(12px + env(safe-area-inset-top));
    }
    
    .form-actions {
      padding-bottom: calc(16px + env(safe-area-inset-bottom));
    }
  }

  /* Responsive Improvements */
  @media (max-width: 480px) {
    .form-container {
      padding: 6px 10px;
    }
    
    .section {
      padding: 8px 10px;
      margin-bottom: 3px;
    }
    
    .form-grid {
      gap: 6px;
    }
    
    .form-group {
      gap: 2px;
    }
    
    .form-input,
    .form-textarea {
      padding: 7px 9px;
      min-height: 34px;
    }
    
    .section-title h3 {
      font-size: 12px;
    }
    
    .form-group label {
      font-size: 10px;
    }
  }

  /* Tablet Optimizations (768px and up) */
  @media (min-width: 768px) {
    .profile-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
      min-height: calc(100vh - 40px);
    }

    .profile-card {
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      min-height: auto;
    }

    .profile-header {
      padding: 20px 24px;
      position: relative;
    }

    .photo-wrapper {
      width: 70px;
      height: 70px;
    }

    .user-name {
      font-size: 22px;
    }

    .user-details {
      flex-direction: row;
      gap: 12px;
    }

    .form-container {
      padding: 12px 16px;
    }
    
    .profile-form {
      gap: 8px;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    
    .form-group.full-width {
      grid-column: 1 / -1;
    }
    
    .section {
      padding: 12px 16px;
      margin-bottom: 6px;
    }
    
    .input-group {
      gap: 8px;
    }

    .edit-actions {
      justify-content: flex-end;
      width: auto;
    }

    .cancel-button,
    .submit-button {
      flex: none;
      min-width: 120px;
    }

    .form-actions {
      position: relative;
      box-shadow: none;
    }
  }

  /* Desktop Optimizations (1024px and up) */
  @media (min-width: 1024px) {
    .profile-container {
      max-width: 800px;
      padding: 32px;
    }

    .form-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    
    .form-container {
      padding: 16px 20px;
    }

    .photo-wrapper:hover .photo-overlay {
      opacity: 1;
    }

    .edit-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .cancel-button:hover:not(:disabled) {
      background: #4b5563;
      transform: translateY(-1px);
    }

    .submit-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    }
  }

  /* High DPI Displays */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .profile-photo {
      image-rendering: -webkit-optimize-contrast;
    }
  }
`}</style>



    </div>
  );
};


export default UserProfile;
