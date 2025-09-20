import React, { useState, useEffect } from 'react';

const Profile = () => {
    const [employeeData, setEmployeeData] = useState(null);

    useEffect(() => {
        const storedData = localStorage.getItem('employeeData');
        if (storedData) {
            try {
                setEmployeeData(JSON.parse(storedData));
            } catch (error) {
                console.error("Failed to parse employee data for profile", error);
            }
        }
    }, []);

    // Function to get the first letter of the name for the avatar
    const getInitials = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    if (!employeeData) {
        return <div className="loading-container">Loading Profile...</div>;
    }

    return (
        <div className="profile-layout">
            <div className="profile-main-card">
                <div className="profile-summary">
                    <div className="avatar">{getInitials(employeeData.name)}</div>
                    <div className="summary-info">
                        <h1 className="profile-name">{employeeData.name || 'N/A'}</h1>
                        <p className="profile-role">{employeeData.role || 'Employee'}</p>
                    </div>
                    <button className="edit-profile-btn">Edit Profile</button>
                </div>
                
                <div className="profile-details-grid">
                    {/* Personal Information */}
                    <div className="detail-section">
                        <h3 className="section-title">Personal Information</h3>
                        <div className="detail-item"><strong>User ID:</strong> <span>{employeeData.userId || 'N/A'}</span></div>
                        <div className="detail-item"><strong>Email:</strong> <span>{employeeData.email || 'N/A'}</span></div>
                        <div className="detail-item"><strong>Mobile:</strong> <span>{employeeData.mobile || 'N/A'}</span></div>
                        <div className="detail-item"><strong>Aadhar:</strong> <span>{employeeData.aadhar || 'N/A'}</span></div>
                    </div>

                    {/* Account Details */}
                    <div className="detail-section">
                        <h3 className="section-title">Account Details</h3>
                        <div className="detail-item"><strong>Joining Date:</strong> <span>{employeeData.joiningDate ? new Date(employeeData.joiningDate).toLocaleDateString() : 'N/A'}</span></div>
                        <div className="detail-item"><strong>Shift:</strong> <span>{employeeData.shift || 'N/A'}</span></div>
                        <div className="detail-item"><strong>Last Login:</strong> <span>{employeeData.lastLoginAt ? new Date(employeeData.lastLoginAt).toLocaleString() : 'N/A'}</span></div>
                        <div className="detail-item"><strong>Login Count:</strong> <span>{employeeData.loginCount || 0}</span></div>
                    </div>

                    {/* Bank Information */}
                    {employeeData.salaryAccount && (
                        <div className="detail-section full-width">
                            <h3 className="section-title">Bank Information</h3>
                            <div className="detail-item"><strong>Bank Name:</strong> <span>{employeeData.salaryAccount.bankName || 'N/A'}</span></div>
                            <div className="detail-item"><strong>Account No:</strong> <span>{employeeData.salaryAccount.accountNo || 'N/A'}</span></div>
                            <div className="detail-item"><strong>IFSC Code:</strong> <span>{employeeData.salaryAccount.ifscCode || 'N/A'}</span></div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .profile-layout {
                    padding: 1rem;
                    background-color: #f3f4f6;
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .loading-container {
                    text-align: center;
                    padding: 3rem;
                    color: #6b7280;
                }
                .profile-main-card {
                    background-color: white;
                    border-radius: 0.75rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
                    max-width: 900px;
                    margin: 0 auto;
                }
                .profile-summary {
                    display: flex;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }
                .avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background-color: #4f46e5;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    font-weight: 600;
                    flex-shrink: 0;
                }
                .summary-info {
                    flex-grow: 1;
                }
                .profile-name {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin: 0;
                    color: #111827;
                }
                .profile-role {
                    font-size: 1rem;
                    color: #6b7280;
                    margin: 0.25rem 0 0;
                }
                .edit-profile-btn {
                    padding: 0.6rem 1.2rem;
                    border: none;
                    background-color: #2563eb;
                    color: white;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .edit-profile-btn:hover {
                    background-color: #1d4ed8;
                }
                .profile-details-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                    padding: 2rem;
                }
                @media (min-width: 768px) {
                    .profile-details-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                .detail-section.full-width {
                    grid-column: 1 / -1;
                }
                .section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #374151;
                    margin: 0 0 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }
                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.95rem;
                    padding: 0.75rem 0;
                }
                .detail-item:not(:last-child) {
                    border-bottom: 1px solid #f3f4f6;
                }
                .detail-item strong {
                    color: #6b7280;
                    font-weight: 500;
                }
                .detail-item span {
                    color: #1f2937;
                    font-weight: 500;
                    text-align: right;
                }
            `}</style>
        </div>
    );
};

export default Profile;
