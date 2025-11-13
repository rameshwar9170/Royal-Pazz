import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaTasks, FaPlus, FaCheck, FaClock, FaExclamationTriangle, FaEye, FaClipboardCheck, FaMobileAlt, FaMapMarkerAlt, FaRupeeSign, FaImage, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { database, storage } from '../../firebase/config';
import { ref as dbRef, update, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendCustomMessage } from '../../services/whatsappService';

const EmployeeTasks = () => {
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('process');
  const [activeTask, setActiveTask] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [completingInstall, setCompletingInstall] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: null, text: '' });

  const outletContext = useOutletContext?.() || {};
  const { employeeTasks = [], tasksLoading, employeeData } = outletContext;

  const counts = useMemo(() => {
    const total = employeeTasks.length;
    const pending = employeeTasks.filter((task) => task.status === 'pending').length;
    const inProgress = employeeTasks.filter((task) => task.status === 'in_progress').length;
    const completed = employeeTasks.filter((task) => task.status === 'completed').length;
    return { total, pending, inProgress, completed };
  }, [employeeTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return employeeTasks;
    return employeeTasks.filter((task) => task.status === filter);
  }, [employeeTasks, filter]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!modalOpen || !activeTask) return;
    const latest = employeeTasks.find((task) => task.id === activeTask.id);
    if (latest && (latest.installationStatus !== activeTask.installationStatus || latest.status !== activeTask.status || latest.updatedAtTimestamp !== activeTask.updatedAtTimestamp)) {
      setActiveTask(latest);
    }
  }, [employeeTasks, modalOpen, activeTask]);

  const formatCurrency = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const installationStatusLabel = (status) => {
    switch (status) {
      case 'otp_sent':
        return 'OTP Sent';
      case 'otp_verified':
        return 'OTP Verified';
      case 'completed':
        return 'Installation Completed';
      default:
        return 'Pending';
    }
  };

  const openTaskModal = (task, mode = 'process') => {
    setActiveTask(task);
    setModalMode(mode);
    setModalOpen(true);
    setOtpInput('');
    setImageFile(null);
    setImagePreview('');
    setActionMessage({ type: null, text: '' });
  };

  const closeTaskModal = () => {
    setModalOpen(false);
    setActiveTask(null);
    setModalMode('process');
    setOtpInput('');
    setImageFile(null);
    setImagePreview('');
    setSendingOtp(false);
    setVerifyingOtp(false);
    setCompletingInstall(false);
    setActionMessage({ type: null, text: '' });
  };

  const assertActiveTask = () => {
    if (!activeTask) {
      throw new Error('No task selected. Please reopen the task and try again.');
    }
  };

  const sendInstallationOtp = async () => {
    try {
      assertActiveTask();
      if (!activeTask.customerPhone) {
        throw new Error('Customer mobile number is missing for this order.');
      }
      setSendingOtp(true);
      setActionMessage({ type: null, text: '' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const orderRef = dbRef(database, `HTAMS/orders/${activeTask.id}`);

      const customerName = activeTask.customerName || 'Customer';
      const message = `Dear ${customerName},\n\nYour installation OTP for order ${activeTask.orderNumber || activeTask.id} is ${otp}. Please share this OTP with our technician to proceed with installation.\n\nThank you,\nRoyal Pazz Services`;

      const messageSent = await sendCustomMessage(activeTask.customerPhone, message);
      if (!messageSent) {
        throw new Error('Failed to send OTP to the customer.');
      }

      await update(orderRef, {
        installationStatus: 'otp_sent',
        installationOtp: otp,
        installationOtpSentAt: new Date().toISOString(),
        installationOtpSentBy: employeeData?.id || null,
        installationOtpSentByName: employeeData?.name || null,
      });

      setActionMessage({ type: 'success', text: `OTP sent successfully to +91-${activeTask.customerPhone}.` });
    } catch (error) {
      console.error('Error sending installation OTP:', error);
      setActionMessage({ type: 'error', text: error.message || 'Failed to send OTP. Please try again.' });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyInstallationOtp = async () => {
    try {
      assertActiveTask();
      const enteredOtp = otpInput.trim();
      if (!enteredOtp) {
        throw new Error('Please enter the customer OTP before verifying.');
      }

      setVerifyingOtp(true);
      setActionMessage({ type: null, text: '' });

      const orderRef = dbRef(database, `HTAMS/orders/${activeTask.id}`);
      const snapshot = await get(orderRef);
      if (!snapshot.exists()) {
        throw new Error('Could not locate the order. Please refresh and try again.');
      }

      const orderData = snapshot.val();
      if (!orderData.installationOtp) {
        throw new Error('No OTP is currently active for this order. Please send a new OTP.');
      }

      if (orderData.installationOtp !== enteredOtp) {
        throw new Error('The OTP you entered does not match. Please check with the customer and try again.');
      }

      await update(orderRef, {
        installationStatus: 'otp_verified',
        installationOtp: null,
        installationOtpVerifiedAt: new Date().toISOString(),
        installationOtpVerifiedBy: employeeData?.id || null,
        installationOtpVerifiedByName: employeeData?.name || null,
      });

      setOtpInput('');
      setActionMessage({ type: 'success', text: 'OTP verified successfully. You can now capture installation proof.' });
    } catch (error) {
      console.error('Error verifying installation OTP:', error);
      setActionMessage({ type: 'error', text: error.message || 'Failed to verify OTP. Please try again.' });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const completeInstallation = async () => {
    try {
      assertActiveTask();
      if (!imageFile) {
        throw new Error('Please capture or select an installation photo before completing.');
      }

      setCompletingInstall(true);
      setActionMessage({ type: null, text: '' });

      const sanitizedName = imageFile.name?.replace(/\s+/g, '_') || 'installation.jpg';
      const filePath = `installation_completions/${activeTask.id}/${Date.now()}_${sanitizedName}`;
      const completionImageRef = storageRef(storage, filePath);
      await uploadBytes(completionImageRef, imageFile);
      const downloadURL = await getDownloadURL(completionImageRef);

      const orderRef = dbRef(database, `HTAMS/orders/${activeTask.id}`);
      await update(orderRef, {
        installationStatus: 'completed',
        installationCompletedAt: new Date().toISOString(),
        installationCompletedBy: employeeData?.id || null,
        installationCompletedByName: employeeData?.name || null,
        installationCompletionImage: downloadURL,
        status: 'completed',
      });

      setImageFile(null);
      setImagePreview('');
      setActionMessage({ type: 'success', text: 'Installation marked as completed. Great job!' });
    } catch (error) {
      console.error('Error completing installation:', error);
      setActionMessage({ type: 'error', text: error.message || 'Failed to complete installation. Please try again.' });
    } finally {
      setCompletingInstall(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheck className="status-icon completed" />;
      case 'in_progress':
        return <FaClock className="status-icon in-progress" />;
      default:
        return <FaExclamationTriangle className="status-icon pending" />;
    }
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  const getStatusClass = (status) => {
    return `status-${status.replace('_', '-')}`;
  };

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1>
          <FaTasks className="page-icon" />
          My Tasks
        </h1>
        <button className="add-task-btn" disabled>
          <FaPlus /> New Task
        </button>
      </div>

      <div className="tasks-filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          disabled={tasksLoading}
        >
          All Tasks ({counts.total})
        </button>
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
          disabled={tasksLoading}
        >
          Pending ({counts.pending})
        </button>
        <button 
          className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
          disabled={tasksLoading}
        >
          In Progress ({counts.inProgress})
        </button>
        <button 
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
          disabled={tasksLoading}
        >
          Completed ({counts.completed})
        </button>
      </div>

      {tasksLoading ? (
        <div className="empty-state">
          <FaTasks className="empty-icon" />
          <h3>Loading tasks...</h3>
          <p>Please wait while we fetch the latest assignments.</p>
        </div>
      ) : (
        <>
          <div className="tasks-grid">
            {filteredTasks.map(task => (
              <div key={task.id} className={`task-card ${getStatusClass(task.status)}`}>
                <div className="task-header">
                  <div className="task-status">
                    {getStatusIcon(task.status)}
                    <span className="status-text">{task.status.replace('_', ' ')}</span>
                  </div>
                  <div className={`task-priority ${getPriorityClass(task.priority)}`}>
                    {task.priority}
                  </div>
                </div>

                <div className="task-content">
                  <h3 className="task-title">{task.title}</h3>
                  <p className="task-description">{task.description}</p>
                  <div className="task-meta-grid">
                    <div className="meta-item">
                      <FaClipboardCheck />
                      <span>Order: {task.orderNumber}</span>
                    </div>
                    <div className="meta-item">
                      <FaRupeeSign />
                      <span>{formatCurrency(task.amount)}</span>
                    </div>
                    <div className="meta-item">
                      <FaMapMarkerAlt />
                      <span>{task.location || 'Location NA'}</span>
                    </div>
                    <div className={`meta-item status-pill status-${task.installationStatus || 'pending'}`}>
                      <FaInfoCircle />
                      <span>{installationStatusLabel(task.installationStatus)}</span>
                    </div>
                  </div>
                </div>

                <div className="task-footer">
                  <div className="task-meta">
                    <span className="due-date">Due: {task.dueDate || 'Not set'}</span>
                    <span className="assigned-by">Assigned by: {task.assignedBy}</span>
                  </div>
                  <div className="task-actions">
                    <button className="action-btn primary-action" onClick={() => openTaskModal(task, 'process')}>
                      <FaClipboardCheck /> Process Installation
                    </button>
                    <button className="action-btn view-btn" onClick={() => openTaskModal(task, 'view')}>
                      <FaEye /> View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="empty-state">
              <FaTasks className="empty-icon" />
              <h3>No tasks found</h3>
              <p>No tasks match the current filter criteria.</p>
            </div>
          )}
        </>
      )}

      {modalOpen && activeTask && (
        <div className="task-modal-overlay" onClick={closeTaskModal}>
          <div
            className={`task-modal ${modalMode === 'view' ? 'compact' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={closeTaskModal} aria-label="Close">
              <FaTimes />
            </button>

            {modalMode === 'process' ? (
              <>
                <div className="modal-header">
                  <div>
                    <h2>Order #{activeTask.orderNumber}</h2>
                    <p>Customer: {activeTask.customerName || 'N/A'}</p>
                  </div>
                  <div className={`status-chip status-${activeTask.installationStatus || 'pending'}`}>
                    {installationStatusLabel(activeTask.installationStatus)}
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Customer Details</h3>
                  <div className="details-grid">
                    <div>
                      <label>Name</label>
                      <span>{activeTask.customerName || 'N/A'}</span>
                    </div>
                    <div>
                      <label>Mobile</label>
                      <span>{activeTask.customerPhone || 'N/A'}</span>
                    </div>
                    <div>
                      <label>Payment Mode</label>
                      <span>{activeTask.paymentMode || 'N/A'}</span>
                    </div>
                    <div>
                      <label>Amount</label>
                      <span>{formatCurrency(activeTask.amount)}</span>
                    </div>
                  </div>
                  {activeTask.customerAddress && (
                    <div className="address-block">
                      <FaMapMarkerAlt />
                      <div>
                        <strong>Full Address</strong>
                        <p>
                          {[activeTask.customerAddress.street, activeTask.customerAddress.city, activeTask.customerAddress.state, activeTask.customerAddress.pincode]
                            .filter(Boolean)
                            .join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-section">
                  <h3>Order Items</h3>
                  {activeTask.items && activeTask.items.length > 0 ? (
                    <ul className="items-list">
                      {activeTask.items.map((item, index) => (
                        <li key={`${item.productName || item.name || index}-${index}`}>
                          <div className="item-name">{item.productName || item.name || 'Unnamed Product'}</div>
                          <div className="item-meta">Qty: {item.quantity || 1}</div>
                          <div className="item-meta">Price: {formatCurrency(Number(item.totalPrice ?? item.price ?? 0))}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-note">No items available for this order.</p>
                  )}
                </div>

                <div className="modal-section">
                  <h3>Installation Workflow</h3>
                  <div className="workflow-steps">
                    <div className={`workflow-step ${activeTask.installationStatus && ['otp_sent', 'otp_verified', 'completed'].includes(activeTask.installationStatus) ? 'completed' : ''}`}>
                      <span className="step-index">1</span>
                      <div>
                        <strong>Send OTP</strong>
                        <p>Share OTP with customer to authorise installation.</p>
                        <button
                          className="step-action"
                          onClick={sendInstallationOtp}
                          disabled={sendingOtp}
                        >
                          {sendingOtp ? 'Sending...' : 'Send / Resend OTP'}
                        </button>
                      </div>
                    </div>

                    <div className={`workflow-step ${activeTask.installationStatus && ['otp_verified', 'completed'].includes(activeTask.installationStatus) ? 'completed' : ''}`}>
                      <span className="step-index">2</span>
                      <div>
                        <strong>Verify OTP</strong>
                        <p>Enter the OTP shared by customer to proceed.</p>
                        <div className="otp-input-group">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Enter customer OTP"
                            value={otpInput}
                            onChange={(event) => setOtpInput(event.target.value.replace(/[^0-9]/g, ''))}
                            disabled={verifyingOtp || activeTask.installationStatus === 'completed'}
                          />
                          <button
                            className="step-action"
                            onClick={verifyInstallationOtp}
                            disabled={verifyingOtp || activeTask.installationStatus === 'completed'}
                          >
                            {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={`workflow-step ${activeTask.installationStatus === 'completed' ? 'completed' : ''}`}>
                      <span className="step-index">3</span>
                      <div>
                        <strong>Capture Proof & Complete</strong>
                        <p>Capture installation proof photo and mark as complete.</p>
                        <div className="upload-group">
                          <label className="upload-label">
                            <FaImage />
                            <span>{imageFile ? 'Change Photo' : 'Upload Installation Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  setImageFile(file);
                                }
                              }}
                              disabled={activeTask.installationStatus !== 'otp_verified'}
                            />
                          </label>
                          {imagePreview && (
                            <div className="image-preview">
                              <img src={imagePreview} alt="Installation preview" />
                            </div>
                          )}
                          <button
                            className="step-action"
                            onClick={completeInstallation}
                            disabled={completingInstall || activeTask.installationStatus !== 'otp_verified'}
                          >
                            {completingInstall ? 'Saving...' : 'Complete Installation'}
                          </button>
                        </div>

                        {activeTask.installationStatus === 'completed' && activeTask.installationCompletionImage && (
                          <div className="completed-preview">
                            <p>Proof already uploaded:</p>
                            <img src={activeTask.installationCompletionImage} alt="Installation completed" />
                            <span>Completed on {formatDateTime(activeTask.installationCompletedAt || activeTask.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {actionMessage.text && (
                    <div className={`action-feedback ${actionMessage.type}`}>
                      {actionMessage.text}
                    </div>
                  )}
                </div>

                {activeTask.orderNotes && (
                  <div className="modal-section">
                    <h3>Additional Notes</h3>
                    <p className="notes-text">{activeTask.orderNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="compact-content">
                <div className="compact-header">
                  <div>
                    <h2>Order #{activeTask.orderNumber}</h2>
                    <p>{activeTask.title}</p>
                  </div>
                  <div className={`status-chip status-${activeTask.installationStatus || 'pending'}`}>
                    {installationStatusLabel(activeTask.installationStatus)}
                  </div>
                </div>

                <div className="compact-grid">
                  <div>
                    <label>Customer</label>
                    <span>{activeTask.customerName || 'N/A'}</span>
                  </div>
                  <div>
                    <label>Mobile</label>
                    <span>{activeTask.customerPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <label>Due</label>
                    <span>{activeTask.dueDate || 'Not set'}</span>
                  </div>
                  <div>
                    <label>Amount</label>
                    <span>{formatCurrency(activeTask.amount)}</span>
                  </div>
                </div>

                {activeTask.customerAddress && (
                  <div className="compact-address">
                    <FaMapMarkerAlt />
                    <p>
                      {[activeTask.customerAddress.street, activeTask.customerAddress.city, activeTask.customerAddress.state]
                        .filter(Boolean)
                        .join(', ') || 'Address not available'}
                    </p>
                  </div>
                )}

                {activeTask.items && activeTask.items.length > 0 && (
                  <div className="compact-items">
                    <h4>Items</h4>
                    <ul>
                      {activeTask.items.slice(0, 3).map((item, index) => (
                        <li key={`${item.productName || item.name || index}-compact`}>
                          <span>{item.productName || item.name || 'Product'}</span>
                          <span className="qty">× {item.quantity || 1}</span>
                        </li>
                      ))}
                    </ul>
                    {activeTask.items.length > 3 && (
                      <small>+{activeTask.items.length - 3} more items</small>
                    )}
                  </div>
                )}

                <div className="compact-footer">
                  <button
                    className="action-btn primary-action"
                    onClick={() => setModalMode('process')}
                  >
                    <FaClipboardCheck /> Process Installation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .tasks-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .tasks-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .tasks-header h1 {
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

        .add-task-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-task-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .tasks-filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.75rem 1.5rem;
          border: 2px solid #e5e7eb;
          background: white;
          color: #374151;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .filter-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .tasks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .task-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          border-left: 4px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .task-card.status-pending {
          border-left-color: #f59e0b;
        }

        .task-card.status-in-progress {
          border-left-color: #3b82f6;
        }

        .task-card.status-completed {
          border-left-color: #10b981;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .task-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-icon {
          font-size: 1rem;
        }

        .status-icon.pending {
          color: #f59e0b;
        }

        .status-icon.in-progress {
          color: #3b82f6;
        }

        .status-icon.completed {
          color: #10b981;
        }

        .status-text {
          font-weight: 500;
          color: #374151;
          text-transform: capitalize;
        }

        .task-priority {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .priority-high {
          background: #fef2f2;
          color: #dc2626;
        }

        .priority-medium {
          background: #fef3c7;
          color: #d97706;
        }

        .priority-low {
          background: #f0fdf4;
          color: #16a34a;
        }

        .task-content {
          margin-bottom: 1.5rem;
        }

        .task-title {
          color: #111827;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .task-description {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0;
        }

        .task-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: #475569;
          background: #f1f5f9;
          border-radius: 0.5rem;
          padding: 0.4rem 0.6rem;
        }

        .status-pill {
          font-weight: 600;
        }

        .status-pill.status-pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-pill.status-otp_sent {
          background: #e0f2fe;
          color: #0369a1;
        }

        .status-pill.status-otp_verified {
          background: #f5f3ff;
          color: #6b21a8;
        }

        .status-pill.status-completed {
          background: #ecfdf5;
          color: #047857;
        }

        .task-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
        }

        .task-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .task-meta .due-date,
        .task-meta .assigned-by {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .task-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .primary-action {
          background: #2563eb;
          color: white;
        }

        .view-btn {
          background: #e5e7eb;
          color: #374151;
        }

        .primary-action:hover {
          background: #1d4ed8;
        }

        .action-btn:hover {
          transform: translateY(-1px);
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          margin: 0;
        }

        .task-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1500;
          padding: 1.5rem;
        }

        @media (max-width: 768px) {
          .tasks-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .tasks-grid {
            grid-template-columns: 1fr;
          }

          .task-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .task-modal {
            padding: 2.25rem 1.25rem 1.75rem;
          }

          .modal-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .workflow-step {
            flex-direction: column;
          }

          .otp-input-group {
            flex-direction: column;
            align-items: stretch;
          }

          .task-modal.compact {
            max-width: 100%;
          }

          .compact-grid {
            grid-template-columns: 1fr;
          }

          .compact-footer {
            justify-content: stretch;
          }

          .compact-footer .primary-action {
            width: 100%;
            justify-content: center;
          }
        }
          /* Add these CSS rules inside your existing <style jsx> block, after the .empty-state styles and before .task-modal-overlay */

.task-modal {
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.task-modal.compact {
  max-width: 600px;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #f3f4f6;
  border: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.modal-close:hover {
  background: #e5e7eb;
  transform: rotate(90deg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 2rem;
  border-bottom: 1px solid #e5e7eb;
  gap: 1rem;
}

.modal-header h2 {
  margin: 0 0 0.5rem 0;
  color: #111827;
  font-size: 1.5rem;
  font-weight: 700;
}

.modal-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.status-chip {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-chip.status-pending {
  background: #fff7ed;
  color: #c2410c;
}

.status-chip.status-otp_sent {
  background: #e0f2fe;
  color: #0369a1;
}

.status-chip.status-otp_verified {
  background: #f5f3ff;
  color: #6b21a8;
}

.status-chip.status-completed {
  background: #ecfdf5;
  color: #047857;
}

.modal-section {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #f3f4f6;
}

.modal-section:last-child {
  border-bottom: none;
}

.modal-section h3 {
  margin: 0 0 1rem 0;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 600;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.details-grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.details-grid label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.details-grid span {
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
}

.address-block {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.address-block svg {
  color: #3b82f6;
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.address-block strong {
  display: block;
  margin-bottom: 0.25rem;
  color: #374151;
  font-size: 0.875rem;
}

.address-block p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.items-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  gap: 1rem;
}

.item-name {
  font-weight: 500;
  color: #111827;
  flex: 1;
}

.item-meta {
  font-size: 0.875rem;
  color: #6b7280;
  white-space: nowrap;
}

.empty-note {
  color: #9ca3af;
  font-style: italic;
  margin: 0;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.workflow-step {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
  border-left: 4px solid #e5e7eb;
  transition: all 0.2s ease;
}

.workflow-step.completed {
  background: #ecfdf5;
  border-left-color: #10b981;
}

.step-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: #e5e7eb;
  color: #6b7280;
  border-radius: 50%;
  font-weight: 700;
  flex-shrink: 0;
}

.workflow-step.completed .step-index {
  background: #10b981;
  color: white;
}

.workflow-step strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #111827;
  font-size: 1rem;
}

.workflow-step p {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.step-action {
  padding: 0.625rem 1.25rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-action:hover:not(:disabled) {
  background: #2563eb;
}

.step-action:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.otp-input-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.otp-input-group input {
  flex: 1;
  padding: 0.625rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 1rem;
  font-family: monospace;
  letter-spacing: 0.25em;
  text-align: center;
}

.otp-input-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.upload-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #f3f4f6;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: #374151;
}

.upload-label:hover {
  background: #e5e7eb;
  border-color: #3b82f6;
}

.upload-label input {
  display: none;
}

.image-preview {
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.completed-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: #f0fdf4;
  border-radius: 8px;
  margin-top: 1rem;
}

.completed-preview p {
  margin: 0;
  font-weight: 600;
  color: #047857;
}

.completed-preview img {
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  border: 2px solid #10b981;
}

.completed-preview span {
  font-size: 0.875rem;
  color: #6b7280;
}

.action-feedback {
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  font-weight: 500;
}

.action-feedback.success {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #10b981;
}

.action-feedback.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #ef4444;
}

.notes-text {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

/* Compact View Modal Styles */
.compact-content {
  padding: 2rem;
}

.compact-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f3f4f6;
}

.compact-header h2 {
  margin: 0 0 0.5rem 0;
  color: #111827;
  font-size: 1.5rem;
  font-weight: 700;
}

.compact-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.compact-grid > div {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.compact-grid label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.compact-grid span {
  font-size: 0.9375rem;
  color: #111827;
  font-weight: 500;
}

.compact-address {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.compact-address svg {
  color: #3b82f6;
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.compact-address p {
  margin: 0;
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.5;
}

.compact-items {
  margin-bottom: 1.5rem;
}

.compact-items h4 {
  margin: 0 0 0.75rem 0;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.compact-items ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.compact-items li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.875rem;
  background: #f9fafb;
  border-radius: 6px;
}

.compact-items li span:first-child {
  color: #111827;
  font-weight: 500;
  font-size: 0.875rem;
}

.compact-items .qty {
  color: #6b7280;
  font-size: 0.8125rem;
  font-weight: 600;
}

.compact-items small {
  display: block;
  margin-top: 0.5rem;
  color: #9ca3af;
  font-size: 0.8125rem;
  font-style: italic;
}

.compact-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 2px solid #f3f4f6;
}

      `}</style>
    </div>
  );
};

export default EmployeeTasks;
