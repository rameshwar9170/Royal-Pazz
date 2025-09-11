import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ref, get, update, push, runTransaction } from 'firebase/database';
import { db } from '../../firebase/config'; // storage removed
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaShieldAlt, FaCheck, FaSpinner } from 'react-icons/fa';

// Module-level cache keyed by training id
const cachedTrainingData = {};

const JoinTraining = () => {
  const { id } = useParams();
  const location = useLocation();

  const getQueryParam = (key) => {
    return new URLSearchParams(location.search).get(key);
  };

  const [formMode, setFormMode] = useState('user');
  const [training, setTraining] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [participant, setParticipant] = useState({
    name: '',
    firmName: '',
    mobile: '',
    email: '',
    referredBy: '',
    address: '',
    city: '',
    state: '',
    pin: '',
  });

  // Field validation functions
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    if (name.length > 50) return 'Name must not exceed 50 characters';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.trim() !== name) return 'Name cannot have leading or trailing spaces';
    if (/\s{2,}/.test(name)) return 'Name cannot have multiple consecutive spaces';
    return '';
  };

  const validateFirmName = (firmName) => {
    const firmNameRegex = /^[a-zA-Z0-9\s&.-]+$/;
    if (!firmName) return 'Firm name is required';
    if (firmName.length < 2) return 'Firm name must be at least 2 characters long';
    if (firmName.length > 100) return 'Firm name must not exceed 100 characters';
    if (!firmNameRegex.test(firmName)) return 'Firm name can only contain letters, numbers, spaces, &, ., and -';
    if (firmName.trim() !== firmName) return 'Firm name cannot have leading or trailing spaces';
    if (/\s{2,}/.test(firmName)) return 'Firm name cannot have multiple consecutive spaces';
    return '';
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile) return 'Mobile number is required';
    if (!/^\d+$/.test(mobile)) return 'Mobile number can only contain digits';
    if (!mobileRegex.test(mobile)) return 'Enter a valid 10-digit Indian mobile number starting with 6-9';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (email.length > 100) return 'Email must not exceed 100 characters';
    if (!emailRegex.test(email)) return 'Enter a valid email address';
    if (email !== email.toLowerCase()) return 'Email should be in lowercase';
    return '';
  };

  const validateAddress = (address) => {
    const addressRegex = /^[a-zA-Z0-9\s,./\-#()]+$/;
    if (!address) return 'Address is required';
    if (address.length < 10) return 'Address must be at least 10 characters long';
    if (address.length > 200) return 'Address must not exceed 200 characters';
    if (!addressRegex.test(address)) return 'Address contains invalid characters';
    if (address.trim() !== address) return 'Address cannot have leading or trailing spaces';
    if (/\s{2,}/.test(address)) return 'Address cannot have multiple consecutive spaces';
    return '';
  };

  const validateCity = (city) => {
    const cityRegex = /^[a-zA-Z\s]+$/;
    if (!city) return 'City is required';
    if (city.length < 2) return 'City must be at least 2 characters long';
    if (city.length > 50) return 'City must not exceed 50 characters';
    if (!cityRegex.test(city)) return 'City can only contain letters and spaces';
    if (city.trim() !== city) return 'City cannot have leading or trailing spaces';
    if (/\s{2,}/.test(city)) return 'City cannot have multiple consecutive spaces';
    return '';
  };

  const validateState = (state) => {
    const stateRegex = /^[a-zA-Z\s]+$/;
    if (!state) return 'State is required';
    if (state.length < 2) return 'State must be at least 2 characters long';
    if (state.length > 50) return 'State must not exceed 50 characters';
    if (!stateRegex.test(state)) return 'State can only contain letters and spaces';
    if (state.trim() !== state) return 'State cannot have leading or trailing spaces';
    if (/\s{2,}/.test(state)) return 'State cannot have multiple consecutive spaces';
    return '';
  };

  const validatePin = (pin) => {
    const pinRegex = /^\d{6}$/;
    if (!pin) return 'PIN code is required';
    if (!/^\d+$/.test(pin)) return 'PIN code can only contain digits';
    if (!pinRegex.test(pin)) return 'Enter a valid 6-digit PIN code';
    if (pin.startsWith('0')) return 'PIN code cannot start with 0';
    return '';
  };

  // Helper function to validate field
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return validateName(value);
      case 'firmName':
        return validateFirmName(value);
      case 'mobile':
        return validateMobile(value);
      case 'email':
        return validateEmail(value);
      case 'address':
        return validateAddress(value);
      case 'city':
        return validateCity(value);
      case 'state':
        return validateState(value);
      case 'pin':
        return validatePin(value);
      default:
        return '';
    }
  };

  useEffect(() => {
    const referrer = getQueryParam('ref');
    if (referrer) setParticipant((p) => ({ ...p, referredBy: referrer }));
  }, [location.search]);

  useEffect(() => {
    const fetchTraining = async () => {
      if (cachedTrainingData[id]) {
        const data = cachedTrainingData[id];
        if (data.expiresAt && Date.now() > data.expiresAt) {
          setMessage('This training link has expired.');
        } else {
          setTraining(data);
        }
        return;
      }
      try {
        const snap = await get(ref(db, `HTAMS/company/trainings/${id}`));
        if (snap.exists()) {
          const data = snap.val();
          if (data.expiresAt && Date.now() > data.expiresAt) {
            setMessage('This training link has expired.');
          } else {
            cachedTrainingData[id] = data;
            setTraining(data);
          }
        } else {
          setMessage('Training not found or invalid link.');
        }
      } catch {
        setMessage('Error loading training. Please try again.');
      }
    };

    fetchTraining();
  }, [id, location.search]);

  // Centralized single call email existence check
  const checkEmailExists = async (email) => {
    const emailKey = email.toLowerCase().replace(/\./g, ',');
    try {
      const snap = await get(ref(db, `HTAMS/emails/${emailKey}`));
      if (snap.exists()) {
        setMessage('This email is already registered.');
        return true;
      }
      return false;
    } catch {
      setMessage('Error checking email. Please try again.');
      return true;
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Apply field-specific processing
    switch (name) {
      case 'name':
      case 'city':
      case 'state':
        processedValue = value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
        break;
      case 'firmName':
        processedValue = value.replace(/[^a-zA-Z0-9\s&.-]/g, '').replace(/\s+/g, ' ');
        break;
      case 'mobile':
        processedValue = value.replace(/\D/g, '').slice(0, 10);
        break;
      case 'email':
        processedValue = value.toLowerCase().trim();
        break;
      case 'pin':
        processedValue = value.replace(/\D/g, '').slice(0, 6);
        break;
      case 'address':
        processedValue = value.replace(/[^a-zA-Z0-9\s,./\-#()]/g, '').replace(/\s+/g, ' ');
        break;
      default:
        break;
    }

    setParticipant((prev) => ({ ...prev, [name]: processedValue }));

    const error = validateField(name, processedValue);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const requiredFieldsUser = ['name', 'mobile', 'email', 'address', 'city', 'state', 'pin'];
    const requiredFieldsFirm = ['firmName', 'mobile', 'email', 'address', 'city', 'state', 'pin'];
    const requiredFields = formMode === 'user' ? requiredFieldsUser : requiredFieldsFirm;

    let hasErrors = false;
    const newFieldErrors = {};
    for (const field of requiredFields) {
      const error = validateField(field, participant[field]);
      if (error) {
        newFieldErrors[field] = error;
        hasErrors = true;
      }
    }

    setFieldErrors(newFieldErrors);

    if (hasErrors) {
      setMessage('Please fix all field errors before submitting.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Checking if email is already registered...');
    if (await checkEmailExists(participant.email)) {
      setIsSubmitting(false);
      return;
    }

    const trainingRef = ref(db, `HTAMS/company/trainings/${id}`);
    let canJoin = false;

    await runTransaction(trainingRef, (data) => {
      if (data) {
        if ((data.joinedCount || 0) >= (data.candidates || 0)) return undefined;
        return { ...data, joinedCount: (data.joinedCount || 0) + 1 };
      }
      return data;
    }).then(r => { canJoin = r.committed; });

    if (!canJoin) {
      setMessage('All slots are filled for this training.');
      await update(trainingRef, { expiresAt: Date.now() });
      setIsSubmitting(false);
      return;
    }

    setMessage('Saving your registration...');

    const pKey = push(ref(db, `HTAMS/company/trainings/${id}/participants`)).key;
    const emailKey = participant.email.toLowerCase().replace(/\./g, ',');

    const baseData = formMode === 'user'
      ? { name: participant.name }
      : { firmName: participant.firmName, name: participant.firmName };

    const newParticipant = {
      ...baseData,
      mobile: participant.mobile,
      email: participant.email,
      referredBy: participant.referredBy,
      address: participant.address,
      city: participant.city,
      state: participant.state,
      pin: participant.pin,
      trainingId: id,
      joinedAt: Date.now(),
      status: 'joined',
      confirmedByTrainer: false,
      formMode,
    };

    const updates = {};
    updates[`HTAMS/company/trainings/${id}/participants/${pKey}`] = newParticipant;
    updates[`HTAMS/emails/${emailKey}`] = { trainingId: id, type: 'training', timestamp: Date.now() };
    updates[`HTAMS/company/trainings/${id}/updatedAt`] = Date.now();

    await update(ref(db), updates);

    setMessage('Successfully joined the training!');
    setParticipant({
      name: '',
      firmName: '',
      mobile: '',
      email: '',
      referredBy: participant.referredBy,
      address: '',
      city: '',
      state: '',
      pin: '',
    });
    setFieldErrors({});
    setIsSubmitting(false);
  };

  return (
    <div className="join-training-container">
      <div className="page-header">
        <h1 className="page-title">
          <FaShieldAlt className="title-icon" />
          Join Training Program
        </h1>
        <p className="page-subtitle">Complete your registration</p>
      </div>

      <div className="form-mode-section">
        <div className="mode-selector">
          <button
            className={`mode-option ${formMode === 'user' ? 'active' : ''}`}
            onClick={() => setFormMode('user')}
          >
            <FaUser className="mode-icon" />
            <span>Individual User</span>
          </button>
          <button
            className={`mode-option ${formMode === 'firm' ? 'active' : ''}`}
            onClick={() => setFormMode('firm')}
          >
            <FaMapMarkerAlt className="mode-icon" />
            <span>Firm / Organization</span>
          </button>
        </div>
      </div>

      {training && (
        <div className="training-details-card">
          <h3 className="card-title">Training Details</h3>
          <div className="training-details-grid">
            <div className="detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{training.location}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date</span>
              <span className="detail-value">{training.date}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time</span>
              <span className="detail-value">{training.time}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Available Slots</span>
              <span className="detail-value">
                {(training.candidates || 0) - (training.joinedCount || 0)} / {training.candidates || 0}
              </span>
            </div>
            {training.expireDate && (
              <div className="detail-item">
                <span className="detail-label">Expires</span>
                <span className="detail-value">{new Date(training.expireDate).toDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-section">
          <h3 className="section-title">
            <FaUser className="section-icon" />
            Personal Information
          </h3>
          <div className="form-grid">
            {formMode === 'user' ? (
              <div className="form-group">
                <label className="form-label">
                  <FaUser className="label-icon" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={participant.name}
                  onChange={handleChange}
                  required
                  className={`form-input ${fieldErrors.name ? 'error' : ''}`}
                />
                {fieldErrors.name && <div className="error-message">{fieldErrors.name}</div>}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  <FaMapMarkerAlt className="label-icon" />
                  Firm/Organization Name *
                </label>
                <input
                  type="text"
                  name="firmName"
                  placeholder="Firm/organization name"
                  value={participant.firmName}
                  onChange={handleChange}
                  required
                  className={`form-input ${fieldErrors.firmName ? 'error' : ''}`}
                />
                {fieldErrors.firmName && <div className="error-message">{fieldErrors.firmName}</div>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">
                <FaPhone className="label-icon" />
                Mobile Number *
              </label>
              <input
                type="tel"
                name="mobile"
                placeholder="Enter 10-digit mobile number"
                value={participant.mobile}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.mobile ? 'error' : ''}`}
              />
              {fieldErrors.mobile && <div className="error-message">{fieldErrors.mobile}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">
                <FaEnvelope className="label-icon" />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={participant.email}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              />
              {fieldErrors.email && <div className="error-message">{fieldErrors.email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">
                <FaUser className="label-icon" />
                Referred By
              </label>
              <input
                type="text"
                name="referredBy"
                placeholder="Referrer name (auto-filled)"
                value={participant.referredBy}
                readOnly
                className="form-input readonly"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">
            <FaMapMarkerAlt className="section-icon" />
            Address Information
          </h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">
                <FaMapMarkerAlt className="label-icon" />
                Address *
              </label>
              <input
                type="text"
                name="address"
                placeholder="Enter your full address"
                value={participant.address}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.address ? 'error' : ''}`}
              />
              {fieldErrors.address && <div className="error-message">{fieldErrors.address}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                name="city"
                placeholder="Enter your city"
                value={participant.city}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.city ? 'error' : ''}`}
              />
              {fieldErrors.city && <div className="error-message">{fieldErrors.city}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <input
                type="text"
                name="state"
                placeholder="Enter your state"
                value={participant.state}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.state ? 'error' : ''}`}
              />
              {fieldErrors.state && <div className="error-message">{fieldErrors.state}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">PIN Code *</label>
              <input
                type="text"
                name="pin"
                placeholder="Enter 6-digit PIN code"
                value={participant.pin}
                onChange={handleChange}
                maxLength="6"
                required
                className={`form-input ${fieldErrors.pin ? 'error' : ''}`}
              />
              {fieldErrors.pin && <div className="error-message">{fieldErrors.pin}</div>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`submit-button ${isSubmitting ? 'disabled' : ''}`}
          disabled={isSubmitting || !training}
        >
          {isSubmitting ? (
            <>
              <FaSpinner className="spinner" />
              Processing...
            </>
          ) : (
            <>
              <FaCheck />
              Join Training Now
            </>
          )}
        </button>
      </form>

      {message && (
        <div className={`notification ${
          message.includes('Successfully') || message.includes('success')
            ? 'success'
            : message.includes('Checking') || message.includes('Processing')
              ? 'info'
              : 'error'
        }`}>
          {message}
        </div>
      )}

      


      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container */
        .join-training-container {
          font-family: 'Inter', sans-serif;
          padding: 16px;
          background: #f8fafc;
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Page Header */
        .page-header {
          text-align: center;
          margin-bottom: 24px;
          padding: 24px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .title-icon {
          color: #6366f1;
          font-size: 1.5rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 1rem;
          margin: 0;
        }

        /* Form Mode Section */
        .form-mode-section {
          margin-bottom: 24px;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .mode-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-option:hover {
          border-color: #6366f1;
          color: #6366f1;
        }

        .mode-option.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: #6366f1;
          color: white;
        }

        .mode-icon {
          font-size: 1.1rem;
        }

        /* Training Details Card */
        .training-details-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }

        .training-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.875rem;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }

        /* Registration Form */
        .registration-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .verification-section {
          border: 2px solid #f59e0b;
          background: #fefbf2;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }

        .section-icon {
          color: #6366f1;
          font-size: 1.1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label-icon {
          color: #6366f1;
          font-size: 0.875rem;
        }

        .form-input {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          // font-size: 16px;
          font-family: inherit;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-input.readonly {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .form-input.success {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .file-input {
          padding: 8px;
        }

        .help-text {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 4px;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }

        .success-message {
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }

        /* Verification Grid */
        .verification-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .verification-actions {
          display: flex;
          justify-content: center;
        }

        .otp-verification {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .action-button.primary {
          background: #6366f1;
          color: white;
        }

        .action-button.primary:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .action-button.success {
          background: #10b981;
          color: white;
          cursor: default;
        }

        .action-button.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Verified Details */
        .verified-details {
          margin-top: 20px;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
        }

        .verified-details.success {
          background: #f0fdf4;
          border-color: #10b981;
        }

        .verified-details.error {
          background: #fef2f2;
          border-color: #ef4444;
        }

        .verified-details h4 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .verification-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .verification-detail {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .verification-detail:last-child {
          border-bottom: none;
        }

        .name-mismatch-warning {
          background: rgba(239, 68, 68, 0.1);
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }

        .name-mismatch-warning p {
          margin: 0;
          color: #dc2626;
          font-size: 0.875rem;
        }

        /* Submit Button */
        .submit-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .submit-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .submit-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Notification */
        .notification {
          padding: 16px 20px;
          margin-top: 24px;
          border-radius: 12px;
          font-weight: 600;
          text-align: center;
          animation: slideIn 0.3s ease-out;
        }

        .notification.success {
          background: #f0fdf4;
          color: #15803d;
          border: 2px solid #22c55e;
        }

        .notification.error {
          background: #fef2f2;
          color: #dc2626;
          border: 2px solid #ef4444;
        }

        .notification.info {
          background: #f0f9ff;
          color: #0369a1;
          border: 2px solid #0ea5e9;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Tablet Styles (768px and up) */
        @media (min-width: 768px) {
          .join-training-container {
            padding: 24px;
            max-width: 900px;
            margin: 0 auto;
          }

          .mode-selector {
            grid-template-columns: 1fr 1fr;
          }

          .training-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }

          .verification-grid {
            grid-template-columns: 2fr 1fr;
            align-items: end;
          }

          .otp-verification {
            grid-template-columns: 2fr 1fr;
            align-items: end;
          }

          .verification-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        /* Desktop Styles (1024px and up) */
        @media (min-width: 1024px) {
          .join-training-container {
            padding: 32px;
            max-width: 1000px;
          }

          .training-details-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .form-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .verification-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default JoinTraining;
