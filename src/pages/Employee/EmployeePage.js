import React, { useState } from 'react';
import Sidebar from './Sidebar';
import EmployeeDashboard from './EmployeeDashboard';
import Profile from './Profile';
import './EmployeePage.css';

const EmployeePage = () => {
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'profile'

    return (
        <div className="employee-page-container">
            <Sidebar setActiveView={setActiveView} activeView={activeView} />
            <div className="main-content">
                {activeView === 'dashboard' && <EmployeeDashboard />}
                {activeView === 'profile' && <Profile />}
            </div>
        </div>
    );
};

export default EmployeePage;
