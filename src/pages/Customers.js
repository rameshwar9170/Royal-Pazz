import React, { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../firebase/config';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // New states for order details
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sorting, filtering, and pagination states
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  // Helper function to format address object to string
  const formatAddress = (address) => {
    if (!address || typeof address === 'string') {
      return address || 'N/A';
    }
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.landmark) parts.push(address.landmark);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const makeCustomerRow = (customer, phone) => ({
    id: phone,
    name: customer.name || 'N/A',
    email: customer.email || 'N/A',
    phone,
    address: formatAddress(customer.address),
    customerId: customer.customerId || 'N/A',
    purchasedProduct: 'Customer Profile',
    quantity: Object.keys(customer.myOrders || {}).length,
    totalAmount: 0,
    date: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A',
    paymentMethod: 'N/A',
    status: Object.keys(customer.myOrders || {}).length > 0 ? 'Has Orders' : 'No Orders',
    placedBy: 'N/A',
  });

  // Function to fetch customer orders
  const fetchCustomerOrders = async (customer) => {
    setLoadingOrders(true);
    setCustomerOrders([]);
    
    try {
      const ordersData = [];
      const customerData = await get(ref(db, `HTAMS/customers/${customer.phone}`));
      
      if (customerData.exists()) {
        const myOrders = customerData.val().myOrders || {};
        const orderIds = Object.keys(myOrders);
        
        const orderPromises = orderIds.map(async (orderId) => {
          try {
            const orderSnapshot = await get(ref(db, `HTAMS/orders/${orderId}`));
            if (orderSnapshot.exists()) {
              return {
                id: orderId,
                ...orderSnapshot.val()
              };
            }
          } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
          }
          return null;
        });
        
        const orders = await Promise.all(orderPromises);
        const validOrders = orders.filter(order => order !== null);
        
        validOrders.sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt || 0);
          const dateB = new Date(b.date || b.createdAt || 0);
          return dateB - dateA;
        });
        
        setCustomerOrders(validOrders);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const htamsUser = JSON.parse(localStorage.getItem('htamsUser') || '{}');
    const currentUid = htamsUser?.uid;

    if (!currentUid) {
      setError('User not logged in.');
      setLoading(false);
      return;
    }

    const userRef = ref(db, `HTAMS/users/${currentUid}`);
    get(userRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const role = snapshot.val().role || '';
          setIsAdmin(role === 'Admin' || role === 'Company'|| role === 'subadmin');
        }
      })
      .catch(() => {
        setError('Failed to fetch user data.');
      });

    const customersRef = ref(db, 'HTAMS/customers');
    const unsubscribe = onValue(
      customersRef,
      async (snapshot) => {
        const customersData = snapshot.val();
        if (!customersData) {
          setError('No customer data found.');
          setLoading(false);
          return;
        }

        const allCustomers = [];
        const promises = [];

        for (const phone in customersData) {
          const customer = customersData[phone];

          if (isAdmin) {
            allCustomers.push(makeCustomerRow(customer, phone));
          } else {
            const myOrders = customer.myOrders || {};
            const orderIds = Object.keys(myOrders);

            if (orderIds.length === 0) {
              continue;
            }

            orderIds.forEach(orderId => {
              promises.push(
                get(ref(db, `HTAMS/orders/${orderId}`)).then(orderSnap => {
                  if (orderSnap.exists() && orderSnap.val().placedBy === currentUid) {
                    allCustomers.push(makeCustomerRow(customer, phone));
                  }
                }).catch(e => {
                  console.error(`Error fetching order ${orderId}:`, e);
                })
              );
            });
          }
        }

        await Promise.all(promises);

        const uniqueCustomers = Object.values(
          allCustomers.reduce((acc, customer) => ({ ...acc, [customer.phone]: customer }), {})
        );

        console.log('Fetched customers:', uniqueCustomers.length, uniqueCustomers);
        setCustomers(uniqueCustomers);
        applyFiltersAndSort(uniqueCustomers);
        setLoading(false);
        
        if (uniqueCustomers.length === 0) {
          setError(isAdmin ? 'No customers found.' : 'No customers found for this user.');
        } else {
          setError('');
        }
      },
      (error) => {
        console.error('Error fetching customers:', error);
        setError('Failed to fetch customer data.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const handleSearch = () => {
    applyFiltersAndSort(customers);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    if (!e.target.value.trim()) {
      applyFiltersAndSort(customers);
    }
  };

  // Pagination calculations
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredCustomers.length / recordsPerPage);

  const applyFiltersAndSort = (data) => {
    let filtered = [...data];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phone.toLowerCase().includes(query) ||
          customer.customerId.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer =>
        customer.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const filterStartDate = new Date();
      const filterEndDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterStartDate.setHours(0, 0, 0, 0);
          filterEndDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter(customer => {
            const orderDate = new Date(customer.date);
            return orderDate >= filterStartDate && orderDate <= filterEndDate;
          });
          break;
        case 'week':
          filterStartDate.setDate(now.getDate() - 7);
          filterStartDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(customer => {
            const orderDate = new Date(customer.date);
            return orderDate >= filterStartDate;
          });
          break;
        case 'month':
          filterStartDate.setMonth(now.getMonth() - 1);
          filterStartDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(customer => {
            const orderDate = new Date(customer.date);  
            return orderDate >= filterStartDate;
          });
          break;
        case 'year':
          filterStartDate.setFullYear(now.getFullYear() - 1);
          filterStartDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(customer => {
            const orderDate = new Date(customer.date);
            return orderDate >= filterStartDate;
          });
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            filtered = filtered.filter(customer => {
              const orderDate = new Date(customer.date);
              return orderDate >= startDate && orderDate <= endDate;
            });
          }
          break;
      }
    }

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'amount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'customerId':
          aValue = a.customerId.toLowerCase();
          bValue = b.customerId.toLowerCase();
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCustomers(filtered);
    setError(filtered.length === 0 ? 'No customers found matching your criteria.' : '');
  };

  useEffect(() => {
    if (customers.length > 0) {
      setCurrentPage(1);
      applyFiltersAndSort(customers);
    }
  }, [sortBy, sortOrder, statusFilter, dateFilter, searchQuery, customStartDate, customEndDate]);

  const downloadReport = () => {
    const csvData = [
      ['Sr No', 'Customer ID', 'Name', 'Email', 'Phone', 'Address', 'Order Count', 'Status', 'Date Created']
    ];

    filteredCustomers.forEach((customer, index) => {
      csvData.push([
        index + 1,
        customer.customerId,
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.quantity,
        customer.status,
        customer.date
      ]);
    });

    const csvString = csvData.map(row =>
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openModal = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerOrders(customer);
  };

  const closeModal = () => {
    setSelectedCustomer(null);
    setCustomerOrders([]);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'has orders':
        return '#10b981';
      case 'no orders':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'processing':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="customers-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customers-container">
      <div className="header-section">
        <div className="title-section">
          <h2 className="customers-title">
            <span className="title-icon">👥</span>
            {isAdmin ? 'All Company Customer' : 'My Customers'}
          </h2>
          <p className="subtitle">
            {isAdmin ? 'Manage and view all customer orders' : 'View your customer orders and details'}
          </p>
        </div>
        <div className="stats-card">
          <div className="stat-item">
            <span className="stat-number">{filteredCustomers.length}</span>
            <span className="stat-label">Total Customers</span>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by Name, Email, Phone, or Customer ID"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              aria-label="Search customers"
            />
          </div>
          <button className="search-button" onClick={handleSearch}>
            <span>Search</span>
          </button>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="amount">Amount</option>
              <option value="customerId">Customer ID</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Order:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="has orders">Has Orders</option>
              {/* <option value="no orders">No Orders</option> */}
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="custom-date-range">
              <div className="filter-group">
                <label>Start Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="filter-group">
                <label>End Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          )}

          <button className="download-button" onClick={downloadReport}>
            <span>📥</span>
            Download Report
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="table-section desktop-only">
        <div className="customers-table-wrapper">
          <table className="customers-table" aria-label="Customer Orders Table">
            <thead>
              <tr>
                <th scope="col" aria-label="Serial Number">SR NO</th>
                <th scope="col">CUSTOMER ID</th>
                <th scope="col">CUSTOMER NAME</th>
                <th scope="col">CONTACT INFO</th>
                <th scope="col">ORDER COUNT</th>
                <th scope="col">STATUS</th>
                <th scope="col">DATE</th>
                <th scope="col">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentCustomers.length > 0 ? (
                currentCustomers.map((customer, index) => (
                  <tr key={customer.id} className="customer-row">
                    <td className="serial-number">{indexOfFirstRecord + index + 1}</td>
                    <td className="customer-id">{customer.customerId}</td>
                    <td className="customer-info">
                      <div className="customer-name">{customer.name}</div>
                      {/* <div className="customer-address">{customer.address}</div> */}
                    </td>
                    <td className="contact-info">
                      <div className="email">📧 {customer.email}</div>
                      <div className="phone">📞 {customer.phone}</div>
                    </td>
                    <td className="amount">{customer.quantity}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(customer.status) }}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="date">{customer.date}</td>
                    <td>
                      <button
                        className="view-button"
                        onClick={() => openModal(customer)}
                        aria-label={`View details for ${customer.name}`}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    <div className="no-data-content">
                      <span className="no-data-icon">📋</span>
                      <p>No customers found</p>
                      <span className="no-data-subtitle">Try adjusting your search criteria</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-cards mobile-only">
        {currentCustomers.length > 0 ? (
          currentCustomers.map((customer, index) => (
            <div key={customer.id} className="customer-card">
              <div className="card-header">
                <div className="customer-name">{customer.name}</div>
                <div className="serial-badge">{indexOfFirstRecord + index + 1}</div>
              </div>
              
              <div className="card-content">
                <div className="detail-row">
                  <span className="detail-label">Customer ID:</span>
                  <span className="detail-value">{customer.customerId}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">📧 {customer.email}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Phone:</span>
                  <span className="detail-value">📞 {customer.phone}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">{customer.address}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Orders:</span>
                  <span className="detail-value">{customer.quantity}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(customer.status) }}
                  >
                    {customer.status}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{customer.date}</span>
                </div>
              </div>
              
              <div className="card-footer">
                <button
                  className="view-button"
                  onClick={() => openModal(customer)}
                  aria-label={`View details for ${customer.name}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data-card">
            <div className="no-data-content">
              <span className="no-data-icon">📋</span>
              <p>No customers found</p>
              <span className="no-data-subtitle">Try adjusting your search criteria</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>

      {/* Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Customer Details</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h4>👤 Customer Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Customer ID:</label>
                    <span>{selectedCustomer.customerId}</span>
                  </div>
                  <div className="detail-item">
                    <label>Name:</label>
                    <span>{selectedCustomer.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email:</label>
                    <span>{selectedCustomer.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="detail-item full-width">
                    <label>Address:</label>
                    <span>{formatAddress(selectedCustomer.address)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total Orders:</label>
                    <span>{selectedCustomer.quantity}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedCustomer.status) }}
                    >
                      {selectedCustomer.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Date Created:</label>
                    <span>{selectedCustomer.date}</span>
                  </div>
                </div>
              </div>

            <div className="detail-section">
  <h4>📦 Customer Orders</h4>
  {loadingOrders ? (
    <div className="loading-orders">
      <div className="spinner"></div>
      <p>Loading orders...</p>
    </div>
  ) : customerOrders.length > 0 ? (
    <div className="orders-list">
      {customerOrders.map((order, index) => (
        <div key={order.id} className="order-item">
          <div className="order-header">
            <span className="order-number">Order #{index + 1}</span>
            <span className="order-id">ID: {order.id}</span>
          </div>

          {/* This part correctly displays each item in the order */}
          {order.items && order.items.map((item, itemIndex) => (
            <div key={itemIndex} className="order-details">
              <div className="order-detail">
                <label>Product:</label>
                {/* FIX: Accessing productName from the item object */}
                <span>{item.productName || 'N/A'}</span>
              </div>
              <div className="order-detail">
                <label>Quantity:</label>
                {/* FIX: Accessing quantity from the item object */}
                <span>{item.quantity || 'N/A'}</span>
              </div>
              <div className="order-detail">
                <label>Amount:</label>
                 {/* FIX: Accessing totalAmount from the main order object */}
                <span>₹{order.totalAmount?.toLocaleString('en-IN') || '0'}</span>
              </div>
              <div className="order-detail">
                <label>Date:</label>
                {/* FIX: Using orderDate and formatting it */}
                <span>
                  {order.orderDate 
                    ? new Date(order.orderDate).toLocaleDateString() 
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="order-detail">
                <label>Status:</label>
                <span 
                  className="order-status"
                  style={{ backgroundColor: getOrderStatusColor(order.status) }}
                >
                  {order.status || 'N/A'}
                </span>
              </div>
            </div>
          ))}

          {(!order.items || order.items.length === 0) && (
            <div className="order-details">
                <p>This order has no items.</p>
            </div>
          )}

        </div>
      ))}
    </div>
  ) : (
    <div className="no-orders">
      <span className="no-orders-icon">📦</span>
      <p>No orders found for this customer</p>
    </div>
  )}
</div>
            </div>

            <div className="modal-footer">
              <button className="close-button" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .customers-container {
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          color: #1e293b;
          padding: 16px;
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Header Section */
        .header-section {
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .customers-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 4px 0 0 0;
        }

        .stats-card {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          padding: 16px;
          border-radius: 12px;
          color: white;
          text-align: center;
          width: fit-content;
        }

        .stat-number {
          font-size: 2rem;
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
          margin-bottom: 20px;
        }

        .search-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-input-wrapper {
          position: relative;
          width: 100%;
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

        .search-button {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .search-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* Filter Controls */
        .filter-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .filter-group select,
        .filter-group input[type="date"] {
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 16px;
          background: white;
          box-sizing: border-box;
        }

        .filter-group select:focus,
        .filter-group input[type="date"]:focus {
          border-color: #6366f1;
          outline: none;
        }

        .custom-date-range {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .download-button {
          background: #10b981;
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
          transition: all 0.2s ease;
        }

        .download-button:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        /* Error Messages */
        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Loading States */
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Show/Hide for Desktop/Mobile */
        .desktop-only {
          display: none;
        }

        .mobile-only {
          display: block;
        }

        /* Mobile Card View */
        .mobile-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .customer-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .customer-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .serial-badge {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .card-content {
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid #f8fafc;
          gap: 12px;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
          flex-shrink: 0;
          min-width: 80px;
        }

        .detail-value {
          font-size: 0.875rem;
          color: #1e293b;
          font-weight: 500;
          text-align: right;
          word-break: break-word;
          flex: 1;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-footer {
          text-align: center;
        }

        .view-button {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s ease;
        }

        .view-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        /* No Data States */
        .no-data-card {
          background: white;
          border-radius: 12px;
          padding: 40px 20px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .no-data-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .no-data-icon {
          font-size: 3rem;
          opacity: 0.5;
        }

        .no-data-subtitle {
          color: #64748b;
          font-size: 0.875rem;
        }

        /* Pagination */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 24px 0;
          padding: 0 16px;
        }

        .pagination button {
          background: #6366f1;
          color: white;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
          min-width: 80px;
          transition: all 0.2s ease;
        }

        .pagination button:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .pagination button:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .pagination span {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
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
          padding: 16px;
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
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-shrink: 0;
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
        }

        .modal-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .detail-section {
          margin-bottom: 24px;
        }

        .detail-section h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item.full-width {
          grid-column: 1 / -1;
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

        /* Orders in Modal */
        .orders-list {
          max-height: 400px;
          overflow-y: auto;
          margin-top: 12px;
        }

        .order-item {
          padding: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        .order-number {
          font-weight: 600;
          color: #374151;
        }

        .order-id {
          font-family: monospace;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .order-details {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .order-detail {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .order-detail label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }

        .order-detail span {
          font-size: 0.875rem;
          color: #374151;
        }

        .order-status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
          text-transform: capitalize;
          display: inline-block;
          margin-top: 2px;
        }

        .loading-orders,
        .no-orders {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          text-align: center;
          color: #6b7280;
        }

        .no-orders-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          flex-shrink: 0;
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
          .customers-container {
            padding: 24px;
          }
          
          .header-section {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
          
          .search-container {
            flex-direction: row;
            max-width: 600px;
          }
          
          .search-input-wrapper {
            flex: 1;
          }
          
          .search-button {
            width: auto;
          }
          
          .filter-controls {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 16px;
          }
          
          .download-button {
            width: auto;
            margin-left: auto;
          }
          
          .detail-grid {
            grid-template-columns: 1fr 1fr;
          }
          
          .custom-date-range {
            flex-direction: row;
            gap: 16px;
          }

          .order-details {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* Desktop Styles (1024px and up) */
        @media (min-width: 1024px) {
          .customers-container {
            padding: 32px;
            max-width: 1400px;
            margin: 0 auto;
          }
          
          /* Show table, hide cards */
          .desktop-only {
            display: block;
          }
          
          .mobile-only {
            display: none;
          }
          
          .table-section {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
          }
          
          .customers-table-wrapper {
            overflow-x: auto;
          }
          
          .customers-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 900px;
          }
          
          .customers-table th,
          .customers-table td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .customers-table th {
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
          
          .customer-row:hover {
            background: #f8fafc;
          }
          
          .serial-number {
            background: transparent;
            color: #6366f1;
            border-radius: 0;
            width: auto;
            height: auto;
            font-weight: 600;
            text-align: center;
            position: static;
            display: table-cell;
          }

          .customer-id {
            font-family: monospace;
            color: #6366f1;
            font-weight: 600;
          }
          
          .customer-info .customer-name {
            font-size: 1rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 4px;
          }

          .customer-info .customer-address {
            font-size: 0.875rem;
            color: #64748b;
            line-height: 1.4;
          }

          .contact-info .email,
          .contact-info .phone {
            font-size: 0.875rem;
            color: #475569;
            margin-bottom: 2px;
          }

          .amount {
            font-weight: 600;
            color: #1e293b;
          }

          .date {
            color: #64748b;
            font-size: 0.875rem;
          }
          
          .view-button {
            width: auto;
            margin-top: 0;
            padding: 8px 16px;
            font-size: 0.875rem;
          }

          .no-data {
            text-align: center;
            padding: 60px 20px;
          }

          .modal-content {
            max-width: 800px;
          }
        }
      `}</style>
    </div>
  );
};

export default Customers;
