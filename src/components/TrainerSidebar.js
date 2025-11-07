import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config'; // Import your Firebase auth
import {
  FaTachometerAlt, FaChalkboardTeacher, FaUsers, FaUserCircle,
  FaSignOutAlt, FaBars, FaTimes
} from 'react-icons/fa';

const TrainerSidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/trainer-dashboard', icon: <FaTachometerAlt /> },
    { name: 'Applied Users', path: '/trainer-dashboard/participants', icon: <FaUsers /> },
    { name: 'Profile', path: '/trainer-dashboard/profile', icon: <FaUserCircle /> }
  ];

  const handleLogout = async () => {
    try {
      // Clear localStorage first
      localStorage.removeItem('htamsUser');
      localStorage.removeItem('trainerStats');
      
      // Sign out from Firebase
      await signOut(auth);
      
      console.log("Logout successful");
      
      // Navigate to login page
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Even if Firebase signOut fails, still clear localStorage and navigate
      localStorage.removeItem('htamsUser');
      localStorage.removeItem('trainerStats');
      navigate('/login', { replace: true });
    }
  };

  return (
    <>
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header">
          <button className="mobile-toggle-btn" onClick={toggleSidebar}>
            {isOpen ? <FaTimes size={22}/> : <FaBars size={22}/>}
          </button>
          <h1 className="mobile-title">Trainer Panel</h1>
        </div>
      )}
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div className="mobile-overlay" onClick={toggleSidebar}></div>
      )}
      
      <div 
        className={`dashboard-sidebar ${isOpen ? 'expanded' : 'collapsed'} ${isMobile ? 'mobile-sidebar' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop Toggle Button */}
        {/* {!isMobile && (
          <button className="sidebar-toggle-desktop" onClick={toggleSidebar}>
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}
         */}
        {/* Alternative Desktop Toggle Inside Sidebar */}
        {!isMobile && (
          <div className="sidebar-header">
            <div className="sidebar-title">
              {isOpen && <span>Trainer Panel</span>}
            </div>
            <button className="sidebar-toggle-inside" onClick={toggleSidebar}>
              {isOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        )}

        <ul className="dashboard-menu">
          {menuItems.map((item) => (
            <li key={item.name} className="dashboard-menu-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `dashboard-link ${isActive ? 'active' : ''}`
                }
                onClick={isMobile ? toggleSidebar : undefined}
                title={item.name}
              >
                <span className="dashboard-icon">{item.icon}</span>
                {isOpen && <span className="dashboard-label">{item.name}</span>}
              </NavLink>
            </li>
          ))}
          
          {/* Logout */}
          <li className="dashboard-menu-item logout-item">
            <button 
              onClick={handleLogout} 
              className="dashboard-links logout-btn"
              type="button"
            >
              <span className="dashboard-icon"><FaSignOutAlt /></span>
              {isOpen && <span className="dashboard-label">Logout</span>}
            </button>
          </li>
        </ul>
        
        <style jsx>{`
          /* Main Sidebar Container */
          .dashboard-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            background: linear-gradient(180deg, #1a2332 0%, #2d3748 100%);
            color: white;
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          /* Expanded State */
          .dashboard-sidebar.expanded {
            width: 260px;
            transform: translateX(0);
          }

          /* Collapsed State */
          .dashboard-sidebar.collapsed {
            width: 70px;
            transform: translateX(0);
          }

          /* Mobile Sidebar */
          .dashboard-sidebar.mobile-sidebar {
            width: 260px;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .dashboard-sidebar.mobile-sidebar.expanded {
            transform: translateX(0);
          }

          /* Desktop Toggle Button */
          .sidebar-toggle-desktop {
            position: absolute;
            top: 20px;
            right: -15px;
            width: 35px;
            height: 35px;
            background: #1a2332;
            border: 2px solid #4a5568;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.3s ease;
            z-index: 1001;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }

          .sidebar-toggle-desktop:hover {
            background: #2d3748;
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }

          .sidebar-toggle-desktop:active {
            transform: scale(0.95);
          }

          /* Sidebar Header */
          .sidebar-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 10px;
          }

          .sidebar-title {
            color: white;
            font-weight: 600;
            font-size: 16px;
            opacity: 1;
            transition: opacity 0.3s ease;
          }

          .dashboard-sidebar.collapsed .sidebar-title {
            opacity: 0;
            width: 0;
            overflow: hidden;
          }

          .sidebar-toggle-inside {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            cursor: pointer;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.3s ease;
            min-width: 32px;
            height: 32px;
          }

          .sidebar-toggle-inside:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
          }

          .sidebar-toggle-inside:active {
            transform: scale(0.95);
          }

          .dashboard-sidebar.collapsed .sidebar-header {
            justify-content: center;
            padding: 20px 15px;
          }

          /* Menu Container */
          .dashboard-menu {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 10px 0 20px 0;
            list-style: none;
            margin: 0;
          }

          /* Menu Items */
          .dashboard-menu-item {
            margin: 0;
            padding: 0;
          }

          .dashboard-link {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 3px solid transparent;
            position: relative;
            overflow: hidden;
          }

          .dashboard-link:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border-left-color: #4299e1;
          }

          .dashboard-link.active {
            background: rgba(66, 153, 225, 0.2);
            color: white;
            border-left-color: #4299e1;
          }

          .dashboard-link.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: #4299e1;
          }

          /* Icons */
          .dashboard-icon {
            font-size: 18px;
            min-width: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
          }

          /* Labels */
          .dashboard-label {
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            opacity: 1;
            transition: opacity 0.3s ease;
          }

          /* Collapsed State - Hide Labels */
          .dashboard-sidebar.collapsed .dashboard-label {
            opacity: 0;
            width: 0;
            overflow: hidden;
          }

          .dashboard-sidebar.collapsed .dashboard-icon {
            margin-right: 0;
          }

          .dashboard-sidebar.collapsed .dashboard-link {
            padding: 15px;
            justify-content: center;
          }

          /* Logout Item */
          .logout-item {
            background-color: #e53e3e;
            border-radius: 8px;
            margin: auto 15px 20px 15px;
            overflow: hidden;
          }

          .logout-btn {
            width: 100%;
            text-align: left;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
          }

          .logout-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .dashboard-sidebar.collapsed .logout-btn {
            padding: 15px;
            justify-content: center;
            gap: 0;
          }

          /* Mobile Overlay */
          .mobile-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            backdrop-filter: blur(2px);
          }

          /* Mobile Header */
          .mobile-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            background: #1a2332;
            color: white;
            z-index: 1001;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }

          .mobile-toggle-btn {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background 0.3s ease;
          }

          .mobile-toggle-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .mobile-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }

          /* Responsive Adjustments */
          @media (max-width: 768px) {
            .sidebar-toggle-desktop {
              display: none;
            }

            .sidebar-header {
              display: none;
            }

            .dashboard-sidebar {
              position: fixed;
              z-index: 1000;
            }

            .dashboard-menu {
              padding: 80px 0 20px 0;
            }
          }

          @media (min-width: 769px) {
            .mobile-header {
              display: none;
            }

            .mobile-overlay {
              display: none;
            }

            .sidebar-toggle-desktop {
              display: flex;
            }

            .sidebar-header {
              display: flex;
            }
          }

          /* Smooth Animations */
          .dashboard-sidebar * {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Tooltip for Collapsed State */
          .dashboard-sidebar.collapsed .dashboard-link {
            position: relative;
          }

          .dashboard-sidebar.collapsed .dashboard-link:hover::after {
            content: attr(title);
            position: absolute;
            left: 70px;
            top: 50%;
            transform: translateY(-50%);
            background: #2d3748;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            animation: tooltipFadeIn 0.3s ease forwards;
          }

          @keyframes tooltipFadeIn {
            from {
              opacity: 0;
              transform: translateY(-50%) translateX(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(-50%) translateX(0);
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default TrainerSidebar;
