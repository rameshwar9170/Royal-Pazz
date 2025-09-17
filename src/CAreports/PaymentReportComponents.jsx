// Enhanced Payment Report Components for CA Dashboard
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { toast } from 'react-toastify';

// Enhanced Styling Component
const PaymentReportStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      /* Enhanced Payment Reports Styling */
      .payment-reports-container {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        min-height: 100vh;
        padding: 1.5rem;
      }

      .page-header {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 16px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 1.5rem;
      }

      .page-header h2 {
        font-size: 2rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 0.5rem 0;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .page-header p {
        color: #64748b;
        font-size: 1rem;
        margin: 0;
        font-weight: 400;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .date-filters {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        background: rgba(255, 255, 255, 0.8);
        padding: 0.75rem 1rem;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        backdrop-filter: blur(10px);
      }

      .date-filters input {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.875rem;
        background: white;
        transition: all 0.3s ease;
        min-width: 140px;
      }

      .date-filters input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .date-filters span {
        color: #6b7280;
        font-weight: 500;
        font-size: 0.875rem;
      }

      .export-btn, .action-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 0.75rem 1.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .export-btn:hover, .action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
      }

      .summary-card {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .summary-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
      }

      .summary-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
      }

      .summary-card .summary-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        display: block;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
      }

      .summary-card h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #64748b;
        margin: 0 0 0.5rem 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .summary-value {
        font-size: 2rem;
        font-weight: 800;
        color: #1e293b;
        margin: 0;
        line-height: 1.2;
      }

      .table-container {
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        margin: 2rem 0;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        background: transparent;
      }

      .data-table thead {
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      }

      .data-table th {
        padding: 1.25rem 1rem;
        text-align: left;
        font-weight: 700;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.75rem;
        border-bottom: 2px solid #e2e8f0;
      }

      .data-table td {
        padding: 1.25rem 1rem;
        border-bottom: 1px solid #f1f5f9;
        color: #374151;
        vertical-align: top;
      }

      .data-table tbody tr {
        transition: all 0.3s ease;
      }

      .data-table tbody tr:hover {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
        transform: scale(1.01);
      }

      .user-info, .sale-info, .commission-info, .tax-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .user-info strong, .sale-info strong, .commission-info strong, .tax-info strong {
        color: #1e293b;
        font-weight: 600;
        font-size: 0.875rem;
      }

      .user-info small, .sale-info small, .commission-info small, .tax-info small {
        color: #64748b;
        font-size: 0.75rem;
        font-weight: 400;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.375rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
        letter-spacing: 0.025em;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .status-badge.completed, .status-badge.approved {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }

      .status-badge.pending {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }

      .status-badge.cancelled, .status-badge.rejected {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }

      .net-payout {
        color: #10b981;
        font-weight: 700;
        font-size: 1rem;
      }

      .loading-spinner {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 4rem;
        font-size: 1.125rem;
        color: #64748b;
      }

      .loading-spinner::before {
        content: '';
        width: 32px;
        height: 32px;
        border: 3px solid #e2e8f0;
        border-top: 3px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .year-selector {
        padding: 0.75rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 12px;
        font-size: 0.875rem;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        color: #374151;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 120px;
      }

      .year-selector:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .commission-amount {
        color: #3b82f6;
        font-weight: 700;
      }

      .gst-amount {
        color: #f59e0b;
        font-weight: 600;
      }

      .tds-amount {
        color: #ef4444;
        font-weight: 600;
      }

      .quarter-header {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        font-weight: 700;
      }

      @media (max-width: 768px) {
        .page-header {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }

        .header-actions {
          justify-content: center;
        }

        .date-filters {
          flex-direction: column;
          gap: 0.5rem;
        }

        .summary-cards {
          grid-template-columns: 1fr;
        }

        .data-table {
          font-size: 0.75rem;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem 0.5rem;
        }
      }

      /* Custom scrollbar */
      .table-container::-webkit-scrollbar {
        height: 8px;
      }

      .table-container::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 4px;
      }

      .table-container::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 4px;
      }

      .table-container::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #2563eb, #1e40af);
      }
    `
  }} />
);

// Commission Reports Tab - Most Important for CA
export const CommissionReportsTab = ({ formatCurrency, openModal }) => {
  const [commissionData, setCommissionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchCommissionData();
  }, [dateRange]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);
      const salesSnapshot = await get(ref(database, 'HTAMS/salesDetails'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const commissions = [];
      
      if (salesSnapshot.exists()) {
        const salesData = salesSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(salesData).forEach(([saleId, sale]) => {
          if (sale.commissions && sale.status === 'Completed') {
            const saleDate = new Date(sale.saleDate);
            if (saleDate >= new Date(dateRange.startDate) && saleDate <= new Date(dateRange.endDate)) {
              Object.entries(sale.commissions).forEach(([userId, commission]) => {
                const user = usersData[userId] || {};
                commissions.push({
                  saleId,
                  userId,
                  userName: user.name || 'Unknown',
                  userEmail: user.email || 'No Email',
                  userLevel: user.currentLevel || 'Unknown',
                  commissionAmount: commission.amount || 0,
                  commissionRate: commission.rate || 0,
                  saleAmount: sale.amount || 0,
                  saleDate: sale.saleDate,
                  productName: sale.product?.name || 'Unknown Product',
                  customerName: sale.customerName || 'Unknown Customer',
                  gstAmount: (commission.amount * 0.18) || 0, // 18% GST
                  netCommission: (commission.amount * 0.82) || 0 // After GST deduction
                });
              });
            }
          }
        });
      }
      
      commissions.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
      setCommissionData(commissions);
      
    } catch (error) {
      console.error('Error fetching commission data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const exportCommissionReport = () => {
    const headers = [
      'Date', 'Sale ID', 'User Name', 'User Email', 'User Level', 
      'Product Name', 'Customer Name', 'Sale Amount', 'Commission Rate (%)', 
      'Commission Amount', 'GST Amount (18%)', 'Net Commission', 'TDS Amount (10%)', 'Final Payout'
    ];
    
    const csvData = commissionData.map(comm => {
      const tdsAmount = comm.commissionAmount * 0.10;
      const finalPayout = comm.netCommission - tdsAmount;
      
      return [
        new Date(comm.saleDate).toLocaleDateString('en-IN'),
        comm.saleId,
        comm.userName,
        comm.userEmail,
        comm.userLevel,
        comm.productName,
        comm.customerName,
        comm.saleAmount,
        comm.commissionRate,
        comm.commissionAmount,
        comm.gstAmount.toFixed(2),
        comm.netCommission.toFixed(2),
        tdsAmount.toFixed(2),
        finalPayout.toFixed(2)
      ];
    });
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Commission_Report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Commission report exported successfully!');
  };

  const totalCommissions = commissionData.reduce((sum, comm) => sum + comm.commissionAmount, 0);
  const totalGST = commissionData.reduce((sum, comm) => sum + comm.gstAmount, 0);
  const totalTDS = commissionData.reduce((sum, comm) => sum + (comm.commissionAmount * 0.10), 0);

  return (
    <div className="payment-reports-container">
      <PaymentReportStyles />
      <div className="page-header">
        <div>
          <h2>💰 Commission Reports</h2>
          <p>Detailed commission breakdown with GST and TDS calculations</p>
        </div>
        <div className="header-actions">
          <div className="date-filters">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
            />
          </div>
          <button className="export-btn" onClick={exportCommissionReport}>
            📊 Export CSV
          </button>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div>
            <h3>Total Commissions</h3>
            <p className="summary-value">{formatCurrency(totalCommissions)}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">🏛️</div>
          <div>
            <h3>GST Amount (18%)</h3>
            <p className="summary-value gst-amount">{formatCurrency(totalGST)}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📋</div>
          <div>
            <h3>TDS Amount (10%)</h3>
            <p className="summary-value tds-amount">{formatCurrency(totalTDS)}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">💳</div>
          <div>
            <h3>Net Payouts</h3>
            <p className="summary-value net-payout">{formatCurrency(totalCommissions - totalGST - totalTDS)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User Details</th>
                <th>Sale Info</th>
                <th>Commission</th>
                <th>Tax Details</th>
                <th>Net Payout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissionData.map((comm, index) => {
                const tdsAmount = comm.commissionAmount * 0.10;
                const finalPayout = comm.netCommission - tdsAmount;
                
                return (
                  <tr key={index}>
                    <td>{new Date(comm.saleDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="user-info">
                        <strong>{comm.userName}</strong>
                        <br />
                        <small>{comm.userLevel}</small>
                        <br />
                        <small>{comm.userEmail}</small>
                      </div>
                    </td>
                    <td>
                      <div className="sale-info">
                        <strong>{formatCurrency(comm.saleAmount)}</strong>
                        <small>{comm.productName}</small>
                      </div>
                    </td>
                    <td>
                      <div className="commission-info">
                        <strong className="commission-amount">{formatCurrency(comm.commissionAmount)}</strong>
                        <small>{comm.commissionRate}% of {formatCurrency(comm.saleAmount)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="tax-info">
                        <strong className="gst-amount">GST: {formatCurrency(comm.gstAmount)}</strong>
                        <small className="tds-amount">TDS: {formatCurrency(comm.commissionAmount * 0.10)}</small>
                      </div>
                    </td>
                    <td className="net-payout">
                      {formatCurrency(comm.netCommission - (comm.commissionAmount * 0.10))}
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => openModal(comm, 'commission')}>
                        👁️ View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Payment Transactions Tab
export const PaymentTransactionsTab = ({ formatCurrency, openModal }) => {
  const [transactionData, setTransactionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTransactionData();
  }, [dateRange]);

  const fetchTransactionData = async () => {
    try {
      setLoading(true);
      const salesSnapshot = await get(ref(database, 'HTAMS/salesDetails'));
      const transactions = [];
      
      if (salesSnapshot.exists()) {
        const salesData = salesSnapshot.val();
        
        Object.entries(salesData).forEach(([saleId, sale]) => {
          const saleDate = new Date(sale.saleDate);
          if (saleDate >= new Date(dateRange.startDate) && saleDate <= new Date(dateRange.endDate)) {
            transactions.push({
              id: saleId,
              date: sale.saleDate,
              amount: sale.amount || 0,
              status: sale.status || 'Unknown',
              customerName: sale.customerName || 'Unknown',
              productName: sale.product?.name || 'Unknown Product',
              paymentMethod: sale.paymentMethod || 'Unknown',
              transactionId: sale.transactionId || saleId
            });
          }
        });
      }
      
      setTransactionData(transactions.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      toast.error('Failed to fetch transaction data');
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = () => {
    const csvData = [
      ['Transaction ID', 'Date', 'Customer', 'Product', 'Amount', 'Status', 'Payment Method'],
      ...transactionData.map(transaction => [
        transaction.transactionId,
        transaction.date,
        transaction.customerName,
        transaction.productName,
        transaction.amount,
        transaction.status,
        transaction.paymentMethod
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payment_Transactions_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Transaction report exported successfully!');
  };

  return (
    <div className="payment-reports-container">
      <PaymentReportStyles />
      <div className="page-header">
        <div>
          <h2>💳 Payment Transactions</h2>
          <p>Complete record of all payment transactions</p>
        </div>
        <div className="header-actions">
          <div className="date-filters">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <button className="export-btn" onClick={exportTransactions}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading transactions...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {transactionData.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transactionId}</td>
                  <td>{new Date(transaction.date).toLocaleDateString()}</td>
                  <td>{transaction.customerName}</td>
                  <td>{transaction.productName}</td>
                  <td>{formatCurrency(transaction.amount)}</td>
                  <td>
                    <span className={`status-badge ${transaction.status.toLowerCase()}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td>{transaction.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Withdrawal Reports Tab
export const WithdrawalReportsTab = ({ formatCurrency, openModal }) => {
  const [withdrawalData, setWithdrawalData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawalData();
  }, []);

  const fetchWithdrawalData = async () => {
    try {
      setLoading(true);
      const withdrawalsSnapshot = await get(ref(database, 'HTAMS/withdrawals'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const withdrawals = [];
      
      if (withdrawalsSnapshot.exists()) {
        const withdrawalsData = withdrawalsSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(withdrawalsData).forEach(([withdrawalId, withdrawal]) => {
          const user = usersData[withdrawal.userId] || {};
          withdrawals.push({
            id: withdrawalId,
            userId: withdrawal.userId,
            userName: user.name || 'Unknown',
            userEmail: user.email || 'No Email',
            amount: withdrawal.amount || 0,
            status: withdrawal.status || 'Pending',
            requestDate: withdrawal.requestDate,
            processedDate: withdrawal.processedDate,
            bankDetails: withdrawal.bankDetails || {},
            remarks: withdrawal.remarks || ''
          });
        });
      }
      
      setWithdrawalData(withdrawals.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate)));
    } catch (error) {
      console.error('Error fetching withdrawal data:', error);
      toast.error('Failed to fetch withdrawal data');
    } finally {
      setLoading(false);
    }
  };

  const exportWithdrawals = () => {
    const csvData = [
      ['Withdrawal ID', 'User Name', 'Email', 'Amount', 'Status', 'Request Date', 'Processed Date', 'Bank Account', 'Remarks'],
      ...withdrawalData.map(withdrawal => [
        withdrawal.id,
        withdrawal.userName,
        withdrawal.userEmail,
        withdrawal.amount,
        withdrawal.status,
        withdrawal.requestDate,
        withdrawal.processedDate || 'N/A',
        withdrawal.bankDetails.accountNumber ? `****${withdrawal.bankDetails.accountNumber.slice(-4)}` : 'N/A',
        withdrawal.remarks
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Withdrawal_Reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Withdrawal report exported successfully!');
  };

  return (
    <div className="payment-reports-container">
      <PaymentReportStyles />
      <div className="page-header">
        <div>
          <h2>💸 Withdrawal Reports</h2>
          <p>Complete record of all withdrawal requests and processing</p>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={exportWithdrawals}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading withdrawals...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Withdrawal ID</th>
                <th>User Details</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Request Date</th>
                <th>Processed Date</th>
                <th>Bank Details</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalData.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td>{withdrawal.id}</td>
                  <td>
                    <div className="user-info">
                      <strong>{withdrawal.userName}</strong>
                      <small>{withdrawal.userEmail}</small>
                    </div>
                  </td>
                  <td>{formatCurrency(withdrawal.amount)}</td>
                  <td>
                    <span className={`status-badge ${withdrawal.status.toLowerCase()}`}>
                      {withdrawal.status}
                    </span>
                  </td>
                  <td>{new Date(withdrawal.requestDate).toLocaleDateString()}</td>
                  <td>{withdrawal.processedDate ? new Date(withdrawal.processedDate).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    {withdrawal.bankDetails.accountNumber ? 
                      `****${withdrawal.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Tax Reports Tab
export const TaxReportsTab = ({ formatCurrency, openModal }) => {
  const [taxData, setTaxData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchTaxData();
  }, [selectedYear]);

  const fetchTaxData = async () => {
    try {
      setLoading(true);
      const salesSnapshot = await get(ref(database, 'HTAMS/salesDetails'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const quarterlyData = {};
      
      if (salesSnapshot.exists()) {
        const salesData = salesSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(salesData).forEach(([saleId, sale]) => {
          if (sale.commissions && sale.status === 'Completed') {
            const saleDate = new Date(sale.saleDate);
            if (saleDate.getFullYear() === selectedYear) {
              const quarter = Math.floor(saleDate.getMonth() / 3) + 1;
              const quarterKey = `Q${quarter}-${selectedYear}`;
              
              if (!quarterlyData[quarterKey]) {
                quarterlyData[quarterKey] = {
                  quarter: `Q${quarter} ${selectedYear}`,
                  totalCommissions: 0,
                  totalGST: 0,
                  totalTDS: 0,
                  netPayout: 0,
                  transactionCount: 0
                };
              }
              
              Object.entries(sale.commissions).forEach(([userId, commission]) => {
                const commissionAmount = commission.amount || 0;
                const gst = commissionAmount * 0.18;
                const tds = commissionAmount * 0.10;
                const net = commissionAmount - gst - tds;
                
                quarterlyData[quarterKey].totalCommissions += commissionAmount;
                quarterlyData[quarterKey].totalGST += gst;
                quarterlyData[quarterKey].totalTDS += tds;
                quarterlyData[quarterKey].netPayout += net;
                quarterlyData[quarterKey].transactionCount += 1;
              });
            }
          }
        });
      }
      
      setTaxData(Object.values(quarterlyData));
    } catch (error) {
      console.error('Error fetching tax data:', error);
      toast.error('Failed to fetch tax data');
    } finally {
      setLoading(false);
    }
  };

  const exportTaxReport = () => {
    const csvData = [
      ['Quarter', 'Total Commissions', 'GST (18%)', 'TDS (10%)', 'Net Payout', 'Transaction Count'],
      ...taxData.map(quarter => [
        quarter.quarter,
        quarter.totalCommissions,
        quarter.totalGST,
        quarter.totalTDS,
        quarter.netPayout,
        quarter.transactionCount
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tax_Report_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tax report exported successfully!');
  };

  return (
    <div className="payment-reports-container">
      <PaymentReportStyles />
      <div className="page-header">
        <div>
          <h2>📋 Tax Reports</h2>
          <p>GST and TDS calculations for tax compliance</p>
        </div>
        <div className="header-actions">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="year-selector"
          >
            {[2024, 2023, 2022, 2021].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button className="export-btn" onClick={exportTaxReport}>
            📊 Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading tax data...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quarter</th>
                <th>Total Commissions</th>
                <th>GST (18%)</th>
                <th>TDS (10%)</th>
                <th>Net Payout</th>
                <th>Transaction Count</th>
              </tr>
            </thead>
            <tbody>
              {taxData.map((quarter, index) => (
                <tr key={index}>
                  <td><strong>{quarter.quarter}</strong></td>
                  <td>{formatCurrency(quarter.totalCommissions)}</td>
                  <td>{formatCurrency(quarter.totalGST)}</td>
                  <td>{formatCurrency(quarter.totalTDS)}</td>
                  <td className="net-payout">{formatCurrency(quarter.netPayout)}</td>
                  <td>{quarter.transactionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
