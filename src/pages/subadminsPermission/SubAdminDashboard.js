import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../AuthContext";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Import real components
import Orders from "../Company/CompanyOrderManager";
import Customers from "../Customers";
import Employees from "../Company/Employees";
import Products from "../Company/Products";
import Services from "../Company/ServiceManager";
import Trainings from "../Company/Trainings";
import Users from "../Company/CompanyUserList";

// Icons
import { FiMenu, FiX, FiLogOut, FiUser, FiSettings, FiHome } from "react-icons/fi";

const SubAdminDashboard = () => {
  const { currentUser, loading } = useContext(AuthContext);
  const [active, setActive] = useState("orders");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      
      // Auto-close sidebar on desktop
      if (newWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && 
          !event.target.closest('.sidebar') && 
          !event.target.closest('.menu-toggle')) {
        setIsSidebarOpen(false);
      }
    };

    if (windowWidth < 1024) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSidebarOpen, windowWidth]);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading Dashboard...</p>
    </div>
  );
  
  if (!currentUser) return (
    <div className="error-container">
      <FiUser className="error-icon" />
      <p>Authentication Required</p>
      <button onClick={() => navigate("/subadmin-login")} className="auth-button">
        Go to Login
      </button>
    </div>
  );

  const permissions = currentUser.permissions || {};
  const allowedModules = Object.keys(permissions).filter((key) => {
    const perm = permissions[key];
    return perm?.read || perm?.write || perm?.delete;
  });

  const renderModule = (module) => {
    switch (module) {
      case "orders": return <Orders />;
      case "customers": return <Customers />;
      case "employees": return <Employees />;
      case "products": return <Products />;
      case "services": return <Services />;
      case "trainings": return <Trainings />;
      case "users": return <Users />;
      default:
        // Default to first available module or show empty state
        if (allowedModules.length > 0) {
          return renderModule(allowedModules[0]);
        }
        return (
          <div className="no-modules-container">
            <FiUser className="no-modules-icon" />
            <h2>No Modules Available</h2>
            <p>You don't have access to any modules yet. Please contact your administrator.</p>
          </div>
        );
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate("/subadmin-login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleModuleSelect = (module) => {
    setActive(module);
    if (windowWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Mobile Header */}
      {(isMobile || isTablet) && (
        <header className="mobile-header">
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
          <div className="header-title">
            <h2>SubAdmin Portal</h2>
          </div>
          <div className="header-user">
            <div className="user-avatar">
              {(currentUser.name || currentUser.email || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <FiSettings className="brand-icon" />
            <h2>SubAdmin</h2>
          </div>
          <div className="user-info">
            <div className="user-avatar large">
              {(currentUser.name || currentUser.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <p className="user-name">{currentUser.name || 'SubAdmin'}</p>
              <p className="user-email">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {allowedModules.length === 0 ? (
            <div className="no-permissions">
              <FiUser className="no-perm-icon" />
              <p>No permissions assigned</p>
              <small>Contact administrator for access</small>
            </div>
          ) : (
            <ul className="nav-list">
              {allowedModules.map((mod) => (
                <li key={mod} className="nav-item">
                  <button
                    className={`nav-button ${active === mod ? 'active' : ''}`}
                    onClick={() => handleModuleSelect(mod)}
                  >
                    <div className="nav-icon">
                      {mod.charAt(0).toUpperCase()}
                    </div>
                    <span className="nav-text">
                      {mod.charAt(0).toUpperCase() + mod.slice(1)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (isMobile || isTablet) && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {renderModule(active)}
        </div>
      </main>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .dashboard {
          display: flex;
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: #f7fafc;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-container p {
          color: #666;
          font-size: 16px;
        }

        /* Error State */
        .error-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          text-align: center;
          padding: 20px;
        }

        .error-icon {
          font-size: 64px;
          color: #e74c3c;
          margin-bottom: 20px;
        }

        .error-container p {
          font-size: 18px;
          color: #333;
          margin-bottom: 20px;
        }

        .auth-button {
          background: #2c3e50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .auth-button:hover {
          background: #34495e;
        }

        /* No Modules State */
        .no-modules-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 60vh;
          padding: 20px;
        }

        .no-modules-icon {
          font-size: 64px;
          color: #95a5a6;
          margin-bottom: 20px;
        }

        .no-modules-container h2 {
          font-size: 24px;
          color: #2c3e50;
          margin-bottom: 10px;
        }

        .no-modules-container p {
          font-size: 16px;
          color: #7f8c8d;
          max-width: 500px;
          line-height: 1.5;
        }

        /* Mobile Header */
        .mobile-header {
          display: none;
          background: #2c3e50;
          color: white;
          padding: 1rem;
          align-items: center;
          justify-content: space-between;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          height: 60px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .menu-toggle {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .menu-toggle:hover {
          background: rgba(255,255,255,0.1);
        }

        .header-title h2 {
          font-size: 1.2rem;
          font-weight: 600;
        }

        .header-user .user-avatar {
          width: 35px;
          height: 35px;
          background: #1abc9c;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
        }

        /* Sidebar */
        .sidebar {
          width: 240px;
          background: #2c3e50;
          color: white;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: fixed;
          transition: transform 0.3s ease;
          z-index: 100;
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .brand-icon {
          font-size: 24px;
          color: #1abc9c;
        }

        .brand h2 {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          background: #1abc9c;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .user-avatar.large {
          width: 40px;
          height: 40px;
          font-size: 1rem;
        }

        .user-details {
          min-width: 0;
          flex: 1;
        }

        .user-name {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.75rem;
          color: #bbb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Sidebar Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 0 20px;
          overflow-y: auto;
          margin-top: 20px;
        }

        .no-permissions {
          text-align: center;
          padding: 40px 10px;
          color: #bbb;
        }

        .no-perm-icon {
          font-size: 40px;
          color: #666;
          margin-bottom: 15px;
        }

        .no-permissions p {
          font-size: 0.9rem;
          margin-bottom: 5px;
        }

        .no-permissions small {
          font-size: 0.8rem;
          color: #999;
        }

        .nav-list {
          list-style: none;
        }

        .nav-item {
          margin-bottom: 10px;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 15px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          color: white;
          transition: all 0.2s;
          text-align: left;
        }

        .nav-button:hover {
          background: rgba(255,255,255,0.1);
        }

        .nav-button.active {
          background: #1abc9c;
          color: white;
        }

        .nav-icon {
          width: 28px;
          height: 28px;
          background: rgba(255,255,255,0.1);
          color: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.8rem;
          flex-shrink: 0;
        }

        .nav-button.active .nav-icon {
          background: rgba(255,255,255,0.2);
        }

        .nav-text {
          flex: 1;
          font-weight: 500;
        }

        /* Sidebar Footer */
        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px;
          background: #e74c3c;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          color: white;
          transition: background-color 0.2s;
        }

        .logout-button:hover {
          background: #c0392b;
        }

        .logout-icon {
          font-size: 16px;
        }

        /* Sidebar Overlay */
        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 99;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          margin-left: 240px;
          width: calc(100% - 240px);
        }

        .content-wrapper {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background-color: #fff;
          border-radius: 8px;
          margin: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        /* Responsive Design */
        @media (max-width: 1023px) {
          .mobile-header {
            display: flex;
          }

          .main-content {
            margin-left: 0;
            width: 100%;
            padding-top: 60px;
          }

          .sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            height: calc(100vh - 60px);
            transform: translateX(-100%);
            z-index: 100;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
          }

          .sidebar.sidebar-open {
            transform: translateX(0);
          }

          .content-wrapper {
            padding: 15px;
            margin: 15px;
          }
        }

        @media (max-width: 767px) {
          .sidebar {
            width: 100%;
            max-width: 280px;
          }

          .content-wrapper {
            padding: 12px;
            margin: 10px;
          }
        }

        @media (max-width: 480px) {
          .mobile-header {
            padding: 0.75rem;
            height: 55px;
          }

          .main-content {
            padding-top: 55px;
          }

          .sidebar {
            top: 55px;
            height: calc(100vh - 55px);
          }

          .header-title h2 {
            font-size: 1.1rem;
          }

          .sidebar-header {
            padding: 15px;
          }

          .brand h2 {
            font-size: 1.3rem;
          }

          .sidebar-nav {
            padding: 0 15px;
          }

          .sidebar-footer {
            padding: 15px;
          }

          .content-wrapper {
            padding: 10px;
            margin: 8px;
          }
        }

        /* Large Desktop */
        @media (min-width: 1440px) {
          .sidebar {
            width: 280px;
          }
          
          .main-content {
            margin-left: 280px;
            width: calc(100% - 280px);
          }

          .content-wrapper {
            padding: 30px;
            margin: 30px;
          }
        }
      `}</style>
    </div>
  );
};

export default SubAdminDashboard;