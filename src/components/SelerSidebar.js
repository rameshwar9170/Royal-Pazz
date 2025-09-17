import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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

const SelerSidebar = ({ isOpen, toggleSidebar, activeMenu, setActiveMenu }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('checking');
  const navigate = useNavigate();

  // Get current user
  const user = JSON.parse(localStorage.getItem('htamsUser'));

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check verification status
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
    }, (error) => {
      console.error('Error checking verification status:', error);
      setIsVerified(false);
      setVerificationStatus('error');
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Define all menu items
  const allMenuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt />, requiresVerification: true },
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

  // Filter menu items based on verification status
  const getVisibleMenuItems = () => {
    if (isVerified) {
      // If verified, show all items except DocumentVerification
      return allMenuItems.filter(item => item.name !== "DocumentVerification");
    } else {
      // If not verified, show only DocumentVerification
      return allMenuItems.filter(item => item.name === "DocumentVerification");
    }
  };

  const visibleMenuItems = getVisibleMenuItems();

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
      setActiveMenu('DocumentVerification');
    } else {
      setActiveMenu(itemName);
    }
    
    // Close sidebar on mobile when menu item is clicked
    if (isMobile && isOpen) {
      toggleSidebar();
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
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header">
          <button className="mobile-toggle-btn" onClick={toggleSidebar}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
          <h1 className="mobile-title">ONDO</h1>
          {!isVerified && (
            <div className="mobile-lock-indicator">
              <FaLock />
            </div>
          )}
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div className="mobile-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isOpen ? 'expanded' : 'collapsed'} ${isMobile ? 'mobile-sidebar' : ''} ${!isVerified ? 'locked' : ''}`}>
        <button className="dashboard-toggle-btn" onClick={toggleSidebar}>
          <h2 className="dashboard-title">{isOpen && activeMenu}</h2>
          {/* Close button for mobile inside sidebar */}
          {isMobile && isOpen && (
            <FaTimes className="mobile-close-icon" />
          )}
        </button>
        
        {/* Verification Status Banner */}
        {!isVerified && isOpen && (
          <div className={`verification-status-banner ${verificationStatus}`}>
            <FaLock className="lock-icon" />
            <p className="status-message">{getVerificationStatusMessage()}</p>
          </div>
        )}
        
        <ul className="dashboard-menu">
          {visibleMenuItems.map((item) => (
            <li key={item.name} className={`dashboard-menu-item ${!isVerified && item.requiresVerification ? 'locked-item' : ''}`}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `dashboard-link ${isActive ? 'active' : ''} ${!isVerified && item.requiresVerification ? 'disabled' : ''}`
                }
                onClick={() => handleMenuClick(item.name, item.path, item.requiresVerification)}
              >
                <span className="dashboard-icon">{item.icon}</span>
                {isOpen && (
                  <span className="dashboard-label">
                    {item.name}
                    {!isVerified && item.requiresVerification && <FaLock className="item-lock" />}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
          
          {/* Show locked items as disabled when not verified */}
          {!isVerified && isOpen && (
            <div className="locked-items-preview">
              <div className="locked-section-title">
                <FaLock /> Locked Features
              </div>
              {allMenuItems
                .filter(item => item.requiresVerification && item.name !== "DocumentVerification")
                .slice(0, 3) // Show first 3 locked items
                .map((item) => (
                <li key={item.name} className="dashboard-menu-item locked-preview">
                  <div className="dashboard-link disabled">
                    <span className="dashboard-icon">{item.icon}</span>
                    <span className="dashboard-label">
                      {item.name} <FaLock className="item-lock" />
                    </span>
                  </div>
                </li>
              ))}
              {allMenuItems.filter(item => item.requiresVerification).length > 3 && (
                <div className="more-locked-items">
                  +{allMenuItems.filter(item => item.requiresVerification).length - 3} more features
                </div>
              )}
            </div>
          )}
          
          {/* Logout Button */}
          <li className="dashboard-menu-item logout-item">
            <button onClick={handleLogout} className="dashboard-links logout-btn">
              <span className="dashboard-icon"><FaSignOutAlt /></span>
              {isOpen && <span className="dashboard-label">Logout</span>}
            </button>
          </li>
        </ul>

        <style jsx>{`
          .dashboard-menu {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          
          .logout-item {
            background-color: #ff0303ff;
            border-radius: 16px;
            margin-top: auto;
          }
          
          .logout-btn {
            width: 100%;
            text-align: left;
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
          }

          /* Verification Status Banner */
          .verification-status-banner {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            padding: 12px;
            margin: 10px;
            border-radius: 8px;
            text-align: center;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .verification-status-banner.not_started,
          .verification-status-banner.rejected {
            background: linear-gradient(135deg, #ef4444, #dc2626);
          }

          .verification-status-banner.submitted,
          .verification-status-banner.uploaded {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
          }

          .verification-status-banner.approved {
            background: linear-gradient(135deg, #10b981, #059669);
          }

          .lock-icon {
            margin-right: 8px;
            font-size: 14px;
          }

          .status-message {
            margin: 4px 0 0 0;
            line-height: 1.3;
            font-weight: 500;
          }

          /* Mobile lock indicator */
          .mobile-lock-indicator {
            color: #ef4444;
            font-size: 18px;
          }

          /* Locked sidebar styling */
          .dashboard-sidebar.locked {
            border-left: 3px solid #ef4444;
          }

          /* Locked items */
          .dashboard-menu-item.locked-item .dashboard-link {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .dashboard-link.disabled {
            pointer-events: none;
            opacity: 0.5;
          }

          .item-lock {
            margin-left: 8px;
            font-size: 12px;
            color: #ef4444;
          }

          /* Locked items preview */
          .locked-items-preview {
            margin: 16px 0;
            padding: 0 12px;
          }

          .locked-section-title {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .dashboard-menu-item.locked-preview {
            margin: 4px 0;
          }

          .locked-preview .dashboard-link {
            padding: 8px 12px;
            font-size: 14px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 6px;
          }

          .more-locked-items {
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
            margin-top: 8px;
            font-style: italic;
          }

          /* Responsive adjustments */
          @media (max-width: 768px) {
            .verification-status-banner {
              margin: 5px;
              padding: 8px;
              font-size: 11px;
            }

            .locked-items-preview {
              padding: 0 8px;
              margin: 12px 0;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default SelerSidebar;
