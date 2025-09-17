// components/OverviewTab.jsx - Dashboard overview with statistics
import React from 'react';
import './OverviewTab.css';

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

export default OverviewTab;
