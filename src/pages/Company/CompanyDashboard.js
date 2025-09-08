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
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import '../../styles/CompanyDashboard.css';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
  const [orderTrends, setOrderTrends] = useState([]);

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
    { name: 'Customers', value: stats.customers, color: '#3b82f6', icon: '👥' },
    { name: 'Orders', value: stats.orders, color: '#10b981', icon: '📦' },
    { name: 'Employees', value: stats.employees, color: '#f59e0b', icon: '👨‍💼' },
    { name: 'Trainers', value: stats.trainers, color: '#8b5cf6', icon: '🎓' },
    { name: 'Products', value: stats.products, color: '#ef4444', icon: '🛍️' },
    { name: 'Services', value: stats.services, color: '#06b6d4', icon: '⚙️' },
    { name: 'Trainings', value: stats.trainings, color: '#84cc16', icon: '📚' },
    { name: 'Joined Trainings', value: stats.joinedTrainings, color: '#ec4899', icon: '🎯' },
  ];

  const chartData = [
    { name: 'Pending', value: stats.pending },
    { name: 'Confirmed', value: stats.confirmed },
    { name: 'In-Progress', value: stats.inProgress },
    { name: 'Completed', value: stats.completed },
    { name: 'Cancelled', value: stats.cancelled },
  ];

  const paymentData = [
    { name: 'Cash', value: stats.paymentCash },
    { name: 'Online', value: stats.paymentOnline },
    { name: 'Card', value: stats.paymentCard },
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

          {/* Stats Cards Grid */}
          <div className="metrics-grid">
            {cards.map((card) => (
              <div
                key={card.name}
                className="metric-card"
                onClick={() => handleCardClick(card.name)}
                style={{ '--card-color': card.color }}
              >
                <div className="card-icon" style={{ background: card.color }}>
                  {card.icon}
                </div>
                <div className="card-content">
                  <div className="card-value">{card.value.toLocaleString()}</div>
                  <div className="card-label">{card.name}</div>
                </div>
                <div className="card-arrow">→</div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="charts-grid">

            {/* Order Status Chart */}
            <div className="chart-container">
              <div className="chart-header">
                <h3>📊 Order Status Overview</h3>
                <p>Distribution of order statuses</p>
              </div>
              <div className="chart-content">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods Chart */}
            <div className="chart-container">
              <div className="chart-header">
                <h3>💳 Payment Methods</h3>
                <p>Payment distribution analysis</p>
              </div>
              <div className="chart-content">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      wrapperStyle={{ color: '#94a3b8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Trends Chart */}
            <div className="chart-container full-width">
              <div className="chart-header">
                <h3>📈 Order Trends</h3>
                <p>Orders over time analysis</p>
              </div>
              <div className="chart-content">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={orderTrends}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      axisLine={{ stroke: '#334155' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#e2e8f0'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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

  /* Metrics Cards */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  .metric-card {
    display: flex;
    align-items: center;
    background-color: var(--bg-card);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
    cursor: pointer;
    transition: transform var(--transition-speed), box-shadow var(--transition-speed);
    border-left: 5px solid var(--card-color, var(--primary-color));
  }
  .metric-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
  }
  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 1.5rem;
    margin-right: 1rem;
  }
  .card-content { flex-grow: 1; }
  .card-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); }
  .card-label { font-size: 1rem; color: var(--text-muted); }
  .card-arrow { font-size: 1.5rem; color: var(--text-muted); transition: transform var(--transition-speed); }
  .metric-card:hover .card-arrow { transform: translateX(5px); }

  /* Charts */
  .charts-grid {
    display: grid;
    /* Use a smaller min value for better mobile support */
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
  }
  .chart-container {
    background-color: var(--bg-card);
    padding: 1.5rem;
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow);
  }
  .chart-container.full-width { grid-column: 1 / -1; }
  .chart-header { margin-bottom: 1.5rem; }
  .chart-header h3 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }
  .chart-header p { margin: 0.25rem 0 0; color: var(--text-muted); }

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
    .charts-grid {
      /* Stack charts vertically on smaller screens */
      grid-template-columns: 1fr;
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
    .card-value {
      font-size: 1.75rem;
    }
    .card-label {
      font-size: 0.875rem;
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

