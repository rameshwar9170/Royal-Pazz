import React, { useState, useEffect } from 'react';
import { ref, push, onValue, get } from 'firebase/database';
import { database } from '../firebase/config';
import { FaWallet, FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const WithdrawRequest = () => {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolderName: ''
  });
  const [commissionBalance, setCommissionBalance] = useState(0);
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const user = JSON.parse(localStorage.getItem('htamsUser'));

  // Fetch user's commission balance and withdraw history
  useEffect(() => {
    if (user?.uid) {
      // Fetch commission balance
      const userRef = ref(database, `HTAMS/users/${user.uid}`);
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          const balance = userData.MySales || userData.mySales || userData.commissionBalance || userData.balance || 0;
          const numericBalance = typeof balance === 'string' ? parseFloat(balance) : Number(balance) || 0;
          setCommissionBalance(numericBalance);
        }
      });

      // Fetch withdraw history
      const withdrawRef = ref(database, `HTAMS/withdrawRequests/${user.uid}`);
      const unsubscribeWithdraw = onValue(withdrawRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const historyArray = Object.entries(data).map(([id, request]) => ({
            id,
            ...request
          })).sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
          setWithdrawHistory(historyArray);
        } else {
          setWithdrawHistory([]);
        }
      });

      return () => {
        unsubscribeUser();
        unsubscribeWithdraw();
      };
    }
  }, [user?.uid]);

  const validateForm = () => {
    const newErrors = {};

    // Validate withdraw amount
    const amount = parseFloat(withdrawAmount);
    if (!withdrawAmount) {
      newErrors.withdrawAmount = 'Amount is required';
    } else if (amount <= 0) {
      newErrors.withdrawAmount = 'Amount must be greater than 0';
    } else if (amount < 100) {
      newErrors.withdrawAmount = 'Minimum withdrawal amount is ₹100';
    } else if (amount > commissionBalance) {
      newErrors.withdrawAmount = 'Amount exceeds available balance';
    }

    // Validate bank details
    if (!bankDetails.accountNumber) {
      newErrors.accountNumber = 'Account number is required';
    } else if (bankDetails.accountNumber.length < 9 || bankDetails.accountNumber.length > 18) {
      newErrors.accountNumber = 'Account number must be 9-18 digits';
    }

    if (!bankDetails.ifscCode) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    if (!bankDetails.bankName) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!bankDetails.accountHolderName) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const withdrawData = {
        userId: user.uid,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
        amount: parseFloat(withdrawAmount),
        bankDetails: {
          accountNumber: bankDetails.accountNumber,
          ifscCode: bankDetails.ifscCode.toUpperCase(),
          bankName: bankDetails.bankName,
          accountHolderName: bankDetails.accountHolderName
        },
        requestDate: new Date().toISOString(),
        status: 'pending',
        requestId: `WR_${Date.now()}_${user.uid.slice(-6)}`
      };

      // Save withdraw request
      const withdrawRef = ref(database, `HTAMS/withdrawRequests/${user.uid}`);
      await push(withdrawRef, withdrawData);

      // Also save in admin panel for approval
      const adminWithdrawRef = ref(database, 'HTAMS/admin/withdrawRequests');
      await push(adminWithdrawRef, withdrawData);

      alert('Withdraw request submitted successfully! You will be notified once it\'s processed.');
      
      // Reset form
      setWithdrawAmount('');
      setBankDetails({
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        accountHolderName: ''
      });
      setErrors({});

    } catch (error) {
      console.error('Error submitting withdraw request:', error);
      alert('Failed to submit withdraw request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === 'withdrawAmount') {
      setWithdrawAmount(value);
    } else {
      setBankDetails(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="status-icon pending" />;
      case 'approved':
        return <FaCheckCircle className="status-icon approved" />;
      case 'rejected':
        return <FaTimesCircle className="status-icon rejected" />;
      default:
        return <FaClock className="status-icon pending" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="withdraw-request-container">
      <div className="page-header">
        <h1 className="page-title">
          <FaWallet className="title-icon" />
          Withdraw Request
        </h1>
        <p className="page-subtitle">Request withdrawal from your wallet balance</p>
      </div>

      <div className="balance-card">
        <div className="balance-info">
          <FaMoneyBillWave className="balance-icon" />
          <div>
            <h3>Available Balance</h3>
            <p className="balance-amount">₹{commissionBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="withdraw-form-card">
        <h2>New Withdraw Request</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Withdraw Amount (₹)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => handleInputChange('withdrawAmount', e.target.value)}
                placeholder="Enter amount"
                min="100"
                max={commissionBalance}
                disabled={loading}
              />
              {errors.withdrawAmount && <span className="error-text">{errors.withdrawAmount}</span>}
            </div>

            <div className="form-group">
              <label>Account Holder Name</label>
              <input
                type="text"
                value={bankDetails.accountHolderName}
                onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                placeholder="Enter account holder name"
                disabled={loading}
              />
              {errors.accountHolderName && <span className="error-text">{errors.accountHolderName}</span>}
            </div>

            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="Enter account number"
                disabled={loading}
              />
              {errors.accountNumber && <span className="error-text">{errors.accountNumber}</span>}
            </div>

            <div className="form-group">
              <label>IFSC Code</label>
              <input
                type="text"
                value={bankDetails.ifscCode}
                onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                placeholder="Enter IFSC code"
                maxLength="11"
                disabled={loading}
              />
              {errors.ifscCode && <span className="error-text">{errors.ifscCode}</span>}
            </div>

            <div className="form-group full-width">
              <label>Bank Name</label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                placeholder="Enter bank name"
                disabled={loading}
              />
              {errors.bankName && <span className="error-text">{errors.bankName}</span>}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading || commissionBalance < 100}>
            {loading ? 'Submitting...' : 'Submit Withdraw Request'}
          </button>
        </form>
      </div>

      <div className="history-card">
        <h2>Withdraw History</h2>
        {withdrawHistory.length > 0 ? (
          <div className="history-list">
            {withdrawHistory.map((request) => (
              <div key={request.id} className="history-item">
                <div className="request-info">
                  <div className="request-header">
                    <span className="request-id">{request.requestId}</span>
                    <div className="status-badge" style={{ backgroundColor: getStatusColor(request.status) }}>
                      {getStatusIcon(request.status)}
                      {request.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="request-details">
                    <p><strong>Amount:</strong> ₹{request.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p><strong>Date:</strong> {new Date(request.requestDate).toLocaleDateString('en-IN')}</p>
                    <p><strong>Account:</strong> {request.bankDetails?.accountNumber?.replace(/(.{4})/g, '$1 ')}</p>
                    <p><strong>Bank:</strong> {request.bankDetails?.bankName}</p>
                    {request.adminNote && (
                      <p><strong>Note:</strong> {request.adminNote}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-history">
            <p>No withdraw requests found</p>
          </div>
        )}
      </div>

      <style jsx="true">{`
        .withdraw-request-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: 100vh;
        }

        .page-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .page-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .title-icon {
          color: #6366f1;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 1.1rem;
        }

        .balance-card {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 30px;
          color: white;
        }

        .balance-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .balance-icon {
          font-size: 2rem;
          opacity: 0.9;
        }

        .balance-info h3 {
          margin: 0 0 8px 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .balance-amount {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .withdraw-form-card, .history-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 30px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .withdraw-form-card h2, .history-card h2 {
          margin: 0 0 24px 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .form-group input {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-group input:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }

        .error-text {
          color: #ef4444;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .submit-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .submit-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .history-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          background: #f8fafc;
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .request-id {
          font-weight: 600;
          color: #1e293b;
          font-family: monospace;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-icon {
          font-size: 0.875rem;
        }

        .request-details p {
          margin: 8px 0;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .no-history {
          text-align: center;
          padding: 40px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .withdraw-request-container {
            padding: 16px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .balance-amount {
            font-size: 1.5rem;
          }

          .request-header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default WithdrawRequest;
