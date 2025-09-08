import React, { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebase/config';

const Team = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStats, setMemberStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('htamsUser'));
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }
    const usersRef = ref(db, 'HTAMS/users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allUsers = Object.entries(data).map(([uid, u]) => ({ uid, ...u }));
        const filtered = allUsers.filter(m => m.referredBy === user.uid);
        setTeamMembers(filtered);
        setFilteredMembers(filtered);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchMemberStats = async (uid) => {
    if (memberStats[uid]) {
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      const [usersSnap, ordersSnap] = await Promise.all([
        get(ref(db, 'HTAMS/users')),
        get(ref(db, 'HTAMS/orders')),
      ]);

      let totalReferred = 0;
      if (usersSnap.exists()) {
        const users = Object.values(usersSnap.val());
        totalReferred = users.filter(u => u.referredBy === uid).length;
      }

      let totalOrders = 0, totalSale = 0;
      if (ordersSnap.exists()) {
        const orders = Object.values(ordersSnap.val()).filter(o => o.placedBy === uid);
        totalOrders = orders.length;
        totalSale = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      }

      setMemberStats(prev => ({
        ...prev,
        [uid]: { totalReferred, totalOrders, totalSale },
      }));
    } catch (error) {
      console.error('Error fetching member stats:', error);
      setMemberStats(prev => ({ ...prev, [uid]: null }));
    } finally {
      setStatsLoading(false);
    }
  };

  const onRowClick = (member) => {
    setSelectedMember(member);
    fetchMemberStats(member.uid);
  };

  const closeModal = () => {
    setSelectedMember(null);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(e.target.value);
    if (!value) {
      setFilteredMembers(teamMembers);
    } else {
      setFilteredMembers(
        teamMembers.filter(
          (m) =>
            (m.name && m.name.toLowerCase().includes(value)) ||
            (m.email && m.email.toLowerCase().includes(value)) ||
            (m.phone && m.phone.toLowerCase().includes(value)) ||
            (m.role && m.role.toLowerCase().includes(value))
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="team-container loading-container">
        <div className="spinner"></div>
        <p>Loading team members...</p>
        <style>{responsiveStyles}</style>
      </div>
    );
  }

  return (
    <div className="team-container">
      {/* Header Section */}
      <div className="team-header">
        <div className="title-section">
          <h2 className="team-title">
            <span className="team-icon">👥</span>
            My Team
          </h2>
          <p className="team-subtitle">Manage and view your team members</p>
        </div>
        
        <div className="stats-card">
          <div className="stat-number">{filteredMembers.length}</div>
          <div className="stat-label">Total Members</div>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="search"
            placeholder="Search by name, email, phone, or role..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-container">
        <table className="team-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Role</th>
              <th>Level</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">
                  <div className="no-data-content">
                    <span className="no-data-icon">👥</span>
                    <p>No team members found</p>
                    <span>Try adjusting your search criteria</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMembers.map((member, index) => (
                <tr key={member.uid || index} className="team-row">
                  <td>
                    <div className="member-name">
                      <strong>{member.name || 'N/A'}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div className="email">📧 {member.email || 'N/A'}</div>
                      <div className="phone">📞 {member.phone || 'N/A'}</div>
                    </div>
                  </td>
                  <td>
                    <span className="role-badge">{member.role || 'Member'}</span>
                  </td>
                  <td>{member.currentLevel || '-'}</td>
                  <td>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}</td>
                  <td>
                    <button
                      className="view-button"
                      onClick={() => onRowClick(member)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards-container">
        {filteredMembers.length === 0 ? (
          <div className="no-data-card">
            <span className="no-data-icon">👥</span>
            <p>No team members found</p>
            <span>Try adjusting your search criteria</span>
          </div>
        ) : (
          filteredMembers.map((member, index) => (
            <div
              key={member.uid || index}
              className="member-card"
              onClick={() => onRowClick(member)}
            >
              <div className="card-header">
                <h3 className="member-name">{member.name || 'N/A'}</h3>
                <span className="role-badge">{member.role || 'Member'}</span>
              </div>
              
              <div className="card-content">
                <div className="contact-row">
                  <span className="contact-item">
                    <span className="contact-icon">📧</span>
                    {member.email || 'N/A'}
                  </span>
                </div>
                <div className="contact-row">
                  <span className="contact-item">
                    <span className="contact-icon">📞</span>
                    {member.phone || 'N/A'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-item">
                    <strong>Level:</strong> {member.currentLevel || '-'}
                  </span>
                  <span className="info-item">
                    <strong>Joined:</strong> {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
              
              <div className="card-footer">
                <button className="view-details-btn">
                  View Details →
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Team Member Details</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="member-details">
                <h4>👤 Personal Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedMember.name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedMember.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedMember.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Role:</label>
                    <span>{selectedMember.role || 'Member'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Level:</label>
                    <span>{selectedMember.currentLevel || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Joined:</label>
                    <span>{selectedMember.createdAt ? new Date(selectedMember.createdAt).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>
              
              <div className="stats-section">
                <h4>📊 Performance Stats</h4>
                {statsLoading ? (
                  <div className="stats-loading">
                    <div className="spinner-small"></div>
                    <p>Loading stats...</p>
                  </div>
                ) : (
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">₹{memberStats[selectedMember.uid]?.totalSale?.toLocaleString() || '0'}</div>
                      <div className="stat-label">Total Sales</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{memberStats[selectedMember.uid]?.totalReferred || 0}</div>
                      <div className="stat-label">Referrals</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{memberStats[selectedMember.uid]?.totalOrders || 0}</div>
                      <div className="stat-label">Orders</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="close-btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{responsiveStyles}</style>
    </div>
  );
};

const responsiveStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Base Container */
.team-container {
  font-family: 'Inter', sans-serif;
  padding: 16px;
  background: #f8fafc;
  min-height: 100vh;
  max-width: 100%;
  overflow-x: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #64748b;
}

/* Header Section */
.team-header {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-section {
  flex: 1;
}

.team-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-icon {
  font-size: 1.5rem;
}

.team-subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
}

.stats-card {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  padding: 16px;
  border-radius: 12px;
  color: white;
  text-align: center;
  width: fit-content;
  align-self: flex-start;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  display: block;
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.9;

  color: black;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Search Section */
.search-section {
  margin-bottom: 20px;
}

.search-wrapper {
  position: relative;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #64748b;
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  font-size: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  outline: none;
  background: white;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Desktop Table - Hidden on Mobile */
.desktop-table-container {
  display: none;
}

/* Mobile Cards - Visible by Default */
.mobile-cards-container {
  display: block;
}

.member-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.member-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
  word-break: break-word;
}

.role-badge {
  background: #6366f1;
  color: white;
  padding: 4px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.card-content {
  margin-bottom: 12px;
}

.contact-row {
  margin-bottom: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: #475569;
}

.contact-icon {
  font-size: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.info-item {
  font-size: 0.875rem;
  color: #64748b;
}

.info-item strong {
  color: #374151;
}

.card-footer {
  text-align: right;
}

.view-details-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-details-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* No Data States */
.no-data-card {
  background: white;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.no-data-icon {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 8px;
}

.no-data-content p {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.no-data-content span {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  box-sizing: border-box;
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.member-details,
.stats-section {
  margin-bottom: 24px;
}

.member-details h4,
.stats-section h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item span {
  font-size: 1rem;
  color: #1e293b;
  font-weight: 500;
  word-break: break-word;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.stat-card {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-card .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-card .stat-label {
  font-size: 0.875rem;
  color: #475569;
  font-weight: 500;
}

.stats-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #64748b;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.close-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

/* Loading Spinners */
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Tablet Styles (768px and up) */
@media (min-width: 768px) {
  .team-container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .team-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .stats-card {
    align-self: center;
  }
  
  .detail-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .modal-content {
    max-width: 600px;
  }
}

/* Desktop Styles (1024px and up) */
@media (min-width: 1024px) {
  .team-container {
    padding: 32px;
  }
  
  /* Show table, hide cards on desktop */
  .desktop-table-container {
    display: block;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
  }
  
  .mobile-cards-container {
    display: none;
  }
  
  .team-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .team-table th,
  .team-table td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .team-table th {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    font-weight: 600;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .team-row {
    transition: all 0.3s ease;
  }
  
  .team-row:hover {
    background: #f8fafc;
    transform: translateY(-1px);
  }
  
  .contact-info {
    min-width: 200px;
  }
  
  .email, .phone {
    font-size: 13px;
    color: #475569;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .view-button {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: black;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .view-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
  
  .no-data {
    text-align: center;
    padding: 60px 24px;
    border: none;
  }
}
`;

export default Team;
