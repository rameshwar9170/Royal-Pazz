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
      <div className="team-page">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading team members...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="team-page">
      {/* Header with Total Members */}
      <div className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">
            
              My Team
            </h1>
            <p className="page-subtitle">Manage and view your team members</p>
          </div>
          
          <div className="total-members-card">
            <div className="members-count">{filteredMembers.length}</div>
            <div className="members-label">TOTAL MEMBERS</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, phone, or role..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="desktop-view">
        <div className="table-wrapper">
          <div className="table-scroll-container">
            <table className="members-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>CONTACT</th>
                  {/* <th>ROLE</th> */}
                  <th>LEVEL</th>
                  <th>JOINED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <div className="empty-content">
                        <span className="empty-icon">📭</span>
                        <p>No team members found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.uid}>
                      <td>
                        <div className="member-name-cell">{member.name || 'N/A'}</div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <div className="contact-item">
                            <span className="icon">📧</span>
                            {member.email || 'N/A'}
                          </div>
                          <div className="contact-item">
                            <span className="icon">📞</span>
                            {member.phone || 'N/A'}
                          </div>
                        </div>
                      </td>
                      {/* <td>
                        <span className="role-badge">{(member.role || 'Member').toUpperCase()}</span>
                      </td> */}
                      <td>
                        <span className="level-text">{member.currentLevel || '-'}</span>
                      </td>
                      <td>
                        <span className="date-text">
                          {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td>
                        <button className="view-btn" onClick={() => onRowClick(member)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile Cards - 2 Per Row - Fixed */}
      <div className="mobile-view">
        {filteredMembers.length === 0 ? (
          <div className="empty-state-mobile">
            <span className="empty-icon">📭</span>
            <p>No team members found</p>
          </div>
        ) : (
          <div className="mobile-cards-grid">
            {filteredMembers.map((member) => (
              <div key={member.uid} className="member-card-mobile" onClick={() => onRowClick(member)}>
                <div className="card-header-section">
                  <h3 className="card-name">{member.name || 'N/A'}</h3>
                  <span className="card-role-badge">{(member.role || 'Member').toUpperCase()}</span>
                </div>
                
                <div className="card-contact-section">
                  <div className="contact-row">
                    <span className="contact-icon">📧</span>
                    <span className="contact-value">{member.email || 'N/A'}</span>
                  </div>
                  <div className="contact-row">
                    <span className="contact-icon">📞</span>
                    <span className="contact-value">{member.phone || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="card-info-section">
                  <div className="info-row">
                    <span className="info-label">Level:</span>
                    <span className="info-value">{member.currentLevel || '-'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Joined:</span>
                    <span className="info-value">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
                
                <button className="card-view-button">View Details →</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedMember && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Team Member Details</h2>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <section className="info-section">
                <h3 className="section-title">
                  <span className="section-icon">👤</span>
                  Personal Information
                </h3>
                <div className="info-grid">
                  <div className="info-field">
                    <div className="field-label">NAME:</div>
                    <div className="field-value">{selectedMember.name || 'N/A'}</div>
                  </div>
                  <div className="info-field">
                    <div className="field-label">EMAIL:</div>
                    <div className="field-value">{selectedMember.email || 'N/A'}</div>
                  </div>
                  <div className="info-field">
                    <div className="field-label">PHONE:</div>
                    <div className="field-value">{selectedMember.phone || 'N/A'}</div>
                  </div>
                  {/* <div className="info-field">
                    <div className="field-label">ROLE:</div>
                    <div className="field-value">{selectedMember.role || 'Member'}</div>
                  </div> */}
                  <div className="info-field">
                    <div className="field-label">LEVEL:</div>
                    <div className="field-value">{selectedMember.currentLevel || '-'}</div>
                  </div>
                  <div className="info-field">
                    <div className="field-label">JOINED:</div>
                    <div className="field-value">
                      {selectedMember.createdAt ? new Date(selectedMember.createdAt).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </section>
 <h3 className="section-title">
                  <span className="section-icon">📊</span>
                  Performance Stats
                </h3>
              <section className="stats-section">
               
                {statsLoading ? (
                  <div className="stats-loader">
                    <div className="loader-small"></div>
                    <p>Loading stats...</p>
                  </div>
                ) : (
                  <div className="stats-cards-grid">
                    <div className="stat-box">
                      <div className="stat-amount">₹{memberStats[selectedMember.uid]?.totalSale?.toLocaleString() || '0'}</div>
                      <div className="stat-name">TOTAL SALES</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-amount">{memberStats[selectedMember.uid]?.totalReferred || 0}</div>
                      <div className="stat-name">REFERRALS</div>
                    </div>
                    <div className="stat-box stat-box-full">
                      <div className="stat-amount">{memberStats[selectedMember.uid]?.totalOrders || 0}</div>
                      <div className="stat-name">ORDERS</div>
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="modal-footer">
              <button className="close-modal-btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  overflow-x: hidden;
  width: 100%;
}

.team-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  min-height: 100vh;
  padding: 6px;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #666;
}

.loader {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

.loader-small {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header */
.page-header {
  background: #002B5C;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.title-section {
  flex: 1;
  min-width: 200px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #ffffffff;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}


.page-subtitle {
  font-size: 14px;
  color: #f0f0f0ff;
  margin: 0;
}

.total-members-card {
  background: #F36F21;
  padding: 16px 24px;
  border-radius: 12px;
  text-align: center;
  min-width: 140px;
}

.members-count {
  font-size: 36px;
  font-weight: 700;
  color: white;
  line-height: 1;
  margin-bottom: 4px;
}

.members-label {
  font-size: 11px;
  font-weight: 600;
  color: white;
  opacity: 0.9;
  letter-spacing: 0.5px;
}

/* Search */
.search-container {
  margin-bottom: 16px;
}

.search-box {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

/* Desktop Table */
.desktop-view {
  display: none;
}

.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.table-scroll-container {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
  overflow-x: auto;
}

.table-scroll-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.members-table {
  width: 100%;
  border-collapse: collapse;
}

.members-table thead {
  background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
  position: sticky;
  top: 0;
  z-index: 10;
}

.members-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.members-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.members-table tbody tr:hover {
  background: #f9fafb;
}

.members-table td {
  padding: 16px;
  font-size: 14px;
  color: #374151;
}

.member-name-cell {
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
}

.contact-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.contact-item .icon {
  font-size: 14px;
}

.role-badge {
  display: inline-block;
  background: #6366f1;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.level-text {
  font-weight: 600;
  color: #1a1a1a;
}

.date-text {
  color: #666;
  white-space: nowrap;
}

.view-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-content p {
  font-size: 16px;
  font-weight: 500;
}

/* Mobile Cards - 2 Per Row - FIXED */
.mobile-view {
  display: block;
  width: 100%;
  max-width: 100%;
}

.mobile-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;
}

.member-card-mobile {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
}

.member-card-mobile:active {
  transform: scale(0.98);
}

.card-header-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
  margin: 0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.card-role-badge {
  background: #6366f1;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  align-self: flex-start;
  text-transform: uppercase;
}

.card-contact-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.contact-icon {
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.contact-value {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  flex: 1;
  min-width: 0;
}

.card-info-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 600;
  color: #374151;
  font-size: 11px;
  flex-shrink: 0;
}

.info-value {
  color: #666;
  font-size: 11px;
  text-align: right;
}

.card-view-button {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: auto;
}

.empty-state-mobile {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  color: #9ca3af;
  grid-column: 1 / -1;
}

.empty-state-mobile .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state-mobile p {
  font-size: 16px;
  font-weight: 500;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  padding: 0;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-dialog {
  background: white;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.modal-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: #ea5d44ff;
  border-radius: 8px;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.modal-close-btn:hover {
  background: #b40303ff;
  color: #1a1a1a;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  -webkit-overflow-scrolling: touch;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.info-section,
.stats-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 18px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-value {
  font-size: 15px;
  color: #1a1a1a;
  font-weight: 500;
  word-break: break-word;
}

.stats-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #666;
}

.stats-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-box-full {
  grid-column: 1 / -1;
}

.stat-amount {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.stat-name {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.close-modal-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 14px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* Tablet & Desktop */
@media (min-width: 768px) {
  .team-page {
    padding: 12px;
  }

  .page-header {
    padding: 12px;
  }

  .modal-backdrop {
    align-items: center;
    padding: 6px;
  }

  .modal-dialog {
    border-radius: 16px;
    max-width: 600px;
    max-height: 90vh;
  }

  .info-grid {
    grid-template-columns: 1fr 1fr;
  }

  .stats-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .stat-box-full {
    grid-column: auto;
  }

  .mobile-cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .team-page {
    padding: 12px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .desktop-view {
    display: block;
  }

  .mobile-view {
    display: none;
  }
}
`;

export default Team;
