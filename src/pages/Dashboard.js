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
  const [activeMenu, setActiveMenu] = useState('Agency Dashboard');
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
    <div className="dashboard-container">
      <SelerSidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <div className={`dashboard-main ${isMobile && isSidebarOpen ? 'sidebar-open-mobile' : ''}`}>
        {/* Optional: Desktop Header - Uncomment if needed */}
        {!isMobile && (
          <header className="dashboard-header">
            <h1 className="dashboard-header-title">
              {activeMenu || 'Agency Dashboard'}
            </h1>

            <div className="dashboard-header-right">
              <span className="user-greeting">
                👋 Welcome, {userName}
              </span>

              <button
                className="dashboard-logout-btn"
                onClick={handleLogout}
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </header>
        )}

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f7fafc;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dashboard-main.sidebar-open-mobile {
          overflow: hidden;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 1rem 2rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .dashboard-header-title {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2d3748;
          background: linear-gradient(45deg, #2d3748, #4a5568);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .dashboard-header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .user-greeting {
          font-weight: 500;
          color: #2d3748;
          font-size: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 25px;
        }

        .dashboard-logout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: #fff;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        }

        .dashboard-logout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }

        .dashboard-content {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .dashboard-content::-webkit-scrollbar {
          display: none;
        }

        /* Mobile Adjustments */
        @media (max-width: 768px) {
          .dashboard-container {
            background: #f7fafc;
          }

          .dashboard-main {
            margin-top: 60px; /* Account for mobile header */
            background: #f7fafc;
          }

          .dashboard-header {
            display: none; /* Hide desktop header on mobile */
          }

          .dashboard-content {
            height: calc(100vh - 60px);
            padding: 0;
          }

          .dashboard-main.sidebar-open-mobile {
            position: fixed;
            width: 100%;
            height: 100%;
          }
        }

        /* Desktop Styles */
        @media (min-width: 769px) {
          .dashboard-main {
            margin-top: 0;
          }

          .dashboard-content {
            height: calc(100vh - 80px);
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
