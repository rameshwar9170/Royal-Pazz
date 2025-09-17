// components/OrdersReportTab.jsx - Orders report with filtering and export
import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { toast } from 'react-toastify';
import { formatCurrency } from '../utils/formatters';
import './OrdersReportTab.css';

const OrdersReportTab = ({ openModal }) => {
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    customerId: ''
  });

  useEffect(() => {
    fetchOrdersData();
  }, [filters]);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);

      const ordersSnapshot = await get(ref(database, 'HTAMS/orders'));
      const usersSnapshot = await get(ref(database, 'HTAMS/users'));

      const orders = [];

      if (ordersSnapshot.exists()) {
        const ordersDataFromDB = ordersSnapshot.val();
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

        Object.entries(ordersDataFromDB).forEach(([orderId, order]) => {
          const customer = usersData[order.customerId] || {};

          // Apply filters
          if (filters.customerId && order.customerId !== filters.customerId) return;
          if (filters.startDate && new Date(order.orderDate) < new Date(filters.startDate)) return;
          if (filters.endDate && new Date(order.orderDate) > new Date(filters.endDate)) return;
          if (filters.status !== 'all' && order.status?.toLowerCase() !== filters.status.toLowerCase()) return;

          orders.push({
            orderId,
            orderNumber: order.orderNumber || orderId.substring(0, 8),
            customerId: order.customerId,
            customerName: customer.name || order.customerName || 'Unknown Customer',
            customerEmail: customer.email || order.customerEmail || 'No Email',
            customerPhone: customer.phone || order.customerPhone || 'No Phone',
            orderDate: order.orderDate,
            totalAmount: order.totalAmount || 0,
            gstAmount: order.gstAmount || 0,
            netAmount: (order.totalAmount || 0) + (order.gstAmount || 0),
            status: order.status || 'Pending',
            paymentMethod: order.paymentMethod || 'Unknown',
            deliveryAddress: order.deliveryAddress || order.shippingAddress || 'Not provided',
            items: order.items || order.orderItems || [],
            itemsCount: order.items ? Object.keys(order.items).length : (order.orderItems ? Object.keys(order.orderItems).length : 0)
          });
        });
      }

      orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
      setOrdersData(orders);

    } catch (error) {
      console.error('Error fetching orders data:', error);
      toast.error('Failed to load orders data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Order Number', 'Customer Name', 'Customer Email', 'Customer Phone', 
      'Order Date', 'Items Count', 'Total Amount', 'GST Amount', 'Net Amount', 
      'Status', 'Payment Method', 'Delivery Address'
    ];

    const csvData = ordersData.map(order => [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      new Date(order.orderDate).toLocaleDateString('en-IN'),
      order.itemsCount,
      order.totalAmount,
      order.gstAmount,
      order.netAmount,
      order.status,
      order.paymentMethod,
      order.deliveryAddress
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Orders report exported successfully!');
  };

  const totalOrders = ordersData.length;
  const totalOrderValue = ordersData.reduce((sum, order) => sum + order.netAmount, 0);
  const totalGST = ordersData.reduce((sum, order) => sum + order.gstAmount, 0);
  const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;

  return (
    <div className="report-tab">
      <div className="page-header">
        <h2>Orders Report</h2>
        <p>Comprehensive order tracking and analysis</p>
      </div>

      <div className="report-actions">
        <button onClick={exportToCSV} className="export-btn">
          <i>📊</i>
          Export to CSV
        </button>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Customer ID</label>
            <input
              type="text"
              placeholder="Enter Customer ID"
              value={filters.customerId}
              onChange={(e) => setFilters({...filters, customerId: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h4>Total Orders</h4>
            <p>{totalOrders.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h4>Total Value</h4>
            <p>{formatCurrency(totalOrderValue)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">🧾</div>
          <div className="summary-content">
            <h4>Total GST</h4>
            <p>{formatCurrency(totalGST)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h4>Avg Order Value</h4>
            <p>{formatCurrency(avgOrderValue)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner-small"></div>
          <p>Loading orders data...</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order Date</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordersData.map((order, index) => (
                  <tr key={index}>
                    <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className="order-number">#{order.orderNumber}</span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <strong>{order.customerName}</strong>
                        <small>{order.customerEmail}</small>
                        <small>{order.customerPhone}</small>
                      </div>
                    </td>
                    <td>
                      <span className="items-badge">{order.itemsCount} items</span>
                    </td>
                    <td className="amount">{formatCurrency(order.totalAmount)}</td>
                    <td className="gst-amount">{formatCurrency(order.gstAmount)}</td>
                    <td className="total-amount">{formatCurrency(order.netAmount)}</td>
                    <td>
                      <span className={`status-badge ${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <span className="payment-method">{order.paymentMethod}</span>
                    </td>
                    <td>
                      <button 
                        className="action-btn view-btn"
                        onClick={() => openModal(order, 'order')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersReportTab;
