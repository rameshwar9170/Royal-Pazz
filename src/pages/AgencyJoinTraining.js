import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { ref, onValue, push } from 'firebase/database';
import { db } from '../firebase/config';
import { 
  FaWhatsapp, FaEnvelope, FaCopy, FaUser, FaEnvelope as FaEmail, 
  FaPhone, FaIdCard, FaMapMarkerAlt, FaCalendarAlt, FaLink, 
  FaCheck, FaUsers, FaClipboardList, FaExclamationTriangle, 
  FaSpinner, FaClock, FaRupeeSign 
} from 'react-icons/fa';

const AgencyTraining = () => {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchParams] = useSearchParams();
  const referralId = searchParams.get('ref');
  const isJoining = !!referralId;

  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    phone: '',
    aadhar: '',
  });
  const [registrationDone, setRegistrationDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read currentUser once on mount
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const storedUser = localStorage.getItem('htamsUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        console.log('Current user loaded:', user);
      } catch (e) {
        console.error('Error parsing user data:', e);
        setCurrentUser(null);
      }
    } else {
      console.log('No user found in localStorage');
      setCurrentUser(null);
    }
  }, []);

  const currentUserId = useMemo(() => currentUser?.uid || '', [currentUser]);

  // For path matching using React Router's useLocation
  const location = useLocation();

  // Extract trainingId from path only when location.pathname changes
  const trainingId = useMemo(() => {
    const matches = location.pathname.match(/\/join-training\/(.+)/);
    const id = matches ? matches[1] : null;
    console.log('Training ID from URL:', id);
    return id;
  }, [location.pathname]);

  // Subscribe to trainings once on mount - ENHANCED VERSION
  useEffect(() => {
    console.log('=== STARTING TRAINING FETCH ===');
    setLoading(true);
    setError(null);
    
    const trainingRef = ref(db, 'HTAMS/company/trainings');
    console.log('Database reference created for:', 'HTAMS/company/trainings');
    
    const unsubscribe = onValue(
      trainingRef, 
      (snapshot) => {
        console.log('=== FIREBASE RESPONSE RECEIVED ===');
        console.log('Snapshot exists:', snapshot.exists());
        
        const data = snapshot.val();
        console.log('Raw data from Firebase:', data);
        
        if (data && typeof data === 'object') {
          console.log('Data keys:', Object.keys(data));
          
          // **ENHANCED: Calculate training duration in days**
          const calculateTrainingDays = (startDate, endDate) => {
            if (!startDate || !endDate) return 1; // Default to 1 day if dates missing
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
            return diffDays;
          };
          
          const formatted = Object.entries(data)
            .map(([id, value]) => {
              console.log(`Processing training ${id}:`, value);
              
              // Validate required fields
              if (!value || typeof value !== 'object') {
                console.warn(`Invalid training data for ${id}:`, value);
                return null;
              }
              
              const training = {
                id,
                location: value.location || 'Location TBD',
                venue: value.venue || 'Venue TBD',
                // **UPDATED: Use actual start and end dates**
                startDate: value.startDate || 'Not specified',
                endDate: value.endDate || 'Not specified', 
                trainingDays: calculateTrainingDays(value.startDate, value.endDate),
                time: value.time || 'Time TBD',
                expireDate: value.expireDate,
                fees: value.fees || 0,
                accessDuration: value.accessDuration || 0,
                products: value.products || [],
                trainerName: value.trainerName || 'TBD',
                joinLink: value.joinLink || `${window.location.origin}/join-training/${id}`,
                participants: value.participants ? Object.values(value.participants) : [],
              };
              
              console.log(`Formatted training ${id}:`, training);
              return training;
            })
            .filter(training => {
              if (!training) return false;
              
              // Check expiry - if no expireDate, include it
              if (!training.expireDate) {
                console.log(`Training ${training.id} has no expire date, including it`);
                return true;
              }
              
              const isValid = new Date() <= new Date(training.expireDate);
              console.log(`Training ${training.id} expiry check:`, {
                expireDate: training.expireDate,
                now: new Date().toISOString(),
                isValid
              });
              return isValid;
            });
          
          console.log('=== FINAL FORMATTED TRAININGS ===', formatted);
          setTrainings(formatted);
          
          if (formatted.length === 0) {
            console.warn('No valid trainings found after filtering');
          }
        } else {
          console.log('No data or invalid data structure');
          setTrainings([]);
        }
        
        setLoading(false);
      }, 
      (error) => {
        console.error('=== FIREBASE ERROR ===', error);
        setError(error.message || 'Failed to load trainings');
        setLoading(false);
      }
    );
    
    return () => {
      console.log('Cleaning up Firebase listener');
      unsubscribe();
    };
  }, []);

  // Handle form submission for candidate registration
  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!trainingId) {
      alert('Invalid training link');
      setIsSubmitting(false);
      return;
    }

    try {
      await push(ref(db, `HTAMS/company/trainings/${trainingId}/participants`), {
        name: candidateForm.name,
        email: candidateForm.email,
        phone: candidateForm.phone,
        aadhar: candidateForm.aadhar,
        referredBy: {
          id: referralId,
          name: currentUser?.name || '',
        },
        registeredAt: new Date().toISOString(),
      });
      setRegistrationDone(true);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy link to clipboard handler
  const handleCopy = (link, id) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Share via WhatsApp
  const handleShareWhatsapp = (link) => {
    const text = encodeURIComponent(`Join this training: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Share via Email
  const handleShareEmail = (link) => {
    const subject = encodeURIComponent('Join Training Invitation');
    const body = encodeURIComponent(`Hi,\n\nJoin this training session using the link below:\n${link}\n\nThanks!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

 
  if (loading) {
    return (
      <div className="training-container">
        <div className="loading-container">
          <div className="loading-content">
            <FaSpinner className="loading-icon" />
            <h3>Loading Training Programs</h3>
            <p>Please wait while we fetch your training data...</p>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="training-container">
        <div className="error-container">
          <FaExclamationTriangle className="error-icon" />
          <h3>Unable to Load Trainings</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Try Again
          </button>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // If user is joining via referral link and registration is done, show success message
  if (isJoining) {
    if (registrationDone) {
      return (
        <div className="training-container">
          <div className="success-container">
            <div className="success-icon">
              <FaCheck />
            </div>
            <h2 className="success-title">Registration Successful!</h2>
            
            <div className="success-details">
              <div className="detail-item">
                <FaUser className="detail-icon" />
                <div>
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{candidateForm.name}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <FaEmail className="detail-icon" />
                <div>
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{candidateForm.email}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <FaPhone className="detail-icon" />
                <div>
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{candidateForm.phone}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <FaIdCard className="detail-icon" />
                <div>
                  <span className="detail-label">Referred by ID</span>
                  <span className="detail-value">{referralId}</span>
                </div>
              </div>
            </div>
            
            <p className="success-message">
              Thank you for registering! You will receive further details via email.
            </p>
          </div>
          <style jsx>{styles}</style>
        </div>
      );
    }

    return (
      <div className="training-container">
        <div className="registration-container">
          <div className="registration-header">
            <FaClipboardList className="header-icon" />
            <h2 className="registration-title">Join Training Registration</h2>
            <p className="registration-subtitle">Fill in your details to register for the training</p>
          </div>

          <form onSubmit={handleCandidateSubmit} className="registration-form">
            <div className="form-group">
              <label className="form-label">
                <FaUser className="label-icon" />
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaEmail className="label-icon" />
                Email Address *
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaPhone className="label-icon" />
                Phone Number *
              </label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={candidateForm.phone}
                onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FaIdCard className="label-icon" />
                Aadhar Number *
              </label>
              <input
                type="text"
                placeholder="Enter your Aadhar number"
                value={candidateForm.aadhar}
                onChange={(e) => setCandidateForm({ ...candidateForm, aadhar: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="submit-button">
              {isSubmitting ? (
                <>
                  <div className="button-spinner"></div>
                  Registering...
                </>
              ) : (
                <>
                  <FaCheck className="button-icon" />
                  Register for Training
                </>
              )}
            </button>
          </form>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // Main dashboard view for training list
  return (
    <div className="training-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1  style={{ color: '#ffffff' }}>
            
            Training Dashboard
          </h1>
          <p className="dashboard-subtitle">Manage and share your training programs</p>
        </div>
        
        <div className="user-info">
          <div className="user-card">
            <FaUser className="user-icon" />
            <div className="user-details">
              <span className="user-name">{currentUser?.name || 'User'}</span>
              <span className="user-id">ID: {currentUserId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Training List */}
      <div className="trainings-container">
        {trainings.length > 0 ? (
          <div className="trainings-grid">
            {trainings.map((training) => {
              console.log('Rendering training:', {
                id: training.id,
                location: training.location,
                startDate: training.startDate,
                trainingDays: training.trainingDays,
                expireDate: training.expireDate,
                participantsCount: training.participants.length
              });

              const link = `${training.joinLink}?ref=${currentUserId}`;
              const myReferredCandidates = training.participants.filter(
                p => p?.referredBy?.id === currentUserId
              );

              return (
                <div key={training.id} className="training-card">
                  <div className="training-header">
                    <div className="training-info">
                      <div className="info-item">
                        <FaMapMarkerAlt className="info-icon" />
                        <span className="info-text">
                          <strong>Location:</strong> {training.location || 'Location TBD'}
                        </span>
                      </div>
                      
                      <div className="info-item">
                        <FaMapMarkerAlt className="info-icon" />
                        <span className="info-text">
                          <strong>Venue:</strong> {training.venue || 'Venue TBD'}
                        </span>
                      </div>
                      
                      {/* **NEW: Display training start date** */}
                      <div className="info-item">
                        <FaCalendarAlt className="info-icon" />
                        <span className="info-text">
                          <strong>Start Date:</strong> {
                            training.startDate && training.startDate !== "Not specified" 
                              ? new Date(training.startDate).toLocaleDateString('en-IN', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : "Date to be announced"
                          }
                        </span>
                      </div>
                      
                      {/* **NEW: Display total training days** */}
                      <div className="info-item duration-info">
                        <FaCalendarAlt className="info-icon" />
                        <span className="info-text">
                          <strong>Duration:</strong> {training.trainingDays} {training.trainingDays === 1 ? 'Day' : 'Days'}
                        </span>
                      </div>
                      
                      {/* **NEW: Display training time** */}
                      {training.time && training.time !== 'Time TBD' && (
                        <div className="info-item">
                          <FaClock className="info-icon" />
                          <span className="info-text">
                            <strong>Time:</strong> {training.time}
                          </span>
                        </div>
                      )}
                      
                      {/* **NEW: Display trainer name**
                      {training.trainerName && training.trainerName !== 'TBD' && (
                        <div className="info-item">
                          <FaUser className="info-icon" />
                          <span className="info-text">
                            <strong>Trainer:</strong> {training.trainerName}
                          </span>
                        </div>
                      )} */}
                      
                      {/* **NEW: Display training fees** */}
                      {training.fees > 0 && (
                        <div className="info-item fees-info">
                          <FaRupeeSign className="info-icon" />
                          <span className="info-text">
                            <strong>Fees:</strong> ₹{training.fees.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      {/* **NEW: Display training products**
                      {training.products && training.products.length > 0 && (
                        <div className="info-item">
                          <FaUser className="info-icon" />
                          <span className="info-text">
                            <strong>Products:</strong> {
                              Array.isArray(training.products) 
                                ? training.products.join(', ') 
                                : training.products
                            }
                          </span>
                        </div>
                      )} */}
                      
                      {/* Add expiry date display */}
                      {training.expireDate && (
                        <div className="info-item expire-info">
                          <FaCalendarAlt className="info-icon" />
                          <span className="info-text">
                            <strong>Registration Closes:</strong> {new Date(training.expireDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="training-link">
                    <label className="link-label">
                      <FaLink className="link-icon" />
                      Join Link
                    </label>
                    <div className="link-container">
                      <a href={link} className="link-text" target="_blank" rel="noopener noreferrer">
                        {link}
                      </a>
                    </div>
                  </div>

                  <div className="share-buttons">
                    <button
                      onClick={() => handleCopy(link, training.id)}
                      className={`share-button copy-button ${copiedId === training.id ? 'copied' : ''}`}
                    >
                      <FaCopy className="button-icon" />
                      {copiedId === training.id ? 'Copied!' : 'Copy'}
                    </button>

                    <button
                      onClick={() => handleShareWhatsapp(link)}
                      className="share-button whatsapp-button"
                    >
                      <FaWhatsapp className="button-icon" />
                      WhatsApp
                    </button>

                    <button
                      onClick={() => handleShareEmail(link)}
                      className="share-button email-button"
                    >
                      <FaEnvelope className="button-icon" />
                      Email
                    </button>
                  </div>

                  {/* Participants Section */}
                  {training.participants.length > 0 ? (
                    <div className="participants-section">
                      <h4 className="participants-title">
                        <FaUsers className="participants-icon" />
                        Total Participants ({training.participants.length})
                      </h4>
                      
                      <div className="participants-summary">
                        <p>This training has {training.participants.length} registered participant{training.participants.length !== 1 ? 's' : ''}.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="no-participants">
                      <FaUsers className="no-participants-icon" />
                      <p>No participants registered yet. Share your link to get started!</p>
                    </div>
                  )}

                  {/* Your referrals */}
                  {myReferredCandidates.length > 0 && (
                    <div className="referrals-section">
                      <h4 className="referrals-title">
                        <FaUsers className="referrals-icon" />
                        Candidates You Referred ({myReferredCandidates.length})
                      </h4>
                      
                      <div className="referrals-list">
                        {myReferredCandidates.map((candidate, idx) => (
                          <div key={idx} className="candidate-card">
                            <div className="candidate-info">
                              <div className="candidate-name">
                                <FaUser className="candidate-icon" />
                                {candidate.name}
                              </div>
                              <div className="candidate-contact">
                                <span className="contact-item">
                                  <FaEmail className="contact-icon" />
                                  {candidate.email}
                                </span>
                                <span className="contact-item">
                                  <FaPhone className="contact-icon" />
                                  {candidate.phone}
                                </span>
                              </div>
                              <div className="candidate-meta">
                                <span>Aadhar: {candidate.aadhar}</span>
                                <span>Registered: {new Date(candidate.registeredAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-trainings">
            <div className="no-trainings-icon">
              <FaClipboardList />
            </div>
            <h3>No Active Trainings</h3>
            <p>No training programs are currently available or they may have expired.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="refresh-button"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
};




  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    /* Base Container */
    .training-container {
      font-family: 'Inter', sans-serif;
      padding: 16px;
      background: #f8fafc;
      min-height: 100vh;
      max-width: 100%;
      overflow-x: hidden;
    }

    /* Debug Info */
    .debug-info {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      font-size: 0.875rem;
    }

    .debug-info summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .debug-content {
      margin-top: 12px;
    }

    .debug-content p {
      margin: 4px 0;
    }

    .debug-data {
      margin-top: 12px;
    }

    .debug-data pre {
      background: white;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      max-height: 300px;
      font-size: 0.75rem;
      border: 1px solid #e5e7eb;
    }

    /* Loading Container */
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 70vh;
    }

    .loading-content {
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .loading-icon {
      font-size: 3rem;
      color: #6366f1;
      margin-bottom: 20px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-content h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .loading-content p {
      color: #64748b;
      margin: 0;
    }

    /* Error Container */
    .error-container {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      margin: 0 auto;
    }

    .error-icon {
      font-size: 4rem;
      color: #ef4444;
      margin-bottom: 20px;
    }

    .error-container h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 12px 0;
    }

    .error-container p {
      color: #64748b;
      margin-bottom: 24px;
    }

    .retry-button,
    .refresh-button {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .retry-button:hover,
    .refresh-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    /* Dashboard Header */
    .dashboard-header {
     background: #002B5C;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      // box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      background: #002B5C;
      flex-direction: column;
      gap: 16px;
    }

    .header-content {
      flex: 1;
    }
      .header-content h1 {
      color: #ffffffff;
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
     
      }

    .title-icon {
      font-size: 1.5rem;
      color: #f4f4f6ff;
    }

    .dashboard-subtitle {
      color: #ffffffff;
      font-size: 1rem;
      margin: 0;
    }

    .user-info {
      display: flex;
      justify-content: center;
    }

    .user-card {
      background: #F36F21;
      padding: 16px 20px;
      border-radius: 12px;
      color: white;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
    }

    .user-icon {
      font-size: 1.25rem;
    }

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .user-id {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    /* Trainings Container */
    .trainings-container {
      margin-bottom: 24px;
    }

    .trainings-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .training-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }

    .training-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .training-header {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
    }

    .training-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-item.expire-info {
      color: #f59e0b;
      font-weight: 500;
    }

    .info-icon {
      color: #6366f1;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .expire-info .info-icon {
      color: #f59e0b;
    }

    .info-text {
      color: #374151;
      font-weight: 500;
    }

    .training-link {
      margin-bottom: 16px;
    }

    .link-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .link-icon {
      color: #6366f1;
      font-size: 0.875rem;
    }

    .link-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }

    .link-text {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
      word-break: break-all;
      font-size: 0.875rem;
    }

    .link-text:hover {
      text-decoration: underline;
    }

    .share-buttons {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }

    .share-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
    }

    .copy-button {
      background: #6b7280;
      color: white;
    }

    .copy-button:hover {
      background: #4b5563;
      transform: translateY(-1px);
    }

    .copy-button.copied {
      background: #10b981;
      animation: pulse 0.5s ease;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .whatsapp-button {
      background: #25D366;
      color: white;
    }

    .whatsapp-button:hover {
      background: #1ea952;
      transform: translateY(-1px);
    }

    .email-button {
      background: #0078D4;
      color: white;
    }

    .email-button:hover {
      background: #106ebe;
      transform: translateY(-1px);
    }

    .button-icon {
      font-size: 0.875rem;
    }

    /* Participants Section */
    .participants-section,
    .no-participants {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .participants-title {
      font-size: 1rem;
      font-weight: 600;
      color: #0c4a6e;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .participants-icon {
      font-size: 1rem;
    }

    .participants-summary {
      color: #0c4a6e;
      font-size: 0.875rem;
    }

    .participants-summary p {
      margin: 0;
    }

    .no-participants {
      text-align: center;
      color: #64748b;
    }

    .no-participants-icon {
      font-size: 1.5rem;
      margin-bottom: 8px;
      opacity: 0.7;
    }

    .no-participants p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Referrals Section */
    .referrals-section {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 12px;
      padding: 16px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .referrals-title {
      font-size: 1rem;
      font-weight: 600;
      color: #0c4a6e;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .referrals-icon {
      font-size: 1rem;
    }

    .referrals-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .candidate-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      transition: all 0.2s ease;
    }

    .candidate-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .candidate-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .candidate-name {
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
    }

    .candidate-icon {
      color: #6366f1;
      font-size: 0.75rem;
    }

    .candidate-contact {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: #64748b;
    }

    .contact-icon {
      font-size: 0.75rem;
    }

    .candidate-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.75rem;
      color: #6b7280;
      font-style: italic;
    }

    /* Registration Form */
    .registration-container {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      max-width: 500px;
      margin: 0 auto;
    }

    .registration-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .header-icon {
      font-size: 2.5rem;
      color: #6366f1;
      margin-bottom: 12px;
    }

    .registration-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .registration-subtitle {
      color: #64748b;
      font-size: 0.875rem;
      margin: 0;
    }

    .registration-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
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
      font-size: 16px;
      font-family: inherit;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .submit-button {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      border: none;
      padding: 14px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
    }

    .submit-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    .submit-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .button-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Success Container */
    .success-container {
      background: white;
      border-radius: 16px;
      padding: 32px 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      max-width: 500px;
      margin: 0 auto;
      text-align: center;
      animation: slideIn 0.4s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px auto;
      color: white;
      font-size: 2rem;
      animation: bounce 0.6s ease;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }

    .success-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 24px 0;
    }

    .success-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
      text-align: left;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .detail-icon {
      color: #6366f1;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .detail-item div {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 500;
    }

    .detail-value {
      font-size: 0.875rem;
      color: #1e293b;
      font-weight: 600;
    }

    .success-message {
      color: #64748b;
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.5;
    }

    /* No Trainings */
    .no-trainings {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .no-trainings-icon {
      font-size: 4rem;
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .no-trainings h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .no-trainings p {
      color: #64748b;
      margin: 0 0 24px 0;
    }

    /* Tablet Styles (768px and up) */
    @media (min-width: 768px) {
      .training-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .dashboard-header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .user-info {
        justify-content: flex-end;
      }

      .trainings-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .share-buttons {
        grid-template-columns: repeat(3, 1fr);
      }

      .training-info {
        flex-direction: row;
        justify-content: space-between;
        flex-wrap: wrap;
      }

      .candidate-contact {
        flex-direction: row;
        gap: 16px;
      }

      .candidate-meta {
        flex-direction: row;
        gap: 12px;
      }

      .registration-container,
      .success-container {
        padding: 32px;
      }

      .success-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
    }

    /* Desktop Styles (1024px and up) */
    @media (min-width: 1024px) {
      .training-container {
        padding: 32px;
      }

      .trainings-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
      }

      .training-card {
        padding: 24px;
      }

      .training-info {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    /* Large Desktop (1200px and up) */
    @media (min-width: 1200px) {
      .trainings-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `;

  export default AgencyTraining;
