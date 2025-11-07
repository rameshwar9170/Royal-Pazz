// src/layouts/CompanyLayout.js
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { FaBars, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

const CompanyHome = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('htamsUser');
    localStorage.removeItem('companyStats');
    navigate('/login');
  };

  // 🌐 Path-to-title mapping
  const pageTitles = {
    // '/company-dashboard': 'Company Dashboard',
    '/company-dashboard/customers': 'Customers',
    '/company-dashboard/orders': 'Company Orders',
    '/company-dashboard/products': 'Products',
    '/company-dashboard/trainers': 'Trainers',
    '/company-dashboard/employees': 'Employees',
    '/company-dashboard/services': 'Services',
    '/company-dashboard/user-list': 'Users',
    '/company-dashboard/withdra-requests': 'Withdraw Requests',
    '/company-dashboard/follow-up-customers': 'Follow Up Customers',
  };    

  // 🧠 Find matching title
  const currentTitle =
    pageTitles[location.pathname] || '';

  return (
    <div className="dashboard-container">
      <Sidebar 
      isOpen={isSidebarOpen} 
      toggleSidebar={toggleSidebar}
       isCompanyDashboard />
      <div className="dashboard-main">
  
          {/* <h1 className="dashboard-header-title">{currentTitle}</h1> */}
       
            
            <button className="dashboard-mobile-toggle" onClick={toggleSidebar}>
              <FaBars />
            </button>
          
   
        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
export default CompanyHome;
