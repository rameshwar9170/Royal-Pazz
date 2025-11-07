import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import './ModernSidebar.css';

const ModernSidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isCompanyDashboard = location.pathname.startsWith('/company-dashboard');

  const menuItems = [
    {
      name: 'Dashboard',
      path: isCompanyDashboard ? '/company-dashboard' : '/dashboard',
      icon: '📊',
      badge: null,
    },
    {
      name: 'Customers',
      path: isCompanyDashboard ? '/company-dashboard/customers' : '/dashboard/customers',
      icon: '👥',
      badge: '24',
    },
    {
      name: 'Orders',
      path: isCompanyDashboard ? '/company-dashboard/orders' : '/dashboard/orders',
      icon: '📦',
      badge: '12',
    },
    {
      name: 'Products',
      path: isCompanyDashboard ? '/company-dashboard/products' : '/dashboard/products',
      icon: '🛍️',
      badge: null,
    },
    {
      name: 'Sales',
      path: isCompanyDashboard ? '/company-dashboard/sales-dashboard' : '/dashboard/sales-dashboard',
      icon: '💰',
      badge: null,
    },
    {
      name: 'Employees',
      path: isCompanyDashboard ? '/company-dashboard/employees' : '/dashboard/employees',
      icon: '👨‍💼',
      badge: null,
    },
    {
      name: 'Trainers',
      path: isCompanyDashboard ? '/company-dashboard/total-trainers' : '/dashboard/trainers',
      icon: '🎓',
      badge: null,
    },
    {
      name: 'Reports',
      path: isCompanyDashboard ? '/company-dashboard/user-list' : '/dashboard/user-list',
      icon: '📈',
      badge: null,
    },
    {
      name: 'Follow Up',
      path: isCompanyDashboard ? '/company-dashboard/follow-up-customers' : '/dashboard/follow-up-customers',
      icon: '📞',
      badge: '5',
    },
    {
      name: 'Settings',
      path: isCompanyDashboard ? '/company-dashboard/levels' : '/dashboard/levels',
      icon: '⚙️',
      badge: null,
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('htamsUser');
      localStorage.removeItem('companyStats');
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`modern-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">🏢</div>
          {!isCollapsed && (
            <div className="brand-text">
              <h2 className="brand-name">HTAMS</h2>
              <p className="brand-subtitle">Business Suite</p>
            </div>
          )}
        </div>
        
        {!isMobile && (
          <button 
            className="collapse-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className={`collapse-icon ${isCollapsed ? 'rotated' : ''}`}>
              ◀
            </span>
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">
            {!isCollapsed && <span>Main Menu</span>}
          </div>
          
          <ul className="nav-list">
            {menuItems.map((item, index) => (
              <li key={index} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  onClick={isMobile ? toggleSidebar : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="nav-text">{item.name}</span>
                      {item.badge && (
                        <span className="nav-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                </NavLink>
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && !isMobile && (
                  <div className="nav-tooltip">
                    {item.name}
                    {item.badge && <span className="tooltip-badge">{item.badge}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <span className="avatar-text">A</span>
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <p className="user-name">Admin User</p>
              <p className="user-role">Administrator</p>
            </div>
          )}
        </div>
        
        <div className="footer-actions">
          <button 
            className="action-btn"
            onClick={handleLogout}
            aria-label="Logout"
          >
            <span className="action-icon">🚪</span>
            {!isCollapsed && <span className="action-text">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernSidebar;
