// TrainerDashboard.js - PROFESSIONAL COMPACT CARD DESIGN
import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { auth } from '../../firebase/config';
import { 
  FaTachometerAlt, FaUsers, FaChalkboardTeacher, FaUserCheck, FaTrophy, FaCalendarAlt, FaClock, FaArrowRight, FaSpinner, FaExclamationTriangle,
  FaMapMarkerAlt, FaBoxOpen, FaArrowLeft, FaCheck, FaTimes,
  FaChevronLeft, FaChevronRight, FaUserTie, FaUserFriends,
  FaMobile, FaLock, FaImage, FaCheckCircle, FaCog, FaStar, FaRegClock, FaDotCircle,
  FaPlay, F
} from 'react-icons/fa';

const TrainerDashboard = () => {
  const [trainings, setTrainings] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [confirmedUsers, setConfirmedUsers] = useState(0);
  const [pendingParticipants, setPendingParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [allTrainers, setAllTrainers] = useState({});
  const [showAllTrainings, setShowAllTrainings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Training Completion States
  const [completionModal, setCompletionModal] = useState({
    isOpen: false,
    training: null,
    step: 'initial',
    otp: '',
    captchaImage: null,
    captchaText: '',
    captchaInput: '',
    isProcessing: false
  });

  const trainingsPerPage = 6; // Show more cards per page

  useEffect(() => {
    const checkTrainerAuth = () => {
      const storedTrainer = localStorage.getItem('htamsTrainer');
      
      if (!storedTrainer) {
        setError('Trainer not authenticated. Please log in again.');
        setLoading(false);
        return null;
      }

      try {
        const trainer = JSON.parse(storedTrainer);
        setTrainerInfo(trainer);
        return trainer;
      } catch (err) {
        setError('Invalid trainer session. Please log in again.');
        setLoading(false);
        return null;
      }
    };

    const currentTrainer = checkTrainerAuth();
    if (!currentTrainer) return;

    const db = getDatabase();
    const trainerId = currentTrainer.trainerId;

    // Fetch all trainers data
    const trainersRef = ref(db, 'HTAMS/company/trainers');
    const trainersUnsubscribe = onValue(trainersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAllTrainers(data);
      }
    });

    // Fetch trainings with enhanced sorting
    const trainingsRef = ref(db, 'HTAMS/company/trainings');
    const trainingsUnsubscribe = onValue(trainingsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        
        if (data) {
          const assignedTrainings = Object.entries(data)
            .filter(([, training]) => {
              return training.trainerId === trainerId || 
                     training.coTrainerId === trainerId ||
                     (training.coTrainers && training.coTrainers.includes(trainerId));
            })
            .map(([id, training]) => ({
              id,
              ...training,
              userRole: training.trainerId === trainerId ? 'primary' : 'co-trainer',
              parsedStartDate: training.startDate ? new Date(training.startDate) : new Date(),
              parsedCreatedAt: training.createdAt ? new Date(training.createdAt) : new Date(),
              isRecent: training.startDate ? 
                (new Date(training.startDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) : false,
              statusPriority: training.status === 'completed' ? 3 : 
                            training.status === 'cancelled' ? 2 : 1
            }))
            .sort((a, b) => {
              if (a.statusPriority !== b.statusPriority) {
                return a.statusPriority - b.statusPriority;
              }
              
              if (a.statusPriority === 1) {
                return b.parsedStartDate - a.parsedStartDate;
              } else {
                return a.parsedStartDate - b.parsedStartDate;
              }
            });

          setTrainings(assignedTrainings);

          // Calculate statistics
          let totalParticipantCount = 0;
          let confirmedCount = 0;
          let pendingCount = 0;

          assignedTrainings.forEach((training) => {
            if (training.participants) {
              const participants = Object.values(training.participants);
              totalParticipantCount += participants.length;
              
              participants.forEach(participant => {
                if (participant.status === 'confirmed' || participant.confirmedByTrainer) {
                  confirmedCount++;
                } else if (!participant.status || participant.status === 'pending' || participant.status === 'joined') {
                  pendingCount++;
                }
              });
            }
          });

          setTotalParticipants(totalParticipantCount);
          setConfirmedUsers(confirmedCount);
          setPendingParticipants(pendingCount);
        } else {
          setTrainings([]);
          setTotalParticipants(0);
          setConfirmedUsers(0);
          setPendingParticipants(0);
        }
        setError(null);
      } catch (err) {
        console.error('Error processing trainings:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      trainingsUnsubscribe();
      trainersUnsubscribe();
    };
  }, []);

  // Generate CAPTCHA Image (same as before)
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f0f8ff';
    ctx.fillRect(0, 0, 200, 80);
    
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 200, Math.random() * 80);
      ctx.lineTo(Math.random() * 200, Math.random() * 80);
      ctx.stroke();
    }
    
    ctx.font = '30px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(captcha, 100, 50);
    
    return {
      image: canvas.toDataURL(),
      text: captcha
    };
  };

  // Training completion functions (same as before)
  const sendOTP = async (training) => {
    try {
      setCompletionModal(prev => ({ ...prev, isProcessing: true }));
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem(`training_otp_${training.id}`, otp);
      sessionStorage.setItem(`training_otp_time_${training.id}`, Date.now().toString());
      
      const trainerPhone = trainerInfo.phone;
      const message = encodeURIComponent(
        `[ONDO Training] Your OTP for completing training "${training.location}" is: ${otp}. Valid for 5 minutes only. Do not share this OTP.`
      );
      
      const whatsappUrl = `https://webhook.whatapi.in/webhook/68ccf7cfbde42bbd9077346e?number=${trainerPhone}&message=${message}`;
      await fetch(whatsappUrl);
      
      setCompletionModal(prev => ({
        ...prev,
        step: 'otp',
        isProcessing: false
      }));
      
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Please try again.');
      setCompletionModal(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const verifyOTP = () => {
    const storedOTP = sessionStorage.getItem(`training_otp_${completionModal.training.id}`);
    const otpTime = sessionStorage.getItem(`training_otp_time_${completionModal.training.id}`);
    
    if (otpTime && (Date.now() - parseInt(otpTime)) > 300000) {
      alert('OTP has expired. Please request a new OTP.');
      sessionStorage.removeItem(`training_otp_${completionModal.training.id}`);
      sessionStorage.removeItem(`training_otp_time_${completionModal.training.id}`);
      setCompletionModal(prev => ({ ...prev, step: 'initial', otp: '' }));
      return;
    }
    
    if (completionModal.otp === storedOTP) {
      const captcha = generateCaptcha();
      setCompletionModal(prev => ({
        ...prev,
        step: 'captcha',
        captchaImage: captcha.image,
        captchaText: captcha.text,
        captchaInput: ''
      }));
    } else {
      alert('Invalid OTP. Please check and try again.');
    }
  };

  const completeTraining = async () => {
    if (completionModal.captchaInput?.toLowerCase() !== completionModal.captchaText?.toLowerCase()) {
      alert('Invalid CAPTCHA. Please try again.');
      const captcha = generateCaptcha();
      setCompletionModal(prev => ({
        ...prev,
        captchaImage: captcha.image,
        captchaText: captcha.text,
        captchaInput: ''
      }));
      return;
    }

    try {
      setCompletionModal(prev => ({ ...prev, step: 'completing', isProcessing: true }));
      
      const db = getDatabase();
      const training = completionModal.training;
      
      let allConfirmed = true;
      let confirmedCount = 0;
      let totalCount = 0;
      
      if (training.participants) {
        const participants = Object.values(training.participants);
        totalCount = participants.length;
        
        participants.forEach(participant => {
          if (participant.status === 'confirmed' || participant.confirmedByTrainer) {
            confirmedCount++;
          } else {
            allConfirmed = false;
          }
        });
      }
      
      if (!allConfirmed && totalCount > 0) {
        alert(`Cannot complete training. Only ${confirmedCount} out of ${totalCount} participants are confirmed. Please confirm all participants first.`);
        setCompletionModal({ 
          isOpen: false, 
          training: null, 
          step: 'initial', 
          otp: '', 
          captchaImage: null, 
          captchaText: '', 
          captchaInput: '',
          isProcessing: false 
        });
        return;
      }
      
      await update(ref(db, `HTAMS/company/trainings/${training.id}`), {
        status: 'completed',
        completedAt: new Date().toISOString(),
        completedBy: trainerInfo.trainerId,
        completionMethod: 'trainer_verification',
        participantsConfirmed: confirmedCount,
        totalParticipants: totalCount,
        completionVerified: true
      });
      
      sessionStorage.removeItem(`training_otp_${training.id}`);
      sessionStorage.removeItem(`training_otp_time_${training.id}`);
      
      alert(`✅ Training "${training.location}" has been successfully completed!\n\n📊 Summary:\n• ${confirmedCount} participants confirmed\n• Training completed by: ${trainerInfo.name}\n• Completion time: ${new Date().toLocaleString('en-IN')}`);
      
      setCompletionModal({ 
        isOpen: false, 
        training: null, 
        step: 'initial', 
        otp: '', 
        captchaImage: null, 
        captchaText: '', 
        captchaInput: '',
        isProcessing: false 
      });
      
    } catch (error) {
      console.error('Error completing training:', error);
      alert('Failed to complete training. Please try again.');
      setCompletionModal(prev => ({ ...prev, isProcessing: false, step: 'captcha' }));
    }
  };

  const handleCompleteTraining = (training) => {
    if (!training.participants || Object.keys(training.participants).length === 0) {
      alert('Cannot complete training. No participants found.');
      return;
    }
    
    const participants = Object.values(training.participants);
    const confirmedCount = participants.filter(p => p.status === 'confirmed' || p.confirmedByTrainer).length;
    
    if (confirmedCount < participants.length) {
      alert(`Warning: Only ${confirmedCount} out of ${participants.length} participants are confirmed.\n\nPlease confirm all participants before completing the training.`);
      return;
    }
    
    setCompletionModal({
      isOpen: true,
      training: training,
      step: 'initial',
      otp: '',
      captchaImage: null,
      captchaText: '',
      captchaInput: '',
      isProcessing: false
    });
  };

  // Helper functions
  const getTrainerName = (trainerId) => {
    if (!trainerId || !allTrainers[trainerId]) return 'Unknown Trainer';
    return allTrainers[trainerId].name || 'Unknown Trainer';
  };

  const getFilteredTrainings = () => {
    if (roleFilter === 'all') return trainings;
    return trainings.filter(training => training.userRole === roleFilter);
  };

  const getTrainingStatus = (training) => {
    if (training.status) {
      return training.status;
    }
    
    if (!training.startDate) return 'draft';
    
    const startDate = new Date(training.startDate);
    const endDate = training.endDate ? new Date(training.endDate) : null;
    const today = new Date();

    if (startDate > today) return 'upcoming';
    if (endDate && endDate < today) return 'completed';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#3b82f6';
      case 'upcoming': return '#f59e0b';
      case 'active': case 'ongoing': return '#10b981';
      case 'completed': return '#6b7280';
      case 'draft': return '#6366f1';
      default: return '#3b82f6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <FaClock />;
      case 'upcoming': return <FaClock />;
      case 'active': case 'ongoing': return <FaPlay />;
      case 'completed': return <FaTrophy />;
      default: return <FaDotCircle />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // const getRelativeTime = (dateString) => {
  //   if (!dateString) return '';
  //   const date = new Date(dateString);
  //   const now = new Date();
  //   const diffMs = now - date;
  //   const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
  //   if (diffDays === 0) return 'Today';
  //   if (diffDays === 1) return 'Yesterday';
  //   if (diffDays < 7) return `${diffDays} days ago`;
  //   if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  //   if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  //   return `${Math.floor(diffDays / 365)} years ago`;
  // };

  const groupTrainingsByStatus = (trainings) => {
    const active = trainings.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
    const completed = trainings.filter(t => t.status === 'completed' || t.status === 'cancelled');
    
    return { active, completed };
  };

  const filteredTrainings = getFilteredTrainings();
  const { active: activeTrainings, completed: completedTrainings } = groupTrainingsByStatus(filteredTrainings);
  
  const totalPages = Math.ceil(filteredTrainings.length / trainingsPerPage);
  const startIndex = (currentPage - 1) * trainingsPerPage;
  const endIndex = startIndex + trainingsPerPage;
  
  const currentTrainings = showAllTrainings 
    ? [...activeTrainings, ...completedTrainings].slice(startIndex, endIndex)
    : [...activeTrainings.slice(0, 4), ...completedTrainings.slice(0, 2)];

  const handleViewAll = () => {
    setShowAllTrainings(true);
    setCurrentPage(1);
  };

  const handleBackToOverview = () => {
    setShowAllTrainings(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRoleFilterChange = (role) => {
    setRoleFilter(role);
    setCurrentPage(1);
    if (showAllTrainings) {
      setShowAllTrainings(false);
    }
  };

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
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Loading trainer dashboard...</p>
        </div>
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
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <FaExclamationTriangle style={{ fontSize: '2rem', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 1rem 0' }}>Error Loading Dashboard</h3>
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

  return (
    <div className="trainer-dashboard-container">
      {/* Compact Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="profile-section">
            <div className="profile-avatar">
              {trainerInfo?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="profile-details">
              <h1>Hi, {trainerInfo?.name?.split(' ')[0] || 'Trainer'}!</h1>
              <p>Training Dashboard</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="header-stat">
              <span className="stat-number">{activeTrainings.length}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="header-stat">
              <span className="stat-number">{completedTrainings.length}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card primary">
          <div className="stat-icon">
            <FaChalkboardTeacher />
          </div>
          <div className="stat-content">
            <div className="stat-value">{trainings.length}</div>
            <div className="stat-text">Total Sessions</div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalParticipants}</div>
            <div className="stat-text">Students</div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <FaUserCheck />
          </div>
          <div className="stat-content">
            <div className="stat-value">{confirmedUsers}</div>
            <div className="stat-text">Confirmed</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <FaTrophy />
          </div>
          <div className="stat-content">
            <div className="stat-value">{completedTrainings.length}</div>
            <div className="stat-text">Completed</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${roleFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleRoleFilterChange('all')}
        >
          <FaUsers className="tab-icon" />
          All Sessions ({trainings.length})
        </button>
        <button 
          className={`filter-tab ${roleFilter === 'primary' ? 'active' : ''}`}
          onClick={() => handleRoleFilterChange('primary')}
        >
          <FaUserTie className="tab-icon" />
          Primary Trainer ({trainings.filter(t => t.userRole === 'primary').length})
        </button>
        <button 
          className={`filter-tab ${roleFilter === 'co-trainer' ? 'active' : ''}`}
          onClick={() => handleRoleFilterChange('co-trainer')}
        >
          <FaUserFriends className="tab-icon" />
          Co-Trainer ({trainings.filter(t => t.userRole === 'co-trainer').length})
        </button>
      </div>

      {/* My Sessions */}
      <div className="sessions-container">
        <div className="sessions-header">
          <div className="sessions-title">
            <FaTachometerAlt className="title-icon" />
            <h2>{showAllTrainings ? `All Sessions (${filteredTrainings.length})` : 'My Sessions'}</h2>
            <div className="timeline-badge">
              <FaRegClock /> Newest First
            </div>
          </div>
          
          <div className="sessions-actions">
            {showAllTrainings ? (
              <button className="action-btn secondary" onClick={handleBackToOverview}>
                <FaArrowLeft /> Back to Overview
              </button>
            ) : (
              filteredTrainings.length > 6 && (
                <button className="action-btn primary" onClick={handleViewAll}>
                  View All ({filteredTrainings.length})
                </button>
              )
            )}
          </div>
        </div>

        {filteredTrainings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaChalkboardTeacher />
            </div>
            <h3>No Training Sessions</h3>
            <p>
              {trainings.length === 0 
                ? "You haven't been assigned any training sessions yet." 
                : "No sessions match your current filter selection."
              }
            </p>
          </div>
        ) : (
          <>
            {/* Professional Training Cards Grid */}
            <div className="training-cards-grid">
              {currentTrainings.map((training) => {
                const status = getTrainingStatus(training);
                const statusColor = getStatusColor(status);
                const participantCount = training.participants ? Object.keys(training.participants).length : 0;
                const confirmedCount = training.participants ? 
                  Object.values(training.participants).filter(p => p.status === 'confirmed' || p.confirmedByTrainer).length : 0;

                return (
                  <div key={training.id} className={`training-card ${status} ${training.isRecent ? 'recent' : ''}`}>
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="card-status">
                        <div className="status-indicator" style={{ backgroundColor: statusColor }}>
                          {getStatusIcon(status)}
                        </div>
                        <span className="status-text" style={{ color: statusColor }}>
                          {status?.charAt(0)?.toUpperCase() + status?.slice(1)}
                        </span>
                      </div>
                      
                      <div className="card-badges">
                        {training.isRecent && (
                          <div className="recent-badge">
                            <FaStar /> Recent
                          </div>
                        )}
                        <div className={`role-badge ${training.userRole}`}>
                          {training.userRole === 'primary' ? <FaUserTie /> : <FaUserFriends />}
                          {training.userRole === 'primary' ? 'Primary' : 'Co-Trainer'}
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="card-body">
                      <div className="training-header">
                        <h3 className="training-title">
                          {training.location || `Training Session ${training.id?.slice(-4)}`}
                        </h3>
                        <div className="training-meta">
                          <div className="meta-item">
                            <FaCalendarAlt className="meta-icon" />
                            <span>{formatDate(training.startDate)}</span>
                          </div>
                          <div className="meta-item">
                            <FaClock className="meta-icon" />
                            <span>{training.time || 'TBD'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="training-details">
                        <div className="detail-item">
                          <FaMapMarkerAlt className="detail-icon" />
                          <span className="detail-text">{training.venue || training.location || 'Venue TBD'}</span>
                        </div>
                        
                        <div className="detail-item">
                          <FaUsers className="detail-icon" />
                          <span className="detail-text">
                            {participantCount} participants • {confirmedCount} confirmed
                          </span>
                        </div>

                        {training.products && (
                          <div className="detail-item">
                            <FaBoxOpen className="detail-icon" />
                            <span className="detail-text">
                              {training.products.length > 20 ? 
                                `${training.products.slice(0, 20)}...` : 
                                training.products
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {participantCount > 0 && (
                        <div className="progress-container">
                          <div className="progress-header">
                            <span className="progress-label">Confirmation Progress</span>
                            <span className="progress-value">
                              {Math.round((confirmedCount / participantCount) * 100)}%
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ 
                                width: `${(confirmedCount / participantCount) * 100}%`,
                                backgroundColor: confirmedCount === participantCount ? '#10b981' : '#3b82f6'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="card-footer">
                      {training.status === 'completed' ? (
                        <div className="completed-info">
                          <div className="completed-badge">
                            <FaTrophy className="completed-icon" />
                            <div className="completed-details">
                              <span className="completed-title">Training Completed</span>
                              <span className="completed-date">{formatDate(training.completedAt)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="card-actions">
                          <button 
                            className="complete-btn"
                            onClick={() => handleCompleteTraining(training)}
                            disabled={participantCount === 0 || confirmedCount < participantCount}
                            title={
                              participantCount === 0 ? 'No participants to complete training' :
                              confirmedCount < participantCount ? `${participantCount - confirmedCount} participants need confirmation` :
                              'Complete this training session'
                            }
                          >
                            <FaCheckCircle className="btn-icon" />
                            <span className="btn-text">
                              {confirmedCount === participantCount ? 'Complete Training' : 
                               `${participantCount - confirmedCount} Pending`}
                            </span>
                          </button>
                          
                          <div className="action-indicators">
                            <div className="participants-indicator">
                              <FaUsers />
                              <span>{participantCount}</span>
                            </div>
                            <div className="confirmed-indicator">
                              <FaCheck />
                              <span>{confirmedCount}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Trainer Info Footer */}
                    <div className="trainer-info">
                      <div className="trainer-item">
                        <FaUserTie className="trainer-icon" />
                        <span>Primary: {getTrainerName(training.trainerId)}</span>
                      </div>
                      {training.coTrainerId && (
                        <div className="trainer-item">
                          <FaUserFriends className="trainer-icon" />
                          <span>Co-Trainer: {getTrainerName(training.coTrainerId)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {showAllTrainings && totalPages > 1 && (
              <div className="pagination-container">
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FaChevronLeft />
                </button>
                
                <div className="pagination-info">
                  <span>Page {currentPage} of {totalPages}</span>
                  <span className="pagination-summary">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredTrainings.length)} of {filteredTrainings.length} sessions
                  </span>
                </div>
                
                <button 
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}

            {/* Show More */}
            {!showAllTrainings && filteredTrainings.length > 6 && (
              <div className="show-more-container">
                <div className="show-more-content">
                  <p className="show-more-text">
                    Showing {Math.min(6, filteredTrainings.length)} of {filteredTrainings.length} training sessions
                  </p>
                  <button className="show-more-btn" onClick={handleViewAll}>
                    <FaArrowRight className="show-more-icon" />
                    View All Sessions
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Completion Modal (keeping the same as before but updating styles) */}
      {completionModal.isOpen && (
        <div className="modal-overlay">
          <div className="completion-modal">
            <div className="modal-header">
              <h3>
                <FaCheckCircle style={{ marginRight: '0.5rem', color: '#10b981' }} />
                Complete Training Session
              </h3>
              <button 
                className="close-modal-btn"
                onClick={() => setCompletionModal({ 
                  isOpen: false, 
                  training: null, 
                  step: 'initial', 
                  otp: '', 
                  captchaImage: null, 
                  captchaText: '', 
                  captchaInput: '',
                  isProcessing: false 
                })}
                disabled={completionModal.isProcessing}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              {completionModal.step === 'initial' && (
                <div className="modal-step">
                  <div className="training-summary">
                    <h4>{completionModal.training?.location}</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <FaCalendarAlt />
                        <span>{formatDate(completionModal.training?.startDate)}</span>
                      </div>
                      <div className="summary-item">
                        <FaUsers />
                        <span>{completionModal.training?.participants ? Object.keys(completionModal.training.participants).length : 0} Participants</span>
                      </div>
                      <div className="summary-item">
                        <FaUserCheck />
                        <span>{completionModal.training?.participants ? 
                          Object.values(completionModal.training.participants).filter(p => p.status === 'confirmed' || p.confirmedByTrainer).length : 0} Confirmed</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="verification-notice">
                    <FaMobile className="notice-icon" />
                    <div className="notice-content">
                      <h4>Mobile Verification Required</h4>
                      <p>An OTP will be sent to your registered mobile: <strong>{trainerInfo?.phone}</strong></p>
                    </div>
                  </div>
                  
                  <button 
                    className="modal-action-btn primary"
                    onClick={() => sendOTP(completionModal.training)}
                    disabled={completionModal.isProcessing}
                  >
                    {completionModal.isProcessing ? (
                      <>
                        <FaSpinner className="spinning" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <FaMobile />
                        Send OTP to {trainerInfo?.phone}
                      </>
                    )}
                  </button>
                </div>
              )}

              {completionModal.step === 'otp' && (
                <div className="modal-step">
                  <div className="step-header">
                    <FaLock className="step-icon" />
                    <h4>Enter Verification Code</h4>
                    <p>Please enter the 6-digit OTP sent to {trainerInfo?.phone}</p>
                  </div>
                  
                  <div className="otp-input-group">
                    <input
                      type="text"
                      className="otp-input-field"
                      placeholder="Enter 6-digit OTP"
                      value={completionModal.otp}
                      onChange={(e) => setCompletionModal(prev => ({ 
                        ...prev, 
                        otp: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) 
                      }))}
                      maxLength="6"
                      autoFocus
                    />
                  </div>
                  
                  <div className="modal-actions">
                    <button 
                      className="modal-action-btn success"
                      onClick={verifyOTP}
                      disabled={completionModal.otp.length !== 6}
                    >
                      <FaCheck />
                      Verify OTP
                    </button>
                    
                    <button 
                      className="modal-action-btn secondary"
                      onClick={() => sendOTP(completionModal.training)}
                      disabled={completionModal.isProcessing}
                    >
                      <FaCog />
                      {completionModal.isProcessing ? 'Sending...' : 'Resend OTP'}
                    </button>
                  </div>
                </div>
              )}

              {completionModal.step === 'captcha' && (
                <div className="modal-step">
                  <div className="step-header">
                    <FaImage className="step-icon" />
                    <h4>Security Verification</h4>
                    <p>Please enter the text shown in the image below</p>
                  </div>
                  
                  <div className="captcha-group">
                    <div className="captcha-display">
                      <img 
                        src={completionModal.captchaImage} 
                        alt="CAPTCHA" 
                        className="captcha-image"
                      />
                      <button 
                        className="captcha-refresh"
                        onClick={() => {
                          const captcha = generateCaptcha();
                          setCompletionModal(prev => ({
                            ...prev,
                            captchaImage: captcha.image,
                            captchaText: captcha.text,
                            captchaInput: ''
                          }));
                        }}
                        title="Refresh CAPTCHA"
                      >
                        <FaCog />
                      </button>
                    </div>
                    
                    <input
                      type="text"
                      className="captcha-input-field"
                      placeholder="Enter CAPTCHA text"
                      value={completionModal.captchaInput || ''}
                      onChange={(e) => setCompletionModal(prev => ({ 
                        ...prev, 
                        captchaInput: e.target.value 
                      }))}
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    className="modal-action-btn success"
                    onClick={completeTraining}
                    disabled={!completionModal.captchaInput || completionModal.isProcessing}
                  >
                    <FaCheckCircle />
                    Complete Training Session
                  </button>
                </div>
              )}

              {completionModal.step === 'completing' && (
                <div className="modal-step completing-step">
                  <div className="completing-content">
                    <FaSpinner className="spinning large-spinner" />
                    <h4>Completing Training...</h4>
                    <p>Please wait while we finalize your training session.</p>
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Base Animations */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        .large-spinner {
          font-size: 2.5rem;
          color: #3b82f6;
        }

        /* Main Container */
        .trainer-dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem;
          padding-bottom: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* Dashboard Header */
        .dashboard-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 40px rgba(102, 126, 234, 0.15);
          position: relative;
          z-index: 10;
        }

        .header-content {
        display: grid;  
        grid-template-columns: 1fr 2fr;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .profile-avatar {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
          border: 3px solid rgba(255, 255, 255, 0.3);
        }

        .profile-details h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          color: white;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .profile-details p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .header-stats {
          display: flex;
          gap: 2rem;
        }

        .header-stat {
          text-align: center;
          color: white;
        }

        .stat-number {
          display: block;
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.9;
          font-weight: 500;
        }

        /* Stats Overview */
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
        }

        .stat-card.success::before {
          background: linear-gradient(90deg, #10b981, #047857);
        }

        .stat-card.info::before {
          background: linear-gradient(90deg, #8b5cf6, #7c3aed);
        }

        .stat-card.warning::before {
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          color: white;
          flex-shrink: 0;
        }

        .stat-card.primary .stat-icon {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .stat-card.success .stat-icon {
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
        }

        .stat-card.info .stat-icon {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .stat-card.warning .stat-icon {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
          line-height: 1;
        }

        .stat-text {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Filter Tabs */
        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: white;
          padding: 0.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          flex-wrap: wrap;
        }

        .filter-tab {
          background: transparent;
          border: none;
          color: #64748b;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
          min-width: 140px;
        }

        .filter-tab:hover {
          background: #f1f5f9;
          color: #3b82f6;
        }

        .filter-tab.active {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .tab-icon {
          font-size: 0.875rem;
        }

        /* Sessions Container */
        .sessions-container {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
        }

        .sessions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .sessions-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .title-icon {
          color: #3b82f6;
          font-size: 1.25rem;
        }

        .sessions-title h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .timeline-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f0f9ff;
          color: #0369a1;
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
          border: 1px solid #bae6fd;
        }

        .sessions-actions {
          display: flex;
          gap: 0.75rem;
        }

        .action-btn {
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }

        .action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }

        .action-btn.secondary {
          background: #f8fafc;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .action-btn.secondary:hover {
          background: #f1f5f9;
          color: #475569;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.3;
          color: #cbd5e1;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.75rem 0;
          color: #475569;
        }

        .empty-state p {
          font-size: 1rem;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto;
        }

        /* Professional Training Cards Grid */
        .training-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .training-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          animation: fadeInUp 0.5s ease-out;
        }

        .training-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border-color: #3b82f6;
        }

        .training-card.recent {
          border-left: 4px solid #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #ffffff 50%);
        }

        .training-card.completed {
          opacity: 0.85;
          background: linear-gradient(135deg, #f9fafb 0%, #ffffff 50%);
        }

        /* Card Header */
        .card-header {
          padding: 1.25rem 1.25rem 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .card-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.6rem;
          position: relative;
        }

        .status-indicator::before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: currentColor;
          opacity: 0.2;
          animation: pulse 2s ease-in-out infinite;
        }

        .status-text {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .recent-badge {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .role-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .role-badge.primary {
          background: #dbeafe;
          color: #1e40af;
        }

        .role-badge.co-trainer {
          background: #fef3c7;
          color: #92400e;
        }

        /* Card Body */
        .card-body {
          padding: 0 1.25rem 1.25rem;
        }

        .training-header {
          margin-bottom: 1rem;
        }

        .training-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.75rem 0;
          line-height: 1.3;
        }

        .training-meta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #64748b;
          background: #f8fafc;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .meta-icon {
          color: #3b82f6;
          font-size: 0.75rem;
        }

        .training-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #475569;
        }

        .detail-icon {
          color: #64748b;
          font-size: 0.875rem;
          width: 16px;
          flex-shrink: 0;
        }

        .detail-text {
          flex: 1;
          line-height: 1.4;
        }

        /* Progress Container */
        .progress-container {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          margin-bottom: 1rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .progress-label {
          color: #475569;
        }

        .progress-value {
          color: #1e293b;
          font-weight: 700;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
          position: relative;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 2s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Card Footer */
        .card-footer {
          padding: 0 1.25rem 1.25rem;
        }

        .completed-info {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid #d1d5db;
        }

        .completed-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .completed-icon {
          color: #f59e0b;
          font-size: 1.5rem;
        }

        .completed-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .completed-title {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .completed-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .complete-btn {
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          color: white;
          border: none;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          flex: 1;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.2);
        }

        .complete-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }

        .complete-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: #9ca3af;
          transform: none;
        }

        .btn-icon {
          font-size: 1rem;
        }

        .btn-text {
          font-weight: 600;
        }

        .action-indicators {
          display: flex;
          gap: 0.75rem;
        }

        .participants-indicator,
        .confirmed-indicator {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: #f1f5f9;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
        }

        .confirmed-indicator {
          background: #f0fdf4;
          color: #047857;
        }

        /* Trainer Info */
        .trainer-info {
          background: #f8fafc;
          padding: 0.875rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .trainer-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .trainer-icon {
          color: #3b82f6;
          font-size: 0.75rem;
          width: 12px;
        }

        /* Pagination */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .pagination-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 45px;
          height: 45px;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .pagination-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .pagination-btn:not(:disabled):hover {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .pagination-info {
          text-align: center;
          color: #64748b;
        }

        .pagination-info span:first-child {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          display: block;
          margin-bottom: 0.25rem;
        }

        .pagination-summary {
          font-size: 0.8rem;
        }

        /* Show More */
        .show-more-container {
          margin-top: 2rem;
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          border: 1px dashed #cbd5e1;
          text-align: center;
        }

        .show-more-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .show-more-text {
          color: #64748b;
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .show-more-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
        }

        .show-more-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }

        .show-more-icon {
          font-size: 0.8rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(8px);
          padding: 1rem;
          animation: fadeInUp 0.3s ease-out;
        }

        .completion-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.3s ease-out;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 20px 20px 0 0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          display: flex;
          align-items: center;
        }

        .close-modal-btn {
          background: #f3f4f6;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.75rem;
          border-radius: 10px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-modal-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .modal-body {
          padding: 2rem;
        }

        .modal-step {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          text-align: center;
        }

        .training-summary {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid #bae6fd;
        }

        .training-summary h4 {
          margin: 0 0 1rem 0;
          color: #0369a1;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.7);
          padding: 0.75rem;
          border-radius: 10px;
          font-size: 0.8rem;
          color: #0369a1;
          font-weight: 500;
        }

        .verification-notice {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: #fef3c7;
          padding: 1.25rem;
          border-radius: 16px;
          border: 1px solid #fcd34d;
          text-align: left;
        }

        .notice-icon {
          color: #d97706;
          font-size: 1.5rem;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }

        .notice-content h4 {
          margin: 0 0 0.5rem 0;
          color: #92400e;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .notice-content p {
          margin: 0;
          color: #92400e;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .modal-action-btn {
          border: none;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .modal-action-btn.primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }

        .modal-action-btn.success {
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          color: white;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }

        .modal-action-btn.secondary {
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .modal-action-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
        }

        .modal-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .step-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .step-icon {
          color: #3b82f6;
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .step-header h4 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .step-header p {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
          line-height: 1.5;
        }

        .otp-input-group,
        .captcha-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .otp-input-field {
          width: 250px;
          padding: 1rem;
          border: 2px solid #d1d5db;
          border-radius: 16px;
          font-size: 1.5rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: 0.5rem;
          transition: all 0.2s ease;
        }

        .otp-input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .captcha-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: #f8fafc;
          padding: 1rem;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
        }

        .captcha-image {
          border-radius: 12px;
          border: 2px solid #d1d5db;
        }

        .captcha-refresh {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          font-size: 1rem;
        }

        .captcha-refresh:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }

        .captcha-input-field {
          width: 280px;
          padding: 1rem;
          border: 2px solid #d1d5db;
          border-radius: 16px;
          font-size: 1.25rem;
          text-align: center;
          transition: all 0.2s ease;
        }

        .captcha-input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .completing-step {
          padding: 2rem;
        }

        .completing-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .completing-content h4 {
          margin: 0;
          color: #1f2937;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .completing-content p {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
        }

        .loading-dots {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .loading-dots span {
          width: 10px;
          height: 10px;
          background: #3b82f6;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: 0.5s;
        }

        .loading-dots span:nth-child(3) {
          animation-delay: 1s;
        }

        /* Mobile Responsive - Tablet & Phone */
        @media (max-width: 768px) {
          .trainer-dashboard-container {
            padding: 0.625rem;
            background: #f5f7fa;
          }

          .dashboard-header {
            padding: 1.125rem;
            border-radius: 18px;
            margin-bottom: 1rem;
          }

          .header-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
           
            flex-direction: column;
            text-align: center;
            gap: 0.875rem;
          }

          .profile-section {
            flex-direction: column;
            gap: 0.75rem;
          }

          .profile-avatar {
            width: 54px;
            height: 54px;
            font-size: 1.35rem;
          }

          .profile-details h1 {
            font-size: 1.35rem;
          }

          .profile-details p {
            font-size: 0.85rem;
          }

          .header-stats {
          margin-left: 6rem;
            justify-content: center;
            gap: 2rem;
            color: #fff;  
            width: 100%;
          }

          .stat-number {
            font-size: 1.65rem;
            color: #fff;
          }

          .stat-label {
            font-size: 0.75rem;
            color: #fff;
          }

          /* Native App Style - 2 Cards Per Row on Mobile */
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.625rem;
            margin-bottom: 1.25rem;
          }

          .stat-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 0.875rem 0.625rem;
            gap: 0.5rem;
            border-radius: 14px;
            border: none;
            border-left: 4px solid;
          }

          .stat-card::before {
            display: none;
          }

          .stat-card.primary {
            border-left-color: #3b82f6;
            background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
          }

          .stat-card.success {
            border-left-color: #10b981;
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
          }

          .stat-card.info {
            border-left-color: #8b5cf6;
            background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
          }

          .stat-card.warning {
            border-left-color: #f59e0b;
            background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
          }

          .stat-icon {
            width: 44px;
            height: 44px;
            font-size: 1.15rem;
            border-radius: 50%;
            margin-bottom: 0;
          }

          .stat-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
          }

          .stat-value {
            font-size: 1.65rem;
            margin-bottom: 0;
          }

          .stat-text {
            font-size: 0.75rem;
            text-align: center;
          }

          .filter-tabs {
            flex-direction: column;
            gap: 0.5rem;
          }

          .filter-tab {
            justify-content: flex-start;
            min-width: auto;
          }

          .sessions-container {
            padding: 1rem;
          }

          .sessions-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .sessions-title {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .sessions-title h2 {
            font-size: 1.25rem;
          }

          .training-cards-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .training-card {
            border-radius: 12px;
          }

          .card-header {
            padding: 1rem 1rem 0.5rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .card-badges {
            align-self: flex-start;
          }

          .card-body {
            padding: 0 1rem 1rem;
          }

          .training-title {
            font-size: 1.1rem;
          }

          .training-meta {
            gap: 0.5rem;
          }

          .card-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .action-indicators {
            justify-content: center;
          }

          .trainer-info {
            padding: 0.75rem 1rem;
          }

          .pagination-container {
            padding: 1rem;
            flex-direction: column;
            gap: 1rem;
          }

          .completion-modal {
            margin: 0.5rem;
            max-width: calc(100% - 1rem);
            border-radius: 16px;
          }

          .modal-body {
            padding: 1.5rem;
          }

          .otp-input-field {
            width: 200px;
            font-size: 1.25rem;
          }

          .captcha-input-field {
            width: 220px;
          }

          .summary-grid {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .verification-notice {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }
        }

        /* Ultra Compact Mobile - 320px to 380px */
        @media (max-width: 380px) {
          .trainer-dashboard-container {
            padding: 0.25rem;
            padding-bottom: 0.75rem;
            overflow-x: hidden;
            max-width: 100vw;
          }

          .dashboard-header {
            padding: 0.5rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            box-shadow: 0 2px 10px rgba(102, 126, 234, 0.1);
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .profile-section {
            gap: 0.375rem;
            width: 100%;
          }

          .profile-avatar {
            width: 36px;
            height: 36px;
            font-size: 0.95rem;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }

          .profile-details h1 {
            font-size: 0.875rem;
            margin-bottom: 0.0625rem;
            font-weight: 600;
          }

          .profile-details p {
            font-size: 0.625rem;
          }

          .header-stats {
            gap: 1rem;
            margin-top: 0;
            width: 100%;
            justify-content: flex-start;
          }

          .header-stat {
            text-align: left;
          }

          .stat-number {
            font-size: 1.15rem;
            font-weight: 700;
          }

          .stat-label {
            font-size: 0.6rem;
          }

          /* Ultra Compact Stats - 2 Cards Per Row */
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.3rem;
            margin-bottom: 0.5rem;
          }

          .stat-card {
            padding: 0.4rem 0.3rem;
            border-radius: 8px;
          }

          .stat-card::before {
            height: 3px;
          }

          .stat-icon {
            width: 28px;
            height: 28px;
            font-size: 0.75rem;
            margin-bottom: 0.2rem;
            border-radius: 8px;
          }

          .stat-value {
            font-size: 1.1rem;
            margin-bottom: 0.0625rem;
            font-weight: 700;
          }

          .stat-text {
            font-size: 0.6rem;
            line-height: 1.1;
          }

          /* Filter Tabs - Compact */
          .filter-tabs {
            gap: 0.2rem;
            margin-bottom: 0.4rem;
            flex-wrap: nowrap;
            padding: 0.3rem;
            border-radius: 6px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }

          .filter-tabs::-webkit-scrollbar {
            display: none;
          }

          .filter-tab {
            padding: 0.3rem 0.4rem;
            font-size: 0.625rem;
            border-radius: 5px;
            min-width: auto;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .filter-tab .tab-icon {
            font-size: 0.65rem;
            margin-right: 0.2rem;
          }

          /* Sessions Container */
          .sessions-container {
            padding: 0.5rem;
            border-radius: 8px;
            background: white;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
            overflow: hidden;
          }

          .sessions-header {
            margin-bottom: 0.5rem;
            gap: 0.375rem;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .sessions-title {
            display: flex;
            align-items: center;
            gap: 0.3rem;
          }

          .sessions-title .title-icon {
            font-size: 0.75rem;
          }

          .sessions-title h2 {
            font-size: 0.8rem;
            font-weight: 600;
            margin: 0;
          }

          .timeline-badge {
            display: none;
          }

          .view-toggle-btn {
            padding: 0.3rem 0.5rem;
            font-size: 0.625rem;
            border-radius: 5px;
            white-space: nowrap;
          }

          /* Training Cards - Ultra Compact */
          .training-cards-grid {
            grid-template-columns: 1fr;
            gap: 0.375rem;
          }

          .training-card {
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid rgba(0, 0, 0, 0.04);
          }

          .card-header {
            padding: 0.375rem 0.4rem 0.25rem;
            gap: 0.25rem;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
          }

          .card-badges {
            gap: 0.15rem;
            flex-wrap: wrap;
            display: flex;
          }

          .badge {
            padding: 0.15rem 0.3rem;
            font-size: 0.55rem;
            border-radius: 3px;
            font-weight: 600;
            line-height: 1;
          }

          .card-body {
            padding: 0 0.4rem 0.4rem;
          }

          .training-title {
            font-size: 0.75rem;
            margin-bottom: 0.3rem;
            line-height: 1.2;
            font-weight: 600;
          }

          .training-meta {
            gap: 0.25rem;
            margin-bottom: 0.3rem;
            flex-wrap: wrap;
            display: flex;
          }

          .meta-item {
            font-size: 0.575rem;
            gap: 0.15rem;
            display: flex;
            align-items: center;
          }

          .meta-item svg {
            font-size: 0.6rem;
            flex-shrink: 0;
          }

          /* Progress Section - Ultra Compact */
          .progress-container {
            padding: 0.3rem;
            border-radius: 5px;
            margin-bottom: 0.3rem;
            background: rgba(0, 0, 0, 0.015);
          }

          .progress-header {
            margin-bottom: 0.2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .progress-label {
            font-size: 0.6rem;
          }

          .progress-percentage {
            font-size: 0.65rem;
            font-weight: 700;
          }

          .progress-bar {
            height: 4px;
            border-radius: 2px;
          }

          /* Card Actions - Ultra Compact */
          .card-actions {
            gap: 0.3rem;
            flex-direction: row;
            flex-wrap: wrap;
            margin-top: 0.3rem;
          }

          .action-btn, .complete-btn {
            padding: 0.3rem 0.4rem;
            font-size: 0.6rem;
            border-radius: 4px;
            flex: 1;
            min-width: calc(50% - 0.15rem);
            font-weight: 600;
          }

          .action-btn svg, .complete-btn svg {
            font-size: 0.65rem;
            margin-right: 0.15rem;
          }

          /* Trainer Info - Ultra Compact */
          .trainer-info {
            padding: 0.3rem 0.4rem;
            border-radius: 5px;
            margin-top: 0.3rem;
            background: rgba(0, 0, 0, 0.025);
          }

          .trainer-item {
            font-size: 0.575rem;
            gap: 0.15rem;
            display: flex;
            align-items: center;
          }

          .trainer-item svg {
            font-size: 0.6rem;
            flex-shrink: 0;
          }

          /* Pagination */
          .pagination-container {
            padding: 0.5rem;
            gap: 0.375rem;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .pagination-info {
            font-size: 0.625rem;
          }

          .pagination-controls {
            gap: 0.25rem;
          }

          .page-btn {
            width: 28px;
            height: 28px;
            font-size: 0.675rem;
            border-radius: 5px;
          }

          /* Modal Adjustments */
          .completion-modal {
            margin: 0.5rem;
            max-width: calc(100% - 1rem);
            border-radius: 10px;
          }

          .modal-header {
            padding: 0.625rem;
          }

          .modal-header h3 {
            font-size: 0.875rem;
          }

          .modal-body {
            padding: 0.625rem;
          }

          .otp-input-field, .captcha-input-field {
            width: 100%;
            max-width: 160px;
            font-size: 0.875rem;
            padding: 0.5rem;
          }

          .modal-action-btn {
            padding: 0.5rem 0.75rem;
            font-size: 0.7rem;
          }

          .summary-grid {
            grid-template-columns: 1fr;
            gap: 0.3rem;
          }

          .summary-item {
            padding: 0.375rem;
            font-size: 0.625rem;
          }

          .training-summary h4 {
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
          }

          .verification-notice {
            padding: 0.5rem;
          }

          .verification-notice h4 {
            font-size: 0.8rem;
          }

          .verification-notice p {
            font-size: 0.65rem;
          }

          .notice-icon {
            font-size: 1.25rem;
          }
        }

        /* Extra Small Mobile - Keep 2 Cards Per Row */
        @media (min-width: 381px) and (max-width: 480px) {
          .trainer-dashboard-container {
            padding: 0.5rem;
          }

          .dashboard-header {
            padding: 1rem;
            border-radius: 16px;
          }

          .profile-avatar {
            width: 52px;
            height: 52px;
            font-size: 1.3rem;
          }

          .profile-details h1 {
            font-size: 1.25rem;
          }

          .profile-details p {
            font-size: 0.8rem;
          }

          .header-stats {
            gap: 2.5rem;
          }

          .stat-number {
            font-size: 1.75rem;
          }

          /* Keep 2 Cards Per Row - More Compact */
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .stat-card {
            padding: 0.75rem 0.5rem;
            border-radius: 12px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.05rem;
          }

          .stat-value {
            font-size: 1.5rem;
          }

          .stat-text {
            font-size: 0.7rem;
          }

          .sessions-title h2 {
            font-size: 1.125rem;
          }

          .timeline-badge {
            display: none;
          }

          .training-cards-grid {
            gap: 0.75rem;
          }

          .training-card {
            border-radius: 10px;
          }

          .card-header {
            padding: 0.75rem 0.75rem 0.5rem;
          }

          .card-body {
            padding: 0 0.75rem 0.75rem;
          }

          .training-title {
            font-size: 1rem;
          }

          .progress-container {
            padding: 0.75rem;
          }

          .complete-btn {
            padding: 0.75rem 1rem;
            font-size: 0.8rem;
          }

          .trainer-info {
            padding: 0.5rem 0.75rem;
          }

          .trainer-item {
            font-size: 0.7rem;
          }

          .otp-input-field {
            width: 180px;
            font-size: 1.125rem;
            letter-spacing: 0.25rem;
          }

          .captcha-input-field {
            width: 200px;
            font-size: 1.125rem;
          }

          .modal-action-btn {
            padding: 0.875rem 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainerDashboard;
