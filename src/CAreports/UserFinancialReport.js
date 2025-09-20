import React, { useState, useEffect } from 'react';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebase/config';
import { CSVLink } from 'react-csv';

// --- This line defines the component, which resolves the 'not defined' error ---
const UserFinancialReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const db = getDatabase(app);
      const usersRef = ref(db, 'HTAMS/users');

      try {
        const usersSnapshot = await get(usersRef);
        const users = usersSnapshot.val() || {};
        const excludedRoles = new Set(['admin', 'subadmin', 'ca']);

        const processedData = Object.keys(users)
          .map(userId => {
            const user = users[userId];
            const userRole = (user.role || '').toLowerCase();

            if (excludedRoles.has(userRole)) {
              return null;
            }

            const analytics = user.analytics || {};
            const transactions = user.transactions || {};

            const totalSales = analytics.totalSales || 0;
            const totalCommissions = analytics.totalCommissionsEarned || 0;
            
            // Only sum withdrawals that are 'approved'
            const totalWithdrawals = Object.values(transactions)
              .filter(tx => {
                const status = (tx.status || '').toLowerCase();
                return tx.type === 'withdrawal' && status === 'approved';
              })
              .reduce((sum, tx) => sum + (tx.amount || 0), 0);

            return {
              id: userId,
              name: user.name || 'N/A',
              email: user.email || 'N/A',
              role: user.role || 'N/A',
              totalSales,
              totalCommissions,
              totalWithdrawals
            };
          })
          .filter(Boolean); // Removes null entries

        setReportData(processedData);
      } catch (error) {
        console.error("Error fetching user report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const csvHeaders = [
    { label: 'User ID', key: 'id' },
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Role', key: 'role' },
    { label: 'Total Sales', key: 'totalSales' },
    { label: 'Total Commission', key: 'totalCommissions' },
    { label: 'Total Withdrawals', key: 'totalWithdrawals' },
  ];

  if (loading) {
    return <div>Generating User Financial Report...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>User Financial Report</h2>
        <CSVLink 
          data={reportData} 
          headers={csvHeaders} 
          filename={"user-financial-report.csv"}
          style={{ textDecoration: 'none', color: 'white', backgroundColor: '#10b981', padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}
        >
          Export to CSV
        </CSVLink>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Total Sales</th>
              <th>Total Commission</th>
              <th>Total Withdrawals</th>
            </tr>
          </thead>
          <tbody>
            {reportData.length > 0 ? (
              reportData.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div>{user.name}</div>
                    <small style={{ color: '#6b7280' }}>{user.email}</small>
                  </td>
                  <td>{user.role}</td>
                  <td>₹{user.totalSales.toLocaleString('en-IN')}</td>
                  <td>₹{user.totalCommissions.toLocaleString('en-IN')}</td>
                  <td>₹{user.totalWithdrawals.toLocaleString('en-IN')}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No user data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .table-container { background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: 600; text-transform: uppercase; color: #374151; }
        tbody tr:hover { background-color: #f9fafb; }
      `}</style>
    </div>
  );
};

// --- This line exports the component, making it available to other files ---
export default UserFinancialReport;
