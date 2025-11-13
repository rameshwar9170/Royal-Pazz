// TrainerParticipants.js - COMPLETE WITH FIXED WHATSAPP INTEGRATION
import React, { useState, useEffect, useMemo } from 'react';
import { getDatabase, ref, onValue, update, set, get } from 'firebase/database';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  FaUsers, FaCheck, FaTimes, FaSearch, FaFilter, FaDownload,
  FaSpinner, FaPhone, FaEnvelope, FaExclamationTriangle,
  FaWhatsapp, FaUserCheck, FaClock, FaMapMarkerAlt,
  FaEye, FaTachometerAlt, FaGraduationCap, FaBell
} from 'react-icons/fa';

/**
 * Formats date to readable string
 * @param {string} dateString - Date string
 * @returns {string} - Formatted date
 */
const formatDate = (dateString) => {
  if (!dateString) return 'Date not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Sends WhatsApp confirmation message to participant after trainer confirms
 * @param {Object} participantData - Participant information
 * @returns {Promise<boolean>} - Success status
 */
const sendTrainingConfirmationMessage = async (participantData) => {
  try {
    console.log('=== SENDING WHATSAPP CONFIRMATION ===');
    console.log('Participant Data:', participantData);
    
    const webhookUrl = 'https://webhook.whatapi.in/webhook/6b9845c02d3c27c2';
    
    // Format mobile number - ensure it has country code
    let formattedMobile = participantData.mobile.toString().replace(/\D/g, '');
    
    // Always use participant's mobile number for sending
    if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
      formattedMobile = '91' + formattedMobile;
    }
    
    console.log('Formatted Mobile (Recipient):', formattedMobile);
    
    // Clean the data to avoid encoding issues
    const cleanName = participantData.name.trim();
    const cleanEmail = participantData.email.trim();
    const cleanUserId = participantData.userId.trim();
    const cleanJoiningDate = participantData.joiningDate.trim();
    const cleanMobile = participantData.mobile.toString().replace(/\D/g, '');
    
    // Construct message as per your API format
    // Format: ramsir,userId,joiningDate,name,mobile,email
    const messageParts = [
      'ramsir',
      cleanUserId,
      cleanJoiningDate,
      cleanName,
      cleanMobile,
      cleanEmail
    ];
    
    const message = messageParts.join(',');
    
    console.log('Message (before encoding):', message);
    
    // Properly encode the message
    const encodedMessage = encodeURIComponent(message);
    
    console.log('Message (after encoding):', encodedMessage);
    
    // Build full URL with query parameters - SEND TO PARTICIPANT'S NUMBER
    const fullUrl = `${webhookUrl}?number=${formattedMobile}&message=${encodedMessage}`;
    
    console.log('Full WhatsApp API URL:', fullUrl);
    
    // Send GET request to WhatsApp API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ WhatsApp confirmation sent successfully to:', formattedMobile);
      console.log('API Response:', data);
      return true;
    } else {
      console.error('❌ WhatsApp API failed. Status:', response.status);
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ WhatsApp API Error:', error);
    console.error('Error details:', error.message);
    return false;
  }
};

const TrainerParticipants = () => {
  // **State Management**
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingParticipant, setProcessingParticipant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);
  const [currentTrainer, setCurrentTrainer] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [confirmingParticipantId, setConfirmingParticipantId] = useState(null);
  const [showDetails, setShowDetails] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // **Authentication Check**
  useEffect(() => {
    console.log('🔐 Checking trainer authentication...');
    const trainerData = localStorage.getItem('htamsTrainer');

    if (!trainerData) {
      console.error('❌ No trainer data found in localStorage');
      setError('Trainer not authenticated. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const trainer = JSON.parse(trainerData);
      console.log('👤 Trainer data loaded:', trainer);

      if (!trainer.trainerId) {
        console.error('❌ Invalid trainer data - missing trainerId');
        setError('Invalid trainer data. Please log in again.');
        setLoading(false);
        return;
      }

      setCurrentTrainer(trainer);
      setError(null);
      console.log('✅ Trainer authentication successful');

      // Test Firebase connection
      try {
        const db = getDatabase();
        console.log('🔥 Firebase database instance:', db ? 'Connected' : 'Not connected');
      } catch (dbError) {
        console.error('❌ Firebase connection error:', dbError);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Error parsing trainer data:', err);
      setError('Invalid trainer session. Please log in again.');
      setLoading(false);
    }
  }, []);

  // **Fetch Trainings**
  useEffect(() => {
    if (!currentTrainer?.trainerId) {
      console.log('⏳ Waiting for trainer authentication...');
      return;
    }

    console.log('📊 Setting up trainings listener for trainer:', currentTrainer.trainerId);
    const db = getDatabase();
    const trainingsRef = ref(db, 'HTAMS/company/trainings');

    const unsubscribe = onValue(trainingsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        console.log('📊 Trainings data received:', data ? Object.keys(data).length : 0, 'trainings');

        if (data) {
          const assignedTrainings = Object.entries(data)
            .filter(([, training]) => {
              const isAssigned = training.trainerId === currentTrainer.trainerId ||
                training.coTrainerId === currentTrainer.trainerId ||
                (training.coTrainers && training.coTrainers.includes(currentTrainer.trainerId));

              if (isAssigned) {
                console.log('✅ Training assigned:', training.location, training.id);
              }
              return isAssigned;
            })
            .map(([id, training]) => ({ id, ...training }))
            .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));

          console.log('📊 Assigned trainings:', assignedTrainings.length);
          setTrainings(assignedTrainings);

          // Auto-select first training if none selected (only on first load)
          if (assignedTrainings.length > 0) {
            setSelectedTraining(prev => {
              if (!prev) {
                const firstTrainingId = assignedTrainings[0].id;
                console.log('🎯 Auto-selecting training:', firstTrainingId);
                return firstTrainingId;
              }
              return prev;
            });
          }
        } else {
          console.log('📊 No trainings data found');
          setTrainings([]);
        }
      } catch (err) {
        console.error('❌ Error processing trainings:', err);
        setError('Failed to load trainings');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Firebase trainings listener error:', error);
      setError('Failed to connect to database');
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up trainings listener');
      unsubscribe();
    };
  }, [currentTrainer]);

  // **Fetch Participants**
  useEffect(() => {
    if (!selectedTraining) {
      console.log('⏳ No training selected, skipping participants fetch');
      setParticipants([]);
      return;
    }

    console.log('👥 Setting up participants listener for training:', selectedTraining);
    const db = getDatabase();
    const participantsRef = ref(db, `HTAMS/company/trainings/${selectedTraining}/participants`);

    const unsubscribe = onValue(participantsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        console.log('👥 Participants data received:', data ? Object.keys(data).length : 0, 'participants');

        if (data && typeof data === 'object') {
          const participantsList = Object.entries(data).map(([id, participant]) => ({
            id,
            ...participant
          }));

          setParticipants(participantsList);
        } else {
          setParticipants([]);
        }
      } catch (err) {
        console.error('❌ Error processing participants data:', err);
        setParticipants([]);
      }
    }, (error) => {
      console.error('❌ Firebase participants listener error:', error);
      setParticipants([]);
    });

    return () => {
      console.log('🧹 Cleaning up participants listener');
      unsubscribe();
    };
  }, [selectedTraining]);

  // **Clear Success Message**
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // **Confirm Participant with WhatsApp and Firebase Auth Registration**
  const handleConfirmParticipant = async (participant) => {
    console.log('🎯 Starting participant confirmation process for:', participant.name);
    console.log('🎯 Participant mobile:', participant.mobile || participant.phone);

    if (!currentTrainer?.trainerId) {
      alert('Authentication Error: Please log in again.');
      return;
    }

    // Prevent double-clicking
    if (processingParticipant === participant.id || whatsappLoading) {
      console.log('⏳ Already processing, ignoring duplicate request');
      return;
    }

    setProcessingParticipant(participant.id);
    setConfirmingParticipantId(participant.id);
    setWhatsappLoading(true);

    let secondaryApp = null;
    let secondaryAuth = null;

    try {
      const db = getDatabase();

      // **Fetch level discount from HTAMS/Levels to get the LOWEST discount level**
      console.log('📊 Fetching level discount data...');
      const levelsRef = ref(db, 'HTAMS/Levels');
      const levelsSnapshot = await get(levelsRef);
      
      let userLevel = 'AGENCY 15%'; // Fallback default level
      let userDiscount = 15; // Fallback default discount
      
      if (levelsSnapshot.exists()) {
        const levelsData = levelsSnapshot.val();
        console.log('📊 Levels data:', levelsData);
        
        // Find the level with the LOWEST discount
        const levelEntries = Object.entries(levelsData);
        const sortedLevels = levelEntries.sort((a, b) => {
          const discountA = parseInt(a[1].discount) || 0;
          const discountB = parseInt(b[1].discount) || 0;
          return discountA - discountB; // Ascending order: lowest discount first
        });
        
        if (sortedLevels.length > 0) {
          const [lowestLevelName, lowestLevelData] = sortedLevels[0];
          userLevel = lowestLevelName;
          userDiscount = parseInt(lowestLevelData.discount) || 0;
          console.log(`✅ Assigned lowest discount level: ${userLevel} with ${userDiscount}% discount`);
        } else {
          console.log(`⚠️ No levels found in database, using fallback: ${userLevel}`);
        }
      } else {
        console.log(`⚠️ No levels data found in database, using fallback: ${userLevel}`);
      }

      // **IMPORTANT: Create a secondary Firebase app instance to prevent logging out the trainer**
      secondaryApp = initializeApp({
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID,
      }, `secondary-${Date.now()}`);

      secondaryAuth = getAuth(secondaryApp);

      // Get training details for WhatsApp message
      const selectedTrainingDetails = trainings.find(t => t.id === selectedTraining);

      if (!selectedTrainingDetails) {
        throw new Error('Training details not found');
      }

      // **Step 1: Check if user already exists**
      console.log('🔍 Checking for existing user...');
      const existingUserQuery = ref(db, 'HTAMS/users');
      const existingSnapshot = await get(existingUserQuery);

      if (existingSnapshot.exists()) {
        const users = existingSnapshot.val();
        const existingUser = Object.values(users).find(user =>
          user.email === participant.email
        );

        if (existingUser) {
          alert('❌ This email is already registered in the system.');
          if (secondaryAuth) await secondaryAuth.signOut();
          if (secondaryApp) await deleteApp(secondaryApp);
          setProcessingParticipant(null);
          setConfirmingParticipantId(null);
          setWhatsappLoading(false);
          return;
        }
      }

      // **Step 2: Get participant mobile number**
      const phoneNumber = (participant.mobile || participant.phone || '').toString();
      
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('Invalid mobile number');
      }

      console.log('📱 Participant mobile number:', phoneNumber);

      // **Step 3: Create Firebase Auth account**
      console.log('🔐 Creating Firebase Auth account...');

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        participant.email,
        phoneNumber
      );

      const userId = userCredential.user.uid;
      console.log('✅ Firebase Auth account created with UID:', userId);

      // **CRITICAL: Sign out and delete secondary app**
      await secondaryAuth.signOut();
      await deleteApp(secondaryApp);
      console.log('✅ Secondary auth instance cleaned up');

      // **Step 4: Create user data in HTAMS/users**
      console.log('💾 Creating user data in users node...');
      const userData = {
        name: participant.name || '',
        phone: phoneNumber,
        mobile: phoneNumber,
        email: participant.email || '',
        aadhar: participant.aadhar || '',
        address: participant.address || '',
        city: participant.city || '',
        state: participant.state || '',
        pin: participant.pin || '',
        pan: participant.pan || '',
        role: 'agency',
        Role: 'Agency',
        currentLevel: userLevel,
        createdAt: new Date().toISOString(),
        lastUpdated: Date.now(),
        isActive: true,
        firstTime: true,
        referredBy: participant.referredBy || '',
        joinedViaTraining: selectedTraining,
        confirmedByTrainer: currentTrainer.name,
        MySales: "0",
        MyTeam: "",
        analytics: {
          totalCommissionsEarned: 0,
          totalCommissionsReceived: 0,
          totalOrders: 0,
          totalSales: 0
        },
        commissionHistory: {},
        salesHistory: {}
      };

      await set(ref(db, `HTAMS/users/${userId}`), userData);
      console.log('✅ User data saved to HTAMS/users node');

      // **Step 5: Update participant status in training**
      const joiningDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      await update(ref(db, `HTAMS/company/trainings/${selectedTraining}/participants/${participant.id}`), {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        confirmedBy: currentTrainer.trainerId,
        confirmedByTrainer: true,
        userAccountCreated: true,
        createdUserId: userId,
        joiningDate: joiningDate,
        trainerName: currentTrainer.name
      });
      console.log('✅ Participant status updated in training');

      // **Step 6: Generate User ID**
      const generateUserId = (name, mobile) => {
        const cleanMobile = mobile.toString().replace(/\D/g, '');
        const namePrefix = name.substring(0, 3).toLowerCase().replace(/[^a-z]/g, '');
        const mobileLastFour = cleanMobile.slice(-4);
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${namePrefix}${mobileLastFour}${randomNum}`;
      };

      const generatedUserId = generateUserId(participant.name, phoneNumber);
      console.log('🆔 Generated User ID:', generatedUserId);

      // **Step 7: Send WhatsApp confirmation message**
      console.log('📱 Preparing WhatsApp message...');
      console.log('📱 Sending to mobile:', phoneNumber);

      const whatsappSuccess = await sendTrainingConfirmationMessage({
        name: participant.name,
        mobile: phoneNumber, // This is the recipient's mobile
        email: participant.email,
        userId: generatedUserId,
        joiningDate: joiningDate
      });

      if (whatsappSuccess) {
        setSuccessMessage(`✅ ${participant.name} confirmed successfully! User account created and WhatsApp message sent to ${phoneNumber}.`);
        console.log('🎉 Complete success - Auth created, user registered, and WhatsApp sent');
      } else {
        setSuccessMessage(`⚠️ ${participant.name} confirmed and registered, but WhatsApp message failed. Please contact them manually at ${phoneNumber}.`);
        console.log('⚠️ Partial success - Auth and user created but WhatsApp failed');
      }

    } catch (error) {
      console.error('❌ Error in confirmation process:', error);

      if (error.code === 'auth/email-already-in-use') {
        alert('❌ This email is already registered with Firebase Auth.');
      } else if (error.code === 'auth/weak-password') {
        alert('❌ Password is too weak. Phone number must be at least 6 digits.');
      } else if (error.code === 'auth/invalid-email') {
        alert('❌ Invalid email format.');
      } else {
        alert(`❌ Error: Failed to confirm participant. ${error.message}`);
      }
    } finally {
      // **CRITICAL: Always cleanup secondary app instance**
      try {
        if (secondaryAuth) {
          await secondaryAuth.signOut();
        }
        if (secondaryApp) {
          await deleteApp(secondaryApp);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Error during secondary app cleanup:', cleanupError);
      }

      setProcessingParticipant(null);
      setConfirmingParticipantId(null);
      setWhatsappLoading(false);
    }
  };

  // **Reject Participant**
  const handleRejectParticipant = async (participant) => {
    const confirmReject = window.confirm(`Are you sure you want to reject ${participant.name}?`);
    if (!confirmReject) return;

    console.log('❌ Rejecting participant:', participant.name);
    setProcessingParticipant(participant.id);

    try {
      const db = getDatabase();
      await update(ref(db, `HTAMS/company/trainings/${selectedTraining}/participants/${participant.id}`), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: currentTrainer.trainerId,
        trainerName: currentTrainer.name
      });

      setSuccessMessage(`${participant.name} has been rejected successfully.`);
      console.log('✅ Participant rejected successfully');
    } catch (error) {
      console.error('❌ Error rejecting participant:', error);
      alert(`Error rejecting participant: ${error.message}`);
    } finally {
      setProcessingParticipant(null);
    }
  };

  // **Toggle Participant Details**
  const toggleDetails = (participantId) => {
    setShowDetails(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }));
  };

  // **Helper Functions**
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
      case 'joined': return <FaUserCheck />;
      default: return <FaClock />;
    }
  };

  const getStatusBadge = (status) => {
    const color = getStatusColor(status || 'pending');
    const icon = getStatusIcon(status || 'pending');
    const text = (status || 'pending').toUpperCase();

    return (
      <span style={{
        padding: '0.375rem 0.75rem',
        borderRadius: '16px',
        fontSize: '0.7rem',
        fontWeight: '700',
        background: `${color}15`,
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap'
      }}>
        {icon}
        {text}
      </span>
    );
  };

  // **Filter Participants** (Memoized to prevent unnecessary recalculations)
  const filteredParticipants = useMemo(() => {
    return participants.filter(participant => {
      const phoneNumber = participant.mobile || participant.phone || '';
      const matchesSearch = participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phoneNumber.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [participants, searchTerm, statusFilter]);

  // **Export to CSV**
  const exportToCSV = () => {
    console.log('📄 Exporting participants to CSV...');
    const csvContent = [
      'Name,Email,Phone,Status,User ID,Joined Date,Confirmed Date,Confirmed By',
      ...participants.map(p => {
        const phone = p.mobile || p.phone || 'N/A';
        const joinedDate = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString('en-IN') : 'N/A';
        const confirmedDate = p.confirmedAt ? new Date(p.confirmedAt).toLocaleDateString('en-IN') : 'N/A';
        const confirmedBy = p.trainerName || 'N/A';
        return `"${p.name}","${p.email}","${phone}","${p.status || 'pending'}","${p.userId || 'N/A'}","${joinedDate}","${confirmedDate}","${confirmedBy}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const selectedTrainingDetails = trainings.find(t => t.id === selectedTraining);
    const filename = `participants-${selectedTrainingDetails?.location || 'training'}-${new Date().toISOString().split('T')[0]}.csv`;

    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ CSV export completed:', filename);
  };

  // **Statistics** (Memoized to prevent unnecessary recalculations)
  const stats = useMemo(() => {
    const total = participants.length;
    const confirmed = participants.filter(p => p.status === 'confirmed').length;
    const pending = participants.filter(p => !p.status || p.status === 'pending').length;
    const joined = participants.filter(p => p.status === 'joined').length;
    const rejected = participants.filter(p => p.status === 'rejected').length;

    return { total, confirmed, pending, joined, rejected };
  }, [participants]);

  // **Render Loading State**
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        background: 'linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <FaSpinner style={{
          fontSize: '3rem',
          animation: 'spin 1s linear infinite',
          color: '#4f46e5'
        }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#1f2937', fontSize: '1.125rem', margin: '0 0 0.5rem 0', fontWeight: '600' }}>
            Loading Participants
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0' }}>
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  // **Render Error State**
  if (error || !currentTrainer) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: 'linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        <div style={{
          background: 'white',
          border: '2px solid #fecaca',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)'
        }}>
          <FaExclamationTriangle style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            color: '#dc2626'
          }} />
          <h2 style={{
            margin: '0 0 0.75rem 0',
            color: '#991b1b',
            fontSize: '1.25rem',
            fontWeight: '700'
          }}>
            Authentication Required
          </h2>
          <p style={{
            margin: '0 0 1.5rem 0',
            color: '#7f1d1d',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            Your session has expired. Please log in again.
          </p>
          <button
            onClick={() => window.location.href = '/trainer-login'}
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // const selectedTrainingDetails = trainings.find(training => training.id === selectedTraining);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)',
      padding: '0.75rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Compact Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.25)',
          marginBottom: '1rem',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: '0 0 0.25rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FaGraduationCap style={{ fontSize: '1.75rem' }} />
                Participants
              </h1>
              <p style={{
                margin: '0',
                fontSize: '0.85rem',
                opacity: '0.95',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <FaUserCheck style={{ fontSize: '0.875rem' }} />
                {currentTrainer?.name}
              </p>
            </div>
            <button
              onClick={exportToCSV}
              disabled={participants.length === 0}
              style={{
                background: participants.length === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.25)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.625rem 1rem',
                borderRadius: '8px',
                cursor: participants.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              <FaDownload />
              Export
            </button>
          </div>

          {/* Success/WhatsApp Messages */}
          {successMessage && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaBell />
              {successMessage}
            </div>
          )}

          {whatsappLoading && (
            <div style={{
              background: 'rgba(37, 211, 102, 0.2)',
              border: '1px solid rgba(37, 211, 102, 0.4)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaWhatsapp className="spinning" />
              Sending WhatsApp...
            </div>
          )}
        </div>

        {/* Compact Controls */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '0.75rem'
          }}>
            {/* Training Selection */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1f2937',
                fontSize: '0.875rem'
              }}>
                <FaTachometerAlt style={{ color: '#4f46e5', fontSize: '0.875rem' }} />
                Training
              </label>
              <select
                value={selectedTraining}
                onChange={(e) => {
                  setSelectedTraining(e.target.value);
                  setParticipants([]);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: 'white',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select training...</option>
                {trainings.map(training => (
                  <option key={training.id} value={training.id}>
                    {training.location || 'Location not set'} - {formatDate(training.startDate)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1f2937',
                fontSize: '0.875rem'
              }}>
                <FaSearch style={{ color: '#10b981', fontSize: '0.875rem' }} />
                Search
              </label>
              <div style={{ position: 'relative' }}>
                <FaSearch style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '0.875rem'
                }} />
                <input
                  type="text"
                  placeholder="Name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#1f2937',
                fontSize: '0.875rem'
              }}>
                <FaFilter style={{ color: '#8b5cf6', fontSize: '0.875rem' }} />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  background: 'white',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Status</option>
                <option value="joined">Joined</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Participants Cards */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #f1f5f9'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaUsers style={{ color: '#4f46e5', fontSize: '1.125rem' }} />
              Participants
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: '500',
                background: '#f3f4f6',
                padding: '0.25rem 0.625rem',
                borderRadius: '12px'
              }}>
                {filteredParticipants.length}/{participants.length}
              </span>
            </h2>
          </div>

          {filteredParticipants.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              color: '#6b7280',
              background: '#f9fafb',
              borderRadius: '8px',
              border: '2px dashed #e5e7eb'
            }}>
              <FaUsers style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                color: '#d1d5db'
              }} />
              <h3 style={{
                marginBottom: '0.5rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                No Participants
              </h3>
              <p style={{ fontSize: '0.875rem', margin: '0' }}>
                {participants.length === 0
                  ? 'No participants have joined yet.'
                  : 'No matches found.'
                }
              </p>
            </div>
          ) : (
            <div>
              {filteredParticipants.map((participant, index) => {
                const phoneNumber = participant.mobile || participant.phone || 'Not provided';
                const canConfirm = participant.status === 'joined' || (!participant.status && !participant.confirmedByTrainer);

                return (
                  <div
                    key={participant.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '0.875rem',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      transition: 'all 0.2s',
                      marginBottom: '0.75rem'
                    }}
                  >
                    {/* Participant Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.625rem',
                      gap: '0.5rem'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: '700',
                          color: '#1f2937',
                          fontSize: '0.9375rem',
                          marginBottom: '0.25rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {participant.name}
                        </div>
                        <div style={{
                          fontSize: '0.6875rem',
                          color: '#9ca3af',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {participant.id}
                        </div>
                      </div>
                      {getStatusBadge(participant.status)}
                    </div>

                    {/* Contact Info */}
                    <div style={{
                      display: 'grid',
                      gap: '0.5rem',
                      marginBottom: '0.625rem',
                      fontSize: '0.8125rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#4b5563',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <FaEnvelope style={{ color: '#4f46e5', fontSize: '0.8125rem', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8125rem' }}>{participant.email}</span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#4b5563'
                      }}>
                        <FaPhone style={{ color: '#10b981', fontSize: '0.8125rem', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8125rem' }}>{phoneNumber}</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    {(participant.address || participant.city || participant.state || participant.pin) && (
                      <div style={{ marginBottom: '0.625rem' }}>
                        <button
                          onClick={() => toggleDetails(participant.id)}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            padding: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            color: '#4f46e5',
                            transition: 'all 0.2s'
                          }}
                        >
                          <FaMapMarkerAlt style={{ fontSize: '0.75rem' }} />
                          {showDetails[participant.id] ? 'Hide Address' : 'View Address'}
                        </button>

                        {/* Address Details */}
                        {showDetails[participant.id] && (
                          <div style={{
                            marginTop: '0.375rem',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            padding: '0.625rem',
                            fontSize: '0.75rem',
                            lineHeight: '1.4',
                            color: '#374151'
                          }}>
                            {participant.address && (
                              <div style={{ marginBottom: '0.25rem', fontWeight: '500' }}>
                                {participant.address}
                              </div>
                            )}
                            <div style={{
                              display: 'flex',
                              gap: '0.375rem',
                              flexWrap: 'wrap',
                              fontSize: '0.6875rem',
                              color: '#6b7280'
                            }}>
                              {participant.city && <span>{participant.city}</span>}
                              {participant.state && <span>• {participant.state}</span>}
                              {participant.pin && <span>• PIN: {participant.pin}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '0.625rem'
                    }}>
                      {participant.status === 'confirmed' ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          color: '#6b7280',
                          fontWeight: '500',
                          fontSize: '0.8125rem',
                          fontStyle: 'italic'
                        }}>
                          Confirmed
                        </div>
                      ) : participant.status === 'rejected' ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.375rem',
                          color: '#6b7280',
                          fontWeight: '500',
                          fontSize: '0.8125rem',
                          fontStyle: 'italic'
                        }}>
                          Rejected
                        </div>
                      ) : canConfirm ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleConfirmParticipant(participant)}
                            disabled={processingParticipant === participant.id || whatsappLoading}
                            style={{
                              flex: 1,
                              minWidth: '120px',
                              background: (processingParticipant === participant.id || whatsappLoading)
                                ? '#9ca3af'
                                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              cursor: (processingParticipant === participant.id || whatsappLoading)
                                ? 'not-allowed'
                                : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              transition: 'all 0.2s'
                            }}
                          >
                            {processingParticipant === participant.id ? (
                              <>
                                <FaSpinner className="spinning" />
                                Processing
                              </>
                            ) : (
                              <>
                                <FaWhatsapp />
                                Confirm
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectParticipant(participant)}
                            disabled={processingParticipant === participant.id}
                            style={{
                              background: processingParticipant === participant.id
                                ? '#9ca3af'
                                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              cursor: processingParticipant === participant.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FaTimes />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          color: '#6b7280',
                          fontStyle: 'italic',
                          fontSize: '0.8125rem'
                        }}>
                          No Action Required
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Styles */}
        <style jsx>{`
          .spinning {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Ultra Compact Mobile - 320px to 380px */
          @media (max-width: 380px) {
            .participants-container {
              padding: 0.25rem !important;
              overflow-x: hidden !important;
              max-width: 100vw !important;
            }

            .participants-header {
              padding: 0.5rem !important;
              border-radius: 8px !important;
              margin-bottom: 0.5rem !important;
            }

            .participants-header h1 {
              font-size: 0.875rem !important;
              font-weight: 600 !important;
            }

            .participants-header p {
              font-size: 0.625rem !important;
            }

            /* Stats Cards - 2 Per Row Ultra Compact */
            .stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.3rem !important;
              margin-bottom: 0.5rem !important;
            }

            .stat-card {
              padding: 0.4rem 0.3rem !important;
              border-radius: 8px !important;
            }

            .stat-icon {
              width: 28px !important;
              height: 28px !important;
              font-size: 0.75rem !important;
              margin-bottom: 0.2rem !important;
            }

            .stat-value {
              font-size: 1.1rem !important;
              margin-bottom: 0.0625rem !important;
              font-weight: 700 !important;
            }

            .stat-label {
              font-size: 0.6rem !important;
              line-height: 1.1 !important;
            }

            /* Search and Filter Section */
            .search-filter-section {
              padding: 0.5rem !important;
              border-radius: 8px !important;
              margin-bottom: 0.5rem !important;
              gap: 0.375rem !important;
            }

            .search-box {
              padding: 0.375rem 0.5rem !important;
              font-size: 0.675rem !important;
              border-radius: 6px !important;
            }

            .search-box input {
              font-size: 0.675rem !important;
            }

            .filter-buttons {
              gap: 0.2rem !important;
              flex-wrap: wrap !important;
            }

            .filter-btn {
              padding: 0.3rem 0.5rem !important;
              font-size: 0.625rem !important;
              border-radius: 5px !important;
              white-space: nowrap !important;
            }

            .filter-btn svg {
              font-size: 0.65rem !important;
            }

            /* Participants Table - Ultra Compact */
            .participants-table-container {
              padding: 0.5rem !important;
              border-radius: 8px !important;
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }

            .participants-table {
              font-size: 0.625rem !important;
              min-width: 600px !important;
            }

            .participants-table th {
              padding: 0.375rem 0.25rem !important;
              font-size: 0.6rem !important;
              font-weight: 600 !important;
            }

            .participants-table td {
              padding: 0.375rem 0.25rem !important;
              font-size: 0.625rem !important;
            }

            /* Status Badges */
            .status-badge {
              padding: 0.2rem 0.375rem !important;
              font-size: 0.575rem !important;
              border-radius: 4px !important;
              font-weight: 600 !important;
            }

            /* Action Buttons */
            .action-btn {
              padding: 0.3rem 0.4rem !important;
              font-size: 0.6rem !important;
              border-radius: 4px !important;
              font-weight: 600 !important;
            }

            .action-btn svg {
              font-size: 0.65rem !important;
            }

            /* Participant Card View */
            .participant-card {
              padding: 0.5rem !important;
              border-radius: 8px !important;
              margin-bottom: 0.375rem !important;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
            }

            .participant-name {
              font-size: 0.8rem !important;
              margin-bottom: 0.2rem !important;
              font-weight: 600 !important;
            }

            .participant-details {
              font-size: 0.6rem !important;
              gap: 0.2rem !important;
            }

            .participant-details svg {
              font-size: 0.65rem !important;
            }

            /* Modal Adjustments */
            .modal-overlay {
              padding: 0.5rem !important;
            }

            .modal-content {
              max-width: calc(100% - 1rem) !important;
              border-radius: 10px !important;
            }

            .modal-header {
              padding: 0.625rem !important;
            }

            .modal-header h2 {
              font-size: 0.875rem !important;
              font-weight: 600 !important;
            }

            .modal-body {
              padding: 0.625rem !important;
            }

            .modal-footer {
              padding: 0.625rem !important;
              gap: 0.375rem !important;
            }

            .modal-btn {
              padding: 0.375rem 0.625rem !important;
              font-size: 0.675rem !important;
              border-radius: 5px !important;
              font-weight: 600 !important;
            }

            /* Loading and Error States */
            .loading-container, .error-container {
              padding: 1.5rem 0.75rem !important;
            }

            .loading-spinner {
              width: 36px !important;
              height: 36px !important;
            }

            .loading-text, .error-text {
              font-size: 0.75rem !important;
            }

            /* Pagination */
            .pagination-container {
              padding: 0.5rem !important;
              gap: 0.375rem !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: center !important;
            }

            .pagination-info {
              font-size: 0.625rem !important;
            }

            .pagination-controls {
              gap: 0.25rem !important;
            }

            .page-btn {
              width: 28px !important;
              height: 28px !important;
              font-size: 0.675rem !important;
              border-radius: 5px !important;
            }

            /* Bulk Actions */
            .bulk-actions {
              padding: 0.375rem !important;
              gap: 0.3rem !important;
              flex-wrap: wrap !important;
            }

            .bulk-action-btn {
              padding: 0.3rem 0.5rem !important;
              font-size: 0.625rem !important;
              border-radius: 5px !important;
              font-weight: 600 !important;
            }

            /* Tabs/Navigation */
            .nav-tabs {
              gap: 0.2rem !important;
              padding: 0.3rem !important;
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch !important;
              scrollbar-width: none !important;
            }

            .nav-tabs::-webkit-scrollbar {
              display: none !important;
            }

            .nav-tab {
              padding: 0.3rem 0.5rem !important;
              font-size: 0.625rem !important;
              border-radius: 5px !important;
              white-space: nowrap !important;
            }
          }

          /* Medium Mobile - 381px to 480px */
          @media (min-width: 381px) and (max-width: 480px) {
            .participants-container {
              padding: 0.5rem !important;
            }

            .stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 0.5rem !important;
            }

            .participants-table th,
            .participants-table td {
              padding: 0.5rem 0.375rem !important;
              font-size: 0.7rem !important;
            }

            .filter-btn {
              padding: 0.375rem 0.625rem !important;
              font-size: 0.7rem !important;
            }
          }

          /* Tablet - 481px to 768px */
          @media (min-width: 481px) and (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 0.75rem !important;
            }

            .participants-table {
              font-size: 0.8rem !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default TrainerParticipants;
