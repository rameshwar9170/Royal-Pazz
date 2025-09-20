// src/pages/TrainerDashboard.js - Professional Card Design with Hover Effects
import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { auth } from '../../firebase/config';
import { 
  FaTachometerAlt, FaUsers, FaChalkboardTeacher, FaUserCheck,
  FaGraduationCap, FaTrophy, FaCalendarAlt, FaClock,
  FaEye, FaArrowRight, FaSpinner, FaExclamationTriangle,
  FaMapMarkerAlt, FaBoxOpen, FaArrowLeft,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';

const TrainerDashboard = () => {
  const [trainings, setTrainings] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [confirmedUsers, setConfirmedUsers] = useState(0);
  const [pendingParticipants, setPendingParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [showAllTrainings, setShowAllTrainings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const trainingsPerPage = 5;

  useEffect(() => {
    if (!auth.currentUser) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const trainerId = auth.currentUser.uid;

    // Fetch trainer information
    const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
    const trainerUnsubscribe = onValue(trainerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTrainerInfo(data);
      }
    });

    // Fetch trainer's assigned trainings
    const trainingsRef = ref(db, 'HTAMS/company/trainings');
    const trainingsUnsubscribe = onValue(trainingsRef, (snapshot) => {
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
              const dateA = typeof a.sortDate === 'number' ? a.sortDate : new Date(a.sortDate).getTime();
              const dateB = typeof b.sortDate === 'number' ? b.sortDate : new Date(b.sortDate).getTime();
              return dateB - dateA;
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
                if (participant.status === 'confirmed') {
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
        console.error('Error fetching trainer data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      setError('Failed to connect to database');
      setLoading(false);
    });

    return () => {
      trainingsUnsubscribe();
      trainerUnsubscribe();
    };
  }, []);

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
      case 'active': case 'ongoing': return <FaGraduationCap />;
      case 'completed': return <FaTrophy />;
      default: return <FaChalkboardTeacher />;
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

  // Pagination logic
  const totalPages = Math.ceil(trainings.length / trainingsPerPage);
  const startIndex = (currentPage - 1) * trainingsPerPage;
  const endIndex = startIndex + trainingsPerPage;
  const currentTrainings = showAllTrainings 
    ? trainings.slice(startIndex, endIndex)
    : trainings.slice(0, 5);

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
          <p style={{ margin: '0' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
      {/* Professional Welcome Header */}
      <div className="welcome-header-pro">
        <div className="welcome-content-pro">
          <div className="profile-section">
            <div className="profile-avatar-pro">
              {trainerInfo?.name?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <div className="profile-text">
              <h1>Welcome Back, {trainerInfo?.name || 'Trainer'}!</h1>
              <p>Training Management Dashboard</p>
            </div>
          </div>
          <div className="stats-mini">
            <div className="stat-mini">
              <span className="stat-number">{trainings.length}</span>
              <span className="stat-label">Trainings</span>
            </div>
            <div className="stat-mini">
              <span className="stat-number">{totalParticipants}</span>
              <span className="stat-label">Participants</span>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Statistics Cards */}
      <div className="stats-grid-pro">
        <div className="stat-card-pro blue-card">
          <div className="stat-icon-pro">
            <FaChalkboardTeacher />
          </div>
          <div className="stat-content-pro">
            <div className="stat-number-pro">{trainings.length}</div>
            <div className="stat-label-pro">Total Trainings</div>
          </div>
        </div>
        
        <div className="stat-card-pro green-card">
          <div className="stat-icon-pro">
            <FaUsers />
          </div>
          <div className="stat-content-pro">
            <div className="stat-number-pro">{totalParticipants}</div>
            <div className="stat-label-pro">Participants</div>
          </div>
        </div>

        <div className="stat-card-pro purple-card">
          <div className="stat-icon-pro">
            <FaUserCheck />
          </div>
          <div className="stat-content-pro">
            <div className="stat-number-pro">{confirmedUsers}</div>
            <div className="stat-label-pro">Confirmed</div>
          </div>
        </div>

        <div className="stat-card-pro amber-card">
          <div className="stat-icon-pro">
            <FaClock />
          </div>
          <div className="stat-content-pro">
            <div className="stat-number-pro">{pendingParticipants}</div>
            <div className="stat-label-pro">Pending</div>
          </div>
        </div>
      </div>

      {/* Professional Trainings Section */}
      <div className="trainings-section-pro">
        <div className="section-header-pro">
          <h2 className="section-title-pro">
            <FaTachometerAlt className="section-icon-pro" />
            {showAllTrainings ? `All Trainings (${trainings.length})` : 'Training Overview'}
          </h2>
          
          <div className="header-actions-pro">
            {showAllTrainings ? (
              <button className="btn-secondary-pro" onClick={handleBackToOverview}>
                <FaArrowLeft /> Back to Overview
              </button>
            ) : (
              trainings.length > 5 && (
                <button className="btn-primary-pro" onClick={handleViewAll}>
                  <FaEye /> View All ({trainings.length}) <FaArrowRight />
                </button>
              )
            )}
          </div>
        </div>
        
        {trainings.length === 0 ? (
          <div className="no-trainings-pro">
            <FaChalkboardTeacher className="no-trainings-icon-pro" />
            <h3>No Trainings Assigned Yet</h3>
            <p>Your assigned trainings will appear here once they are available.</p>
          </div>
        ) : (
          <>
            <div className="trainings-grid-pro">
              {currentTrainings.map((training) => {
                const status = getTrainingStatus(training);
                const statusColor = getStatusColor(status);
                const participantCount = training.participants ? Object.keys(training.participants).length : 0;
                const confirmedCount = training.participants ? 
                  Object.values(training.participants).filter(p => p.status === 'confirmed').length : 0;

                return (
                  <div key={training.id} className="training-card-pro">
                    {/* Card Header */}
                    <div className="card-header-pro">
                      <div className="trainer-info-pro">
                        <h3 className="trainer-name-pro">{training.trainerName || `Training ${training.id?.slice(-6)}`}</h3>
                        <span className="training-id-pro">ID: {training.id}</span>
                      </div>
                      
                      <div className="status-badge-pro" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                        {getStatusIcon(status)}
                        <span>{status?.toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Training Details */}
                    <div className="training-details-pro">
                      <div className="detail-item-pro">
                        <FaMapMarkerAlt className="detail-icon-pro location-icon" />
                        <span className="detail-text-pro">{training.location || 'Location not set'}</span>
                      </div>

                      <div className="detail-item-pro">
                        <FaCalendarAlt className="detail-icon-pro date-icon" />
                        <span className="detail-text-pro">{formatDate(training.startDate)}</span>
                      </div>

                      <div className="detail-item-pro">
                        <FaClock className="detail-icon-pro time-icon" />
                        <span className="detail-text-pro">{training.time || 'Time not set'} • {training.duration || 0} day(s)</span>
                      </div>

                      <div className="detail-item-pro">
                        <FaBoxOpen className="detail-icon-pro product-icon" />
                        <span className="detail-text-pro">
                          {training.products && training.products.length > 0 
                            ? training.products.slice(0, 2).join(', ') + (training.products.length > 2 ? '...' : '')
                            : 'No products'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Participants Section */}
                    <div className="participants-section-pro">
                      <div className="participants-info-pro">
                        <div className="participant-count-pro">
                          <FaUsers className="participants-icon-pro" />
                          <span>{participantCount} / {training.candidates || '∞'} participants</span>
                        </div>
                        <div className="confirmed-count-pro">
                          <span className="confirmed-number-pro">{confirmedCount} confirmed</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {participantCount > 0 && (
                        <div className="progress-container-pro">
                          <div className="progress-header-pro">
                            <span>Progress</span>
                            <span className="progress-percentage-pro">{Math.round((confirmedCount / participantCount) * 100)}%</span>
                          </div>
                          <div className="progress-bar-pro">
                            <div 
                              className="progress-fill-pro" 
                              style={{ width: `${(confirmedCount / participantCount) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Professional Pagination */}
            {showAllTrainings && totalPages > 1 && (
              <div className="pagination-pro">
                <button 
                  className="pagination-btn-pro"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FaChevronLeft />
                </button>
                
                <div className="pagination-center-pro">
                  <div className="pagination-pages-pro">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          className={`pagination-page-pro ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <span className="pagination-info-pro">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                
                <button 
                  className="pagination-btn-pro"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FaChevronRight />
                </button>
              </div>
            )}

            {/* More trainings for overview mode */}
            {!showAllTrainings && trainings.length > 5 && (
              <div className="more-trainings-pro">
                <p>And {(trainings.length - 5)} more training(s)...</p>
                <button className="btn-outline-pro" onClick={handleViewAll}>
                  View All Trainings <FaArrowRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        /* Spinner Animation */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Professional Welcome Header */
        .welcome-header-pro {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .welcome-content-pro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
        }
        .profile-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .profile-avatar-pro {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: bold;
          color: white;
          box-shadow: 0 4px 15px rgba(59,130,246,0.3);
        }
        .profile-text h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: white;
        }
        .profile-text p {
          font-size: 1rem;
          color: rgba(255,255,255,0.8);
          margin: 0;
        }
        .stats-mini {
          display: flex;
          gap: 2rem;
          color: white;
        }
        .stat-mini {
          text-align: center;
        }
        .stat-number {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }
        .stat-label {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        /* Professional Statistics Cards */
        .stats-grid-pro {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card-pro {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid #f1f5f9;
        }
        .stat-card-pro:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }
        .blue-card:hover { box-shadow: 0 12px 30px rgba(59,130,246,0.2); }
        .green-card:hover { box-shadow: 0 12px 30px rgba(16,185,129,0.2); }
        .purple-card:hover { box-shadow: 0 12px 30px rgba(139,92,246,0.2); }
        .amber-card:hover { box-shadow: 0 12px 30px rgba(245,158,11,0.2); }
        .stat-icon-pro {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
        }
        .blue-card .stat-icon-pro { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }
        .green-card .stat-icon-pro { background: linear-gradient(135deg, #10b981 0%, #047857 100%); }
        .purple-card .stat-icon-pro { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .amber-card .stat-icon-pro { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .stat-content-pro {
          flex: 1;
        }
        .stat-number-pro {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        .stat-label-pro {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Professional Trainings Section */
        .trainings-section-pro {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          border: 1px solid #f1f5f9;
        }
        .section-header-pro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .section-title-pro {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .section-icon-pro {
          color: #3b82f6;
        }
        .header-actions-pro {
          display: flex;
          gap: 1rem;
        }
        .btn-primary-pro, .btn-secondary-pro, .btn-outline-pro {
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 0.875rem;
        }
        .btn-primary-pro {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(59,130,246,0.3);
        }
        .btn-primary-pro:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.4);
        }
        .btn-secondary-pro {
          background: linear-gradient(135deg, #64748b 0%, #475569 100%);
          color: white;
        }
        .btn-secondary-pro:hover {
          transform: translateY(-2px);
        }
        .btn-outline-pro {
          background: transparent;
          border: 2px solid #3b82f6;
          color: #3b82f6;
        }
        .btn-outline-pro:hover {
          background: #3b82f6;
          color: white;
          transform: translateY(-2px);
        }

        /* No Trainings */
        .no-trainings-pro {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }
        .no-trainings-icon-pro {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          opacity: 0.3;
        }
        .no-trainings-pro h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
          color: #334155;
        }
        .no-trainings-pro p {
          font-size: 1rem;
          line-height: 1.6;
          max-width: 400px;
          margin: 0 auto;
        }

        /* Professional Training Cards */
        .trainings-grid-pro {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .training-card-pro {
          background: #fafbfc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .training-card-pro:hover {
          background: white;
          border-color: #3b82f6;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        /* Card Header */
        .card-header-pro {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }
        .trainer-name-pro {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
        }
        .training-id-pro {
          font-size: 0.75rem;
          color: #64748b;
          font-family: monospace;
          background: #f1f5f9;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }
        .status-badge-pro {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        /* Training Details */
        .training-details-pro {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .detail-item-pro {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .detail-item-pro:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .detail-icon-pro {
          width: 16px;
          height: 16px;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .location-icon { color: #f59e0b; }
        .date-icon { color: #3b82f6; }
        .time-icon { color: #8b5cf6; }
        .product-icon { color: #ef4444; }
        .detail-text-pro {
          font-size: 0.875rem;
          color: #475569;
          font-weight: 500;
        }

        /* Participants Section */
        .participants-section-pro {
          border-top: 1px solid #e2e8f0;
          padding-top: 1rem;
        }
        .participants-info-pro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .participant-count-pro {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #475569;
          font-weight: 500;
        }
        .participants-icon-pro {
          color: #06b6d4;
        }
        .confirmed-count-pro {
          font-size: 0.875rem;
          font-weight: 600;
        }
        .confirmed-number-pro {
          color: #10b981;
        }

        /* Progress Container */
        .progress-container-pro {
          margin-top: 1rem;
        }
        .progress-header-pro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #475569;
        }
        .progress-percentage-pro {
          color: #10b981;
          font-weight: 600;
        }
        .progress-bar-pro {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill-pro {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #047857 100%);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        /* Professional Pagination */
        .pagination-pro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .pagination-btn-pro {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          transition: all 0.3s ease;
        }
        .pagination-btn-pro:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }
        .pagination-btn-pro:not(:disabled):hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }
        .pagination-center-pro {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .pagination-pages-pro {
          display: flex;
          gap: 0.5rem;
        }
        .pagination-page-pro {
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          background: white;
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .pagination-page-pro:hover {
          background: #f1f5f9;
          border-color: #3b82f6;
        }
        .pagination-page-pro.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .pagination-info-pro {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* More Trainings */
        .more-trainings-pro {
          text-align: center;
          padding: 2rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
          margin-top: 1rem;
        }
        .more-trainings-pro p {
          color: #64748b;
          margin-bottom: 1rem;
          font-size: 1rem;
          font-weight: 500;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .welcome-content-pro {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
          }
          .stats-mini {
            justify-content: center;
          }
          .training-details-pro {
            grid-template-columns: 1fr;
          }
          .section-header-pro {
            flex-direction: column;
            align-items: flex-start;
          }
          .participants-info-pro {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .pagination-pro {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainerDashboard;
