import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const CADashboardLayout = () => {
 
  const location = useLocation();

  // Extract the current page name from the URL
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    switch(path) {
      case 'overview': return 'Dashboard';
      case 'sales-report': return 'Sales Report';
      case 'commission-report': return 'Commission Report';
      case 'all-orders': return 'All Orders';
      default: return 'CA Dashboard';
    }
  };


  return (
    <div className="ca-dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <header className="main-header">
          <h1>{getPageTitle()}</h1>
       
        </header>
        <main className="content-area">
          <Outlet /> {/* Child routes will be rendered here */}
        </main>
      </div>
      <style jsx>{`
        .ca-dashboard-layout {
          display: flex;
          background-color: #f8fafc; /* Light gray background */
        }
        .main-content {
          margin-left: 250px; /* Sidebar width */
          width: calc(100% - 250px);
          min-height: 100vh;
        }
        .main-header {
          background-color: white;
          padding: 16px 32px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .main-header h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }
       tent-area {
          padding: 32px;
        }
      `}</style>
    </div>
  );
};

export default CADashboardLayout;
