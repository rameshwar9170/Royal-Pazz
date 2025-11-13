import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  FaUser, 
  FaCalendarAlt, 
  FaClipboardList, 
  FaClock,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBriefcase
} from 'react-icons/fa';

const EmployeeDashboard = ({ employeeData: propEmployeeData }) => {
  const outletContext = useOutletContext?.() || {};
  const { employeeData: contextEmployee, employeeTasks = [], tasksLoading } = outletContext;

  const effectiveEmployee = contextEmployee || propEmployeeData;

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const taskStats = useMemo(() => {
    const total = employeeTasks.length;
    const completed = employeeTasks.filter((task) => task.status === 'completed').length;
    const active = employeeTasks.filter((task) => task.status !== 'completed').length;
    const dueSoon = employeeTasks.filter((task) => {
      if (!task.dueDateTimestamp) return false;
      const now = Date.now();
      const twoDays = 2 * 24 * 60 * 60 * 1000;
      return task.status !== 'completed' && task.dueDateTimestamp - now <= twoDays && task.dueDateTimestamp >= now;
    }).length;

    return {
      total,
      completed,
      active,
      dueSoon,
    };
  }, [employeeTasks]);

  const quickStats = [
    {
      title: 'Total Tasks',
      value: tasksLoading ? '—' : String(taskStats.total),
      icon: FaClipboardList,
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    {
      title: 'Active Tasks',
      value: tasksLoading ? '—' : String(taskStats.active),
      icon: FaClock,
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    {
      title: 'Completed',
      value: tasksLoading ? '—' : String(taskStats.completed),
      icon: FaUser,
      color: '#10b981',
      bgColor: '#ecfdf5'
    },
    {
      title: 'Due Soon',
      value: tasksLoading ? '—' : String(taskStats.dueSoon),
      icon: FaCalendarAlt,
      color: '#8b5cf6',
      bgColor: '#f3e8ff'
    }
  ];

  const upcomingTasks = useMemo(() => {
    if (!employeeTasks.length) return [];

    const sorted = [...employeeTasks].sort((a, b) => {
      if (a.status === b.status && a.dueDateTimestamp && b.dueDateTimestamp) {
        return a.dueDateTimestamp - b.dueDateTimestamp;
      }

      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      if (a.dueDateTimestamp && !b.dueDateTimestamp) return -1;
      if (!a.dueDateTimestamp && b.dueDateTimestamp) return 1;

      if (a.updatedAtTimestamp && b.updatedAtTimestamp) {
        return b.updatedAtTimestamp - a.updatedAtTimestamp;
      }

      return 0;
    });

    return sorted.slice(0, 4);
  }, [employeeTasks]);

  return (
    <div className="employee-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Welcome back, {effectiveEmployee?.name || 'Technician'}! 👋</h1>
          <p>Here's what's happening with your work today.</p>
        </div>
        <div className="time-display">
          <div className="current-time">{formatTime(currentTime)}</div>
          <div className="current-date">{formatDate(currentTime)}</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: stat.bgColor }}>
                <Icon style={{ color: stat.color }} />
              </div>
              <div className="stat-content">
                <h3>{stat.value}</h3>
                <p>{stat.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Employee Information */}
        <div className="info-card">
          <div className="card-header">
            <h2>
              <FaUser className="header-icon" />
              Personal Information
            </h2>
          </div>
          <div className="card-content">
            <div className="info-grid">
              <div className="info-item">
                <FaIdCard className="info-icon" />
                <div>
                  <label>Employee ID</label>
                  <span>{effectiveEmployee?.id || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <FaBriefcase className="info-icon" />
                <div>
                  <label>Role</label>
                  <span>{effectiveEmployee?.role || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <FaPhone className="info-icon" />
                <div>
                  <label>Mobile</label>
                  <span>{effectiveEmployee?.mobile || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <FaEnvelope className="info-icon" />
                <div>
                  <label>Email</label>
                  <span>{effectiveEmployee?.email || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <FaCalendarAlt className="info-icon" />
                <div>
                  <label>Joining Date</label>
                  <span>{effectiveEmployee?.joiningDate || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <FaClock className="info-icon" />
                <div>
                  <label>Shift</label>
                  <span>{effectiveEmployee?.shift || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="activity-card">
          <div className="card-header">
            <h2>
              <FaClipboardList className="header-icon" />
              Recent Activities
            </h2>
          </div>
          <div className="card-content">
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <h4>Profile Updated</h4>
                  <p>Updated personal information</p>
                  <span className="activity-time">2 hours ago</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <h4>Task Completed</h4>
                  <p>Completed maintenance task #MT-001</p>
                  <span className="activity-time">1 day ago</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-content">
                  <h4>Schedule Updated</h4>
                  <p>New shift schedule assigned</p>
                  <span className="activity-time">3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="actions-card">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="card-content">
            <div className="action-buttons">
              <button className="action-btn primary" disabled={tasksLoading}>
                <FaClipboardList />
                {tasksLoading ? 'Loading Tasks...' : `View Tasks (${taskStats.active} active)`}
              </button>
              <button className="action-btn secondary">
                <FaCalendarAlt />
                Check Schedule
              </button>
              <button className="action-btn tertiary">
                <FaUser />
                Update Profile
              </button>
              <button className="action-btn quaternary">
                <FaIdCard />
                View Documents
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .employee-dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }

        .welcome-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .welcome-content h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          font-weight: 700;
        }

        .welcome-content p {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
        }

        .time-display {
          text-align: right;
        }

        .current-time {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .current-date {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .stat-content h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
        }

        .stat-content p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .info-card,
        .activity-card,
        .actions-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .actions-card {
          grid-column: 1 / -1;
        }

        .card-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .card-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-icon {
          color: #6b7280;
        }

        .card-content {
          padding: 1.5rem;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .info-icon {
          color: #6b7280;
          font-size: 1.1rem;
          width: 20px;
        }

        .info-item div {
          flex: 1;
        }

        .info-item label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .info-item span {
          font-size: 0.95rem;
          color: #111827;
          font-weight: 500;
        }

        .activity-list {
          space-y: 1rem;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .activity-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .activity-dot {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          margin-top: 0.25rem;
          flex-shrink: 0;
        }

        .activity-dot.status-pending {
          background: #f59e0b;
        }

        .activity-dot.status-in_progress {
          background: #3b82f6;
        }

        .activity-dot.status-completed {
          background: #10b981;
        }

        .activity-dot.loading {
          background: #9ca3af;
        }

        .activity-content h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
        }

        .activity-content p {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .activity-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .action-btn {
          padding: 1rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .action-btn.primary {
          background: #3b82f6;
          color: white;
        }

        .action-btn.primary:hover {
          background: #2563eb;
        }

        .action-btn.secondary {
          background: #10b981;
          color: white;
        }

        .action-btn.secondary:hover {
          background: #059669;
        }

        .action-btn.tertiary {
          background: #f59e0b;
          color: white;
        }

        .action-btn.tertiary:hover {
          background: #d97706;
        }

        .action-btn.quaternary {
          background: #8b5cf6;
          color: white;
        }

        .action-btn.quaternary:hover {
          background: #7c3aed;
        }

        @media (max-width: 768px) {
          .welcome-section {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .time-display {
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .welcome-section {
            padding: 1.5rem;
          }

          .welcome-content h1 {
            font-size: 1.5rem;
          }

          .current-time {
            font-size: 1.5rem;
          }

          .stat-card {
            padding: 1rem;
          }

          .card-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;
