import React from 'react';
import { 
  FaSearch,
  FaFilter,
  FaUsers,
  FaCheck,
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaChevronDown,
  FaChevronUp,
  FaWhatsapp
} from 'react-icons/fa';

function TrainerTrainings({ 
  trainings = [], // **FIXED: Default empty array**
  participants = {}, // **FIXED: Default empty object**
  searchTerm = '', // **FIXED: Default empty string**
  setSearchTerm = () => {}, // **FIXED: Default function**
  filterStatus = 'all', // **FIXED: Default value**
  setFilterStatus = () => {}, // **FIXED: Default function**
  expandedTraining = null,
  setExpandedTraining = () => {}, // **FIXED: Default function**
  onCompleteTraining = () => {}, // **FIXED: Default function**
  onCancelTraining = () => {}, // **FIXED: Default function**
  onConfirmParticipant = () => {}, // **FIXED: Default function**
  getParticipantCount = (training) => 0, // **FIXED: Default function with return**
  getConfirmedCount = (training) => 0, // **FIXED: Default function with return**
  isMobile = false, // **FIXED: Default boolean**
  whatsappLoading = false, // **FIXED: Default boolean**
  confirmingParticipantId = null
}) {
  
  // **FIXED: Safe filtering with proper null checks**
  const filteredTrainings = React.useMemo(() => {
    if (!Array.isArray(trainings) || trainings.length === 0) {
      return [];
    }

    return trainings.filter(training => {
      // **FIXED: Safe property access with fallbacks**
      const location = training?.location || '';
      const venue = training?.venue || '';
      const products = training?.products || '';
      const status = training?.status || 'pending';

      const matchesSearch = location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          products.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [trainings, searchTerm, filterStatus]);

  // **FIXED: Safe statistics calculation**
  const stats = React.useMemo(() => {
    if (!Array.isArray(trainings)) {
      return { total: 0, pending: 0, completed: 0, cancelled: 0 };
    }

    return {
      total: trainings.length,
      pending: trainings.filter(t => !t?.status || t.status === 'pending').length,
      completed: trainings.filter(t => t?.status === 'done').length,
      cancelled: trainings.filter(t => t?.status === 'cancelled').length
    };
  }, [trainings]);

  // **FIXED: Safe participant count functions**
  const safeGetParticipantCount = (training) => {
    if (!training?.participants) return 0;
    return Object.keys(training.participants).length;
  };

  const safeGetConfirmedCount = (training) => {
    if (!training?.participants) return 0;
    return Object.values(training.participants).filter(p => 
      p?.status === 'confirmed' || p?.confirmedByTrainer
    ).length;
  };

  return (
    <>
      <style>
        {`
          /* =================== COMPACT TRAININGS STYLES =================== */
          .trainings-container {
            padding: 0;
            min-height: 200px;
          }

          .section-header {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.25rem;
            padding: 1.25rem 1.5rem 0;
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
            border-radius: 0.6rem;
            padding: 0.65rem 0.9rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
            min-width: 200px;
          }

          .search-box:focus-within, .filter-box:focus-within {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .search-icon, .filter-icon {
            color: #64748b;
            margin-right: 0.5rem;
            font-size: 0.9rem;
          }

          .search-input, .filter-select {
            border: none;
            outline: none;
            background: none;
            font-size: 0.85rem;
            color: #334155;
            width: 100%;
          }

          .filter-select {
            cursor: pointer;
          }

          .stats {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            justify-content: center;
          }

          .stat-item {
            background: linear-gradient(45deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 0.4rem 0.9rem;
            border-radius: 0.8rem;
            font-size: 0.8rem;
            font-weight: 600;
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
          }

          .responsive-table-container {
            padding: 0 1.5rem 1.5rem;
          }

          /* Mobile Cards */
          .mobile-cards {
            display: grid;
            gap: 1rem;
            padding: 0 1rem 1rem;
          }

          .training-card {
            background: white;
            border-radius: 0.75rem;
            padding: 1.25rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
            transition: all 0.2s ease;
          }

          .training-card:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateY(-1px);
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1rem;
            gap: 1rem;
          }

          .training-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex: 1;
          }

          .location-icon {
            color: #3b82f6;
            font-size: 0.9rem;
          }

          .status-badge {
            padding: 0.25rem 0.6rem;
            border-radius: 1rem;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
          }

          .status-badge.pending {
            background: #fef3c7;
            color: #92400e;
          }

          .status-badge.done {
            background: #d1fae5;
            color: #065f46;
          }

          .status-badge.cancelled {
            background: #fee2e2;
            color: #991b1b;
          }

          .card-details {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .detail-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.85rem;
            color: #64748b;
          }

          .detail-label {
            font-weight: 600;
            color: #374151;
            min-width: 60px;
          }

          .detail-icon {
            color: #3b82f6;
            font-size: 0.8rem;
            min-width: 14px;
          }

          .products-text {
            color: #1f2937;
            font-weight: 500;
          }

          .card-actions {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
          }

          .btn {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.6rem 1rem;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-1px);
          }

          .btn-danger {
            background: #ef4444;
            color: white;
          }

          .btn-danger:hover {
            background: #dc2626;
            transform: translateY(-1px);
          }

          .btn-mobile {
            flex: 1;
            justify-content: center;
          }

          /* Desktop Table */
          .table-container {
            background: white;
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
          }

          .data-table th {
            background: #f8fafc;
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            color: #374151;
            font-size: 0.85rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .data-table td {
            padding: 1rem;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
          }

          .data-table tr:hover {
            background: #f8fafc;
          }

          .training-details {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .training-venue {
            color: #64748b;
            font-size: 0.8rem;
          }

          .training-id {
            color: #94a3b8;
            font-size: 0.75rem;
          }

          .schedule-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .schedule-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.8rem;
            color: #64748b;
          }

          .schedule-icon {
            color: #3b82f6;
            font-size: 0.75rem;
          }

          .participants-summary {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .participant-count, .confirmed-count {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.8rem;
          }

          .participants-icon, .confirmed-icon {
            color: #3b82f6;
            font-size: 0.75rem;
          }

          .action-buttons {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .btn-sm {
            padding: 0.4rem 0.75rem;
            font-size: 0.75rem;
          }

          /* Participants Section */
          .participants-section {
            margin-top: 1.5rem;
            padding: 1.25rem;
            background: #f8fafc;
            border-radius: 0.75rem;
            border: 1px solid #e2e8f0;
          }

          .participants-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
          }

          .participants-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .toggle-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .toggle-btn:hover {
            background: #2563eb;
          }

          .participants-grid {
            display: grid;
            gap: 0.75rem;
          }

          .participant-card {
            background: white;
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .participant-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .participant-name {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.9rem;
          }

          .participant-details {
            font-size: 0.75rem;
            color: #64748b;
          }

          .participant-actions {
            display: flex;
            gap: 0.5rem;
          }

          .btn-xs {
            padding: 0.3rem 0.6rem;
            font-size: 0.7rem;
          }

          .btn-success {
            background: #10b981;
            color: white;
          }

          .btn-success:hover {
            background: #059669;
          }

          .whatsapp-loading {
            opacity: 0.6;
            pointer-events: none;
          }

          /* Loading States */
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
            text-align: center;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid #e2e8f0;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
            text-align: center;
          }

          .empty-icon {
            font-size: 3rem;
            color: #d1d5db;
            margin-bottom: 1rem;
          }

          .empty-state h3 {
            color: #374151;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }

          .empty-state p {
            color: #6b7280;
            margin: 0;
            font-size: 0.9rem;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .section-header {
              padding: 1rem 1rem 0;
            }

            .search-filter-bar {
              flex-direction: column;
              align-items: stretch;
            }

            .search-box, .filter-box {
              width: 100%;
              min-width: auto;
            }

            .search-input, .filter-select {
              min-width: auto;
            }

            .stats {
              justify-content: center;
            }

            .mobile-cards {
              padding: 0 0.75rem 0.75rem;
            }

            .training-card {
              padding: 1rem;
            }

            .card-actions {
              flex-direction: column;
            }

            .btn-mobile {
              width: 100%;
            }

            .card-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
            }
          }
        `}
      </style>

      <div className="trainings-container">
        {/* Search and Filter Section */}
        <div className="section-header">
          <div className="search-filter-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search trainings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-box">
              <FaFilter className="filter-icon" />
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="done">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="stats">
            <div className="stat-item">
              Total: {stats.total}
            </div>
            <div className="stat-item">
              Pending: {stats.pending}
            </div>
            <div className="stat-item">
              Completed: {stats.completed}
            </div>
            <div className="stat-item">
              Cancelled: {stats.cancelled}
            </div>
          </div>
        </div>

        {/* Trainings List */}
        <div className="responsive-table-container">
          {filteredTrainings.length === 0 ? (
            <div className="empty-state">
              <FaUsers className="empty-icon" />
              <h3>No trainings found</h3>
              <p>
                {trainings.length === 0 
                  ? "No trainings have been assigned to you yet." 
                  : "No trainings match your current search and filter criteria."
                }
              </p>
            </div>
          ) : isMobile ? (
            /* Mobile Card View */
            <div className="mobile-cards">
              {filteredTrainings.map((training) => (
                <div key={training.id} className="training-card">
                  <div className="card-header">
                    <div className="training-title">
                      <FaMapMarkerAlt className="location-icon" />
                      {training.location || 'Location not set'}
                    </div>
                    <span className={`status-badge ${training.status || 'pending'}`}>
                      {training.status === 'done' ? 'Completed' : 
                       training.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="card-details">
                    <div className="detail-row">
                      <span className="detail-label">Venue:</span>
                      <span>{training.venue || 'Not specified'}</span>
                    </div>
                    <div className="detail-row">
                      <FaCalendarAlt className="detail-icon" />
                      <span>{training.startDate || training.date || 'Date not set'}</span>
                    </div>
                    <div className="detail-row">
                      <FaClock className="detail-icon" />
                      <span>{training.time || 'Time not set'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Products:</span>
                      <span className="products-text">{training.products || 'No products listed'}</span>
                    </div>
                    <div className="detail-row">
                      <FaUsers className="detail-icon" />
                      <span>
                        {safeGetParticipantCount(training)} participants 
                        ({safeGetConfirmedCount(training)} confirmed)
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    {training.status !== 'done' && training.status !== 'cancelled' && (
                      <>
                        <button 
                          className="btn btn-primary btn-mobile"
                          onClick={() => onCompleteTraining(training)}
                        >
                          <FaCheck /> Complete
                        </button>
                        <button 
                          className="btn btn-danger btn-mobile"
                          onClick={() => onCancelTraining(training)}
                        >
                          <FaTimes /> Cancel
                        </button>
                      </>
                    )}
                  </div>

                  {/* **FIXED: Safe participants display** */}
                  {training.participants && Object.keys(training.participants).length > 0 && (
                    <div className="participants-section">
                      <div className="participants-header">
                        <h4 className="participants-title">
                          <FaUsers />
                          Participants ({Object.keys(training.participants).length})
                        </h4>
                        <button 
                          className="toggle-btn"
                          onClick={() => setExpandedTraining(
                            expandedTraining === training.id ? null : training.id
                          )}
                        >
                          {expandedTraining === training.id ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>
                      
                      {expandedTraining === training.id && (
                        <div className="participants-grid">
                          {Object.entries(training.participants).map(([participantId, participant]) => (
                            <div key={participantId} className="participant-card">
                              <div className="participant-info">
                                <div className="participant-name">{participant?.name || 'No name'}</div>
                                <div className="participant-details">
                                  {participant?.mobile || participant?.phone || 'No phone'} • {participant?.email || 'No email'}
                                </div>
                                <div className="participant-details">
                                  Status: {participant?.status || 'Pending'}
                                </div>
                              </div>
                              <div className="participant-actions">
                                {!participant?.confirmedByTrainer && (
                                  <button 
                                    className={`btn btn-success btn-xs ${
                                      whatsappLoading && confirmingParticipantId === participantId ? 'whatsapp-loading' : ''
                                    }`}
                                    onClick={() => onConfirmParticipant({
                                      ...participant,
                                      participantId,
                                      trainingId: training.id
                                    })}
                                    disabled={whatsappLoading && confirmingParticipantId === participantId}
                                  >
                                    {whatsappLoading && confirmingParticipantId === participantId ? (
                                      <>
                                        <div className="loading-spinner" style={{width: '12px', height: '12px', border: '1px solid'}}></div>
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <FaWhatsapp /> Confirm
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table View */
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
                            <strong>{training.location || 'Location not set'}</strong>
                          </div>
                          <div className="training-venue">{training.venue || 'Venue not specified'}</div>
                          <div className="training-id">ID: #{training.id}</div>
                        </div>
                      </td>
                      <td>
                        <div className="schedule-info">
                          <div className="schedule-item">
                            <FaCalendarAlt className="schedule-icon" />
                            {training.startDate || training.date || 'Date not set'}
                          </div>
                          <div className="schedule-item">
                            <FaClock className="schedule-icon" />
                            {training.time || 'Time not set'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="products-info">
                          <span className="products-text">{training.products || 'No products listed'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="participants-summary">
                          <div className="participant-count">
                            <FaUsers className="participants-icon" />
                            {safeGetParticipantCount(training)} Total
                          </div>
                          <div className="confirmed-count">
                            <FaCheck className="confirmed-icon" />
                            {safeGetConfirmedCount(training)} Confirmed
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
                                onClick={() => onCompleteTraining(training)}
                              >
                                <FaCheck /> Complete
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => onCancelTraining(training)}
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
      </div>
    </>
  );
}

export default TrainerTrainings;
