  import React, { useState, useEffect } from 'react';
  import { NavLink, useLocation, useNavigate } from 'react-router-dom';
  import {
    FaTachometerAlt,
    FaUsers,
    FaBoxOpen,
    FaUserShield,
    FaChalkboardTeacher,
    FaShoppingCart,
    FaChartLine,
    FaSignOutAlt,
    FaBars,
    FaTimes
  } from 'react-icons/fa';
  import { signOut } from 'firebase/auth';
  import { auth } from '../firebase/config';

  const Sidebar = ({ isOpen, toggleSidebar }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);

    // detect screen size
    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const isCompanyDashboard = location.pathname.startsWith('/company-dashboard');

    const menuItems = [
      {
        name: 'Dashboard',
        path: isCompanyDashboard ? '/company-dashboard' : '/dashboard',
        icon: <FaTachometerAlt />,
      },
      {
        name: 'Customers',
        path: isCompanyDashboard ? '/company-dashboard/customers' : '/dashboard/customers',
        icon: <FaUsers />,
      },
      {
        name: 'Orders',
        path: isCompanyDashboard ? '/company-dashboard/orders' : '/dashboard/orders',
        icon: <FaShoppingCart />,
      },
      {
        name: 'Sales Dashboard',
        path: isCompanyDashboard ? '/company-dashboard/sales-dashboard' : '/dashboard/sales-dashboard',
        icon: <FaChartLine />,
      },
      {
        name: 'Employees',
        path: isCompanyDashboard ? '/company-dashboard/employees' : '/dashboard/employees',
        icon: <FaUserShield />,
      },
      {
        name: 'Trainers',
        path: isCompanyDashboard ? '/company-dashboard/total-trainers' : '/dashboard/trainers',
        icon: <FaChalkboardTeacher />,
      },
      {
        name: 'Products',
        path: isCompanyDashboard ? '/company-dashboard/products' : '/dashboard/products',
        icon: <FaBoxOpen />,
      },
      {
        name: 'Users',
        path: isCompanyDashboard ? '/company-dashboard/user-list' : '/dashboard/user-list',
        icon: <FaUserShield />,
      },
      {
        name: 'Add Admin',
        path: isCompanyDashboard ? '/company-dashboard/add-admin' : '/dashboard/add-admin',
        icon: <FaUserShield />,
      },
      {
        name: 'Levels',
        path: isCompanyDashboard ? '/company-dashboard/levels' : '/dashboard/levels',
        icon: <FaUserShield />,
      },
      {
        name: 'Withdraw Requests',
        path: isCompanyDashboard ? '/company-dashboard/withdraw-requests' : '/dashboard/withdraw-requests',
        icon: <FaUserShield />,
      },
      {
        name: 'Document Verification',
        path: isCompanyDashboard ? '/company-dashboard/document-verification' : '/dashboard/document-verification',
        icon: <FaUserShield />,
      },
    ];

    const handleLogout = async () => {
      try {
        await signOut(auth);
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);
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
            <h1 className="mobile-title">Panchagiri</h1>
          </div>
        )}

        {/* Overlay for mobile */}
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

            /* Mobile overlay */
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
          `}</style>
        </div>
      </>
    );
  };

  export default Sidebar;
