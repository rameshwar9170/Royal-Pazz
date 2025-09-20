// src/pages/TrainerParticipants.js
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, update, set } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import {
  FaUsers, FaCheck, FaTimes, FaEye, FaUserPlus,
  FaSearch, FaFilter, FaDownload, FaSpinner, FaPhone,
  FaEnvelope, FaExclamationTriangle, FaInfoCircle,
  FaIdCard, FaMapMarkerAlt, FaCalendarAlt, FaClock,
  FaMoneyBillWave, FaLink, FaImage
} from 'react-icons/fa';

const TrainerParticipants = () => {
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingParticipant, setProcessingParticipant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Generate a unique ID similar to Firebase
  const generateUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 28; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Create a secondary Firebase app instance for user creation
  const createSecondaryAuth = () => {
    try {
      const secondaryConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY || auth.app.options.apiKey,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || auth.app.options.authDomain,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || auth.app.options.projectId,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || auth.app.options.storageBucket,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || auth.app.options.messagingSenderId,
        appId: process.env.REACT_APP_FIREBASE_APP_ID || auth.app.options.appId,
        databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || auth.app.options.databaseURL
      };

      const secondaryApp = initializeApp(secondaryConfig, 'secondary');
      return getAuth(secondaryApp);
    } catch (error) {
      console.log('Secondary auth creation failed:', error.message);
      return null;
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not specified';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get training status based on your data
  const getTrainingStatusText = (training) => {
    if (training.status) {
      return training.status.charAt(0).toUpperCase() + training.status.slice(1);
    }
    if (!training.startDate) return 'Draft';
    const startDate = new Date(training.startDate);
    const endDate = training.endDate ? new Date(training.endDate) : null;
    const today = new Date();
    if (startDate > today) return 'Upcoming';
    if (endDate && endDate < today) return 'Completed';
    return 'Active';
  };

  const getTrainingStatusColor = (training) => {
    const status = training.status || 'draft';
    switch (status.toLowerCase()) {
      case 'completed': return '#6b7280';
      case 'active': return '#10b981';
      case 'upcoming': return '#f59e0b';
      default: return '#6366f1';
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        setError('Please log in to continue');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const db = getDatabase();
    const trainerId = currentUser.uid;
    const trainingsRef = ref(db, 'HTAMS/company/trainings');
    const unsubscribe = onValue(trainingsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const assignedTrainings = Object.entries(data)
            .filter(([, training]) => training.trainerId === trainerId)
            .map(([id, training]) => ({
              id,
              ...training,
              sortDate: training.updatedAt || training.startDate || Date.now()
            }))
            .sort((a, b) => {
              const timestampA = typeof a.sortDate === 'number' ? a.sortDate : new Date(a.sortDate).getTime();
              const timestampB = typeof b.sortDate === 'number' ? b.sortDate : new Date(b.sortDate).getTime();
              return timestampB - timestampA;
            });
          setTrainings(assignedTrainings);
          if (assignedTrainings.length > 0 && !selectedTraining) {
            setSelectedTraining(assignedTrainings[0].id);
          }
        }
        setError(null);
      } catch (err) {
        setError('Failed to load trainings');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setError('Failed to connect to database');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, selectedTraining]);

  useEffect(() => {
    if (!selectedTraining || !currentUser) return;
    const db = getDatabase();
    const participantsRef = ref(db, `HTAMS/company/trainings/${selectedTraining}/participants`);
    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const participantsList = Object.entries(data).map(([id, participant]) => ({
          id,
          ...participant
        }));
        setParticipants(participantsList);
      } else {
        setParticipants([]);
      }
    });
    return () => unsubscribe();
  }, [selectedTraining, currentUser]);

  const handleConfirmParticipant = async (participant) => {
    if (!currentUser || !currentUser.uid) {
      alert('❌ Authentication Error: Please log in again to continue.');
      return;
    }
    const currentUserUID = currentUser.uid;
    setProcessingParticipant(participant.id);
    try {
      const db = getDatabase();
      const phoneNumber = participant.mobile || participant.phone || '';
      if (!participant.email || !phoneNumber || !participant.name) {
        throw new Error('Missing required participant information (name, email, or phone)');
      }
      let mobilePassword = phoneNumber;
      if (mobilePassword.length < 6) {
        mobilePassword = mobilePassword + "123";
      }
      let newUserUID = null;
      let authUserCreated = false;
      try {
        const secondaryAuth = createSecondaryAuth();
        if (secondaryAuth) {
          const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            participant.email,
            mobilePassword
          );
          newUserUID = userCredential.user.uid;
          authUserCreated = true;
          await signOut(secondaryAuth);
        } else {
          throw new Error('Secondary auth not available');
        }
      } catch {
        newUserUID = generateUID();
        authUserCreated = false;
      }
      const userData = {
        MySales: "0",
        MyTeam: "",
        Role: "Agency",
        analytics: {
          totalCommissionsEarned: 0,
          totalCommissionsReceived: 0,
          totalOrders: 0,
          totalSales: 0
        },
        createdAt: new Date().toISOString(),
        currentLevel: "Agency",
        email: participant.email,
        firstTime: true,
        isActive: true,
        joinedViaTraining: selectedTraining,
        lastUpdated: Date.now(),
        mobile: phoneNumber,
        name: participant.name,
        phone: phoneNumber,
        referredBy: participant.referredBy || "",
        role: "agency",
        initialPassword: phoneNumber,
        passwordSetByMobile: true,
        needsPasswordReset: true,
        confirmedBy: currentUserUID,
        confirmedAt: new Date().toISOString(),
        authMethod: authUserCreated ? 'firebase_auth' : 'custom_uid',
        firebaseAuthUser: authUserCreated,
        address: participant.address || "",
        city: participant.city || "",
        state: participant.state || "",
        pin: participant.pin || "",
        aadhar: participant.aadhar || "",
        pan: participant.pan || "",
        trainingParticipantId: participant.id,
        trainingDetails: {
          trainingId: selectedTraining,
          joinedAt: participant.joinedAt || Date.now(),
          confirmedByTrainer: true,
          formMode: participant.formMode || "",
          aadhaarVerification: participant.aadhaar_verification || {},
          panPhotoUrl: participant.panPhotoUrl || "",
          passportPhotoUrl: participant.passportPhotoUrl || ""
        }
      };
      await set(ref(db, `HTAMS/users/${newUserUID}`), userData);
      await update(ref(db, `HTAMS/company/trainings/${selectedTraining}/participants/${participant.id}`), {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        confirmedBy: currentUserUID,
        userId: newUserUID,
        initialPassword: phoneNumber,
        userCreated: true,
        confirmedByTrainer: true,
        userSavedAt: `HTAMS/users/${newUserUID}`,
        authMethod: authUserCreated ? 'firebase_auth' : 'custom_uid',
        confirmationDetails: {
          trainerName: currentUser.displayName || currentUser.email || 'Trainer',
          confirmationTimestamp: Date.now(),
          userCreatedUnder: `HTAMS/users`,
          authenticationMethod: authUserCreated ? 'Firebase Auth (Secondary)' : 'Custom UID'
        }
      });

      // WhatsApp webhook logic
      const welcomeMsg = encodeURIComponent(
        `Welcome to ONDO Company!\nWe are pleased to welcome you as a valued member of our Sales Team.\n🆔 User ID: ${newUserUID}\n📅 Joining Date: 19/09/2025\n👤 Name: ${participant.name}\n📱 Mobile No: ${phoneNumber}\n✉ Email ID: ${participant.email}\n🌐 Company Portal: https://royal-pazz.vercel.app/login\n🔑 For your security, please log in and change your password after your first login.\nWishing you great success in your journey with us.\n— ONDO Management Team`
      );
      const whatsappUrl = `https://webhook.whatapi.in/webhook/68ccf7cfbde42bbd9077346e?number=${phoneNumber}&message=${welcomeMsg}`;
      fetch(whatsappUrl)
        .then(res => res.json())
        .then(result => {
          console.log("WhatsApp Message Sent:", result);
        })
        .catch(e => {
          console.error("Failed to send WhatsApp message:", e);
        });

      setShowConfirmModal(false);
      setSelectedParticipant(null);
      const authMethodText = authUserCreated ? 'Firebase Authentication (Secondary)' : 'Custom User ID';
      alert(`✅ Success! User Account Created\n\n👤 User Details:\n• Name: ${participant.name}\n• Email: ${participant.email}\n• Password: ${phoneNumber}\n• User ID: ${newUserUID}\n• Auth Method: ${authMethodText}\n• Saved at: HTAMS/users/${newUserUID}\n\n⚠️ User must change password on first login.`);
    } catch (error) {
      let errorMessage = 'Failed to create user account.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already registered in the system.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please ensure phone number has at least 6 digits.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setProcessingParticipant(null);
    }
  };

  const handleRejectParticipant = async (participant) => {
    if (!currentUser || !currentUser.uid) {
      alert('❌ Authentication Error: Please log in again to continue.');
      return;
    }

    const confirmReject = window.confirm(
      `Are you sure you want to reject ${participant.name}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmReject) return;

    setProcessingParticipant(participant.id);
    
    try {
      const db = getDatabase();
      await update(ref(db, `HTAMS/company/trainings/${selectedTraining}/participants/${participant.id}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: currentUser.uid,
        rejectionReason: 'Rejected by trainer'
      });
      
      alert(`❌ ${participant.name} has been rejected.`);
    } catch (error) {
      console.error('Error rejecting participant:', error);
      alert('Error rejecting participant: ' + error.message);
    } finally {
      setProcessingParticipant(null);
    }
  };

  const filteredParticipants = participants.filter(participant => {
    const phoneNumber = participant.mobile || participant.phone || '';
    const matchesSearch = participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         phoneNumber.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'rejected': return '#dc2626';
      case 'joined': return '#6366f1';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return <FaCheck />;
      case 'rejected': return <FaTimes />;
      case 'joined': return <FaEye />;
      case 'pending': return <FaInfoCircle />;
      default: return <FaEye />;
    }
  };

  const exportToCSV = () => {
    const csvContent = participants.map(p => {
      const phone = p.mobile || p.phone || 'N/A';
      return `"${p.name}","${p.email}","${phone}","${p.status || 'pending'}","${p.joinedAt ? formatTimestamp(p.joinedAt) : 'N/A'}","${p.confirmedAt ? new Date(p.confirmedAt).toLocaleDateString() : 'N/A'}","${p.userId || 'N/A'}","${p.authMethod || 'N/A'}"`;
    }).join('\n');
    const blob = new Blob([`Name,Email,Phone,Status,Joined Date,Confirmed Date,User ID,Auth Method\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${selectedTraining}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <div style={{ 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <FaSpinner style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Loading participants...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || (!currentUser && !loading)) {
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
          <FaExclamationTriangle style={{ fontSize: '2rem', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 1rem 0' }}>
            {error || 'Session Expired'}
          </h3>
          <p style={{ margin: '0 0 1rem 0' }}>
            {error || 'Your session has been affected. Please log in again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
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
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Find selected training details for display
  const selectedTrainingDetails = trainings.find(training => training.id === selectedTraining);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1a2332',
              margin: '0 0 0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaUsers style={{ color: '#3b82f6' }} />
              Training Participants
            </h1>
            <p style={{
              color: '#6b7280',
              margin: '0 0 0.25rem 0',
              fontSize: '0.95rem'
            }}>
              Confirmed users are saved under: <code style={{ background: '#e5e7eb', padding: '0.125rem 0.375rem', borderRadius: '4px', fontFamily: 'monospace' }}>HTAMS/users</code>
            </p>
            <p style={{
              color: '#059669',
              margin: '0',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              👤 Logged in as: {currentUser?.email || currentUser?.displayName || 'Trainer'}
            </p>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
            border: '2px solid #10b981',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#047857'
          }}>
            💾 Users saved at: <strong>HTAMS/users</strong>
            <br />
            <span style={{ fontSize: '0.75rem', opacity: '0.8' }}>
              🔐 Session Protected Creation
            </span>
          </div>
        </div>

        {/* Controls Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Select Training (Newest First):
            </label>
            <select
              value={selectedTraining}
              onChange={(e) => setSelectedTraining(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'white',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              <option value="">Select a training</option>
              {trainings.map((training) => (
                <option key={training.id} value={training.id}>
                  📍 {training.location || 'Location not set'} • 📅 {formatDate(training.startDate)} • 🏷️ {getTrainingStatusText(training)} • 👥 {training.participants ? Object.keys(training.participants).length : 0} participants • 💰 ₹{training.fees || 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Search Participants:
            </label>
            <div style={{ position: 'relative' }}>
              <FaSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280'
              }} />
              <input
                type="text"
                placeholder="Search by name, email, phone, or Aadhar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Filter by Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                background: 'white',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              <option value="all">All Status</option>
              <option value="joined">Joined</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Enhanced Selected Training Details */}
        {selectedTrainingDetails && (
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '2px solid #0ea5e9',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontWeight: '700',
              color: '#0369a1',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '1.1rem'
            }}>
              📋 Selected Training: {selectedTrainingDetails.trainerName || 'Training'} 
              <span style={{
                background: getTrainingStatusColor(selectedTrainingDetails) + '20',
                color: getTrainingStatusColor(selectedTrainingDetails),
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {getTrainingStatusText(selectedTrainingDetails)}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              color: '#047857',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaMapMarkerAlt style={{ color: '#f59e0b' }} />
                <strong>Location:</strong> {selectedTrainingDetails.location || 'Not specified'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaCalendarAlt style={{ color: '#3b82f6' }} />
                <strong>Start Date:</strong> {formatDate(selectedTrainingDetails.startDate)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaClock style={{ color: '#6366f1' }} />
                <strong>Time:</strong> {selectedTrainingDetails.time || 'Not set'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaMoneyBillWave style={{ color: '#10b981' }} />
                <strong>Fees:</strong> ₹{selectedTrainingDetails.fees || 0}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaUsers style={{ color: '#10b981' }} />
                <strong>Participants:</strong> {selectedTrainingDetails.participants ? Object.keys(selectedTrainingDetails.participants).length : 0} / {selectedTrainingDetails.candidates || 'Unlimited'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaLink style={{ color: '#8b5cf6' }} />
                <strong>Duration:</strong> {selectedTrainingDetails.duration || 0} day(s)
              </div>
            </div>
            
            {selectedTrainingDetails.joinLink && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '8px',
                fontSize: '0.8rem'
              }}>
                <strong>🔗 Join Link:</strong> 
                <a href={selectedTrainingDetails.joinLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0369a1', marginLeft: '0.5rem' }}>
                  {selectedTrainingDetails.joinLink}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {selectedTraining && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                {participants.length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Total Participants</div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                {participants.filter(p => p.status === 'joined').length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Joined</div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                {participants.filter(p => p.status === 'confirmed').length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Confirmed → Users</div>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                {participants.filter(p => !p.status || p.status === 'pending').length}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Pending</div>
            </div>
          </div>
        )}
      </div>

      {/* Participants Table */}
      {selectedTraining && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1a2332',
              margin: '0'
            }}>
              Participant Details
            </h2>
            
            <button
              onClick={exportToCSV}
              disabled={participants.length === 0}
              style={{
                background: participants.length === 0 ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: participants.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseOver={(e) => participants.length > 0 && (e.target.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <FaDownload />
              Export CSV
            </button>
          </div>

          {filteredParticipants.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <FaUsers style={{ fontSize: '3rem', marginBottom: '1rem', color: '#d1d5db' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>No Participants Found</h3>
              <p>
                {participants.length === 0 
                  ? 'No participants have joined this training yet.'
                  : 'No participants match your search criteria.'
                }
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.95rem'
              }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #e5e7eb', 
                      fontWeight: '600',
                      color: '#1a2332'
                    }}>
                      Participant Details
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #e5e7eb', 
                      fontWeight: '600',
                      color: '#1a2332'
                    }}>
                      Contact & Documents
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'center', 
                      borderBottom: '2px solid #e5e7eb', 
                      fontWeight: '600',
                      color: '#1a2332'
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #e5e7eb', 
                      fontWeight: '600',
                      color: '#1a2332'
                    }}>
                      Joined Date
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'center', 
                      borderBottom: '2px solid #e5e7eb', 
                      fontWeight: '600',
                      color: '#1a2332'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => {
                    const phoneNumber = participant.mobile || participant.phone || 'Not provided';
                    const canConfirm = participant.status === 'joined' && !participant.confirmedByTrainer;
                    
                    return (
                      <tr 
                        key={participant.id} 
                        style={{ 
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#1a2332',
                              marginBottom: '0.25rem'
                            }}>
                              {participant.name}
                            </div>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#6b7280',
                              fontFamily: 'monospace'
                            }}>
                              ID: {participant.id}
                            </div>
                            
                            {/* User ID if confirmed */}
                            {participant.userId && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#10b981',
                                background: '#dcfce7',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '4px',
                                marginTop: '0.25rem',
                                display: 'inline-block',
                                fontFamily: 'monospace'
                              }}>
                                User: {participant.userId}
                              </div>
                            )}

                            {/* Aadhar with verification status */}
                            {participant.aadhar && (
                              <div style={{ 
                                fontSize: '0.8rem', 
                                color: participant.aadhaar_verification?.status === 'verified' ? '#10b981' : '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                marginTop: '0.25rem'
                              }}>
                                <FaIdCard style={{ fontSize: '0.7rem' }} />
                                Aadhar: {participant.aadhar}
                                {participant.aadhaar_verification?.status === 'verified' && (
                                  <span style={{ color: '#10b981', fontSize: '0.7rem' }}>✅</span>
                                )}
                              </div>
                            )}

                            {/* PAN Card */}
                            {participant.pan && (
                              <div style={{ 
                                fontSize: '0.8rem', 
                                color: '#8b5cf6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                marginTop: '0.25rem'
                              }}>
                                <FaIdCard style={{ fontSize: '0.7rem' }} />
                                PAN: {participant.pan}
                              </div>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.9rem' }}>
                            {/* Email */}
                            <div style={{ 
                              marginBottom: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <FaEnvelope style={{ color: '#3b82f6', fontSize: '0.8rem' }} />
                              <span style={{ wordBreak: 'break-all' }}>{participant.email}</span>
                            </div>
                            
                            {/* Phone */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginBottom: '0.25rem'
                            }}>
                              <FaPhone style={{ color: '#10b981', fontSize: '0.8rem' }} />
                              {phoneNumber}
                            </div>
                            
                            {/* Address */}
                            {participant.address && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                                fontSize: '0.8rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem'
                              }}>
                                <FaMapMarkerAlt style={{ color: '#f59e0b', fontSize: '0.7rem', marginTop: '0.1rem' }} />
                                <span>{participant.address}, {participant.city}, {participant.state} - {participant.pin}</span>
                              </div>
                            )}

                            {/* Document Photos */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              {participant.panPhotoUrl && (
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#8b5cf6',
                                  background: '#f3e8ff',
                                  padding: '0.125rem 0.25rem',
                                  borderRadius: '3px'
                                }}>
                                  📄 PAN
                                </span>
                              )}
                              {participant.passportPhotoUrl && (
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#0ea5e9',
                                  background: '#e0f2fe',
                                  padding: '0.125rem 0.25rem',
                                  borderRadius: '3px'
                                }}>
                                  📷 Photo
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            background: `${getStatusColor(participant.status || 'pending')}15`,
                            color: getStatusColor(participant.status || 'pending'),
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {getStatusIcon(participant.status || 'pending')}
                            {(participant.status || 'pending').toUpperCase()}
                          </span>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            {participant.joinedAt ? 
                              formatTimestamp(participant.joinedAt) : 
                              'Not specified'
                            }
                          </div>
                        </td>

                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {participant.status === 'confirmed' || participant.confirmedByTrainer ? (
                            // Confirmed User Display
                            <div style={{
                              color: '#10b981',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              <div style={{ marginBottom: '0.25rem' }}>✅ User Created</div>
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#fff',
                                background: '#3b82f6',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                marginTop: '0.25rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <FaPhone style={{ fontSize: '0.7rem' }} />
                                Password: {phoneNumber}
                              </div>
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: '#059669',
                                marginTop: '0.25rem',
                                background: '#dcfce7',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '4px'
                              }}>
                                💾 Saved: HTAMS/users
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.25rem' }}>
                                ⚠️ Must change on first login
                              </div>
                            </div>
                          ) : participant.status === 'rejected' ? (
                            // Rejected Display
                            <div style={{
                              color: '#dc2626',
                              fontSize: '0.85rem',
                              fontWeight: '600'
                            }}>
                              ❌ Rejected
                            </div>
                          ) : canConfirm ? (
                            // Action Buttons for Joined participants
                            <div>
                              <button
                                onClick={() => {
                                  setSelectedParticipant(participant);
                                  setShowConfirmModal(true);
                                }}
                                disabled={processingParticipant === participant.id || !currentUser}
                                style={{
                                  background: (!currentUser) ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.75rem 1.5rem',
                                  borderRadius: '8px',
                                  cursor: (processingParticipant === participant.id || !currentUser) ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.875rem',
                                  fontWeight: '600',
                                  opacity: (processingParticipant === participant.id || !currentUser) ? 0.6 : 1,
                                  transition: 'all 0.3s ease',
                                  margin: '0 auto 0.5rem',
                                  boxShadow: (!currentUser) ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                                onMouseOver={(e) => (processingParticipant || !currentUser) ? null : (
                                  e.target.style.transform = 'translateY(-2px)',
                                  e.target.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'
                                )}
                                onMouseOut={(e) => (
                                  e.target.style.transform = 'translateY(0)',
                                  e.target.style.boxShadow = (!currentUser) ? 'none' : '0 4px 12px rgba(16,185,129,0.3)'
                                )}
                              >
                                {processingParticipant === participant.id ? (
                                  <>
                                    <FaSpinner className="spinning" />
                                    Creating...
                                  </>
                                ) : !currentUser ? (
                                  <>
                                    <FaExclamationTriangle />
                                    Login Required
                                  </>
                                ) : (
                                  <>
                                    <FaUserPlus />
                                    Confirm & Create User
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleRejectParticipant(participant)}
                                disabled={processingParticipant === participant.id || !currentUser}
                                style={{
                                  background: (!currentUser) ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '6px',
                                  cursor: (processingParticipant === participant.id || !currentUser) ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.8rem',
                                  fontWeight: '500',
                                  opacity: (processingParticipant === participant.id || !currentUser) ? 0.6 : 1,
                                  transition: 'transform 0.2s ease',
                                  margin: '0 auto'
                                }}
                                onMouseOver={(e) => (processingParticipant || !currentUser) ? null : (e.target.style.transform = 'translateY(-1px)')}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                              >
                                <FaTimes />
                                Reject
                              </button>
                            </div>
                          ) : (
                            // Other statuses
                            <div style={{
                              color: '#6b7280',
                              fontSize: '0.85rem',
                              fontWeight: '500'
                            }}>
                              {participant.status === 'joined' ? 'Already Processed' : 'No Action Required'}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Confirmation Modal */}
      {showConfirmModal && selectedParticipant && currentUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#1a2332',
              margin: '0 0 1rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <FaUserPlus style={{ fontSize: '1.25rem' }} />
              </div>
              Create User Account
            </h3>
            
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '1.5rem', 
              lineHeight: '1.6',
              fontSize: '1.05rem'
            }}>
              You are about to create a new user account for <strong style={{ color: '#1a2332' }}>{selectedParticipant.name}</strong>. 
              The system will use protected authentication and save the data under <code style={{ background: '#e5e7eb', padding: '0.125rem 0.375rem', borderRadius: '4px', fontFamily: 'monospace' }}>HTAMS/users</code>.
            </p>
            
            {/* Session Protection Notice */}
            <div style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              border: '2px solid #10b981',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                fontWeight: '600',
                color: '#047857',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔐 Session Protection Active
              </div>
              <div style={{ color: '#047857', fontSize: '0.95rem' }}>
                • Your trainer session will remain logged in <br/>
                • Using secondary authentication for user creation <br/>
                • All participant data will be preserved in user profile
              </div>
            </div>
            
            {/* Login Credentials Box */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              border: '2px solid #0ea5e9'
            }}>
              <div style={{ 
                fontWeight: '700', 
                color: '#0369a1', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1.1rem'
              }}>
                <FaPhone />
                Login Credentials
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Email:</strong> 
                  <span style={{ color: '#0369a1' }}>{selectedParticipant.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Password:</strong> 
                  <span style={{ color: '#0369a1', fontFamily: 'monospace', background: '#bfdbfe', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                    {selectedParticipant.mobile || selectedParticipant.phone}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Role:</strong> 
                  <span style={{ color: '#059669' }}>Agency</span>
                </div>
              </div>
              
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#dc2626', 
                background: '#fee2e2',
                padding: '0.75rem',
                borderRadius: '6px',
                marginTop: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '500'
              }}>
                <FaExclamationTriangle />
                User must change password on first login for security
              </div>
            </div>
            
            {/* Enhanced Participant Details */}
            <div style={{
              background: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              border: '1px solid #e5e7eb'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#374151', fontWeight: '600' }}>Complete Participant Information:</h4>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.95rem' }}>
                <div><strong>Name:</strong> {selectedParticipant.name}</div>
                <div><strong>Email:</strong> {selectedParticipant.email}</div>
                <div><strong>Mobile:</strong> {selectedParticipant.mobile || selectedParticipant.phone}</div>
                {selectedParticipant.aadhar && (
                  <div>
                    <strong>Aadhar:</strong> {selectedParticipant.aadhar} 
                    {selectedParticipant.aadhaar_verification?.status === 'verified' && <span style={{ color: '#10b981' }}> ✅ Verified</span>}
                  </div>
                )}
                {selectedParticipant.pan && <div><strong>PAN:</strong> {selectedParticipant.pan}</div>}
                {selectedParticipant.address && (
                  <div><strong>Address:</strong> {selectedParticipant.address}, {selectedParticipant.city}, {selectedParticipant.state} - {selectedParticipant.pin}</div>
                )}
                <div><strong>Training ID:</strong> {selectedTraining}</div>
                <div><strong>Joined At:</strong> {formatTimestamp(selectedParticipant.joinedAt)}</div>
                <div><strong>Form Mode:</strong> {selectedParticipant.formMode || 'Standard'}</div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedParticipant(null);
                }}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '0.875rem 1.75rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleConfirmParticipant(selectedParticipant)}
                disabled={processingParticipant === selectedParticipant.id || !currentUser}
                style={{
                  background: (!currentUser) ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.875rem 1.75rem',
                  borderRadius: '10px',
                  cursor: (processingParticipant === selectedParticipant.id || !currentUser) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  opacity: (processingParticipant === selectedParticipant.id || !currentUser) ? 0.6 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: (!currentUser) ? 'none' : '0 4px 15px rgba(16,185,129,0.3)'
                }}
                onMouseOver={(e) => (processingParticipant || !currentUser) ? null : (
                  e.target.style.transform = 'translateY(-2px)',
                  e.target.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'
                )}
                onMouseOut={(e) => (
                  e.target.style.transform = 'translateY(0)',
                  e.target.style.boxShadow = (!currentUser) ? 'none' : '0 4px 15px rgba(16,185,129,0.3)'
                )}
              >
                {processingParticipant === selectedParticipant.id ? (
                  <>
                    <FaSpinner className="spinning" />
                    Creating User...
                  </>
                ) : !currentUser ? (
                  <>
                    <FaExclamationTriangle />
                    Authentication Required
                  </>
                ) : (
                  <>
                    <FaCheck />
                    Create Protected User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TrainerParticipants;
