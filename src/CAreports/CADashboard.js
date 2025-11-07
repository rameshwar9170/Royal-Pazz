import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { app } from '../firebase/config';

const StatCard = ({ title, value, icon, loading }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <h3>{title}</h3>
      {loading ? <p className="stat-value">Loading...</p> : <p className="stat-value">{value}</p>}
    </div>
  </div>
);

const CADashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalCommissions: 0,
    totalWithdrawals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase(app);

    // --- CORRECTED Firebase Paths with 'HTAMS' ---
    const ordersRef = ref(db, 'HTAMS/orders');
    const usersRef = ref(db, 'HTAMS/users');
    const withdrawRef = ref(db, 'HTAMS/withdrawRequests');

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      let sales = 0;
      let ordersCount = 0;
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const order = childSnapshot.val();
          if (order.totalAmount && typeof order.totalAmount === 'number') {
            sales += order.totalAmount;
          }
          ordersCount += 1;
        });
      }
      setStats(prev => ({ ...prev, totalSales: sales, totalOrders: ordersCount }));
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
      }
    });

    const unsubscribeWithdrawals = onValue(withdrawRef, (snapshot) => {
      let withdrawals = 0;
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const request = childSnapshot.val();
          if (request.amount && typeof request.amount === 'number') {
            withdrawals += request.amount;
          }
        });
      }
      setStats(prev => ({ ...prev, totalWithdrawals: withdrawals }));
    });
    
    setStats(prev => ({ ...prev, totalCommissions: 12500.50 })); // Example
    setLoading(false);

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
      unsubscribeWithdrawals();
    };
  }, []);

  return (
    <div>
      <div className="stats-grid">
        <StatCard title="Total Sales" value={`₹${stats.totalSales.toLocaleString('en-IN')}`} icon="💰" loading={loading} />
        <StatCard title="Total Orders" value={stats.totalOrders.toLocaleString('en-IN')} icon="📦" loading={loading} />
        {/* <StatCard title="Total Users" value={stats.totalUsers.toLocaleString('en-IN')} icon="👥" loading={loading} /> */}
        <StatCard title="Total Commission" value={`₹${stats.totalCommissions.toLocaleString('en-IN')}`} icon="🏆" loading={loading} />
        <StatCard title="Total Withdrawals" value={`₹${stats.totalWithdrawals.toLocaleString('en-IN')}`} icon="💸" loading={loading} />
      </div>
      <style jsx>{`
        /* Your styles here */
      `}</style>
    </div>
  );
};

export default CADashboard;
