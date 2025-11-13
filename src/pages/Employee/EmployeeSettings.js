import React, { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaCog, FaLock, FaBell, FaUser, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';

const EmployeeSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  
  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    taskReminders: true,
    scheduleUpdates: true
  });

  const employeeId = localStorage.getItem('employeeId');

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      const snapshot = await get(employeeRef);
      
      if (snapshot.exists()) {
        setEmployeeData(snapshot.val());
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      // In a real app, you'd verify the current password first
      const updates = {
        password: passwordData.newPassword,
        lastPasswordUpdate: new Date().toISOString()
      };

      // Update both nodes
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      await update(employeeRef, updates);

      const technicianRef = ref(database, `HTAMS/technicians/${employeeId}`);
      await update(technicianRef, updates);

      alert('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    try {
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      await update(employeeRef, {
        notificationSettings: notifications,
        lastUpdated: new Date().toISOString()
      });

      alert('Notification settings updated successfully!');
    } catch (error) {
      console.error('Error updating notifications:', error);
      alert('Failed to update notification settings.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: FaUser },
    { id: 'password', label: 'Change Password', icon: FaLock },
    { id: 'notifications', label: 'Notifications', icon: FaBell }
  ];

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>
          <FaCog className="page-icon" />
          Settings
        </h1>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent className="tab-icon" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="settings-main">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Settings</h2>
              <div className="profile-info">
                <div className="info-card">
                  <h3>Account Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Employee ID</label>
                      <span>{employeeId}</span>
                    </div>
                    <div className="info-item">
                      <label>Name</label>
                      <span>{employeeData?.name}</span>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <span>{employeeData?.email}</span>
                    </div>
                    <div className="info-item">
                      <label>Mobile</label>
                      <span>{employeeData?.mobile}</span>
                    </div>
                    <div className="info-item">
                      <label>Role</label>
                      <span>{employeeData?.role}</span>
                    </div>
                    <div className="info-item">
                      <label>Joining Date</label>
                      <span>{employeeData?.joiningDate}</span>
                    </div>
                  </div>
                  <p className="note">
                    To update your profile information, please contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="settings-section">
              <h2>Change Password</h2>
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="password-input">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <div className="password-input">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        newPassword: e.target.value
                      }))}
                      required
                      minLength="8"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <small className="password-hint">
                    Password must be at least 8 characters long
                  </small>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="password-input">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({
                        ...prev,
                        confirmPassword: e.target.value
                      }))}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="save-btn" disabled={loading}>
                  <FaSave />
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <div className="notifications-form">
                <div className="notification-group">
                  <h3>Communication Methods</h3>
                  <div className="notification-options">
                    <label className="notification-item">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) => setNotifications(prev => ({
                          ...prev,
                          email: e.target.checked
                        }))}
                      />
                      <span className="checkmark"></span>
                      <div className="notification-info">
                        <strong>Email Notifications</strong>
                        <p>Receive notifications via email</p>
                      </div>
                    </label>

                    <label className="notification-item">
                      <input
                        type="checkbox"
                        checked={notifications.sms}
                        onChange={(e) => setNotifications(prev => ({
                          ...prev,
                          sms: e.target.checked
                        }))}
                      />
                      <span className="checkmark"></span>
                      <div className="notification-info">
                        <strong>SMS Notifications</strong>
                        <p>Receive notifications via SMS</p>
                      </div>
                    </label>

                    <label className="notification-item">
                      <input
                        type="checkbox"
                        checked={notifications.push}
                        onChange={(e) => setNotifications(prev => ({
                          ...prev,
                          push: e.target.checked
                        }))}
                      />
                      <span className="checkmark"></span>
                      <div className="notification-info">
                        <strong>Push Notifications</strong>
                        <p>Receive push notifications in browser</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="notification-group">
                  <h3>Notification Types</h3>
                  <div className="notification-options">
                    <label className="notification-item">
                      <input
                        type="checkbox"
                        checked={notifications.taskReminders}
                        onChange={(e) => setNotifications(prev => ({
                          ...prev,
                          taskReminders: e.target.checked
                        }))}
                      />
                      <span className="checkmark"></span>
                      <div className="notification-info">
                        <strong>Task Reminders</strong>
                        <p>Get reminded about upcoming tasks and deadlines</p>
                      </div>
                    </label>

                    <label className="notification-item">
                      <input
                        type="checkbox"
                        checked={notifications.scheduleUpdates}
                        onChange={(e) => setNotifications(prev => ({
                          ...prev,
                          scheduleUpdates: e.target.checked
                        }))}
                      />
                      <span className="checkmark"></span>
                      <div className="notification-info">
                        <strong>Schedule Updates</strong>
                        <p>Get notified about schedule changes</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button 
                  className="save-btn"
                  onClick={handleNotificationUpdate}
                  disabled={loading}
                >
                  <FaSave />
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .settings-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .settings-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #111827;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .page-icon {
          color: #3b82f6;
        }

        .settings-content {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 2rem;
        }

        .settings-sidebar {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          height: fit-content;
        }

        .tab-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border: none;
          background: none;
          color: #6b7280;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 0.5rem;
        }

        .tab-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .tab-btn.active {
          background: #eff6ff;
          color: #3b82f6;
        }

        .tab-icon {
          font-size: 1rem;
        }

        .settings-main {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .settings-section h2 {
          color: #111827;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 1.5rem 0;
        }

        .info-card {
          background: #f9fafb;
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .info-card h3 {
          color: #111827;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-item label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        .info-item span {
          color: #111827;
          font-size: 1rem;
        }

        .note {
          color: #6b7280;
          font-size: 0.875rem;
          font-style: italic;
          margin: 0;
        }

        .password-form {
          max-width: 400px;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .password-input {
          position: relative;
        }

        .password-input input {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .password-input input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .password-toggle {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
        }

        .password-toggle:hover {
          color: #374151;
        }

        .password-hint {
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .notifications-form {
          max-width: 600px;
        }

        .notification-group {
          margin-bottom: 2rem;
        }

        .notification-group h3 {
          color: #111827;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 1rem 0;
        }

        .notification-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-item:hover {
          background: #f3f4f6;
        }

        .notification-item input[type="checkbox"] {
          display: none;
        }

        .checkmark {
          width: 20px;
          height: 20px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          position: relative;
          transition: all 0.2s ease;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-item input:checked + .checkmark {
          background: #3b82f6;
          border-color: #3b82f6;
        }

        .notification-item input:checked + .checkmark::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
        }

        .notification-info {
          flex: 1;
        }

        .notification-info strong {
          color: #111827;
          font-size: 1rem;
          display: block;
          margin-bottom: 0.25rem;
        }

        .notification-info p {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .settings-container {
            padding: 1rem;
          }

          .settings-content {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .settings-sidebar {
            display: flex;
            overflow-x: auto;
            padding: 0.5rem;
          }

          .tab-btn {
            white-space: nowrap;
            margin-right: 0.5rem;
            margin-bottom: 0;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeSettings;
