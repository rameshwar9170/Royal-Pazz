// TrainerProfile.jsx
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
  const [showSensitive, setShowSensitive] = useState({
    aadhar: false,
    pan: false
  });

  useEffect(() => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const trainerId = auth.currentUser.uid;
    const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);

    // Set up real-time listener for trainer data
    const unsubscribe = onValue(trainerRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          setTrainerData(data);
          setEditableAddress(data.address || '');
          setError(null);
        } else {
          setError('Trainer profile not found');
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

    return () => unsubscribe();
  }, []);

  const handleEdit = () => {
    setEditMode(true);
    setEditableAddress(trainerData.address || '');
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditableAddress(trainerData.address || '');
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const db = getDatabase();
      const trainerId = auth.currentUser.uid;
      const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
      
      // Update only the address field in Firebase
      await update(trainerRef, {
        address: editableAddress.trim()
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
          <p style={{ margin: '0' }}>{error}</p>
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
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '2rem'
    }}>
      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1a2332 0%, #2d3748 100%)',
        borderRadius: '16px 16px 0 0',
        padding: '2rem',
        color: 'white',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 'bold',
            border: '4px solid rgba(255,255,255,0.2)'
          }}>
            {trainerData.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0 0 0.5rem 0'
            }}>
              {trainerData.name || 'Unknown Trainer'}
            </h1>
            <p style={{
              fontSize: '1.2rem',
              opacity: '0.9',
              margin: '0 0 1rem 0'
            }}>
              Professional Trainer
            </p>
            <div style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              fontSize: '0.95rem'
            }}>
              <span style={{
                background: trainerData.active ? '#10b981' : '#dc2626',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontWeight: '500'
              }}>
                {trainerData.active ? 'Active' : 'Inactive'}
              </span>
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '20px'
              }}>
                Experience: {trainerData.experience || 'Not specified'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div style={{
        background: 'white',
        borderRadius: '0 0 16px 16px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Contact Information */}
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a2332',
            margin: '0 0 1.5rem 0'
          }}>
            Contact Information
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            <div className="profile-field">
              <div className="field-label">
                <FaUser style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Full Name
              </div>
              <div className="field-value readonly">
                {trainerData.name || 'Not provided'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaEnvelope style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Email Address
              </div>
              <div className="field-value readonly">
                {trainerData.email || 'Not provided'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaPhone style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Phone Number
              </div>
              <div className="field-value readonly">
                {trainerData.phone || 'Not provided'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaCalendar style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Date of Birth
              </div>
              <div className="field-value readonly">
                {formatDate(trainerData.birthDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Address Information (Editable) */}
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1a2332',
              margin: '0'
            }}>
              Address Information
            </h2>
            
            {!editMode ? (
              <button
                onClick={handleEdit}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
              >
                <FaEdit />
                Edit Address
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  <FaSave />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  <FaTimes />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            <div className="profile-field" style={{ gridColumn: editMode ? '1 / -1' : 'auto' }}>
              <div className="field-label">
                <FaMapMarkerAlt style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Full Address
              </div>
              {editMode ? (
                <textarea
                  value={editableAddress}
                  onChange={(e) => setEditableAddress(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '0.75rem',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    background: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
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
                    <FaMapMarkerAlt style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                    City
                  </div>
                  <div className="field-value readonly">
                    {trainerData.city || 'Not provided'}
                  </div>
                </div>

                <div className="profile-field">
                  <div className="field-label">
                    <FaMapMarkerAlt style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                    State
                  </div>
                  <div className="field-value readonly">
                    {trainerData.state || 'Not provided'}
                  </div>
                </div>

                <div className="profile-field">
                  <div className="field-label">
                    <FaMapMarkerAlt style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
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
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a2332',
            margin: '0 0 1.5rem 0'
          }}>
            Identity Information
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            <div className="profile-field">
              <div className="field-label">
                <FaIdCard style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Aadhar Card
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="field-value readonly" style={{ flex: 1 }}>
                  {formatCardNumber(trainerData.aadharCard, 'aadhar')}
                </div>
                <button
                  onClick={() => toggleSensitive('aadhar')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#3b82f6'}
                  onMouseOut={(e) => e.target.style.color = '#6b7280'}
                >
                  {showSensitive.aadhar ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaIdCard style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                PAN Card
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="field-value readonly" style={{ flex: 1 }}>
                  {formatCardNumber(trainerData.panCard, 'pan')}
                </div>
                <button
                  onClick={() => toggleSensitive('pan')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.color = '#3b82f6'}
                  onMouseOut={(e) => e.target.style.color = '#6b7280'}
                >
                  {showSensitive.pan ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div style={{
          padding: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a2332',
            margin: '0 0 1.5rem 0'
          }}>
            Account Information
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            <div className="profile-field">
              <div className="field-label">
                <FaCalendar style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Registration Date
              </div>
              <div className="field-value readonly">
                {formatDate(trainerData.registrationDate)}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaCalendar style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Last Login
              </div>
              <div className="field-value readonly">
                {formatDate(trainerData.lastLoginAt)}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaBriefcase style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Role
              </div>
              <div className="field-value readonly">
                {trainerData.role?.toUpperCase() || 'TRAINER'}
              </div>
            </div>

            <div className="profile-field">
              <div className="field-label">
                <FaIdCard style={{ marginRight: '0.5rem', color: '#3b82f6' }} />
                Trainer ID
              </div>
              <div className="field-value readonly">
                {trainerData.id || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field-value {
          padding: 0.75rem;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 0.95rem;
          color: #1a2332;
          line-height: 1.5;
          min-height: 48px;
          display: flex;
          align-items: center;
          border: 1px solid #e5e7eb;
        }

        .field-value.readonly {
          background: #f1f5f9;
          color: #475569;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .profile-field {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainerProfile;
