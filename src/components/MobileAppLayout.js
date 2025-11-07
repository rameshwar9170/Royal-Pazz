import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    FaTachometerAlt,
    FaUsers,
    FaBoxOpen,
    FaUserShield,
    FaChalkboardTeacher,
    FaShoppingCart,
    FaWrench,
    FaSignOutAlt,
    FaBars,
    FaTimes,
    FaLock,
    FaMoneyBillWave,
    FaVideo,
  } from 'react-icons/fa';
  import { auth, database } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { ref as dbRef, onValue } from 'firebase/database';

const MobileAppLayout = ({ children,activeMenu,setActiveMenu,isOpen }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('checking');
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('htamsUser'));

  // Define which routes should use mobile app design
  const mobileAppRoutes = [
    '/dashboard',
    '/dashboard/customers', 
    '/dashboard/orders',
    '/dashboard/Allproducts',
    '/dashboard/team',
    '/dashboard/user-profile',
    '/dashboard/Quotation',
    '/dashboard/video-training',
    '/dashboard/follow-up-customers',
    '/dashboard/withdrawal',
    '/dashboard/web-builder',
    '/dashboard/AgencyTraining'
  ];

  // Check if current route should use mobile app design
  const shouldUseMobileApp = mobileAppRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync verification status (match SelerSidebar)
  useEffect(() => {
    if (!user?.uid) {
      setIsVerified(false);
      setVerificationStatus('not_logged_in');
      return;
    }

    const verificationRef = dbRef(database, `HTAMS/users/${user.uid}/documentVerification`);
    const unsubscribe = onValue(verificationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const status = data.overallStatus || 'not_started';
        if (status === 'approved') {
          setIsVerified(true);
          setVerificationStatus('approved');
        } else {
          setIsVerified(false);
          setVerificationStatus(status);
        }
      } else {
        setIsVerified(false);
        setVerificationStatus('not_started');
      }
    }, () => {
      setIsVerified(false);
      setVerificationStatus('error');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  
  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const allMenuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt />, requiresVerification: true },
    { name: "Quotation", path: "/dashboard/Quotation", icon: <FaTachometerAlt />, requiresVerification: true },
    { name: "Customers", path: "/dashboard/customers", icon: <FaUsers />, requiresVerification: true },
    { name: "Team", path: "/dashboard/team", icon: <FaUserShield />, requiresVerification: true },
    { name: "Products Buy", path: "/dashboard/Allproducts", icon: <FaBoxOpen />, requiresVerification: true },
    { name: "Orders", path: "/dashboard/orders", icon: <FaBoxOpen />, requiresVerification: true },
    { name: "Trainers", path: "/dashboard/AgencyTraining", icon: <FaChalkboardTeacher />, requiresVerification: true },
    { name: "User Profile", path: "/dashboard/user-profile", icon: <FaUserShield />, requiresVerification: true },
    { name: "Web Builder", path: "/dashboard/web-builder", icon: <FaShoppingCart />, requiresVerification: true },
    { name: "Withdraw", path: "/dashboard/withdrawal", icon: <FaMoneyBillWave />, requiresVerification: true },
    { name: "DocumentVerification", path: "/dashboard/DocumentVerification", icon: <FaWrench />, requiresVerification: false },
    { name: "Video Training", path: "/dashboard/video-training", icon: <FaVideo />, requiresVerification: true },
  ];

  const getVisibleMenuItems = () => {
    if (isVerified) {
      return allMenuItems.filter(item => item.name !== 'DocumentVerification');
    }
    return allMenuItems.filter(item => item.name === 'DocumentVerification');
  };
  const visibleMenuItems = getVisibleMenuItems();

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const getCurrentPageName = () => {
    const currentItem = allMenuItems.find(item => 
      location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    );
    return currentItem ? currentItem.name : 'Dashboard';
  };

  // If not using mobile app design, just return children with original design
  if (!shouldUseMobileApp) {
    return <>{children}</>;
  }
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('htamsUser');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  const handleMenuClick = (itemName, itemPath, requiresVerification) => {
    // If item requires verification but user is not verified, redirect to verification
    if (requiresVerification && !isVerified) {
      navigate('/dashboard/DocumentVerification');
      if (typeof setActiveMenu === 'function') {
        setActiveMenu('DocumentVerification');
      }
    } else {
      if (typeof setActiveMenu === 'function') {
        setActiveMenu(itemName);
      }
      if (itemPath) {
        navigate(itemPath);
      }
    }
    
    // Close sidebar on mobile when menu item is clicked
    if (isMobile) {
      setSidebarOpen(false);
    }
  };
  const getVerificationStatusMessage = () => {
    switch (verificationStatus) {
      case 'checking':
        return 'Checking verification status...';
      case 'not_started':
        return 'Complete document verification to access all features';
      case 'uploaded':
        return 'Documents uploaded. Waiting for admin review...';
      case 'submitted':
        return 'Documents submitted for verification. Please wait...';
      case 'approved':
        return 'Verification complete! All features unlocked.';
      case 'rejected':
        return 'Documents rejected. Please resubmit for verification.';
      default:
        return 'Please complete document verification';
    }
  };

  return (
    <div className="mobile-app-container">
      {/* Mobile Header */}
      {isMobile && (
        <header className="mobile-app-header">
          <button 
            className="mobile-menu-btn"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
          <h1 className="mobile-app-title">{getCurrentPageName()}</h1>
          <div className="mobile-header-actions">
            <button className="mobile-notification-btn" aria-label="Notifications">
              🔔
            </button>
          </div>
        </header>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <aside className={`mobile-sidebar ${sidebarOpen ? 'mobile-sidebar-open' : ''}`}>
          <div className="mobile-sidebar-header">
            <div className="mobile-sidebar-logo">
              <span className="mobile-logo-icon">🏢</span>
              <span className="mobile-logo-text">ONDO</span>
            </div>
            <button 
              className="mobile-sidebar-close"
              onClick={() => setSidebarOpen(false)}
            >
              ×
            </button>
          </div>
          
          <div className="mobile-sidebar-content">
            <nav className="mobile-sidebar-nav">
              {visibleMenuItems.map((item) => (
                <button
                  key={item.name}
                  className={`mobile-sidebar-item ${
                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                      ? 'mobile-sidebar-item-active'
                      : ''
                  }`}
                  onClick={() => handleMenuClick(item.name, item.path, item.requiresVerification)}
                >
                  <span className="mobile-sidebar-icon">{item.icon}</span>
                  <span className="mobile-sidebar-label">{item.name}</span>
                </button>
              ))}
            </nav>
            <div className="mobile-logout-container">
              <button className="mobile-logout-btn" onClick={handleLogout}>
                <span className="mobile-sidebar-icon"><FaSignOutAlt /></span>
                <span className="mobile-sidebar-label">Logout</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="mobile-app-content">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="mobile-app-bottom-nav">
          {[
            'Dashboard',
            'Products Buy',
            'Team',
            'Trainers',
            'Withdraw',
          ].map((name) => {
            const item = allMenuItems.find(i => i.name === name);
            if (!item) return null;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            const isLocked = item.requiresVerification && !isVerified;
            return (
              <button
                key={name}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.name, item.path, item.requiresVerification)}
                disabled={isLocked}
              >
                <span className="mobile-nav-icon">{item.icon}</span>
                <span className="mobile-nav-label">{item.name}</span>
              </button>
            );
          })}
        </nav>
      )}

      <style jsx>{`
        .mobile-app-header {
          background: #002B5C;
        }

        .mobile-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: var(--mobile-radius-lg);
          transition: background var(--mobile-transition-fast);
          color: #ffffff;
        }

        .mobile-menu-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .mobile-app-title {
          font-size: var(--mobile-text-xl);
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          flex: 1;
          text-align: center;
        }

        .mobile-header-actions {
          display: flex;
          align-items: center;
          gap: var(--mobile-space-sm);
        }

        .mobile-notification-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: var(--mobile-radius-lg);
          transition: background var(--mobile-transition-fast);
          font-size: var(--mobile-text-lg);
          color: #ffffff;
        }

        .mobile-notification-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .mobile-sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1090;
          backdrop-filter: blur(4px);
        }

        .mobile-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 280px;
          height: 100vh;
          background: #1e293b;
          border-right: 1px solid #334155;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          z-index: 1100;
          overflow-y: hidden;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
        }

        .mobile-sidebar.mobile-sidebar-open {
          transform: translateX(0);
        }

        .mobile-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #334155;
          background: #0f172a;
        }

        .mobile-sidebar-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mobile-logo-icon {
          font-size: 20px;
        }

        .mobile-logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }

        .mobile-sidebar-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: #94a3b8;
          font-weight: 300;
        }

        .mobile-sidebar-close:hover {
          color: #ffffff;
        }

        .mobile-sidebar-content {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 73px);
          padding: 0;
        }

        .mobile-sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 12px 0;
        }

        .mobile-sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: calc(100% - 24px);
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #94a3b8;
          text-align: left;
          border-radius: 12px;
          margin: 4px 12px;
        }

        .mobile-sidebar-item:hover {
          background: #334155;
          color: #e2e8f0;
        }

        .mobile-sidebar-item-active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .mobile-sidebar-icon {
          font-size: 16px;
          width: 20px;
          display: flex;
          justify-content: center;
        }

        .mobile-sidebar-label {
          font-size: 14px;
          font-weight: 400;
          flex: 1;
        }

        .mobile-logout-container {
          padding: 16px 20px;
          border-top: 1px solid #334155;
          background: #0f172a;
        }

        .mobile-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #ef4444;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .mobile-logout-btn:hover {
          background: #dc2626;
        }

        /* Ensure bottom nav is under sidebar */
        .mobile-app-bottom-nav {
          z-index: 1000;
        }

        /* Desktop Styles */
        @media (min-width: 769px) {
          .mobile-app-container {
            max-width: 768px;
            margin: 0 auto;
            box-shadow: var(--mobile-shadow-xl);
          }
          
          .mobile-app-header,
          .mobile-app-bottom-nav {
            position: relative;
            background: #002B5C;
            box-shadow: none;
            border: none;
          }
          
          .mobile-app-content {
            padding-top: 0;
            padding-bottom: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileAppLayout;
