import React, { useEffect, useState } from 'react';
import { ref, onValue, update, set, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { sendWelcomeMessage, generateUserId, formatDate } from '../services/whatsappService';
import { 
  FaUserCircle, 
  FaSignOutAlt, 
  FaChalkboardTeacher, 
  FaUser, 
  FaUsers, 
  FaTimes,
  FaCheck,
  FaUpload,
  FaEye,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaClock,
  FaPhone,
  FaEnvelope,
  FaSearch,
  FaFilter,
  FaBell,
  FaHome,
  FaEdit,
  FaImage,
  FaKey,
  FaChevronDown,
  FaChevronUp,
  FaBars,
  FaChevronLeft,
  FaChevronRight,
  FaWhatsapp
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Enhanced Professional Sidebar Component
function TrainerSidebar({ onLogout, setActiveTab, activeTab, isOpen, toggleSidebar, isMobile }) {
  const navItems = [
    { id: 'trainings', icon: FaChalkboardTeacher, label: 'My Trainings', badge: null },
    { id: 'appliedUsers', icon: FaUsers, label: 'Applied Users', badge: null },
    { id: 'profile', icon: FaUser, label: 'My Profile', badge: null },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      <aside className={`trainer-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo">
              <FaHome className="logo-icon" />
              <span className="logo-text">HTAMS</span>
            </div>
            <p className="logo-subtitle">Trainer Portal</p>
          </div>
          
          {/* Mobile Close Button */}
          {isMobile && (
            <button className="sidebar-close" onClick={toggleSidebar}>
              <FaTimes />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map(item => (
              <li key={item.id} className="nav-item">
                <button 
                  className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (isMobile) toggleSidebar();
                  }}
                >
                  <item.icon className="nav-icon" />
                  <span className="nav-text">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <FaSignOutAlt className="logout-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function TrainerDashboard() {
  // State Management
  const [state, setState] = useState({
    trainings: [],
    participants: [],
    activeTab: 'trainings',
    trainerId: '',
    trainerDetails: {},
    loading: true,
    error: '',
    showConfirmDialog: false,
    showCancelDialog: false,
    showCompleteDialog: false,
    selectedParticipant: null,
    selectedTraining: null,
    cancelReason: '',
    submittingId: null,
    cancellingId: null,
    imageFile: null,
    otpInput: '',
    searchTerm: '',
    filterStatus: 'all',
    expandedTraining: null,
    sidebarOpen: false,
    windowWidth: window.innerWidth,
    whatsappLoading: false,
    confirmingParticipantId: null,
  });

  const navigate = useNavigate();

  // Helper function to update state
  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Window resize handler for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      updateState({ windowWidth: window.innerWidth });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = state.windowWidth < 768;
  const isTablet = state.windowWidth >= 768 && state.windowWidth < 1024;

  const toggleSidebar = () => {
    updateState({ sidebarOpen: !state.sidebarOpen });
  };

  // Authentication and data fetching effects
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchTrainerData(user.email);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (state.trainerId) {
      fetchTrainings();
    }
  }, [state.trainerId]);

  const fetchTrainerData = async (email) => {
    try {
      const trainersRef = ref(db, 'HTAMS/company/trainers');
      onValue(trainersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const entry = Object.entries(data).find(([id, t]) => t.email === email);
        
        if (entry) {
          const [id, trainer] = entry;
          updateState({ 
            trainerId: id, 
            trainerDetails: trainer,
            loading: false 
          });
          localStorage.setItem('trainerId', id);
          localStorage.setItem('trainerDetails', JSON.stringify(trainer));
        } else {
          updateState({ error: 'Trainer profile not found', loading: false });
        }
      });
    } catch (error) {
      updateState({ error: `Error fetching trainer profile: ${error.message}`, loading: false });
    }
  };

  const fetchTrainings = () => {
    const trainingRef = ref(db, 'HTAMS/company/trainings');
    onValue(trainingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const assigned = Object.entries(data)
        .filter(([_, t]) => t.trainerId === state.trainerId)
        .map(([id, t]) => ({ id, ...t }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const allParticipants = [];
      assigned.forEach((training) => {
        if (training.participants) {
          Object.entries(training.participants).forEach(([participantId, participant]) => {
            allParticipants.push({
              trainingId: training.id,
              participantId,
              ...participant,
              trainingLocation: training.location,
              trainingDate: training.date,
            });
          });
        }
      });

      updateState({ 
        trainings: assigned, 
        participants: allParticipants,
        loading: false 
      });
    });
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.clear();
      navigate('/trainer-login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // FIXED: Handle Confirm Participant with WhatsApp Integration
  const handleConfirmParticipant = async () => {
    if (!state.selectedParticipant) return;

    // Confirm action with WhatsApp messaging
    const confirmMessage = `Confirm ${state.selectedParticipant.name} as a participant and send welcome message via WhatsApp?`;
    if (!window.confirm(confirmMessage)) return;

    updateState({ 
      whatsappLoading: true, 
      confirmingParticipantId: state.selectedParticipant.participantId 
    });

    try {
      // Step 1: Check if user already exists to prevent duplicates
      const existingUserQuery = ref(db, 'HTAMS/users');
      const existingSnapshot = await get(existingUserQuery);
      
      if (existingSnapshot.exists()) {
        const users = existingSnapshot.val();
        const existingUser = Object.values(users).find(user => 
          user.email === state.selectedParticipant.email
        );
        
        if (existingUser) {
          alert('❌ This email is already registered in the system.');
          return;
        }
      }

      // Step 2: Generate user ID and prepare WhatsApp data
      const generatedUserId = generateUserId({
        name: state.selectedParticipant.name,
        mobile: state.selectedParticipant.mobile
      });

      const participantData = {
        userId: generatedUserId,
        joiningDate: formatDate(state.selectedParticipant.trainingDate || new Date()),
        name: state.selectedParticipant.name,
        mobile: state.selectedParticipant.mobile,
        email: state.selectedParticipant.email || 'N/A',
        role: 'Sales Team',
        portalUrl: 'https://royal-pazz.vercel.app/login'
      };

      // Step 3: Send WhatsApp welcome message
      const messageSent = await sendWelcomeMessage(participantData);
      
      if (!messageSent) {
        const continueAnyway = window.confirm('❌ Failed to send WhatsApp message. Continue with confirmation anyway?');
        if (!continueAnyway) {
          return;
        }
      }

      // Step 4: Generate a unique user ID (skip Firebase Auth creation to avoid logout)
      // We'll create the user account later when they first login
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Step 5: Create proper user data structure
      const userData = {
        // Basic Info
        name: state.selectedParticipant.name || '',
        phone: state.selectedParticipant.mobile || '',
        mobile: state.selectedParticipant.mobile || '',
        email: state.selectedParticipant.email || '',
        
        // Personal Details (from participant data if available)
        aadhar: state.selectedParticipant.aadhar || '',
        address: state.selectedParticipant.address || '',
        city: state.selectedParticipant.city || '',
        state: state.selectedParticipant.state || '',
        pin: state.selectedParticipant.pin || '',
        pan: state.selectedParticipant.pan || '',
        
        // Role & Level
        role: 'agency',
        Role: 'Agency',
        currentLevel: 'Agency',
        
        // System Fields
        createdAt: new Date().toISOString(),
        lastUpdated: Date.now(),
        isActive: true,
        firstTime: true,
        accountCreated: false, // Will be true when they first login and create Firebase Auth account
        
        // Training & Referral Info
        referredBy: state.selectedParticipant.referredBy || '',
        joinedViaTraining: state.selectedParticipant.trainingId,
        
        // WhatsApp Integration Info
        generatedUserId: generatedUserId,
        whatsappWelcomeSent: messageSent,
        
        // Initialize Sales & Analytics
        MySales: "0",
        MyTeam: "",
        analytics: {
          totalCommissionsEarned: 0,
          totalCommissionsReceived: 0,
          totalOrders: 0,
          totalSales: 0
        },
        
        // Initialize empty objects for future data
        commissionHistory: {},
        salesHistory: {}
      };

      // Step 6: Save user data with generated ID as key
      await set(ref(db, `HTAMS/users/${userId}`), userData);

      // Step 7: Update participant status in training (NOT in users node)
      const participantRef = ref(
        db,
        `HTAMS/company/trainings/${state.selectedParticipant.trainingId}/participants/${state.selectedParticipant.participantId}`
      );
      
      await update(participantRef, { 
        status: 'confirmed', 
        confirmedByTrainer: true,
        confirmedAt: new Date().toISOString(),
        userAccountCreated: true,
        createdUserId: userId,
        generatedUserId: generatedUserId,
        whatsappWelcomeSent: messageSent
      });

      const successMessage = messageSent 
        ? `✅ ${state.selectedParticipant.name} confirmed successfully!\n📱 Welcome message sent to WhatsApp: +91${state.selectedParticipant.mobile}`
        : `✅ ${state.selectedParticipant.name} confirmed successfully!\n⚠️ WhatsApp message failed to send.`;
      
      alert(successMessage);

      // Update local state
      updateState({
        showConfirmDialog: false,
        selectedParticipant: null,
        participants: state.participants.map((part) =>
          part.trainingId === state.selectedParticipant.trainingId &&
          part.participantId === state.selectedParticipant.participantId
            ? { ...part, status: 'confirmed', confirmedByTrainer: true, whatsappWelcomeSent: messageSent }
            : part
        )
      });

    } catch (error) {
      console.error("Error confirming participant:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        alert('❌ This email is already registered with Firebase Auth.');
      } else if (error.code === 'auth/weak-password') {
        alert('❌ Password is too weak. Please use a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        alert('❌ Invalid email format.');
      } else {
        alert('❌ Error confirming participant: ' + error.message);
      }
    } finally {
      updateState({ 
        whatsappLoading: false, 
        confirmingParticipantId: null 
      });
    }
  };

  // FIXED: Handle Mark Done - Batch Process All Confirmed Participants
  const handleMarkDone = async () => {
    if (state.otpInput !== state.selectedTraining.otp) {
      alert('Invalid OTP. Please check the OTP and try again.');
      return;
    }

    updateState({ submittingId: state.selectedTraining.id });
    
    try {
      // Upload completion image if provided
      let downloadURL = '';
      if (state.imageFile) {
        const storage = getStorage();
        const imgRef = storageRef(storage, `training_completions/${state.selectedTraining.id}`);
        await uploadBytes(imgRef, state.imageFile);
        downloadURL = await getDownloadURL(imgRef);
      }

      // Update training status
      await update(ref(db, `HTAMS/company/trainings/${state.selectedTraining.id}`), {
        status: 'done',
        completionImage: downloadURL,
        completedAt: new Date().toISOString(),
        completedBy: state.trainerId,
      });

      // Process only confirmed participants who don't have accounts yet
      const participants = state.selectedTraining.participants || {};
      const confirmedParticipants = Object.entries(participants).filter(
        ([_, participant]) => participant.status === 'confirmed' && !participant.userAccountCreated
      );

      let successfulRegistrations = 0;
      let errors = [];

      // Process each confirmed participant
      for (const [participantId, participantData] of confirmedParticipants) {
        try {
          // Check if user already exists
          const existingUserQuery = ref(db, 'HTAMS/users');
          const existingSnapshot = await get(existingUserQuery);
          let userExists = false;
          
          if (existingSnapshot.exists()) {
            const users = existingSnapshot.val();
            userExists = Object.values(users).some(user => 
              user.email === participantData.email
            );
          }

          if (userExists) {
            console.log(`User ${participantData.name} already exists, skipping...`);
            continue;
          }

          // Create Firebase Auth account
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            participantData.email,
            participantData.mobile.toString()
          );
          
          const userId = userCredential.user.uid;

          // Create complete user data
          const userData = {
            name: participantData.name || '',
            phone: participantData.mobile || '',
            mobile: participantData.mobile || '',
            email: participantData.email || '',
            aadhar: participantData.aadhar || '',
            address: participantData.address || '',
            city: participantData.city || '',
            state: participantData.state || '',
            pin: participantData.pin || '',
            pan: participantData.pan || '',
            role: 'agency',
            Role: 'Agency',
            currentLevel: 'Agency',
            createdAt: new Date().toISOString(),
            lastUpdated: Date.now(),
            isActive: true,
            firstTime: true,
            referredBy: participantData.referredBy || state.selectedTraining.referredBy || '',
            joinedViaTraining: state.selectedTraining.id,
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

          // Save user with proper Firebase Auth UID (NO NESTED IDs!)
          await set(ref(db, `HTAMS/users/${userId}`), userData);
          
          // Mark participant as having account created
          await update(ref(db, `HTAMS/company/trainings/${state.selectedTraining.id}/participants/${participantId}`), {
            userAccountCreated: true,
            createdUserId: userId,
            accountCreatedAt: new Date().toISOString()
          });
          
          successfulRegistrations++;
          
        } catch (error) {
          console.error(`Error creating account for ${participantData.name}:`, error);
          errors.push(`${participantData.name}: ${error.message}`);
        }
      }

      // Show completion message
      if (successfulRegistrations > 0) {
        alert(`✅ Training completed successfully! ${successfulRegistrations} participants registered as agencies.${errors.length > 0 ? `\n\nErrors: ${errors.join(', ')}` : ''}`);
      } else {
        alert('✅ Training marked as completed. All eligible participants were already registered.');
      }
      
      updateState({ 
        otpInput: '', 
        imageFile: null,
        showCompleteDialog: false,
        selectedTraining: null
      });
      
    } catch (error) {
      console.error('Error completing training:', error);
      alert('❌ Error completing training: ' + error.message);
    }
    
    updateState({ submittingId: null });
  };

  const handleCancelTraining = async () => {
    if (!state.selectedTraining || !state.cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    updateState({ cancellingId: state.selectedTraining.id });
    try {
      await update(ref(db, `HTAMS/company/trainings/${state.selectedTraining.id}`), {
        status: 'cancelled',
        cancelReason: state.cancelReason,
        cancelledAt: new Date().toISOString(),
        cancelledBy: state.trainerId,
      });

      alert('✅ Training cancelled successfully. Participants will be notified.');
      updateState({ 
        showCancelDialog: false,
        selectedTraining: null,
        cancelReason: '' 
      });
    } catch (error) {
      alert('❌ Error cancelling training: ' + error.message);
    }
    updateState({ cancellingId: null });
  };

  // Filter functions
  const filteredTrainings = state.trainings.filter(training => {
    const matchesSearch = training.location.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                        training.venue.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                        training.products.toLowerCase().includes(state.searchTerm.toLowerCase());
    
    const matchesFilter = state.filterStatus === 'all' || training.status === state.filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getParticipantCount = (training) => {
    return training.participants ? Object.keys(training.participants).length : 0;
  };

  const getConfirmedCount = (training) => {
    if (!training.participants) return 0;
    return Object.values(training.participants).filter(p => p.confirmedByTrainer).length;
  };

  return (
    <div className="trainer-container">
      {/* Add CSS Styles */}
      <style>
        {`/* =================== BASE STYLES & RESET =================== */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  line-height: 1.6;
  color: #333;
}

/* =================== MAIN CONTAINER =================== */
.trainer-container {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
  position: relative;
}

/* =================== SIDEBAR STYLES =================== */
.trainer-sidebar {
  width: 280px;
  background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 1000;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, opacity 0.3s ease;
  transform: translateX(-100%);
  opacity: 0;
}

.trainer-sidebar.sidebar-open {
  transform: translateX(0);
  opacity: 1;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  backdrop-filter: blur(4px);
}

.sidebar-header {
  padding: 2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.logo-container {
  text-align: center;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  font-size: 1.8rem;
  color: #60a5fa;
}

.logo-text {
  font-size: 1.75rem;
  font-weight: 800;
  background: linear-gradient(45deg, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  font-size: 0.875rem;
  color: #94a3b8;
  font-weight: 500;
}

.sidebar-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
}

.nav-list {
  list-style: none;
}

.nav-item {
  margin: 0.25rem 0;
}

.nav-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: #e2e8f0;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 0 25px 25px 0;
  margin-right: 1rem;
  font-size: 0.95rem;
  font-weight: 500;
  position: relative;
}

.nav-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateX(8px);
}

.nav-button.active {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
}

.nav-button.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: #60a5fa;
  border-radius: 0 4px 4px 0;
}

.nav-icon {
  font-size: 1.1rem;
  min-width: 20px;
}

.nav-text {
  font-weight: 500;
}

.nav-badge {
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  margin-left: auto;
}

.sidebar-footer {
  padding: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.logout-btn:hover {
  background: #ef4444;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
}

/* =================== MOBILE HEADER =================== */
.mobile-header {
  display: none;
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  padding: 1rem 1.25rem;
  align-items: center;
  justify-content: space-between;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 998;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.mobile-menu-toggle {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.mobile-menu-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.mobile-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.mobile-logo {
  font-size: 1.4rem;
  font-weight: 800;
  background: linear-gradient(45deg, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mobile-subtitle {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: -2px;
}

.mobile-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* =================== MAIN CONTENT AREA =================== */
.trainer-main {
  flex: 1;
  margin-left: 0;
  background: #f8fafc;
  min-height: 100vh;
  transition: margin-left 0.3s ease;
}

.trainer-main.mobile-layout {
  margin-left: 0;
  padding-top: 80px;
}

.dashboard-header {
  background: white;
  padding: 2rem 2.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left h1.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: #64748b;
  font-size: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.trainer-profile {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.trainer-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.trainer-info {
  display: flex;
  flex-direction: column;
}

.trainer-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
}

.trainer-role {
  color: #64748b;
  font-size: 0.875rem;
}

/* =================== MOBILE PAGE HEADER =================== */
.mobile-page-header {
  padding: 1.5rem 1.25rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1rem;
}

.mobile-page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
}

/* =================== CONTENT SECTIONS =================== */
.dashboard-content {
  padding: 0;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem 2rem 0;
}

.search-filter-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-box, .filter-box {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.search-box:focus-within, .filter-box:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon, .filter-icon {
  color: #64748b;
  margin-right: 0.5rem;
}

.search-input, .filter-select {
  border: none;
  outline: none;
  background: none;
  font-size: 0.875rem;
  color: #334155;
  min-width: 200px;
}

.filter-select {
  min-width: 150px;
  cursor: pointer;
}

.stats {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat-item {
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* =================== PROFILE SECTION =================== */
.profile-section {
  padding: 2rem;
}

.profile-card {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.profile-avatar-large {
  width: 80px;
  height: 80px;
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 2rem;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.profile-details h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.profile-title {
  color: #64748b;
  font-size: 1rem;
  font-weight: 500;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border-left: 4px solid #3b82f6;
}

.info-icon {
  color: #3b82f6;
  font-size: 1.1rem;
  min-width: 20px;
}

.info-label {
  font-weight: 600;
  color: #374151;
  min-width: 80px;
}

.info-value {
  color: #1f2937;
  font-weight: 500;
}

/* =================== TABLE STYLES =================== */
.responsive-table-container {
  padding: 0 2rem 2rem;
}

.table-container {
  background: white;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: linear-gradient(90deg, #f8fafc, #f1f5f9);
}

.data-table th {
  padding: 1.25rem 1.5rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e2e8f0;
}

.data-table td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.data-table tbody tr {
  transition: all 0.2s ease;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* =================== MOBILE CARD STYLES =================== */
.mobile-cards-grid {
  display: grid;
  gap: 1rem;
  padding: 0 1.25rem 2rem;
}

.training-mobile-card, .participant-mobile-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.training-mobile-card:hover, .participant-mobile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.training-location, .participant-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.training-location h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.location-icon {
  color: #3b82f6;
  font-size: 1rem;
}

.participant-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #10b981, #059669);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  margin-right: 0.75rem;
}

.card-info h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.25rem 0;
}

.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}

.detail-icon {
  color: #64748b;
  font-size: 0.875rem;
  min-width: 16px;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  min-width: 60px;
}

.products-text {
  color: #1f2937;
  font-weight: 500;
  line-height: 1.4;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

/* =================== BUTTON STYLES =================== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  justify-content: center;
  min-height: 44px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
}

.btn-success {
  background: linear-gradient(45deg, #10b981, #059669);
  color: white;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
}

.btn-danger {
  background: linear-gradient(45deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  color: #334155;
}

.btn-mobile {
  flex: 1;
  min-width: 0;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  min-height: 36px;
}

/* =================== STATUS BADGES =================== */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.pending {
  background: linear-gradient(45deg, #f59e0b, #d97706);
  color: white;
}

.status-badge.confirmed {
  background: linear-gradient(45deg, #10b981, #059669);
  color: white;
}

.status-badge.done {
  background: linear-gradient(45deg, #10b981, #059669);
  color: white;
}

.status-badge.cancelled {
  background: linear-gradient(45deg, #ef4444, #dc2626);
  color: white;
}

.status-badge.joined {
  background: linear-gradient(45deg, #3b82f6, #1d4ed8);
  color: white;
}

/* =================== MODAL STYLES =================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 1rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.modal-icon {
  color: #3b82f6;
  font-size: 1.1rem;
}

.modal-close {
  background: #f1f5f9;
  border: none;
  color: #64748b;
  padding: 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #e2e8f0;
  color: #374151;
  transform: scale(1.1);
}

.modal-content {
  padding: 2rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.training-summary {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #3b82f6;
}

.training-summary h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.training-summary p {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.completion-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-icon {
  color: #3b82f6;
}

.form-input, .form-textarea {
  padding: 0.875rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  color: #64748b;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.modal-note {
  background: #fef3c7;
  color: #92400e;
  padding: 1rem;
  border-radius: 0.5rem;
  border-left: 4px solid #f59e0b;
  margin-top: 1rem;
  font-size: 0.875rem;
}

/* =================== LOADING & EMPTY STATES =================== */
.loading-container, .error-container, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: #ef4444;
  font-weight: 600;
  margin: 0;
}

.empty-icon {
  font-size: 4rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #374151;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
}

/* =================== RESPONSIVE BREAKPOINTS =================== */

/* Desktop Styles (Default) */
@media (min-width: 1024px) {
  .trainer-sidebar {
    position: relative;
    transform: translateX(0);
    opacity: 1;
  }
  
  // .trainer-main {
  //   margin-left: 280px;
  // }
  
  .mobile-header {
    display: none;
  }
  
  .sidebar-close {
    display: none;
  }
}

/* Tablet Styles */
@media (max-width: 1023px) and (min-width: 768px) {
  .mobile-header {
    display: flex;
  }
  
  .dashboard-header {
    display: none;
  }
  
  .section-header {
    padding: 1rem 1.25rem 0;
  }
  
  .search-filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box, .filter-box {
    width: 100%;
  }
  
  .stats {
    justify-content: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .modal-actions .btn {
    width: 100%;
  }
}

/* Mobile Styles */
@media (max-width: 767px) {
  .mobile-header {
    display: flex;
    padding: 0.875rem 1rem;
  }
  
  .dashboard-header {
    display: none;
  }
  
  .mobile-title {
    flex-direction: row;
    gap: 0.5rem;
  }
  
  .mobile-logo {
    font-size: 1.25rem;
  }
  
  .mobile-subtitle {
    font-size: 0.7rem;
    margin-top: 2px;
  }
  
  .mobile-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
  
  .trainer-main.mobile-layout {
    padding-top: 70px;
  }
  
  .mobile-page-header {
    padding: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .mobile-page-title {
    font-size: 1.25rem;
  }
  
  .section-header {
    padding: 1rem 1rem 0;
  }
  
  .search-filter-bar {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .search-input {
    min-width: 0;
    width: 100%;
  }
  
  .filter-select {
    min-width: 0;
    width: 100%;
  }
  
  .stats {
    justify-content: center;
    gap: 0.75rem;
  }
  
  .stat-item {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
  
  .profile-section {
    padding: 1rem;
  }
  
  .profile-card {
    padding: 1.25rem;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }
  
  .profile-avatar-large {
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }
  
  .profile-details h2 {
    font-size: 1.4rem;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.875rem;
  }
  
  .info-label {
    min-width: auto;
    font-size: 0.8rem;
  }
  
  .responsive-table-container {
    padding: 0 1rem 1rem;
  }
  
  .mobile-cards-grid {
    padding: 0 1rem 1rem;
  }
  
  .training-mobile-card, .participant-mobile-card {
    padding: 1.25rem;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .training-location h4 {
    font-size: 1rem;
  }
  
  .detail-row {
    font-size: 0.8rem;
  }
  
  .card-actions {
    gap: 0.5rem;
  }
  
  .btn-mobile {
    font-size: 0.8rem;
    padding: 0.625rem 1rem;
    min-height: 40px;
  }
  
  .modal {
    margin: 1rem;
    max-width: calc(100% - 2rem);
  }
  
  .modal-header {
    padding: 1.25rem 1.5rem;
  }
  
  .modal-content {
    padding: 1.5rem;
  }
  
  .modal-actions {
    padding: 1.25rem 1.5rem;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .modal-actions .btn {
    width: 100%;
    order: 1;
  }
  
  .modal-actions .btn-secondary {
    order: 2;
  }
  
  .training-summary {
    padding: 1.25rem;
  }
  
  .training-summary h4 {
    font-size: 1rem;
  }
  
  .training-summary p {
    font-size: 0.8rem;
  }
  
  .form-input, .form-textarea {
    padding: 0.75rem;
    font-size: 0.875rem;
  }
}

/* Extra Small Mobile Styles */
@media (max-width: 480px) {
  .mobile-header {
    padding: 0.75rem;
  }
  
  .mobile-title {
    gap: 0.25rem;
  }
  
  .mobile-logo {
    font-size: 1.1rem;
  }
  
  .mobile-subtitle {
    font-size: 0.65rem;
  }
  
  .mobile-avatar {
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }
  
  .trainer-main.mobile-layout {
    padding-top: 65px;
  }
  
  .mobile-page-title {
    font-size: 1.1rem;
  }
  
  .section-header {
    padding: 0.75rem 0.75rem 0;
  }
  
  .stats {
    gap: 0.5rem;
  }
  
  .stat-item {
    font-size: 0.75rem;
    padding: 0.35rem 0.7rem;
  }
  
  .profile-section, .responsive-table-container, .mobile-cards-grid {
    padding: 0 0.75rem 0.75rem;
  }
  
  .training-mobile-card, .participant-mobile-card {
    padding: 1rem;
  }
  
  .card-details {
    gap: 0.5rem;
  }
  
  .detail-row {
    font-size: 0.75rem;
  }
  
  .btn-mobile {
    font-size: 0.75rem;
    padding: 0.5rem 0.875rem;
    min-height: 36px;
  }
  
  .modal {
    margin: 0.5rem;
    max-width: calc(100% - 1rem);
    border-radius: 0.75rem;
  }
  
  .modal-header {
    padding: 1rem 1.25rem;
  }
  
  .modal-content {
    padding: 1.25rem;
  }
  
  .modal-actions {
    padding: 1rem 1.25rem;
  }
}

/* =================== UTILITY CLASSES =================== */
.confirmed-badge {
  color: #059669;
  font-weight: 600;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.participant-info, .training-details, .contact-info, .schedule-info, 
.participants-summary, .training-info, .date-info, .products-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.participant-name, .training-title {
  font-weight: 600;
  color: #1e293b;
}

.participant-id, .training-id, .training-venue {
  font-size: 0.75rem;
  color: #64748b;
}

.contact-item, .schedule-item, .participant-count, .confirmed-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.contact-icon, .schedule-icon, .participants-icon, .confirmed-icon,
.training-icon, .date-icon {
  font-size: 0.8rem;
  color: #64748b;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* =================== HOVER EFFECTS & ANIMATIONS =================== */
.training-mobile-card.pending {
  border-left: 4px solid #f59e0b;
}

.training-mobile-card.done {
  border-left: 4px solid #10b981;
}

.training-mobile-card.cancelled {
  border-left: 4px solid #ef4444;
}

.training-row.pending {
  border-left: 4px solid #f59e0b;
}

.training-row.done {
  border-left: 4px solid #10b981;
}

.training-row.cancelled {
  border-left: 4px solid #ef4444;
}

/* =================== ACCESSIBILITY =================== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus styles for keyboard navigation */
.nav-button:focus,
.btn:focus,
.form-input:focus,
.form-textarea:focus,
.search-input:focus,
.filter-select:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .status-badge,
  .btn {
    border: 2px solid currentColor;
  }
}
 `}
      </style>

      {/* Mobile Header */}
      {(isMobile || isTablet) && (
        <header className="mobile-header">
          <button className="mobile-menu-toggle" onClick={toggleSidebar}>
            <FaBars />
          </button>
          <div className="mobile-title">
            <span className="mobile-logo">HTAMS</span>
            <span className="mobile-subtitle">Trainer Portal</span>
          </div>
          <div className="mobile-avatar">
            {state.trainerDetails.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
        </header>
      )}

      <TrainerSidebar 
        onLogout={handleLogout} 
        setActiveTab={(tab) => updateState({ activeTab: tab })}
        activeTab={state.activeTab}
        isOpen={state.sidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile || isTablet}
      />
      
      <main className={`trainer-main ${(isMobile || isTablet) ? 'mobile-layout' : ''}`}>
        {/* Desktop Header */}
        {!isMobile && !isTablet && (
          <header className="dashboard-header">
            <div className="header-left">
              <h1 className="page-title">
                {state.activeTab === 'trainings' && 'My Trainings'}
                {state.activeTab === 'appliedUsers' && 'Applied Users'}
                {state.activeTab === 'profile' && 'My Profile'}
              </h1>
              <p className="page-subtitle">
                {state.activeTab === 'trainings' && 'Manage your assigned training sessions'}
                {state.activeTab === 'appliedUsers' && 'Review and confirm training participants'}
                {state.activeTab === 'profile' && 'View your trainer information'}
              </p>
            </div>
            <div className="header-right">
              <div className="trainer-profile">
                <div className="trainer-avatar">
                  {state.trainerDetails.name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <div className="trainer-info">
                  <span className="trainer-name">{state.trainerDetails.name || 'Trainer'}</span>
                  <span className="trainer-role">Training Specialist</span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Content Area */}
        <div className="dashboard-content">
          {/* Mobile Page Header */}
          {(isMobile || isTablet) && (
            <div className="mobile-page-header">
              <h2 className="mobile-page-title">
                {state.activeTab === 'trainings' && 'My Trainings'}
                {state.activeTab === 'appliedUsers' && 'Applied Users'}
                {state.activeTab === 'profile' && 'My Profile'}
              </h2>
            </div>
          )}

          {state.loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          )}

          {state.error && (
            <div className="error-container">
              <p className="error-message">⚠️ {state.error}</p>
            </div>
          )}

          {/* Profile Tab */}
          {!state.loading && !state.error && state.activeTab === 'profile' && (
            <div className="profile-section">
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar-large">
                    {state.trainerDetails.name?.charAt(0)?.toUpperCase() || 'T'}
                  </div>
                  <div className="profile-details">
                    <h2>{state.trainerDetails.name || 'Not Available'}</h2>
                    <p className="profile-title">Certified Trainer</p>
                  </div>
                </div>
                <div className="profile-info">
                  <div className="info-row">
                    <FaEnvelope className="info-icon" />
                    <span className="info-label">Email:</span>
                    <span className="info-value">{state.trainerDetails.email || 'Not Available'}</span>
                  </div>
                  <div className="info-row">
                    <FaPhone className="info-icon" />
                    <span className="info-label">Phone:</span>
                    <span className="info-value">{state.trainerDetails.phone || 'Not Available'}</span>
                  </div>
                  <div className="info-row">
                    <FaChalkboardTeacher className="info-icon" />
                    <span className="info-label">Experience:</span>
                    <span className="info-value">{state.trainerDetails.experience || 'Not Available'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applied Users Tab */}
          {!state.loading && !state.error && state.activeTab === 'appliedUsers' && (
            <div className="applied-users-section">
              <div className="section-header">
                <h3>Training Applications</h3>
                <div className="stats">
                  <span className="stat-item">
                    Total: {state.participants.length}
                  </span>
                  <span className="stat-item">
                    Confirmed: {state.participants.filter(p => p.confirmedByTrainer).length}
                  </span>
                </div>
              </div>

              {state.participants.length === 0 ? (
                <div className="empty-state">
                  <FaUsers className="empty-icon" />
                  <h3>No Applications Yet</h3>
                  <p>When users apply for your trainings, they will appear here.</p>
                </div>
              ) : (
                <div className="responsive-table-container">
                  {/* Mobile Cards View */}
                  {(isMobile || isTablet) ? (
                    <div className="mobile-cards-grid">
                      {state.participants.map((participant, index) => (
                        <div key={`${participant.trainingId}-${participant.participantId}`} className="participant-mobile-card">
                          <div className="card-header">
                            <div className="participant-avatar">
                              {participant.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="card-info">
                              <h4 className="participant-name">{participant.name || 'N/A'}</h4>
                              <span className={`status-badge ${participant.status || 'pending'}`}>
                                {participant.confirmedByTrainer ? 'Confirmed' : (participant.status || 'Pending')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="card-details">
                            <div className="detail-row">
                              <FaPhone className="detail-icon" />
                              <span>{participant.mobile || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <FaEnvelope className="detail-icon" />
                              <span>{participant.email || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <FaMapMarkerAlt className="detail-icon" />
                              <span>{participant.trainingLocation}</span>
                            </div>
                            <div className="detail-row">
                              <FaCalendarAlt className="detail-icon" />
                              <span>{participant.trainingDate}</span>
                            </div>
                          </div>
                          
                          {participant.status === 'joined' && !participant.confirmedByTrainer && (
                            <div className="card-actions">
                              <button 
                                className="btn btn-success btn-mobile"
                                onClick={() => updateState({ 
                                  showConfirmDialog: true, 
                                  selectedParticipant: participant 
                                })}
                              >
                                <FaCheck /> Confirm
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Desktop Table View */
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Participant</th>
                            <th>Contact</th>
                            <th>Training</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.participants.map((participant, index) => (
                            <tr key={`${participant.trainingId}-${participant.participantId}`}>
                              <td>
                                <div className="participant-info">
                                  <div className="participant-avatar">
                                    {participant.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <div className="participant-name">{participant.name || 'N/A'}</div>
                                    <div className="participant-id">#{participant.participantId}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="contact-info">
                                  <div className="contact-item">
                                    <FaPhone className="contact-icon" />
                                    {participant.mobile || 'N/A'}
                                  </div>
                                  <div className="contact-item">
                                    <FaEnvelope className="contact-icon" />
                                    {participant.email || 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="training-info">
                                  <FaMapMarkerAlt className="training-icon" />
                                  {participant.trainingLocation}
                                </div>
                              </td>
                              <td>
                                <div className="date-info">
                                  <FaCalendarAlt className="date-icon" />
                                  {participant.trainingDate}
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge ${participant.status || 'pending'}`}>
                                  {participant.confirmedByTrainer ? 'Confirmed' : (participant.status || 'Pending')}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {participant.status === 'joined' && !participant.confirmedByTrainer && (
                                    <button 
                                      className="btn btn-success btn-sm"
                                      onClick={() => updateState({ 
                                        showConfirmDialog: true, 
                                        selectedParticipant: participant 
                                      })}
                                    >
                                      <FaCheck /> Confirm
                                    </button>
                                  )}
                                  {participant.confirmedByTrainer && (
                                    <span className="confirmed-badge">✅ Confirmed</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* My Trainings Tab */}
          {!state.loading && !state.error && state.activeTab === 'trainings' && (
            <div className="trainings-section">
              <div className="section-header">
                <div className="search-filter-bar">
                  <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search trainings..."
                      value={state.searchTerm}
                      onChange={(e) => updateState({ searchTerm: e.target.value })}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-box">
                    <FaFilter className="filter-icon" />
                    <select 
                      value={state.filterStatus}
                      onChange={(e) => updateState({ filterStatus: e.target.value })}
                      className="filter-select"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="done">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="stats">
                  <span className="stat-item">
                    Total: {state.trainings.length}
                  </span>
                  <span className="stat-item">
                    Pending: {state.trainings.filter(t => !t.status || t.status === 'pending').length}
                  </span>
                  <span className="stat-item">
                    Completed: {state.trainings.filter(t => t.status === 'done').length}
                  </span>
                </div>
              </div>

              {filteredTrainings.length === 0 ? (
                <div className="empty-state">
                  <FaChalkboardTeacher className="empty-icon" />
                  <h3>No Trainings Found</h3>
                  <p>No training sessions match your current filters.</p>
                </div>
              ) : (
                <div className="responsive-table-container">
                  {/* Mobile Cards View */}
                  {(isMobile || isTablet) ? (
                    <div className="mobile-cards-grid">
                      {filteredTrainings.map((training) => (
                        <div key={training.id} className={`training-mobile-card ${training.status || 'pending'}`}>
                          <div className="card-header">
                            <div className="training-location">
                              <FaMapMarkerAlt className="location-icon" />
                              <h4>{training.location}</h4>
                            </div>
                            <span className={`status-badge ${training.status || 'pending'}`}>
                              {training.status === 'done' ? 'Completed' : 
                              training.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                            </span>
                          </div>
                          
                          <div className="card-details">
                            <div className="detail-row">
                              <span className="detail-label">Venue:</span>
                              <span>{training.venue}</span>
                            </div>
                            <div className="detail-row">
                              <FaCalendarAlt className="detail-icon" />
                              <span>{training.date}</span>
                            </div>
                            <div className="detail-row">
                              <FaClock className="detail-icon" />
                              <span>{training.time}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Products:</span>
                              <span className="products-text">{training.products}</span>
                            </div>
                            <div className="detail-row">
                              <FaUsers className="detail-icon" />
                              <span>{getParticipantCount(training)} participants ({getConfirmedCount(training)} confirmed)</span>
                            </div>
                          </div>
                          
                          <div className="card-actions">
                            {training.status !== 'done' && training.status !== 'cancelled' && (
                              <>
                                <button 
                                  className="btn btn-primary btn-mobile"
                                  onClick={() => updateState({ 
                                    showCompleteDialog: true, 
                                    selectedTraining: training 
                                  })}
                                >
                                  <FaCheck /> Complete
                                </button>
                                <button 
                                  className="btn btn-danger btn-mobile"
                                  onClick={() => updateState({ 
                                    showCancelDialog: true, 
                                    selectedTraining: training 
                                  })}
                                >
                                  <FaTimes /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Desktop Table View - Simplified for space */
                    <div className="table-container">
                      <table className="data-table trainings-table">
                        <thead>
                          <tr>
                            <th>Training Details</th>
                            <th>Schedule</th>
                            <th>Products</th>
                            <th>Participants</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTrainings.map((training) => (
                            <tr key={training.id} className={`training-row ${training.status || 'pending'}`}>
                              <td>
                                <div className="training-details">
                                  <div className="training-title">
                                    <FaMapMarkerAlt className="location-icon" />
                                    <strong>{training.location}</strong>
                                  </div>
                                  <div className="training-venue">{training.venue}</div>
                                  <div className="training-id">ID: #{training.id}</div>
                                </div>
                              </td>
                              <td>
                                <div className="schedule-info">
                                  <div className="schedule-item">
                                    <FaCalendarAlt className="schedule-icon" />
                                    {training.date}
                                  </div>
                                  <div className="schedule-item">
                                    <FaClock className="schedule-icon" />
                                    {training.time}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="products-info">
                                  <span className="products-text">{training.products}</span>
                                </div>
                              </td>
                              <td>
                                <div className="participants-summary">
                                  <div className="participant-count">
                                    <FaUsers className="participants-icon" />
                                    {getParticipantCount(training)} Total
                                  </div>
                                  <div className="confirmed-count">
                                    <FaCheck className="confirmed-icon" />
                                    {getConfirmedCount(training)} Confirmed
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge ${training.status || 'pending'}`}>
                                  {training.status === 'done' ? 'Completed' : 
                                  training.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {training.status !== 'done' && training.status !== 'cancelled' && (
                                    <>
                                      <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => updateState({ 
                                          showCompleteDialog: true, 
                                          selectedTraining: training 
                                        })}
                                      >
                                        <FaCheck /> Complete
                                      </button>
                                      <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => updateState({ 
                                          showCancelDialog: true, 
                                          selectedTraining: training 
                                        })}
                                      >
                                        <FaTimes /> Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODALS */}
        
        {/* Training Completion Modal */}
        {state.showCompleteDialog && (
          <div className="modal-overlay">
            <div className="modal complete-modal">
              <div className="modal-header">
                <h3 className="modal-title">
                  <FaCheck className="modal-icon" />
                  Complete Training
                </h3>
                <button 
                  className="modal-close"
                  onClick={() => updateState({ 
                    showCompleteDialog: false, 
                    selectedTraining: null,
                    otpInput: '',
                    imageFile: null
                  })}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content">
                <div className="training-summary">
                  <h4>Training: {state.selectedTraining?.location}</h4>
                  <p><FaCalendarAlt /> {state.selectedTraining?.date} at {state.selectedTraining?.time}</p>
                  <p><FaMapMarkerAlt /> {state.selectedTraining?.venue}</p>
                </div>
                
                <div className="completion-form">
                  <div className="form-group">
                    <label className="form-label">
                      <FaKey className="form-icon" />
                      OTP Verification *
                    </label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder="Enter training completion OTP"
                      value={state.otpInput}
                      onChange={(e) => updateState({ otpInput: e.target.value })}
                      required
                    />
                    <small className="form-help">Enter the OTP provided to verify training completion</small>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">
                      <FaImage className="form-icon" />
                      Completion Photo
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="form-input"
                      onChange={(e) => updateState({ imageFile: e.target.files[0] })}
                    />
                    <small className="form-help">Upload a photo of the completed training session (optional)</small>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-success"
                  onClick={handleMarkDone}
                  disabled={state.submittingId === state.selectedTraining?.id || !state.otpInput.trim()}
                >
                  <FaUpload />
                  {state.submittingId === state.selectedTraining?.id ? 'Completing...' : 'Complete Training'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => updateState({ 
                    showCompleteDialog: false, 
                    selectedTraining: null,
                    otpInput: '',
                    imageFile: null
                  })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Participant Dialog */}
        {state.showConfirmDialog && (
          <div className="modal-overlay">
            <div className="modal confirm-modal">
              <div className="modal-header">
                <h3 className="modal-title">Confirm Participant</h3>
                <button 
                  className="modal-close"
                  onClick={() => updateState({ showConfirmDialog: false, selectedParticipant: null })}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content">
                <p>Are you sure you want to confirm <strong>{state.selectedParticipant?.name}</strong> as an agency?</p>
                <p className="modal-note">This action will create an agency account for this participant.</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-success"
                  onClick={handleConfirmParticipant}
                >
                  <FaCheck /> Confirm
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => updateState({ showConfirmDialog: false, selectedParticipant: null })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Training Dialog */}
        {state.showCancelDialog && (
          <div className="modal-overlay">
            <div className="modal cancel-modal">
              <div className="modal-header">
                <h3 className="modal-title">Cancel Training</h3>
                <button 
                  className="modal-close"
                  onClick={() => updateState({ 
                    showCancelDialog: false, 
                    selectedTraining: null, 
                    cancelReason: '' 
                  })}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content">
                <p>Are you sure you want to cancel the training at <strong>{state.selectedTraining?.location}</strong> on <strong>{state.selectedTraining?.date}</strong>?</p>
                <div className="form-group">
                  <label className="form-label">Reason for Cancellation *</label>
                  <textarea 
                    className="form-textarea"
                    rows={4}
                    placeholder="Please provide a detailed reason for cancellation..."
                    value={state.cancelReason}
                    onChange={(e) => updateState({ cancelReason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-danger"
                  onClick={handleCancelTraining}
                  disabled={!state.cancelReason.trim() || state.cancellingId === state.selectedTraining?.id}
                >
                  <FaTimes />
                  {state.cancellingId === state.selectedTraining?.id ? 'Cancelling...' : 'Cancel Training'}
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => updateState({ 
                    showCancelDialog: false, 
                    selectedTraining: null, 
                    cancelReason: '' 
                  })}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TrainerDashboard;
