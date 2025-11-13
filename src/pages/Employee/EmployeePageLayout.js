import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ref, get, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  FaHome, 
  FaUser, 
  FaClipboardList, 
  FaCalendarAlt, 
  FaCog, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaIdCard
} from 'react-icons/fa';

const EmployeePageLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation();

  const parseDateDetails = useCallback((value) => {
    if (!value) {
      return { display: null, timestamp: null };
    }

    const toDisplay = (date) => ({
      display: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      timestamp: date.getTime(),
    });

    const normalizeNumber = (num) => (num < 1e12 ? num * 1000 : num);

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? { display: null, timestamp: null } : toDisplay(value);
    }

    if (typeof value === 'number') {
      const date = new Date(normalizeNumber(value));
      return Number.isNaN(date.getTime()) ? { display: null, timestamp: null } : toDisplay(date);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return { display: null, timestamp: null };
      }

      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        const dateFromNumeric = new Date(normalizeNumber(numeric));
        if (!Number.isNaN(dateFromNumeric.getTime())) {
          return toDisplay(dateFromNumeric);
        }
      }

      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return toDisplay(parsed);
      }

      const pattern = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (pattern) {
        const [, day, month, year] = pattern;
        const fullYear = year.length === 2 ? `20${year}` : year;
        const isoCandidate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const dateFromPattern = new Date(isoCandidate);
        if (!Number.isNaN(dateFromPattern.getTime())) {
          return toDisplay(dateFromPattern);
        }
      }

      return { display: trimmed, timestamp: null };
    }

    return { display: null, timestamp: null };
  }, []);

  const calculateOrderAmount = useCallback((order) => {
    if (!order) {
      return 0;
    }

    const directAmount = [
      order.totalAmount,
      order.amount,
      order.finalAmount,
      order.grandTotal,
    ].find((value) => typeof value === 'number' && !Number.isNaN(value));

    if (typeof directAmount === 'number') {
      return directAmount;
    }

    if (Array.isArray(order.items)) {
      return order.items.reduce((sum, item) => {
        if (!item) return sum;
        const price = Number(item.totalPrice ?? item.price ?? 0);
        const quantity = Number(item.quantity ?? 1);
        if (Number.isNaN(price) || Number.isNaN(quantity)) {
          return sum;
        }
        return sum + price * quantity;
      }, 0);
    }

    return 0;
  }, []);

  useEffect(() => {
    const storedEmployeeId =
      localStorage.getItem('employeeId') || sessionStorage.getItem('employeeId');

    if (!storedEmployeeId) {
      setLoading(false);
      navigate('/employee-login');
      return;
    }

    let isMounted = true;
    const employeeRef = ref(database, `HTAMS/company/Employees/${storedEmployeeId}`);

    const handleSnapshot = (snapshot) => {
      if (!snapshot.exists()) {
        if (!isMounted) return;
        console.error('Employee not found');
        setEmployeeData(null);
        navigate('/employee-login');
        return;
      }

      const data = snapshot.val();
      if (isMounted) {
        setEmployeeData({ id: storedEmployeeId, ...data });
      }
    };

    setLoading(true);

    get(employeeRef)
      .then(handleSnapshot)
      .catch((error) => {
        console.error('Error fetching employee data:', error);
        if (isMounted) {
          navigate('/employee-login');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    const unsubscribe = onValue(employeeRef, handleSnapshot);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!employeeData?.id) {
      return undefined;
    }

    setTasksLoading(true);
    const ordersRef = ref(database, 'HTAMS/orders');
    const targetId = String(employeeData.id);

    const unsubscribe = onValue(
      ordersRef,
      (snapshot) => {
        const rawOrders = snapshot.val() || {};
        const statusOrder = { pending: 1, in_progress: 2, completed: 3 };

        const tasks = Object.entries(rawOrders).reduce((acc, [orderId, order]) => {
          if (!order) {
            return acc;
          }

          const assignedId = order.assignedTechnicianId ?? order.technicianId;
          if (String(assignedId || '') !== targetId) {
            return acc;
          }

          const statusRaw = (order.status || 'pending').toString().toLowerCase();
          let status = 'pending';
          let statusDisplay = 'Pending';

          if (statusRaw === 'completed') {
            status = 'completed';
            statusDisplay = 'Completed';
          } else if (statusRaw === 'inprocess') {
            status = 'in_progress';
            statusDisplay = 'In Process';
          } else if (statusRaw === 'accepted') {
            status = 'in_progress';
            statusDisplay = 'Accepted';
          } else if (statusRaw === 'confirmed') {
            status = 'pending';
            statusDisplay = 'Confirmed';
          } else if (statusRaw) {
            statusDisplay = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
          }

          const dueDateDetails = parseDateDetails(
            order.preferredVisitDate ||
              order.scheduledDate ||
              order.preferredDate ||
              order.serviceDate ||
              order.appointmentDate ||
              order.orderDate ||
              order.createdAt ||
              order.timestamp
          );

          const timelineKey = `${statusRaw}At`;
          const updatedAtDetails = parseDateDetails(
            order[timelineKey] || order.updatedAt || order.lastUpdatedAt || order.modifiedAt
          );

          const title =
            order.serviceType ||
            order.orderType ||
            (Array.isArray(order.items) && order.items.length > 0
              ? order.items[0].productName || order.items[0].name
              : null) ||
            'Service Order';

          const description =
            order.issueDescription ||
            order.problemDescription ||
            order.notes ||
            (order.customerName ? `Service for ${order.customerName}` : `Order ${orderId}`);

          const rawPriority = order.priority?.toString().toLowerCase();
          const priority = ['high', 'medium', 'low'].includes(rawPriority)
            ? rawPriority
            : status === 'pending'
            ? 'high'
            : status === 'in_progress'
            ? 'medium'
            : 'low';

          const amount = calculateOrderAmount(order);
          const address = order.customerAddress || {};
          const items = Array.isArray(order.items)
            ? order.items.filter(Boolean)
            : [];
          const installationStatus = order.installationStatus ||
            (status === 'completed' ? 'completed' : 'pending');

          acc.push({
            id: orderId,
            title,
            description,
            status,
            statusDisplay,
            priority,
            dueDate: dueDateDetails.display,
            dueDateTimestamp: dueDateDetails.timestamp,
            assignedBy: order.assignedBy || order.createdBy || 'Dispatch Team',
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            location: order.customerAddress?.city
              ? `${order.customerAddress.city}${order.customerAddress.state ? `, ${order.customerAddress.state}` : ''}`
              : order.customerAddress?.street || '',
            amount,
            updatedAt: updatedAtDetails.display,
            updatedAtTimestamp: updatedAtDetails.timestamp,
            address,
            items,
            orderNumber: order.orderNumber || order.bookingId || order.invoiceNumber || orderId,
            paymentMode: order.paymentMethod || order.paymentMode || order.paymentType || '',
            customerAddress: order.customerAddress || null,
            installationStatus,
            installationVerification: order.installationVerification || null,
            orderNotes: order.installationNotes || order.internalNotes || order.notes || '',
            rawOrder: order,
          });

          return acc;
        }, []);

        tasks.sort((a, b) => {
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }

          if (a.dueDateTimestamp && b.dueDateTimestamp) {
            return a.dueDateTimestamp - b.dueDateTimestamp;
          }

          if (a.dueDateTimestamp) {
            return -1;
          }

          if (b.dueDateTimestamp) {
            return 1;
          }

          if (a.updatedAtTimestamp && b.updatedAtTimestamp) {
            return b.updatedAtTimestamp - a.updatedAtTimestamp;
          }

          return 0;
        });

        setEmployeeTasks(tasks);
        setNotifications(tasks.filter((task) => task.status !== 'completed'));
        setTasksLoading(false);
      },
      (error) => {
        console.error('Error loading employee tasks:', error);
        setEmployeeTasks([]);
        setNotifications([]);
        setTasksLoading(false);
      }
    );

    return () => unsubscribe();
  }, [employeeData?.id, parseDateDetails, calculateOrderAmount]);

  const handleLogout = () => {
    localStorage.removeItem('employeeId');
    sessionStorage.removeItem('employeeId');
    localStorage.removeItem('employeeToken');
    sessionStorage.removeItem('employeeToken');
    setEmployeeData(null);
    setEmployeeTasks([]);
    setNotifications([]);
    setTasksLoading(true);
    navigate('/employee-login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const menuItems = [
    { path: '/employee-dashboard', icon: FaHome, label: 'Dashboard', exact: true },
    { path: '/employee-dashboard/profile', icon: FaUser, label: 'My Profile' },
    { path: '/employee-dashboard/tasks', icon: FaClipboardList, label: 'Tasks' },
    { path: '/employee-dashboard/schedule', icon: FaCalendarAlt, label: 'Schedule' },
    { path: '/employee-dashboard/documents', icon: FaIdCard, label: 'Documents' },
    { path: '/employee-dashboard/settings', icon: FaCog, label: 'Settings' }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading employee dashboard...</p>
      </div>
    );
  }

  if (!employeeData) {
    return <Navigate to="/employee-login" replace />;
  }

  return (
    <div className="employee-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <FaUser className="logo-icon" />
            <span className="logo-text">Employee Portal</span>
          </div>
          <button className="close-sidebar" onClick={toggleSidebar}>
            <FaTimes />
          </button>
        </div>

        <div className="employee-info">
          <div className="employee-avatar">
            {employeeData.name?.charAt(0).toUpperCase()}
          </div>
          <div className="employee-details">
            <h3>{employeeData.name}</h3>
            <p>{employeeData.role}</p>
            <span className="employee-id">ID: {employeeData.id}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              
              return (
                <li key={item.path}>
                  <button
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      navigate(item.path);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="nav-icon" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <h1 className="page-title">Employee Dashboard</h1>
          </div>
          
          <div className="header-right">
            <button className="notification-btn">
              <FaBell />
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            
            <div className="user-menu">
              <div className="user-avatar">
                {employeeData.name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{employeeData.name}</span>
                <span className="user-role">{employeeData.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          <Outlet context={{ employeeData, employeeTasks, tasksLoading }} />
        </div>
      </main>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <style jsx>{`
        .employee-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .sidebar {
          width: 280px;
          background: linear-gradient(180deg, #002B5C 0%, #1a365d 100%);
          color: white;
          position: fixed;
          top: 0;
          left: -280px;
          height: 100vh;
          transition: left 0.3s ease;
          z-index: 1000;
          overflow-y: auto;
        }

        .sidebar-open {
          left: 0;
        }

        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          font-size: 1.5rem;
          color: #F36F21;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .close-sidebar {
          background: none;
          border: none;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .close-sidebar:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .employee-info {
          padding: 1.5rem;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .employee-avatar {
          width: 60px;
          height: 60px;
          background: #F36F21;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0 auto 1rem;
        }

        .employee-details h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .employee-details p {
          margin: 0 0 0.5rem 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
        }

        .employee-id {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
        }

        .sidebar-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .nav-item {
          width: 100%;
          background: none;
          border: none;
          color: white;
          padding: 0.875rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }

        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .nav-item.active {
          background-color: #F36F21;
          border-right: 4px solid #ffffff;
        }

        .nav-icon {
          font-size: 1.1rem;
          width: 20px;
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn {
          width: 100%;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 0.875rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.3);
          color: white;
        }

        .main-content {
          flex: 1;
          margin-left: 0;
          display: flex;
          flex-direction: column;
        }

        .main-header {
          background: white;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .menu-toggle {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #374151;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .menu-toggle:hover {
          background-color: #f3f4f6;
        }

        .page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .notification-btn {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          position: relative;
          transition: all 0.2s ease;
        }

        .notification-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
        }

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
        }

        .user-menu {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          color: #111827;
          font-size: 0.875rem;
        }

        .user-role {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .content-area {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Desktop Styles */
        @media (min-width: 1024px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            overflow-y: auto;
          }

          .main-content {
            margin-left: 280px;
          }

          .menu-toggle {
            display: none;
          }

          .close-sidebar {
            display: none;
          }

          .sidebar-overlay {
            display: none;
          }
        }

        /* Tablet Styles */
        @media (max-width: 768px) {
          .main-header {
            padding: 1rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          .user-info {
            display: none;
          }

          .content-area {
            padding: 1rem;
          }
        }

        /* Mobile Styles */
        @media (max-width: 480px) {
          .main-header {
            padding: 0.75rem;
          }

          .page-title {
            font-size: 1.125rem;
          }

          .content-area {
            padding: 0.75rem;
          }

          .sidebar {
            width: 260px;
            left: -260px;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeePageLayout;
