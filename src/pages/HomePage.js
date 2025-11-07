import React from 'react';
import ProgressState from './ProgressState';
import DashboardHome from './DashboardHome';

const HomePage = () => {
  return (
    <div className="mobile-home-page">
      <div className="mobile-welcome-card mobile-card mobile-animate-slide-up">
        <div className="mobile-card-header">
          <h2 className="mobile-welcome-title">Welcome to Your Dashboard</h2>
          <p className="mobile-welcome-subtitle">Manage your business efficiently</p>
        </div>
        <div className="mobile-card-body">
          {/* Existing ProgressState component */}
          <ProgressState />
        </div>
      </div>

      {/* Conditionally render DashboardHome */}
      <div className="mobile-dashboard-content">
        {<DashboardHome />}
      </div>
    </div>
  );
};

export default HomePage;
