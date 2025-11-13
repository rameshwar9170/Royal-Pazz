import React, { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaUser, FaEnvelope, FaMobile, FaIdCard, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const EmployeeProfile = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const employeeId = localStorage.getItem('employeeId');

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      const snapshot = await get(employeeRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setEmployeeData(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData(employeeData);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      await update(employeeRef, {
        name: formData.name,
        email: formData.email,
        shift: formData.shift,
        lastUpdated: new Date().toISOString()
      });
      
      setEmployeeData({ ...employeeData, ...formData });
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        {!editing ? (
          <button className="edit-btn" onClick={handleEdit}>
            <FaEdit /> Edit Profile
          </button>
        ) : (
          <div className="edit-actions">
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              <FaSave /> {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="cancel-btn" onClick={handleCancel}>
              <FaTimes /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <FaUser className="info-icon" />
                <div className="info-content">
                  <label>Full Name</label>
                  {editing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  ) : (
                    <span>{employeeData?.name}</span>
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaEnvelope className="info-icon" />
                <div className="info-content">
                  <label>Email Address</label>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  ) : (
                    <span>{employeeData?.email}</span>
                  )}
                </div>
              </div>

              <div className="info-item">
                <FaMobile className="info-icon" />
                <div className="info-content">
                  <label>Mobile Number</label>
                  <span>{employeeData?.mobile}</span>
                </div>
              </div>

              <div className="info-item">
                <FaIdCard className="info-icon" />
                <div className="info-content">
                  <label>Employee ID</label>
                  <span>{employeeId}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Work Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-content">
                  <label>Role</label>
                  <span>{employeeData?.role}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-content">
                  <label>Joining Date</label>
                  <span>{employeeData?.joiningDate}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-content">
                  <label>Shift</label>
                  {editing ? (
                    <select
                      name="shift"
                      value={formData.shift || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  ) : (
                    <span>{employeeData?.shift}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .profile-header h1 {
          color: #111827;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .edit-btn, .save-btn, .cancel-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .save-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }

        .cancel-btn {
          background: #e5e7eb;
          color: #374151;
          margin-left: 0.5rem;
        }

        .edit-btn:hover, .save-btn:hover, .cancel-btn:hover {
          transform: translateY(-1px);
        }

        .edit-actions {
          display: flex;
          align-items: center;
        }

        .profile-content {
          display: grid;
          gap: 2rem;
        }

        .profile-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .profile-section {
          padding: 2rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .profile-section:last-child {
          border-bottom: none;
        }

        .profile-section h3 {
          color: #111827;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 1.5rem 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .info-icon {
          color: #3b82f6;
          font-size: 1.25rem;
          min-width: 20px;
        }

        .info-content {
          flex: 1;
        }

        .info-content label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .info-content span {
          color: #111827;
          font-size: 1rem;
        }

        .edit-input {
          width: 100%;
          padding: 0.5rem;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
        }

        .edit-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
          font-size: 1.125rem;
        }

        @media (max-width: 768px) {
          .profile-container {
            padding: 1rem;
          }

          .profile-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .profile-section {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeProfile;
