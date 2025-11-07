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
        {/* <div className="dashboard-header">
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
        </div> */}

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      <style jsx>{`
        /* Mobile-First Smooth Sidebar Layout */
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }

        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          margin-left: 0;
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          overflow-x: hidden;
          position: relative;
        }

        .dashboard-content {
          flex: 1;
          padding: 0;
          background: #f8fafc;
          min-height: 100vh;
          overflow-x: hidden;
          overflow-y: auto;
        }

        /* Desktop Styles - Sidebar Integration */
        @media (min-width: 769px) {
          .dashboard-main {
            margin-left: ${isSidebarOpen ? '260px' : '70px'};
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .dashboard-container {
            position: relative;
          }
        }

        /* Tablet Styles */
        @media (max-width: 768px) and (min-width: 481px) {
          .dashboard-container {
            position: relative;
            overflow-x: hidden;
          }
          
          .dashboard-main {
            margin-left: 0;
            width: 100%;
            margin-top: 60px;
          }
          
          .dashboard-content {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
            height: calc(100vh - 60px);
          }
        }

        /* Mobile Styles */
        @media (max-width: 480px) {
          .dashboard-container {
            position: relative;
            overflow-x: hidden;
          }
          
          .dashboard-main {
            margin-left: 0;
            width: 100vw;
            max-width: 100%;
            margin-top: 60px;
          }
          
          .dashboard-content {
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
            height: calc(100vh - 60px);
            padding: 0;
          }
        }

        /* Smooth Transitions */
        * {
          box-sizing: border-box;
        }
        
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }

        /* Sidebar Overlay for Mobile */
        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          backdrop-filter: blur(2px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }

        .mobile-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        /* Ensure smooth sidebar animations */
        .dashboard-sidebar {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, width;
        }

        /* Performance optimizations */
        .dashboard-main,
        .dashboard-content {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default TrainerDashboardLayout;
