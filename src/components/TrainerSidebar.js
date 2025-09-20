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
      
      <div className={`dashboard-sidebar ${isOpen ? 'expanded' : 'collapsed'} ${isMobile ? 'mobile-sidebar' : ''}`}>
        <ul className="dashboard-menu">
          {menuItems.map((item) => (
            <li key={item.name} className="dashboard-menu-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `dashboard-link ${isActive ? 'active' : ''}`
                }
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
            padding: 0.75rem 1rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: all 0.3s ease;
          }
          
          .logout-btn:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          
          .mobile-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            z-index: 10;
          }
          
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            background: #111;
            color: #fff;
          }
          
          .mobile-toggle-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
          }
          
          .mobile-title {
            font-size: 1.2rem;
            margin: 0;
          }
        `}</style>
      </div>
    </>
  );
};

export default TrainerSidebar;
