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

  const makeCustomerRow = (customer, phone) => {
    const orderCount = Object.keys(customer.myOrders || {}).length;
    return {
      id: phone,
      name: customer.name || 'N/A',
      email: customer.email || 'N/A',
      phone,
      address: formatAddress(customer.address),
      customerId: customer.customerId || 'N/A',
      birthDate: customer.birthDate ? new Date(customer.birthDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : null,
      purchasedProduct: orderCount > 0 ? 'Multiple Products' : 'No Orders',
      quantity: orderCount,
      totalAmount: 0,
      date: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A',
      paymentMethod: 'N/A',
      status: orderCount > 0 ? 'Has Orders' : 'No Orders',
      placedBy: 'N/A',
    };
  };

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
          const dateA = new Date(a.orderDate || a.date || a.createdAt || 0);
          const dateB = new Date(b.orderDate || b.date || b.createdAt || 0);
          return dateB - dateA; // Latest orders first (descending order)
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

  const downloadReport = async () => {
    // Enhanced CSV with customer and product details
    const csvData = [
      ['Sr No', 'Customer ID', 'Customer Name', 'Email', 'Phone', 'Address', 'Status', 'Date Created', 'Order ID', 'Product Name', 'Quantity', 'Price', 'Total Price', 'Order Date', 'Order Amount']
    ];

    let rowIndex = 1;

    // Fetch detailed order information for each customer
    for (const customer of filteredCustomers) {
      try {
        const ordersRef = ref(db, 'HTAMS/orders');
        const ordersSnapshot = await get(ordersRef);
        
        if (ordersSnapshot.exists()) {
          const allOrders = ordersSnapshot.val();
          const customerOrdersList = Object.entries(allOrders)
            .filter(([orderId, order]) => order.customerPhone === customer.phone)
            .map(([orderId, order]) => ({ id: orderId, ...order }));

          if (customerOrdersList.length > 0) {
            // Add each product from each order as a separate row
            customerOrdersList.forEach(order => {
              if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                  csvData.push([
                    rowIndex++,
                    customer.customerId || 'N/A',
                    customer.name || 'N/A',
                    customer.email || 'N/A',
                    customer.phone || 'N/A',
                    formatAddress(customer.address),
                    customer.status || 'N/A',
                    customer.date || 'N/A',
                    order.id || 'N/A',
                    item.productName || 'N/A',
                    item.quantity || 0,
                    item.price || 0,
                    item.totalPrice || 0,
                    order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : 'N/A',
                    order.totalAmount || 0
                  ]);
                });
              } else {
                // Order without items
                csvData.push([
                  rowIndex++,
                  customer.customerId || 'N/A',
                  customer.name || 'N/A',
                  customer.email || 'N/A',
                  customer.phone || 'N/A',
                  formatAddress(customer.address),
                  customer.status || 'N/A',
                  customer.date || 'N/A',
                  order.id || 'N/A',
                  'No items',
                  0,
                  0,
                  0,
                  order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN') : 'N/A',
                  order.totalAmount || 0
                ]);
              }
            });
          } else {
            // Customer without orders
            csvData.push([
              rowIndex++,
              customer.customerId || 'N/A',
              customer.name || 'N/A',
              customer.email || 'N/A',
              customer.phone || 'N/A',
              formatAddress(customer.address),
              customer.status || 'N/A',
              customer.date || 'N/A',
              'No orders',
              'N/A',
              0,
              0,
              0,
              'N/A',
              0
            ]);
          }
        }
      } catch (error) {
        console.error('Error fetching orders for customer:', customer.phone, error);
      }
    }

    const csvString = csvData.map(row =>
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateRange = dateFilter === 'custom' ? `${customStartDate}_to_${customEndDate}` : dateFilter;
    a.download = `customers_detailed_report_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
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
      case 'paid':
        return '#059669';
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

      {/* Mobile Card View - Compact Design */}
      <div className="mobile-cards mobile-only">
        {currentCustomers.length > 0 ? (
          currentCustomers.map((customer, index) => (
            <div key={customer.id} className="customer-card-compact">
              <div className="card-header-compact">
                <div className="customer-name-primary">{customer.name}</div>
                <button
                  className="view-details-btn"
                  onClick={() => openModal(customer)}
                  aria-label={`View details for ${customer.name}`}
                >
                  View Details
                </button>
              </div>
              
              <div className="card-content-compact">
                <div className="secondary-info">
                  <div className="customer-id-info">
                    <span className="id-label">ID:</span>
                    <span className="customer-id-text">#{customer.customerId}</span>
                  </div>
                  <div className="date-info">
                    <span className="date-icon">📅</span>
                    <span className="date-text">{customer.date}</span>
                  </div>
                </div>
                
                <div className="primary-info">
                  <div className="phone-info">
                    <span className="phone-icon">📞</span>
                    <span className="phone-number">{customer.phone}</span>
                  </div>
                </div>
                
                <div className="product-info">
                  <span className="product-label">Product:</span>
                  <span className="product-name">{customer.purchasedProduct}</span>
                  <span className="order-count">({customer.quantity} orders)</span>
                </div>
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
              {/* Compact Customer ID */}
              <div className="customer-id-compact">
                {selectedCustomer.customerId}
              </div>

              {/* Status Badge */}
              <div className="status-section">
                <label>STATUS:</label>
                <span
                  className="status-badge-large"
                  style={{ backgroundColor: getStatusColor(selectedCustomer.status) }}
                >
                  {selectedCustomer.status}
                </span>
              </div>

              {/* Date Created */}
              <div className="date-section">
                <label>DATE CREATED:</label>
                <span className="date-value">{selectedCustomer.date}</span>
              </div>

              {/* Customer Information - Compact */}
              <div className="customer-info-compact">
                <div className="info-item">
                  <label>Name:</label>
                  <span>{selectedCustomer.name}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{selectedCustomer.email}</span>
                </div>
                <div className="info-item">
                  <label>Phone:</label>
                  <span>{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.birthDate && (
                  <div className="info-item">
                    <label>Birth Date:</label>
                    <span>{selectedCustomer.birthDate}</span>
                  </div>
                )}
                <div className="info-item">
                  <label>Address:</label>
                  <span>{formatAddress(selectedCustomer.address)}</span>
                </div>
                <div className="info-item">
                  <label>Total Orders:</label>
                  <span>{selectedCustomer.quantity}</span>
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
                          <span className="order-number">Order {index + 1}</span>
                          <span className="order-id">ID: {order.id}</span>
                        </div>
                        <div className="order-details">
                          <div className="order-detail">
                            <label>Products:</label>
                            <div className="products-list">
                              {order.items && order.items.length > 0 ? (
                                order.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="product-item">
                                    <span className="product-name">📦 {item.productName}</span>
                                    <span className="product-quantity">Qty: {item.quantity}</span>
                                    {item.totalPrice > 0 && (
                                      <span className="product-price">₹{item.totalPrice.toLocaleString()}</span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span>{order.productName || order.product || 'N/A'}</span>
                              )}
                            </div>
                          </div>
                         
                          <div className="order-details-grid">
                          <div className="order-detail">
                            <label>Total Items:</label>
                            <span>{order.totalItems || order.items?.length || order.quantity || 'N/A'} items</span>
                          </div>

                          <div className="order-detail">
                            <label>Amount:</label>
                            <span>₹{order.totalAmount || order.amount || '0'}</span>
                          </div>

                          <div className="order-detail">
                            <label>Date:</label>
                            <span className="order-date-highlight">
                              {order.orderDate 
                                ? new Date(order.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                : order.date 
                                ? new Date(order.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                : order.createdAt 
                                ? new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                : 'N/A'}
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

                          {order.paymentMethod && (
                            <div className="order-detail">
                              <label>Payment:</label>
                              <span>{order.paymentMethod}</span>
                            </div>
                          )}
                        </div>

                          <div className="order-detail">
                            <label>Placed By:</label>
                            <div className="placed-by-info">
                              <div className="placer-name">
                                <span className="name-icon">👤</span>
                                <span>{order.customerName || 'N/A'}</span>
                              </div>
                              <div className="placer-phone">
                                <span className="phone-icon">📞</span>
                                <span>{order.customerPhone || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
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
          .order-details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          align-items: start;
        }

        /* Header Section */
        .header-section {
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 16px;
          margin-bottom: 16px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 16px;
          background: #002B5C;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .customers-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
          line-height: 1.3;
        }

        .subtitle {
          color: #d2d4d5;
          font-size: 13px;
          margin: 0;
          line-height: 1.4;
        }

        .stats-card {
          background: #F36F21;
          padding: 16px 20px;
          border-radius: 10px;
          color: white;
          text-align: center;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 700;
          display: block;
          line-height: 1;
          color: white;
        }

        .stat-label {
          font-size: 11px;
          opacity: 0.95;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 600;
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
          background: #D65D15;
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
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
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
          display: contents;
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

        /* Mobile Card View - Compact Design */
        .mobile-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .customer-card-compact {
          background: white;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          margin-bottom: 8px;
        }

        .card-header-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }

        .customer-name-primary {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          flex: 1;
        }

        .view-details-btn {
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .card-content-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .secondary-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #f8fafc;
        }

        .customer-id-info {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
        }

        .id-label {
          color: #64748b;
          font-weight: 500;
        }

        .customer-id-text {
          color: #6366f1;
          font-weight: 600;
          font-family: monospace;
        }

        .primary-info {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 12px;
        }

        .phone-info, .date-info {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
        }

        .phone-icon, .date-icon {
          font-size: 0.75rem;
        }

        .phone-number {
          color: #1e293b;
          font-weight: 500;
        }

        .date-text {
          color: #64748b;
          font-weight: 400;
        }

        .product-info {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          flex-wrap: wrap;
        }

        .product-label {
          color: #64748b;
          font-weight: 500;
        }

        .product-name {
          color: #1e293b;
          font-weight: 500;
          flex: 1;
        }

        .order-count {
          color: #6366f1;
          font-weight: 600;
          font-size: 0.75rem;
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
          padding: 0;
          overflow-y: auto;
        }

        /* Compact Mobile-App Style */
        .customer-id-compact {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 16px;
        }

        .status-section, .date-section {
          margin-bottom: 16px;
        }

        .status-section label, .date-section label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 8px;
        }

        .status-badge-large {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          text-transform: uppercase;
          width: 100%;
          text-align: center;
        }

        .date-value {
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 500;
        }

        .customer-info-compact {
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          border: 1px solid #e5e7eb;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
          gap: 12px;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-item label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          min-width: 80px;
          flex-shrink: 0;
        }

        .info-item span {
          font-size: 0.9rem;
          color: #1e293b;
          text-align: right;
          word-break: break-word;
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
            scrollbar-width: none;
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

        .products-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .product-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .product-name {
          font-weight: 600;
          color: #1f2937;
          flex: 1;
          min-width: 150px;
          font-size: 0.9rem;
        }

        .product-quantity {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .product-price {
          color: #059669;
          font-weight: 700;
          font-size: 0.9rem;
          background: #d1fae5;
          padding: 4px 10px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .placed-by-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
        }

        .placer-name, .placer-phone {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
        }

        .placer-name {
          color: #1f2937;
          font-weight: 600;
        }

        .placer-phone {
          color: #6b7280;
          font-weight: 500;
        }

        .name-icon, .phone-icon {
          font-size: 0.75rem;
        }

        .order-date-highlight {
          color: #3b82f6;
          font-weight: 700;
          font-size: 0.875rem;
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
          padding-bottom: 35px;
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
            padding: 20px;
          }
          
          .header-section {
            padding: 24px 28px;
            gap: 24px;
            border-radius: 16px;
            margin-bottom: 20px;
          }

          .title-section {
            gap: 8px;
          }

          .customers-title {
            font-size: 24px;
            margin-bottom: 8px;
          }

          .subtitle {
            font-size: 14px;
          }

          .stats-card {
            min-width: 200px;
            padding: 20px 28px;
            border-radius: 12px;
          }

          .stat-number {
            font-size: 40px;
          }

          .stat-label {
            font-size: 12px;
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
            grid-template-columns: repeat(4, 1fr);
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
            display: contents;
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
            background: var(--mobile-bg-primary);
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
