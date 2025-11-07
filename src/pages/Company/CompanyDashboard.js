import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../firebase/config';
// import Sidebar from '../../components/Sidebar';
import { FaBars, FaSignOutAlt, FaTimes, FaSearch, FaDownload, FaEye } from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import '../../styles/CompanyDashboard.css';


const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailData, setDetailData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [stats, setStats] = useState({
    customers: 0,
    orders: 0,
    employees: 0,
    trainers: 0,
    products: 0,
    services: 0,
    trainings: 0,
    joinedTrainings: 0,
    pending: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    paymentCash: 0,
    paymentOnline: 0,
    paymentCard: 0,
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('htamsUser');
    localStorage.removeItem('companyStats');
    navigate('/login');
  };

  const safeRender = (value, fallback = '-') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

   const handleSearch = (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredData(detailData);
      return;
    }

    const filtered = detailData.filter(item => {
      const searchText = term.toLowerCase();
      return Object.values(item).some(value =>
        String(value).toLowerCase().includes(searchText)
      );
    });
    setFilteredData(filtered);
  };
 const downloadReport = () => {
    const headers = getHeadersForType(selectedDetail);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item =>
        headers.map(header => {
          const value = getValueForHeader(item, header);
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDetail}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

   const getHeadersForType = (type) => {
    switch (type?.toLowerCase()) {
      case 'customers':
        return ['Name', 'Phone', 'Email', 'Total Orders'];
      case 'orders':
        return ['Order ID', 'Customer', 'Status', 'Amount', 'Date'];
      case 'employees':
        return ['Name', 'Email', 'Phone', 'Position', 'Department'];
      case 'trainers':
        return ['Name', 'Email', 'Phone', 'Specialization', 'Experience'];
      case 'products':
        return ['Product Name', 'Price', 'Category', 'Stock', 'Description'];
      case 'services':
        return ['Service Name', 'Price', 'Duration', 'Category', 'Description'];
      case 'trainings':
        return ['Location', 'Date', 'Trainer', 'Candidates', 'Joined', 'Status'];
      case 'joined trainings':
        return ['Name', 'Email', 'Phone', 'Training Location', 'Training Date', 'Referred By', 'Registered'];
      default:
        return [];
    }
  };


    // Get value for specific header
  const getValueForHeader = (item, header) => {
    switch (header) {
      case 'Name':
        return item.name || item.customerName || item.employeeName || item.trainerName || item.productName || item.serviceName || '-';
      case 'Phone':
        return item.phoneDisplay || item.phone || item.phoneNumber || item.mobile || item.contactNumber || '-';
      case 'Email':
        return item.email || '-';
      case 'Total Orders':
        return item.totalOrders || '0';
      case 'Order ID':
        return item.id || '-';
      case 'Customer':
        return item.customerName || '-';
      case 'Status':
        return item.status || '-';
      case 'Amount':
        return item.amount || '0';
      case 'Date':
        return item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (item.date || '-');
      case 'Position':
        return item.position || item.role || '-';
      case 'Department':
        return item.department || '-';
      case 'Specialization':
        return item.specialization || item.expertise || '-';
      case 'Experience':
        return item.experience || '-';
      case 'Product Name':
        return item.name || item.productName || '-';
      case 'Service Name':
        return item.name || item.serviceName || '-';
      case 'Price':
        return item.price || '0';
      case 'Category':
        return item.category || '-';
      case 'Stock':
        return typeof item.stock === 'object' ? JSON.stringify(item.stock) : (item.stock || '0');
      case 'Description':
        return item.description || '-';
      case 'Duration':
        return item.duration || '-';
      case 'Location':
        return item.location || '-';
      case 'Trainer':
        return item.trainerName || '-';
      case 'Candidates':
        return item.candidates || '0';
      // case 'Joined':
      //   return item.participants ? Object.keys(item.participants).length : '0';
      case 'Training Location':
        return item.trainingLocation || '-';
      case 'Training Date':
        return item.trainingDate || '-';
      case 'Referred By':
        return item.referrerDisplay || item.referrerName || 'Direct';
      case 'Registered':
        return item.registrationDisplay || (item.registeredAt ? new Date(item.registeredAt).toLocaleDateString() : '-');
      default:
        return '-';
    }
  };

  // Enhanced DataTable component with row click functionality
  const DataTable = ({ headers, data, renderRow, onRowClick }) => {
    return (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="table-row">
                {renderRow(item, index)}
                <td className="action-cell">
                  <button
                    onClick={() => onRowClick(item)}
                    className="view-btn"
                  >
                    <FaEye />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  // Handle row click to show detailed information
  const handleRowClick = (rowData) => {
    setSelectedRow(rowData);
  };

  // Close row detail modal
  const closeRowDetail = () => {
    setSelectedRow(null);
  };
 // Handle card click to show details
  const handleCardClick = async (cardName) => {
    setSelectedDetail(cardName);
    setSearchTerm('');

    let path = '';
    switch (cardName.toLowerCase()) {
      case 'customers':
        path = 'HTAMS/orders';
        break;
      case 'orders':
        path = 'HTAMS/orders';
        break;
      case 'employees':
        path = 'HTAMS/company/Employees';
        break;
      case 'trainers':
        path = 'HTAMS/company/trainers';
        break;
      case 'products':
        path = 'HTAMS/company/products';
        break;
      case 'services':
        path = 'HTAMS/company/services';
        break;
      case 'trainings':
        path = 'HTAMS/company/trainings';
        break;
      case 'joined trainings':
        path = 'HTAMS/company/trainings';
        break;
      default:
        return;
    }

    const dataRef = ref(db, path);
    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (cardName.toLowerCase() === 'customers') {
          // Extract unique customers from orders
          const customers = [];
          const uniqueCustomers = new Set();
          Object.values(data).forEach(order => {
            const identifier = order.customerPhone || order.customerEmail;
            if (identifier && !uniqueCustomers.has(identifier)) {
              uniqueCustomers.add(identifier);
              customers.push({
                name: order.customerName || 'Unknown',
                phone: order.customerPhone || '',
                email: order.customerEmail || '',
                totalOrders: Object.values(data).filter(o =>
                  (o.customerPhone === order.customerPhone) ||
                  (o.customerEmail === order.customerEmail)
                ).length
              });
            }
          });
          setDetailData(customers);
          setFilteredData(customers);
        } else if (cardName.toLowerCase() === 'joined trainings') {
          // Enhanced participants extraction with safe null handling
          // const participants = [];
          // Object.entries(data).forEach(([trainingId, training]) => {
          //   if (training.participants) {
          //     Object.entries(training.participants).forEach(([participantId, participant]) => {
          //       // Enhanced participant data processing with null safety
          //       const enhancedParticipant = {
          //         ...participant,
          //         participantId: participantId,
          //         trainingId: trainingId,
          //         trainingLocation: training.location || 'Unknown Location',
          //         trainingDate: training.date || 'Unknown Date',

          //         // Enhanced phone handling with null safety
          //         phoneDisplay: participant.phone ||
          //           participant.phoneNumber ||
          //           participant.mobile ||
          //           participant.contactNumber ||
          //           participant.aadhar ||
          //           'No Phone',

          //         // Enhanced referral handling with guaranteed string return
          //         referrerName: (() => {
          //           if (participant.referredBy && typeof participant.referredBy === 'object') {
          //             if (participant.referredBy.name && typeof participant.referredBy.name === 'string' && participant.referredBy.name.trim()) {
          //               return participant.referredBy.name;
          //             } else if (participant.referredBy.id && typeof participant.referredBy.id === 'string' && participant.referredBy.id.trim()) {
          //               return `Agency: ${participant.referredBy.id.substring(0, 8)}...`;
          //             }
          //           }
          //           return 'Direct Registration';
          //         })(),

          //         // Enhanced registration date handling with null safety
          //         registrationDisplay: (() => {
          //           const dateFields = [
          //             participant.registeredAt,
          //             participant.createdAt,
          //             participant.joinedAt
          //           ];

          //           for (const dateField of dateFields) {
          //             if (dateField) {
          //               try {
          //                 const date = new Date(dateField);
          //                 if (!isNaN(date.getTime())) {
          //                   return date.toLocaleString('en-IN', {
          //                     day: '2-digit',
          //                     month: 'short',
          //                     year: 'numeric',
          //                     hour: '2-digit',
          //                     minute: '2-digit'
          //                   });
          //                 }
          //               } catch (error) {
          //                 continue;
          //               }
          //             }
          //           }
          //           return 'Registration Date Unknown';
          //         })()
          //       };

          //       // participants.push(enhancedParticipant);
          //     });
          //   }
          // });

          // console.log('Enhanced participants data:', participants);
          // setDetailData(participants);
          // setFilteredData(participants); 
        } else {
          // Convert object to array for other types
          const items = Object.entries(data).map(([id, item]) => ({
            id,
            ...item
          }));
          setDetailData(items);
          setFilteredData(items);
        }
      } else {
        setDetailData([]);
        setFilteredData([]);
      }
    }, { onlyOnce: true });
  };
 const closeDetailModal = () => {
    setSelectedDetail(null);
    setDetailData([]);
    setFilteredData([]);
    setSearchTerm('');
  };
  useEffect(() => {
    const cachedStats = localStorage.getItem('companyStats');
    if (cachedStats) {
      setStats(JSON.parse(cachedStats));
    }

    const paths = {
      orders: 'HTAMS/orders',
      employees: 'HTAMS/company/Employees',
      trainers: 'HTAMS/company/trainers',
      products: 'HTAMS/company/products',
      services: 'HTAMS/company/services',
      trainings: 'HTAMS/company/trainings',
    };

    const statsData = {};
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    const uniqueCustomers = new Set();
    let totalJoinedTrainings = 0;

    let completedCalls = 0;
    const totalPaths = Object.keys(paths).length;

    for (const [key, path] of Object.entries(paths)) {
      const dataRef = ref(db, path);
      onValue(
        dataRef,
        (snapshot) => {
          const val = snapshot.val();
          statsData[key] = val ? Object.keys(val).length : 0;

          if (key === 'orders' && val) {
            Object.values(val).forEach((order) => {
              const status = order.status?.toLowerCase();
              if (statusCounts[status] !== undefined) {
                statusCounts[status]++;
              }

              if (order.customerPhone) {
                uniqueCustomers.add(order.customerPhone);
              } else if (order.customerEmail) {
                uniqueCustomers.add(order.customerEmail);
              }
            });
          }

          // if (key === 'trainings' && val) {
          //   Object.values(val).forEach((training) => {
          //     if (training.participants) {
          //       const participantCount = Object.keys(training.participants).length;
          //       totalJoinedTrainings += participantCount;
          //     }
          //   });
          // }

          completedCalls++;
          if (completedCalls === totalPaths) {
            const finalStats = {
              ...statsData,
              customers: uniqueCustomers.size,
              joinedTrainings: totalJoinedTrainings,
              ...statusCounts,
            };
            setStats(finalStats);
            localStorage.setItem('companyStats', JSON.stringify(finalStats));
          }
        },
        { onlyOnce: true }
      );
    }
  }, []);

  
   const cards = [
    { name: 'Customers', value: stats.customers, color: '#2563eb' },
    { name: 'Orders', value: stats.orders, color: '#059669' },
    { name: 'Employees', value: stats.employees, color: '#dc2626' },
    { name: 'Trainers', value: stats.trainers, color: '#7c3aed' },
    { name: 'Products', value: stats.products, color: '#ea580c' },
    { name: 'Services', value: stats.services, color: '#0891b2' },
    { name: 'Trainings', value: stats.trainings, color: '#65a30d' },
    { name: 'Joined Trainings', value: stats.joinedTrainings, color: '#c2410c' },
  ];

  // Chart data
  const chartData = [
    { name: 'Pending', value: stats.pending || 0 },
    { name: 'Confirmed', value: stats.confirmed || 0 },
    { name: 'Completed', value: stats.completed || 0 },
    { name: 'Cancelled', value: stats.cancelled || 0 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 52000 },
    { month: 'Mar', revenue: 48000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 55000 },
    { month: 'Jun', revenue: 67000 },
  ];

  const metricsData = [
    { category: 'Customers', current: stats.customers || 0, target: 50 },
    { category: 'Orders', current: stats.orders || 0, target: 100 },
    { category: 'Products', current: stats.products || 0, target: 25 },
    { category: 'Services', current: stats.services || 0, target: 15 },
  ];


 const renderRowDetailModal = () => {
    if (!selectedRow) return null;

    return (
      <div className="modal-overlay" onClick={closeRowDetail}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              <h3>Complete Details</h3>
              <span className="modal-subtitle">Full record information</span>
            </div>
            <button className="close-btn" onClick={closeRowDetail}>
              <FaTimes />
            </button>
          </div>

          <div className="modal-body">
            <div className="detail-grid">
              {Object.entries(selectedRow).map(([key, value]) => (
                <div key={key} className="detail-item">
                  <div className="detail-label">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </div>
                  <div className="detail-value">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : safeRender(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedDetail) return null;

    const renderTableContent = () => {
      switch (selectedDetail.toLowerCase()) {
        case 'customers':
          return (
            <DataTable
              headers={['Name', 'Phone', 'Email', 'Total Orders']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(customer) => (
                <>
                  <td>{safeRender(customer.name)}</td>
                  <td>{safeRender(customer.phone)}</td>
                  <td>{safeRender(customer.email)}</td>
                  <td>
                    <span className="badge badge-primary">{safeRender(customer.totalOrders, '0')}</span>
                  </td>
                </>
              )}
            />
          );

        case 'orders':
          return (
            <DataTable
              headers={['Order ID', 'Customer', 'Status', 'Amount', 'Date']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(order) => (
                <>
                  <td className="order-id">{safeRender(order.id)}</td>
                  <td>{safeRender(order.customerName)}</td>
                  <td>
                    <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                      {safeRender(order.status)}
                    </span>
                  </td>
                  <td className="amount">₹{safeRender(order.amount, '0')}</td>
                  <td>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                  </td>
                </>
              )}
            />
          );

        case 'employees':
          return (
            <DataTable
              headers={['Name', 'Email', 'Phone', 'Position', 'Department']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(employee) => (
                <>
                  <td>{safeRender(employee.name || employee.employeeName)}</td>
                  <td>{safeRender(employee.email)}</td>
                  <td>{safeRender(employee.phone)}</td>
                  <td>{safeRender(employee.position || employee.role)}</td>
                  <td>{safeRender(employee.department)}</td>
                </>
              )}
            />
          );

        case 'trainers':
          return (
            <DataTable
              headers={['Name', 'Email', 'Phone', 'Specialization', 'Experience']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(trainer) => (
                <>
                  <td>{safeRender(trainer.name || trainer.trainerName)}</td>
                  <td>{safeRender(trainer.email)}</td>
                  <td>{safeRender(trainer.phone)}</td>
                  <td>{safeRender(trainer.specialization || trainer.expertise)}</td>
                  <td>{safeRender(trainer.experience)}</td>
                </>
              )}
            />
          );

        case 'products':
          return (
            <DataTable
              headers={['Product Name', 'Price', 'Category', 'Stock', 'Description']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(product) => (
                <>
                  <td>{safeRender(product.name || product.productName)}</td>
                  <td className="price">₹{safeRender(product.price, '0')}</td>
                  <td>
                    <span className="category-tag">{safeRender(product.category)}</span>
                  </td>
                  <td className="stock">
                    {typeof product.stock === 'object' ? JSON.stringify(product.stock) : (product.stock || 0)}
                  </td>
                  <td className="description">{safeRender(product.description)}</td>
                </>
              )}
            />
          );

        case 'services':
          return (
            <DataTable
              headers={['Service Name', 'Price', 'Duration', 'Category', 'Description']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(service) => (
                <>
                  <td>{safeRender(service.name || service.serviceName)}</td>
                  <td className="price">₹{safeRender(service.price, '0')}</td>
                  <td>{safeRender(service.duration)}</td>
                  <td>
                    <span className="category-tag">{safeRender(service.category)}</span>
                  </td>
                  <td className="description">{safeRender(service.description)}</td>
                </>
              )}
            />
          );

        case 'trainings':
          return (
            <DataTable
              headers={['Location', 'Date', 'Trainer', 'Candidates', 'Joined', 'Status']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(training) => (
                <>
                  <td>{safeRender(training.location)}</td>
                  <td>{safeRender(training.date)}</td>
                  <td>{safeRender(training.trainerName)}</td>
                  <td>
                    <span className="badge badge-info">{safeRender(training.candidates, '0')}</span>
                  </td>
                  <td>
                    {/* <span className="badge badge-success">
                      {training.participants ? Object.keys(training.participants).length : 0}
                    </span> */}
                  </td>
                  <td>
                    <span className={`status-badge ${new Date(training.expireDate) > new Date() ? 'status-active' : 'status-expired'}`}>
                      {new Date(training.expireDate) > new Date() ? 'Active' : 'Expired'}
                    </span>
                  </td>
                </>
              )}
            />
          );

        case 'joined trainings':
          return (
            <DataTable
              headers={['Name', 'Email', 'Phone', 'Training Location', 'Training Date', 'Referred By', 'Registered']}
              data={filteredData}
              onRowClick={handleRowClick}
              renderRow={(participant) => {
                const referrerDisplay = participant.referrerName || 'Direct Registration';
                const isDirect = referrerDisplay.toLowerCase().includes('direct');

                return (
                  <>
                    <td className="participant-name">{safeRender(participant.name)}</td>
                    <td>{safeRender(participant.email)}</td>
                    <td className="phone-number">{participant.phoneDisplay || 'No Phone'}</td>
                    <td>{safeRender(participant.trainingLocation)}</td>
                    <td>{safeRender(participant.trainingDate)}</td>
                    <td>
                      <span className={`referrer-badge ${isDirect ? 'direct' : 'agency'}`}>
                        {referrerDisplay}
                      </span>
                    </td>
                    <td className="registration-date">
                      {participant.registrationDisplay || 'Date Unknown'}
                    </td>
                  </>
                );
              }}
            />
          );

        default:
          return (
            <div className="no-data">
              <div className="no-data-icon">📊</div>
              <p>Table view for {selectedDetail} coming soon...</p>
            </div>
          );
      }
    };

    return (
      <div className="modal-overlay" onClick={closeDetailModal}>
        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              <h3>{selectedDetail} Details</h3>
              <span className="modal-subtitle">{filteredData.length} records found</span>
            </div>
            <div className="modal-actions">
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <button onClick={downloadReport} className="download-btn">
                <FaDownload />
                Export
              </button>

              <button className="close-btn" onClick={closeDetailModal}>
                <FaTimes />
              </button>
            </div>
          </div>

          <div className="modal-body">
            {filteredData.length > 0 ? (
              renderTableContent()
            ) : (
              <div className="no-data">
                <div className="no-data-icon">📋</div>
                <h4>No Data Found</h4>
                <p>{searchTerm ? `No results for "${searchTerm}"` : `No ${selectedDetail.toLowerCase()} available`}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

 return (
    <div className="dashboard-container">
      <style>{styles}</style>

      {/* Main Dashboard Content */}
      <div className="dashboard-main">
        <div className="dashboard-content">

          {/* Header Section */}
          {/* <div className="dashboard-header">
            <div className="header-content">
              <h1 className="dashboard-title">Company Dashboard</h1>
              <p className="dashboard-subtitle">Comprehensive business analytics and insights</p>
            </div>

            <div className="header-actions">
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt />
                Logout
              </button>
            </div>
          </div> */}

          {/* Enhanced Stats Cards Grid */}
          <div className="stats-overview">
            <div className="stats-header">
              <h2 className="stats-title">📊 Business Overview</h2>
              <p className="stats-subtitle">Real-time business metrics and analytics</p>
            </div>
            
            <div className="metrics-grid">
              {cards.map((card, index) => (
                <div
                  key={card.name}
                  className="metric-card"
                  onClick={() => handleCardClick(card.name)}
                  style={{ 
                    '--card-color': card.color,
                    '--animation-delay': `${index * 0.1}s`
                  }}
                >
                  <div className="card-header">
                    <div className="card-trend">
                      <span className="trend-indicator positive">↗</span>
                    </div>
                  </div>
                  
                  <div className="card-content">
                    <div className="card-value">{card.value.toLocaleString()}</div>
                    <div className="card-label">{card.name}</div>
                    <div className="card-progress">
                      <div className="progress-bar" style={{ backgroundColor: card.color, width: '75%' }}></div>
                    </div>
                  </div>
                  
                  <div className="card-footer">
                    <span className="view-details">View Details</span>
                    <div className="card-arrow">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Professional Charts Section */}
          <div className="charts-section">
            <div className="charts-grid">
              
              {/* Order Status Overview */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">Order Status Distribution</h3>
                  <p className="chart-subtitle">Current order status breakdown</p>
                </div>
                <div className="chart-content">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        name="Orders"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Revenue Trends */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3 className="chart-title">Revenue Trends</h3>
                  <p className="chart-subtitle">Monthly performance overview</p>
                </div>
                <div className="chart-content">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#059669" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Business Metrics Overview */}
              <div className="chart-card full-width">
                <div className="chart-header">
                  <h3 className="chart-title">Business Metrics Comparison</h3>
                  <p className="chart-subtitle">Key performance indicators</p>
                </div>
                <div className="chart-content">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="category" 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="current" fill="#3b82f6" name="Current" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" fill="#e2e8f0" name="Target" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

          <Outlet />
        </div>
      </div>

      {renderDetailModal()}
      {renderRowDetailModal()}
    </div>
  );
};

const styles = `
  :root {
    /* Color Palette */
    --primary-color: #3b82f6;
    --secondary-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
    --purple-color: #8b5cf6;
    --cyan-color: #06b6d4;
    --lime-color: #84cc16;
    --pink-color: #ec4899;

    /* Theme Variables (Corrected for clarity) */
    --bg-main: #f8fafc; /* Page background */
    --bg-card: #ffffff; /* Card/modal background */
    --text-primary: #0f172a; /* Main text color */
    --text-muted: #64748b;   /* Secondary text color */
    --border-color: #e2e8f0; /* Lighter border for light theme */
    --white: #ffffff;

    /* UI Variables */
    --border-radius: 12px;
    --box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    --transition-speed: 0.2s ease-in-out;
  }

  /* Base styling */
  body {
    background-color: var(--bg-main);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .dashboard-container {
    background-color: var(--bg-main);
    min-height: 100vh;
  }

  .dashboard-main {
    padding: 2rem;
    max-width: 1600px;
    margin: 0 auto;
  }

  /* Header */
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1.5rem;
    gap: 1.5rem;
  }
  .dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .dashboard-subtitle {
    font-size: 1rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }
  // .logout-btn {
  //   display: flex;
  //   align-items: center;
  //   gap: 0.5rem;
  //   // background-color: var(--bg-card);
  //   // color: var(--primary-color);
  //   border: 1px solid var(--primary-color);
  //   padding: 0.75rem 1rem;
  //   border-radius: var(--border-radius);
  //   font-size: 1rem;
  //   font-weight: 600;
  //   cursor: pointer;
  //   transition: background-color var(--transition-speed), color var(--transition-speed);
  //   white-space: nowrap; /* Prevents text from wrapping */
  // }
  // .logout-btn:hover {
  //   // background-color: var(--primary-color);
  //   // color: var(--white);
  // }

  /* Stats Overview Section */
  .stats-overview {
    margin-bottom: 2rem;
  }
  
  .stats-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  .stats-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.375rem 0;
  }
  
  .stats-subtitle {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin: 0;
  }

  /* Enhanced Metrics Cards - Compact Design */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.875rem;
    margin-bottom: 1.5rem;
  }
  
  .metric-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 12px;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid #e2e8f0;
    position: relative;
    overflow: hidden;
    animation: slideInUp 0.6s ease-out var(--animation-delay, 0s) both;
    min-height: 100px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--card-color), var(--card-color)aa);
  }
  
  .metric-card:hover {
    transform: translateY(-4px) scale(1.01);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06);
    border-color: var(--card-color);
  }
  
  .card-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .card-trend {
    display: flex;
    align-items: center;
  }
  
  .trend-indicator {
    font-size: 1rem;
    font-weight: 600;
  }
  
  .trend-indicator.positive {
    color: #059669;
  }
  
  .card-content {
    margin-bottom: 0.5rem;
  }
  
  .card-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
    margin-bottom: 0.125rem;
  }
  
  .card-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 0.375rem;
  }
  
  .card-progress {
    width: 100%;
    height: 3px;
    background-color: #f1f5f9;
    border-radius: 1.5px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    border-radius: 1.5px;
    transition: width 0.8s ease-out;
    opacity: 0.8;
  }
  
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f1f5f9;
  }
  
  .view-details {
    font-size: 0.65rem;
    color: var(--card-color);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  .card-arrow {
    font-size: 1rem;
    color: var(--card-color);
    transition: transform 0.3s ease;
    font-weight: 600;
  }
  
  .metric-card:hover .card-arrow {
    transform: translateX(4px);
  }

  /* Charts Section */
  .charts-section {
    margin-top: 2rem;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .chart-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
  }

  .chart-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  }

  .chart-card.full-width {
    grid-column: 1 / -1;
  }

  .chart-header {
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 1rem;
  }

  .chart-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 0.25rem 0;
  }

  .chart-subtitle {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
  }

  .chart-content {
    position: relative;
  }


  /* Modal Styles */
  .modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex; justify-content: center; align-items: center; z-index: 1000;
    padding: 1rem;
  }
  .modal-content {
    background-color: var(--bg-card);
    border-radius: var(--border-radius);
    width: 100%;
    max-height: 90vh;
    display: flex; flex-direction: column;
    border: 1px solid var(--border-color);
  }
  .modal-content.large { max-width: 1200px; }
  .modal-content.small { max-width: 600px; }

  .modal-header {
    display: flex; flex-wrap: wrap; /* Allow wrapping on small screens */
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  .modal-title h3 { margin: 0; font-size: 1.5rem; }
  .modal-subtitle { color: var(--text-muted); }
  .modal-actions { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .search-container { position: relative; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
  .search-input {
    background-color: var(--bg-main); border: 1px solid var(--border-color);
    border-radius: 8px; padding: 0.75rem 1rem 0.75rem 2.5rem;
    color: var(--text-primary); font-size: 1rem;
  }
  .download-btn, .close-btn {
    display: flex; align-items: center; gap: 0.5rem;
    background-color: transparent; border: 1px solid var(--text-muted);
    color: var(--text-muted); padding: 0.75rem 1rem; border-radius: 8px;
    cursor: pointer; transition: all var(--transition-speed);
  }
  .download-btn:hover { background-color: var(--primary-color); border-color: var(--primary-color); color: var(--white); }
  .close-btn:hover { background-color: var(--danger-color); border-color: var(--danger-color); color: var(--white); }
  .modal-body { padding: 1.5rem; overflow-y: auto; }

  /* Table Styles */
  /* This wrapper makes the table scrollable on small screens, which is the desired behavior for responsive tables. It prevents the table from breaking the page layout. */
  .table-wrapper { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; color: var(--text-primary); }
  .data-table th, .data-table td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
  .data-table th { font-size: 0.875rem; text-transform: uppercase; color: var(--text-muted); background-color: var(--bg-main); }
  .data-table tbody tr:hover { background-color: #f1f5f9; /* A light slate color */ }

  /* Badge and Button Styles */
  .status-badge {
    padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600;
    font-size: 0.8rem; text-transform: capitalize;
  }
  .status-confirmed, .status-active { background-color: rgba(16, 185, 129, 0.2); color: #059669; }
  .status-pending { background-color: rgba(245, 158, 11, 0.2); color: #d97706; }
  .status-completed { background-color: rgba(59, 130, 246, 0.2); color: #2563eb; }
  .status-cancelled, .status-expired { background-color: rgba(239, 68, 68, 0.2); color: #dc2626; }

  .view-btn {
    display: flex; align-items: center; gap: 0.5rem; background-color: var(--bg-card);
    border: 1px solid var(--primary-color); color: var(--primary-color);
    padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; transition: all var(--transition-speed);
  }
  .view-btn:hover { background-color: var(--primary-color); color: var(--white); }

  /* No Data Placeholder */
  .no-data { text-align: center; padding: 4rem 2rem; color: var(--text-muted); }
  .no-data-icon { font-size: 4rem; margin-bottom: 1rem; }

  /* Row Detail Modal Styles */
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
  .detail-item {
    background-color: var(--bg-main);
    padding: 1rem;
    border-radius: 8px;
    border-left: 3px solid var(--primary-color);
  }
  .detail-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-transform: capitalize;
  }
  .detail-value {
    font-size: 1rem;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-all;
  }
  .detail-value pre {
      background-color: var(--bg-card);
      padding: 0.75rem;
      border-radius: 8px;
      color: var(--text-primary);
      font-family: 'Courier New', Courier, monospace;
      white-space: pre-wrap;
      word-break: break-word;
  }

  /* ------------------------- */
  /* --- Responsive Design --- */
  /* ------------------------- */

  /* Tablet (max-width: 1024px) */
  @media (max-width: 1024px) {
    .dashboard-main {
      padding: 1.5rem;
    }
  }

  /* Mobile (max-width: 768px) */
  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .dashboard-title {
      font-size: 1.75rem;
    }
    .stats-title {
      font-size: 1.5rem;
    }
    .metrics-grid {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .charts-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .chart-card {
      padding: 1rem;
    }
    .metric-card {
      padding: 0.625rem;
      min-height: 90px;
    }
    .card-value {
      font-size: 1.25rem;
    }
    .modal-header {
        padding: 1rem;
    }
    .modal-body {
        padding: 1rem;
    }
  }

  /* Small Mobile (max-width: 480px) */
  @media (max-width: 480px) {
    .dashboard-main {
      padding: 1rem;
    }
    .stats-title {
      font-size: 1.25rem;
    }
    .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.625rem;
    }
    .charts-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
    .chart-card {
      padding: 0.75rem;
    }
    .chart-title {
      font-size: 1rem;
    }
    .chart-subtitle {
      font-size: 0.8rem;
    }
    .metric-card {
      padding: 0.5rem;
      min-height: 85px;
    }
    .card-value {
      font-size: 1.125rem;
    }
    .card-label {
      font-size: 0.65rem;
    }
    .view-details {
      font-size: 0.6rem;
    }
    .modal-header {
      /* Stack title and actions in the modal header */
      flex-direction: column;
      align-items: stretch;
    }
    .modal-actions {
      justify-content: space-between;
    }
    .search-input {
      width: 100%;
      box-sizing: border-box; /* Include padding and border in the element's total width */
    }
    .data-table th, .data-table td {
      padding: 0.75rem;
    }
  }
`;



export default CompanyDashboard;

