import React, { useState, useEffect } from 'react';
import { ref, onValue, update, runTransaction } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaCheck, FaTimes, FaEye, FaClock, FaMoneyBillWave } from 'react-icons/fa';

const AdminWithdrawManager = () => {
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    const withdrawRef = ref(database, 'HTAMS/admin/withdrawRequests');
    const unsubscribe = onValue(withdrawRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsArray = Object.entries(data).map(([id, request]) => ({
          id,
          ...request
        })).sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
        setWithdrawRequests(requestsArray);
      } else {
        setWithdrawRequests([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (request) => {
    setLoading(true);
    try {
      // Deduct amount from user's commission balance
      const userRef = ref(database, `HTAMS/users/${request.userId}`);
      await runTransaction(userRef, (currentUserData) => {
        if (!currentUserData) return currentUserData;
        
        const currentBalance = Number(currentUserData.MySales) || 0;
        const newBalance = currentBalance - request.amount;
        
        return {
          ...currentUserData,
          MySales: newBalance.toString()
        };
      });

      // Update request status in admin panel
      const adminRequestRef = ref(database, `HTAMS/admin/withdrawRequests/${request.id}`);
      await update(adminRequestRef, {
        status: 'approved',
        approvedDate: new Date().toISOString(),
        adminNote: adminNote || 'Request approved',
        processedBy: 'admin'
      });

      // Update request status in user's history
      const userRequestRef = ref(database, `HTAMS/withdrawRequests/${request.userId}/${request.id}`);
      await update(userRequestRef, {
        status: 'approved',
        approvedDate: new Date().toISOString(),
        adminNote: adminNote || 'Request approved'
      });

      alert('Withdraw request approved successfully!');
      setSelectedRequest(null);
      setAdminNote('');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request) => {
    if (!adminNote.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      // Update request status in admin panel
      const adminRequestRef = ref(database, `HTAMS/admin/withdrawRequests/${request.id}`);
      await update(adminRequestRef, {
        status: 'rejected',
        rejectedDate: new Date().toISOString(),
        adminNote: adminNote,
        processedBy: 'admin'
      });

      // Update request status in user's history
      const userRequestRef = ref(database, `HTAMS/withdrawRequests/${request.userId}/${request.id}`);
      await update(userRequestRef, {
        status: 'rejected',
        rejectedDate: new Date().toISOString(),
        adminNote: adminNote
      });

      alert('Withdraw request rejected successfully!');
      setSelectedRequest(null);
      setAdminNote('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const pendingRequests = withdrawRequests.filter(req => req.status === 'pending');
  const processedRequests = withdrawRequests.filter(req => req.status !== 'pending');

  return (
    <div className="admin-withdraw-container">
      <div className="page-header">
        <h1>Withdraw Request Management</h1>
        <div className="stats">
          <div className="stat-card pending">
            <FaClock />
            <span>{pendingRequests.length} Pending</span>
          </div>
          <div className="stat-card total">
            <FaMoneyBillWave />
            <span>{withdrawRequests.length} Total</span>
          </div>
        </div>
      </div>

      <div className="requests-section">
        <h2>Pending Requests</h2>
        {pendingRequests.length > 0 ? (
          <div className="requests-grid">
            {pendingRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <span className="request-id">{request.requestId}</span>
                  <span className="amount">₹{request.amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="request-details">
                  <p><strong>User:</strong> {request.userName}</p>
                  <p><strong>Date:</strong> {new Date(request.requestDate).toLocaleDateString('en-IN')}</p>
                  <p><strong>Bank:</strong> {request.bankDetails?.bankName}</p>
                  <p><strong>Account:</strong> {request.bankDetails?.accountNumber}</p>
                </div>
                <div className="request-actions">
                  <button 
                    className="view-btn"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <FaEye /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requests">No pending requests</div>
        )}
      </div>

      <div className="requests-section">
        <h2>Processed Requests</h2>
        {processedRequests.length > 0 ? (
          <div className="requests-list">
            {processedRequests.map((request) => (
              <div key={request.id} className="processed-request">
                <div className="request-info">
                  <span className="request-id">{request.requestId}</span>
                  <span className="user-name">{request.userName}</span>
                  <span className="amount">₹{request.amount?.toLocaleString('en-IN')}</span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(request.status) }}
                  >
                    {request.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requests">No processed requests</div>
        )}
      </div>

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdraw Request Details</h3>
              <button onClick={() => setSelectedRequest(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Request ID:</label>
                  <span>{selectedRequest.requestId}</span>
                </div>
                <div className="detail-item">
                  <label>Amount:</label>
                  <span>₹{selectedRequest.amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="detail-item">
                  <label>User Name:</label>
                  <span>{selectedRequest.userName}</span>
                </div>
                <div className="detail-item">
                  <label>User Email:</label>
                  <span>{selectedRequest.userEmail}</span>
                </div>
                <div className="detail-item">
                  <label>Request Date:</label>
                  <span>{new Date(selectedRequest.requestDate).toLocaleString('en-IN')}</span>
                </div>
                <div className="detail-item">
                  <label>Account Holder:</label>
                  <span>{selectedRequest.bankDetails?.accountHolderName}</span>
                </div>
                <div className="detail-item">
                  <label>Account Number:</label>
                  <span>{selectedRequest.bankDetails?.accountNumber}</span>
                </div>
                <div className="detail-item">
                  <label>IFSC Code:</label>
                  <span>{selectedRequest.bankDetails?.ifscCode}</span>
                </div>
                <div className="detail-item">
                  <label>Bank Name:</label>
                  <span>{selectedRequest.bankDetails?.bankName}</span>
                </div>
              </div>

              <div className="admin-note-section">
                <label>Admin Note:</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note (required for rejection)"
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="approve-btn"
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={loading}
                >
                  <FaCheck /> Approve
                </button>
                <button 
                  className="reject-btn"
                  onClick={() => handleReject(selectedRequest)}
                  disabled={loading || !adminNote.trim()}
                >
                  <FaTimes /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .admin-withdraw-container {
          padding: 20px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stats {
          display: flex;
          gap: 16px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
        }

        .stat-card.pending {
          background: #f59e0b;
        }

        .stat-card.total {
          background: #6366f1;
        }

        .requests-section {
          margin-bottom: 40px;
        }

        .requests-section h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 20px;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .request-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .request-id {
          font-family: monospace;
          font-weight: 600;
          color: #6366f1;
        }

        .amount {
          font-size: 1.25rem;
          font-weight: 700;
          color: #10b981;
        }

        .request-details p {
          margin: 8px 0;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .request-actions {
          margin-top: 16px;
        }

        .view-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
        }

        .requests-list {
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }

        .processed-request {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .request-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .no-requests {
          text-align: center;
          padding: 40px;
          color: #64748b;
          background: white;
          border-radius: 12px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-header button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #64748b;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .detail-item span {
          color: #1e293b;
        }

        .admin-note-section {
          margin-bottom: 24px;
        }

        .admin-note-section label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .admin-note-section textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .approve-btn, .reject-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .approve-btn {
          background: #10b981;
          color: white;
        }

        .reject-btn {
          background: #ef4444;
          color: white;
        }

        .approve-btn:disabled, .reject-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .requests-grid {
            grid-template-columns: 1fr;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .request-info {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminWithdrawManager;
