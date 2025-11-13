import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase/config';
import { FiSearch, FiX, FiInfo, FiCalendar, FiDollarSign, FiUser, FiPackage, FiNavigation, FiCreditCard, FiCheck } from 'react-icons/fi';

const STATUS_CONFIG = {
  pending: { color: 'pending', icon: '⏳', label: 'Pending' },
  confirmed: { color: 'confirmed', icon: '✓', label: 'Confirmed' },
  'Dispatched': { color: 'Dispatched', icon: '🚚', label: 'In Progress' },
  Delivered: { color: 'Delivered', icon: '🏁', label: 'Delivered' },
  paid: { color: 'paid', icon: '💳', label: 'Paid' },
  cancelled: { color: 'cancelled', icon: '✕', label: 'Cancelled' },
};

const formatStatusLabel = (statusKey) => {
  if (!statusKey) return 'Pending';
  const config = STATUS_CONFIG[statusKey];
  if (config?.label) return config.label;
  return statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
};

const CompanyOrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    
    if (typeof address === 'string') return address;
    
    if (typeof address === 'object') {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.landmark) parts.push(address.landmark);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.postalCode) parts.push(address.postalCode);
      
      return parts.length > 0 ? parts.join(', ') : 'N/A';
    }
    
    return 'N/A';
  };

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      const orderRef = ref(db, `HTAMS/orders/${orderId}`);
      update(orderRef, { status: 'cancelled' })
        .then(() => alert('Order cancelled successfully.'))
        .catch((err) => {
          console.error('Cancel error:', err);
          alert('Failed to cancel order.');
        });
    }
  };

  const handleConfirmOrder = (order) => {
    if (!order?.id) return;

    if (!window.confirm('Confirm this order and move it to dispatch?')) return;

    const orderRef = ref(db, `HTAMS/orders/${order.id}`);
    const payload = {
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    };

    if (!order.orderDate) {
      payload.orderDate = new Date().toISOString();
    }

    update(orderRef, payload)
      .then(() => alert('Order confirmed successfully.'))
      .catch((err) => {
        console.error('Confirm error:', err);
        alert('Failed to confirm order.');
      });
  };

  useEffect(() => {
    const htamsUser = JSON.parse(localStorage.getItem('htamsUser') || '{}');
    const currentUid = htamsUser?.uid;
    const ordersRef = ref(db, 'HTAMS/orders');
    
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const orderList = Object.entries(data)
        .map(([id, val]) => ({ 
          id, 
          ...val,
          date: val.orderDate || val.date,
          amount: calculateAmount(val)
        }))
        .filter(order => order.placedBy === currentUid);
      setOrders(orderList);
    });

    return () => unsubscribe();
  }, []);

  const calculateAmount = (order) => {
    if (order.totalAmount) return order.totalAmount;
    if (order.amount) return order.amount;
    if (order.price) return order.price;
    if (order.quantity && order.unitPrice) return order.quantity * order.unitPrice;
    return 0;
  };

  const getProductName = (order) => {
    if (order.productName) return order.productName;
    if (order.items && order.items.length > 0) {
      return order.items[0].productName || 'N/A';
    }
    return 'N/A';
  };

  const getQuantity = (order) => {
    if (order.quantity) return order.quantity;
    if (order.totalItems) return order.totalItems;
    if (order.items && order.items.length > 0) {
      return order.items[0].quantity || 0;
    }
    return 0;
  };

  const handleViewInvoice = (order) => {
    const invoiceUrl = order?.invoice?.downloadURL;
    if (!invoiceUrl) {
      alert('Invoice is not available for this order yet.');
      return;
    }
    window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.customerName?.toLowerCase().includes(term) ||
        getProductName(order)?.toLowerCase().includes(term) ||
        order.id?.toLowerCase().includes(term)
      );
    }
    
    if (activeFilter !== 'all') {
      result = result.filter(order => 
        (order.status || 'confirmed').toLowerCase() === activeFilter
      );
    }
    
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return result;
  }, [orders, searchTerm, activeFilter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const statusStats = useMemo(() => {
    const stats = { all: orders.length };
    orders.forEach(order => {
      const status = (order.status || 'confirmed').toLowerCase();
      stats[status] = (stats[status] || 0) + 1;
    });
    return stats;
  }, [orders]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <style>{mobileOrdersStyles}</style>
      <div className="mobile-orders-page">
        {/* Header Section */}
        <div className="mobile-orders-header">
          <h1 className="mobile-orders-title">
         
            Order Management
          </h1>
          <p className="mobile-orders-subtitle">Track and manage your company's orders</p>

          {/* Stats Overview */}
          <div className="mobile-stats-overview">
            <div className="mobile-stat-card">
              <div className="mobile-stat-number">{orders.length}</div>
              <div className="mobile-stat-label">Total Orders</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-number">{statusStats.confirmed || 0}</div>
              <div className="mobile-stat-label">Confirmed</div>
            </div>
            <div className="mobile-stat-card">
              <div className="mobile-stat-number">{statusStats.pending || 0}</div>
              <div className="mobile-stat-label">Pending</div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mobile-search-section">
          <div className="mobile-search-container">
            <div className="mobile-search-input-wrapper">
              <FiSearch className="mobile-search-icon" />
              <input
                type="text"
                placeholder="Search orders by customer, product or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-search-input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="mobile-clear-btn"
                  style={{
                    position: 'absolute',
                    right: 'var(--mobile-space-md)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--mobile-text-tertiary)',
                    cursor: 'pointer',
                    padding: 'var(--mobile-space-xs)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mobile-filter-section">
          <div className="mobile-filter-controls">
            <div className="mobile-filter-group">
              <label className="mobile-filter-label">Status Filter</label>
              <select 
                className="mobile-filter-select"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="all">All ({statusStats.all || 0})</option>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label} ({statusStats[status] || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="mobile-filter-group">
              <label className="mobile-filter-label">Sort By</label>
              <select 
                className="mobile-filter-select"
                value={sortConfig.key}
                onChange={(e) => {
                  setSortConfig({ key: e.target.value, direction: 'desc' });
                }}
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="customerName">Customer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="mobile-orders-list">
          {filteredOrders.length === 0 ? (
            <div className="mobile-empty-state">
              <span className="mobile-empty-icon">📋</span>
              <p className="mobile-empty-text">No orders found</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveFilter('all');
                }}
                className="mobile-reset-button"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const orderStatus = (order.status || 'pending').toLowerCase();
              const statusConfig = STATUS_CONFIG[orderStatus] || STATUS_CONFIG.pending;
              const statusLabel = formatStatusLabel(orderStatus);
              const canConfirm = ['pending', 'new', 'processing'].includes(orderStatus);
              return (
              <div key={order.id} className="mobile-order-card">
                <div className="mobile-order-header">
                  <span className="mobile-order-id">#{order.id.slice(0, 10)}</span>
                  <span className={`mobile-status-badge ${statusConfig.color}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mobile-order-date">{formatDate(order.date)}</div>

                <div className="mobile-order-details">
                  <div className="mobile-detail-row">
                    <FiUser className="mobile-detail-icon" />
                    <div className="mobile-detail-content">
                      <span className="mobile-detail-label">Customer</span>
                      <span className="mobile-detail-value">{order.customerName || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="mobile-detail-row">
                    <FiPackage className="mobile-detail-icon" />
                    <div className="mobile-detail-content">
                      <span className="mobile-detail-label">Product</span>
                      <span className="mobile-detail-value">{getProductName(order)}</span>
                    </div>
                  </div>

                  <div className="mobile-detail-row">
                    <FiDollarSign className="mobile-detail-icon" />
                    <div className="mobile-detail-content">
                      <span className="mobile-detail-label">Amount</span>
                      <span className="mobile-detail-value mobile-amount">{formatCurrency(order.amount)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedOrder(order)}
                  className="mobile-view-button"
                >
                  <FiInfo />
                  View Details
                </button>
                {/* {canConfirm && (
                  <button
                    onClick={() => handleConfirmOrder(order)}
                    className="mobile-confirm-button"
                  >
                    <FiCheck />
                    Confirm Order
                  </button>
                )} */}
                {order.invoice?.downloadURL && (
                  <button
                    onClick={() => handleViewInvoice(order)}
                    className="mobile-invoice-button"
                  >
                     Invoice
                  </button>
                )}
              </div>
            );
            })
          )}
        </div>

        {/* Modal */}
        {selectedOrder && (
          <div className="mobile-modal-overlay" onClick={() => setSelectedOrder(null)}>
            <div className="mobile-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-modal-header">
                <h2 className="mobile-modal-title">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="mobile-modal-close">
                  <FiX />
                </button>
              </div>

              <div className="mobile-modal-status">
                {(() => {
                  const orderStatus = (selectedOrder.status || 'pending').toLowerCase();
                  const config = STATUS_CONFIG[orderStatus] || STATUS_CONFIG.pending;
                  const label = formatStatusLabel(orderStatus);
                  return (
                    <span className={`mobile-status-badge large ${config.color}`}>
                      {config.icon || '⏱'} {label}
                    </span>
                  );
                })()}
              </div>

              <div className="mobile-modal-body">
                <div className="mobile-modal-detail-group">
                  <div className="mobile-modal-icon-box user">
                    <FiUser />
                  </div>
                  <div className="mobile-modal-detail-info">
                    <h3>Customer</h3>
                    <p>{selectedOrder.customerName || 'N/A'}</p>
                  </div>
                </div>

                <div className="mobile-modal-detail-group">
                  <div className="mobile-modal-icon-box product">
                    <FiPackage />
                  </div>
                  <div className="mobile-modal-detail-info">
                    <h3>Product</h3>
                    <p>{getProductName(selectedOrder)}</p>
                  </div>
                </div>

                <div className="mobile-modal-detail-group">
                  <div className="mobile-modal-icon-box amount">
                    <FiDollarSign />
                  </div>
                  <div className="mobile-modal-detail-info">
                    <h3>Amount</h3>
                    <p className="amount-text">{formatCurrency(selectedOrder.amount)}</p>
                  </div>
                </div>

                <div className="mobile-modal-detail-group">
                  <div className="mobile-modal-icon-box date">
                    <FiCalendar />
                  </div>
                  <div className="mobile-modal-detail-info">
                    <h3>Date</h3>
                    <p>{formatDate(selectedOrder.date)}</p>
                  </div>
                </div>

                {getQuantity(selectedOrder) > 0 && (
                  <div className="mobile-modal-detail-group">
                    <div className="mobile-modal-icon-box quantity">
                      <span>Qty</span>
                    </div>
                    <div className="mobile-modal-detail-info">
                      <h3>Quantity</h3>
                      <p>{getQuantity(selectedOrder)}</p>
                    </div>
                  </div>
                )}

                {selectedOrder.paymentMethod && (
                  <div className="mobile-modal-detail-group">
                    <div className="mobile-modal-icon-box payment">
                      <FiCreditCard />
                    </div>
                    <div className="mobile-modal-detail-info">
                      <h3>Payment Method</h3>
                      <p>{selectedOrder.paymentMethod}</p>
                    </div>
                  </div>
                )}

                {selectedOrder.customerAddress && (
                  <div className="mobile-modal-detail-group">
                    <div className="mobile-modal-icon-box address">
                      <FiNavigation />
                    </div>
                    <div className="mobile-modal-detail-info">
                      <h3>Delivery Address</h3>
                      <p>{formatAddress(selectedOrder.customerAddress)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mobile-modal-footer">
                <div className="mobile-modal-footer-buttons">
                  {selectedOrder.invoice?.downloadURL && (
                    <button
                      onClick={() => handleViewInvoice(selectedOrder)}
                      className="mobile-modal-action-btn secondary"
                    >
                      View Invoice
                    </button>
                  )}
                  <button onClick={() => setSelectedOrder(null)} className="mobile-modal-action-btn">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const mobileOrdersStyles = `
  :root {
    --mobile-bg-primary: #002B5C;
    --mobile-bg-secondary: #f5f5f7;
    --mobile-bg-tertiary: #002B5C;
    --mobile-primary: #6366f1;
    --mobile-text-primary: #ffffff;
    --mobile-text-secondary: #6b7280;
    --mobile-text-tertiary: #9ca3af;
    --mobile-border-light: #e5e7eb;
    --mobile-space-xs: 4px
    --mobile-space-sm: 8px;
     --mobile-space-md: 5px;
    --mobile-space-lg: 24px;
    --mobile-space-xl: 32px;
    --mobile-radius-sm: 8px;
    --mobile-radius-md: 12px;
    --mobile-radius-lg: 16px;
    --mobile-text-sm: 13px;
    --mobile-text-base: 15px;
    --mobile-text-lg: 18px;
    --mobile-text-xl: 24px;
    --mobile-text-2xl: 28px;
  }

  .mobile-orders-page {
    background: #f5f5f7;
    min-height: 100vh;
    padding-bottom: 100px;
   
  }

  .mobile-orders-header {
    margin-bottom: 16px;
    background: #002B5C;
    padding: 5px;
    color: #ffffff;
     border-radius: 10px;
  }

  .mobile-orders-title {
    font-size: 24px;
    font-weight: 700;
    color: #ffffffff;
    margin: 0 0 6px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-title-icon {
    font-size: var(--mobile-text-xl);
  }

  .mobile-orders-subtitle {
    font-size: 14px;
    color: #dbdbdbff;
    margin: 0 0 12px 0;
  }

  .mobile-stats-overview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 12px;
  }

  .mobile-stat-card {
    background: white;
    border-radius: 12px;
    padding: 16px 12px;
    background: #F36F21;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  }

  .mobile-stat-number {
    font-size: 32px;
    font-weight: 700;
    color: #fcfcfcff;
    
    margin-bottom: 4px;
    line-height: 1;
  }

  .mobile-stat-label {
    font-size: 13px;
    color: #ecececff;
    font-weight: 500;
  }

  .mobile-search-section {
    margin-bottom: 14px;
  }

  .mobile-search-container {
    display: flex;
    gap: var(--mobile-space-md);
    align-items: center;
  }

  .mobile-search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    width:100%;
    align-items: center;
  }

  .mobile-search-icon {
    position: absolute;
    left: var(--mobile-space-md);
    color: var(--mobile-text-tertiary);
    font-size: var(--mobile-text-lg);
    z-index: 1;
  }

  .mobile-search-input {
    padding: 12px 16px;
    padding-left: 40px;
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: white;
    font-size: 14px;
    color: #1a1a1a;
    outline: none;
  }

  .mobile-search-input:focus {
    border-color: var(--mobile-primary);
  }

  .mobile-search-button {
    white-space: nowrap;
  }

  .mobile-filter-section {
    margin-bottom: 14px;
  }

  .mobile-filter-controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .mobile-filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .mobile-filter-label {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .mobile-filter-select {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: white;
    font-size: 13px;
    color: #1a1a1a;
    outline: none;
  }

  .mobile-filter-select:focus {
    border-color: var(--mobile-primary);
  }

  /* Orders List */
  .mobile-orders-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-order-card {
    background: white;
    border-radius: 12px;
    padding: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e7eb;
  }

  .mobile-order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .mobile-order-id {
    font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
    color: #6366f1;
    font-weight: 600;
    font-size: 13px;
  }

  .mobile-status-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mobile-status-badge.Delivered {
    background-color: #10b981;
  }

  .mobile-status-badge.pending {
    background-color: #f59e0b;
  }

  .mobile-status-badge.paid {
    background-color: #059669;
  }

  .mobile-status-badge.cancelled {
    background-color: #ef4444;
  }

  .mobile-status-badge.confirmed {
    background-color: #6366f1;
  }

  .mobile-status-badge.large {
    padding: 8px 16px;
    font-size: 11px;
  }

  .mobile-order-date {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 10px;
  }

  .mobile-order-details {
    margin-bottom: 10px;
  }

  .mobile-detail-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .mobile-detail-row:last-child {
    border-bottom: none;
  }

  .mobile-detail-icon {
    color: #6366f1;
    font-size: 16px;
    flex-shrink: 0;
  }

  .mobile-detail-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mobile-detail-label {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }

  .mobile-detail-value {
    font-size: 13px;
    color: #1a1a1a;
    font-weight: 600;
    text-align: right;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-detail-value.mobile-amount {
    color: #10b981;
    font-weight: 700;
  }

  .mobile-view-button {
    width: 100%;
    padding: 11px;
    background-color: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .mobile-invoice-button {
    width: 100%;
    margin-top: 8px;
    padding: 11px;
    background-color: #f3f4f6;
    color: #6366f1;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mobile-confirm-button {
    width: 100%;
    margin-top: 8px;
    padding: 11px;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .mobile-confirm-button:active {
    transform: scale(0.98);
    background-color: #0f9c72;
  }

  .mobile-invoice-button:active {
    transform: scale(0.98);
    background-color: #e5e7eb;
  }

  .mobile-view-button:active {
    transform: scale(0.98);
    background-color: #4f46e5;
  }

  /* Empty State */
  .mobile-empty-state {
    text-align: center;
    padding: 32px 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }

  .mobile-empty-icon {
    font-size: 48px;
    opacity: 0.4;
    display: block;
    margin-bottom: 12px;
  }

  .mobile-empty-text {
    font-size: 15px;
    font-weight: 600;
    color: #6b7280;
    margin: 0 0 16px 0;
  }

  .mobile-reset-button {
    padding: 11px 24px;
    background-color: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  /* Modal */
  .mobile-modal-overlay {
    position: fixed;
    inset: 0;
    bottom: 60px;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }

  .mobile-modal-content {
    background-color: white;
    width: 100%;
    max-height: 85vh;
    height: 85vh;
    display: flex;
    flex-direction: column;
    border-radius: 16px 16px 0 0;
    animation: slideUp 0.3s ease-out;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .mobile-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--mobile-border-light);
    background: white;
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }

  .mobile-modal-title {
    font-size: var(--mobile-text-xl);
    font-weight: 700;
    color: var(--mobile-text-primary);
    margin: 0;
  }

  .mobile-modal-close {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    background-color: #E63946;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .mobile-modal-close:active {
    transform: scale(0.95);
    background-color: #d62839;
  }

  .mobile-modal-status-wrapper {
    padding: 12px 16px;
    text-align: center;
    border-bottom: 1px solid var(--mobile-border-light);
    background: linear-gradient(to bottom, #f8f9fa 0%, white 100%);
    flex-shrink: 0;
  }

  .mobile-modal-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 16px;
    padding-bottom: 16px;
    background: #fafbfc;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .mobile-modal-detail-group {
    display: flex;
    gap: var(--mobile-space-md);
    margin-bottom: var(--mobile-space-lg);
  }

  .mobile-info-icon {
    width: 28px;
    height: 28px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 13px;
  }

  .mobile-modal-icon-box.user {
    background-color: #dbeafe;
    color: #2563eb;
  }

  .mobile-modal-icon-box.product {
    background-color: #e9d5ff;
    color: #9333ea;
  }

  .mobile-modal-icon-box.amount {
    background-color: #d1fae5;
    color: #10b981;
  }

  .mobile-modal-icon-box.date {
    background-color: #fef3c7;
    color: #f59e0b;
  }

  .mobile-modal-icon-box.quantity {
    background-color: #e0e7ff;
    color: #6366f1;
    font-weight: 700;
    font-size: var(--mobile-text-sm);
  }

  .mobile-modal-icon-box.payment {
    background-color: #cffafe;
    color: #06b6d4;
  }

  .mobile-modal-icon-box.address {
    background-color: #fce7f3;
    color: #ec4899;
  }

  .mobile-modal-detail-info {
    flex: 1;
    min-width: 0;
  }

  .mobile-info-text .info-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--mobile-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .mobile-info-text .info-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--mobile-text-primary);
    word-wrap: break-word;
    line-height: 1.3;
  }

  .mobile-modal-detail-info p.amount-text {
    font-size: var(--mobile-text-lg);
    font-weight: 700;
    color: #10b981;
  }

  .mobile-modal-footer {
    padding: 12px 16px;
    padding-bottom: 16px;
    border-top: 1px solid var(--mobile-border-light);
    background: white;
    position: sticky;
    bottom: 0;
    flex-shrink: 0;
    z-index: 10;
  }

  .mobile-modal-footer-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--mobile-space-sm);
  }

  .mobile-modal-action-btn {
    width: 100%;
    padding: var(--mobile-space-md);
    background-color: var(--mobile-primary);
    color: white;
    border: none;
    border-radius: var(--mobile-radius-md);
    font-size: var(--mobile-text-base);
    font-weight: 700;
    cursor: pointer;
  }

  .mobile-modal-action-btn.secondary {
    background-color: #f3f4f6;
    color: var(--mobile-primary);
    border: 1px solid var(--mobile-border-light);
  }

  .mobile-modal-action-btn.secondary:active {
    background-color: #e5e7eb;
  }

  .mobile-modal-action-btn:active {
    background-color: #4f46e5;
    transform: scale(0.98);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  /* Responsive Design - Mobile First */
  @media (max-width: 360px) {
    .mobile-modal-title {
      font-size: 15px;
    }

    .mobile-info-grid {
      grid-template-columns: 1fr;
    }

    .mobile-product-name {
      font-size: 13px;
    }

    .mobile-modal-actions {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 361px) and (max-width: 480px) {
    .mobile-modal-content {
      max-height: 83vh;
      height: 83vh;
    }
  }

  @media (min-width: 481px) and (max-width: 768px) {
    .mobile-modal-content {
      max-height: 80vh;
      height: 80vh;
      border-radius: 20px 20px 0 0;
    }

    .mobile-modal-header {
      padding: 16px 20px;
    }

    .mobile-modal-body {
      padding: 16px 20px;
    }

    .mobile-modal-footer {
      padding: 16px 20px;
    }

    .mobile-info-grid {
      gap: 12px;
    }

    .mobile-product-item {
      padding: 12px 14px;
    }
  }

  @media (min-width: 769px) {
    .mobile-modal-overlay {
      align-items: center;
      padding: 20px;
      bottom: 0;
    }

    .mobile-modal-content {
      max-width: 600px;
      max-height: 85vh;
      height: auto;
      border-radius: 16px;
      margin: 0 auto;
    }

    .mobile-modal-header {
      padding: 18px 24px;
      border-radius: 16px 16px 0 0;
    }

    .mobile-modal-title {
      font-size: 20px;
    }

    .mobile-modal-close {
      width: 36px;
      height: 36px;
      font-size: 18px;
    }

    .mobile-modal-body {
      padding: 20px 24px;
    }

    .mobile-modal-footer {
      padding: 18px 24px;
      border-radius: 0 0 16px 16px;
    }

    .mobile-info-grid {
      gap: 14px;
    }

    .mobile-product-item {
      padding: 14px 16px;
    }

    .mobile-product-name {
      font-size: 15px;
    }

    .mobile-action-btn {
      padding: 14px;
      font-size: 15px;
    }
  }

  @media (min-width: 1024px) {
    .mobile-modal-content {
      max-width: 700px;
    }
  }

  /* Landscape Orientation */
  @media (max-height: 600px) and (orientation: landscape) {
    .mobile-modal-content {
      max-height: 95vh;
      height: 95vh;
    }

    .mobile-modal-header {
      padding: 10px 16px;
    }

    .mobile-modal-body {
      padding: 10px 16px;
    }

    .mobile-modal-footer {
      padding: 10px 16px;
    }

    .mobile-product-item {
      padding: 8px 10px;
    }

    .mobile-info-item {
      padding: 8px;
    }
  }

  @media (max-width: 768px) {
    .mobile-orders-page {
      padding: var(--mobile-space-md);
    }
    
    .mobile-search-container {
      flex-direction: column;
      gap: var(--mobile-space-sm);
    }
    
    .mobile-search-button {
      width: 100%;
    }
    
    .mobile-filter-controls {
      flex-direction: column;
      gap: var(--mobile-space-sm);
    }
    
    .mobile-filter-group {
      min-width: auto;
    }
  }

  @media (min-width: 769px) {
    .mobile-orders-page {
      padding: var(--mobile-space-lg);
    }

    .mobile-modal-overlay {
      align-items: center;
      padding: var(--mobile-space-lg);
    }

    .mobile-modal-content {
      max-width: 600px;
      border-radius: var(--mobile-radius-lg);
    }
  }
`;

export default CompanyOrdersTable;


// Add mobile app styles for Orders page
// const mobileOrdersStyles = `
//   .mobile-orders-page {
  
//     background: var(--mobile-bg-secondary);
//     min-height: 100vh;
//   }

//   .mobile-orders-header {
//     margin-bottom: var(--mobile-space-lg);
//   }

//   .mobile-orders-title {
//     font-size: var(--mobile-text-2xl);
//     font-weight: 700;
//     color: var(--mobile-text-primary);
//     margin: 0 0 var(--mobile-space-sm) 0;
//     display: flex;
//     align-items: center;
//     gap: var(--mobile-space-sm);
//   }

//   .mobile-title-icon {
//     font-size: var(--mobile-text-xl);
//   }

//   .mobile-orders-subtitle {
//     font-size: var(--mobile-text-sm);
//     color: var(--mobile-text-secondary);
//     margin: 0;
//   }

//   .mobile-stats-overview {
//     display: grid;
//     grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
//     gap: var(--mobile-space-md);
//     margin-top: var(--mobile-space-md);
//   }

//   .mobile-stat-card {
//     background: var(--mobile-bg-tertiary);
//     border-radius: var(--mobile-radius-lg);
    
//     text-align: center;
//   }

//   .mobile-stat-number {
//     font-size: var(--mobile-text-2xl);
//     font-weight: 700;
//     color: var(--mobile-primary);
//     margin-bottom: var(--mobile-space-xs);
//   }

//   .mobile-stat-label {
//     font-size: var(--mobile-text-sm);
//     color: var(--mobile-text-secondary);
//     font-weight: 500;
//   }

//   .mobile-search-section {
//     margin-bottom: var(--mobile-space-lg);
//   }

//   .mobile-search-container {
//     display: flex;
//     gap: var(--mobile-space-md);
//     align-items: center;
//   }

//   .mobile-search-input-wrapper {
//     flex: 1;
//     position: relative;
//     display: flex;
//     align-items: center;
//   }

//   .mobile-search-icon {
//     position: absolute;
//     left: var(--mobile-space-md);
//     color: var(--mobile-text-tertiary);
//     font-size: var(--mobile-text-lg);
//     z-index: 1;
//   }

//   .mobile-search-input {
//     padding-left: calc(var(--mobile-space-md) + var(--mobile-space-lg));
//     width: 100%;
//   }

//   .mobile-search-button {
//     white-space: nowrap;
//   }

//   .mobile-filter-section {
//     margin-bottom: var(--mobile-space-lg);
//   }

//   .mobile-filter-controls {
//     display: flex;
//     gap: var(--mobile-space-md);
//     flex-wrap: wrap;
//   }

//   .mobile-filter-group {
//     display: flex;
//     flex-direction: column;
//     gap: var(--mobile-space-xs);
//     min-width: 120px;
//   }

//   .mobile-filter-label {
//     font-size: var(--mobile-text-sm);
//     font-weight: 500;
//     color: var(--mobile-text-primary);
//   }

//   .mobile-filter-select {
//     padding: var(--mobile-space-sm) var(--mobile-space-md);
//     border: 1px solid var(--mobile-border-light);
//     border-radius: var(--mobile-radius-lg);
//     background: var(--mobile-bg-primary);
//     font-size: var(--mobile-text-sm);
//     color: var(--mobile-text-primary);
//   }

//   @media (max-width: 768px) {
//     .mobile-orders-page {
     
//     }
    
//     .mobile-search-container {
//       flex-direction: column;
//       gap: var(--mobile-space-sm);
//     }
    
//     .mobile-search-button {
//       width: 100%;
//     }
    
//     .mobile-filter-controls {
//       flex-direction: column;
//       gap: var(--mobile-space-sm);
//     }
    
//     .mobile-filter-group {
//       min-width: auto;
//     }
//   }

//   @media (min-width: 769px) {
//     .mobile-orders-page {
//       padding: var(--mobile-space-lg);
//     }
//   }
// `;

// Inject mobile app styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = mobileOrdersStyles;
  document.head.appendChild(styleSheet);
}
