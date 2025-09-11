import React, { useState, useEffect } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
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
} from 'react-icons/fa';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

const SelerSidebar = ({ isOpen, toggleSidebar, activeMenu, setActiveMenu }) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <FaTachometerAlt /> },
    { name: "Customers", path: "/dashboard/customers", icon: <FaUsers /> },
    { name: "Team", path: "/dashboard/team", icon: <FaUserShield /> },
    { name: "Products Buy", path: "/dashboard/Allproducts", icon: <FaBoxOpen /> },
    { name: "Orders", path: "/dashboard/orders", icon: <FaBoxOpen /> },
    {
      name: "Trainers",
      path: "/dashboard/AgencyTraining",
      icon: <FaChalkboardTeacher />,
    },
    {
      name: "User Profile",
      path: "/dashboard/user-profile",
      icon: <FaUserShield />,
    },
    { name: "Web Builder", path: "/dashboard/web-builder", icon: <FaShoppingCart /> },
    { name: "Withdraw", path: "/dashboard/withdrawal", icon: <FaShoppingCart /> },
    { name: "DocumentVerification", path: "/dashboard/DocumentVerification", icon: <FaWrench /> },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMenuClick = (itemName) => {
    setActiveMenu(itemName);
    // Close sidebar on mobile when menu item is clicked
    if (isMobile && isOpen) {
      toggleSidebar();
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
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div className="mobile-overlay" onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <div className={`dashboard-sidebar ${isOpen ? 'expanded' : 'collapsed'} ${isMobile ? 'mobile-sidebar' : ''}`}>
        <button className="dashboard-toggle-btn" onClick={toggleSidebar}>
          <h2 className="dashboard-title">{isOpen && activeMenu}</h2>
          {/* Close button for mobile inside sidebar */}
          {isMobile && isOpen && (
            <FaTimes className="mobile-close-icon" />
          )}
        </button>
        
        <ul className="dashboard-menu">
          {menuItems.map((item) => (
            <li key={item.name} className="dashboard-menu-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `dashboard-link ${isActive ? 'active' : ''}`
                }
                onClick={() => handleMenuClick(item.name)}
              >
                <span className="dashboard-icon">{item.icon}</span>
                {isOpen && <span className="dashboard-label">{item.name}</span>}
              </NavLink>
            </li>
          ))}
          
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
        `}</style>
      </div>






    </>
  );
};

export default SelerSidebar;
