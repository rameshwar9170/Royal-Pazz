import React from 'react';
import { Navigate, NavLink, useNavigate } from 'react-router-dom';
// import './Sidebar.css';

const Sidebar = () => {
 const navigate = useNavigate();
    
  const handleLogout = () => {
    localStorage.removeItem('caUser');
    Navigate('/ca-login');
  };
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>CA Portal</h3>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/ca-dashboard/overview" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          Dashboard
        </NavLink>
        <NavLink to="/ca-dashboard/sales-report" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          Sales Report
        </NavLink>
        <NavLink to="/ca-dashboard/user-financials" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          User Financials
        </NavLink>
        <NavLink to="/ca-dashboard/commission-report" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          Commission Report
        </NavLink>
        <NavLink to="/ca-dashboard/all-orders" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          All Orders
        </NavLink>
      </nav>
         <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
      <style jsx="true">{`
      .sidebar {
  width: 250px;
  background-color: #001f3f; /* Navy Blue */
  color: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  box-shadow: 2px 0 5px rgba(0,0,0,0.1);
}

.sidebar-header {
  padding: 24px;
  text-align: center;
  border-bottom: 1px solid #003366; /* Darker navy shade */
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  margin-top: 20px;
}

.sidebar-link {
  color: white;
  text-decoration: none;
  padding: 15px 25px;
  font-size: 1.1rem;
  display: block;
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
}

.sidebar-link:hover {
  background-color: #003366; /* Darker navy shade on hover */
  border-left-color: #3b82f6;
}

/* Style for the active link */
.sidebar-link.active {
  background-color: #005A9C; /* A brighter blue for active link */
  font-weight: bold;
  border-left-color: #ffffff;
}

 .logout-btn {
          background-color: #ef4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .logout-btn:hover {
          background-color: #dc2626;
        }
  
      `}</style>
    </div>
  );
};

export default Sidebar;
