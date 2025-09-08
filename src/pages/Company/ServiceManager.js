import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../firebase/config';

const statusColors = {
  pending: '#FBBF24',
  completed: '#22C55E',
  'in-progress': '#3B82F6',
};

const ServiceManagement = () => {
  const [orders, setOrders] = useState([]);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editData, setEditData] = useState({ expectedDate: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const ordersRef = ref(db, 'HTAMS/orders');
    // onValue returns a function that you can call to unsubscribe
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const formatted = Object.entries(data).map(([id, order]) => ({
          id,
          ...order,
        }));
        setOrders(formatted);
      } else {
        setOrders([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCancel = async (orderId) => {
    const confirmCancel = window.confirm('Remove this service (not cancel entire order)?');
    if (!confirmCancel) return;
    await update(ref(db, `HTAMS/orders/${orderId}`), {
      status: 'pending',
      expectedDate: ''
    });
  };

  const startEditing = (order) => {
    setEditingOrderId(order.id);
    setEditData({ expectedDate: order.expectedDate || '' });
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    if (!editingOrderId) return;

    const updateData = {
      expectedDate: editData.expectedDate,
    };

    if (!editData.expectedDate) {
      updateData.status = 'pending';
      updateData.expectedDate = '';
    }
    await update(ref(db, `HTAMS/orders/${editingOrderId}`), updateData);
    setEditingOrderId(null);
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
  };

  const handleRowClick = (order, e) => {
    if (
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'A' ||
      e.target.tagName === 'INPUT' ||
      editingOrderId === order.id
    )
      return;
    setSelectedOrder(order);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const StatusBadge = ({ status }) => (
    <span
      className="status-badge"
      style={{
        background: statusColors[(status || '').toLowerCase()] || '#CBD5E1',
        color: '#fff',
        borderRadius: 6,
        fontWeight: 600,
        padding: '4px 12px',
        fontSize: '0.93rem',
        display: 'inline-block',
        textTransform: 'capitalize',
        letterSpacing: 0.1,
        minWidth: 70,
      }}
    >
      {status || '-'}
    </span>
  );

  return (
    <div className="service-container">
      <h2 className="service-title">🔧 Service Management Panel</h2>
      {orders.length === 0 ? (
        <p className="no-orders">No service orders found.</p>
      ) : (
        <div className="table-container">
          <table className="service-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Expected Date</th>
                <th>Status</th>
                <th>OTP</th>
                <th>Form Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const isEditing = editingOrderId === order.id;
                return (
                  <tr
                    key={order.id}
                    className={isEditing ? 'editing-row' : ''}
                    onClick={(e) => handleRowClick(order, e)}
                    style={{ cursor: isEditing ? 'default' : 'pointer' }}
                  >
                    <td>{index + 1}</td>
                    <td>{order.customerName}</td>
                    <td>{order.productName}</td>
                    <td>
                      {isEditing ? (
                        <input
                          name="expectedDate"
                          type="date"
                          value={editData.expectedDate}
                          onChange={handleEditChange}
                          className="styled-input"
                          autoFocus
                        />
                      ) : (
                        order.expectedDate || '-'
                      )}
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{order.completionOTP || '-'}</td>
                    <td>
                      {order.formLink ? (
                        <a
                          href={order.formLink}
                          className="form-link-btn"
                          target="_blank"
                          rel="noreferrer"
                          tabIndex={isEditing ? -1 : 0}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📎 Complete
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="action-col">
                      <div className="btn-group">
                        {isEditing ? (
                          <>
                            <button
                              className="action-btn save"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEdit();
                              }}
                              tabIndex={0}
                            >
                              💾 Save
                            </button>
                            <button
                              className="action-btn cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEdit();
                              }}
                              tabIndex={0}
                            >
                              ❌ Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="action-btn edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(order);
                              }}
                              tabIndex={0}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="action-btn cancel-order"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(order.id);
                              }}
                              tabIndex={0}
                            >
                              🗑 Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
        >
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedOrder(null)}
              aria-label="Close order details"
            >
              &times;
            </button>
            <h3 id="order-modal-title">Order Details</h3>
            <div className="info-row">
              <span>Customer:</span> {selectedOrder.customerName || '-'}
            </div>
            <div className="info-row">
              <span>Product:</span> {selectedOrder.productName || '-'}
            </div>
            <div className="info-row">
              <span>Expected Date:</span> {selectedOrder.expectedDate || '-'}
            </div>
            <div className="info-row">
              <span>Status:</span>{' '}
              <StatusBadge status={selectedOrder.status || '-'} />
            </div>
            <div className="info-row">
              <span>OTP:</span> {selectedOrder.completionOTP || '-'}
            </div>
            <div className="info-row">
              <span>Form Link:</span>{' '}
              {selectedOrder.formLink ? (
                <a
                  href={selectedOrder.formLink}
                  target="_blank"
                  rel="noreferrer"
                  className="form-link-btn"
                >
                  📎 Complete
                </a>
              ) : (
                '-'
              )}
            </div>
            {selectedOrder.customerPhone && (
              <div className="info-row">
                <span>Phone:</span> {selectedOrder.customerPhone}
              </div>
            )}
            {selectedOrder.customerAddress && (
              <div className="info-row">
                <span>Address:</span> {selectedOrder.customerAddress}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .service-container {
          max-width: 1200px;
          margin: 12px auto;
          background: #fff;
          box-shadow: 0 10px 24px rgba(0,0,0,0.04), 0 1.5px 4px rgba(0,0,0,0.08);
          border-radius: 18px;
          padding: 10px 5px 10px 5px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .service-title {
          color: #232c49;
          font-size: 2.1rem;
          font-weight: 800;
          margin-bottom: 18px;
          user-select: none;
        }
        .no-orders {
          text-align: center;
          padding: 50px 0;
          font-size: 1.2rem;
          color: #64748b;
          user-select: none;
        }
        .table-container {
          overflow-x: auto;
        }
        .service-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background: #f7fafc;
          border-radius: 10px;
          overflow: hidden;
          min-width: 800px;
        }
        th {
          background-color: #f1f5f9;
          color: #48506a;
          font-size: 1rem;
          font-weight: 700;
          padding: 13px 10px;
          text-align: center;
          border-bottom: 2.5px solid #e0e7ef;
          user-select: none;
        }
        td {
          font-size: 0.98rem;
          padding: 11px 8px;
          text-align: center;
          border-bottom: 1.7px solid #e6e6e6;
          background: #fff;
          vertical-align: middle;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr.editing-row {
          background: #e0f2fe !important;
        }
        .status-badge {
          letter-spacing: 0.4px;
          min-width: 70px;
          box-shadow: 0 1px 6px rgba(40,148,255,0.07);
          user-select: none;
        }
        .form-link-btn {
          background: #e0eaff;
          color: #2563eb;
          text-decoration: none;
          border-radius: 7px;
          padding: 7px 17px;
          font-weight: 570;
          font-size: 0.97rem;
          transition: background 0.2s, color 0.2s;
          user-select: none;
          display: inline-block;
        }
        .form-link-btn:hover {
          background: #3b82f6;
          color: #fff;
        }
        .action-col {
          text-align: right;
          min-width: 140px;
          user-select: none;
        }
        .btn-group {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          align-items: center;
        }
        .action-btn {
          min-width: 36px;
          border: none;
          outline: none;
          border-radius: 7px;
          padding: 6px 15px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.16s ease;
          color: #fff;
          user-select: none;
        }
        .action-btn.edit { background: #06b6d4; }
        .action-btn.save { background: #22c55e; }
        .action-btn.cancel, .action-btn.cancel-order { background: #ef4444; }
        .action-btn.edit:hover { background: #0ea5e9; }
        .action-btn.save:hover { background: #16a34a; }
        .action-btn.cancel:hover, .action-btn.cancel-order:hover { background: #dc2626; }
        .styled-input {
          padding: 7px 10px;
          border: 1.3px solid #c8d3fd;
          border-radius: 7px;
          background: #f6faff;
          font-size: 1rem;
          transition: border 0.16s ease;
          width: 100%;
          box-sizing: border-box;
          user-select: text;
        }
        .styled-input:focus {
          border: 1.7px solid #2563eb;
          background: #fff;
          outline: none;
        }
        /* Modal styles */
        .order-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(34, 40, 49, 0.28);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }
        .order-modal {
          background: #fff;
          padding: 34px 28px 24px 28px;
          border-radius: 16px;
          min-width: 320px;
          max-width: 95vw;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 10px 32px rgba(40,70,120,0.18);
          position: relative;
          animation: popIn 0.19s cubic-bezier(0.23,1,0.32,1);
          user-select: text;
        }
        @keyframes popIn {
          from { transform: translateY(30px) scale(0.96); opacity: 0.5;}
          to { transform: none; opacity: 1;}
        }
        .modal-close {
          position: absolute;
          top: 12px;
          right: 16px;
          font-size: 2.2rem;
          font-weight: 400;
          color: #364B74;
          background: none;
          border: none;
          cursor: pointer;
          user-select: none;
        }
        .order-modal h3 {
          margin-top: 0;
          margin-bottom: 1.5em;
          font-size: 1.35rem;
          color: #1e293b;
          font-weight: 800;
          user-select: none;
        }
        .info-row {
          margin-bottom: 1em;
          display: flex;
          align-items: center;
          font-size: 1.1rem;
          user-select: text;
        }
        .info-row span {
          width: 140px;
          font-weight: 800;
          color: #444b5d;
          display: inline-block;
          user-select: none;
        }
        .order-modal .form-link-btn {
          display: inline-block;
          font-size: 1rem;
          padding: 6px 14px;
        }
        @media (max-width: 1000px) {
          .service-container {
            padding: 25px 20px;
          }
          .service-table {
            min-width: 650px;
          }
        }
        @media (max-width: 700px) {
          .service-container {
            padding: 15px 12px;
          }
          .service-table {
            font-size: 0.9rem;
            min-width: 550px;
          }
          .info-row span {
            width: 110px;
          }
        }
        @media (max-width: 500px) {
          .service-container {
            border-radius: 0;
            margin: 0 auto;
            padding: 15px 8px;
          }
          .order-modal {
            min-width: 90vw;
            padding: 24px 18px;
          }
          .info-row span {
            width: 85px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ServiceManagement;
