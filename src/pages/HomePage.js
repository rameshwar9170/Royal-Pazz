import React from 'react';
import ProgressState from './ProgressState';
import DashboardHome from './DashboardHome';

const HomePage = () => {
  return (
    <div style={{
      backgroundColor: '#f7f9fc',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#2c3e50'
    }}>
      <h2 style={{
        fontSize: '1.6rem',
        fontWeight: '600',
        marginBottom: '15px',
        color: '#1e3a8a'
      }}>Welcome to Your Dashboard</h2>

      {/* Existing ProgressState component */}
      <ProgressState />

      {/* Conditionally render DashboardHome */}
      {<DashboardHome />}
    </div>
  );
};

export default HomePage;