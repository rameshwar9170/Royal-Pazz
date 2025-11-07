import React, { useState, useEffect } from 'react';
import { auth, database } from '../firebase/config';
import { ref, set, get, update, push, serverTimestamp, runTransaction } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import './WithdrawMoney.css';


const WithdrawMoney = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [withdrawalMode, setWithdrawalMode] = useState('bank');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [withdrawableAmount, setWithdrawableAmount] = useState(0);
  const [tdsSettings, setTdsSettings] = useState({ enabled: false, percentage: 0 });

  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountHolderName: '',
    accountType: 'savings'
  });

  const [upiForm, setUpiForm] = useState({
    upiId: '',
    upiName: ''
  });

  const [errors, setErrors] = useState({});

  const cleanObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(v => (v && typeof v === 'object') ? cleanObject(v) : v);
    } else if (obj && typeof obj === 'object') {
      const result = {};
      for (const key in obj) {
        if (obj[key] !== undefined && obj[key] !== null) {
          result[key] = (typeof obj[key] === 'object') ? cleanObject(obj[key]) : obj[key];
        }
      }
      return result;
    }
    return obj;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserData(user.uid);
        fetchTransactions(user.uid);
        fetchTdsSettings();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchTdsSettings = async () => {
    try {
      const tdsRef = ref(database, 'HTAMS/settings/tds');
      const snapshot = await get(tdsRef);
      if (snapshot.exists()) {
        setTdsSettings(snapshot.val());
      }
    } catch (error) {
      console.error('Error fetching TDS settings:', error);
    }
  };

  const fetchUserData = async (uid) => {
    try {
      const userRef = ref(database, `HTAMS/users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData(data);
        
        // Withdrawable Amount = Current MySales balance
        const currentBalance = parseFloat(data.MySales || 0);
        setWithdrawableAmount(currentBalance);
        
        const bankRef = ref(database, `HTAMS/users/${uid}/bankDetails`);
        const bankSnapshot = await get(bankRef);
        if (bankSnapshot.exists()) {
          setBankDetails(bankSnapshot.val());
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (uid) => {
    try {
      const transactionsRef = ref(database, `HTAMS/users/${uid}/transactions`);
      const snapshot = await get(transactionsRef);
      if (snapshot.exists()) {
        const transactionsData = snapshot.val();
        const transactionsArray = Object.entries(transactionsData).map(([id, data]) => ({
          id,
          ...data
        })).sort((a, b) => b.timestamp - a.timestamp);
        
        setTransactions(transactionsArray);
        
        const totalWithdrawnAmount = transactionsArray
          .filter(t => t.status === 'approved' && t.type === 'withdrawal')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        const pendingWithdrawalsAmount = transactionsArray
          .filter(t => t.status === 'pending' && t.type === 'withdrawal')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        setTotalWithdrawn(totalWithdrawnAmount);
        setPendingWithdrawals(pendingWithdrawalsAmount);
      } else {
        setTransactions([]);
        setTotalWithdrawn(0);
        setPendingWithdrawals(0);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
      setTotalWithdrawn(0);
      setPendingWithdrawals(0);
    }
  };

  useEffect(() => {
    if (userData && userData.MySales !== undefined) {
      const currentBalance = parseFloat(userData.MySales || 0);
      setWithdrawableAmount(currentBalance);
    }
  }, [userData]);

  const validateBankForm = () => {
    const newErrors = {};
    
    if (!bankForm.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{9,18}$/.test(bankForm.accountNumber)) {
      newErrors.accountNumber = 'Account number must be 9-18 digits';
    }

    if (!bankForm.confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = 'Please confirm account number';
    } else if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!bankForm.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode.toUpperCase())) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    if (!bankForm.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!bankForm.branchName.trim()) {
      newErrors.branchName = 'Branch name is required';
    }

    if (!bankForm.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    } else if (!/^[a-zA-Z\s]+$/.test(bankForm.accountHolderName)) {
      newErrors.accountHolderName = 'Account holder name should contain only letters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUpiForm = () => {
    const newErrors = {};
    
    if (!upiForm.upiId.trim()) {
      newErrors.upiId = 'UPI ID is required';
    } else if (!/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiForm.upiId)) {
      newErrors.upiId = 'Invalid UPI ID format';
    }

    if (!upiForm.upiName.trim()) {
      newErrors.upiName = 'UPI registered name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateWithdrawalAmount = () => {
    const newErrors = {};
    const amount = parseFloat(withdrawalAmount);

    if (!withdrawalAmount.trim()) {
      newErrors.withdrawalAmount = 'Withdrawal amount is required';
    } else if (isNaN(amount) || amount <= 0) {
      newErrors.withdrawalAmount = 'Please enter a valid amount';
    } else if (amount < 100) {
      newErrors.withdrawalAmount = 'Minimum withdrawal amount is ₹100';
    } else if (amount > withdrawableAmount) {
      newErrors.withdrawalAmount = `Insufficient withdrawable balance. Available: ₹${withdrawableAmount.toLocaleString()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveBankDetails = async () => {
    if (!validateBankForm()) return;

    try {
      setIsSubmitting(true);
      const bankDetailsData = {
        ...bankForm,
        ifscCode: bankForm.ifscCode.toUpperCase(),
        addedAt: Date.now(),
        verified: false
      };

      await set(ref(database, `HTAMS/users/${currentUser.uid}/bankDetails`), bankDetailsData);
      setBankDetails(bankDetailsData);
      setShowBankForm(false);
      alert('Bank details saved successfully!');
    } catch (error) {
      console.error('Error saving bank details:', error);
      alert('Error saving bank details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveUpiDetails = async () => {
    if (!validateUpiForm()) return;

    try {
      setIsSubmitting(true);
      const upiDetailsData = {
        ...upiForm,
        addedAt: Date.now(),
        verified: false
      };

      await set(ref(database, `HTAMS/users/${currentUser.uid}/upiDetails`), upiDetailsData);
      setBankDetails({ ...bankDetails, upi: upiDetailsData });
      alert('UPI details saved successfully!');
    } catch (error) {
      console.error('Error saving UPI details:', error);
      alert('Error saving UPI details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitWithdrawalRequest = async () => {
    if (!validateWithdrawalAmount()) return;

    try {
      setIsSubmitting(true);
      const grossAmount = parseFloat(withdrawalAmount);
      const userId = currentUser.uid;

      // Calculate TDS if enabled
      let tdsAmount = 0;
      let netAmount = grossAmount;
      
      if (tdsSettings.enabled && tdsSettings.percentage > 0) {
        tdsAmount = (grossAmount * tdsSettings.percentage) / 100;
        netAmount = grossAmount - tdsAmount;
      }

      // DEDUCT GROSS AMOUNT IMMEDIATELY FROM WALLET
      const userRef = ref(database, `HTAMS/users/${userId}`);
      
      let newBalance = 0;
      let currentMySales = 0;
      
      await runTransaction(userRef, (userData) => {
        if (userData) {
          currentMySales = parseFloat(userData.MySales || 0);
          
          if (currentMySales < grossAmount) {
            throw new Error('Insufficient balance');
          }
          
          newBalance = currentMySales - grossAmount;
          userData.MySales = newBalance;
          userData.lastUpdated = Date.now();
          
          return userData;
        }
        return userData;
      });

      // Prepare transaction data with TDS details
      let transactionData = {
        amount: grossAmount,
        grossAmount: grossAmount,
        tdsApplied: tdsSettings.enabled,
        tdsPercentage: tdsSettings.percentage,
        tdsAmount: tdsAmount,
        netAmount: netAmount,
        type: 'withdrawal',
        mode: withdrawalMode,
        status: 'pending',
        requestedAt: Date.now(),
        timestamp: serverTimestamp(),
        deductedFromWallet: true,
        alreadyDeducted: true, // FLAG: Amount already deducted
        previousBalance: currentMySales,
        newBalance: newBalance,
        userDetails: {
          name: userData?.name || '',
          mobile: userData?.mobile || userData?.phone || '',
          email: userData?.email || '',
          totalEarnings: currentMySales,
          previousWithdrawn: totalWithdrawn || 0,
          previousPending: pendingWithdrawals || 0
        }
      };

      if (withdrawalMode === 'bank' && bankDetails) {
        transactionData.bankDetails = cleanObject(bankDetails);
      }
      if (withdrawalMode === 'upi' && bankDetails?.upi) {
        transactionData.upiDetails = cleanObject(bankDetails.upi);
      }

      transactionData = cleanObject(transactionData);

      const newTransactionRef = push(ref(database, 'HTAMS/transactions'));
      const newTransactionId = newTransactionRef.key;

      const updates = {};
      updates[`HTAMS/transactions/${newTransactionId}`] = {
        ...transactionData,
        id: newTransactionId,
        userId
      };
      updates[`HTAMS/users/${userId}/transactions/${newTransactionId}`] = {
        ...transactionData,
        id: newTransactionId
      };

      await update(ref(database), updates);

      setWithdrawalAmount('');
      await fetchUserData(userId);
      await fetchTransactions(userId);

      alert(`Withdrawal request submitted successfully! ₹${grossAmount.toLocaleString()} has been deducted from your wallet.`);
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      if (error.message === 'Insufficient balance') {
        alert('Insufficient wallet balance. Please check your available balance.');
      } else {
        alert('Error submitting withdrawal request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelWithdrawalRequest = async (transactionId) => {
    if (!window.confirm('Are you sure you want to cancel this withdrawal request? The amount will be refunded to your wallet.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      const transaction = transactions.find(t => t.id === transactionId);
      
      if (transaction && transaction.status === 'pending') {
        const refundAmount = parseFloat(transaction.amount);
        const userId = currentUser.uid;

        // REFUND AMOUNT BACK TO WALLET
        const userRef = ref(database, `HTAMS/users/${userId}`);
        
        await runTransaction(userRef, (userData) => {
          if (userData) {
            const currentMySales = parseFloat(userData.MySales || 0);
            userData.MySales = currentMySales + refundAmount;
            userData.lastUpdated = Date.now();
            return userData;
          }
          return userData;
        });

        await update(ref(database, `HTAMS/users/${userId}/transactions/${transactionId}`), {
          status: 'cancelled',
          cancelledAt: Date.now(),
          refundedToWallet: true
        });

        await update(ref(database, `HTAMS/transactions/${transactionId}`), {
          status: 'cancelled',
          cancelledAt: Date.now(),
          refundedToWallet: true
        });

        await fetchUserData(userId);
        await fetchTransactions(userId);

        alert(`Withdrawal request cancelled successfully! ₹${refundAmount.toLocaleString()} has been refunded to your wallet.`);
      }
    } catch (error) {
      console.error('Error cancelling withdrawal request:', error);
      alert('Error cancelling withdrawal request. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  if (loading) {
    return <div className="withdraw-loading">Loading...</div>;
  }

  if (!currentUser || !userData) {
    return <div className="withdraw-error">Please log in to access this page.</div>;
  }

  const totalEarnings = parseFloat(userData.MySales || 0);

  return (
    <div className="withdraw-container">
      <div className="withdraw-header">
        <h1>Withdraw Money</h1>
        
        <div className="earnings-summary">
          <div className="summary-card total-earnings">
            <h3>Total Earnings</h3>
            <div className="amount">₹{totalEarnings.toLocaleString()}</div>
            <small>From MySales</small>
          </div>
          
          <div className="summary-card total-withdrawn">
            <h3>Total Withdrawn</h3>
            <div className="amount">₹{totalWithdrawn.toLocaleString()}</div>
            <small>Approved withdrawals</small>
          </div>
          
          <div className="summary-card pending-withdrawals">
            <h3>Pending Withdrawals</h3>
            <div className="amount">₹{pendingWithdrawals.toLocaleString()}</div>
            <small>Under review</small>
          </div>
          
          <div className="summary-card withdrawable-amount">
            <h3>Withdrawable Amount</h3>
            <div className="amount highlighted">₹{withdrawableAmount.toLocaleString()}</div>
            <small>Available for withdrawal</small>
          </div>
        </div>

        <div className="balance-breakdown">
          <h4>Balance Breakdown</h4>
          <div className="breakdown-details">
            <div className="breakdown-item">
              <span>Total Earnings (MySales):</span>
              <span>₹{totalEarnings.toLocaleString()}</span>
            </div>
            <div className="breakdown-item subtract">
              <span>- Total Withdrawn:</span>
              <span>₹{totalWithdrawn.toLocaleString()}</span>
            </div>
            <div className="breakdown-item subtract">
              <span>- Pending Withdrawals:</span>
              <span>₹{pendingWithdrawals.toLocaleString()}</span>
            </div>
            <div className="breakdown-item total">
              <span><strong>= Available for Withdrawal:</strong></span>
              <span><strong>₹{withdrawableAmount.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {!bankDetails && (
        <div className="bank-details-prompt">
          <div className="prompt-content">
            <h3>Add Bank Details</h3>
            <p>Please add your bank details to proceed with withdrawals</p>
            <button 
              className="btn-primary"
              onClick={() => setShowBankForm(true)}
            >
              Add Bank Details
            </button>
          </div>
        </div>
      )}

      {showBankForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Bank Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBankForm(false)}
              >
                ×
              </button>
            </div>
            <div className="form-container">
              <div className="form-group">
                <label>Account Number *</label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Enter account number"
                  className={errors.accountNumber ? 'error' : ''}
                />
                {errors.accountNumber && <span className="error-text">{errors.accountNumber}</span>}
              </div>

              <div className="form-group">
                <label>Confirm Account Number *</label>
                <input
                  type="text"
                  value={bankForm.confirmAccountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Re-enter account number"
                  className={errors.confirmAccountNumber ? 'error' : ''}
                />
                {errors.confirmAccountNumber && <span className="error-text">{errors.confirmAccountNumber}</span>}
              </div>

              <div className="form-group">
                <label>IFSC Code *</label>
                <input
                  type="text"
                  value={bankForm.ifscCode}
                  onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                  placeholder="Enter IFSC code"
                  className={errors.ifscCode ? 'error' : ''}
                />
                {errors.ifscCode && <span className="error-text">{errors.ifscCode}</span>}
              </div>

              <div className="form-group">
                <label>Bank Name *</label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="Enter bank name"
                  className={errors.bankName ? 'error' : ''}
                />
                {errors.bankName && <span className="error-text">{errors.bankName}</span>}
              </div>

              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  type="text"
                  value={bankForm.branchName}
                  onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                  placeholder="Enter branch name"
                  className={errors.branchName ? 'error' : ''}
                />
                {errors.branchName && <span className="error-text">{errors.branchName}</span>}
              </div>

              <div className="form-group">
                <label>Account Holder Name *</label>
                <input
                  type="text"
                  value={bankForm.accountHolderName}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                  placeholder="Enter account holder name"
                  className={errors.accountHolderName ? 'error' : ''}
                />
                {errors.accountHolderName && <span className="error-text">{errors.accountHolderName}</span>}
              </div>

              <div className="form-group">
                <label>Account Type *</label>
                <select
                  value={bankForm.accountType}
                  onChange={(e) => setBankForm({ ...bankForm, accountType: e.target.value })}
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowBankForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveBankDetails}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bankDetails && withdrawableAmount > 0 && (
        <div className="withdrawal-form">
          <h3>Create Withdrawal Request</h3>
          
          <div className="payment-modes">
            <div className="mode-selector">
              <button
                className={`mode-btn ${withdrawalMode === 'bank' ? 'active' : ''}`}
                onClick={() => setWithdrawalMode('bank')}
              >
                Bank Transfer
              </button>
              <button
                className={`mode-btn ${withdrawalMode === 'upi' ? 'active' : ''}`}
                onClick={() => setWithdrawalMode('upi')}
              >
                UPI
              </button>
            </div>
          </div>

          {withdrawalMode === 'upi' && !bankDetails?.upi && (
            <div className="upi-form">
              <h4>Add UPI Details</h4>
              <div className="form-group">
                <label>UPI ID *</label>
                <input
                  type="text"
                  value={upiForm.upiId}
                  onChange={(e) => setUpiForm({ ...upiForm, upiId: e.target.value.toLowerCase() })}
                  placeholder="example@paytm"
                  className={errors.upiId ? 'error' : ''}
                />
                {errors.upiId && <span className="error-text">{errors.upiId}</span>}
              </div>

              <div className="form-group">
                <label>UPI Registered Name *</label>
                <input
                  type="text"
                  value={upiForm.upiName}
                  onChange={(e) => setUpiForm({ ...upiForm, upiName: e.target.value })}
                  placeholder="Enter name as per UPI"
                  className={errors.upiName ? 'error' : ''}
                />
                {errors.upiName && <span className="error-text">{errors.upiName}</span>}
              </div>

              <button
                className="btn-secondary"
                onClick={saveUpiDetails}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save UPI Details'}
              </button>
            </div>
          )}

          {((withdrawalMode === 'bank') || (withdrawalMode === 'upi' && bankDetails?.upi)) && (
            <div className="withdrawal-amount-section">
              <div className="form-group">
                <label>Withdrawal Amount *</label>
                <div className="amount-input-group">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="100"
                    max={withdrawableAmount}
                    className={errors.withdrawalAmount ? 'error' : ''}
                  />
                </div>
                {errors.withdrawalAmount && <span className="error-text">{errors.withdrawalAmount}</span>}
                <small className="helper-text">
                  Minimum: ₹100 | Maximum: ₹{withdrawableAmount.toLocaleString()}
                </small>
                
                {/* TDS Information */}
                {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && tdsSettings.enabled && (
                  <div className="tds-info-box" style={{
                    marginTop: '15px',
                    padding: '15px',
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#92400e' }}>
                      💰 TDS Calculation
                    </h4>
                    <div style={{ fontSize: '13px', color: '#78350f' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Gross Amount:</span>
                        <strong>₹{parseFloat(withdrawalAmount).toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#f59e0b' }}>
                        <span>TDS ({tdsSettings.percentage}%):</span>
                        <strong>- ₹{((parseFloat(withdrawalAmount) * tdsSettings.percentage) / 100).toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #fbbf24', color: '#10b981', fontSize: '15px' }}>
                        <span><strong>Net Amount (You will receive):</strong></span>
                        <strong>₹{(parseFloat(withdrawalAmount) - (parseFloat(withdrawalAmount) * tdsSettings.percentage) / 100).toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="quick-amounts">
                {[1000, 5000, 10000, Math.min(25000, withdrawableAmount)].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className="quick-amount-btn"
                    onClick={() => setWithdrawalAmount(amount.toString())}
                    disabled={amount > withdrawableAmount}
                  >
                    ₹{amount.toLocaleString()}
                  </button>
                ))}
                {withdrawableAmount > 25000 && (
                  <button
                    type="button"
                    className="quick-amount-btn"
                    onClick={() => setWithdrawalAmount(withdrawableAmount.toString())}
                  >
                    Max (₹{withdrawableAmount.toLocaleString()})
                  </button>
                )}
              </div>

              <div className="account-details">
                <h4>Transfer Details</h4>
                {withdrawalMode === 'bank' && (
                  <div className="details-card">
                    <p><strong>Account Holder:</strong> {bankDetails.accountHolderName}</p>
                    <p><strong>Account Number:</strong> ****{bankDetails.accountNumber.slice(-4)}</p>
                    <p><strong>Bank:</strong> {bankDetails.bankName}</p>
                    <p><strong>IFSC:</strong> {bankDetails.ifscCode}</p>
                  </div>
                )}
                {withdrawalMode === 'upi' && bankDetails?.upi && (
                  <div className="details-card">
                    <p><strong>UPI ID:</strong> {bankDetails.upi.upiId}</p>
                    <p><strong>Name:</strong> {bankDetails.upi.upiName}</p>
                  </div>
                )}
              </div>

              <button
                className="btn-primary withdrawal-submit"
                onClick={submitWithdrawalRequest}
                disabled={isSubmitting || !withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > withdrawableAmount}
              >
                {isSubmitting ? 'Processing...' : (
                  tdsSettings.enabled && withdrawalAmount && parseFloat(withdrawalAmount) > 0
                    ? `Submit Request (Net: ₹${(parseFloat(withdrawalAmount) - (parseFloat(withdrawalAmount) * tdsSettings.percentage) / 100).toLocaleString()})`
                    : 'Submit Withdrawal Request'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {bankDetails && withdrawableAmount <= 0 && (
        <div className="no-withdrawable-amount">
          <div className="info-card">
            <h3>No Withdrawable Amount</h3>
            <p>You have already withdrawn or requested all available earnings.</p>
            <div className="breakdown">
              <p><strong>Total Earnings:</strong> ₹{totalEarnings.toLocaleString()}</p>
              <p><strong>Total Withdrawn:</strong> ₹{totalWithdrawn.toLocaleString()}</p>
              <p><strong>Pending Withdrawals:</strong> ₹{pendingWithdrawals.toLocaleString()}</p>
              <p><strong>Available Balance:</strong> ₹{withdrawableAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div className="transaction-history">
        <div className="history-header">
          <h3>Transaction History</h3>
          <button 
            className="btn-secondary"
            onClick={() => fetchTransactions(currentUser.uid)}
          >
            Refresh
          </button>
        </div>

        {transactions.length > 0 ? (
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-amount">
                    ₹{parseFloat(transaction.amount).toLocaleString()}
                  </div>
                  <div className="transaction-details">
                    <p><strong>Mode:</strong> {transaction.mode?.toUpperCase()}</p>
                    <p><strong>Date:</strong> {new Date(transaction.requestedAt).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> 
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(transaction.status) }}
                      >
                        {transaction.status?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="transaction-actions">
                  {transaction.status === 'pending' && (
                    <button
                      className="btn-danger"
                      onClick={() => cancelWithdrawalRequest(transaction.id)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setShowTransactionModal(true);
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-transactions">
            <p>No transactions found.</p>
          </div>
        )}
      </div>

      {showTransactionModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowTransactionModal(false)}
              >
                ×
              </button>
            </div>
            <div className="transaction-details-modal">
              <div className="detail-row">
                <span>Transaction ID:</span>
                <span>{selectedTransaction.id}</span>
              </div>
              <div className="detail-row">
                <span>Amount:</span>
                <span>₹{parseFloat(selectedTransaction.amount).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span>Mode:</span>
                <span>{selectedTransaction.mode?.toUpperCase()}</span>
              </div>
              <div className="detail-row">
                <span>Status:</span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(selectedTransaction.status) }}
                >
                  {selectedTransaction.status?.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <span>Requested Date:</span>
                <span>{new Date(selectedTransaction.requestedAt).toLocaleString()}</span>
              </div>
              {selectedTransaction.deductedFromWallet && (
                <div className="detail-row">
                  <span>Deducted from Wallet:</span>
                  <span>Yes</span>
                </div>
              )}
              {selectedTransaction.tdsApplied && (
                <>
                  <div className="detail-row">
                    <span>Gross Amount:</span>
                    <span style={{ fontWeight: '600' }}>₹{parseFloat(selectedTransaction.grossAmount || selectedTransaction.amount).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>TDS ({selectedTransaction.tdsPercentage}%):</span>
                    <span style={{ color: '#f59e0b', fontWeight: '600' }}>₹{parseFloat(selectedTransaction.tdsAmount).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span>Net Amount (After TDS):</span>
                    <span style={{ color: '#10b981', fontWeight: '700', fontSize: '16px' }}>₹{parseFloat(selectedTransaction.netAmount).toLocaleString()}</span>
                  </div>
                </>
              )}
              {selectedTransaction.approvedAt && (
                <div className="detail-row">
                  <span>Approved Date:</span>
                  <span>{new Date(selectedTransaction.approvedAt).toLocaleString()}</span>
                </div>
              )}
              {selectedTransaction.cancelledAt && (
                <div className="detail-row">
                  <span>Cancelled Date:</span>
                  <span>{new Date(selectedTransaction.cancelledAt).toLocaleString()}</span>
                </div>
              )}
              {selectedTransaction.refundedToWallet && (
                <div className="detail-row">
                  <span>Refunded to Wallet:</span>
                  <span>Yes</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawMoney;
