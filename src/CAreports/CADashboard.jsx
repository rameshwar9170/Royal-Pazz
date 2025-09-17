// CADashboard.jsx - Complete Professional Black Theme Implementation
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './CADashboard.css';

const CADashboard = () => {
  const [loading, setLoading] = useState(true);
  const [caUser, setCaUser] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalSales: 0,
    totalCommissions: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalTrainingCost: 0,
    activeUsers: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // Enhanced Indian number formatting with proper K, L, Cr, B system
  const formatIndianNumber = (amount, showCurrency = true) => {
    if (!amount || amount === 0) return showCurrency ? '₹0' : '0';
    
    const num = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    
    let formattedNum;
    let suffix = '';
    
    if (num >= 10000000) { // 1 Crore and above
      if (num >= 1000000000000) { // 1 Lakh Crore
        formattedNum = (num / 1000000000000).toFixed(2);
        suffix = 'L Cr';
      } else if (num >= 10000000000) { // 1000 Crore (Arab)
        formattedNum = (num / 1000000000).toFixed(2);
        suffix = 'B';
      } else if (num >= 10000000) { // 1 Crore
        formattedNum = (num / 10000000).toFixed(2);
        suffix = 'Cr';
      }
    } else if (num >= 100000) { // 1 Lakh
      formattedNum = (num / 100000).toFixed(2);
      suffix = 'L';
    } else if (num >= 1000) { // 1 Thousand
      formattedNum = (num / 1000).toFixed(2);
      suffix = 'K';
    } else {
      formattedNum = num.toFixed(2);
    }
    
    // Remove trailing zeros
    formattedNum = parseFloat(formattedNum).toString();
    
    const result = `${sign}${formattedNum}${suffix}`;
    return showCurrency ? `₹${result}` : result;
  };

  const formatCurrency = (amount) => {
    return formatIndianNumber(amount, true);
  };

  const openModal = (item, type) => {
    setSelectedItem({ ...item, type });
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalOpen(false);
  };

  useEffect(() => {
    const userData = localStorage.getItem('caUser');
    if (!userData) {
      navigate('/ca-login');
      return;
    }
    
    setCaUser(JSON.parse(userData));
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [salesSnapshot, usersSnapshot, ordersSnapshot, transactionsSnapshot, trainingsSnapshot] = await Promise.all([
        get(ref(database, 'HTAMS/salesDetails')),
        get(ref(database, 'HTAMS/users')),
        get(ref(database, 'HTAMS/orders')),
        get(ref(database, 'HTAMS/transactions')),
        get(ref(database, 'HTAMS/trainings'))
      ]);

      let totalSales = 0;
      let totalCommissions = 0;
      let totalOrders = 0;
      let totalTrainingCost = 0;
      let activeUsers = 0;

      // Calculate sales data
      if (salesSnapshot.exists()) {
        const salesData = salesSnapshot.val();
        Object.values(salesData).forEach(sale => {
          if (sale.status === 'Completed') {
            totalSales += sale.amount || 0;
            
            if (sale.commissions) {
              Object.values(sale.commissions).forEach(commission => {
                totalCommissions += commission.amount || 0;
              });
            }
          }
        });
      }

      // Calculate orders data
      if (ordersSnapshot.exists()) {
        const ordersData = ordersSnapshot.val();
        totalOrders = Object.keys(ordersData).length;
      }

      // Calculate training costs
      if (trainingsSnapshot.exists()) {
        const trainingsData = trainingsSnapshot.val();
        Object.values(trainingsData).forEach(training => {
          if (training.cost && training.status !== 'cancelled') {
            totalTrainingCost += training.cost || 0;
          }
          if (training.trainerFee && training.status === 'completed') {
            totalTrainingCost += training.trainerFee || 0;
          }
          if (training.materialsCost) {
            totalTrainingCost += training.materialsCost || 0;
          }
          if (training.venueCost) {
            totalTrainingCost += training.venueCost || 0;
          }
        });
      }

      // Calculate withdrawal data and active users
      let totalWithdrawals = 0;
      let pendingWithdrawals = 0;
      
      if (transactionsSnapshot.exists()) {
        const transactionsData = transactionsSnapshot.val();
        Object.values(transactionsData).forEach(transaction => {
          if (transaction.type === 'withdrawal') {
            if (transaction.status === 'approved') {
              totalWithdrawals += transaction.amount || 0;
            } else if (transaction.status === 'pending') {
              pendingWithdrawals += transaction.amount || 0;
            }
          }
        });
      }

      // Count total users and active users
      const totalUsers = usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 0;
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        activeUsers = Object.values(usersData).filter(user => user.isActive !== false).length;
      }

      setDashboardData({
        totalSales,
        totalCommissions,
        totalWithdrawals,
        pendingWithdrawals,
        totalUsers,
        totalOrders,
        totalTrainingCost,
        activeUsers
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('caUser');
    navigate('/ca-login');
    toast.info('Logged out successfully');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="ca-loading">
        <div className="loading-spinner"></div>
        <div className="loading-content">
          <h3>Loading CA Dashboard</h3>
          <p>Please wait while we fetch your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ca-dashboard">
      {/* Header */}
       <style
    dangerouslySetInnerHTML={{
      __html: `
        /* ---- Color palette (light theme) ---- */
        :root{
          --bg-1:#f7f9fc;
          --bg-2:#ffffff;
          --bg-3:#eef2f7;
          --text-1:#1f2532;
          --text-2:#586479;
          --brand:#2563eb;   /* blue-600 */
          --positive:#16a34a;/* green-600 */
          --negative:#dc2626;/* red-600 */
          --neutral :#ca8a04;/* amber-600 */
          --border :#e2e8f0;
        }

        body,html,#root, .ca-dashboard{background:var(--bg-1);color:var(--text-1);font-family:"Inter",sans-serif;}

        /* ---- Header ---- */
        .ca-header{background:var(--bg-2);border-bottom:1px solid var(--border);padding:0.75rem 1.25rem;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:20;}
        .ca-header h1{font-size:1.25rem;font-weight:600;margin:0;}

        /* ---- Sidebar ---- */
        .ca-sidebar{background:var(--bg-2);width:240px;flex-shrink:0;height:100%;border-right:1px solid var(--border);position:fixed;left:0;top:56px;bottom:0;overflow-y:auto;transform:translateX(-100%);transition:transform .25s ease;}
        .ca-sidebar.open{transform:translateX(0);}
        .sidebar-nav .nav-btn{width:100%;padding:0.75rem 1rem;text-align:left;border:none;background:none;color:var(--text-2);font-size:0.95rem;cursor:pointer;border-left:4px solid transparent;}
        .sidebar-nav .nav-btn.active{color:var(--brand);font-weight:600;background:var(--bg-3);border-left-color:var(--brand);}
        .sidebar-nav .nav-btn:hover{background:var(--bg-3);}
        
        /* ---- Main area ---- */
        .ca-main{margin-left:240px;padding:1.25rem 1.5rem;}
        @media(max-width:768px){.ca-main{margin-left:0;}}

        /* ---- Cards & tables ---- */
        .stat-card,.summary-card{background:var(--bg-2);border:1px solid var(--border);border-radius:0.5rem;padding:1rem;display:flex;gap:0.75rem;align-items:center;}
        .stat-card .stat-icon,.summary-card .summary-icon{font-size:1.4rem;color:var(--brand);}
        .stat-value{font-size:1.25rem;font-weight:600;}

        .data-table{width:100%;border-collapse:collapse;font-size:0.9rem;}
        .data-table th,.data-table td{border-bottom:1px solid var(--border);padding:0.5rem 0.75rem;text-align:left;}
        .data-table thead{background:var(--bg-3);}

        /* ---- Badges & pills ---- */
        .status-badge,.role-badge,.type-badge{display:inline-block;padding:0.15rem 0.5rem;border-radius:0.25rem;font-size:0.75rem;font-weight:600;text-transform:capitalize;}
        .status-badge.completed,.status-badge.approved{background:var(--positive);color:#fff;}
        .status-badge.pending{background:var(--neutral);color:#fff;}
        .status-badge.cancelled,.status-badge.rejected{background:var(--negative);color:#fff;}
        .role-badge{background:var(--bg-3);color:var(--brand);}

        /* ---- Buttons ---- */
        .export-btn,.action-btn,.logout-btn{background:var(--brand);color:#fff;border:none;border-radius:0.35rem;padding:0.45rem 0.9rem;font-weight:500;cursor:pointer;}
        .export-btn:hover,.action-btn:hover,.logout-btn:hover{background:#1e54c5;}

        /* ---- Modal ---- */
        .modal-overlay{background:rgba(0,0,0,.35);position:fixed;inset:0;display:flex;justify-content:center;align-items:center;z-index:40;}
        .modal-content{background:var(--bg-2);max-width:800px;width:90%;max-height:90vh;overflow:auto;border-radius:0.75rem;border:1px solid var(--border);padding:1.5rem;}
        .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;}
        .modal-close{border:none;background:none;font-size:1.5rem;cursor:pointer;color:var(--text-2);}
        
        /* ---- Misc ---- */
        .page-header h2{margin:0 0 0.25rem 0;}
        .page-header p{margin:0;color:var(--text-2);font-size:0.9rem;}
        .loading-spinner,.loading-spinner-small{border:3px solid var(--bg-3);border-top-color:var(--brand);border-radius:50%;width:38px;height:38px;animation:spin 1s linear infinite;}
        .loading-spinner-small{width:26px;height:26px;}
        @keyframes spin{to{transform:rotate(360deg);}}
      `
    }}
 />
      <header className="ca-header">
        <div className="ca-header-content">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={toggleSidebar}>
              <span></span>
              <span></span>
              <span></span>
            </button>
            <h1>HTAMS - CA Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="ca-user-info">
              <div className="user-avatar">
                {(caUser?.name || 'CA').charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">Welcome, {caUser?.name || 'CA'}</span>
                <span className="user-role">{caUser?.role || 'Chartered Accountant'}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              <i className="logout-icon">🚪</i>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="ca-body">
        {/* Sidebar Navigation */}
        <aside className={`ca-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>Reports</h2>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => {setActiveTab('overview'); setSidebarOpen(false);}}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Overview</span>
            </button>
            <button 
              className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => {setActiveTab('orders'); setSidebarOpen(false);}}
            >
              <span className="nav-icon">📦</span>
              <span className="nav-text">Orders Report</span>
            </button>
            <button 
              className={`nav-btn ${activeTab === 'training' ? 'active' : ''}`}
              onClick={() => {setActiveTab('training'); setSidebarOpen(false);}}
            >
              <span className="nav-icon">🎓</span>
              <span className="nav-text">Training Cost</span>
            </button>
            <button 
              className={`nav-btn ${activeTab === 'payout' ? 'active' : ''}`}
              onClick={() => {setActiveTab('payout'); setSidebarOpen(false);}}
            >
              <span className="nav-icon">💰</span>
              <span className="nav-text">Payout Report</span>
            </button>
            <button 
              className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => {setActiveTab('transactions'); setSidebarOpen(false);}}
            >
              <span className="nav-icon">💳</span>
              <span className="nav-text">Transactions</span>
            </button>
            <button 
              className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => {setActiveTab('users'); setSidebarOpen(false);}}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-text">User Analytics</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ca-main">
          <div className="main-content">
            {activeTab === 'overview' && (
              <OverviewTab dashboardData={dashboardData} formatCurrency={formatCurrency} />
            )}
            {activeTab === 'orders' && (
              <OrdersReportTab formatCurrency={formatCurrency} openModal={openModal} />
            )}
            {activeTab === 'training' && (
              <TrainingCostReportTab formatCurrency={formatCurrency} openModal={openModal} />
            )}
            {activeTab === 'payout' && (
              <PayoutReportsTab formatCurrency={formatCurrency} openModal={openModal} />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab formatCurrency={formatCurrency} openModal={openModal} />
            )}
            {activeTab === 'users' && (
              <UserAnalyticsTab formatCurrency={formatCurrency} openModal={openModal} />
            )}
          </div>
        </main>
      </div>

      {/* Enhanced Modal for View Details */}
      {modalOpen && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedItem.type === 'order' && 'Order Details'}
                {selectedItem.type === 'training' && 'Training Details'}
                {selectedItem.type === 'payout' && 'Payout Details'}
                {selectedItem.type === 'transaction' && 'Transaction Details'}
                {selectedItem.type === 'user' && 'User Details'}
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <DetailModalContent item={selectedItem} formatCurrency={formatCurrency} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="mobile-overlay" onClick={toggleSidebar}></div>}
    </div>
  );
};

// Detail Modal Content Component
const DetailModalContent = ({ item, formatCurrency }) => {
  if (!item) return null;

  switch (item.type) {
    case 'order':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Order Information</h3>
            <div className="detail-row">
              <label>Order Number:</label>
              <span>#{item.orderNumber}</span>
            </div>
            <div className="detail-row">
              <label>Order Date:</label>
              <span>{new Date(item.orderDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="detail-row">
              <label>Payment Method:</label>
              <span>{item.paymentMethod}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Customer Information</h3>
            <div className="detail-row">
              <label>Customer Name:</label>
              <span>{item.customerName}</span>
            </div>
            <div className="detail-row">
              <label>Customer Email:</label>
              <span>{item.customerEmail}</span>
            </div>
            <div className="detail-row">
              <label>Customer Phone:</label>
              <span>{item.customerPhone}</span>
            </div>
            <div className="detail-row">
              <label>Customer ID:</label>
              <span>{item.customerId}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Delivery Information</h3>
            <div className="detail-row">
              <label>Delivery Address:</label>
              <span>{item.deliveryAddress || 'Not provided'}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Order Summary</h3>
            <div className="detail-row">
              <label>Items Count:</label>
              <span>{item.itemsCount} items</span>
            </div>
            <div className="detail-row">
              <label>Total Amount:</label>
              <span className="amount">{formatCurrency(item.totalAmount)}</span>
            </div>
            <div className="detail-row">
              <label>GST Amount:</label>
              <span className="gst-amount">{formatCurrency(item.gstAmount)}</span>
            </div>
            <div className="detail-row">
              <label>Net Amount:</label>
              <span className="total-amount">{formatCurrency(item.netAmount)}</span>
            </div>
          </div>

          {item.items && Object.keys(item.items).length > 0 && (
            <div className="detail-section full-width">
              <h3>Order Items</h3>
              <div className="items-list">
                {Object.entries(item.items).map(([itemId, itemData]) => (
                  <div key={itemId} className="item-card">
                    <div className="item-details">
                      <strong>{itemData.name || 'Unknown Item'}</strong>
                      <p>Quantity: {itemData.quantity || 1}</p>
                      <p>Price: {formatCurrency(itemData.price || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'training':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Training Information</h3>
            <div className="detail-row">
              <label>Training Title:</label>
              <span>{item.trainingTitle}</span>
            </div>
            <div className="detail-row">
              <label>Category:</label>
              <span>{item.category}</span>
            </div>
            <div className="detail-row">
              <label>Training Date:</label>
              <span>{new Date(item.trainingDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Duration:</label>
              <span>{item.trainingDuration} hours</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="detail-row">
              <label>Venue:</label>
              <span>{item.venue}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Trainer Information</h3>
            <div className="detail-row">
              <label>Trainer Name:</label>
              <span>{item.trainerName}</span>
            </div>
            <div className="detail-row">
              <label>Trainer Email:</label>
              <span>{item.trainerEmail}</span>
            </div>
            <div className="detail-row">
              <label>Trainer ID:</label>
              <span>{item.trainerId}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Cost Breakdown</h3>
            <div className="detail-row">
              <label>Training Cost:</label>
              <span className="amount">{formatCurrency(item.trainingCost)}</span>
            </div>
            <div className="detail-row">
              <label>Trainer Fee:</label>
              <span className="amount">{formatCurrency(item.trainerFee)}</span>
            </div>
            <div className="detail-row">
              <label>Materials Cost:</label>
              <span className="amount">{formatCurrency(item.materialsCost)}</span>
            </div>
            <div className="detail-row">
              <label>Venue Cost:</label>
              <span className="amount">{formatCurrency(item.venueCost)}</span>
            </div>
            <div className="detail-row total-row">
              <label>Total Cost:</label>
              <span className="total-amount">{formatCurrency(item.totalCost)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Participants</h3>
            <div className="detail-row">
              <label>Participants Count:</label>
              <span>{item.participantsCount}</span>
            </div>
          </div>
        </div>
      );

    case 'payout':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Sale Information</h3>
            <div className="detail-row">
              <label>Sale ID:</label>
              <span>{item.saleId}</span>
            </div>
            <div className="detail-row">
              <label>Sale Date:</label>
              <span>{new Date(item.saleDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Order Number:</label>
              <span>#{item.orderNumber}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-row">
              <label>User Name:</label>
              <span>{item.userName}</span>
            </div>
            <div className="detail-row">
              <label>User Email:</label>
              <span>{item.userEmail}</span>
            </div>
            <div className="detail-row">
              <label>User ID:</label>
              <span>{item.userId}</span>
            </div>
            <div className="detail-row">
              <label>Role:</label>
              <span className={`role-badge ${item.userRole?.toLowerCase().replace(' ', '-')}`}>{item.userRole}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Commission Details</h3>
            <div className="detail-row">
              <label>Commission Rate:</label>
              <span>{item.commissionRate}%</span>
            </div>
            <div className="detail-row">
              <label>Sale Amount:</label>
              <span className="amount">{formatCurrency(item.saleAmount)}</span>
            </div>
            <div className="detail-row">
              <label>Commission Amount:</label>
              <span className="total-amount">{formatCurrency(item.commissionAmount)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Product & Customer</h3>
            <div className="detail-row">
              <label>Product Name:</label>
              <span>{item.productName}</span>
            </div>
            <div className="detail-row">
              <label>Customer Name:</label>
              <span>{item.customerName}</span>
            </div>
          </div>
        </div>
      );

    case 'transaction':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Transaction Information</h3>
            <div className="detail-row">
              <label>Transaction ID:</label>
              <span>#{item.id}</span>
            </div>
            <div className="detail-row">
              <label>Date:</label>
              <span>{new Date(item.timestamp).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Type:</label>
              <span className={`type-badge ${item.type}`}>{item.type?.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status?.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <label>Amount:</label>
              <span className="total-amount">{formatCurrency(item.amount)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-row">
              <label>User Name:</label>
              <span>{item.userName}</span>
            </div>
            <div className="detail-row">
              <label>User Email:</label>
              <span>{item.userEmail}</span>
            </div>
            <div className="detail-row">
              <label>User ID:</label>
              <span>{item.userId}</span>
            </div>
          </div>

          {item.bankDetails && (
            <div className="detail-section">
              <h3>Bank Details</h3>
              <div className="detail-row">
                <label>Account Holder:</label>
                <span>{item.bankDetails.accountHolderName}</span>
              </div>
              <div className="detail-row">
                <label>Bank Name:</label>
                <span>{item.bankDetails.bankName}</span>
              </div>
              <div className="detail-row">
                <label>Account Number:</label>
                <span>****{item.bankDetails.accountNumber?.slice(-4)}</span>
              </div>
              <div className="detail-row">
                <label>IFSC Code:</label>
                <span>{item.bankDetails.ifscCode || 'Not provided'}</span>
              </div>
            </div>
          )}
        </div>
      );

    case 'user':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-row">
              <label>User Name:</label>
              <span>{item.name}</span>
            </div>
            <div className="detail-row">
              <label>Email:</label>
              <span>{item.email}</span>
            </div>
            <div className="detail-row">
              <label>User ID:</label>
              <span>{item.userId}</span>
            </div>
            <div className="detail-row">
              <label>Role:</label>
              <span className={`role-badge ${item.role?.toLowerCase().replace(' ', '-')}`}>{item.role}</span>
            </div>
            <div className="detail-row">
              <label>Current Level:</label>
              <span>{item.currentLevel}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Analytics</h3>
            <div className="detail-row">
              <label>Total Earnings:</label>
              <span className="amount">{formatCurrency(item.totalEarnings)}</span>
            </div>
            <div className="detail-row">
              <label>Total Received:</label>
              <span className="amount">{formatCurrency(item.totalReceived)}</span>
            </div>
            <div className="detail-row">
              <label>Total Orders:</label>
              <span>{item.totalOrders}</span>
            </div>
            <div className="detail-row">
              <label>Total Sales:</label>
              <span className="amount">{formatCurrency(item.totalSales)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Dates</h3>
            <div className="detail-row">
              <label>Joined Date:</label>
              <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : 'Unknown'}</span>
            </div>
            <div className="detail-row">
              <label>Last Login:</label>
              <span>{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</span>
            </div>
          </div>
        </div>
      );

    default:
      return <div>No details available</div>;
  }
};

// Overview Tab Component
const OverviewTab = ({ dashboardData, formatCurrency }) => {
  return (
    <div className="overview-tab">
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p>Complete financial and operational summary</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card sales">
          <div className="stat-icon">
            <i>💹</i>
          </div>
          <div className="stat-content">
            <h3>Total Sales</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalSales)}</p>
            <span className="stat-change positive">+12.5% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '60%'}}></div>
            <div className="chart-bar" style={{height: '80%'}}></div>
            <div className="chart-bar" style={{height: '45%'}}></div>
            <div className="chart-bar" style={{height: '100%'}}></div>
          </div>
        </div>

        <div className="stat-card commissions">
          <div className="stat-icon">
            <i>💰</i>
          </div>
          <div className="stat-content">
            <h3>Total Commissions</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalCommissions)}</p>
            <span className="stat-change positive">+8.3% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '70%'}}></div>
            <div className="chart-bar" style={{height: '55%'}}></div>
            <div className="chart-bar" style={{height: '90%'}}></div>
            <div className="chart-bar" style={{height: '75%'}}></div>
          </div>
        </div>

        <div className="stat-card training">
          <div className="stat-icon">
            <i>🎓</i>
          </div>
          <div className="stat-content">
            <h3>Training Costs</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalTrainingCost)}</p>
            <span className="stat-change negative">+15.2% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '40%'}}></div>
            <div className="chart-bar" style={{height: '60%'}}></div>
            <div className="chart-bar" style={{height: '35%'}}></div>
            <div className="chart-bar" style={{height: '80%'}}></div>
          </div>
        </div>

        <div className="stat-card withdrawals">
          <div className="stat-icon">
            <i>📤</i>
          </div>
          <div className="stat-content">
            <h3>Total Withdrawals</h3>
            <p className="stat-value">{formatCurrency(dashboardData.totalWithdrawals)}</p>
            <span className="stat-change positive">+5.7% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '50%'}}></div>
            <div className="chart-bar" style={{height: '70%'}}></div>
            <div className="chart-bar" style={{height: '85%'}}></div>
            <div className="chart-bar" style={{height: '65%'}}></div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">
            <i>⏳</i>
          </div>
          <div className="stat-content">
            <h3>Pending Withdrawals</h3>
            <p className="stat-value">{formatCurrency(dashboardData.pendingWithdrawals)}</p>
            <span className="stat-change neutral">2.1% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '30%'}}></div>
            <div className="chart-bar" style={{height: '45%'}}></div>
            <div className="chart-bar" style={{height: '55%'}}></div>
            <div className="chart-bar" style={{height: '40%'}}></div>
          </div>
        </div>

        <div className="stat-card users">
          <div className="stat-icon">
            <i>👥</i>
          </div>
          <div className="stat-content">
            <h3>Active Users</h3>
            <p className="stat-value">{dashboardData.activeUsers.toLocaleString('en-IN')}</p>
            <span className="stat-change positive">+3.2% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '60%'}}></div>
            <div className="chart-bar" style={{height: '75%'}}></div>
            <div className="chart-bar" style={{height: '90%'}}></div>
            <div className="chart-bar" style={{height: '85%'}}></div>
          </div>
        </div>

        <div className="stat-card orders">
          <div className="stat-icon">
            <i>📦</i>
          </div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <p className="stat-value">{dashboardData.totalOrders.toLocaleString('en-IN')}</p>
            <span className="stat-change positive">+18.4% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '45%'}}></div>
            <div className="chart-bar" style={{height: '65%'}}></div>
            <div className="chart-bar" style={{height: '80%'}}></div>
            <div className="chart-bar" style={{height: '100%'}}></div>
          </div>
        </div>

        <div className="stat-card total-users">
          <div className="stat-icon">
            <i>🌍</i>
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-value">{dashboardData.totalUsers.toLocaleString('en-IN')}</p>
            <span className="stat-change positive">+6.8% from last month</span>
          </div>
          <div className="stat-chart">
            <div className="chart-bar" style={{height: '70%'}}></div>
            <div className="chart-bar" style={{height: '85%'}}></div>
            <div className="chart-bar" style={{height: '95%'}}></div>
            <div className="chart-bar" style={{height: '90%'}}></div>
          </div>
        </div>
      </div>

      <div className="overview-summary">
        <div className="summary-section">
          <h3>Quick Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <h4>Revenue Growth</h4>
              <p>Sales are up 12.5% compared to last month, indicating strong market performance.</p>
            </div>
            <div className="insight-card">
              <h4>Commission Distribution</h4>
              <p>Total commissions of {formatCurrency(dashboardData.totalCommissions)} distributed across all levels.</p>
            </div>
            <div className="insight-card">
              <h4>Training Investment</h4>
              <p>Training costs increased by 15.2%, showing commitment to skill development.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Orders Report Tab Component
const OrdersReportTab = ({ formatCurrency, openModal }) => {
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    customerId: ''
  });

  useEffect(() => {
    fetchOrdersData();
  }, [filters]);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);
      
      const ordersSnapshot = await get(ref(database, 'HTAMS/orders'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const orders = [];
      
      if (ordersSnapshot.exists()) {
        const ordersDataFromDB = ordersSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(ordersDataFromDB).forEach(([orderId, order]) => {
          const customer = usersData[order.customerId] || {};
          
          // Apply filters
          if (filters.customerId && order.customerId !== filters.customerId) return;
          if (filters.startDate && new Date(order.orderDate) < new Date(filters.startDate)) return;
          if (filters.endDate && new Date(order.orderDate) > new Date(filters.endDate)) return;
          if (filters.status !== 'all' && order.status?.toLowerCase() !== filters.status.toLowerCase()) return;
          
          orders.push({
            orderId,
            orderNumber: order.orderNumber || orderId.substring(0, 8),
            customerId: order.customerId,
            customerName: customer.name || order.customerName || 'Unknown Customer',
            customerEmail: customer.email || order.customerEmail || 'No Email',
            customerPhone: customer.phone || order.customerPhone || 'No Phone',
            orderDate: order.orderDate,
            totalAmount: order.totalAmount || 0,
            gstAmount: order.gstAmount || 0,
            netAmount: (order.totalAmount || 0) + (order.gstAmount || 0),
            status: order.status || 'Pending',
            paymentMethod: order.paymentMethod || 'Unknown',
            deliveryAddress: order.deliveryAddress || order.shippingAddress || 'Not provided',
            items: order.items || order.orderItems || [],
            itemsCount: order.items ? Object.keys(order.items).length : (order.orderItems ? Object.keys(order.orderItems).length : 0)
          });
        });
      }
      
      orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
      setOrdersData(orders);
      
    } catch (error) {
      console.error('Error fetching orders data:', error);
      toast.error('Failed to load orders data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Order Number', 'Customer Name', 'Customer Email', 'Customer Phone', 
      'Order Date', 'Items Count', 'Total Amount', 'GST Amount', 'Net Amount', 
      'Status', 'Payment Method', 'Delivery Address'
    ];
    
    const csvData = ordersData.map(order => [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      new Date(order.orderDate).toLocaleDateString('en-IN'),
      order.itemsCount,
      order.totalAmount,
      order.gstAmount,
      order.netAmount,
      order.status,
      order.paymentMethod,
      order.deliveryAddress
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Orders report exported successfully!');
  };

  const totalOrders = ordersData.length;
  const totalOrderValue = ordersData.reduce((sum, order) => sum + order.netAmount, 0);
  const totalGST = ordersData.reduce((sum, order) => sum + order.gstAmount, 0);
  const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;

  return (
    <div className="report-tab">
      <div className="page-header">
        <h2>Orders Report</h2>
        <p>Comprehensive order tracking and analysis</p>
      </div>

      <div className="report-actions">
        <button onClick={exportToCSV} className="export-btn">
          <i>📊</i>
          Export to CSV
        </button>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Customer ID</label>
            <input
              type="text"
              placeholder="Enter Customer ID"
              value={filters.customerId}
              onChange={(e) => setFilters({...filters, customerId: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h4>Total Orders</h4>
            <p>{totalOrders.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Value</h4>
            <p>{formatCurrency(totalOrderValue)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🧾</div>
          <div className="summary-content">
            <h4>Total GST</h4>
            <p>{formatCurrency(totalGST)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Avg Order Value</h4>
            <p>{formatCurrency(avgOrderValue)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading orders data...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Date</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordersData.map((order, index) => (
                  <tr key={index}>
                    <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className="order-number">#{order.orderNumber}</span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <strong>{order.customerName}</strong>
                        <small>{order.customerEmail}</small>
                        <small>{order.customerPhone}</small>
                      </div>
                    </td>
                    <td>
                      <span className="items-badge">{order.itemsCount} items</span>
                    </td>
                    <td className="amount">{formatCurrency(order.totalAmount)}</td>
                    <td className="gst-amount">{formatCurrency(order.gstAmount)}</td>
                    <td className="total-amount">{formatCurrency(order.netAmount)}</td>
                    <td>
                      <span className={`status-badge ${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <span className="payment-method">{order.paymentMethod}</span>
                    </td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => openModal(order, 'order')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Training Cost Report Tab Component
const TrainingCostReportTab = ({ formatCurrency, openModal }) => {
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    trainerId: ''
  });

  useEffect(() => {
    fetchTrainingData();
  }, [filters]);

  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      
      const trainingsSnapshot = await get(ref(database, 'HTAMS/company/trainings'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const trainings = [];
      
      if (trainingsSnapshot.exists()) {
        const trainingsDataFromDB = trainingsSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(trainingsDataFromDB).forEach(([trainingId, training]) => {
          const trainer = usersData[training.trainerId] || {};
          
          if (filters.trainerId && training.trainerId !== filters.trainerId) return;
          if (filters.startDate && new Date(training.trainingDate) < new Date(filters.startDate)) return;
          if (filters.endDate && new Date(training.trainingDate) > new Date(filters.endDate)) return;
          if (filters.status !== 'all' && training.status?.toLowerCase() !== filters.status.toLowerCase()) return;
          
          trainings.push({
            trainingId,
            trainingTitle: training.title || 'Unknown Training',
            trainerId: training.trainerId,
            trainerName: trainer.name || 'Unknown Trainer',
            trainerEmail: trainer.email || 'No Email',
            trainingDate: training.trainingDate,
            trainingDuration: training.duration || 0,
            participantsCount: training.participants ? Object.keys(training.participants).length : 0,
            trainingCost: training.cost || 0,
            trainerFee: training.trainerFee || 0,
            materialsCost: training.materialsCost || 0,
            venueCost: training.venueCost || 0,
            totalCost: (training.cost || 0) + (training.trainerFee || 0) + (training.materialsCost || 0) + (training.venueCost || 0),
            status: training.status || 'Planned',
            venue: training.venue || 'Not Specified',
            category: training.category || 'General'
          });
        });
      }
      
      trainings.sort((a, b) => new Date(b.trainingDate) - new Date(a.trainingDate));
      setTrainingData(trainings);
      
    } catch (error) {
      console.error('Error fetching training data:', error);
      toast.error('Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Training Title', 'Trainer Name', 'Training Date', 'Duration (Hours)', 
      'Participants', 'Training Cost', 'Trainer Fee', 'Materials Cost', 
      'Venue Cost', 'Total Cost', 'Status', 'Venue', 'Category'
    ];
    
    const csvData = trainingData.map(training => [
      training.trainingTitle,
      training.trainerName,
      new Date(training.trainingDate).toLocaleDateString('en-IN'),
      training.trainingDuration,
      training.participantsCount,
      training.trainingCost,
      training.trainerFee,
      training.materialsCost,
      training.venueCost,
      training.totalCost,
      training.status,
      training.venue,
      training.category
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `training_cost_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Training cost report exported successfully!');
  };

  const totalTrainings = trainingData.length;
  const totalTrainingCost = trainingData.reduce((sum, training) => sum + training.totalCost, 0);
  const totalParticipants = trainingData.reduce((sum, training) => sum + training.participantsCount, 0);
  const avgCostPerTraining = totalTrainings > 0 ? totalTrainingCost / totalTrainings : 0;

  return (
    <div className="report-tab">
      <div className="page-header">
        <h2>Training Cost Report</h2>
        <p>Comprehensive training expense analysis</p>
      </div>

      <div className="report-actions">
        <button onClick={exportToCSV} className="export-btn">
          <i>📊</i>
          Export to CSV
        </button>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="planned">Planned</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Trainer ID</label>
            <input
              type="text"
              placeholder="Enter Trainer ID"
              value={filters.trainerId}
              onChange={(e) => setFilters({...filters, trainerId: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">🎓</div>
          <div className="summary-content">
            <h4>Total Trainings</h4>
            <p>{totalTrainings.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Cost</h4>
            <p>{formatCurrency(totalTrainingCost)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <h4>Participants</h4>
            <p>{totalParticipants.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Avg Cost</h4>
            <p>{formatCurrency(avgCostPerTraining)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading training data...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Training</th>
                  <th>Trainer</th>
                  <th>Duration</th>
                  <th>Participants</th>
                  <th>Training Cost</th>
                  <th>Trainer Fee</th>
                  <th>Materials</th>
                  <th>Venue</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainingData.map((training, index) => (
                  <tr key={index}>
                    <td>{new Date(training.trainingDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="training-info">
                        <strong>{training.trainingTitle}</strong>
                        <small>{training.category}</small>
                      </div>
                    </td>
                    <td>
                      <div className="trainer-info">
                        <strong>{training.trainerName}</strong>
                        <small>{training.trainerEmail}</small>
                      </div>
                    </td>
                    <td>{training.trainingDuration}h</td>
                    <td>
                      <span className="participants-badge">{training.participantsCount}</span>
                    </td>
                    <td className="amount">{formatCurrency(training.trainingCost)}</td>
                    <td className="amount">{formatCurrency(training.trainerFee)}</td>
                    <td className="amount">{formatCurrency(training.materialsCost)}</td>
                    <td className="amount">{formatCurrency(training.venueCost)}</td>
                    <td className="total-amount">{formatCurrency(training.totalCost)}</td>
                    <td>
                      <span className={`status-badge ${training.status.toLowerCase()}`}>
                        {training.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => openModal(training, 'training')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Payout Reports Tab Component
const PayoutReportsTab = ({ formatCurrency, openModal }) => {
  const [payoutData, setPayoutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    userId: ''
  });

  useEffect(() => {
    fetchPayoutData();
  }, [filters]);

  const fetchPayoutData = async () => {
    try {
      setLoading(true);
      
      const salesSnapshot = await get(ref(database, 'HTAMS/salesDetails'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const payouts = [];
      
      if (salesSnapshot.exists()) {
        const salesData = salesSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(salesData).forEach(([saleId, sale]) => {
          if (sale.commissions && sale.commissionDistributed) {
            Object.entries(sale.commissions).forEach(([userId, commission]) => {
              const user = usersData[userId] || {};
              
              if (filters.userId && userId !== filters.userId) return;
              if (filters.startDate && new Date(sale.saleDate) < new Date(filters.startDate)) return;
              if (filters.endDate && new Date(sale.saleDate) > new Date(filters.endDate)) return;
              if (filters.status !== 'all' && sale.status?.toLowerCase() !== filters.status.toLowerCase()) return;
              
              payouts.push({
                saleId,
                userId,
                userName: user.name || 'Unknown User',
                userEmail: user.email || 'No Email',
                userRole: commission.role || user.role || 'Unknown',
                commissionAmount: commission.amount || 0,
                commissionRate: commission.rate || 0,
                saleAmount: sale.amount || 0,
                saleDate: sale.saleDate,
                productName: sale.product?.name || 'Unknown Product',
                orderNumber: sale.orderId || saleId.substring(0, 8),
                customerName: sale.customerName || 'Unknown Customer',
                status: sale.status || 'Unknown'
              });
            });
          }
        });
      }
      
      payouts.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
      setPayoutData(payouts);
      
    } catch (error) {
      console.error('Error fetching payout data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Sale ID', 'User Name', 'User Email', 'Role', 'Commission Amount', 
      'Commission Rate (%)', 'Sale Amount', 'Product Name', 'Order Number', 
      'Customer Name', 'Sale Date', 'Status'
    ];
    
    const csvData = payoutData.map(payout => [
      payout.saleId,
      payout.userName,
      payout.userEmail,
      payout.userRole,
      payout.commissionAmount,
      payout.commissionRate,
      payout.saleAmount,
      payout.productName,
      payout.orderNumber,
      payout.customerName,
      new Date(payout.saleDate).toLocaleDateString('en-IN'),
      payout.status
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payout_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Payout report exported successfully!');
  };

  const totalCommissions = payoutData.reduce((sum, payout) => sum + payout.commissionAmount, 0);
  const totalSales = payoutData.reduce((sum, payout) => sum + payout.saleAmount, 0);
  const avgCommissionRate = payoutData.length > 0 ? payoutData.reduce((sum, payout) => sum + payout.commissionRate, 0) / payoutData.length : 0;

  return (
    <div className="report-tab">
      <div className="page-header">
        <h2>Payout Report</h2>
        <p>Comprehensive commission and payout analysis</p>
      </div>

      <div className="report-actions">
        <button onClick={exportToCSV} className="export-btn">
          <i>📊</i>
          Export to CSV
        </button>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>User ID</label>
            <input
              type="text"
              placeholder="Enter User ID"
              value={filters.userId}
              onChange={(e) => setFilters({...filters, userId: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Payouts</h4>
            <p>{payoutData.length.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💵</div>
          <div className="summary-content">
            <h4>Commission Amount</h4>
            <p>{formatCurrency(totalCommissions)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💹</div>
          <div className="summary-content">
            <h4>Total Sales</h4>
            <p>{formatCurrency(totalSales)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Avg Commission Rate</h4>
            <p>{avgCommissionRate.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading payout data...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sale Date</th>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Commission</th>
                  <th>Rate</th>
                  <th>Sale Amount</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payoutData.map((payout, index) => (
                  <tr key={index}>
                    <td>{new Date(payout.saleDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="user-info">
                        <strong>{payout.userName}</strong>
                        <small>{payout.userEmail}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${payout.userRole.toLowerCase().replace(' ', '-')}`}>
                        {payout.userRole}
                      </span>
                    </td>
                    <td className="commission-amount">
                      {formatCurrency(payout.commissionAmount)}
                    </td>
                    <td>{payout.commissionRate}%</td>
                    <td className="amount">{formatCurrency(payout.saleAmount)}</td>
                    <td>{payout.productName}</td>
                    <td>{payout.customerName}</td>
                    <td>
                      <span className={`status-badge ${payout.status.toLowerCase()}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => openModal(payout, 'payout')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Transactions Tab Component
const TransactionsTab = ({ formatCurrency, openModal }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      const transactionsSnapshot = await get(ref(database, 'HTAMS/transactions'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const transactionsList = [];
      
      if (transactionsSnapshot.exists()) {
        const transactionsData = transactionsSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        Object.entries(transactionsData).forEach(([transactionId, transaction]) => {
          const user = usersData[transaction.userId] || {};
          
          if (filters.type !== 'all' && transaction.type !== filters.type) return;
          if (filters.status !== 'all' && transaction.status !== filters.status) return;
          if (filters.startDate && new Date(transaction.timestamp) < new Date(filters.startDate)) return;
          if (filters.endDate && new Date(transaction.timestamp) > new Date(filters.endDate)) return;
          
          transactionsList.push({
            id: transactionId,
            ...transaction,
            userName: user.name || 'Unknown User',
            userEmail: user.email || 'No Email'
          });
        });
      }
      
      transactionsList.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(transactionsList);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = transactions.reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
  const approvedAmount = transactions.filter(t => t.status === 'approved').reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
  const pendingAmount = transactions.filter(t => t.status === 'pending').reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

  return (
    <div className="report-tab">
      <div className="page-header">
        <h2>Transactions</h2>
        <p>All transaction history and status tracking</p>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Transaction Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">All Types</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="deposit">Deposits</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">💳</div>
          <div className="summary-content">
            <h4>Total Transactions</h4>
            <p>{transactions.length.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Amount</h4>
            <p>{formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <h4>Approved</h4>
            <p>{formatCurrency(approvedAmount)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⏳</div>
          <div className="summary-content">
            <h4>Pending</h4>
            <p>{formatCurrency(pendingAmount)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading transactions...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction ID</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Bank Details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.timestamp).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className="transaction-id">#{transaction.id.substring(0, 8)}</span>
                    </td>
                    <td>
                      <div className="user-info">
                        <strong>{transaction.userName}</strong>
                        <small>{transaction.userEmail}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge ${transaction.type}`}>
                        {transaction.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="amount">{formatCurrency(transaction.amount || 0)}</td>
                    <td>
                      <span className={`status-badge ${transaction.status?.toLowerCase()}`}>
                        {transaction.status?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {transaction.bankDetails && (
                        <div className="bank-info">
                          <strong>{transaction.bankDetails.accountHolderName}</strong>
                          <small>{transaction.bankDetails.bankName}</small>
                          <small>****{transaction.bankDetails.accountNumber?.slice(-4)}</small>
                        </div>
                      )}
                    </td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => openModal(transaction, 'transaction')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// User Analytics Tab Component
const UserAnalyticsTab = ({ formatCurrency, openModal }) => {
  const [userAnalytics, setUserAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAnalytics();
  }, []);

  const fetchUserAnalytics = async () => {
    try {
      setLoading(true);
      
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));
      
      const analytics = [];
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        
        Object.entries(usersData).forEach(([userId, user]) => {
          if (user.analytics || user.role) {
            analytics.push({
              userId,
              name: user.name || 'Unknown User',
              email: user.email || 'No Email',
              role: user.role || 'Unknown',
              currentLevel: user.currentLevel || 'N/A',
              totalEarnings: user.analytics?.totalCommissionsEarned || 0,
              totalReceived: user.analytics?.totalCommissionsReceived || 0,
              totalOrders: user.analytics?.totalOrders || 0,
              totalSales: user.analytics?.totalSales || 0,
              isActive: user.isActive !== false,
              createdAt: user.createdAt,
              lastLoginAt: user.lastLoginAt || user.createdAt
            });
          }
        });
      }
      
      analytics.sort((a, b) => b.totalEarnings - a.totalEarnings);
      setUserAnalytics(analytics);
      
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      toast.error('Failed to load user analytics');
    } finally {
      setLoading(false);
    }
  };

  const totalUsers = userAnalytics.length;
  const activeUsers = userAnalytics.filter(user => user.isActive).length;
  const totalEarnings = userAnalytics.reduce((sum, user) => sum + user.totalEarnings, 0);

  return (
    <div className="report-tab">
      <div className="page-header">
        <h2>User Analytics</h2>
        <p>User performance and engagement metrics</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">👥</div>
          <div className="summary-content">
            <h4>Total Users</h4>
            <p>{totalUsers.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <h4>Active Users</h4>
            <p>{activeUsers.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Earnings</h4>
            <p>{formatCurrency(totalEarnings)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Activity Rate</h4>
            <p>{totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading user analytics...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role/Level</th>
                  <th>Total Earnings</th>
                  <th>Total Received</th>
                  <th>Orders</th>
                  <th>Sales</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userAnalytics.map((user) => (
                  <tr key={user.userId}>
                    <td>
                      <div className="user-info">
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </div>
                    </td>
                    <td>
                      <div className="role-info">
                        <span className={`role-badge ${user.role?.toLowerCase().replace(' ', '-')}`}>
                          {user.role}
                        </span>
                        <small>{user.currentLevel}</small>
                      </div>
                    </td>
                    <td className="earnings">{formatCurrency(user.totalEarnings)}</td>
                    <td className="received">{formatCurrency(user.totalReceived)}</td>
                    <td>{user.totalOrders.toLocaleString('en-IN')}</td>
                    <td>{formatCurrency(user.totalSales)}</td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => openModal(user, 'user')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
  
};
export default CADashboard;
