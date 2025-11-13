import React, { useState } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUser } from 'react-icons/fa';

const EmployeeSchedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'month'

  // Mock schedule data
  const scheduleData = [
    {
      id: 1,
      title: 'Morning Shift',
      date: '2025-11-12',
      startTime: '09:00',
      endTime: '17:00',
      location: 'Main Office',
      type: 'work',
      description: 'Regular work shift'
    },
    {
      id: 2,
      title: 'Team Meeting',
      date: '2025-11-13',
      startTime: '10:00',
      endTime: '11:00',
      location: 'Conference Room A',
      type: 'meeting',
      description: 'Weekly team sync meeting'
    },
    {
      id: 3,
      title: 'Training Session',
      date: '2025-11-14',
      startTime: '14:00',
      endTime: '16:00',
      location: 'Training Room',
      type: 'training',
      description: 'Safety protocols training'
    },
    {
      id: 4,
      title: 'Evening Shift',
      date: '2025-11-15',
      startTime: '17:00',
      endTime: '01:00',
      location: 'Main Office',
      type: 'work',
      description: 'Evening work shift'
    }
  ];

  const getWeekDates = (date) => {
    const week = [];
    const startDate = new Date(date);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day;
    
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(diff + i);
      week.push(weekDate);
    }
    return week;
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getScheduleForDate = (date) => {
    const dateStr = formatDate(date);
    return scheduleData.filter(item => item.date === dateStr);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'work':
        return '#3b82f6';
      case 'meeting':
        return '#10b981';
      case 'training':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const weekDates = getWeekDates(currentDate);

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h1>
          <FaCalendarAlt className="page-icon" />
          My Schedule
        </h1>
        <div className="view-controls">
          <button 
            className={`view-btn ${view === 'week' ? 'active' : ''}`}
            onClick={() => setView('week')}
          >
            Week View
          </button>
          <button 
            className={`view-btn ${view === 'month' ? 'active' : ''}`}
            onClick={() => setView('month')}
          >
            Month View
          </button>
        </div>
      </div>

      <div className="schedule-navigation">
        <button 
          className="nav-btn"
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() - 7);
            setCurrentDate(newDate);
          }}
        >
          ← Previous Week
        </button>
        <h2 className="current-period">
          {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {' '}
          {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        <button 
          className="nav-btn"
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setDate(currentDate.getDate() + 7);
            setCurrentDate(newDate);
          }}
        >
          Next Week →
        </button>
      </div>

      {view === 'week' && (
        <div className="week-view">
          <div className="week-grid">
            {weekDates.map((date, index) => {
              const daySchedule = getScheduleForDate(date);
              const isToday = formatDate(date) === formatDate(new Date());
              
              return (
                <div key={index} className={`day-column ${isToday ? 'today' : ''}`}>
                  <div className="day-header">
                    <div className="day-name">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="day-number">
                      {date.getDate()}
                    </div>
                  </div>
                  
                  <div className="day-schedule">
                    {daySchedule.map(item => (
                      <div 
                        key={item.id} 
                        className="schedule-item"
                        style={{ borderLeftColor: getTypeColor(item.type) }}
                      >
                        <div className="item-time">
                          <FaClock className="time-icon" />
                          {item.startTime} - {item.endTime}
                        </div>
                        <div className="item-title">{item.title}</div>
                        <div className="item-location">
                          <FaMapMarkerAlt className="location-icon" />
                          {item.location}
                        </div>
                      </div>
                    ))}
                    
                    {daySchedule.length === 0 && (
                      <div className="no-schedule">
                        No scheduled items
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="schedule-summary">
        <h3>This Week's Summary</h3>
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-number">{scheduleData.filter(item => item.type === 'work').length}</div>
            <div className="stat-label">Work Shifts</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{scheduleData.filter(item => item.type === 'meeting').length}</div>
            <div className="stat-label">Meetings</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{scheduleData.filter(item => item.type === 'training').length}</div>
            <div className="stat-label">Training Sessions</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">40</div>
            <div className="stat-label">Total Hours</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .schedule-container {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .schedule-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #111827;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .page-icon {
          color: #3b82f6;
        }

        .view-controls {
          display: flex;
          gap: 0.5rem;
        }

        .view-btn {
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          background: white;
          color: #374151;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .view-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .schedule-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nav-btn {
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .current-period {
          color: #111827;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .week-view {
          margin-bottom: 2rem;
        }

        .week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .day-column {
          background: white;
          min-height: 300px;
          display: flex;
          flex-direction: column;
        }

        .day-column.today {
          background: #eff6ff;
        }

        .day-header {
          padding: 1rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          text-align: center;
        }

        .day-column.today .day-header {
          background: #dbeafe;
        }

        .day-name {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          text-transform: uppercase;
        }

        .day-number {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-top: 0.25rem;
        }

        .day-schedule {
          flex: 1;
          padding: 0.5rem;
        }

        .schedule-item {
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          border-left: 3px solid #3b82f6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .schedule-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .item-time {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .time-icon {
          font-size: 0.625rem;
        }

        .item-title {
          font-weight: 600;
          color: #111827;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .item-location {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .location-icon {
          font-size: 0.625rem;
        }

        .no-schedule {
          text-align: center;
          color: #9ca3af;
          font-size: 0.875rem;
          padding: 2rem 0.5rem;
          font-style: italic;
        }

        .schedule-summary {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .schedule-summary h3 {
          color: #111827;
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 1.5rem 0;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          text-align: center;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .week-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 768px) {
          .schedule-container {
            padding: 1rem;
          }

          .schedule-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .schedule-navigation {
            flex-direction: column;
            gap: 1rem;
          }

          .week-grid {
            grid-template-columns: 1fr;
          }

          .day-column {
            min-height: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeSchedule;
