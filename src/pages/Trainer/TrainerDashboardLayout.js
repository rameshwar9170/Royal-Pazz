// src/layouts/TrainerDashboardLayout.js
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/config';
import TrainerSidebar from '../../components/TrainerSidebar';
import { FaBars, FaSignOutAlt } from 'react-icons/fa';

const TrainerDashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Toggle sidebar function
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check if user is a trainer
        const htamsUser = JSON.parse(localStorage.getItem('htamsUser') || '{}');
        if (htamsUser.role === 'trainer') {
          setCurrentUser(user);
          setIsLoading(false);
        } else {
          // Redirect non-trainers
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      } else {
        // No user logged in
        localStorage.clear();
        navigate('/login', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Handle responsive sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Path-to-title mapping for trainer dashboard
  const pageTitles = {
    '/trainer-dashboard': 'Trainer Dashboard',
    '/trainer-dashboard/profile': 'Trainer Profile',
    '/trainer-dashboard/participants': 'Applied Users',
    '/trainer-dashboard/applied-users': 'Applied Users',
    '/trainer-dashboard/trainings': 'Training Management',
    '/trainer-dashboard/settings': 'Settings',
  };

  // Find matching title
  const currentTitle = pageTitles[location.pathname] || 'Trainer Dashboard';

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
        
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f8fafc;
            color: #1a2332;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #1a2332;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <TrainerSidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
      />
      
      <div className="dashboard-main">
        {/* Optional Header - Uncomment if needed */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <button className="dashboard-mobile-toggle" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <h1 className="dashboard-header-title">{currentTitle}</h1>
          </div>
          
          <div className="dashboard-header-right">
            <div className="user-info">
              <span className="user-email">{currentUser?.email}</span>
              <div className="user-role-badge">Trainer</div>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      <style jsx>{`


      `}</style>
    </div>
  );
};

export default TrainerDashboardLayout;
