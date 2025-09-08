import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../firebase/config';
import { FiSearch, FiEye, FiCheck, FiX, FiClock, FiTruck, FiPackage, FiPhone, FiCalendar, FiDollarSign, FiMapPin } from 'react-icons/fi';

// const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

const CompanyOrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingId, setTrackingId] = useState('');
  const ordersPerPage = 12;

  const pendingCount = orders.filter(order => order.status?.toLowerCase() === 'pending').length;
  const completedCount = orders.filter(order => order.status?.toLowerCase() === 'completed').length;
  const confirmedCount = orders.filter(order => order.status?.toLowerCase() === 'confirmed').length;
  const inProgressCount = orders.filter(order => order.status?.toLowerCase() === 'in-progress').length;
  const cancelledCount = orders.filter(order => order.status?.toLowerCase() === 'cancelled').length;

  // Helper function to format address objects
  const formatAddress = (address) => {
    if (typeof address === 'string') return address;
    if (typeof address === 'object' && address) {
      const { street, landmark, city, state, postalCode } = address;
      const parts = [street, landmark, city, state, postalCode].filter(Boolean);
      return parts.join(', ');
    }
    return '-';
  };

  const showNotification = (message) => {
    const div = document.createElement('div');
    div.className = 'order-notify';
    div.innerText = message;
    document.body.appendChild(div);
    setTimeout(() => div.classList.add('show'), 100);
    setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => document.body.removeChild(div), 500);
    }, 4000);
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('companyOrders');
    if (cached) {
      const parsed = JSON.parse(cached);
      setOrders(parsed);
    }

    const ordersRef = ref(db, 'HTAMS/orders/');
    let firstLoad = true;

    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const newOrders = Object.entries(data).map(([id, order]) => ({ id, ...order }));

        // New Order Notification
        if (!firstLoad && newOrders.length > orders.length) {
          const newOrder = newOrders[0];
          showNotification(`🛎️ New order placed by ${newOrder.customerName}`);
        }

        // Sort orders
        const sortedOrders = newOrders.sort((a, b) => {
          if (a.status?.toLowerCase() === 'completed' && b.status?.toLowerCase() !== 'completed') return 1;
          if (a.status?.toLowerCase() !== 'completed' && b.status?.toLowerCase() === 'completed') return -1;
          return 0;
        });

        const finalOrders = sortedOrders.reverse();
        setOrders(finalOrders);
        sessionStorage.setItem('companyOrders', JSON.stringify(finalOrders));
      }
      firstLoad = false;
    });

  }, []);

  const calculateAmount = (order) => {
    return order.totalAmount || order.amount || order.price ||
      (order.quantity && order.unitPrice && order.quantity * order.unitPrice) || 0;
  };

  const handleStatusUpdate = async (orderId, newStatus, extraData = {}) => {
    const updates = {
      status: newStatus.toLowerCase(),
      ...extraData,
      [`${newStatus}At`]: new Date().toISOString()
    };

    if (newStatus === 'in-progress') {
      // const otp = generateOTP();
      const formLink = `https://htams-app.web.app/complete-task/${orderId}`;
      // updates.completionOTP = otp;
      updates.formLink = formLink;

      const order = orders.find(o => o.id === orderId);
      console.log(`
          📩 Order In Progress
          Customer: ${order.customerName}
          Phone: ${order.customerPhone}
          Address: ${formatAddress(order.customerAddress)}
          Product: ${order.productName}
          Expected: ${order.expectedDate}
          🔗 Complete task: ${formLink}
          
                `);
    }

    await update(ref(db, `HTAMS/orders/${orderId}`), updates);
    sessionStorage.removeItem('companyOrders');
    setSelectedOrder(null);
    setTrackingId('');
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'pending'
      ? order.status?.toLowerCase() === 'pending'
      : filterStatus === 'completed'
      ? order.status?.toLowerCase() === 'completed'
      : filterStatus === 'confirmed'
      ? order.status?.toLowerCase() === 'confirmed'
      : filterStatus === 'in-progress'
      ? order.status?.toLowerCase() === 'in-progress'
      : filterStatus === 'cancelled'
      ? order.status?.toLowerCase() === 'cancelled'
      : true;
    const matchesSearch = searchQuery
      ? order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  // Calculate pagination details
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Handle page navigation
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#f59e0b';
      case 'confirmed':
        return '#3b82f6';
      case 'in-progress':
        return '#8b5cf6';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <FiClock />;
      case 'confirmed':
        return <FiCheck />;
      case 'in-progress':
        return <FiTruck />;
      case 'completed':
        return <FiPackage />;
      case 'cancelled':
        return <FiX />;
      default:
        return <FiClock />;
    }
  };

  return (
    <div className="orders-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <FiPackage className="title-icon" />
            Order Management
          </h1>
          <p className="page-subtitle">Track and manage all customer orders</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon">
            <FiClock />
          </div>
          <div className="stat-info">
            <div className="stat-number">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card confirmed">
          <div className="stat-icon">
            <FiCheck />
          </div>
          <div className="stat-info">
            <div className="stat-number">{confirmedCount}</div>
            <div className="stat-label">Confirmed</div>
          </div>
        </div>
        <div className="stat-card progress">
          <div className="stat-icon">
            <FiTruck />
          </div>
          <div className="stat-info">
            <div className="stat-number">{inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">
            <FiPackage />
          </div>
          <div className="stat-info">
            <div className="stat-number">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-icon">
            <FiX />
          </div>
          <div className="stat-info">
            <div className="stat-number">{cancelledCount}</div>
            <div className="stat-label">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="controls-section">
        <div className="filter-buttons">
          <button
            onClick={() => setFilterStatus('all')}
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          >
            All Orders
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
          >
            <FiClock />
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('confirmed')}
            className={`filter-btn ${filterStatus === 'confirmed' ? 'active' : ''}`}
          >
            <FiCheck />
            Confirmed
          </button>
          <button
            onClick={() => setFilterStatus('in-progress')}
            className={`filter-btn ${filterStatus === 'in-progress' ? 'active' : ''}`}
          >
            <FiTruck />
            In Progress
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
          >
            <FiPackage />
            Completed
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`filter-btn ${filterStatus === 'cancelled' ? 'active' : ''}`}
          >
            <FiX />
            Cancelled
          </button>
        </div>

        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table">
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Expected Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order, index) => (
                <tr
                  key={order.id}
                  className={`order-row ${order.status?.toLowerCase()}`}
                >
                  <td className="order-number">{startIndex + index + 1}</td>
                  <td className="customer-info">
                    <div className="customer-name">{order.customerName}</div>
                    <div className="customer-phone">
                      <FiPhone />
                      {order.customerPhone || '-'}
                    </div>
                  </td>
                  <td className="product-name">{order.productName}</td>
                  <td className="amount">₹{calculateAmount(order).toLocaleString()}</td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusIcon(order.status)}
                      {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
                    </span>
                  </td>
                  <td className="expected-date">{order.expectedDate || '-'}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <FiEye />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards">
        {paginatedOrders.map((order, index) => (
          <div
            key={order.id}
            className={`order-card ${order.status?.toLowerCase()}`}
            onClick={() => setSelectedOrder(order)}
          >
            <div className="card-header">
              <div className="order-number">#{startIndex + index + 1}</div>
              <span 
                className="status-badge"
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {getStatusIcon(order.status)}
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Pending'}
              </span>
            </div>
            
            <div className="card-content">
              <div className="customer-section">
                <div className="customer-name">{order.customerName}</div>
                <div className="customer-phone">
                  <FiPhone />
                  {order.customerPhone || '-'}
                </div>
              </div>
              
              <div className="product-section">
                <div className="product-name">{order.productName}</div>
                <div className="amount">₹{calculateAmount(order).toLocaleString()}</div>
              </div>
              
              {order.expectedDate && (
                <div className="date-section">
                  <FiCalendar />
                  Expected: {order.expectedDate}
                </div>
              )}
            </div>
            
            <div className="card-footer">
              <button className="view-details-btn">
                <FiEye />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="empty-state">
          <FiPackage className="empty-icon" />
          <h3>No orders found</h3>
          <p>No orders match your current filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({filteredOrders.length} orders)
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Order Details</h3>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="modal-close"
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="order-status-section">
                <span 
                  className="large-status-badge"
                  style={{ backgroundColor: getStatusColor(selectedOrder.status) }}
                >
                  {getStatusIcon(selectedOrder.status)}
                  {selectedOrder.status?.charAt(0).toUpperCase() + selectedOrder.status?.slice(1) || 'Pending'}
                </span>
              </div>

              <div className="details-grid">
                <div className="detail-section">
                  <h4>Customer Information</h4>
                  <div className="detail-item">
                    {/* <FiUser className="detail-icon" /> */}
                    <div>
                      <label>Customer Name</label>
                      <span>{selectedOrder.customerName}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <FiPhone className="detail-icon" />
                    <div>
                      <label>Phone</label>
                      <span>{selectedOrder.customerPhone || 'Not provided'}</span>
                    </div>
                  </div>
                  {selectedOrder.customerAddress && (
                    <div className="detail-item">
                      <FiMapPin className="detail-icon" />
                      <div>
                        <label>Address</label>
                        <span>{formatAddress(selectedOrder.customerAddress)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h4>Order Information</h4>
                  <div className="detail-item">
                    <FiPackage className="detail-icon" />
                    <div>
                      <label>Product</label>
                      <span>{selectedOrder.productName}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div>
                      <label>Quantity</label>
                      <span>{selectedOrder.quantity}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <FiDollarSign className="detail-icon" />
                    <div>
                      <label>Amount</label>
                      <span>₹{calculateAmount(selectedOrder).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div>
                      <label>Payment Method</label>
                      <span>{selectedOrder.paymentMethod || 'Not specified'}</span>
                    </div>
                  </div>
                  {selectedOrder.placedBy && (
                    <div className="detail-item">
                      <div>
                        <label>Placed By</label>
                        <span>{selectedOrder.placedBy}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="action-controls">
                {selectedOrder.status?.toLowerCase() === 'pending' && (
                  <>
                    <div className="input-group">
                      <label>Tracking ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="Enter tracking ID"
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        className="control-input"
                      />
                    </div>

                    <div className="input-group">
                      <label>Expected Date *</label>
                      <input
                        type="date"
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const formatted = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
                          setSelectedOrder({ ...selectedOrder, expectedDate: formatted });
                        }}
                        className="control-input"
                      />
                    </div>

                    <div className="action-buttons">
                      <button
                        className="action-btn confirm-btn"
                        disabled={!selectedOrder.expectedDate}
                        onClick={() => {
                          handleStatusUpdate(selectedOrder.id, 'confirmed', {
                            expectedDate: selectedOrder.expectedDate,
                            trackingId: trackingId || undefined
                          });
                        }}
                      >
                        <FiCheck />
                        Confirm Order
                      </button>

                      <button
                        className="action-btn cancel-btn"
                        onClick={() => {
                          const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
                          if (confirmCancel) {
                            handleStatusUpdate(selectedOrder.id, 'cancelled');
                          }
                        }}
                      >
                        <FiX />
                        Cancel Order
                      </button>
                    </div>
                  </>
                )}

                {selectedOrder.status?.toLowerCase() === 'confirmed' && (
                  <button
                    className="action-btn progress-btn"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'in-progress')}
                  >
                    <FiTruck />
                    Mark In Progress
                  </button>
                )}

                {selectedOrder.status?.toLowerCase() === 'in-progress' && (
                  <button
                    className="action-btn complete-btn"
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'completed')}
                  >
                    <FiPackage />
                    Mark as Completed
                  </button>
                )}

                {selectedOrder.status?.toLowerCase() === 'completed' && (
                  <div className="completed-message">
                    <FiPackage className="success-icon" />
                    Order Completed Successfully
                  </div>
                )}

                {selectedOrder.status?.toLowerCase() === 'cancelled' && (
                  <div className="cancelled-message">
                    <FiX className="cancelled-icon" />
                    Order Cancelled
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .orders-container {
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          padding: 16px;
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Header */
        .page-header {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title-icon {
          color: #6366f1;
          font-size: 1.75rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 1rem;
          margin: 0;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
        }

        .stat-card.pending .stat-icon { background: #f59e0b; }
        .stat-card.confirmed .stat-icon { background: #3b82f6; }
        .stat-card.progress .stat-icon { background: #8b5cf6; }
        .stat-card.completed .stat-icon { background: #10b981; }
        .stat-card.cancelled .stat-icon { background: #ef4444; }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        /* Controls Section */
        .controls-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .filter-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .filter-btn {
          background: #f1f5f9;
          color: #64748b;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .filter-btn:hover,
        .filter-btn.active {
          background: #6366f1;
          color: white;
          transform: translateY(-1px);
        }

        .search-container {
          position: relative;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 1.1rem;
          z-index: 2;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          outline: none;
          background: white;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        /* Desktop Table */
        .desktop-table {
          display: none;
        }

        .table-wrapper {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .orders-table th,
        .orders-table td {
          padding: 16px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .orders-table th {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .order-row {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .order-row:hover {
          background-color: #f8fafc;
        }

        .order-row.pending {
          background: rgba(245, 158, 11, 0.05);
        }

        .order-row.cancelled {
          background: rgba(239, 68, 68, 0.05);
        }

        .customer-info .customer-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .customer-info .customer-phone {
          font-size: 0.875rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .view-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .view-btn:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        /* Mobile Cards */
        .mobile-cards {
          display: block;
        }

        .order-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .order-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .order-card.pending {
          border-left: 4px solid #f59e0b;
        }

        .order-card.cancelled {
          border-left: 4px solid #ef4444;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .order-number {
          font-family: monospace;
          font-weight: 600;
          color: #6366f1;
          font-size: 0.875rem;
        }

        .card-content {
          margin-bottom: 16px;
        }

        .customer-section,
        .product-section {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .customer-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .customer-phone {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          color: #64748b;
        }

        .product-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .amount {
          font-size: 1.125rem;
          font-weight: 700;
          color: #10b981;
        }

        .date-section {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          color: #64748b;
        }

        .card-footer {
          text-align: center;
        }

        .view-details-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 4rem;
          color: #cbd5e1;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        /* Pagination */
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin: 24px 0;
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .pagination-btn {
          background: #6366f1;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .pagination-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .pagination-info {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
        }

        /* Modal */
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
          padding: 20px;
          box-sizing: border-box;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          width: 100%;
          max-width: 800px;
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
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 1.25rem;
        }

        .modal-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .order-status-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .large-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 25px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .detail-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .detail-section h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-icon {
          color: #6366f1;
          font-size: 1.25rem;
          margin-top: 2px;
        }

        .detail-item div {
          flex: 1;
        }

        .detail-item label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .detail-item span {
          display: block;
          font-size: 1rem;
          color: #1e293b;
          font-weight: 500;
          word-break: break-word;
        }

        .action-controls {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .input-group {
          margin-bottom: 16px;
        }

        .input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .control-input {
          width: 100%;
          padding: 10px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .control-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
        }

        .action-btn:hover {
          transform: translateY(-1px);
        }

        .confirm-btn {
          background: #10b981;
        }

        .confirm-btn:hover {
          background: #059669;
        }

        .cancel-btn {
          background: #ef4444;
        }

        .cancel-btn:hover {
          background: #dc2626;
        }

        .progress-btn {
          background: #8b5cf6;
        }

        .progress-btn:hover {
          background: #7c3aed;
        }

        .complete-btn {
          background: #10b981;
        }

        .complete-btn:hover {
          background: #059669;
        }

        .action-btn:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          transform: none;
        }

        .completed-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          color: #16a34a;
          font-weight: 600;
        }

        .success-icon {
          font-size: 1.5rem;
        }

        .cancelled-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-weight: 600;
        }

        .cancelled-icon {
          font-size: 1.5rem;
        }

        /* Notification */
        .order-notify {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          font-size: 1rem;
          border-radius: 12px;
          padding: 16px 20px;
          opacity: 0;
          z-index: 10000;
          pointer-events: none;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          transition: opacity 0.3s ease;
          max-width: 300px;
        }

        .order-notify.show {
          opacity: 1;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .orders-container {
            padding: 12px;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .filter-buttons {
            gap: 8px;
          }

          .filter-btn {
            font-size: 0.75rem;
            padding: 8px 12px;
          }

          .search-container {
            margin-top: 12px;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            flex-direction: column;
          }

          .modal-content {
            max-width: 95vw;
            margin: 10px;
          }
        }

        /* Desktop Responsive */
        @media (min-width: 769px) {
          .desktop-table {
            display: block;
          }

          .mobile-cards {
            display: none;
          }

          .controls-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
          }

          .filter-buttons {
            margin-bottom: 0;
          }

          .search-container {
            margin-top: 0;
          }

          .stats-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .details-grid {
            grid-template-columns: 1fr 1fr;
          }

          .action-buttons {
            max-width: 400px;
          }
        }

        @media (min-width: 1200px) {
          .orders-container {
            padding: 32px;
            max-width: 1400px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyOrderManager;
