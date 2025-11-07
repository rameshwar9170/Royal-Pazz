import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { FaSignOutAlt, FaBars } from 'react-icons/fa';
import SelerSidebar from '../components/SelerSidebar';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('');
  const [activeMenu, setActiveMenu] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = ref(db, `HTAMS/users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserName(userData.name || 'User');
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // On mobile, start with sidebar closed
      // On desktop, keep it open
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="mobile-dashboard-container">
      {/* Desktop Sidebar - Only show on desktop */}
      {!isMobile && (
        <SelerSidebar
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />
      )}

      <div className={`mobile-dashboard-main ${isMobile && isSidebarOpen ? 'sidebar-open-mobile' : ''}`}>
        {/* Desktop Header - Only show on desktop */}
        {!isMobile && (
          <header className="mobile-dashboard-header">
            <h1 className="mobile-dashboard-header-title">
              {activeMenu || 'Dashboard'}
            </h1>

            <div className="mobile-dashboard-header-right">
              <span className="mobile-user-greeting">
                👋 Welcome, {userName}
              </span>

              <button
                className="mobile-dashboard-logout-btn"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </header>
        )}

        <div className="mobile-dashboard-content">
          <Outlet />
        </div>
      </div>

      <style jsx>{`
        .mobile-dashboard-container {
          display: flex;
          min-height: 100vh;
          background: var(--mobile-bg-secondary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .mobile-dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--mobile-bg-secondary);
          transition: all var(--mobile-transition-normal);
        }

        .mobile-dashboard-main.sidebar-open-mobile {
          overflow: hidden;
        }

        .mobile-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--mobile-bg-primary);
          padding: var(--mobile-space-lg) var(--mobile-space-xl);
          border-bottom: 1px solid var(--mobile-border-light);
          box-shadow: var(--mobile-shadow-sm);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .mobile-dashboard-header-title {
          font-size: var(--mobile-text-2xl);
          font-weight: 700;
          color: var(--mobile-text-primary);
          margin: 0;
        }

        .mobile-dashboard-header-right {
          display: flex;
          align-items: center;
          gap: var(--mobile-space-lg);
        }

        .mobile-user-greeting {
          font-weight: 500;
          color: var(--mobile-text-primary);
          font-size: var(--mobile-text-sm);
          padding: var(--mobile-space-sm) var(--mobile-space-md);
          background: var(--mobile-bg-tertiary);
          border-radius: var(--mobile-radius-full);
        }

        .mobile-dashboard-logout-btn {
          display: flex;
          align-items: center;
          gap: var(--mobile-space-sm);
          padding: var(--mobile-space-sm) var(--mobile-space-md);
          background: linear-gradient(135deg, var(--mobile-error) 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: var(--mobile-radius-full);
          cursor: pointer;
          font-size: var(--mobile-text-sm);
          font-weight: 600;
          transition: all var(--mobile-transition-fast);
          box-shadow: var(--mobile-shadow-md);
        }

        .mobile-dashboard-logout-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--mobile-shadow-lg);
        }

        .mobile-dashboard-content {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          background: var(--mobile-bg-secondary);
        }

        .mobile-dashboard-content::-webkit-scrollbar {
          display: none;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .mobile-dashboard-container {
            background: var(--mobile-bg-secondary);
          }

          .mobile-dashboard-main {
            margin-top: 0; /* Mobile header is handled by MobileAppLayout */
            background: var(--mobile-bg-secondary);
          }

          .mobile-dashboard-header {
            display: none; /* Hide desktop header on mobile */
          }

          .mobile-dashboard-content {
            height: 100%;
            padding: 0;
          }

          .mobile-dashboard-main.sidebar-open-mobile {
            position: fixed;
            width: 100%;
            height: 100%;
          }
        }

        /* Desktop Styles */
        @media (min-width: 769px) {
          .mobile-dashboard-main {
            margin-top: 0;
          }

          .mobile-dashboard-content {
            height: calc(100vh - 80px);
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
