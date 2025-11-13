// src/components/CompanyUserList.js
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { ref, onValue, update, get } from 'firebase/database';
import FetchTrainers from '../FetchTrainers';
import { useNavigate } from 'react-router-dom';

// Add a module-level cache
let cachedUsers = null;
let cachedTrainers = null;
let cachedEmployees = null;

const CompanyUserList = () => {
  const [users, setUsers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [levels, setLevels] = useState([]);
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
    let loadedUsers = 0;
    const totalDataSources = 4; // users, trainers, employees, levels

    const checkAllDataLoaded = () => {
      loadedUsers++;
      if (loadedUsers === totalDataSources) {
        setLoading(false);
      }
    };

    // Load regular users from HTAMS/users
    if (cachedUsers) {
      setUsers(cachedUsers);
      checkAllDataLoaded();
    } else {
      const usersRef = ref(db, 'HTAMS/users');
      const unsubscribeUsers = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        let userList = [];
        if (data) {
          userList = Object.entries(data).map(([uid, user]) => ({
            uid,
            ...user,
            dataSource: 'users'
          }));
        }
        setUsers(userList);
        cachedUsers = userList;
        checkAllDataLoaded();
      });
    }

    // Load trainers from HTAMS/company/trainers
    if (cachedTrainers) {
      setTrainers(cachedTrainers);
      checkAllDataLoaded();
    } else {
      const trainersRef = ref(db, 'HTAMS/company/trainers');
      const unsubscribeTrainers = onValue(trainersRef, (snapshot) => {
        const data = snapshot.val();
        let trainerList = [];
        if (data) {
          trainerList = Object.entries(data).map(([uid, trainer]) => ({
            uid,
            ...trainer,
            role: 'trainer', // Ensure role is set
            dataSource: 'trainers'
          }));
        }
        setTrainers(trainerList);
        cachedTrainers = trainerList;
        checkAllDataLoaded();
      });
    }

    // Load employees from HTAMS/company/Employees
    if (cachedEmployees) {
      setEmployees(cachedEmployees);
      checkAllDataLoaded();
    } else {
      const employeesRef = ref(db, 'HTAMS/company/Employees');
      const unsubscribeEmployees = onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        let employeeList = [];
        if (data) {
          employeeList = Object.entries(data).map(([uid, employee]) => ({
            uid,
            ...employee,
            role: 'employee', // Ensure role is set
            dataSource: 'employees'
          }));
        }
        setEmployees(employeeList);
        cachedEmployees = employeeList;
        checkAllDataLoaded();
      });
    }

    // Load business levels from HTAMS/Levels/
    const levelsRef = ref(db, 'HTAMS/Levels');
    onValue(levelsRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Firebase levels data:', data);
      let levelsList = [];
      if (data) {
        levelsList = Object.entries(data).map(([key, level]) => ({
          id: key,
          name: key, // The key IS the level name (e.g., "MEGA WHOLESALER", "AGENCY 15%")
          discount: level.discount || 0,
          selfSale: level.selfSale || 0,
          teamRequirement: level.teamRequirement || 0,
          teamRole: level.teamRole || 'NONE',
          ...level
        }));
        
        // Sort levels by discount percentage (lowest to highest - min to max)
        levelsList.sort((a, b) => (a.discount || 0) - (b.discount || 0));
        console.log('Processed levels list:', levelsList);
      } else {
        console.log('No levels data found in Firebase at HTAMS/level');
      }
      setLevels(levelsList);
      checkAllDataLoaded();
    });

    return () => {
      // Cleanup listeners if they exist
    };
  }, []);

  // Combine all users from different sources
  const allUsers = [
    ...users,
    ...trainers,
    ...employees
  ];

  // Dynamic role mapping based on Firebase levels
  const roleMapping = {
    // Administrative roles (fixed)
    'admin': ['admin'],
    'subadmin': ['subadmin'],
    'manager': ['manager'],
    'trainer': ['trainer'],
    'employee': ['employee'],
    'ca': ['ca'],
    
    // Group filters for easier management
    'all_administrative': ['admin', 'subadmin', 'manager', 'trainer', 'employee', 'ca'],
  };

  // Add dynamic levels from Firebase to roleMapping
  levels.forEach(level => {
    const levelName = level.name.toLowerCase();
    roleMapping[levelName] = [levelName];
  });

  // Create dynamic group filters
  const allBusinessLevels = levels.map(level => level.name.toLowerCase());
  roleMapping['all_business'] = allBusinessLevels;
  
  const premiumLevels = levels.filter(level => level.name.toLowerCase().includes('premium')).map(level => level.name.toLowerCase());
  if (premiumLevels.length > 0) {
    roleMapping['all_premium'] = premiumLevels;
  }

  // Filter, sort, and paginate users
  const processedUsers = allUsers
    .filter(user => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm);
      
      let matchesRole;
      if (selectedRole === 'all') {
        matchesRole = true;
      } else if (roleMapping[selectedRole.toLowerCase()]) {
        // Handle array of roles for group filters
        const rolesToMatch = roleMapping[selectedRole.toLowerCase()];
        matchesRole = rolesToMatch.some(role => 
          user.role?.toLowerCase() === role.toLowerCase() ||
          user.currentLevel?.toLowerCase() === role.toLowerCase()
        );
      } else {
        // Direct role match
        matchesRole = user.role?.toLowerCase() === selectedRole.toLowerCase() ||
                     user.currentLevel?.toLowerCase() === selectedRole.toLowerCase();
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

  // Dynamic role statistics based on Firebase levels
  const getRoleStats = () => {
    const stats = {
      total: allUsers.length,
      
      // Administrative roles
      admin: allUsers.filter(user => user.role?.toLowerCase() === 'admin').length,
      subadmin: allUsers.filter(user => user.role?.toLowerCase() === 'subadmin').length,
      manager: allUsers.filter(user => user.role?.toLowerCase() === 'manager').length,
      trainer: trainers.length,
      employee: employees.length,
      ca: allUsers.filter(user => user.role?.toLowerCase() === 'ca').length,
      
      // Group statistics
      all_administrative: allUsers.filter(user => {
        const role = user.role?.toLowerCase();
        return ['admin', 'subadmin', 'manager', 'trainer', 'employee', 'ca'].includes(role);
      }).length,
    };

    // Add dynamic level counts from Firebase
    levels.forEach(level => {
      const levelName = level.name.toLowerCase();
      stats[levelName] = allUsers.filter(user => 
        user.role?.toLowerCase() === levelName || 
        user.currentLevel?.toLowerCase() === levelName
      ).length;
    });

    // Calculate all_business count
    const allBusinessLevels = levels.map(level => level.name.toLowerCase());
    stats.all_business = allUsers.filter(user => {
      const role = user.role?.toLowerCase() || user.currentLevel?.toLowerCase();
      return allBusinessLevels.includes(role);
    }).length;

    // Calculate all_premium count
    stats.all_premium = allUsers.filter(user => {
      const role = user.role?.toLowerCase() || user.currentLevel?.toLowerCase();
      return role?.includes('premium');
    }).length;

    return stats;
  };

  const roleStats = getRoleStats();

  // Group levels by category for better display
  const groupLevelsByCategory = () => {
    const categories = {
      agency: [],
      dealer: [],
      distributor: [],
      wholesaler: [],
      other: []
    };

    levels.forEach(level => {
      const levelName = level.name.toLowerCase();
      if (levelName.includes('agency')) {
        categories.agency.push(level);
      } else if (levelName.includes('dealer')) {
        categories.dealer.push(level);
      } else if (levelName.includes('distributor')) {
        categories.distributor.push(level);
      } else if (levelName.includes('wholesaler')) {
        categories.wholesaler.push(level);
      } else {
        categories.other.push(level);
      }
    });

    return categories;
  };

  const levelCategories = groupLevelsByCategory();

  // Rest of your functions remain the same...
  const fetchUserAdditionalData = async (userId, dataSource) => {
    setFetchingAdditionalData(true);
    try {
      let userRef;
      // Determine the correct path based on data source
      if (dataSource === 'trainers') {
        userRef = ref(db, `HTAMS/company/trainers/${userId}`);
      } else if (dataSource === 'employees') {
        userRef = ref(db, `HTAMS/company/Employees/${userId}`);
      } else {
        userRef = ref(db, `HTAMS/users/${userId}`);
      }
      
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
          salesData.totalSales = userData.analytics.totalSales || 0;
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

        // For trainers and employees, we might not have the same data structure
        if (dataSource === 'users') {
          const allUsersSnapshot = await get(ref(db, 'HTAMS/users'));
          if (allUsersSnapshot.exists()) {
            const allUsers = allUsersSnapshot.val();
            salesData.teamMembers = Object.values(allUsers).filter(user => 
              user.referredBy === userId
            ).length;
          }
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
            
            if ((userData.role?.toLowerCase() === 'trainer' || dataSource === 'trainers') && 
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
    
    // Prevent body scroll when modal opens
    document.body.style.overflow = 'hidden';
    
    setSelectedUser(user);
    setShowModal(true);
    setUserSalesData(null);
    setUserTrainingData(null);
    
    // Scroll to top of modal content smoothly and scroll page to show modal
    setTimeout(() => {
      const modalContent = document.querySelector('.modal-content');
      const modalOverlay = document.querySelector('.modal-overlay');
      
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      // Scroll the page to center the modal if needed
      if (modalOverlay) {
        modalOverlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    await fetchUserAdditionalData(user.uid, user.dataSource);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setUserSalesData(null);
    setUserTrainingData(null);
    // Re-enable body scroll
    document.body.style.overflow = 'auto';
  };

  const handleRoleFilter = (role) => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  const handleToggleActivation = async (user) => {
    try {
      let userRef;
      // Update in the correct path based on data source
      if (user.dataSource === 'trainers') {
        userRef = ref(db, `HTAMS/company/trainers/${user.uid}`);
      } else if (user.dataSource === 'employees') {
        userRef = ref(db, `HTAMS/company/Employees/${user.uid}`);
      } else {
        userRef = ref(db, `HTAMS/users/${user.uid}`);
      }
      
      const newStatus = user.isActive !== false ? false : true;
      await update(userRef, { isActive: newStatus });
      
      // Update the local state based on data source
      if (user.dataSource === 'trainers') {
        setTrainers(trainers.map(u =>
          u.uid === user.uid ? { ...u, isActive: newStatus } : u
        ));
      } else if (user.dataSource === 'employees') {
        setEmployees(employees.map(u =>
          u.uid === user.uid ? { ...u, isActive: newStatus } : u
        ));
      } else {
        setUsers(users.map(u =>
          u.uid === user.uid ? { ...u, isActive: newStatus } : u
        ));
      }
      
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

  // Rest of your render functions remain the same but I'll include them for completeness
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
                <span className="modal-user-role">
                  {selectedUser.role || selectedUser.currentLevel || 'User'}
                  {selectedUser.role && selectedUser.currentLevel && selectedUser.role !== selectedUser.currentLevel && 
                    ` (Level: ${selectedUser.currentLevel})`
                  }
                </span>
                <span className="modal-data-source">Source: {selectedUser.dataSource}</span>
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
                  {/* <div className="detail-item">
                    <span className="detail-label">Data Source</span>
                    <span className="detail-value">{selectedUser.dataSource}</span>
                  </div> */}
                  <div className="detail-item">
                    <span className="detail-label">Role</span>
                    <span className="detail-value">{selectedUser.role || 'Not assigned'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Current Level</span>
                    <span className="detail-value">{selectedUser.currentLevel || 'Not assigned'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Join Date</span>
                    <span className="detail-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  {/* <div className="detail-item">
                    <span className="detail-label">Last Login</span>
                    <span className="detail-value">{formatDate(selectedUser.lastLogin) || 'Never'}</span>
                  </div> */}
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
              {(selectedUser.role?.toLowerCase() === 'trainer' || selectedUser.dataSource === 'trainers') && (
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
        <div key={`${user.dataSource}-${user.uid}`} className="user-card" onClick={() => handleUserClick(user)}>
          <div className="card-header">
            <div className="user-avatar">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-info">
              <h3 className="user-name">{user.name || 'No Name'}</h3>
              <p className="user-role">{user.role || user.currentLevel || 'User'}
              {user.currentLevel && user.role !== user.currentLevel && (
                <p className="user-level">Level: {user.currentLevel}</p>
              )}
              </p>
              {/* <p className="user-source">Source: {user.dataSource}</p> */}
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
                <span className="info-label">🎯 Current Level</span>
                <span className="info-value">{user.currentLevel || 'N/A'}</span>
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
              <th className="th" onClick={() => handleSort('dataSource')}>
                Source 
                {sortBy === 'dataSource' && <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
              </th>
              <th className="th" onClick={() => handleSort('currentLevel')}>
                Current Level 
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
              <tr key={`${user.dataSource}-${user.uid}`} className="tr" onClick={() => handleUserClick(user)}>
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
                  <span className="role-badge">{user.role || user.currentLevel || 'User'}</span>
                </td>
                <td className="td">
                  <span className="source-badge">{user.dataSource}</span>
                </td>
                <td className="td">{user.currentLevel || 'N/A'}</td>
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
          <p>Loading comprehensive user directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-list-wrapper">
      <div className="container">
        <div className="header">
          <h1 className="title" style={{ color: 'white' }}>Complete User Directory</h1>
          <p className="subtitle">Comprehensive view of all users across all system levels</p>
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
            
            <select
  value={selectedRole}
  onChange={(e) => setSelectedRole(e.target.value)}
  className="select"
>
  <option value="all">All Roles ({roleStats.total})</option>
  
  <optgroup label="🏢 Administrative Roles">
    <option value="admin">Admin ({roleStats.admin})</option>
    <option value="subadmin">Sub Admin ({roleStats.subadmin})</option>
    <option value="manager">Manager ({roleStats.manager})</option>
    <option value="trainer">Trainer ({roleStats.trainer})</option>
    <option value="employee">Employee ({roleStats.employee})</option>
    <option value="ca">CA ({roleStats.ca})</option>
  </optgroup>
  
  <optgroup label="💼 Business Levels">
    {levels.map(level => {
      const levelName = level.name.toLowerCase();
      return (
        <option key={level.id} value={levelName}>
          {level.name} ({roleStats[levelName] || 0})
        </option>
      );
    })}
  </optgroup>
  
  <optgroup label="📊 Group Filters">
    <option value="all_administrative">All Administrative ({roleStats.all_administrative})</option>
    <option value="all_business">All Business Levels ({roleStats.all_business})</option>
    <option value="all_premium">All Premium Levels ({roleStats.all_premium})</option>
  </optgroup>
</select>


            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="dataSource">Sort by Source</option>
              <option value="currentLevel">Sort by Level</option>
              <option value="createdAt">Sort by Date</option>
            </select>

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

          {/* Comprehensive Stats Display */}
       {/* Updated Stats Display with Proper Grouping */}
{/* Simplified Stats Display - Business Levels Only */}
<div className="stats-container">
  {/* Overview Row */}
  <div className="stats-overview-row">
    <div className={`stat-card ${selectedRole === 'all' ? 'active' : ''}`} onClick={() => handleRoleFilter('all')}>
      <div className="stat-number">{roleStats.total}</div>
      <div className="stat-label">Total Users</div>
    </div>
    
    <div className={`stat-card ${selectedRole === 'all_administrative' ? 'active' : ''}`} onClick={() => handleRoleFilter('all_administrative')}>
      <div className="stat-number">{roleStats.all_administrative}</div>
      <div className="stat-label">Administrative</div>
    </div>
    
    <div className={`stat-card ${selectedRole === 'all_business' ? 'active' : ''}`} onClick={() => handleRoleFilter('all_business')}>
      <div className="stat-number">{roleStats.all_business}</div>
      <div className="stat-label">Business Levels</div>
    </div>
    
    <div className={`stat-card ${selectedRole === 'all_premium' ? 'active' : ''}`} onClick={() => handleRoleFilter('all_premium')}>
      <div className="stat-number">{roleStats.all_premium}</div>
      <div className="stat-label">Premium Levels</div>
    </div>
  </div>

  {/* Category Groups */}
  <div className="stats-category-groups">
    {/* Administrative Roles */}
    <div className="stats-category-group administrative">
      <div className="category-header">
        <span className="category-icon">🏢</span>
        <span className="category-title">Administrative Roles</span>
      </div>
      <div className="category-stats-grid">
        <div className={`stat-card ${selectedRole === 'admin' ? 'active' : ''}`} onClick={() => handleRoleFilter('admin')}>
          <div className="stat-number">{roleStats.admin}</div>
          <div className="stat-label">Admin</div>
        </div>
        
        <div className={`stat-card ${selectedRole === 'subadmin' ? 'active' : ''}`} onClick={() => handleRoleFilter('subadmin')}>
          <div className="stat-number">{roleStats.subadmin}</div>
          <div className="stat-label">Sub Admin</div>
        </div>
        
        <div className={`stat-card ${selectedRole === 'manager' ? 'active' : ''}`} onClick={() => handleRoleFilter('manager')}>
          <div className="stat-number">{roleStats.manager}</div>
          <div className="stat-label">Manager</div>
        </div>
        
        <div className={`stat-card ${selectedRole === 'trainer' ? 'active' : ''}`} onClick={() => handleRoleFilter('trainer')}>
          <div className="stat-number">{roleStats.trainer}</div>
          <div className="stat-label">Trainer</div>
        </div>
        
        <div className={`stat-card ${selectedRole === 'employee' ? 'active' : ''}`} onClick={() => handleRoleFilter('employee')}>
          <div className="stat-number">{roleStats.employee}</div>
          <div className="stat-label">Employee</div>
        </div>
        
        <div className={`stat-card ${selectedRole === 'ca' ? 'active' : ''}`} onClick={() => handleRoleFilter('ca')}>
          <div className="stat-number">{roleStats.ca}</div>
          <div className="stat-label">CA</div>
        </div>
      </div>
    </div>

    {/* Business Levels - Dynamic from Firebase */}
    <div className="stats-category-group business">
      <div className="category-header">
        <span className="category-icon">💼</span>
        <span className="category-title">Business Levels</span>
      </div>
      <div className="category-stats-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading levels...
          </div>
        ) : levels.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#666' }}>
            No business levels found in Firebase
          </div>
        ) : (
          levels.map(level => {
            const levelName = level.name.toLowerCase();
            return (
              <div 
                key={level.id}
                className={`stat-card ${selectedRole === levelName ? 'active' : ''}`} 
                onClick={() => handleRoleFilter(levelName)}
              >
                <div className="stat-number">{roleStats[levelName] || 0}</div>
                <div className="stat-label">{level.name}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
            Page {currentPage} of {totalPages} ({processedUsers.length} users shown from {roleStats.total} total)
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
  

 
      <style>{`<style>
/* =========================================
   COMPREHENSIVE USER MANAGEMENT DASHBOARD
   FULLY RESPONSIVE CSS - ALL DEVICES
========================================= */

/* Base Reset and Variables */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Primary Color Palette */
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  
  /* Secondary Colors */
  --secondary-500: #6366f1;
  --secondary-600: #4f46e5;
  
  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500:rgb(52, 105, 210);
  --gray-600:rgb(41, 97, 175);
  --gray-700:rgb(41, 115, 234)117, 225);
  --gray-800:rgb(45, 113, 207);
  --gray-900:rgb(54, 108, 225);
  
  /* Status Colors */
  --success-500: #10b981;
  --success-600: #059669;
  --success-100: #d1fae5;
  
  --warning-500: #f59e0b;
  --warning-600: #d97706;
  --warning-100: #fef3c7;
  
  --danger-500: #ef4444;
  --danger-600: #dc2626;
  --danger-100: #fee2e2;
  
  --info-500: #06b6d4;
  --info-600: #0891b2;
  --info-100: #cffafe;
  
  /* Category Colors */
  --admin-color: #8b5cf6;
  --agency-color: #10b981;
  --business-color: #f59e0b;
  
  /* Responsive Spacing */
  --spacing-xs: clamp(0.25rem, 0.5vw, 0.5rem);
  --spacing-sm: clamp(0.5rem, 1vw, 1rem);
  --spacing-md: clamp(0.75rem, 1.5vw, 1.5rem);
  --spacing-lg: clamp(1rem, 2vw, 2rem);
  --spacing-xl: clamp(1.5rem, 3vw, 3rem);
  
  /* Responsive Typography */
  --font-xs: clamp(0.625rem, 1.2vw, 0.75rem);
  --font-sm: clamp(0.75rem, 1.4vw, 0.875rem);
  --font-base: clamp(0.875rem, 1.6vw, 1rem);
  --font-lg: clamp(1rem, 1.8vw, 1.125rem);
  --font-xl: clamp(1.125rem, 2vw, 1.25rem);
  --font-2xl: clamp(1.25rem, 2.5vw, 1.5rem);
  --font-3xl: clamp(1.5rem, 3vw, 2rem);
  --font-4xl: clamp(2rem, 4vw, 2.5rem);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  
  /* Transitions */
  --transition-fast: 0.15s ease-in-out;
  --transition-normal: 0.3s ease-in-out;
  --transition-slow: 0.5s ease-in-out;
  
  /* Border Radius - Responsive */
  --radius-sm: clamp(0.25rem, 0.5vw, 0.375rem);
  --radius-md: clamp(0.375rem, 0.75vw, 0.5rem);
  --radius-lg: clamp(0.5rem, 1vw, 0.75rem);
  --radius-xl: clamp(0.75rem, 1.5vw, 1rem);
  
  /* Container Max Widths */
  --container-sm: 100%;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1400px;
}

/* Main Wrapper */
.user-list-wrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--gray-800);
  line-height: 1.6;
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}

.container {
  width: 100%;
  max-width: var(--container-2xl);
  margin: 0 auto;
  padding: var(--spacing-lg);
}

/* Header Section */
.header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.title {
  font-size: var(--font-4xl);
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-sm);
  letter-spacing: -0.025em;
  line-height: 1.1;
}

.subtitle {
  font-size: var(--font-lg);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
  max-width: 600px;
  margin: 0 auto;
}

/* Control Panel */
.control-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: var(--spacing-md);
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

/* Search Container */
.search-container {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) calc(var(--spacing-xl) + var(--spacing-sm)) var(--spacing-sm) var(--spacing-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: var(--font-base);
  transition: all var(--transition-normal);
  background: white;
  min-height: 44px; /* Touch-friendly */
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--font-lg);
  color: var(--gray-400);
  pointer-events: none;
}

/* Select Dropdown */
.select {
  padding: var(--spacing-sm);
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: var(--font-base);
  background: white;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-width: 200px;
  min-height: 44px; /* Touch-friendly */
  width: 100%;
}

.select:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* View Toggle */
.view-toggle {
  display: flex;
  background: var(--gray-100);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xs);
  width: 100%;
}

.toggle-button {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
  color: var(--gray-600);
  min-height: 44px; /* Touch-friendly */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.toggle-button.active {
  background: white;
  color: var(--primary-600);
  box-shadow: var(--shadow-sm);
}

.toggle-button:hover:not(.active) {
  background: rgba(255, 255, 255, 0.5);
}

/* Statistics Container */
.stats-container {
  margin-top: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* Main Overview Row */
.stats-overview-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.stats-overview-row .stat-card {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%);
  color: white;
  border: none;
  text-align: center;
  padding: var(--spacing-lg);
  min-height: 100px;
}

.stats-overview-row .stat-number {
  color: white;
  font-size: var(--font-3xl);
  font-weight: 800;
  margin-bottom: var(--spacing-xs);
}

.stats-overview-row .stat-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--font-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Category Groups Container */
.stats-category-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

/* Individual Category Group */
.stats-category-group {
  background: white;
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--gray-100);
}

/* Category Header */
.category-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 2px solid var(--gray-100);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.category-icon {
  font-size: var(--font-2xl);
}

.category-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--gray-800);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Administrative Category */
.stats-category-group.administrative .category-header {
  border-bottom-color: var(--admin-color);
}

.stats-category-group.administrative .category-title {
  color: var(--admin-color);
}

.stats-category-group.administrative .stat-card {
  border-left: 4px solid var(--admin-color);
}

.stats-category-group.administrative .stat-card.active {
  background: rgba(139, 92, 246, 0.1);
  border-color: var(--admin-color);
}

/* Business Category */
.stats-category-group.business .category-header {
  border-bottom-color: var(--business-color);
}

.stats-category-group.business .category-title {
  color: var(--business-color);
}

.stats-category-group.business .stat-card {
  border-left: 4px solid var(--business-color);
}

.stats-category-group.business .stat-card.active {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--business-color);
}

/* Category Stats Grid */
.category-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-sm);
}

/* Individual Stat Card */
.stat-card {
  background: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-normal);
  border: 2px solid transparent;
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-card.active {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.stat-number {
  font-size: var(--font-2xl);
  font-weight: 800;
  margin-bottom: var(--spacing-xs);
  color: var(--gray-800);
}

.stat-label {
  font-size: var(--font-xs);
  color: var(--gray-600);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-align: center;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.user-card {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
  border: 1px solid var(--gray-100);
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.user-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-xl);
}

.card-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background: linear-gradient(135deg, var(--gray-50) 0%, white 100%);
  border-bottom: 1px solid var(--gray-100);
  flex-shrink: 0;
}

.user-avatar {
  width: clamp(2.5rem, 6vw, 3.5rem);
  height: clamp(2.5rem, 6vw, 3.5rem);
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: var(--font-lg);
  margin-right: var(--spacing-sm);
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0; /* Prevent text overflow */
}

.user-name {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--gray-900);
  margin-bottom: var(--spacing-xs);
  word-break: break-word;
  line-height: 1.2;
}

.user-role {
  font-size: var(--font-sm);
  color: var(--primary-600);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.user-level {
  font-size: var(--font-xs);
  color: var(--gray-500);
  margin-bottom: var(--spacing-xs);
}

.user-source {
  font-size: var(--font-xs);
  color: var(--gray-400);
  margin-bottom: var(--spacing-xs);
}

.user-status {
  display: flex;
  align-items: center;
  font-size: var(--font-xs);
  font-weight: 500;
  gap: var(--spacing-xs);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.active {
  background: var(--success-500);
}

.status-dot.inactive {
  background: var(--danger-500);
}

.card-body {
  padding: var(--spacing-md);
  flex: 1;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}

.info-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.info-label {
  font-size: var(--font-xs);
  color: var(--gray-500);
  font-weight: 500;
  margin-bottom: var(--spacing-xs);
}

.info-value {
  font-size: var(--font-sm);
  color: var(--gray-800);
  font-weight: 500;
  word-break: break-word;
  line-height: 1.2;
}

/* Table Styles */
.table-container {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  margin-bottom: var(--spacing-lg);
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px; /* Minimum width for horizontal scroll on small screens */
}

.table-header {
  background: linear-gradient(135deg, var(--gray-50) 0%, white 100%);
}

.th {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  font-weight: 600;
  color: var(--gray-700);
  font-size: var(--font-sm);
  border-bottom: 1px solid var(--gray-200);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  white-space: nowrap;
}

.th:hover {
  background: var(--gray-100);
}

.sort-indicator {
  margin-left: var(--spacing-xs);
  font-size: var(--font-xs);
  color: var(--primary-500);
}

.tr {
  border-bottom: 1px solid var(--gray-100);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.tr:hover {
  background: var(--gray-50);
}

.td {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-sm);
  color: var(--gray-800);
  vertical-align: middle;
}

.table-user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.table-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: var(--font-base);
  flex-shrink: 0;
}

.table-user span {
  word-break: break-word;
  line-height: 1.2;
}

.role-badge {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 500;
  white-space: nowrap;
}

.source-badge {
  background: var(--gray-100);
  color: var(--gray-700);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  font-size: var(--font-xs);
  font-weight: 500;
  white-space: nowrap;
}

.status-cell {
  display: flex;
  align-items: center;
  font-size: var(--font-xs);
  font-weight: 500;
  gap: var(--spacing-xs);
}

/* Modal Styles */
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
  z-index: 1000;
  padding: var(--spacing-sm);
  backdrop-filter: blur(4px);
  overflow-y: auto;
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  scroll-behavior: smooth;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 100%);
  color: white;
  position: relative;
}

.close-button {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: white;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.modal-header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding-right: 3rem; /* Space for close button */
}

.modal-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: var(--font-2xl);
  flex-shrink: 0;
}

.modal-user-info {
  flex: 1;
  min-width: 0;
}

.modal-user-name {
  font-size: var(--font-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xs);
  word-break: break-word;
  line-height: 1.2;
}

.modal-user-status {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-sm);
  font-weight: 500;
  gap: var(--spacing-xs);
}

.status-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.active {
  background: var(--success-500);
}

.status-indicator.inactive {
  background: var(--danger-500);
}

.modal-user-role {
  font-size: var(--font-sm);
  opacity: 0.9;
  margin-bottom: var(--spacing-xs);
}

.modal-data-source {
  font-size: var(--font-xs);
  opacity: 0.8;
}

.modal-body {
  padding: var(--spacing-lg);
}

.loading-section {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--gray-600);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
}

.detail-section {
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.section-title {
  display: flex;
  align-items: center;
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--gray-800);
  margin-bottom: var(--spacing-sm);
  gap: var(--spacing-xs);
}

.section-icon {
  font-size: var(--font-lg);
  flex-shrink: 0;
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--gray-200);
  gap: var(--spacing-sm);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: var(--font-sm);
  color: var(--gray-600);
  font-weight: 500;
  flex-shrink: 0;
}

.detail-value {
  font-size: var(--font-sm);
  color: var(--gray-900);
  font-weight: 600;
  text-align: right;
  word-break: break-word;
  line-height: 1.2;
}

.detail-item.loading {
  justify-content: center;
  color: var(--gray-500);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.action-button {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-decoration: none;
  min-height: 44px; /* Touch-friendly */
  justify-content: center;
  gap: var(--spacing-xs);
  flex: 1;
  min-width: 120px;
}

.button-icon {
  font-size: var(--font-base);
  flex-shrink: 0;
}

.action-button.primary {
  background: var(--primary-500);
  color: white;
}

.action-button.primary:hover {
  background: var(--primary-600);
  transform: translateY(-1px);
}

.action-button.secondary {
  background: var(--gray-100);
  color: var(--gray-700);
}

.action-button.secondary:hover {
  background: var(--gray-200);
  transform: translateY(-1px);
}

.action-button.success {
  background: var(--success-500);
  color: white;
}

.action-button.success:hover {
  background: var(--success-600);
  transform: translateY(-1px);
}

.action-button.danger {
  background: var(--danger-500);
  color: white;
}

.action-button.danger:hover {
  background: var(--danger-600);
  transform: translateY(-1px);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  flex-wrap: wrap;
}

.pagination-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-height: 44px; /* Touch-friendly */
  min-width: 80px;
}

.pagination-button:hover:not(:disabled) {
  background: var(--primary-600);
  transform: translateY(-1px);
}

.pagination-button:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
  transform: none;
}

.pagination-info {
  font-size: var(--font-sm);
  color: var(--gray-700);
  font-weight: 500;
  text-align: center;
  padding: 0 var(--spacing-sm);
}

/* Loading Animations */
.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--gray-200);
  border-top: 3px solid var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

.loading-spinner.large {
  width: 3rem;
  height: 3rem;
}

.mini-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--gray-200);
  border-top: 2px solid var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-lg);
  color: white;
}

.loading-container p {
  margin-top: var(--spacing-sm);
  font-size: var(--font-lg);
  opacity: 0.8;
}

/* =========================================
   RESPONSIVE BREAKPOINTS
========================================= */

/* Extra Small Mobile Phones (Portrait) */
@media (max-width: 320px) {
  :root {
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 0.75rem;
    --spacing-lg: 1rem;
    --spacing-xl: 1.25rem;
  }
  
  .container {
    padding: var(--spacing-sm);
  }
  
  .control-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .stats-overview-row {
    grid-template-columns: 1fr;
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-xs);
  }
  
  .stat-card {
    min-height: 60px;
    padding: var(--spacing-xs);
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-button {
    flex: none;
    width: 100%;
  }
}

/* Small Mobile Phones (Portrait & Landscape) */
@media (min-width: 321px) and (max-width: 480px) {
  .container {
    padding: var(--spacing-md);
  }
  
  .control-row {
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-button {
    width: 100%;
    flex: none;
  }
  
  .pagination {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}

/* Large Mobile Phones & Small Tablets */
@media (min-width: 481px) and (max-width: 600px) {
  .control-row {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    margin: var(--spacing-sm);
    max-height: calc(100vh - 2rem);
  }
  
  .action-buttons {
    justify-content: stretch;
  }
  
  .action-button {
    flex: 1;
    min-width: 100px;
  }
}

/* Small Tablets (Portrait) */
@media (min-width: 601px) and (max-width: 768px) {
  .control-row {
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-md);
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
}

/* Large Tablets (Landscape) & Small Desktops */
@media (min-width: 769px) and (max-width: 1024px) {
  .control-row {
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--spacing-md);
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .details-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .modal-content {
    max-width: 700px;
  }
}

/* Medium Desktops & Laptops */
@media (min-width: 1025px) and (max-width: 1280px) {
  .control-row {
    grid-template-columns: 2fr 1fr 1fr auto;
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(6, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .details-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Large Desktops */
@media (min-width: 1281px) and (max-width: 1440px) {
  .category-stats-grid {
    grid-template-columns: repeat(6, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .details-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Extra Large Desktops & Ultra-wide Screens */
@media (min-width: 1441px) {
  .container {
    max-width: 1600px;
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(8, 1fr);
  }
  
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .details-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Orientation-specific adjustments */
@media (orientation: landscape) and (max-height: 500px) {
  .header {
    margin-bottom: var(--spacing-md);
  }
  
  .title {
    font-size: var(--font-3xl);
  }
  
  .subtitle {
    font-size: var(--font-base);
  }
  
  .modal-content {
    max-height: 85vh;
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* High DPI / Retina Display Adjustments */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .stat-card,
  .user-card,
  .modal-content {
    box-shadow: var(--shadow-lg);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .user-card:hover,
  .stat-card:hover,
  .action-button:hover {
    transform: none;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  :root {
    --gray-100: #e0e0e0;
    --gray-200: #c0c0c0;
    --gray-300: #a0a0a0;
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  }
  
  .stat-card,
  .user-card {
    border: 2px solid var(--gray-400);
  }
}

/* Dark Mode Support */


/* Print Styles */
@media print {
  .modal-overlay,
  .action-buttons,
  .pagination,
  .control-panel {
    display: none !important;
  }
  
  .user-list-wrapper {
    background: white !important;
    color: black !important;
  }
  
  .container {
    max-width: none !important;
    padding: 0 !important;
  }
  
  .stats-category-group,
  .user-card,
  .table-container {
    background: white !important;
    box-shadow: none !important;
    border: 1px solid #ddd !important;
    break-inside: avoid;
  }
  
  .cards-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

/* Focus Management for Keyboard Navigation */
.stat-card:focus,
.user-card:focus,
.tr:focus,
.toggle-button:focus,
.pagination-button:focus,
.action-button:focus,
.search-input:focus,
.select:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Touch Device Optimizations */
@media (hover: none) and (pointer: coarse) {
  .stat-card,
  .user-card,
  .toggle-button,
  .action-button,
  .pagination-button {
    min-height: 44px;
  }
  
  .search-input,
  .select {
    min-height: 48px;
  }
  
  .th,
  .td {
    padding: var(--spacing-md);
  }
}

/* Foldable Phone Support */
@media (min-width: 280px) and (max-width: 653px) and (min-height: 653px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-overview-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large Tablet Landscape Optimization */
@media (min-width: 1024px) and (max-width: 1366px) and (orientation: landscape) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .category-stats-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
`}</style>

      
    </div>
  );
};

export default CompanyUserList;
