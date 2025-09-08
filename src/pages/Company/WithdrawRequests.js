import React, { useState, useEffect } from 'react';
import { database } from '../../firebase/config';
import { ref, get, update, onValue, off } from 'firebase/database';
import './WithdrawRequests.css';

const WithdrawRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0
  });

  // Utility function to format date as DD/MM/YY
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Utility function to format time as HH:MM
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Utility function to remove undefined/null properties from objects
  const cleanObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(v => (v && typeof v === 'object') ? cleanObject(v) : v);
    } else if (obj && typeof obj === 'object') {
      const cleaned = {};
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined && val !== null) {
          cleaned[key] = (val && typeof val === 'object') ? cleanObject(val) : val;
        }
      });
      return cleaned;
    }
    return obj;
  };

  useEffect(() => {
    fetchWithdrawRequests();
    
    // Set up real-time listener
    const requestsRef = ref(database, 'HTAMS/transactions');
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const requestsArray = Object.entries(data)
          .map(([id, requestData]) => ({
            id,
            ...requestData
          }))
          .filter(request => request.type === 'withdrawal')
          .sort((a, b) => b.requestedAt - a.requestedAt);
        
        setRequests(requestsArray);
        calculateStats(requestsArray);
      } else {
        setRequests([]);
        setStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
          totalAmount: 0,
          pendingAmount: 0,
          approvedAmount: 0
        });
      }
      setLoading(false);
    });

    return () => {
      off(requestsRef, 'value', unsubscribe);
    };
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, filterStatus, filterMode, searchTerm, dateFilter]);

  const fetchWithdrawRequests = async () => {
    try {
      const requestsRef = ref(database, 'HTAMS/transactions');
      const snapshot = await get(requestsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const requestsArray = Object.entries(data)
          .map(([id, requestData]) => ({
            id,
            ...requestData
          }))
          .filter(request => request.type === 'withdrawal')
          .sort((a, b) => b.requestedAt - a.requestedAt);
        
        setRequests(requestsArray);
        calculateStats(requestsArray);
      }
    } catch (error) {
      console.error('Error fetching withdraw requests:', error);
      alert('Error loading withdraw requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requestsArray) => {
    const stats = {
      total: requestsArray.length,
      pending: requestsArray.filter(r => r.status === 'pending').length,
      approved: requestsArray.filter(r => r.status === 'approved').length,
      rejected: requestsArray.filter(r => r.status === 'rejected').length,
      cancelled: requestsArray.filter(r => r.status === 'cancelled').length,
      totalAmount: requestsArray.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      pendingAmount: requestsArray.filter(r => r.status === 'pending').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
      approvedAmount: requestsArray.filter(r => r.status === 'approved').reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
    };
    setStats(stats);
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => request.status === filterStatus);
    }

    // Filter by mode
    if (filterMode !== 'all') {
      filtered = filtered.filter(request => request.mode === filterMode);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.userDetails?.name?.toLowerCase().includes(searchLower) ||
        request.userDetails?.email?.toLowerCase().includes(searchLower) ||
        request.userDetails?.mobile?.includes(searchTerm) ||
        request.id.toLowerCase().includes(searchLower) ||
        request.amount.toString().includes(searchTerm)
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(request => {
        const requestDate = new Date(request.requestedAt);
        switch (dateFilter) {
          case 'today':
            return requestDate >= today;
          case 'yesterday':
            return requestDate >= yesterday && requestDate < today;
          case 'week':
            return requestDate >= weekAgo;
          case 'month':
            return requestDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredRequests(filtered);
  };

  const updateUserBalance = async (userId, amount, operation) => {
    try {
      const userRef = ref(database, `HTAMS/users/${userId}`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const currentBalance = parseFloat(userData.MySales || 0);
        
        let newBalance;
        if (operation === 'subtract') {
          newBalance = Math.max(0, currentBalance - amount);
        } else if (operation === 'add') {
          newBalance = currentBalance + amount;
        } else {
          newBalance = currentBalance;
        }

        await update(userRef, {
          MySales: newBalance.toString(),
          lastUpdated: Date.now()
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user balance:', error);
      return false;
    }
  };

  const approveRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to approve this withdrawal request?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        alert('Request not found');
        return;
      }

      const amount = parseFloat(request.amount);
      const userId = request.userId;

      // Update request status in both locations
      const updates = {
        status: 'approved',
        approvedAt: Date.now(),
        approvedBy: 'admin',
        processedAt: Date.now()
      };

      // Update in global transactions
      await update(ref(database, `HTAMS/transactions/${requestId}`), updates);
      
      // Update in user's transactions
      await update(ref(database, `HTAMS/users/${userId}/transactions/${requestId}`), updates);

      // Update user's balance
      const balanceUpdated = await updateUserBalance(userId, amount, 'subtract');
      
      if (!balanceUpdated) {
        alert('Warning: Request approved but user balance could not be updated');
      }

      alert('Withdrawal request approved successfully!');
      setShowModal(false);
      
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectRequest = async (requestId, reason = '') => {
    const rejectReason = reason || prompt('Please enter rejection reason (optional):') || 'No reason provided';
    
    if (!window.confirm('Are you sure you want to reject this withdrawal request?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        alert('Request not found');
        return;
      }

      const amount = parseFloat(request.amount);
      const userId = request.userId;

      // Update request status in both locations
      const updates = {
        status: 'rejected',
        rejectedAt: Date.now(),
        rejectedBy: 'admin',
        rejectionReason: rejectReason,
        processedAt: Date.now()
      };

      // Update in global transactions
      await update(ref(database, `HTAMS/transactions/${requestId}`), updates);
      
      // Update in user's transactions
      await update(ref(database, `HTAMS/users/${userId}/transactions/${requestId}`), updates);

      // Restore user's balance
      await updateUserBalance(userId, amount, 'add');

      alert('Withdrawal request rejected successfully!');
      setShowModal(false);
      
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this withdrawal request?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        alert('Request not found');
        return;
      }

      const amount = parseFloat(request.amount);
      const userId = request.userId;

      // Update request status in both locations
      const updates = {
        status: 'cancelled',
        cancelledAt: Date.now(),
        cancelledBy: 'admin',
        processedAt: Date.now()
      };

      // Update in global transactions
      await update(ref(database, `HTAMS/transactions/${requestId}`), updates);
      
      // Update in user's transactions
      await update(ref(database, `HTAMS/users/${userId}/transactions/${requestId}`), updates);

      // Restore user's balance
      await updateUserBalance(userId, amount, 'add');

      alert('Withdrawal request cancelled successfully!');
      setShowModal(false);
      
    } catch (error) {
      console.error('Error cancelling request:', error);
      alert('Error cancelling request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'cancelled': return '#757575';
      default: return '#2196f3';
    }
  };

  const exportToCSV = () => {
    const headers = ['Transaction ID', 'User Name', 'Email', 'Mobile', 'Amount', 'Mode', 'Status', 'Requested Date', 'Processed Date'];
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.id,
        request.userDetails?.name || 'N/A',
        request.userDetails?.email || 'N/A',
        request.userDetails?.mobile || 'N/A',
        request.amount,
        request.mode || 'N/A',
        request.status,
        formatDate(request.requestedAt),
        request.processedAt ? formatDate(request.processedAt) : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdraw_requests_${formatDate(Date.now())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="withdraw-requests-loading">
        <div className="loading-spinner"></div>
        <p>Loading withdraw requests...</p>
      </div>
    );
  }

  return (
    <div className="withdraw-requests-container">
      <div className="withdraw-requests-header">
        <div className="header-title">
          <h1>💳 Withdraw Requests Management</h1>
          <p className="header-subtitle">Manage and process withdrawal requests efficiently</p>
        </div>
        <div className="header-actions">
          <button className="btn-export" onClick={exportToCSV}>
            📊 Export CSV
          </button>
          <button className="btn-refresh" onClick={fetchWithdrawRequests}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>Total Requests</h3>
            <div className="stat-value">{stats.total}</div>
            <small>₹{stats.totalAmount.toLocaleString()}</small>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>Pending</h3>
            <div className="stat-value">{stats.pending}</div>
            <small>₹{stats.pendingAmount.toLocaleString()}</small>
          </div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Approved</h3>
            <div className="stat-value">{stats.approved}</div>
            <small>₹{stats.approvedAmount.toLocaleString()}</small>
          </div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>Rejected</h3>
            <div className="stat-value">{stats.rejected}</div>
          </div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <h3>Cancelled</h3>
            <div className="stat-value">{stats.cancelled}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>📊 Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
              <option value="cancelled">🚫 Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>💳 Mode:</label>
            <select 
              value={filterMode} 
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="bank">🏦 Bank Transfer</option>
              <option value="upi">📱 UPI</option>
            </select>
          </div>

          <div className="filter-group">
            <label>📅 Date:</label>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>🔍 Search:</label>
            <input
              type="text"
              placeholder="Search by name, email, mobile, ID, amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        <p>📊 Showing <strong>{filteredRequests.length}</strong> of <strong>{requests.length}</strong> requests</p>
      </div>

      {/* Requests Table */}
      <div className="requests-table-container">
        {filteredRequests.length > 0 ? (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>🔢 Transaction ID</th>
                  <th>👤 User Details</th>
                  <th>💰 Amount</th>
                  <th>💳 Mode</th>
                  <th>📊 Status</th>
                  <th>📅 Requested Date</th>
                  <th>⚡ Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="transaction-id">
                        <span className="id-badge">{request.id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="user-details">
                        <div className="user-name">👤 {request.userDetails?.name || 'N/A'}</div>
                        <div className="user-email">📧 {request.userDetails?.email || 'N/A'}</div>
                        <div className="user-mobile">📱 {request.userDetails?.mobile || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="amount">₹{parseFloat(request.amount).toLocaleString()}</div>
                    </td>
                    <td>
                      <div className="mode-badge">
                        {request.mode === 'bank' ? '🏦' : '📱'} {request.mode?.toUpperCase() || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(request.status) }}
                      >
                        {request.status === 'pending' && '⏳'}
                        {request.status === 'approved' && '✅'}
                        {request.status === 'rejected' && '❌'}
                        {request.status === 'cancelled' && '🚫'}
                        {' ' + request.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="date">
                        <div className="date-text">📅 {formatDate(request.requestedAt)}</div>
                        <small className="time-text">🕐 {formatTime(request.requestedAt)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-view"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                        >
                          👁️ View
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => approveRequest(request.id)}
                              disabled={isProcessing}
                            >
                              ✅ Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => rejectRequest(request.id)}
                              disabled={isProcessing}
                            >
                              ❌ Reject
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={() => cancelRequest(request.id)}
                              disabled={isProcessing}
                            >
                              🚫 Cancel
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
        ) : (
          <div className="no-requests">
            <div className="no-requests-icon">📭</div>
            <p>No withdrawal requests found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Request Details Modal */}
      {showModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>💳 Withdrawal Request Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="request-details">
                <div className="details-section">
                  <h4>📊 Transaction Information</h4>
                  <div className="detail-row">
                    <span>Transaction ID:</span>
                    <span className="detail-value">{selectedRequest.id}</span>
                  </div>
                  <div className="detail-row">
                    <span>Amount:</span>
                    <span className="detail-value amount-highlight">₹{parseFloat(selectedRequest.amount).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Mode:</span>
                    <span className="detail-value">
                      {selectedRequest.mode === 'bank' ? '🏦' : '📱'} {selectedRequest.mode?.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <span 
                      className="status-badge detail-value"
                      style={{ backgroundColor: getStatusColor(selectedRequest.status) }}
                    >
                      {selectedRequest.status === 'pending' && '⏳'}
                      {selectedRequest.status === 'approved' && '✅'}
                      {selectedRequest.status === 'rejected' && '❌'}
                      {selectedRequest.status === 'cancelled' && '🚫'}
                      {' ' + selectedRequest.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Requested Date:</span>
                    <span className="detail-value">
                      📅 {formatDate(selectedRequest.requestedAt)} 🕐 {formatTime(selectedRequest.requestedAt)}
                    </span>
                  </div>
                  {selectedRequest.processedAt && (
                    <div className="detail-row">
                      <span>Processed Date:</span>
                      <span className="detail-value">
                        📅 {formatDate(selectedRequest.processedAt)} 🕐 {formatTime(selectedRequest.processedAt)}
                      </span>
                    </div>
                  )}
                  {selectedRequest.rejectionReason && (
                    <div className="detail-row">
                      <span>Rejection Reason:</span>
                      <span className="detail-value rejection-reason">{selectedRequest.rejectionReason}</span>
                    </div>
                  )}
                </div>

                <div className="details-section">
                  <h4>👤 User Information</h4>
                  <div className="detail-row">
                    <span>Name:</span>
                    <span className="detail-value">{selectedRequest.userDetails?.name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Email:</span>
                    <span className="detail-value">{selectedRequest.userDetails?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span>Mobile:</span>
                    <span className="detail-value">{selectedRequest.userDetails?.mobile || 'N/A'}</span>
                  </div>
                  {selectedRequest.userDetails?.totalEarnings && (
                    <div className="detail-row">
                      <span>Total Earnings:</span>
                      <span className="detail-value amount-highlight">₹{parseFloat(selectedRequest.userDetails.totalEarnings).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="details-section">
                  <h4>💳 Payment Details</h4>
                  {selectedRequest.mode === 'bank' && selectedRequest.bankDetails && (
                    <>
                      <div className="detail-row">
                        <span>Account Holder:</span>
                        <span className="detail-value">{selectedRequest.bankDetails.accountHolderName}</span>
                      </div>
                      <div className="detail-row">
                        <span>Account Number:</span>
                        <span className="detail-value">****{selectedRequest.bankDetails.accountNumber.slice(-4)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Bank Name:</span>
                        <span className="detail-value">{selectedRequest.bankDetails.bankName}</span>
                      </div>
                      <div className="detail-row">
                        <span>Branch:</span>
                        <span className="detail-value">{selectedRequest.bankDetails.branchName}</span>
                      </div>
                      <div className="detail-row">
                        <span>IFSC Code:</span>
                        <span className="detail-value">{selectedRequest.bankDetails.ifscCode}</span>
                      </div>
                      <div className="detail-row">
                        <span>Account Type:</span>
                        <span className="detail-value">{selectedRequest.bankDetails.accountType?.toUpperCase()}</span>
                      </div>
                    </>
                  )}
                  {selectedRequest.mode === 'upi' && selectedRequest.upiDetails && (
                    <>
                      <div className="detail-row">
                        <span>UPI ID:</span>
                        <span className="detail-value">{selectedRequest.upiDetails.upiId}</span>
                      </div>
                      <div className="detail-row">
                        <span>UPI Name:</span>
                        <span className="detail-value">{selectedRequest.upiDetails.upiName}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="modal-actions">
                  <button
                    className="btn-approve modal-btn"
                    onClick={() => approveRequest(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Processing...' : '✅ Approve Request'}
                  </button>
                  <button
                    className="btn-reject modal-btn"
                    onClick={() => rejectRequest(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Processing...' : '❌ Reject Request'}
                  </button>
                  <button
                    className="btn-cancel modal-btn"
                    onClick={() => cancelRequest(selectedRequest.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Processing...' : '🚫 Cancel Request'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawRequests;
