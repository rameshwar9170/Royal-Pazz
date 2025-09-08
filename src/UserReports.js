import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from './firebase/config';
import { utils, writeFile } from 'xlsx';
import './UserReports.css';

const UserReports = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [salesData, setSalesData] = useState({
    personalSales: [],
    teamSales: [],
    commissionHistory: [],
    totalPersonalSales: 0,
    totalTeamCommission: 0,
    totalOrders: 0,
    teamMembersCount: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Refs for export tables
  const personalTableRef = useRef(null);
  const teamTableRef = useRef(null);

  useEffect(() => {
    if (userId) {
      fetchUserReports();
    }
  }, [userId]);

  const fetchUserReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchUserDetails(),
        fetchSalesData()
      ]);
    } catch (err) {
      setError(`Failed to load user reports: ${err.message}`);
      console.error('Error fetching user reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    const userRef = ref(db, `HTAMS/users/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      setUserDetails(snapshot.val());
    } else {
      throw new Error('User not found');
    }
  };

  const fetchSalesData = async () => {
    const userRef = ref(db, `HTAMS/users/${userId}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) return;
    
    const userData = userSnapshot.val();
    const personalSales = [];
    const teamSales = [];
    const commissionHistory = [];
    let totalPersonalSales = parseFloat(userData.MySales) || 0;
    let totalTeamCommission = 0;
    let totalOrders = 0;
    let teamMembersCount = 0;

    // Process commission history
    if (userData.commissionHistory) {
      Object.entries(userData.commissionHistory).forEach(([id, commission]) => {
        const commissionData = {
          id,
          ...commission,
          date: new Date(commission.at),
          amount: parseFloat(commission.amount) || 0,
          product: commission.product || { name: 'Unknown Product' },
          isPersonal: !commission.fromUser || commission.fromUser === userId,
          isFromTeam: commission.fromUser && 
                     commission.fromUser !== userId && 
                     commission.fromUser !== userData.referredBy
        };

        commissionHistory.push(commissionData);
        
        if (commissionData.isPersonal) {
          personalSales.push(commissionData);
        } else if (commissionData.isFromTeam) {
          teamSales.push(commissionData);
          totalTeamCommission += commissionData.amount;
        }
      });
    }

    // Get analytics data
    if (userData.analytics) {
      totalOrders = userData.analytics.totalOrders || 0;
    }

    // Fetch team members' sales details
    const allUsersRef = ref(db, 'HTAMS/users');
    const usersSnapshot = await get(allUsersRef);
    
    if (usersSnapshot.exists()) {
      const allUsers = usersSnapshot.val();
      const teamMembers = Object.values(allUsers).filter(user => 
        user.referredBy === userId
      );

      teamMembersCount = teamMembers.length;

      // Add team member details to team sales
      teamSales.forEach(sale => {
        const teamMember = teamMembers.find(member => 
          Object.keys(allUsers).find(uid => allUsers[uid] === member) === sale.fromUser
        );
        if (teamMember) {
          sale.teamMemberName = teamMember.name;
          sale.teamMemberLevel = teamMember.currentLevel;
        }
      });
    }

    setSalesData({
      personalSales,
      teamSales,
      commissionHistory,
      totalPersonalSales,
      totalTeamCommission,
      totalOrders,
      teamMembersCount
    });
  };

  const formatCurrency = (amount) => {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const filterDataByDateRange = (data) => {
    if (dateRange === 'all') return data;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateRange) {
      case '7d':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return data;
    }
    
    return data.filter(item => new Date(item.date || item.at) >= filterDate);
  };

  const sortData = (data) => {
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date || a.at).getTime();
          bValue = new Date(b.date || b.at).getTime();
          break;
        case 'amount':
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case 'product':
          aValue = (a.product?.name || '').toLowerCase();
          bValue = (b.product?.name || '').toLowerCase();
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? 
        (aValue > bValue ? 1 : -1) : 
        (aValue < bValue ? 1 : -1);
    });
  };

  const getFilteredPersonalSales = () => {
    return sortData(filterDataByDateRange(salesData.personalSales));
  };

  const getFilteredTeamSales = () => {
    return sortData(filterDataByDateRange(salesData.teamSales));
  };

  const calculateGrowthPercentage = () => {
    if (salesData.totalPersonalSales === 0) return 0;
    const growth = (salesData.totalTeamCommission / salesData.totalPersonalSales) * 100;
    return Math.round(growth);
  };

  // Export Functions
  const exportOverviewToExcel = () => {
    const overviewData = [
      {
        'Report Type': 'Overview Report',
        'User Name': userDetails?.name || 'Unknown',
        'User Email': userDetails?.email || 'Not Available',
        'Role': userDetails?.role || 'No Role',
        'Level': userDetails?.currentLevel || 'N/A',
        'Report Generated On': new Date().toLocaleDateString('en-IN'),
        'Time Period': dateRange === 'all' ? 'All Time' : 
                      dateRange === '7d' ? 'Last 7 Days' :
                      dateRange === '30d' ? 'Last 30 Days' :
                      dateRange === '90d' ? 'Last 90 Days' : dateRange
      },
      {},
      {
        'Metric': 'Total Revenue (MySales)',
        'Value': `₹${salesData.totalPersonalSales.toLocaleString('en-IN')}`,
        'Description': 'Direct sales performance'
      },
      {
        'Metric': 'Team Commission',
        'Value': `₹${salesData.totalTeamCommission.toLocaleString('en-IN')}`,
        'Description': `Earnings from ${salesData.teamMembersCount} team members`
      },
      {
        'Metric': 'Total Orders',
        'Value': salesData.totalOrders,
        'Description': `Avg Order Value: ₹${salesData.totalOrders > 0 ? (salesData.totalPersonalSales / salesData.totalOrders).toLocaleString('en-IN') : '0'}`
      },
      {
        'Metric': 'Team Size',
        'Value': salesData.teamMembersCount,
        'Description': 'Number of referred team members'
      },
      {
        'Metric': 'Team Contribution',
        'Value': `${Math.round((salesData.totalTeamCommission / (salesData.totalPersonalSales + salesData.totalTeamCommission)) * 100) || 0}%`,
        'Description': 'Team vs Personal ratio'
      },
      {},
      {
        'Performance Summary': 'Commission Breakdown',
        'Personal': `${Math.round((salesData.totalPersonalSales / (salesData.totalPersonalSales + salesData.totalTeamCommission)) * 100) || 0}%`,
        'Team': `${Math.round((salesData.totalTeamCommission / (salesData.totalPersonalSales + salesData.totalTeamCommission)) * 100) || 0}%`
      }
    ];

    const worksheet = utils.json_to_sheet(overviewData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Overview Report");
    
    const fileName = `${userDetails?.name || 'User'}_Overview_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, fileName);
  };

  const exportPersonalSalesToExcel = () => {
    const personalSalesData = getFilteredPersonalSales().map((sale, index) => ({
      'S.No': index + 1,
      'Date': formatDate(sale.date),
      'Product Name': sale.product?.name || 'Unknown Product',
      'Sale Amount': `₹${(sale.saleAmount || 0).toLocaleString('en-IN')}`,
      'Commission Amount': `₹${sale.amount.toLocaleString('en-IN')}`,
      'Role at Earning': sale.roleAtEarning || 'N/A',
      'Commission ID': sale.id || 'N/A',
      'Transaction Time': sale.at ? new Date(sale.at).toLocaleString('en-IN') : 'N/A'
    }));

    // Add summary at the top
    const summaryData = [
      {
        'Report': 'Personal Sales Report',
        'User Name': userDetails?.name || 'Unknown',
        'Time Period': dateRange === 'all' ? 'All Time' : 
                      dateRange === '7d' ? 'Last 7 Days' :
                      dateRange === '30d' ? 'Last 30 Days' :
                      dateRange === '90d' ? 'Last 90 Days' : dateRange,
        'Sort By': sortBy.charAt(0).toUpperCase() + sortBy.slice(1),
        'Sort Order': sortOrder.toUpperCase(),
        'Generated On': new Date().toLocaleDateString('en-IN')
      },
      {},
      {
        'Total Records': personalSalesData.length,
        'Total Commission': `₹${getFilteredPersonalSales().reduce((sum, sale) => sum + sale.amount, 0).toLocaleString('en-IN')}`
      },
      {},
      ...personalSalesData
    ];

    const worksheet = utils.json_to_sheet(summaryData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Personal Sales");
    
    const fileName = `${userDetails?.name || 'User'}_Personal_Sales_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, fileName);
  };

  const exportTeamSalesToExcel = () => {
    const teamSalesData = getFilteredTeamSales().map((sale, index) => ({
      'S.No': index + 1,
      'Date': formatDate(sale.date),
      'Team Member': sale.teamMemberName || 'Unknown Member',
      'Member Level': sale.teamMemberLevel ? `L${sale.teamMemberLevel}` : 'N/A',
      'Product Name': sale.product?.name || 'Unknown Product',
      'Sale Amount': `₹${(sale.saleAmount || 0).toLocaleString('en-IN')}`,
      'Commission Amount': `₹${sale.amount.toLocaleString('en-IN')}`,
      'Role at Earning': sale.roleAtEarning || 'N/A',
      'Commission ID': sale.id || 'N/A',
      'Transaction Time': sale.at ? new Date(sale.at).toLocaleString('en-IN') : 'N/A'
    }));

    // Add summary at the top
    const summaryData = [
      {
        'Report': 'Team Sales Report',
        'User Name': userDetails?.name || 'Unknown',
        'Team Size': salesData.teamMembersCount,
        'Time Period': dateRange === 'all' ? 'All Time' : 
                      dateRange === '7d' ? 'Last 7 Days' :
                      dateRange === '30d' ? 'Last 30 Days' :
                      dateRange === '90d' ? 'Last 90 Days' : dateRange,
        'Sort By': sortBy.charAt(0).toUpperCase() + sortBy.slice(1),
        'Sort Order': sortOrder.toUpperCase(),
        'Generated On': new Date().toLocaleDateString('en-IN')
      },
      {},
      {
        'Total Records': teamSalesData.length,
        'Total Team Commission': `₹${getFilteredTeamSales().reduce((sum, sale) => sum + sale.amount, 0).toLocaleString('en-IN')}`,
        'Average per Member': salesData.teamMembersCount > 0 ? `₹${(salesData.totalTeamCommission / salesData.teamMembersCount).toLocaleString('en-IN')}` : '₹0'
      },
      {},
      ...teamSalesData
    ];

    const worksheet = utils.json_to_sheet(summaryData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Team Sales");
    
    const fileName = `${userDetails?.name || 'User'}_Team_Sales_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    writeFile(workbook, fileName);
  };

  if (loading) {
    return (
      <div className="user-reports-container">
        <div className="user-reports-loading">
          <div className="user-reports-loader">
            <div className="user-reports-loader-ring"></div>
            <div className="user-reports-loader-ring"></div>
            <div className="user-reports-loader-ring"></div>
          </div>
          <h2>Loading Analytics Dashboard...</h2>
          <p>Processing sales data and generating insights</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-reports-container">
        <div className="user-reports-error">
          <div className="user-reports-error-icon">⚠️</div>
          <h2>Error Loading Reports</h2>
          <p>{error}</p>
          <div className="user-reports-error-actions">
            <button className="user-reports-retry-btn" onClick={fetchUserReports}>
              🔄 Retry
            </button>
            <button className="user-reports-back-btn" onClick={() => navigate(-1)}>
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-reports-container">
      {/* Enhanced Header */}
      <div className="user-reports-header">
        <button className="user-reports-back-btn" onClick={() => navigate(-1)}>
          <span className="user-reports-back-icon">←</span>
          Back to Dashboard
        </button>
        <div className="user-reports-header-content">
          <div className="user-reports-user-avatar">
            <div className="user-reports-avatar-circle">
              {userDetails?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="user-reports-avatar-status active"></div>
          </div>
          <div className="user-reports-user-details">
            <h1 className="user-reports-user-name">{userDetails?.name || 'Unknown User'}</h1>
            <div className="user-reports-user-meta">
              <span className="user-reports-level">Level {userDetails?.currentLevel || 'N/A'}</span>
            </div>
            <p className="user-reports-email">{userDetails?.email}</p>
          </div>
        </div>
        <div className="user-reports-header-stats">
          <div className="user-reports-header-stat">
            <span className="user-reports-stat-number">{salesData.teamMembersCount}</span>
            <span className="user-reports-stat-label">Team Size</span>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="user-reports-summary">
        <div className="user-reports-summary-card primary">
          <div className="user-reports-card-header">
            <div className="user-reports-card-icon-wrapper">
              <span className="user-reports-card-icon">💰</span>
            </div>
            <div className="user-reports-card-trend positive">
              <span className="user-reports-trend-icon">📈</span>
              <span className="user-reports-trend-text">+{calculateGrowthPercentage()}%</span>
            </div>
          </div>
          <div className="user-reports-card-content">
            <div className="user-reports-card-value">
              {formatCurrency(salesData.totalPersonalSales)}
            </div>
            <div className="user-reports-card-label">Total Revenue (MySales)</div>
            <div className="user-reports-card-description">
              Your direct sales performance
            </div>
          </div>
        </div>
        
        <div className="user-reports-summary-card secondary">
          <div className="user-reports-card-header">
            <div className="user-reports-card-icon-wrapper">
              <span className="user-reports-card-icon">👥</span>
            </div>
            <div className="user-reports-card-trend neutral">
              <span className="user-reports-trend-icon">➡️</span>
              <span className="user-reports-trend-text">Team</span>
            </div>
          </div>
          <div className="user-reports-card-content">
            <div className="user-reports-card-value">
              {formatCurrency(salesData.totalTeamCommission)}
            </div>
            <div className="user-reports-card-label">Team Commission</div>
            <div className="user-reports-card-description">
              Earnings from {salesData.teamMembersCount} team members
            </div>
          </div>
        </div>
        
        <div className="user-reports-summary-card accent">
          <div className="user-reports-card-header">
            <div className="user-reports-card-icon-wrapper">
              <span className="user-reports-card-icon">📦</span>
            </div>
            <div className="user-reports-card-trend positive">
              <span className="user-reports-trend-icon">🎯</span>
              <span className="user-reports-trend-text">Orders</span>
            </div>
          </div>
          <div className="user-reports-card-content">
            <div className="user-reports-card-value">{salesData.totalOrders}</div>
            <div className="user-reports-card-label">Total Orders</div>
            <div className="user-reports-card-description">
              Avg: {salesData.totalOrders > 0 ? formatCurrency(salesData.totalPersonalSales / salesData.totalOrders) : '₹0'}
            </div>
          </div>
        </div>

        <div className="user-reports-summary-card success">
          <div className="user-reports-card-header">
            <div className="user-reports-card-icon-wrapper">
              <span className="user-reports-card-icon">⚡</span>
            </div>
            <div className="user-reports-card-trend positive">
              <span className="user-reports-trend-icon">🔥</span>
              <span className="user-reports-trend-text">Active</span>
            </div>
          </div>
          <div className="user-reports-card-content">
            <div className="user-reports-card-value">
              {Math.round((salesData.totalTeamCommission / (salesData.totalPersonalSales + salesData.totalTeamCommission)) * 100) || 0}%
            </div>
            <div className="user-reports-card-label">Team Contribution</div>
            <div className="user-reports-card-description">
              Team vs Personal ratio
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls with Export Buttons */}
      <div className="user-reports-controls">
        <div className="user-reports-tabs">
          <button 
            className={`user-reports-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="user-reports-tab-icon">📊</span>
            Overview
          </button>
          <button 
            className={`user-reports-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <span className="user-reports-tab-icon">💼</span>
            Personal Sales
          </button>
          <button 
            className={`user-reports-tab ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <span className="user-reports-tab-icon">👥</span>
            Team Sales
          </button>
        </div>

        <div className="user-reports-actions">
          {/* Export Buttons */}
          <div className="user-reports-export-buttons">
            <button 
              className="user-reports-export-btn overview"
              onClick={exportOverviewToExcel}
              title="Download Overview Report"
            >
              <span className="user-reports-export-icon">📊</span>
              Export Overview
            </button>
            <button 
              className="user-reports-export-btn personal"
              onClick={exportPersonalSalesToExcel}
              title="Download Personal Sales Report"
            >
              <span className="user-reports-export-icon">💼</span>
              Export Personal
            </button>
            <button 
              className="user-reports-export-btn team"
              onClick={exportTeamSalesToExcel}
              title="Download Team Sales Report"
            >
              <span className="user-reports-export-icon">👥</span>
              Export Team
            </button>
          </div>

          {/* Filters */}
          <div className="user-reports-filters">
            <div className="user-reports-filter-group">
              <label className="user-reports-filter-label">Time Period</label>
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="user-reports-select"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
            
            <div className="user-reports-filter-group">
              <label className="user-reports-filter-label">Sort By</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="user-reports-select"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="product">Product</option>
              </select>
            </div>
            
            <button 
              className="user-reports-sort-btn"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Content */}
      <div className="user-reports-content">
        {activeTab === 'overview' && (
          <div className="user-reports-overview">
            <div className="user-reports-insights-grid">
              <div className="user-reports-insight-card">
                <h3 className="user-reports-insight-title">Performance Summary</h3>
                <div className="user-reports-performance-metrics">
                  <div className="user-reports-metric-item">
                    <span className="user-reports-metric-label">Total Revenue</span>
                    <span className="user-reports-metric-value large">
                      {formatCurrency(salesData.totalPersonalSales)}
                    </span>
                  </div>
                  <div className="user-reports-metric-item">
                    <span className="user-reports-metric-label">Commission Breakdown</span>
                    <div className="user-reports-breakdown">
                      <div className="user-reports-breakdown-item">
                        <span className="user-reports-breakdown-label">Personal</span>
                        <span className="user-reports-breakdown-value">
                          {Math.round((salesData.totalPersonalSales / (salesData.totalPersonalSales + salesData.totalTeamCommission)) * 100) || 0}%
                        </span>
                      </div>
                      <div className="user-reports-breakdown-item">
                        <span className="user-reports-breakdown-label">Team</span>
                        <span className="user-reports-breakdown-value">
                          {Math.round((salesData.totalTeamCommission / (salesData.totalPersonalSales + salesData.totalTeamCommission)) * 100) || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="user-reports-metric-item">
                    <span className="user-reports-metric-label">Average Order Value</span>
                    <span className="user-reports-metric-value">
                      {salesData.totalOrders > 0 ? 
                        formatCurrency(salesData.totalPersonalSales / salesData.totalOrders) : 
                        formatCurrency(0)
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="user-reports-insight-card">
                <h3 className="user-reports-insight-title">Team Overview</h3>
                <div className="user-reports-team-stats">
                  <div className="user-reports-team-stat">
                    <span className="user-reports-team-number">{salesData.teamMembersCount}</span>
                    <span className="user-reports-team-label">Team Members</span>
                  </div>
                  <div className="user-reports-team-stat">
                    <span className="user-reports-team-number">{formatCurrency(salesData.totalTeamCommission)}</span>
                    <span className="user-reports-team-label">Team Commission</span>
                  </div>
                  <div className="user-reports-team-stat">
                    <span className="user-reports-team-number">
                      {salesData.teamMembersCount > 0 ? formatCurrency(salesData.totalTeamCommission / salesData.teamMembersCount) : '₹0'}
                    </span>
                    <span className="user-reports-team-label">Avg per Member</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="user-reports-table-section">
            <div className="user-reports-section-header">
              <h3>Personal Sales History</h3>
              <span className="user-reports-record-count">{getFilteredPersonalSales().length} records</span>
            </div>
            {getFilteredPersonalSales().length > 0 ? (
              <div className="user-reports-table-container">
                <table className="user-reports-table" ref={personalTableRef}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Sale Amount</th>
                      <th>Commission</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredPersonalSales().map((sale, index) => (
                      <tr key={sale.id || index} className="user-reports-table-row">
                        <td className="user-reports-date">{formatDate(sale.date)}</td>
                        <td className="user-reports-product">
                          <div className="user-reports-product-info">
                            <span className="user-reports-product-name">{sale.product?.name || 'Unknown Product'}</span>
                          </div>
                        </td>
                        <td className="user-reports-amount">{formatCurrency(sale.saleAmount || 0)}</td>
                        <td className="user-reports-commission">{formatCurrency(sale.amount)}</td>
                        <td>
                          <span className="user-reports-role-badge">
                            {sale.roleAtEarning || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="user-reports-empty">
                <div className="user-reports-empty-icon">📊</div>
                <h4>No Personal Sales Found</h4>
                <p>No sales data available for the selected period.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="user-reports-table-section">
            <div className="user-reports-section-header">
              <h3>Team Sales Performance</h3>
              <span className="user-reports-record-count">{getFilteredTeamSales().length} records</span>
            </div>
            {getFilteredTeamSales().length > 0 ? (
              <div className="user-reports-table-container">
                <table className="user-reports-table" ref={teamTableRef}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Team Member</th>
                      <th>Product</th>
                      <th>Sale Amount</th>
                      <th>Commission</th>
                      <th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTeamSales().map((sale, index) => (
                      <tr key={sale.id || index} className="user-reports-table-row">
                        <td className="user-reports-date">{formatDate(sale.date)}</td>
                        <td className="user-reports-member">
                          <div className="user-reports-member-info">
                            <span className="user-reports-member-name">{sale.teamMemberName || 'Unknown Member'}</span>
                          </div>
                        </td>
                        <td className="user-reports-product">
                          <span className="user-reports-product-name">{sale.product?.name || 'Unknown Product'}</span>
                        </td>
                        <td className="user-reports-amount">{formatCurrency(sale.saleAmount || 0)}</td>
                        <td className="user-reports-commission">{formatCurrency(sale.amount)}</td>
                        <td>
                          <span className="user-reports-level-badge">
                            L{sale.teamMemberLevel || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="user-reports-empty">
                <div className="user-reports-empty-icon">👥</div>
                <h4>No Team Sales Found</h4>
                <p>No team commission data available for the selected period.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserReports;
