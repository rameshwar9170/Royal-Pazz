import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './AppLayout.css';

const AppLayout = ({ children, showSidebar = true, sidebarComponent: SidebarComponent }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      {isMobile && (
        <header className="mobile-header">
          <div className="mobile-header-content">
            {showSidebar && (
              <button 
                className="mobile-menu-btn"
                onClick={toggleSidebar}
                aria-label="Toggle menu"
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            )}
            <div className="mobile-logo">
              <span className="logo-icon">🏢</span>
              <span className="logo-text">HTAMS</span>
            </div>
            <div className="mobile-actions">
              <button className="notification-btn" aria-label="Notifications">
                <span className="notification-icon">🔔</span>
                <span className="notification-badge">3</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Sidebar Overlay (Mobile) */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {showSidebar && SidebarComponent && (
        <aside className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <SidebarComponent 
            isOpen={!isMobile || sidebarOpen}
            toggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />
        </aside>
      )}

      {/* Main Content */}
      <main className={`app-main ${showSidebar ? 'with-sidebar' : 'full-width'}`}>
        <div className="main-content">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <div className="bottom-nav-content">
            <button className="nav-item active">
              <span className="nav-icon">🏠</span>
              <span className="nav-label">Home</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">👥</span>
              <span className="nav-label">Customers</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">📦</span>
              <span className="nav-label">Orders</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">📊</span>
              <span className="nav-label">Reports</span>
            </button>
            <button className="nav-item">
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
