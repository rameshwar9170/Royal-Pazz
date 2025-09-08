// src/components/CompanyUserList.js
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { ref, onValue, update, get } from 'firebase/database';
import FetchTrainers from '../FetchTrainers';
import { useNavigate } from 'react-router-dom';

// Add a module-level cache
let cachedUsers = null;

const CompanyUserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // New states for additional user data
  const [userSalesData, setUserSalesData] = useState(null);
  const [userTrainingData, setUserTrainingData] = useState(null);
  const [fetchingAdditionalData, setFetchingAdditionalData] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 12;

  useEffect(() => {
    if (cachedUsers) {
      setUsers(cachedUsers);
      setLoading(false);
      return;
    }

    const usersRef = ref(db, 'HTAMS/users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      let userList = [];
      if (data) {
        userList = Object.entries(data).map(([uid, user]) => ({
          uid,
          ...user,
        }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
      cachedUsers = userList;
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter, sort, and paginate users
// Define role mapping at the component level
// Define role mapping at the component level
const roleMapping = {
  'diamond': ['diamond agency', 'diamond distributor', 'diamond wholesaler'],
  'agency': ['agency'], // Only exact match for agency
  'mega agency': ['mega agency'], // Separate entry for mega agency
  'diamond agency': ['diamond agency'], // Separate entry for diamond agency
  'dealer': ['dealer'],
  'mega dealer': ['mega dealer'],
  'distributor': ['distributor'], // Only exact match for distributor
  'mega distributor': ['mega distributor'],
  'diamond distributor': ['diamond distributor'],
  'wholesaler': ['wholesaler'], // Only exact match for wholesaler
  'mega wholesaler': ['mega wholesaler'],
  'diamond wholesaler': ['diamond wholesaler'],
  'admin': ['admin'], // Only exact match for admin
  'subadmin': ['subadmin'], // Separate entry for subadmin
  'trainer': ['trainer'],
  'manager': ['manager'],
  'employee': ['employee'],
  // Add other mappings as needed
};

// Filter, sort, and paginate users
const processedUsers = users
  .filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    
    // Fixed role matching logic using roleMapping with exact matches
    let matchesRole;
    if (selectedRole === 'all') {
      matchesRole = true;
    } else if (roleMapping[selectedRole.toLowerCase()]) {
      // Use role mapping for defined roles
      matchesRole = roleMapping[selectedRole.toLowerCase()].includes(user.role?.toLowerCase());
    } else {
      // For roles not in mapping, use exact match only
      matchesRole = user.role?.toLowerCase() === selectedRole.toLowerCase();
    }
    
    return matchesSearch && matchesRole;
  })
  .sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    const comparison = aValue.toString().localeCompare(bValue.toString());
    return sortOrder === 'asc' ? comparison : -comparison;
  });


  const totalPages = Math.ceil(processedUsers.length / usersPerPage);
  const displayedUsers = processedUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  // Pagination controls
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Utility functions
  const safeNumberFormat = (value) => {
    if (value == null || value === undefined || isNaN(Number(value))) {
      return '₹0';
    }
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };

  const safeDateFormat = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch { 
      return dateString;
    }
  };

// Updated getRoleStats function with all role levels
const getRoleStats = () => {
  const stats = {
    total: users.length,
    agency: users.filter(user => user.role?.toLowerCase() === 'agency').length,
    'mega agency': users.filter(user => user.role?.toLowerCase() === 'mega agency').length,
    diamond: users.filter(user => user.role?.toLowerCase().includes('diamond')).length,
    dealer: users.filter(user => user.role?.toLowerCase() === 'dealer').length,
    'mega dealer': users.filter(user => user.role?.toLowerCase() === 'mega dealer').length,
    distributor: users.filter(user => user.role?.toLowerCase() === 'distributor').length,
    'mega distributor': users.filter(user => user.role?.toLowerCase() === 'mega distributor').length,
    'diamond distributor': users.filter(user => user.role?.toLowerCase() === 'diamond distributor').length,
    wholesaler: users.filter(user => user.role?.toLowerCase() === 'wholesaler').length,
    'mega wholesaler': users.filter(user => user.role?.toLowerCase() === 'mega wholesaler').length,
    'diamond wholesaler': users.filter(user => user.role?.toLowerCase() === 'diamond wholesaler').length,
    trainer: users.filter(user => user.role?.toLowerCase() === 'trainer').length,
    subadmin: users.filter(user => user.role?.toLowerCase() === 'subadmin').length,
    admin: users.filter(user => user.role?.toLowerCase() === 'admin').length,
    manager: users.filter(user => user.role?.toLowerCase() === 'manager').length,
    employee: users.filter(user => user.role?.toLowerCase() === 'employee').length,
  };
  return stats;
};


  const roleStats = getRoleStats();
  const uniqueRoles = [...new Set(users.map(user => user.role).filter(Boolean))];

  const fetchUserAdditionalData = async (userId) => {
    setFetchingAdditionalData(true);
    try {
      const userRef = ref(db, `HTAMS/users/${userId}`);
      const userSnapshot = await get(userRef);
      
      let salesData = {
        personalSales: 0,
        teamCommission: 0,
        totalOrders: 0,
        commissionHistory: [],
        teamMembers: 0,
        trainingEarnings: 0
      };

      let trainingData = {
        totalReferredTrainees: 0,
        totalCompletedTrainees: 0,
        totalTrainingSessions: 0,
        trainingRating: 0,
        trainingCommissions: []
      };

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        salesData.personalSales = parseFloat(userData.MySales) || 0;
        
    if (userData.analytics) {
  salesData.totalSales = userData.analytics.totalSales || 0; // Add this line
}


        if (userData.commissionHistory) {
          const commissions = Object.entries(userData.commissionHistory).map(([id, commission]) => ({
            id,
            ...commission,
            date: new Date(commission.at).toLocaleDateString(),
            isFromTeam: commission.fromUser && 
                       commission.fromUser !== userId && 
                       commission.fromUser !== userData.referredBy,
            product: commission.product || { name: 'Unknown Product' },
            roleAtEarning: commission.roleAtEarning || 'Unknown Role'
          }));
          
          salesData.commissionHistory = commissions;
          salesData.teamCommission = commissions
            .filter(commission => 
              commission.fromUser && 
              commission.fromUser !== userId && 
              commission.fromUser !== userData.referredBy
            )
            .reduce((total, commission) => total + (parseFloat(commission.amount) || 0), 0);
        }

        const allUsersSnapshot = await get(ref(db, 'HTAMS/users'));
        if (allUsersSnapshot.exists()) {
          const allUsers = allUsersSnapshot.val();
          salesData.teamMembers = Object.values(allUsers).filter(user => 
            user.referredBy === userId
          ).length;
        }

        const trainingsRef = ref(db, 'HTAMS/company/trainings');
        const trainingsSnapshot = await get(trainingsRef);
        
        if (trainingsSnapshot.exists()) {
          const trainings = trainingsSnapshot.val();
          let totalReferredTrainees = 0;
          let totalCompletedTrainees = 0;
          let totalTrainingSessions = 0;
          let trainingEarnings = 0;
          let trainingCommissions = [];

          for (const [trainingId, training] of Object.entries(trainings)) {
            if (training.commissionHistory) {
              const trainingCommissionEntries = Object.entries(training.commissionHistory)
                .filter(([_, commission]) => {
                  return commission.fromUser && 
                         commission.fromUser !== userId && 
                         commission.fromUser !== userData.referredBy;
                })
                .map(([commissionId, commission]) => ({
                  trainingId,
                  commissionId,
                  amount: parseFloat(commission.amount) || 0,
                  fromUser: commission.fromUser,
                  trainingLocation: training.location || 'Unknown Location',
                  trainingVenue: training.venue || 'Unknown Venue',
                  trainingDate: training.startDate || training.date || 'Unknown Date',
                  date: commission.at ? new Date(commission.at).toLocaleDateString() : 'Unknown Date'
                }));

              trainingCommissions.push(...trainingCommissionEntries);
              trainingEarnings += trainingCommissionEntries.reduce(
                (sum, commission) => sum + commission.amount, 0
              );
            }

            if (training.participants) {
              const userReferrals = Object.values(training.participants).filter(
                participant => participant.referredBy === userId
              );
              
              totalReferredTrainees += userReferrals.length;
              
              const completedReferrals = userReferrals.filter(
                participant => 
                  participant.status === 'confirmed' || 
                  participant.confirmedByTrainer === true
              );
              totalCompletedTrainees += completedReferrals.length;
            }
            
            if (userData.role?.toLowerCase() === 'trainer' && 
                (training.trainerId === userId || training.trainerName === userData.name)) {
              totalTrainingSessions++;
            }
          }

          trainingData = {
            totalReferredTrainees,
            totalCompletedTrainees,
            totalTrainingSessions,
            trainingRating: userData.trainingRating || 0,
            trainingCommissions
          };
          
          salesData.trainingEarnings = trainingEarnings;
        }
      }

      setUserSalesData(salesData);
      setUserTrainingData(trainingData);
      
    } catch (error) {
      console.error('Error fetching additional user data:', error);
      setUserSalesData(null);
      setUserTrainingData(null);
    } finally {
      setFetchingAdditionalData(false);
    }
  };

  const handleUserClick = async (user) => {
    if (selectedUser && selectedUser.uid === user.uid && showModal) {
      return;
    }
    setSelectedUser(user);
    setShowModal(true);
    setUserSalesData(null);
    setUserTrainingData(null);
    await fetchUserAdditionalData(user.uid);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setUserSalesData(null);
    setUserTrainingData(null);
  };

  const handleRoleFilter = (role) => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  const handleToggleActivation = async (user) => {
    try {
      const userRef = ref(db, `HTAMS/users/${user.uid}`);
      const newStatus = user.isActive !== false ? false : true;
      await update(userRef, { isActive: newStatus });
      setUsers(users.map(u =>
        u.uid === user.uid ? { ...u, isActive: newStatus } : u
      ));
      setSelectedUser({ ...user, isActive: newStatus });
    } catch (error) {
      console.error('Error toggling user activation:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch { 
      return dateString;
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderUserModal = () => {
    if (!selectedUser || !showModal) return null;

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="close-button" onClick={closeModal}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="modal-header-content">
              <div className="modal-avatar">
                {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="modal-user-info">
                <h2 className="modal-user-name">{selectedUser.name || 'Unknown User'}</h2>
                <div className="modal-user-status">
                  <span className={`status-indicator ${selectedUser.isActive !== false ? 'active' : 'inactive'}`}></span>
                  {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                </div>
                <span className="modal-user-role">{selectedUser.role || 'User'}</span>
              </div>
            </div>
          </div>

          <div className="modal-body">
            {fetchingAdditionalData && (
              <div className="loading-section">
                <div className="loading-spinner"></div>
                <p>Loading user details...</p>
              </div>
            )}

            <div className="details-grid">
              <div className="detail-section">
                <h3 className="section-title">
                  <span className="section-icon">📞</span>
                  Contact Information
                </h3>
                <div className="detail-items">
                  <div className="detail-item">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{selectedUser.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{selectedUser.phone || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Department</span>
                    <span className="detail-value">{selectedUser.department || 'Not assigned'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{selectedUser.location || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="section-title">
                  <span className="section-icon">🔐</span>
                  Account Details
                </h3>
                <div className="detail-items">
                  <div className="detail-item">
                    <span className="detail-label">User ID</span>
                    <span className="detail-value">{selectedUser.uid}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Level</span>
                    <span className="detail-value">Level {selectedUser.currentLevel || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Join Date</span>
                    <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Login</span>
                    <span className="detail-value">{formatDate(selectedUser.lastLogin) || 'Never'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3 className="section-title">
                  <span className="section-icon">💰</span>
                  Sales & Performance
                </h3>
                <div className="detail-items">
                  {userSalesData ? (
                    <>

                               <div className="detail-item">
  <span className="detail-label">Total Sales</span>
  <span className="detail-value">{safeNumberFormat(userSalesData.totalSales)}</span>
</div>

                      <div className="detail-item">
                        <span className="detail-label">Total Earnings</span>
                        <span className="detail-value">{safeNumberFormat(userSalesData.personalSales)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Team Commission</span>
                        <span className="detail-value">{safeNumberFormat(userSalesData.teamCommission)}</span>
                      </div>
  

                      <div className="detail-item">
                        <span className="detail-label">Team Members</span>
                        <span className="detail-value">{userSalesData.teamMembers || 0}</span>
                      </div>
                    </>
                  ) : (
                    <div className="detail-item loading">
                      <span className="detail-label">Loading sales data...</span>
                      <div className="mini-spinner"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3 className="section-title">
                  <span className="section-icon">🎓</span>
                  Training & Skills
                </h3>
                <div className="detail-items">
                  {userTrainingData ? (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Referred Trainees</span>
                        <span className="detail-value">{userTrainingData.totalReferredTrainees || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Completed</span>
                        <span className="detail-value">{userTrainingData.totalCompletedTrainees || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Sessions</span>
                        <span className="detail-value">{userTrainingData.totalTrainingSessions || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Rating</span>
                        <span className="detail-value">⭐ {userTrainingData.trainingRating || 0}/5</span>
                      </div>
                    </>
                  ) : (
                    <div className="detail-item loading">
                      <span className="detail-label">Loading training data...</span>
                      <div className="mini-spinner"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="action-buttons">
              <button className="action-button primary">
                <span className="button-icon">✏️</span>
                Edit User
              </button>
              <button className="action-button secondary">
                <span className="button-icon">💬</span>
                Message
              </button>
              {selectedUser.role?.toLowerCase() === 'trainer' && (
                <button className="action-button secondary">
                  <span className="button-icon">📅</span>
                  Schedule
                </button>
              )}
              <button 
                className="action-button secondary"
                onClick={() => navigate(`/user-reports/${selectedUser.uid}`)}
              >
                <span className="button-icon">📈</span>
                Reports
              </button>
              <button 
                className={`action-button ${selectedUser.isActive !== false ? 'danger' : 'success'}`}
                onClick={() => handleToggleActivation(selectedUser)}
              >
                <span className="button-icon">{selectedUser.isActive !== false ? '🚫' : '✅'}</span>
                {selectedUser.isActive !== false ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCards = () => (
    <div className="cards-grid">
      {displayedUsers.map((user) => (
        <div key={user.uid} className="user-card" onClick={() => handleUserClick(user)}>
          <div className="card-header">
            <div className="user-avatar">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <h3 className="user-name">{user.name || 'No Name'}</h3>
              <p className="user-role">{user.role || 'User'}</p>
              <div className="user-status">
                <span className={`status-dot ${user.isActive !== false ? 'active' : 'inactive'}`}></span>
                {user.isActive !== false ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">📧 Email</span>
                <span className="info-value">{user.email ? user.email.substring(0, 20) + (user.email.length > 20 ? '...' : '') : 'Not provided'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">📱 Phone</span>
                <span className="info-value">{user.phone || 'Not provided'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">🎯 Level</span>
                <span className="info-value">Level {user.currentLevel || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">📅 Joined</span>
                <span className="info-value">{formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="th" onClick={() => handleSort('name')}>
                Name 
                {sortBy === 'name' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="th" onClick={() => handleSort('email')}>
                Email 
                {sortBy === 'email' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="th" onClick={() => handleSort('role')}>
                Role 
                {sortBy === 'role' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="th" onClick={() => handleSort('currentLevel')}>
                Level 
                {sortBy === 'currentLevel' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="th" onClick={() => handleSort('createdAt')}>
                Joined 
                {sortBy === 'createdAt' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => (
              <tr key={user.uid} className="tr" onClick={() => handleUserClick(user)}>
                <td className="td">
                  <div className="table-user">
                    <div className="table-avatar">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span>{user.name || 'No Name'}</span>
                  </div>
                </td>
                <td className="td">{user.email || '-'}</td>
                <td className="td">
                  <span className="role-badge">{user.role || 'User'}</span>
                </td>
                <td className="td">Level {user.currentLevel || 'N/A'}</td>
                <td className="td">{formatDate(user.createdAt)}</td>
                <td className="td">
                  <div className="status-cell">
                    <span className={`status-dot ${user.isActive !== false ? 'active' : 'inactive'}`}></span>
                    {user.isActive !== false ? 'Active' : 'Inactive'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading-spinner large"></div>
          <p>Loading user directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-list-wrapper">
      <style>
        {`
          /* Modern User Directory Styles with Enhanced Mobile Support */
          
          .user-list-wrapper {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
          }

          .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            min-height: calc(100vh - 16px);
          }

          /* Header Styles */
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 32px 24px;
            text-align: center;
            color: white;
            position: relative;
          }

          .title {
            font-size: clamp(1.8rem, 4vw, 2.5rem);
            font-weight: 800;
            margin: 0 0 8px 0;
            letter-spacing: -0.025em;
          }

          .subtitle {
            font-size: clamp(0.9rem, 2.5vw, 1.1rem);
            opacity: 0.9;
            margin: 0;
            font-weight: 400;
          }

          /* Control Panel */
          .control-panel {
            padding: 24px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
          }

          .control-row {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
          }

          /* Search Container */
          .search-container {
            position: relative;
            width: 100%;
          }

          .search-input {
            width: 100%;
            padding: 16px 20px;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            font-size: 16px;
            background: white;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            box-sizing: border-box;
          }

          .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .search-icon {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 18px;
          }

          /* Filter Group */
          .filter-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .filter-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .select {
            flex: 1;
            min-width: 0;
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 14px;
            background: white;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 12px center;
            background-repeat: no-repeat;
            background-size: 16px;
            padding-right: 40px;
          }

          .select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          /* View Toggle */
          .view-toggle {
            display: flex;
            background: #e5e7eb;
            border-radius: 14px;
            padding: 4px;
            width: fit-content;
            margin: 0 auto;
          }

          .toggle-button {
            padding: 12px 20px;
            border: none;
            background: transparent;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            color: #6b7280;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .toggle-button.active {
            background: white;
            color: #667eea;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          /* Stats Row */
          .stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 20px;
          }

          .stat-card {
            background: white;
            // padding: 16px 12px;
            border-radius: 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }

          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            border-color: #667eea;
          }

          .stat-card.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          }

          .stat-icon {
            font-size: 1.5rem;
            margin-bottom: 6px;
            display: block;
          }

          .stat-number {
            font-size: clamp(1.2rem, 3vw, 1.8rem);
            font-weight: 800;
            margin-bottom: 4px;
            display: block;
          }

          .stat-label {
            font-size: 0.75rem;
            opacity: 0.8;
            color:black;
            font-weight: 600;
            line-height: 1.2;
          }

          /* Cards Grid */
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            padding: 24px;
          }

          .user-card {
            background: white;
            border-radius: 20px;
            padding: 0;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid #e5e7eb;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }

          .user-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
            border-color: #667eea;
          }

          .card-header {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid #e5e7eb;
          }

          .user-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            font-weight: 700;
            color: white;
            flex-shrink: 0;
          }

          .user-info {
            flex: 1;
            min-width: 0;
          }

          .user-name {
            font-size: 1.1rem;
            font-weight: 700;
            margin: 0 0 4px 0;
            color: #1f2937;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .user-role {
            color: #6b7280;
            margin: 0 0 8px 0;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .user-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 600;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
          }

          .status-dot.active {
            background: #10b981;
            animation: pulse 2s infinite;
          }

          .status-dot.inactive {
            background: #ef4444;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }

          .card-body {
            padding: 20px;
          }

          .info-grid {
            display: grid;
            gap: 12px;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }

          .info-item:last-child {
            border-bottom: none;
          }

          .info-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #6b7280;
            flex-shrink: 0;
          }

          .info-value {
            font-size: 0.8rem;
            color: #1f2937;
            text-align: right;
            font-weight: 500;
            word-break: break-all;
            margin-left: 8px;
          }

          /* Table Styles */
          .table-container {
            padding: 24px;
          }

          .table-wrapper {
            overflow-x: auto;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }

          .table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            min-width: 700px;
          }

          .table-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          .th {
            padding: 20px 16px;
            text-align: left;
            color: white;
            font-weight: 700;
            cursor: pointer;
            transition: background-color 0.3s ease;
            font-size: 0.9rem;
            position: relative;
            user-select: none;
          }

          .th:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }

          .sort-indicator {
            margin-left: 4px;
            font-size: 0.8rem;
          }

          .tr {
            cursor: pointer;
            transition: background-color 0.3s ease;
            border-bottom: 1px solid #f3f4f6;
          }

          .tr:hover {
            background-color: #f8fafc;
          }

          .td {
            padding: 16px;
            color: #374151;
            font-size: 0.85rem;
            vertical-align: middle;
          }

          .table-user {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .table-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 700;
            color: white;
            flex-shrink: 0;
          }

          .role-badge {
            background: #e5e7eb;
            color: #374151;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .status-cell {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 600;
          }

          /* Pagination */
          .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
            padding: 24px;
            background: #f8fafc;
            flex-wrap: wrap;
          }

          .pagination-button {
            padding: 12px 20px;
            border: 2px solid #e5e7eb;
            background: white;
            color: #374151;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            font-size: 0.9rem;
          }

          .pagination-button:hover:not(:disabled) {
            border-color: #667eea;
            color: #667eea;
            transform: translateY(-1px);
          }

          .pagination-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .pagination-info {
            font-weight: 700;
            color: #374151;
            padding: 0 16px;
            font-size: 0.9rem;
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
            padding: 16px;
            backdrop-filter: blur(8px);
          }

          .modal-content {
            background: white;
            border-radius: 24px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.4s ease-out;
          }

          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 24px;
            color: white;
            position: relative;
          }

          .close-button {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-button:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
          }

          .modal-header-content {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .modal-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            font-weight: 800;
            color: white;
            flex-shrink: 0;
          }

          .modal-user-info {
            flex: 1;
            min-width: 0;
          }

          .modal-user-name {
            font-size: 1.8rem;
            font-weight: 800;
            margin: 0 0 8px 0;
            word-break: break-word;
          }

          .modal-user-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            margin-bottom: 4px;
            font-weight: 600;
          }

          .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }

          .status-indicator.active {
            background: #10b981;
          }

          .status-indicator.inactive {
            background: #ef4444;
          }

          .modal-user-role {
            font-size: 0.85rem;
            opacity: 0.9;
            background: rgba(255, 255, 255, 0.2);
            padding: 4px 12px;
            border-radius: 12px;
            display: inline-block;
            font-weight: 600;
          }

          .modal-body {
            padding: 24px;
          }

          .loading-section {
            text-align: center;
            padding: 40px;
            color: #6b7280;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e5e7eb;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }

          .loading-spinner.large {
            width: 48px;
            height: 48px;
            border-width: 4px;
          }

          .mini-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #e5e7eb;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
          }

          .detail-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
          }

          .section-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 16px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .section-icon {
            font-size: 1.2rem;
          }

          .detail-items {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }

          .detail-item:last-child {
            border-bottom: none;
          }

          .detail-item.loading {
            justify-content: flex-start;
            gap: 12px;
          }

          .detail-label {
            font-weight: 600;
            color: #6b7280;
            font-size: 0.85rem;
          }

          .detail-value {
            font-weight: 700;
            color: #1f2937;
            text-align: right;
            font-size: 0.85rem;
            word-break: break-word;
            margin-left: 8px;
          }

          .action-buttons {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }

          .action-button {
            padding: 12px 16px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 0.85rem;
          }

          .button-icon {
            font-size: 1rem;
          }

          .action-button.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }

          .action-button.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
          }

          .action-button.secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #e5e7eb;
          }

          .action-button.secondary:hover {
            background: #e5e7eb;
            transform: translateY(-1px);
          }

          .action-button.danger {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .action-button.danger:hover {
            background: #fecaca;
            transform: translateY(-1px);
          }

          .action-button.success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }

          .action-button.success:hover {
            background: #a7f3d0;
            transform: translateY(-1px);
          }

          /* Loading Container */
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 24px;
            color: #6b7280;
            font-size: 1.1rem;
            font-weight: 600;
          }

          /* Mobile Responsive Adjustments */
          @media (max-width: 768px) {
            .user-list-wrapper {
              padding: 4px;
            }

            .container {
              border-radius: 12px;
              min-height: calc(100vh - 8px);
            }

            .header {
              padding: 24px 16px;
            }

            .control-panel {
              padding: 16px;
            }

            .stats-row {
              grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
              gap: 8px;
            }

            .stat-card {
              padding: 12px 8px;
            }

            .stat-number {
              font-size: 1.2rem;
            }

            .stat-label {
              font-size: 0.7rem;
            }

            .cards-grid {
              grid-template-columns: 1fr;
              padding: 16px;
              gap: 16px;
            }

            .table-container {
              padding: 16px;
            }

            .details-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }

            .action-buttons {
              grid-template-columns: 1fr;
            }

            .modal-content {
              margin: 8px;
              max-height: 95vh;
              border-radius: 16px;
            }

            .modal-header {
              padding: 16px;
            }

            .modal-header-content {
              gap: 12px;
            }

            .modal-avatar {
              width: 60px;
              height: 60px;
              font-size: 1.5rem;
            }

            .modal-user-name {
              font-size: 1.4rem;
            }

            .modal-body {
              padding: 16px;
            }

            .pagination {
              flex-direction: column;
              gap: 12px;
            }

            .pagination-info {
              order: -1;
            }
          }

          @media (max-width: 480px) {
            .search-input {
              font-size: 16px; /* Prevents zoom on iOS */
              padding: 14px 16px;
            }

            .filter-group {
              gap: 8px;
            }

            .select {
              padding: 12px 14px;
              font-size: 14px;
            }

            .view-toggle {
              width: 100%;
            }

            .toggle-button {
              flex: 1;
              justify-content: center;
            }

            .user-card {
              margin: 0 -4px;
            }

            .card-header {
              padding: 16px;
            }

            .user-avatar {
              width: 40px;
              height: 40px;
              font-size: 1rem;
            }

            .card-body {
              padding: 16px;
            }

            .modal-header-content {
              flex-direction: column;
              text-align: center;
            }

            .close-button {
              top: 12px;
              right: 12px;
              width: 32px;
              height: 32px;
            }
          }

          /* Custom scrollbar for webkit browsers */
          .modal-content::-webkit-scrollbar {
            width: 6px;
          }

          .modal-content::-webkit-scrollbar-track {
            background: #f1f5f9;
          }

          .modal-content::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }

          .modal-content::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          .table-wrapper::-webkit-scrollbar {
            height: 6px;
          }

          .table-wrapper::-webkit-scrollbar-track {
            background: #f1f5f9;
          }

          .table-wrapper::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }

          /* Focus states for accessibility */
          .user-card:focus,
          .stat-card:focus,
          .pagination-button:focus,
          .action-button:focus,
          .search-input:focus,
          .select:focus {
            outline: 2px solid #667eea;
            outline-offset: 2px;
          }

          /* Print styles */
          @media print {
            .modal-overlay,
            .action-buttons,
            .pagination,
            .control-panel {
              display: none !important;
            }

            .container {
              box-shadow: none;
              border-radius: 0;
            }
          }

          /* Reduced motion preferences */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }

          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .container {
              border: 2px solid;
            }

            .user-card,
            .stat-card,
            .detail-section {
              border: 1px solid;
            }
          }
        `}
      </style>
      
      <div className="container">
        <div className="header">
   <h1 className="title" style={{ color: 'white' }}>User Directory</h1>

          <p className="subtitle">Manage and explore your team members</p>
        </div>

        <div className="control-panel">
          <div className="control-row">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <div className="filter-group">
              <div className="filter-row">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="select"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="select"
                >
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="role">Sort by Role</option>
                  <option value="createdAt">Sort by Date</option>
                </select>
              </div>

              <div className="view-toggle">
                <button
                  className={`toggle-button ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                >
                  📊 Cards
                </button>
                <button
                  className={`toggle-button ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                >
                  📋 Table
                </button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="stats-row">
            <div className={`stat-card ${selectedRole === 'all' ? 'active' : ''}`} onClick={() => handleRoleFilter('all')}>
              {/* <div className="stat-icon">👥</div> */}
              <div className="stat-number">{roleStats.total}</div>
              <div className="stat-label">Total Users</div>
            </div>

            <div className={`stat-card ${selectedRole === 'agency' ? 'active' : ''}`} onClick={() => handleRoleFilter('agency')}>
              {/* <div className="stat-icon">🏢</div> */}
              <div className="stat-number">{roleStats.agency}</div>
              <div className="stat-label">Agency</div>
            </div>

            <div className={`stat-card ${selectedRole === 'mega agency' ? 'active' : ''}`} onClick={() => handleRoleFilter('mega agency' )}>
              {/* <div className="stat-icon">🏢⭐</div> */}
              <div className="stat-number">{roleStats['mega agency']}</div>
              <div className="stat-label">Mega Agency</div>
            </div>

            <div className={`stat-card ${selectedRole === 'diamond' ? 'active' : ''}`} onClick={() => handleRoleFilter('diamond')}>
              {/* <div className="stat-icon">💎</div> */}
              <div className="stat-number">{roleStats.diamond}</div>
              <div className="stat-label">Diamond</div>
            </div>

            <div className={`stat-card ${selectedRole === 'dealer' ? 'active' : ''}`} onClick={() => handleRoleFilter('dealer')}>
              {/* <div className="stat-icon">🛒</div> */}
              <div className="stat-number">{roleStats.dealer}</div>
              <div className="stat-label">Dealer</div>
            </div>

            <div className={`stat-card ${selectedRole === 'mega dealer' ? 'active' : ''}`} onClick={() => handleRoleFilter('mega dealer')}>
              {/* <div className="stat-icon">🛒⭐</div> */}
              <div className="stat-number">{roleStats['mega dealer']}</div>
              <div className="stat-label">Mega Dealer</div>
            </div>

            <div className={`stat-card ${selectedRole === 'distributor' ? 'active' : ''}`} onClick={() => handleRoleFilter('distributor')}>
              {/* <div className="stat-icon">📦</div> */}
              <div className="stat-number">{roleStats.distributor}</div>
              <div className="stat-label">Distributor</div>
            </div>

            <div className={`stat-card ${selectedRole === 'mega distributor' ? 'active' : ''}`} onClick={() => handleRoleFilter('mega distributor')}>
              {/* <div className="stat-icon">📦⭐</div> */}
              <div className="stat-number">{roleStats['mega distributor']}</div>
              <div className="stat-label">Mega Distributor</div>
            </div>

            <div className={`stat-card ${selectedRole === 'diamond distributor' ? 'active' : ''}`} onClick={() => handleRoleFilter('diamond distributor')}>
              {/* <div className="stat-icon">📦💎</div> */}
              <div className="stat-number">{roleStats['diamond distributor']}</div>
              <div className="stat-label">Diamond Distributor</div>
            </div>

            <div className={`stat-card ${selectedRole === 'wholesaler' ? 'active' : ''}`} onClick={() => handleRoleFilter('wholesaler')}>
              {/* <div className="stat-icon">🏬</div> */}
              <div className="stat-number">{roleStats.wholesaler}</div>
              <div className="stat-label">Wholesaler</div>
            </div>

            <div className={`stat-card ${selectedRole === 'mega wholesaler' ? 'active' : ''}`} onClick={() => handleRoleFilter('mega wholesaler')}>
              {/* <div className="stat-icon">🏬⭐</div> */}
              <div className="stat-number">{roleStats['mega wholesaler']}</div>
              <div className="stat-label">Mega Wholesaler</div>
            </div>

            <div className={`stat-card ${selectedRole === 'diamond wholesaler' ? 'active' : ''}`} onClick={() => handleRoleFilter('diamond wholesaler')}>
              {/* <div className="stat-icon">🏬💎</div> */}
              <div className="stat-number">{roleStats['diamond wholesaler']}</div>
              <div className="stat-label">Diamond Wholesaler</div>
            </div>
             <div className={`stat-card ${selectedRole === 'trainer' ? 'active' : ''}`} onClick={() => handleRoleFilter('trainer')}>
              {/* <div className="stat-icon">🎓</div> */}
              <div className="stat-number">{roleStats.trainer}</div>
              <div className="stat-label">Trainer</div>
            </div>

            <div className={`stat-card ${selectedRole === 'subadmin' ? 'active' : ''}`} onClick={() => handleRoleFilter('subadmin')}>
              {/* <div className="stat-icon">🎓</div> */}
              <div className="stat-number">{roleStats.subadmin}</div>
              <div className="stat-label">subadmin</div>
            </div>

            <div className={`stat-card ${selectedRole === 'admin' ? 'active' : ''}`} onClick={() => handleRoleFilter('admin')}>
              {/* <div className="stat-icon">👑</div> */}
              <div className="stat-number">{roleStats.admin}</div>
              <div className="stat-label">Admin</div>
            </div>
          </div>
        </div>

        {viewMode === 'cards' ? renderCards() : renderTable()}

        <div className="pagination">
          <button 
            onClick={goToPreviousPage} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ← Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={goToNextPage} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next →
          </button>
        </div>

        {renderUserModal()}
      </div>
    </div>
  );
};

export default CompanyUserList;
