import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, query, orderByChild } from 'firebase/database';
import { app } from '../firebase/config';
import { CSVLink } from 'react-csv';

const AllOrdersReport = () => {
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase(app);
    const ordersRef = ref(db, 'HTAMS/orders'); // Corrected path
    const ordersQuery = query(ordersRef, orderByChild('orderDate'));

    const unsubscribe = onValue(ordersQuery, (snapshot) => {
      const data = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          data.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
      }
      setOrdersData(data.reverse());
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const csvHeaders = [
    { label: 'Order ID', key: 'id' },
    { label: 'Customer Name', key: 'customerName' },
    { label: 'Customer Phone', key: 'customerPhone' },
    { label: 'Order Date', key: 'orderDate' },
    { label: 'Product Name', key: 'productName' },
    { label: 'Quantity', key: 'quantity' },
    { label: 'Total Amount', key: 'totalAmount' },
    { label: 'Status', key: 'status' }
  ];

  if (loading) {
    return <div>Loading All Orders...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>All Orders Report</h2>
        <CSVLink 
          data={ordersData} 
          headers={csvHeaders} 
          filename={"all-orders-report.csv"}
          style={{ textDecoration: 'none', color: 'white', backgroundColor: '#10b981', padding: '10px 20px', borderRadius: '8px', fontWeight: '600' }}
        >
          Export to CSV
        </CSVLink>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Phone</th>
              <th>Order Date</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ordersData.length > 0 ? (
              ordersData.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>{order.customerPhone}</td>
                  <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td>{order.productName}</td>
                  <td>{order.quantity}</td>
                  <td>₹{order.totalAmount?.toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`status-badge ${order.status?.toLowerCase()}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
       <style jsx>{`
        .table-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background-color: #f9fafb;
          font-weight: 600;
          text-transform: uppercase;
          color: #374151;
        }
        tbody tr:hover {
          background-color: #f9fafb;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .status-badge.pending { background-color: #fef3c7; color: #92400e; }
        .status-badge.completed { background-color: #d1fae5; color: #065f46; }
        .status-badge.cancelled { background-color: #fee2e2; color: #991b1b; }
      `}</style>
    </div>
  );
};

export default AllOrdersReport;
