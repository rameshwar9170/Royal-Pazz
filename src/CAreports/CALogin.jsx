// CALogin.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// import './CALogin.css';

const CALogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Check if user has CA role
      const userRef = ref(database, `HTAMS/users/${user.uid}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        
        // Check if user is CA or admin
        if (userData.role === 'ca' || userData.role === 'admin') {
          localStorage.setItem('caUser', JSON.stringify({
            uid: user.uid,
            email: userData.email,
            name: userData.name,
            role: userData.role
          }));
          
          toast.success('CA Login Successful!');
          navigate('/ca-dashboard');
        } else {
          toast.error('Access Denied! CA privileges required.');
          await auth.signOut();
        }
      } else {
        toast.error('User data not found!');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ca-login-container">
      <div className="ca-login-card">
        <div className="ca-login-header">
          <h2>CA Login Portal</h2>
          <p>Chartered Accountant Access</p>
        </div>
        
        <form onSubmit={handleSubmit} className="ca-login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className="ca-login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login as CA'}
          </button>
        </form>

        <div className="ca-login-footer">
          <p>For CA access only • ONDO System</p>
        </div>
      </div>
      <style jsx>{`/* CALogin.css */
.ca-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  padding: 20px;
}

.ca-login-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.ca-login-header {
  text-align: center;
  margin-bottom: 30px;
}

.ca-login-header h2 {
  color: #1e3a8a;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.ca-login-header p {
  color: #64748b;
  font-size: 16px;
}

.ca-login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  color: #374151;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.ca-login-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.ca-login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.ca-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ca-login-footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.ca-login-footer p {
  color: #9ca3af;
  font-size: 14px;
}

/* CADashboard.css */
.ca-dashboard {
  min-height: 100vh;
  background: #f8fafc;
}

.ca-header {
  background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%);
  color: white;
  padding: 20px 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.ca-header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ca-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.ca-user-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ca-nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 20px;
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
}

.nav-btn {
  padding: 16px 24px;
  border: none;
  background: none;
  color: #6b7280;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  color: #3b82f6;
}

.nav-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.ca-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
}

.ca-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Overview Tab Styles */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
}

.stat-card.sales .stat-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.stat-card.commissions .stat-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.stat-card.withdrawals .stat-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.stat-card.pending .stat-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.stat-card.users .stat-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.stat-card.orders .stat-icon {
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
}

.stat-content h3 {
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  color: #1f2937;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

/* Reports and Tables */
.reports-header, .transactions-header, .analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.reports-header h2, .transactions-header h2, .analytics-header h2 {
  color: #1f2937;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.export-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.filters-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  color: #374151;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.filter-group input,
.filter-group select {
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.filter-group input:focus,
.filter-group select:focus {
  outline: none;
  border-color: #3b82f6;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  text-align: center;
}

.summary-card h4 {
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-card p {
  color: #1f2937;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

/* Table Styles */
.reports-table-container,
.transactions-table-container,
.analytics-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.reports-table,
.transactions-table,
.analytics-table {
  width: 100%;
  border-collapse: collapse;
}

.reports-table th,
.transactions-table th,
.analytics-table th {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  font-size: 14px;
  text-align: left;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.reports-table td,
.transactions-table td,
.analytics-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.reports-table tbody tr:hover,
.transactions-table tbody tr:hover,
.analytics-table tbody tr:hover {
  background: #f9fafb;
}

.user-details strong {
  color: #1f2937;
  font-weight: 600;
}

.user-details small {
  color: #6b7280;
  font-size: 12px;
}

.role-badge,
.status-badge,
.type-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge.agency {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-badge.diamond-agency {
  background: #f3e8ff;
  color: #7c3aed;
}

.role-badge.mega-agency {
  background: #fef3c7;
  color: #d97706;
}

.role-badge.admin {
  background: #fee2e2;
  color: #dc2626;
}

.status-badge.completed {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.type-badge.withdrawal {
  background: #fef3c7;
  color: #92400e;
}

.type-badge.deposit {
  background: #d1fae5;
  color: #065f46;
}

.commission-amount,
.amount,
.earnings,
.received {
  font-weight: 600;
  color: #059669;
}

.transaction-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #6b7280;
}

.bank-details {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.view-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-btn:hover {
  background: #2563eb;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
}

.role-level {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-level small {
  color: #6b7280;
  font-size: 12px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .ca-header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .ca-nav {
    flex-wrap: wrap;
    padding: 0 10px;
  }

  .nav-btn {
    padding: 12px 16px;
    font-size: 14px;
  }

  .ca-main {
    padding: 20px 10px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filters-section {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .reports-table-container,
  .transactions-table-container,
  .analytics-table-container {
    overflow-x: auto;
  }

  .reports-table,
  .transactions-table,
  .analytics-table {
    min-width: 800px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .ca-login-card {
    padding: 30px 20px;
  }

  .ca-header h1 {
    font-size: 24px;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .stat-value {
    font-size: 24px;
  }
}
`}</style>
    </div>
  );
};

export default CALogin;
