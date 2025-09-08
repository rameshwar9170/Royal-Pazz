import React from "react";
import { Link, useLocation } from "react-router-dom";

const PageShell = ({ title, children }) => {
  const location = useLocation();
  
  const navItems = [
    { path: "/policies/terms", label: "Terms & Conditions", icon: "📋" },
    { path: "/policies/privacy", label: "Privacy Policy", icon: "🔒" },
    { path: "/policies/refund", label: "Refund Policy", icon: "💰" },
    { path: "/policies/shipping", label: "Shipping Policy", icon: "📦" },
    { path: "/policies/contact", label: "Contact Us", icon: "📞" }
  ];

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        
        .page-container {
          min-height: 100vh;
          background-color: #f8fafc;
        }
        
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
        }
        
        .logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #059669;
          text-decoration: none;
          letter-spacing: -0.025em;
        }
        
        .logo:hover {
          color: #047857;
        }
        
        .header-nav {
          display: none;
          gap: 0.25rem;
          font-size: 0.875rem;
        }
        
        @media (min-width: 768px) {
          .header-nav {
            display: flex;
          }
        }
        
        .header-nav-link {
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
          text-decoration: none;
          transition: all 0.2s ease;
          color: #6b7280;
        }
        
        .header-nav-link:hover {
          background-color: #f3f4f6;
          color: #111827;
        }
        
        .header-nav-link.active {
          background-color: #dcfce7;
          color: #059669;
          font-weight: 500;
        }
        
        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .content-layout {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        @media (min-width: 1024px) {
          .content-layout {
            flex-direction: row;
          }
        }
        
        .sidebar {
          width: 100%;
          flex-shrink: 0;
        }
        
        @media (min-width: 1024px) {
          .sidebar {
            width: 320px;
          }
        }
        
        .sidebar-sticky {
          position: sticky;
          top: 6rem;
        }
        
        .sidebar-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          padding: 1.5rem;
        }
        
        .sidebar-title {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }
        
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          text-decoration: none;
          transition: all 0.2s ease;
          color: #6b7280;
        }
        
        .sidebar-nav-link:hover {
          background-color: #f9fafb;
          color: #1f2937;
        }
        
        .sidebar-nav-link.active {
          background-color: #ecfdf5;
          color: #059669;
          font-weight: 500;
          border-left: 4px solid #059669;
        }
        
        .sidebar-nav-icon {
          font-size: 1.125rem;
        }
        
        .sidebar-help {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f3f4f6;
        }
        
        .sidebar-help-title {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        
        .sidebar-help-link {
          font-size: 0.875rem;
          color: #059669;
          text-decoration: none;
          font-weight: 500;
        }
        
        .sidebar-help-link:hover {
          color: #047857;
        }
        
        .main-card {
          flex: 1;
          min-width: 0;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }
        
        .main-card-content {
          padding: 2rem 3rem;
        }
        
        @media (max-width: 1024px) {
          .main-card-content {
            padding: 1.5rem 2rem;
          }
        }
        
        .page-title {
          margin-bottom: 2rem;
          font-size: 2.25rem;
          font-weight: 700;
          color: #1f2937;
          letter-spacing: -0.025em;
        }
        
        @media (max-width: 1024px) {
          .page-title {
            font-size: 1.875rem;
          }
        }
        
        .content-prose {
          font-size: 1.125rem;
          line-height: 1.7;
          max-width: none;
        }
        
        .content-prose h2 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .content-prose h3 {
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .content-prose p {
          margin-bottom: 1rem;
          color: #4b5563;
        }
        
        .content-prose ul {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        
        .content-prose li {
          margin: 0.25rem 0;
          color: #4b5563;
        }
        
        .content-prose a {
          color: #059669;
          text-decoration: underline;
          font-weight: 500;
        }
        
        .content-prose a:hover {
          color: #047857;
        }
        
        .footer {
          border-top: 1px solid #e5e7eb;
          background: white;
          margin-top: 4rem;
        }
        
        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        .footer-inner {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        
        @media (min-width: 768px) {
          .footer-inner {
            flex-direction: row;
          }
        }
        
        .footer-copyright {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .footer-links {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
        }
        
        .footer-link {
          color: #6b7280;
          text-decoration: none;
        }
        
        .footer-link:hover {
          color: #374151;
        }
      `}</style>
      
      <div className="page-container">
        <header className="header">
          <div className="header-content">
            <Link to="/" className="logo">🌿 Panchgiri Ayurveda</Link>
            <nav className="header-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  className={`header-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  to={item.path}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="main-content">
          <div className="content-layout">
            <aside className="sidebar">
              <div className="sidebar-sticky">
                <div className="sidebar-card">
                  <h3 className="sidebar-title">Policy Pages</h3>
                  <nav className="sidebar-nav">
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`sidebar-nav-link ${location.pathname === item.path ? 'active' : ''}`}
                      >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                  
                  <div className="sidebar-help">
                    <div className="sidebar-help-title">Need Help?</div>
                    <Link to="/policies/contact" className="sidebar-help-link">
                      Contact Support →
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

            <main className="main-card">
              <div className="main-card-content">
                <h1 className="page-title">{title}</h1>
                <div className="content-prose">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>

        <footer className="footer">
          <div className="footer-content">
            <div className="footer-inner">
              <div className="footer-copyright">
                © {new Date().getFullYear()} Panchgiri Ayurveda. All rights reserved.
              </div>
              <div className="footer-links">
                <Link to="/policies/terms" className="footer-link">Terms</Link>
                <Link to="/policies/privacy" className="footer-link">Privacy</Link>
                <Link to="/policies/contact" className="footer-link">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PageShell;
