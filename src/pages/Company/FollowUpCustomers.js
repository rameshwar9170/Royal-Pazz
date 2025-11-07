import React, { useState, useEffect } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { db } from '../../firebase/config';
import '../../styles/FollowUpCustomers.css';

const FollowUpCustomers = () => {
  const [followUpCustomers, setFollowUpCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, contacted, converted
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const followUpRef = ref(db, 'HTAMS/followUpCustomers');
    const unsubscribe = onValue(followUpRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const followUpArray = Object.entries(data).map(([id, customer]) => ({
          id,
          ...customer,
          daysSinceInterest: Math.floor((Date.now() - new Date(customer.interestDate).getTime()) / (1000 * 60 * 60 * 24)),
          isOverdue: Math.floor((Date.now() - new Date(customer.interestDate).getTime()) / (1000 * 60 * 60 * 24)) >= customer.followUpDays
        })).sort((a, b) => new Date(b.interestDate) - new Date(a.interestDate));
        
        setFollowUpCustomers(followUpArray);
      } else {
        setFollowUpCustomers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsContacted = async (customerId) => {
    try {
      const customerRef = ref(db, `HTAMS/followUpCustomers/${customerId}`);
      await update(customerRef, {
        status: 'contacted',
        contactedDate: new Date().toISOString(),
        lastContactBy: 'Admin' // You can replace with actual user
      });
      
      // Show success notification
      alert('Customer marked as contacted successfully!');
    } catch (error) {
      console.error('Error updating customer status:', error);
      alert('Failed to update customer status');
    }
  };

  const markAsConverted = async (customerId) => {
    try {
      const customerRef = ref(db, `HTAMS/followUpCustomers/${customerId}`);
      await update(customerRef, {
        status: 'converted',
        convertedDate: new Date().toISOString(),
        convertedBy: 'Admin' // You can replace with actual user
      });
      
      alert('Customer marked as converted successfully!');
    } catch (error) {
      console.error('Error updating customer status:', error);
      alert('Failed to update customer status');
    }
  };

  const scheduleFollowUp = async (customerId, days) => {
    try {
      const customerRef = ref(db, `HTAMS/followUpCustomers/${customerId}`);
      await update(customerRef, {
        followUpDays: days,
        status: 'pending',
        scheduledDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      });
      
      alert(`Follow-up scheduled for ${days} days from now!`);
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      alert('Failed to schedule follow-up');
    }
  };

  const filteredCustomers = followUpCustomers.filter(customer => {
    const matchesFilter = filter === 'all' || customer.status === filter;
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.interestedProducts.some(product => 
                           product.name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'contacted': return '#3b82f6';
      case 'converted': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (daysSinceInterest, followUpDays) => {
    if (daysSinceInterest >= followUpDays) return '#ef4444'; // Overdue - Red
    if (daysSinceInterest >= followUpDays - 1) return '#f59e0b'; // Due soon - Yellow
    return '#10b981'; // On track - Green
  };

  if (loading) {
    return (
      <div className="follow-up-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading follow-up customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="follow-up-container">
      <div className="follow-up-header">
        <h2>📞 Follow-up Customers</h2>
        <p>Track and manage customers who showed interest but haven't purchased yet</p>
      </div>

      <div className="follow-up-controls">
        <div className="search-filter-section">
          <input
            type="text"
            placeholder="Search by name, phone, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Customers</option>
            <option value="pending">Pending Follow-up</option>
            <option value="contacted">Already Contacted</option>
            <option value="converted">Converted to Sale</option>
          </select>
        </div>

        <div className="stats-section">
          <div className="stat-card">
            <span className="stat-number">{followUpCustomers.filter(c => c.status === 'pending').length}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{followUpCustomers.filter(c => c.isOverdue).length}</span>
            <span className="stat-label">Overdue</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{followUpCustomers.filter(c => c.status === 'converted').length}</span>
            <span className="stat-label">Converted</span>
          </div>
        </div>
      </div>

      <div className="customers-grid">
        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <h3>No follow-up customers found</h3>
            <p>Customers who show interest in products will appear here for follow-up</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div key={customer.id} className="customer-card">
              <div className="customer-header">
                <div className="customer-info">
                  <h4>{customer.name}</h4>
                  <p className="customer-contact">📱 {customer.phone}</p>
                  <p className="customer-email">📧 {customer.email}</p>
                </div>
                <div className="customer-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(customer.status) }}
                  >
                    {customer.status.toUpperCase()}
                  </span>
                  <div 
                    className="priority-indicator"
                    style={{ backgroundColor: getPriorityColor(customer.daysSinceInterest, customer.followUpDays) }}
                  >
                    {customer.isOverdue ? '🔴 OVERDUE' : `${customer.daysSinceInterest}/${customer.followUpDays} days`}
                  </div>
                </div>
              </div>

              <div className="interest-details">
                <p className="interest-date">
                  📅 Showed interest on: {new Date(customer.interestDate).toLocaleDateString('en-IN')}
                </p>
                <div className="interested-products">
                  <h5>🛍️ Interested Products:</h5>
                  <div className="dashboard-products-grid">
                    {customer.interestedProducts.map((product, index) => (
                      <div key={index} className="dashboard-product-card">
                        <div className="dashboard-product-image">
                          {product.image ? (
                            <img src={product.image} alt={product.name} />
                          ) : (
                            <div className="no-image">📦</div>
                          )}
                        </div>
                        <div className="dashboard-product-info">
                          <h6 className="dashboard-product-name">{product.name}</h6>
                          <p className="dashboard-product-price">₹{product.price.toLocaleString()}</p>
                          <p className="dashboard-product-quantity">Qty: {product.quantity}</p>
                          <p className="dashboard-product-total">₹{(product.price * product.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="dashboard-total-section">
                    <p className="total-value">
                      💰 Total Interest Value: ₹{customer.totalInterestValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="customer-actions">
                {customer.status === 'pending' && (
                  <>
                    <button
                      onClick={() => markAsContacted(customer.id)}
                      className="action-btn contacted-btn"
                    >
                      📞 Mark as Contacted
                    </button>
                    <button
                      onClick={() => markAsConverted(customer.id)}
                      className="action-btn converted-btn"
                    >
                      ✅ Mark as Converted
                    </button>
                  </>
                )}
                
                {customer.status === 'contacted' && (
                  <button
                    onClick={() => markAsConverted(customer.id)}
                    className="action-btn converted-btn"
                  >
                    ✅ Mark as Converted
                  </button>
                )}

                <div className="schedule-actions">
                  <span>Reschedule:</span>
                  <button onClick={() => scheduleFollowUp(customer.id, 1)} className="schedule-btn">1 Day</button>
                  <button onClick={() => scheduleFollowUp(customer.id, 3)} className="schedule-btn">3 Days</button>
                  <button onClick={() => scheduleFollowUp(customer.id, 7)} className="schedule-btn">1 Week</button>
                </div>
              </div>

              {customer.notes && (
                <div className="customer-notes">
                  <h5>📝 Notes:</h5>
                  <p>{customer.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FollowUpCustomers;
