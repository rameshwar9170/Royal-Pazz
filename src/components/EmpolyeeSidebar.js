import React, { useEffect } from 'react';

const EmployeeSidebar = ({ activeView, setActiveView, isOpen, setIsOpen }) => {

    useEffect(() => {
        // Prevent body from scrolling when mobile menu is open
        if (isOpen && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const handleLogout = () => {
        localStorage.removeItem('employeeData');
        window.location.href = '/employee-login';
    };

    const handleItemClick = (view) => {
        setActiveView(view);
        if (window.innerWidth < 768) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {/* Hamburger button for mobile */}
            <button className="mobile-menu-toggle" onClick={() => setIsOpen(!isOpen)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Overlay for mobile view */}
            {isOpen && <div className="mobile-sidebar-overlay" onClick={() => setIsOpen(false)}></div>}

            {/* The Sidebar */}
            <nav className={`sidebar-nav ${isOpen ? 'open' : ''}`}>
                <div>
                    <div className="sidebar-header">
                        <span className="logo-text">HTAMS</span>
                    </div>
                    <ul className="sidebar-menu-list">
                        <li>
                            <button className={`sidebar-button ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => handleItemClick('dashboard')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                <span className="button-text">Dashboard</span>
                            </button>
                        </li>
                        <li>
                            <button className={`sidebar-button ${activeView === 'profile' ? 'active' : ''}`} onClick={() => handleItemClick('profile')}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <span className="button-text">Profile</span>
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-footer">
                    <button className="sidebar-button logout-btn" onClick={handleLogout}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span className="button-text">Logout</span>
                    </button>
                </div>
            </nav>

            <style>{`
                .sidebar-nav {
                    background-color: #111827;
                    color: #f9fafb;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    height: 100vh;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 1000;
                    transition: transform 0.3s ease-in-out;
                    width: 240px; /* Full width for desktop */
                }
                .sidebar-header { padding: 1.5rem; text-align: center; }
                .logo-text { font-size: 1.75rem; font-weight: 700; letter-spacing: 1.5px; }
                .sidebar-menu-list { list-style: none; padding: 0 1rem; margin: 0; }
                .sidebar-button { display: flex; align-items: center; gap: 1rem; width: 100%; padding: 0.8rem 1rem; margin-bottom: 0.5rem; border-radius: 0.5rem; background: none; border: none; color: #d1d5db; font-size: 1rem; text-align: left; cursor: pointer; transition: all 0.2s; }
                .sidebar-button:hover { background-color: #374151; color: white; }
                .sidebar-button.active { background-color: #2563eb; color: white; }
                .sidebar-footer { padding: 1.5rem; }
                .logout-btn { color: #f87171; }
                .logout-btn:hover { background-color: #ef4444; color: white; }
                
                .mobile-menu-toggle { display: none; }
                .mobile-sidebar-overlay { display: none; }

                /* Mobile view specific styles */
                @media (max-width: 767px) {
                    .sidebar-nav {
                        transform: translateX(-100%);
                    }
                    .sidebar-nav.open {
                        transform: translateX(0);
                    }
                    .mobile-menu-toggle {
                        display: block;
                        position: fixed;
                        top: 1rem;
                        left: 1rem;
                        z-index: 1001; /* Above sidebar */
                        background: #fff;
                        border: 1px solid #e5e7eb;
                        border-radius: 0.5rem;
                        padding: 0.5rem;
                        cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    .mobile-sidebar-overlay {
                        position: fixed;
                        inset: 0;
                        background-color: rgba(0, 0, 0, 0.6);
                        z-index: 999; /* Below sidebar, above content */
                    }
                }
            `}</style>
        </>
    );
};

export default EmployeeSidebar;
