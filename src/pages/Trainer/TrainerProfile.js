// TrainerProfile.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { auth } from '../../firebase/config';
import { 
  FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaIdCard, 
  FaCalendar, FaBriefcase, FaEdit, FaSave, FaTimes, FaEye, FaEyeSlash 
} from 'react-icons/fa';

const TrainerProfile = () => {
  const [trainerData, setTrainerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editableAddress, setEditableAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [currentTrainer, setCurrentTrainer] = useState(null); // **ADDED: Store trainer info**
  const [showSensitive, setShowSensitive] = useState({
    aadhar: false,
    pan: false
  });

  useEffect(() => {
    // **FIXED: Use localStorage trainer data instead of Firebase Auth**
    const checkTrainerAuth = () => {
      const storedTrainer = localStorage.getItem('htamsTrainer');
      
      if (!storedTrainer) {
        setError('Trainer not authenticated. Please log in again.');
        setLoading(false);
        return null;
      }

      try {
        const trainer = JSON.parse(storedTrainer);
        if (!trainer.trainerId) {
          setError('Invalid trainer session. Please log in again.');
          setLoading(false);
          return null;
        }
        
        console.log('Trainer loaded from localStorage:', trainer);
        setCurrentTrainer(trainer);
        return trainer;
      } catch (err) {
        console.error('Error parsing trainer data:', err);
        setError('Invalid trainer session. Please log in again.');
        setLoading(false);
        return null;
      }
    };

    const trainer = checkTrainerAuth();
    if (!trainer) return;

    const db = getDatabase();
    const trainerId = trainer.trainerId; // **FIXED: Use trainerId from localStorage**
    const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);

    console.log('Setting up Firebase listener for trainer:', trainerId);

    // Set up real-time listener for trainer data
    const unsubscribe = onValue(trainerRef, (snapshot) => {
      try {
        const data = snapshot.val();
        console.log('Trainer data received:', data);
        
        if (data) {
          setTrainerData(data);
          setEditableAddress(data.address || '');
          setError(null);
        } else {
          setError('Trainer profile not found in database');
        }
      } catch (err) {
        console.error('Error fetching trainer data:', err);
        setError('Failed to load trainer profile');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      setError('Failed to connect to database');
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up Firebase listener');
      unsubscribe();
    };
  }, []);

  const handleEdit = () => {
    setEditMode(true);
    setEditableAddress(trainerData?.address || '');
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditableAddress(trainerData?.address || '');
  };

  const handleSave = async () => {
    if (!currentTrainer || !currentTrainer.trainerId) {
      setError('Trainer session expired. Please log in again.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const db = getDatabase();
      const trainerId = currentTrainer.trainerId; // **FIXED: Use stored trainer ID**
      const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
      
      console.log('Updating address for trainer:', trainerId);
      
      // Update only the address field in Firebase
      await update(trainerRef, {
        address: editableAddress.trim(),
        lastUpdated: new Date().toISOString() // **ADDED: Track update time**
      });

      setEditMode(false);
      console.log('Address updated successfully');
    } catch (error) {
      console.error('Error updating address:', error);
      setError('Failed to update address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString; // Return original if parsing fails
    }
  };

  const formatCardNumber = (cardNumber, type) => {
    if (!cardNumber) return 'Not provided';
    if (showSensitive[type]) {
      return cardNumber;
    }
    const visibleChars = Math.min(4, cardNumber.length);
    return `${cardNumber.slice(0, visibleChars)}${'*'.repeat(Math.max(0, cardNumber.length - visibleChars))}`;
  };

  const toggleSensitive = (type) => {
    setShowSensitive(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '1.2rem',
        color: '#1a2332'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading trainer profile...
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#dc2626'
      }}>
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Error Loading Profile</h3>
          <p style={{ margin: '0 0 1rem 0' }}>{error}</p>
          {error.includes('log in') && (
            <button 
              onClick={() => window.location.href = '/trainer-login'}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!trainerData) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <p>Trainer profile not found</p>
      </div>
    );
  }

  return (
    <div className="trainer-profile-container">
      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Compact Header Section */}
      <div className="profile-header">
        <div className="header-content">
          <div className="profile-avatar">
            {trainerData.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          
          <div className="profile-info">
            <h1 className="trainer-name">
              {trainerData.name || 'Unknown Trainer'}
            </h1>
            <p className="trainer-role">Professional Trainer</p>
            <div className="status-badges">
              <span className={`status-badge ${trainerData.active !== false ? 'active' : 'inactive'}`}>
                {trainerData.active !== false ? 'Active' : 'Inactive'}
              </span>
              <span className="experience-badge">
                Experience: {trainerData.experience || 'Not specified'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="profile-details">
        {/* Contact Information */}
        <div className="info-section">
          <h2 className="section-title">
            Contact Information
          </h2>

          <div className="fields-grid">
            <div className="profile-field">
              <div className="field-label">
                <FaUser className="field-icon" />
                Full Name
              </div>
              <div className="field-value readonly">
                {trainerData.name || 'Not provided'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaEnvelope className="field-icon" />
                Email Address
              </div>
              <div className="field-value readonly">
                {trainerData.email || 'Not provided'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaPhone className="field-icon" />
                Phone Number
              </div>
              <div className="field-value readonly">
                {trainerData.phone || 'Not provided'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaCalendar className="field-icon" />
                Date of Birth
              </div>
              <div className="field-value readonly">
                {formatDate(trainerData.birthDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Address Information (Editable) */}
        <div className="info-section">
          <div className="section-header">
            <h2 className="section-title">Address Information</h2>
            
            {!editMode ? (
              <button className="edit-btn" onClick={handleEdit}>
                <FaEdit />
                Edit Address
              </button>
            ) : (
              <div className="edit-actions">
                <button 
                  className="save-btn" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FaSave />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                
                <button 
                  className="cancel-btn" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="fields-grid">
            <div className={`profile-field ${editMode ? 'full-width' : ''}`}>
              <div className="field-label">
                <FaMapMarkerAlt className="field-icon" />
                Full Address
              </div>
              {editMode ? (
                <textarea
                  className="address-textarea"
                  value={editableAddress}
                  onChange={(e) => setEditableAddress(e.target.value)}
                  placeholder="Enter full address..."
                />
              ) : (
                <div className="field-value">
                  {trainerData.address ? (
                    trainerData.address.split('\n').map((line, index) => (
                      <div key={index}>{line}</div>
                    ))
                  ) : 'Not provided'}
                </div>
              )}
            </div>

            {!editMode && (
              <>
                <div className="profile-field">
                  <div className="field-label">
                    <FaMapMarkerAlt className="field-icon" />
                    City
                  </div>
                  <div className="field-value readonly">
                    {trainerData.city || 'Not provided'}
                  </div>
                </div>

                <div className="profile-field">
                  <div className="field-label">
                    <FaMapMarkerAlt className="field-icon" />
                    State
                  </div>
                  <div className="field-value readonly">
                    {trainerData.state || 'Not provided'}
                  </div>
                </div>

                <div className="profile-field">
                  <div className="field-label">
                    <FaMapMarkerAlt className="field-icon" />
                    Pincode
                  </div>
                  <div className="field-value readonly">
                    {trainerData.pincode || 'Not provided'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Identity Information */}
        <div className="info-section">
          <h2 className="section-title">Identity Information</h2>

          <div className="fields-grid">
            <div className="profile-field">
              <div className="field-label">
                <FaIdCard className="field-icon" />
                Aadhar Card
              </div>
              <div className="sensitive-field">
                <div className="field-value readonly">
                  {formatCardNumber(trainerData.aadharCard, 'aadhar')}
                </div>
                {trainerData.aadharCard && (
                  <button
                    className="toggle-btn"
                    onClick={() => toggleSensitive('aadhar')}
                  >
                    {showSensitive.aadhar ? <FaEyeSlash /> : <FaEye />}
                  </button>
                )}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaIdCard className="field-icon" />
                PAN Card
              </div>
              <div className="sensitive-field">
                <div className="field-value readonly">
                  {formatCardNumber(trainerData.panCard, 'pan')}
                </div>
                {trainerData.panCard && (
                  <button
                    className="toggle-btn"
                    onClick={() => toggleSensitive('pan')}
                  >
                    {showSensitive.pan ? <FaEyeSlash /> : <FaEye />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="info-section">
          <h2 className="section-title">Account Information</h2>

          <div className="fields-grid">
            <div className="profile-field">
              <div className="field-label">
                <FaCalendar className="field-icon" />
                Registration Date
              </div>
              <div className="field-value readonly">
                {formatDate(trainerData.registrationDate)}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaCalendar className="field-icon" />
                Last Login
              </div>
              <div className="field-value readonly">
                {formatDate(trainerData.lastLoginAt)}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaBriefcase className="field-icon" />
                Role
              </div>
              <div className="field-value readonly">
                {trainerData.role?.toUpperCase() || 'TRAINER'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaIdCard className="field-icon" />
                Trainer ID
              </div>
              <div className="field-value readonly">
                {trainerData.id || currentTrainer?.trainerId || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Mobile-First Compact Professional Design */
        .trainer-profile-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0.625rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 0.875rem;
          margin-bottom: 0.875rem;
          color: #dc2626;
          font-size: 0.85rem;
          font-weight: 500;
        }

        /* Compact Header - Mobile-First */
        .profile-header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 18px;
          padding: 1.125rem;
          margin-bottom: 0.875rem;
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.25);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          flex-wrap: wrap;
        }

        .profile-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: white;
          border: 3px solid rgba(255,255,255,0.25);
          flex-shrink: 0;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .trainer-name {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.2rem 0;
          color: white;
          line-height: 1.2;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .trainer-role {
          font-size: 0.875rem;
          opacity: 0.9;
          margin: 0 0 0.625rem 0;
          color: white;
          font-weight: 500;
        }

        .status-badges {
          display: flex;
          gap: 0.625rem;
          flex-wrap: wrap;
        }

        .status-badge {
          padding: 0.35rem 0.75rem;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 600;
          line-height: 1;
        }

        .status-badge.active {
          background: #10b981;
          color: white;
        }

        .status-badge.inactive {
          background: #f59e0b;
          color: white;
        }

        .experience-badge {
          background: rgba(255,255,255,0.25);
          color: white;
          padding: 0.35rem 0.75rem;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1;
        }

        /* Profile Details - Compact */
        .profile-details {
          background: white;
          border-radius: 18px;
          box-shadow: 0 3px 15px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .info-section {
          padding: 1.125rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .info-section:last-child {
          border-bottom: none;
        }

        .section-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 0.875rem 0;
          line-height: 1.2;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.875rem;
          flex-wrap: wrap;
          gap: 0.625rem;
        }

        /* Fields Grid - Compact */
        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 0.875rem;
        }

        .profile-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .profile-field.full-width {
          grid-column: 1 / -1;
        }

        .field-label {
          font-weight: 600;
          color: #4b5563;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
        }

        .field-icon {
          margin-right: 0.45rem;
          color: #3b82f6;
          font-size: 0.85rem;
        }

        .field-value {
          padding: 0.7rem;
          background: #f8fafc;
          border-radius: 10px;
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.4;
          min-height: 42px;
          display: flex;
          align-items: center;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .field-value.readonly {
          background: #f1f5f9;
          color: #64748b;
        }

        /* Sensitive Fields */
        .sensitive-field {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sensitive-field .field-value {
          flex: 1;
        }

        .toggle-btn {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-btn:hover {
          color: #3b82f6;
        }

        /* Edit Buttons - Compact */
        .edit-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 0.6rem 0.95rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 500;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          box-shadow: 0 3px 12px rgba(59, 130, 246, 0.25);
        }

        .edit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .edit-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .save-btn {
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          color: white;
          border: none;
          padding: 0.6rem 0.95rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 500;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          box-shadow: 0 3px 12px rgba(16, 185, 129, 0.25);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .cancel-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          padding: 0.6rem 0.95rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 500;
          font-size: 0.8rem;
          transition: all 0.2s ease;
          box-shadow: 0 3px 12px rgba(245, 158, 11, 0.25);
        }

        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        /* Address Textarea - Compact */
        .address-textarea {
          width: 100%;
          min-height: 75px;
          padding: 0.7rem;
          border: 2px solid #3b82f6;
          border-radius: 10px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
          outline: none;
          background: #f8fafc;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .address-textarea:focus {
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Responsive Design - Tablet */
        @media (max-width: 768px) {
          .trainer-profile-container {
            padding: 0.5rem;
          }

          .profile-header {
            padding: 1rem;
            border-radius: 16px;
          }

          .header-content {
            gap: 0.75rem;
          }

          .profile-avatar {
            width: 58px;
            height: 58px;
            font-size: 1.6rem;
          }

          .trainer-name {
            font-size: 1.35rem;
          }

          .trainer-role {
            font-size: 0.8rem;
          }

          .status-badge,
          .experience-badge {
            font-size: 0.7rem;
            padding: 0.3rem 0.65rem;
          }

          .profile-details {
            border-radius: 16px;
          }

          .info-section {
            padding: 1rem;
          }

          .section-title {
            font-size: 1rem;
          }

          .fields-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .field-label {
            font-size: 0.7rem;
          }

          .field-value {
            padding: 0.65rem;
            font-size: 0.85rem;
            min-height: 40px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .edit-btn,
          .save-btn,
          .cancel-btn {
            font-size: 0.75rem;
            padding: 0.55rem 0.85rem;
          }

          .edit-actions {
            width: 100%;
          }

          .address-textarea {
            min-height: 70px;
            font-size: 0.85rem;
          }
        }

        /* Responsive Design - Phone */
        @media (max-width: 480px) {
          .trainer-profile-container {
            padding: 0.5rem;
          }

          .profile-header {
            padding: 0.875rem;
            border-radius: 14px;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 0.625rem;
          }

          .profile-avatar {
            width: 60px;
            height: 60px;
            font-size: 1.65rem;
          }

          .trainer-name {
            font-size: 1.25rem;
          }

          .trainer-role {
            font-size: 0.75rem;
          }

          .status-badges {
            justify-content: center;
            width: 100%;
          }

          .status-badge,
          .experience-badge {
            font-size: 0.7rem;
            padding: 0.3rem 0.6rem;
          }

          .profile-details {
            border-radius: 14px;
          }

          .info-section {
            padding: 0.875rem;
          }

          .section-title {
            font-size: 0.95rem;
          }

          .section-header {
            gap: 0.5rem;
          }

          .fields-grid {
            gap: 0.75rem;
          }

          .field-label {
            font-size: 0.7rem;
          }

          .field-icon {
            font-size: 0.8rem;
            margin-right: 0.4rem;
          }

          .field-value {
            padding: 0.625rem;
            font-size: 0.8rem;
            min-height: 38px;
            border-radius: 8px;
          }

          .edit-btn {
            width: 100%;
            justify-content: center;
            font-size: 0.75rem;
            padding: 0.55rem 0.8rem;
          }

          .edit-actions {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }

          .save-btn,
          .cancel-btn {
            width: 100%;
            justify-content: center;
            font-size: 0.75rem;
            padding: 0.55rem 0.8rem;
          }

          .address-textarea {
            min-height: 65px;
            padding: 0.625rem;
            font-size: 0.8rem;
            border-radius: 8px;
          }

          .sensitive-field {
            gap: 0.4rem;
          }

          .toggle-btn {
            padding: 0.4rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainerProfile;
