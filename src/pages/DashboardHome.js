import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { ref, get } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/Dashboard.css';
import {
    FaDollarSign,
    FaUsers,
    FaShoppingCart,
    FaChartLine,
    FaArrowUp,
    FaArrowDown,
    FaCalendarAlt,
    FaGift,
    FaHandshake,
    FaStar,
    FaMapMarkerAlt,
    FaBusinessTime,
    FaPercentage,
    FaCrown,
    FaFire,
    FaBolt,
    FaGem,
    FaRocket,
    FaAward,
    FaExchangeAlt,
    FaUserFriends,
    FaEye,
    FaTimes,
    FaNetworkWired,
    FaUser,
    FaTag,
    FaWallet
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardHome = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTimeframe, setActiveTimeframe] = useState('7d');
    const [showTeamCommissionModal, setShowTeamCommissionModal] = useState(false);
    const [teamCommissionData, setTeamCommissionData] = useState([]);
    const [allUsers, setAllUsers] = useState({});
    const [currentUserId, setCurrentUserId] = useState(null);
    const [actualTeamCount, setActualTeamCount] = useState(0);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserId(user.uid); // Store current user ID
                try {
                    // Fetch user data
                    const userRef = ref(db, `HTAMS/users/${user.uid}`);
                    const snapshot = await get(userRef);
                    if (snapshot.exists()) {
                        setUserData(snapshot.val());
                    }

                    // Fetch all users data for fromUser names
                    const allUsersRef = ref(db, `HTAMS/users`);
                    const allUsersSnapshot = await get(allUsersRef);
                    if (allUsersSnapshot.exists()) {
                        setAllUsers(allUsersSnapshot.val());
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                } finally {
                    setLoading(false);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Fetch team count when currentUserId is available
    useEffect(() => {
        const fetchTeamCount = async () => {
            if (!currentUserId) return;
            
            try {
                const usersRef = ref(db, 'HTAMS/users');
                const snapshot = await get(usersRef);
                if (snapshot.exists()) {
                    const allUsers = Object.values(snapshot.val());
                    const teamMembers = allUsers.filter(user => user.referredBy === currentUserId);
                    setActualTeamCount(teamMembers.length);
                }
            } catch (error) {
                console.error('Error fetching team count:', error);
                setActualTeamCount(0);
            }
        };

        fetchTeamCount();
    }, [currentUserId]);

    // Filter team commission data (exclude current user's own commissions)
    const getTeamCommissionData = () => {
        if (!userData || !currentUserId) return [];
        
        const teamCommissions = userData.commissionHistory || {};
        return Object.entries(teamCommissions)
            .filter(([key, commission]) => commission.fromUser !== currentUserId) // Exclude own commissions
            .map(([key, commission]) => ({
                id: key,
                ...commission
            }))
            .sort((a, b) => new Date(b.at) - new Date(a.at)); // Sort by date descending
    };

    // Calculate team commission stats (excluding own commissions)
    const getTeamCommissionStats = () => {
        const teamData = getTeamCommissionData();
        const totalAmount = teamData.reduce((sum, commission) => sum + commission.amount, 0);
        return {
            total: totalAmount,
            count: teamData.length,
            average: teamData.length > 0 ? totalAmount / teamData.length : 0
        };
    };

    // Fetch team commission data for modal
    const handleTeamCommissionClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!userData || !currentUserId) return;
        
        try {
            const teamData = getTeamCommissionData();
            setTeamCommissionData(teamData);
            setShowTeamCommissionModal(true);
        } catch (error) {
            console.error('Error fetching team commission data:', error);
        }
    };

    // Get user name by ID
    const getUserNameById = (userId) => {
        if (!userId || !allUsers[userId]) return 'Unknown User';
        return allUsers[userId].name || 'Unknown User';
    };

    if (loading) {
        return (
            <div className="premium-loading-container">
                <div className="premium-loading-spinner">
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                    <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">Loading Your Premium Dashboard...</p>
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="premium-error-container">
                <div className="error-icon">⚠️</div>
                <h3>No Data Available</h3>
                <p>Unable to load dashboard data. Please try again.</p>
            </div>
        );
    }

    const {
        analytics,
        commissionHistory,
        name,
        Role,
        city,
        state,
        MySales,
        MyTeam,
        salesHistory,
        currentLevel,
        createdAt,
        transactions
    } = userData;

    // Enhanced data processing
    const commissionData = Object.values(commissionHistory || {});

    // Calculate total withdrawal from approved transactions
    const calculateTotalWithdrawal = () => {
        if (!transactions) return 0;
        return Object.values(transactions)
            .filter(transaction => transaction.status === 'approved' && transaction.type === 'withdrawal')
            .reduce((total, transaction) => total + (transaction.amount || 0), 0);
    };

    const totalWithdrawal = calculateTotalWithdrawal();

    // Get team commission stats
    const teamStats = getTeamCommissionStats();

    // Daily commission data (last 14 days) - for personal commissions
    const dailyData = commissionData.reduce((acc, commission) => {
        const date = new Date(commission.at);
        const dayKey = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!acc[dayKey]) {
            acc[dayKey] = { label: dayLabel, amount: 0, count: 0 };
        }
        acc[dayKey].amount += commission.amount;
        acc[dayKey].count += 1;
        return acc;
    }, {});

    const sortedDailyData = Object.entries(dailyData)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .slice(-14);

    // Performance metrics
    const totalEarningsThisMonth = commissionData
        .filter(c => new Date(c.at).getMonth() === new Date().getMonth())
        .reduce((sum, c) => sum + c.amount, 0);

    const avgCommissionPerSale = commissionData.length > 0
        ? (analytics?.totalCommissionsEarned || 0) / commissionData.length
        : 0;

    const growthRate = totalEarningsThisMonth > 0 ?
        ((totalEarningsThisMonth / (analytics?.totalCommissionsEarned || 1)) * 100) : 0;

    // Chart configurations with premium styling
    const lineChartData = {
        labels: sortedDailyData.map(([_, data]) => data.label),
        datasets: [
            {
                label: 'Daily Commissions',
                data: sortedDailyData.map(([_, data]) => data.amount),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#6366f1',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 10,
                pointHoverBackgroundColor: '#6366f1',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 3,
            },
        ],
    };

    const barChartData = {
        labels: ['Total Sales', 'Commissions', 'My Sales'],
        datasets: [
            {
                label: 'Amount (₹)',
                data: [
                    analytics?.totalSales || 0,
                    analytics?.totalCommissionsEarned || 0,
                    parseInt(MySales) || 0,
                ],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 40,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 13,
                        weight: '600',
                        family: "'Inter', sans-serif"
                    },
                    color: '#64748b'
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#6366f1',
                borderWidth: 1,
                cornerRadius: 12,
                displayColors: false,
                titleFont: {
                    size: 14,
                    weight: '600'
                },
                bodyFont: {
                    size: 13,
                    weight: '500'
                },
                padding: 12
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f1f5f9',
                    drawBorder: false,
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        size: 12,
                        weight: '500'
                    },
                    callback: function (value) {
                        return '₹' + value.toLocaleString();
                    }
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        size: 12,
                        weight: '500'
                    }
                }
            }
        }
    };

    return (
        <div className="premium-dashboard">
            {/* Premium Header */}
            <div className="dashboard-header-premium">
                <div className="header-container">
                    <div className="user-section">
                        <div className="avatar-container">
                            {userData.passportPhoto ? (
                                <img src={userData.passportPhoto} alt="Profile" className="user-avatar-premium" />
                            ) : (
                                <div className="avatar-fallback">
                                    {name?.charAt(0)}
                                </div>
                            )}
                            <div className="status-dot"></div>
                        </div>
                        <div className="user-info-premium">
                            <h1 className="welcome-title">Welcome back, {name}!</h1>
                            <p className="user-subtitle">{currentLevel || Role} • {city}, {state}</p>
                            <div className="user-badges">
                                <span className="badge-item premium-member">
                                    <FaCrown /> Premium Member
                                </span>
                                <span className="badge-item active-status">
                                    <FaBolt /> Active Today
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="timeframe-selector">
                            {['7d', '30d', '90d'].map((period) => (
                                <button
                                    key={period}
                                    className={`timeframe-btn ${activeTimeframe === period ? 'active' : ''}`}
                                    onClick={() => setActiveTimeframe(period)}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Stats Grid - Now with 6 cards */}
            <div className="stats-container">
                <div className="stat-card-premium stat-primary">
                    <div className="stat-header">
                        <div className="stat-icon-container primary">
                            <FaDollarSign />
                        </div>
                        <div className="trend-badge positive">
                            <FaArrowUp />
                            <span>+12.5%</span>
                        </div>
                    </div>
                    <div className="stat-body">
                        <h3 className="stat-value">₹{analytics?.totalSales?.toLocaleString() || '0'}</h3>
                        <p className="stat-label">Total Sales</p>
                        <div className="progress-indicator">
                            <div className="progress-bar-premium" style={{ width: '85%' }}></div>
                        </div>
                    </div>
                </div>

                {/* New My Earning Card */}
                <div className="stat-card-premium stat-earning">
                    <div className="stat-header">
                        <div className="stat-icon-container earning">
                            <FaWallet />
                        </div>
                        <div className="trend-badge positive">
                            <FaArrowUp />
                            <span>+18.7%</span>
                        </div>
                    </div>
                    <div className="stat-body">
                        <h3 className="stat-value">₹{parseInt(MySales)?.toLocaleString() || '0'}</h3>
                        <p className="stat-label">My Earning</p>
                        <div className="progress-indicator">
                            <div className="progress-bar-premium earning" style={{ width: '75%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="stat-card-premium stat-success">
                    <div className="stat-header">
                        <div className="stat-icon-container success">
                            <FaChartLine />
                        </div>
                        <div className="trend-badge positive">
                            <FaArrowUp />
                            <span>+8.2%</span>
                        </div>
                    </div>
                    <div className="stat-body">
                        <h3 className="stat-value">₹{analytics?.totalCommissionsEarned?.toLocaleString() || '0'}</h3>
                        <p className="stat-label">Commissions Earned</p>
                        <div className="progress-indicator">
                            <div className="progress-bar-premium success" style={{ width: '92%' }}></div>
                        </div>
                    </div>
                </div>

                     {/* Team Commission Card - Now with icon */}
                <div className="stat-card-premium stat-team-commission clickable-card" onClick={handleTeamCommissionClick}>
                    <div className="stat-header">
                        <div className="stat-icon-container team-commission">
                            <FaNetworkWired />
                        </div>
                        <div className="trend-badge view-badge">
                            <FaEye />
                            <span>View</span>
                        </div>
                    </div>
                    <div className="stat-body">
                        <h3 className="stat-value">₹{teamStats.total.toLocaleString()}</h3>
                        <p className="stat-label">TEAM COMMISSION</p>
                        <div className="stat-meta">
                            <span className="commission-count">{teamStats.count} transactions</span>
                        </div>
                        <div className="progress-indicator">
                            <div className="progress-bar-premium team-commission" style={{ width: '68%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="stat-card-premium stat-warning">
                    <div className="stat-header">
                        <div className="stat-icon-container warning">
                            <FaShoppingCart />
                        </div>
                        <div className="trend-badge positive">
                            <FaArrowUp />
                            <span>+15.1%</span>
                        </div>
                    </div>
                    <div className="stat-body">
                        <h3 className="stat-value">{analytics?.totalOrders || '0'}</h3>
                        <p className="stat-label">Total Orders</p>
                        <div className="progress-indicator">
                            <div className="progress-bar-premium warning" style={{ width: '78%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="stat-card-premium stat-info">
                    <div className="stat-header">
                        <div className="stat-icon-container info">
                            <FaPercentage />
                        </div>
                        <div className="trend-badge positive">
                            <FaArrowUp />
                            <span>+5.3%</span>
                        </div>
                    </div>
                    <div className="stat-body">
                        <h3 className="stat-value">{growthRate.toFixed(1)}%</h3>
                        <p className="stat-label">Growth Rate</p>
                        <div className="progress-indicator">
                            <div className="progress-bar-premium info" style={{ width: `${Math.min(growthRate, 100)}%` }}></div>
                        </div>
                    </div>
                </div>

           
            </div>

            {/* Premium Charts Section */}
            <div className="charts-container">
                <div className="chart-card-premium large-chart">
                    <div className="chart-header-premium">
                        <div className="chart-title-section">
                            <h3 className="chart-title">
                                <FaChartLine className="chart-title-icon" />
                                Daily Commission Trend
                            </h3>
                            <p className="chart-subtitle">Last 14 days performance</p>
                        </div>
                        <div className="chart-controls">
                            <button className="chart-control-btn">
                                <FaExchangeAlt />
                            </button>
                        </div>
                    </div>
                    <div className="chart-content">
                        <Line data={lineChartData} options={chartOptions} />
                    </div>
                </div>

                <div className="chart-card-premium medium-chart">
                    <div className="chart-header-premium">
                        <div className="chart-title-section">
                            <h3 className="chart-title">
                                <FaBusinessTime className="chart-title-icon" />
                                Financial Overview
                            </h3>
                            <p className="chart-subtitle">Revenue breakdown</p>
                        </div>
                    </div>
                    <div className="chart-content">
                        <Bar data={barChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="bottom-section">
                <div className="activity-card-premium">
                    <div className="section-header-premium">
                        <div className="section-title-area">
                            <h3 className="section-title">
                                <FaBolt className="section-icon" />
                                Recent Commission Activity
                            </h3>
                            <span className="activity-counter">{commissionData.length} transactions</span>
                        </div>
                    </div>
                    <div className="activity-list-premium">
                        {commissionData.map((commission, index) => (
                            <div key={index} className="activity-item-premium">
                                <div className="activity-icon-premium">
                                    <FaDollarSign />
                                </div>
                                <div className="activity-details">
                                    <div className="activity-main-info">
                                        <h4 className="activity-title">Commission Earned</h4>
                                        <span className="activity-amount">₹{commission.amount.toLocaleString()}</span>
                                    </div>
                                    <div className="activity-meta-info">
                                        <span className="product-info">{commission.product?.name || 'Product Sale'}</span>
                                        <span className="commission-rate">{commission.rateApplied}% rate</span>
                                    </div>
                                    <div className="activity-footer-info">
                                        <span className="activity-date">
                                            <FaCalendarAlt />
                                            {new Date(commission.at).toLocaleDateString()}
                                        </span>
                                        <span className="sale-value">
                                            Sale: ₹{commission.saleAmount?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {commissionData.length === 0 && (
                            <div className="empty-activity">
                                <div className="empty-icon">
                                    <FaGift />
                                </div>
                                <h4>No Activity Yet</h4>
                                <p>Start making sales to see your commission activity here!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="insights-card-premium">
                    <div className="section-header-premium">
                        <div className="section-title-area">
                            <h3 className="section-title">
                                <FaStar className="section-icon" />
                                Business Insights
                            </h3>
                        </div>
                    </div>
                    <div className="insights-grid">
                        <div className="insight-item-premium">
                            <div className="insight-icon-premium success">
                                <FaWallet />
                            </div>
                            <div className="insight-content">
                                <h4>Total Withdrawal</h4>
                                <span>₹{totalWithdrawal.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="insight-item-premium">
                            <div className="insight-icon-premium info">
                                <FaUsers />
                            </div>
                            <div className="insight-content">
                                <h4>Team Members</h4>
                                <span>{actualTeamCount}</span>
                            </div>
                        </div>
                        <div className="insight-item-premium">
                            <div className="insight-icon-premium warning">
                                <FaCalendarAlt />
                            </div>
                            <div className="insight-content">
                                <h4>Joining Date</h4>
                                <span>{createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Available'}</span>
                            </div>
                        </div>
                        <div className="insight-item-premium">
                            <div className="insight-icon-premium primary">
                                <FaMapMarkerAlt />
                            </div>
                            <div className="insight-content">
                                <h4>Location</h4>
                                <span>{city && state ? `${city}, ${state}` : city || state || 'Not Set'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="achievement-section">
                        <div className="achievement-badge-premium">
                            <FaAward />
                            <span>Top Performer</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Commission Modal - Same as before */}
            {showTeamCommissionModal && (
                <div className="modal-overlay-premium" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000
                }} onClick={() => setShowTeamCommissionModal(false)}>
                    <div className="modal-content-premium team-commission-modal" style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '0',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                        overflow: 'hidden',
                        position: 'relative',
                        width: '800px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-premium" style={{
                            padding: '24px',
                            borderBottom: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div className="modal-title-section">
                                <h2 className="modal-title" style={{
                                    fontSize: '24px',
                                    fontWeight: '700',
                                    color: '#1f2937',
                                    margin: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <FaNetworkWired className="modal-title-icon" style={{ color: '#6366f1' }} />
                                    Team Commission History
                                </h2>
                                <p className="modal-subtitle" style={{
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    margin: '4px 0 0 0'
                                }}>Commission earned from team member sales</p>
                            </div>
                            <button 
                                className="modal-close-btn"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '20px',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '8px'
                                }}
                                onClick={() => setShowTeamCommissionModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="modal-stats-premium" style={{
                            padding: '20px 24px',
                            display: 'flex',
                            gap: '20px',
                            borderBottom: '1px solid #f3f4f6'
                        }}>
                            <div className="modal-stat-item" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flex: 1
                            }}>
                                <div className="modal-stat-icon" style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FaDollarSign />
                                </div>
                                <div className="modal-stat-details">
                                    <span className="modal-stat-label" style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontWeight: '500'
                                    }}>Total Commission</span>
                                    <span className="modal-stat-value" style={{
                                        display: 'block',
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#1f2937'
                                    }}>₹{teamStats.total.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="modal-stat-item" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flex: 1
                            }}>
                                <div className="modal-stat-icon" style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    backgroundColor: '#6366f1',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FaShoppingCart />
                                </div>
                                <div className="modal-stat-details">
                                    <span className="modal-stat-label" style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontWeight: '500'
                                    }}>Total Transactions</span>
                                    <span className="modal-stat-value" style={{
                                        display: 'block',
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#1f2937'
                                    }}>{teamStats.count}</span>
                                </div>
                            </div>
                            <div className="modal-stat-item" style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flex: 1
                            }}>
                                <div className="modal-stat-icon" style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FaChartLine />
                                </div>
                                <div className="modal-stat-details">
                                    <span className="modal-stat-label" style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontWeight: '500'
                                    }}>Average Commission</span>
                                    <span className="modal-stat-value" style={{
                                        display: 'block',
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#1f2937'
                                    }}>₹{teamStats.average.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="team-commission-content" style={{
                            padding: '0 24px 24px',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            {teamCommissionData.length > 0 ? (
                                <div className="team-commission-list-premium">
                                    {teamCommissionData.map((commission, index) => (
                                        <div key={commission.id || index} className="activity-item-premium" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '16px',
                                            marginBottom: '12px',
                                            backgroundColor: '#f9fafb',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb'
                                        }}>
                                            <div className="activity-icon-premium" style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '12px',
                                                backgroundColor: '#6366f1',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '16px'
                                            }}>
                                                <FaTag />
                                            </div>
                                            <div className="activity-details" style={{ flex: 1 }}>
                                                <div className="activity-main-info" style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div>
                                                        <h4 className="activity-title" style={{
                                                            fontSize: '16px',
                                                            fontWeight: '600',
                                                            color: '#1f2937',
                                                            margin: '0 0 4px 0'
                                                        }}>{commission.product?.name || 'Product Sale'}</h4>
                                                        <p style={{
                                                            fontSize: '14px',
                                                            color: '#6b7280',
                                                            margin: 0
                                                        }}>Seller: {getUserNameById(commission.fromUser)}</p>
                                                    </div>
                                                    <span className="activity-amount" style={{
                                                        fontSize: '18px',
                                                        fontWeight: '700',
                                                        color: '#10b981'
                                                    }}>₹{commission.amount.toLocaleString()}</span>
                                                </div>
                                                <div className="activity-meta-info" style={{
                                                    display: 'flex',
                                                    gap: '16px',
                                                    alignItems: 'center'
                                                }}>
                                                    <span className="product-info" style={{
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        backgroundColor: '#e5e7eb',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px'
                                                    }}>Sale: ₹{commission.saleAmount?.toLocaleString()}</span>
                                                    <span className="commission-rate" style={{
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        backgroundColor: '#e5e7eb',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px'
                                                    }}>Commission: {commission.rateApplied}%</span>
                                                    <span className="activity-date" style={{
                                                        fontSize: '13px',
                                                        color: '#6b7280',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <FaCalendarAlt />
                                                        {new Date(commission.at).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-team-commission" style={{
                                    textAlign: 'center',
                                    padding: '60px 20px'
                                }}>
                                    <div className="empty-icon-large" style={{
                                        fontSize: '48px',
                                        color: '#9ca3af',
                                        marginBottom: '16px'
                                    }}>
                                        <FaNetworkWired />
                                    </div>
                                    <h3 style={{
                                        fontSize: '20px',
                                        fontWeight: '600',
                                        color: '#1f2937',
                                        margin: '0 0 8px 0'
                                    }}>No Team Commissions Yet</h3>
                                    <p style={{
                                        color: '#6b7280',
                                        margin: '0 0 24px 0'
                                    }}>Team commission history will appear here as your team grows and generates sales.</p>
                                    <div className="empty-actions">
                                        <button className="empty-action-btn" style={{
                                            backgroundColor: '#6366f1',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }} onClick={() => setShowTeamCommissionModal(false)}>
                                            Got it
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
