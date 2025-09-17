
import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue, update, get } from 'firebase/database'; // Add 'get' import
import { db } from '../firebase/config';
import { FiSearch, FiX, FiInfo, FiCalendar, FiDollarSign, FiUser, FiPackage, FiNavigation, FiCreditCard, FiEdit, FiTrash2 } from 'react-icons/fi';

const STATUS_CONFIG = {
  completed: { color: '#10b981', icon: '✓', label: 'Completed' },
  pending: { color: '#f59e0b', icon: '⏱', label: 'Pending' },
  cancelled: { color: '#ef4444', icon: '✕', label: 'Cancelled' },
  confirmed: { color: '#88b4f2ff', icon: '', label: 'confirmed' },
};

const CompanyOrdersTable = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({}); // Add products cache
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Fetch product data by productId
  const fetchProductData = async (productId) => {
    if (!productId || products[productId]) return;
    
    try {
      // Try different possible paths where products might be stored
      const possiblePaths = [
        `HTAMS/products/${productId}`,
        `products/${productId}`,
        `company/products/${productId}`,
        `HTAMS/company/products/${productId}`
      ];
      
      for (const path of possiblePaths) {
        const productRef = ref(db, path);
        const snapshot = await get(productRef);
        
        if (snapshot.exists()) {
          const productData = snapshot.val();
          setProducts(prev => ({ 
            ...prev, 
            [productId]: {
              name: productData.name || productData.productName || productData.title || 'Unknown Product',
              ...productData
            }
          }));
          return;
        }
      }
      
      // If product not found, set a placeholder
      setProducts(prev => ({ 
        ...prev, 
        [productId]: { name: 'Product Not Found' }
      }));
      
    } catch (error) {
      console.error('Error fetching product:', error);
      setProducts(prev => ({ 
        ...prev, 
        [productId]: { name: 'Error Loading Product' }
      }));
    }
  };

  // Get product name from order
  const getProductName = (order) => {
    // If order has direct productName, use it
    if (order.productName) return order.productName;
    
    // If order has productId, try to get from products cache
    if (order.productId) {
      const product = products[order.productId];
      if (product && product.name) {
        return product.name;
      }
      // If not in cache yet, show loading
      return 'Loading...';
    }
    
    // Fallback
    return 'N/A';
  };

  // Format address helper function
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

  const handleEditOrder = (order) => {
    console.log('Edit order:', order);
    alert(`Edit order functionality for ${order.id}`);
  };

  useEffect(() => {
    const htamsUser = JSON.parse(localStorage.getItem('htamsUser') || '{}');
    const currentUid = htamsUser?.uid;
    const ordersRef = ref(db, 'HTAMS/orders');
    
    const unsubscribe = onValue(ordersRef, async (snapshot) => {
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
      
      // Fetch product data for orders that have productId
      const productIds = orderList
        .filter(order => order.productId && !products[order.productId])
        .map(order => order.productId);
      
      const uniqueProductIds = [...new Set(productIds)];
      
      // Fetch all product data
      for (const productId of uniqueProductIds) {
        await fetchProductData(productId);
      }
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

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.customerName?.toLowerCase().includes(term) ||
        getProductName(order)?.toLowerCase().includes(term) || // Updated to use getProductName
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
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';
        
        // Handle product name sorting
        if (sortConfig.key === 'productName') {
          aValue = getProductName(a);
          bValue = getProductName(b);
        }
        
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
  }, [orders, searchTerm, activeFilter, sortConfig, products]); // Add products to dependencies

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
    <div className="orders-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="main-title">
            <span className="title-icon">📦</span>
            Order Management
          </h1>
          <p className="subtitle">Track and manage your company's orders</p>
        </div>
        
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-number">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search orders by customer, product or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search">
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All ({statusStats.all || 0})
          </button>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <button
              key={status}
              className={`filter-tab ${activeFilter === status ? 'active' : ''}`}
              onClick={() => setActiveFilter(status)}
              style={{ '--status-color': config.color }}
            >
              {config.icon} {config.label} ({statusStats[status] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-container">
        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')}>
                  Order ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('customerName')}>
                  Customer {sortConfig.key === 'customerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('productName')}>
                  Product {sortConfig.key === 'productName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('amount')} className="text-right">
                  Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('date')}>
                  Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr className="no-orders">
                  <td colSpan="7">
                    <div className="empty-state">
                      <span className="empty-icon">📋</span>
                      <p>No orders match your criteria</p>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setActiveFilter('all');
                        }}
                        className="reset-filters"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="order-row">
                    <td className="order-id">#{order.id.slice(0, 8)}</td>
                    <td>{order.customerName || 'N/A'}</td>
                    <td>{getProductName(order)}</td> {/* Updated */}
                    <td className="text-right amount-cell">{formatCurrency(order.amount)}</td>
                    <td>{formatDate(order.date)}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ 
                          backgroundColor: STATUS_CONFIG[order.status?.toLowerCase()]?.color || STATUS_CONFIG.confirmed.color,
                          color: 'white'
                        }}
                      >
                        {STATUS_CONFIG[order.status?.toLowerCase()]?.label || STATUS_CONFIG.confirmed.label}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          title="View Details"
                          style={{
                            padding: '8px 16px',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#0ea5e9',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'background-color 0.3s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0ea5e9')}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards-container">
        {filteredOrders.length === 0 ? (
          <div className="empty-card">
            <span className="empty-icon">📋</span>
            <p>No orders match your criteria</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setActiveFilter('all');
              }}
              className="reset-filters"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="order-card" onClick={() => setSelectedOrder(order)}>
              <div className="card-header">
                <div className="order-info">
                  <span className="order-id-mobile">#{order.id.slice(0, 8)}</span>
                  <span className="order-date">{formatDate(order.date)}</span>
                </div>
                <span 
                  className="status-badge-mobile"
                  style={{ 
                    backgroundColor: STATUS_CONFIG[order.status?.toLowerCase()]?.color || STATUS_CONFIG.confirmed.color,
                    color: 'white'
                  }}
                >
                  {STATUS_CONFIG[order.status?.toLowerCase()]?.icon} {STATUS_CONFIG[order.status?.toLowerCase()]?.label || STATUS_CONFIG.confirmed.label}
                </span>
              </div>
              
              <div className="card-content">
                <div className="customer-section">
                  <span className="section-label">Customer</span>
                  <span className="section-value">{order.customerName || 'N/A'}</span>
                </div>
                
                <div className="product-section">
                  <span className="section-label">Product</span>
                  <span className="section-value">{getProductName(order)}</span> {/* Updated */}
                </div>
                
                <div className="amount-section">
                  <span className="section-label">Amount</span>
                  <span className="section-value amount-highlight">{formatCurrency(order.amount)}</span>
                </div>
              </div>
              
              <div className="card-footer">
                <div className="mobile-action-buttons">
                  <button 
                    className="mobile-action-btn view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                  >
                    <FiInfo />
                    View
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="modal-close"
                aria-label="Close modal"
              >
                <FiX /> 
              </button>
            </div>
            
            <div className="modal-status">
              <span 
                className="order-status-large"
                style={{ 
                  backgroundColor: STATUS_CONFIG[selectedOrder.status?.toLowerCase()]?.color || STATUS_CONFIG.confirmed.color,
                  color: 'white'
                }}
              >
                {STATUS_CONFIG[selectedOrder.status?.toLowerCase()]?.icon} {STATUS_CONFIG[selectedOrder.status?.toLowerCase()]?.label || STATUS_CONFIG.confirmed.label}
              </span>
            </div>
            
            <div className="order-details-grid">
              <div className="detail-item">
                <div className="detail-icon-wrapper">
                  <FiUser className="detail-icon" />
                </div>
                <div className="detail-content">
                  <h3>Customer</h3>
                  <p>{selectedOrder.customerName || 'N/A'}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon-wrapper">
                  <FiPackage className="detail-icon" />
                </div>
                <div className="detail-content">
                  <h3>Product</h3>
                  <p>{getProductName(selectedOrder)}</p> {/* Updated */}
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon-wrapper">
                  <FiDollarSign className="detail-icon" />
                </div>
                <div className="detail-content">
                  <h3>Amount</h3>
                  <p className="amount-highlight">{formatCurrency(selectedOrder.amount)}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <div className="detail-icon-wrapper">
                  <FiCalendar className="detail-icon" />
                </div>
                <div className="detail-content">
                  <h3>Date</h3>
                  <p>{formatDate(selectedOrder.date)}</p>
                </div>
              </div>
              
              {selectedOrder.quantity && (
                <div className="detail-item">
                  <div className="detail-icon-wrapper">
                    <span className="detail-icon">Qty</span>
                  </div>
                  <div className="detail-content">
                    <h3>Quantity</h3>
                    <p>{selectedOrder.quantity}</p>
                  </div>
                </div>
              )}
              
              {selectedOrder.paymentMethod && (
                <div className="detail-item">
                  <div className="detail-icon-wrapper">
                    <FiCreditCard className="detail-icon" />
                  </div>
                  <div className="detail-content">
                    <h3>Payment Method</h3>
                    <p>{selectedOrder.paymentMethod}</p>
                  </div>
                </div>
              )}
              
              {selectedOrder.customerAddress && (
                <div className="detail-item full-width">
                  <div className="detail-icon-wrapper">
                    <FiNavigation className="detail-icon" />
                  </div>
                  <div className="detail-content">
                    <h3>Delivery Address</h3>
                    <p>{formatAddress(selectedOrder.customerAddress)}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="close-button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container */
        .orders-dashboard {
          font-family: 'Inter', sans-serif;
          padding: 16px;
          background: #f8fafc;
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Header Section */
        .dashboard-header {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .header-content {
          flex: 1;
        }

        .main-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        .stats-overview {
          display: flex;
          gap: 12px;
        }

        .stat-card {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          padding: 16px;
          border-radius: 12px;
          color: white;
          text-align: center;
          min-width: 100px;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 700;
          display: block;
        }

        .stat-label {
          font-size: 0.75rem;
          opacity: 0.9;
          color: white; 
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Search Section */
        .search-section {
          margin-bottom: 16px;
        }

        .search-container {
          position: relative;
          max-width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 16px;
          z-index: 2;
        }

        .search-input {
          width: 100%;
          padding: 14px 16px 14px 44px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          background: white;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .clear-search:hover {
          color: #64748b;
          background: #f1f5f9;
        }

        /* Filter Section */
        .filter-section {
          margin-bottom: 20px;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
        }

        .filter-tab {
          padding: 10px 16px;
          border-radius: 20px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .filter-tab:hover {
          background-color: #f1f5f9;
        }

        .filter-tab.active {
          background-color: var(--status-color, #6366f1);
          color: white;
          border-color: transparent;
        }

        /* Desktop Table - Hidden on Mobile */
        .desktop-table-container {
          display: none;
        }

        /* Mobile Cards - Visible by Default */
        .mobile-cards-container {
          display: block;
        }

        .order-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .order-card:hover {
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

        .order-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .order-id-mobile {
          font-family: 'Roboto Mono', monospace;
          color: #6366f1;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .order-date {
          font-size: 0.8rem;
          color: #64748b;
        }

        .status-badge-mobile {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
          white-space: nowrap;
        }

        .card-content {
          margin-bottom: 12px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .customer-section,
        .product-section,
        .amount-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .amount-section {
          border-bottom: none;
        }

        .section-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .section-value {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 600;
          text-align: right;
          word-break: break-word;
        }

        .amount-highlight {
          color: #10b981 !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
        }

        .card-footer {
          text-align: center;
        }

        /* Mobile Action Buttons */
        .mobile-action-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .mobile-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          min-width: 80px;
          justify-content: center;
        }

        .mobile-action-btn.view-btn {
          background: #6366f1;
          color: white;
        }

        .mobile-action-btn.edit-btn {
          background: #f59e0b;
          color: white;
        }

        .mobile-action-btn.cancel-btn {
          background: #ef4444;
          color: white;
        }

        .mobile-action-btn:hover {
          transform: translateY(-1px);
          opacity: 0.9;
        }

        /* Empty States */
        .empty-card {
          background: white;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          color: #64748b;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .empty-icon {
          font-size: 3rem;
          opacity: 0.5;
          display: block;
          margin-bottom: 16px;
        }

        .empty-card p,
        .empty-state p {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .reset-filters {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-filters:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
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
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          width: 100%;
          max-width: 600px;
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

        .modal-header h2 {
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
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .modal-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .modal-status {
          padding: 16px 20px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
        }

        .order-status-large {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
        }

        .order-details-grid {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
        }

        .detail-icon-wrapper {
          width: 40px;
          height: 40px;
          background: #f1f5f9;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .detail-icon {
          color: #6366f1;
          font-size: 1.1rem;
        }

        .detail-content {
          flex: 1;
        }

        .detail-content h3 {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-content p {
          font-size: 1rem;
          color: #1e293b;
          font-weight: 500;
          margin: 0;
          word-break: break-word;
        }

        .modal-actions {
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .close-button {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Tablet Styles (768px and up) */
        @media (min-width: 768px) {
          .orders-dashboard {
            padding: 24px;
            max-width: 1200px;
            margin: 0 auto;
          }
          
          .dashboard-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          
          .card-content {
            grid-template-columns: 1fr 1fr;
          }
          
          .order-details-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .modal-content {
            max-width: 700px;
          }
        }

        /* Desktop Styles (1024px and up) */
        @media (min-width: 1024px) {
          .orders-dashboard {
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
          
          .table-wrapper {
            overflow-x: auto;
          }
          
          .orders-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 800px;
          }
          
          .orders-table th {
            padding: 16px;
            text-align: left;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            user-select: none;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          
          .orders-table th:hover {
            background: linear-gradient(135deg, #334155 0%, #475569 100%);
          }

          .actions-header {
            text-align: center !important;
            cursor: default !important;
          }

          .actions-header:hover {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%) !important;
          }
          
          .text-right {
            text-align: right;
          }
          
          .orders-table td {
            padding: 16px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 0.9375rem;
            vertical-align: middle;
          }
          
          .order-row {
            transition: all 0.2s ease;
          }
          
          .order-row:hover {
            background-color: #f8fafc;
          }
          
          .order-id {
            font-family: 'Roboto Mono', monospace;
            color: #6366f1;
            font-weight: 600;
          }
          
          .amount-cell {
            font-weight: 700;
            color: #10b981;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-align: center;
            min-width: 80px;
          }
          
          .actions-cell {
            text-align: center;
            width: 120px;
            padding: 12px !important;
          }

          /* Desktop Action Buttons */
          .action-buttons {
            display: flex;
            gap: 6px;
            justify-content: center;
            align-items: center;
          }

          .action-btn {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.2s ease;
            outline: none;
          }

          .action-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          .view-btn {
            background: #6366f1;
            color: white;
          }

          .view-btn:hover {
            background: #4f46e5;
          }

          .edit-btn {
            background: #f59e0b;
            color: white;
          }

          .edit-btn:hover {
            background: #d97706;
          }

          .cancel-btn {
            background: #ef4444;
            color: white;
          }

          .cancel-btn:hover {
            background: #dc2626;
          }

          .action-btn svg {
            width: 14px;
            height: 14px;
          }
          
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 60px 20px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CompanyOrdersTable;
