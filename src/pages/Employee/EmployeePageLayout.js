import React, { useState, useEffect } from 'react';
import EmployeeSidebar from '../../components/EmpolyeeSidebar'; // Adjust path if needed
import EmployeeDashboard from './EmployeeDashboard';
import Profile from './Profile';

const EmployeePageLayout = () => {
    const [activeView, setActiveView] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // This effect handles closing the mobile menu if the screen is resized to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="employee-layout-container">
            <EmployeeSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            {/* The 'content-shifted' class pushes the main content to the right */}
            <main className={`main-content-area ${isSidebarOpen ? 'content-shifted' : ''}`}>
                {activeView === 'dashboard' && <EmployeeDashboard />}
                {activeView === 'profile' && <Profile />}
            </main>

            <style>{`
                .employee-layout-container {
                    display: flex;
                    background-color: #f3f4f6; /* Light gray background for the whole page */
                }
                .main-content-area {
                    flex-grow: 1;
                    height: 100vh;
                    overflow-y: auto;
                    transition: margin-left 0.3s ease-in-out;
                }

                /* On non-mobile screens, push content to make room for the sidebar */
                @media (min-width: 768px) {
                    .main-content-area {
                        margin-left: 80px; /* Default compact sidebar width */
                    }
                }
            `}</style>
        </div>
    );
};

export default EmployeePageLayout;
