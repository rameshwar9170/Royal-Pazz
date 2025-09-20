import React, { useEffect, useState } from 'react';
import { ref, onValue, update, set, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { sendWelcomeMessage, generateUserId, formatDate } from '../services/whatsappService';
import { 
  FaTimes,
  FaCheck,
  FaUpload,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBars,
  FaKey,
  FaImage,
  FaWhatsapp
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// Import the new components
import TrainerSidebar from '../components/TrainerSidebar';
import TrainerProfile from './Trainer/TrainerProfile';
import TrainerTrainings from './Trainer/TrainerTrainings';

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

  // Placeholder functions for the handlers
  const handleConfirmParticipant = async () => {
    console.log('Confirm participant functionality would be implemented here');
    updateState({ showConfirmDialog: false, selectedParticipant: null });
  };

  const handleMarkDone = async () => {
    console.log('Mark done functionality would be implemented here');
    updateState({ showCompleteDialog: false, selectedTraining: null });
  };

  const handleCancelTraining = async () => {
    console.log('Cancel training functionality would be implemented here');
    updateState({ showCancelDialog: false, selectedTraining: null });
  };

  const getParticipantCount = (training) => {
    return training.participants ? Object.keys(training.participants).length : 0;
  };

  const getConfirmedCount = (training) => {
    if (!training.participants) return 0;
    return Object.values(training.participants).filter(p => p.confirmedByTrainer).length;
  };

  return (
    <div className="trainer-container">
      <style>
        {`
        .trainer-container {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .trainer-main {
          flex: 1;
          margin-left: 0;
          background: #f8fafc;
          min-height: 100vh;
          transition: margin-left 0.3s ease;
        }
        
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
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
        }
        
        .mobile-menu-toggle {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 0.75rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        
        .mobile-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .mobile-logo {
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(45deg, #60a5fa, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .mobile-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(45deg, #3b82f6, #1d4ed8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }
        
        .dashboard-header {
          background: white;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        
        .page-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0.25rem 0 0 0;
        }
        
        .trainer-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .trainer-avatar {
          width: 42px;
          height: 42px;
          background: linear-gradient(45deg, #3b82f6, #1d4ed8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1rem;
        }
        
        .trainer-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.95rem;
        }
        
        .trainer-role {
          color: #64748b;
          font-size: 0.8rem;
        }
        
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }
        
        .loading-spinner {
          width: 36px;
          height: 36px;
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
          text-align: center;
          padding: 2rem;
        }
        
        @media (min-width: 1024px) {
          .trainer-main {
            margin-left: 260px;
          }
        }
        
        @media (max-width: 1023px) {
          .mobile-header {
            display: flex;
          }
          
          .dashboard-header {
            display: none;
          }
          
          .trainer-main {
            padding-top: 70px;
          }
        }
        `}
      </style>

      {/* Sidebar */}
      <TrainerSidebar
        onLogout={handleLogout}
        setActiveTab={(tab) => updateState({ activeTab: tab })}
        activeTab={state.activeTab}
        isOpen={state.sidebarOpen}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
      />

      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header">
          <button className="mobile-menu-toggle" onClick={toggleSidebar}>
            <FaBars />
          </button>
          <div className="mobile-title">
            <span className="mobile-logo">HTAMS</span>
          </div>
          <div className="mobile-avatar">
            {state.trainerDetails.name ? state.trainerDetails.name.charAt(0).toUpperCase() : 'T'}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="trainer-main">
        {/* Desktop Header */}
        {!isMobile && (
          <div className="dashboard-header">
            <div>
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
            <div className="trainer-profile">
              <div className="trainer-avatar">
                {state.trainerDetails.name ? state.trainerDetails.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <div className="trainer-name">{state.trainerDetails.name || 'Trainer'}</div>
                <div className="trainer-role">Professional Trainer</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {state.loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Loading Dashboard</h3>
            <p>Please wait while we load your trainer information...</p>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="error-message">
            {state.error}
          </div>
        )}

        {/* Profile Tab */}
        {!state.loading && !state.error && state.activeTab === 'profile' && (
          <TrainerProfile trainerDetails={state.trainerDetails} />
        )}

        {/* Trainings Tab */}
        {!state.loading && !state.error && state.activeTab === 'trainings' && (
          <TrainerTrainings
            trainings={state.trainings}
            participants={state.participants}
            searchTerm={state.searchTerm}
            setSearchTerm={(term) => updateState({ searchTerm: term })}
            filterStatus={state.filterStatus}
            setFilterStatus={(status) => updateState({ filterStatus: status })}
            expandedTraining={state.expandedTraining}
            setExpandedTraining={(id) => updateState({ expandedTraining: id })}
            onCompleteTraining={(training) => updateState({ showCompleteDialog: true, selectedTraining: training })}
            onCancelTraining={(training) => updateState({ showCancelDialog: true, selectedTraining: training })}
            onConfirmParticipant={(participant) => updateState({ showConfirmDialog: true, selectedParticipant: participant })}
            getParticipantCount={getParticipantCount}
            getConfirmedCount={getConfirmedCount}
            isMobile={isMobile}
            whatsappLoading={state.whatsappLoading}
            confirmingParticipantId={state.confirmingParticipantId}
          />
        )}

        {/* Applied Users Tab - Simple placeholder for now */}
        {!state.loading && !state.error && state.activeTab === 'appliedUsers' && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h3>Applied Users</h3>
            <p>This section will show users who have applied for trainings.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default TrainerDashboard;
