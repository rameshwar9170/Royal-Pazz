import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, onValue, update } from 'firebase/database';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiLock, 
  FiUserPlus, 
  FiEdit3, 
  FiTrash2, 
  FiEye, 
  FiEyeOff, 
  FiShield, 
  FiSettings, 
  FiPlus, 
  FiX, 
  FiCheck,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiUsers,
  FiSearch
} from 'react-icons/fi';

const MODULES = ['orders', 'customers', 'total-trainings', 'employees', 'sales-dashboard', 'products', 'users','levels'];

const makeDefaultPermissions = () =>
  MODULES.reduce((acc, mod) => ({ ...acc, [mod]: { read: false, write: false, delete: false, add: false } }), {});

const AddAdminPage = () => {
  const auth = useMemo(() => getAuth(), []);
  const db = useMemo(() => getDatabase(), []);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'subadmin', permissions: makeDefaultPermissions() });
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [expandedModule, setExpandedModule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [msgType, setMsgType] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [admins, setAdmins] = useState({});
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [suspendMode, setSuspendMode] = useState(null);
  
  const [customSuspendValue, setCustomSuspendValue] = useState(1);
  const [customSuspendUnit, setCustomSuspendUnit] = useState('days');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New state for card details view
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    const adminsRef = ref(db, 'HTAMS/users');
    const unsubscribe = onValue(adminsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const onlyAdmins = Object.entries(data)
        .filter(([, user]) => user.role === 'admin' || user.role === 'subadmin')
        .reduce((acc, [uid, user]) => ({ ...acc, [uid]: user }), {});
      setAdmins(onlyAdmins);
    });
    return () => unsubscribe();
  }, [db]);

  // Enhanced handleChange with input restrictions
  const handleChange = (name, value, isEdit = false) => {
    let processedValue = value;

    // Apply input restrictions based on field type
    if (name === 'name') {
      // Name: remove any digits
      processedValue = value.replace(/\d/g, '');
    } else if (name === 'phone') {
      // Phone: only allow digits
      processedValue = value.replace(/\D/g, '');
    } else if (name === 'email') {
      // Email: basic cleanup (remove spaces)
      processedValue = value.replace(/\s/g, '');
    }

    const setFunc = isEdit ? setEditForm : setForm;
    setFunc((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handlePermissionChange = (module, permType, isEdit = false) => {
      const setFunc = isEdit ? setEditForm : setForm;
      setFunc((prev) => ({
          ...prev,
          permissions: { ...prev.permissions, [module]: { ...prev.permissions[module], [permType]: !prev.permissions[module][permType] } },
      }));
  };

  // Enhanced validation function
  const validateForm = (formData, isEdit = false) => {
    // Name validation: no digits allowed
    if (!formData.name || !formData.name.trim()) {
      return 'Full Name is required';
    }
    if (/\d/.test(formData.name)) {
      return 'Name cannot contain numbers';
    }

    // Email validation: proper email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailPattern.test(formData.email.trim())) {
      return 'Invalid email format';
    }

    // Phone validation: digits only, proper length
    const phone = (formData.phone || '').replace(/\s+/g, '');
    if (!/^[0-9]+$/.test(phone)) {
      return 'Phone number must contain only digits';
    }
    if (phone.length < 10 || phone.length > 15) {
      return 'Phone number must be between 10 and 15 digits';
    }

    // Password validation (only for new users)
    if (!isEdit) {
      if (!formData.password || formData.password.length < 6) {
        return 'Password must be at least 6 characters';
      }
    }

    // Role validation
    if (!formData.role) {
      return 'Role must be selected';
    }

    return '';
  };

  const resetAddAdminForm = () => {
    setForm({ name: '', email: '', phone: '', password: '', role: 'subadmin', permissions: makeDefaultPermissions() });
    setIsFormVisible(false);
    setExpandedModule(null);
    setMessage('');
  };

  const handleSubmit = async () => {
    const error = validateForm(form);
    if (error) { 
      setMessage(`${error}`); 
      setMsgType('error'); 
      setTimeout(() => setMessage(''), 5000);
      return; 
    }
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userData = {
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        role: form.role, currentLevel: form.role, active: true,
        permissions: form.permissions || makeDefaultPermissions(), createdAt: new Date().toISOString(),
      };
      await set(ref(db, `HTAMS/users/${userCred.user.uid}`), userData);
      setMessage('Admin created successfully!'); 
      setMsgType('success');
      resetAddAdminForm();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Error: ${error.message}`); 
      setMsgType('error'); 
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditSubmit = async () => {
    if (!editForm) return;
    const error = validateForm(editForm, true);
    if (error) { 
      setMessage(`${error}`); 
      setMsgType('error'); 
      setTimeout(() => setMessage(''), 5000);
      return; 
    }
    setLoading(true);
    try {
      await update(ref(db, `HTAMS/users/${selected}`), {
        name: editForm.name.trim(), email: editForm.email.trim(), phone: editForm.phone.trim(),
        role: editForm.role, currentLevel: editForm.role,
        permissions: editForm.permissions || makeDefaultPermissions(),
      });
      setMessage('User updated successfully!'); 
      setMsgType('success');
      setEditMode(false);
      setSelected(null);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Error updating user: ${error.message}`); 
      setMsgType('error'); 
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivation = async (uid, currActive) => {
    try {
      await update(ref(db, `HTAMS/users/${uid}`), { active: !currActive });
      setMessage(`Admin has been ${!currActive ? 'activated' : 'deactivated'}.`);
      setMsgType('success');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Error updating status: ${error.message}`);
      setMsgType('error');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const suspendAccount = async (uid) => {
    if (!customSuspendValue || customSuspendValue <= 0) {
      setMessage("Please enter a valid positive number for the duration.");
      setMsgType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    const now = new Date();
    const value = parseInt(customSuspendValue, 10);
    switch (customSuspendUnit) {
      case 'hours': now.setHours(now.getHours() + value); break;
      case 'days': now.setDate(now.getDate() + value); break;
      case 'months': now.setMonth(now.getMonth() + value); break;
      case 'years': now.setFullYear(now.getFullYear() + value); break;
      default: break;
    }
    const until = now.toISOString();

    try {
      await update(ref(db, `HTAMS/users/${uid}`), { suspendedUntil: until });
      setMessage(`Account suspended for ${value} ${customSuspendUnit}.`);
      setMsgType('success');
      setSuspendMode(null);
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      setMsgType('error');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const renderDetailedPermissions = (permissions) => {
    if (!permissions) return <div className="no-permissions">No permissions set.</div>;
    const grantedModules = MODULES.filter(m => permissions[m] && Object.values(permissions[m]).some(v => v));
    if (grantedModules.length === 0) return <div className="no-permissions">No permissions granted.</div>;
    return (
      <div className="permissions-grid">
        {grantedModules.map((module) => (
          <div key={module} className="permission-module">
            <div className="permission-module-title">{module.charAt(0).toUpperCase() + module.slice(1)}</div>
            <div className="permission-tags">
              {['read', 'write', 'delete', 'add'].map((permType) => (
                permissions[module]?.[permType] && (
                  <span key={permType} className={`permission-tag ${permType}`}>
                    {permType}
                  </span>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Function to get filtered users based on card type
  const getCardUsers = (cardType) => {
    const adminsList = Object.entries(admins);
    switch(cardType) {
      case 'admin':
        return adminsList.filter(([, user]) => user.role === 'admin');
      case 'subadmin':
        return adminsList.filter(([, user]) => user.role === 'subadmin');
      case 'active':
        return adminsList.filter(([, user]) => user.active);
      case 'inactive':
        return adminsList.filter(([, user]) => !user.active);
      default:
        return [];
    }
  };

  // Handle card click to show details
  const handleCardClick = (cardType) => {
    setSelectedCard(selectedCard === cardType ? null : cardType);
  };

  const filteredAdmins = Object.entries(admins).filter(([uid, user]) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone.includes(searchQuery)
  );
  
  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <FiShield className="title-icon" />
            <span>Admin Management</span>
          </h1>
          <p className="page-subtitle">Manage administrators and their permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div 
          className={`stat-card admin ${selectedCard === 'admin' ? 'selected' : ''}`}
          onClick={() => handleCardClick('admin')}
        >
          <div className="stat-icon">
            <FiShield />
          </div>
          <div className="stat-info">
            <div className="stat-number">{Object.values(admins).filter(u => u.role === 'admin').length}</div>
            <div className="stat-label">Admins</div>
          </div>
          <div className="card-chevron">
            {selectedCard === 'admin' ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        
        <div 
          className={`stat-card subadmin ${selectedCard === 'subadmin' ? 'selected' : ''}`}
          onClick={() => handleCardClick('subadmin')}
        >
          <div className="stat-icon">
            <FiUser />
          </div>
          <div className="stat-info">
            <div className="stat-number">{Object.values(admins).filter(u => u.role === 'subadmin').length}</div>
            <div className="stat-label">Sub-Admins</div>
          </div>
          <div className="card-chevron">
            {selectedCard === 'subadmin' ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        
        <div 
          className={`stat-card active ${selectedCard === 'active' ? 'selected' : ''}`}
          onClick={() => handleCardClick('active')}
        >
          <div className="stat-icon">
            <FiCheck />
          </div>
          <div className="stat-info">
            <div className="stat-number">{Object.values(admins).filter(u => u.active).length}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="card-chevron">
            {selectedCard === 'active' ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        
        <div 
          className={`stat-card inactive ${selectedCard === 'inactive' ? 'selected' : ''}`}
          onClick={() => handleCardClick('inactive')}
        >
          <div className="stat-icon">
            <FiX />
          </div>
          <div className="stat-info">
            <div className="stat-number">{Object.values(admins).filter(u => !u.active).length}</div>
            <div className="stat-label">Inactive</div>
          </div>
          <div className="card-chevron">
            {selectedCard === 'inactive' ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
      </div>

      {/* Card Details View */}
      {selectedCard && (
        <div className="card-details-view">
          <div className="card-details-header">
            <h3 className="card-details-title">
              {selectedCard === 'admin' && 'Admin Users'}
              {selectedCard === 'subadmin' && 'Sub-Admin Users'}
              {selectedCard === 'active' && 'Active Users'}
              {selectedCard === 'inactive' && 'Inactive Users'}
            </h3>
            <button 
              className="card-details-close"
              onClick={() => setSelectedCard(null)}
            >
              <FiX />
            </button>
          </div>
          <div className="card-details-content">
            {getCardUsers(selectedCard).length === 0 ? (
              <div className="card-empty-state">
                <FiUsers className="empty-icon" />
                <h3>No users found</h3>
                <p>No users found in this category</p>
              </div>
            ) : (
              <div className="card-users-grid">
                {getCardUsers(selectedCard).map(([uid, user]) => (
                  <div key={uid} className="card-user-item">
                    <div className="card-user-avatar">
                      {user.role === 'admin' ? <FiShield /> : <FiUser />}
                    </div>
                    <div className="card-user-info">
                      <h4 className="card-user-name">{user.name || 'Unnamed User'}</h4>
                      <p className="card-user-email">{user.email || 'No email'}</p>
                      <p className="card-user-phone">{user.phone || 'No phone'}</p>
                      <div className="card-user-meta">
                        <div className="card-user-badges">
                          <span className={`role-badge ${user.role}`}>
                            {user.role}
                          </span>
                          <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="card-user-date">
                          {user.createdAt && (
                            <span className="created-date">
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Add Admin Form */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">
              <FiUserPlus className="card-icon" />
              Add New Admin
            </h2>
            {!isFormVisible && (
              <button className="btn btn-primary" onClick={() => setIsFormVisible(true)}>
                <FiPlus />
                <span>Add Admin</span>
              </button>
            )}
          </div>

          {isFormVisible && (
            <div className="form-container">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <FiUser className="label-icon" />
                    Full Name
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter full name (letters only)"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMail className="label-icon" />
                    Email
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter email address"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiPhone className="label-icon" />
                    Phone Number
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter phone number (digits only)"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiLock className="label-icon" />
                    Password
                  </label>
                  <div className="password-input-container">
                    <input
                      className="form-input"
                      placeholder="Enter password (minimum 6 characters)"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <FiShield className="label-icon" />
                  Role
                </label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-option ${form.role === 'admin' ? 'selected' : ''}`}
                    onClick={() => handleChange('role', 'admin')}
                  >
                    <FiShield />
                    Admin
                  </button>
                  <button
                    type="button"
                    className={`role-option ${form.role === 'subadmin' ? 'selected' : ''}`}
                    onClick={() => handleChange('role', 'subadmin')}
                  >
                    <FiUser />
                    Sub-Admin
                  </button>
                </div>
              </div>

              <div className="permissions-section">
                <h3 className="section-title">
                  <FiSettings className="section-icon" />
                  Permissions
                </h3>
                <div className="permissions-accordion">
                  {MODULES.map((module) => (
                    <div key={module} className="accordion-item">
                      <div
                        className="accordion-header"
                        onClick={() => setExpandedModule(expandedModule === module ? null : module)}
                      >
                        <span className="accordion-title">
                          {module.charAt(0).toUpperCase() + module.slice(1).replace('-', ' ')}
                        </span>
                        <span className="accordion-icon">
                          {expandedModule === module ? <FiChevronUp /> : <FiChevronDown />}
                        </span>
                      </div>
                      {expandedModule === module && (
                        <div className="accordion-content">
                          <div className="permission-checkboxes">
                            {['read', 'write', 'delete', 'add'].map((permType) => (
                              <div
                                key={permType}
                                className="permission-checkbox"
                                onClick={() => handlePermissionChange(module, permType)}
                              >
                                <span className={`checkbox ${form.permissions[module]?.[permType] ? 'checked' : ''}`}>
                                  {form.permissions[module]?.[permType] && <FiCheck />}
                                </span>
                                <span className="checkbox-label">{permType}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button
                  className={`btn btn-primary ${loading ? 'loading' : ''}`}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Admin'}
                </button>
                <button className="btn btn-secondary" onClick={resetAddAdminForm}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin List */}
        <div className="content-card">
          <div className="card-header">
            <h2 className="card-title">
              <FiUsers className="card-icon" />
              All Administrators
            </h2>
            <div className="search-container">
              <FiSearch className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {Object.keys(admins).length === 0 ? (
            <div className="empty-state">
              <FiUsers className="empty-icon" />
              <h3>No administrators found</h3>
              <p>Add your first administrator to get started</p>
            </div>
          ) : (
            <div className="admin-list">
              {filteredAdmins.map(([uid, user]) => {
                const isSelected = selected === uid;
                const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();
                
                return (
                  <div key={uid} className="admin-item">
                    <div
                      className={`admin-card ${isSelected ? 'selected' : ''} ${!user.active ? 'inactive' : ''}`}
                      onClick={() => setSelected(isSelected ? null : uid)}
                    >
                      <div className="admin-info">
                        <div className="admin-avatar">
                          {user.role === 'admin' ? <FiShield /> : <FiUser />}
                        </div>
                        <div className="admin-details">
                          <h4 className="admin-name">{user.name}</h4>
                          <p className="admin-email">{user.email}</p>
                          <p className="admin-phone">{user.phone}</p>
                        </div>
                      </div>
                      <div className="admin-meta">
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                        <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                        {isSuspended && (
                          <span className="status-badge suspended">
                            Suspended
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="admin-expanded">
                        <div className="expanded-content">
                          <div className="permissions-section">
                            <h4 className="expanded-title">Permissions</h4>
                            {isSuspended && (
                              <div className="suspension-notice">
                                <FiClock />
                                Suspended until {new Date(user.suspendedUntil).toLocaleString()}
                              </div>
                            )}
                            {renderDetailedPermissions(user.permissions)}
                          </div>
                          
                          <div className="actions-section">
                            <h4 className="expanded-title">Actions</h4>
                            <div className="action-buttons">
                              <button
                                className={`action-btn ${user.active ? 'deactivate' : 'activate'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleActivation(uid, user.active);
                                }}
                              >
                                {user.active ? 'Deactivate' : 'Activate'}
                              </button>
                              
                              <button
                                className="action-btn edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditForm({ ...user, password: '' });
                                  setEditMode(true);
                                  setSelected(uid);
                                }}
                              >
                                <FiEdit3 />
                                Edit
                              </button>

                              <div className="suspend-controls">
                                <button
                                  className="action-btn suspend"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSuspendMode(suspendMode === uid ? null : uid);
                                  }}
                                >
                                  <FiClock />
                                  Suspend
                                </button>
                                
                                {suspendMode === uid && (
                                  <div className="suspend-form" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="number"
                                      className="suspend-input"
                                      value={customSuspendValue}
                                      onChange={(e) => setCustomSuspendValue(e.target.value)}
                                      min="1"
                                      placeholder="Duration"
                                    />
                                    <select
                                      className="suspend-select"
                                      value={customSuspendUnit}
                                      onChange={(e) => setCustomSuspendUnit(e.target.value)}
                                    >
                                      <option value="hours">Hours</option>
                                      <option value="days">Days</option>
                                      <option value="months">Months</option>
                                      <option value="years">Years</option>
                                    </select>
                                    <button
                                      className="suspend-confirm"
                                      onClick={() => suspendAccount(uid)}
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="modal-overlay" onClick={() => { setEditMode(false); setSelected(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FiEdit3 />
                Edit Administrator
              </h3>
              <button className="modal-close" onClick={() => { setEditMode(false); setSelected(null); }}>
                <FiX />
              </button>
            </div>

            <div className="modal-content">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <FiUser className="label-icon" />
                    Full Name
                  </label>
                  <input
                    className="form-input"
                    value={editForm?.name || ''}
                    onChange={(e) => handleChange('name', e.target.value, true)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiMail className="label-icon" />
                    Email
                  </label>
                  <input
                    className="form-input"
                    type="email"
                    value={editForm?.email || ''}
                    onChange={(e) => handleChange('email', e.target.value, true)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiPhone className="label-icon" />
                    Phone
                  </label>
                  <input
                    className="form-input"
                    value={editForm?.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value, true)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <FiShield className="label-icon" />
                    Role
                  </label>
                  <div className="role-selector">
                    <button
                      type="button"
                      className={`role-option ${editForm?.role === 'admin' ? 'selected' : ''}`}
                      onClick={() => handleChange('role', 'admin', true)}
                    >
                      <FiShield />
                      Admin
                    </button>
                    <button
                      type="button"
                      className={`role-option ${editForm?.role === 'subadmin' ? 'selected' : ''}`}
                      onClick={() => handleChange('role', 'subadmin', true)}
                    >
                      <FiUser />
                      Sub-Admin
                    </button>
                  </div>
                </div>
              </div>

              <div className="permissions-section">
                <h3 className="section-title">
                  <FiSettings className="section-icon" />
                  Permissions
                </h3>
                <div className="permissions-accordion">
                  {MODULES.map((module) => (
                    <div key={module} className="accordion-item">
                      <div
                        className="accordion-header"
                        onClick={() => setExpandedModule(expandedModule === module ? null : module)}
                      >
                        <span className="accordion-title">
                          {module.charAt(0).toUpperCase() + module.slice(1).replace('-', ' ')}
                        </span>
                        <span className="accordion-icon">
                          {expandedModule === module ? <FiChevronUp /> : <FiChevronDown />}
                        </span>
                      </div>
                      {expandedModule === module && (
                        <div className="accordion-content">
                          <div className="permission-checkboxes">
                            {['read', 'write', 'delete', 'add'].map((permType) => (
                              <div
                                key={permType}
                                className="permission-checkbox"
                                onClick={() => handlePermissionChange(module, permType, true)}
                              >
                                <span className={`checkbox ${editForm?.permissions?.[module]?.[permType] ? 'checked' : ''}`}>
                                  {editForm?.permissions?.[module]?.[permType] && <FiCheck />}
                                </span>
                                <span className="checkbox-label">{permType}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className={`btn btn-primary ${loading ? 'loading' : ''}`}
                  onClick={handleEditSubmit}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setEditMode(false); setSelected(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className={`toast ${msgType}`}>
          <div className="toast-icon">
            {msgType === 'success' ? <FiCheck /> : <FiX />}
          </div>
          <span className="toast-message">{message}</span>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .admin-page-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
          padding: 1rem;
          overflow-x: hidden;
        }

        /* Header */
        .page-header {
          text-align: center;
          margin-bottom: 2rem;
          padding: 0 1rem;
        }

        .header-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .page-title {
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .title-icon {
          color: #3b82f6;
          font-size: clamp(1.5rem, 4vw, 2.25rem);
          flex-shrink: 0;
        }

        .page-subtitle {
          color: #64748b;
          font-size: clamp(1rem, 3vw, 1.125rem);
          font-weight: 400;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          padding: 0 0.5rem;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 1.75rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid #e2e8f0;
          cursor: pointer;
          position: relative;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.15);
          border-color: #cbd5e1;
        }

        .stat-card.selected {
          border-color: #3b82f6;
          box-shadow: 0 8px 25px -8px rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
        }

        .stat-card.admin .stat-icon { 
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }
        .stat-card.subadmin .stat-icon { 
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }
        .stat-card.active .stat-icon { 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        .stat-card.inactive .stat-icon { 
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        .stat-info {
          flex: 1;
          min-width: 0;
        }

        .stat-number {
          font-size: clamp(1.75rem, 4vw, 2.25rem);
          font-weight: 800;
          color: #0f172a;
          line-height: 1;
          margin-bottom: 0.375rem;
        }

        .stat-label {
          font-size: 0.9375rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.075em;
        }

        .card-chevron {
          color: #64748b;
          font-size: 1.25rem;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }

        .stat-card.selected .card-chevron {
          transform: rotate(180deg);
        }

        /* Card Details View */
        .card-details-view {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          margin-bottom: 2rem;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
          overflow: hidden;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card-details-header {
          padding: 2rem 2.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-details-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .card-details-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.875rem;
          border-radius: 10px;
          transition: all 0.2s ease;
          font-size: 1.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-details-close:hover {
          background: rgba(248, 250, 252, 0.8);
          color: #374151;
          transform: rotate(90deg);
        }

        .card-details-content {
          padding: 2.5rem;
        }

        .card-users-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.75rem;
        }

        .card-user-item {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 2rem;
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .card-user-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }

        .card-user-item:hover {
          background: white;
          border-color: #cbd5e1;
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.1);
        }

        .card-user-item:hover::before {
          transform: scaleX(1);
        }

        .card-user-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.375rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.3);
        }

        .card-user-info {
          flex: 1;
          min-width: 0;
        }

        .card-user-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.625rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-user-email {
          font-size: 0.9375rem;
          color: #64748b;
          margin-bottom: 0.375rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .card-user-phone {
          font-size: 0.9375rem;
          color: #64748b;
          margin-bottom: 1.125rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .card-user-meta {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .card-user-badges {
          display: flex;
          gap: 0.625rem;
          flex-wrap: wrap;
        }

        .created-date {
          font-size: 0.8125rem;
          color: #94a3b8;
          font-weight: 600;
          background: #f1f5f9;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .card-empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .card-empty-state .empty-icon {
          font-size: 4.5rem;
          color: #cbd5e1;
          margin-bottom: 1.5rem;
        }

        .card-empty-state h3 {
          font-size: 1.375rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .card-empty-state p {
          margin: 0;
          font-size: 1.0625rem;
          font-weight: 500;
        }

        /* Main Content */
        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          padding: 0 0.5rem;
        }

        .content-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .card-header {
          padding: 2rem 2.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .card-title {
          font-size: clamp(1.25rem, 3vw, 1.625rem);
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .card-icon {
          color: #3b82f6;
          font-size: 1.375rem;
          flex-shrink: 0;
        }

        /* Search */
        .search-container {
          position: relative;
          width: 100%;
          max-width: 320px;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 1.125rem;
          z-index: 2;
        }

        .search-input {
          width: 100%;
          padding: 0.875rem 1.25rem 0.875rem 3rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9375rem;
          outline: none;
          background: white;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-input::placeholder {
          color: #94a3b8;
        }

        /* Form */
        .form-container {
          padding: 2.5rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          margin-bottom: 2.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-label {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.075em;
        }

        .label-icon {
          color: #3b82f6;
          font-size: 1rem;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9375rem;
          outline: none;
          background: white;
          transition: all 0.2s ease;
          font-family: inherit;
          font-weight: 500;
        }

        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .form-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        /* Password Input */
        .password-input-container {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 1.125rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.625rem;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle:hover {
          color: #3b82f6;
          background: #f1f5f9;
        }

        /* Role Selector */
        .role-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .role-option {
          padding: 1.25rem 1.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          font-size: 0.9375rem;
          min-height: 3.5rem;
        }

        .role-option:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #f8faff;
          transform: translateY(-1px);
        }

        .role-option.selected {
          border-color: #3b82f6;
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.3);
        }

        /* Permissions Section */
        .permissions-section {
          margin-top: 2.5rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-icon {
          color: #3b82f6;
        }

        .permissions-accordion {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }

        .accordion-item {
          border-bottom: 1px solid #e2e8f0;
        }

        .accordion-item:last-child {
          border-bottom: none;
        }

        .accordion-header {
          padding: 1.25rem 1.5rem;
          background: #f8fafc;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s ease;
        }

        .accordion-header:hover {
          background: #f1f5f9;
        }

        .accordion-title {
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
          font-size: 0.9375rem;
        }

        .accordion-icon {
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .accordion-content {
          padding: 1.5rem;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .permission-checkboxes {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1.25rem;
        }

        .permission-checkbox {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.75rem;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .permission-checkbox:hover {
          background: #f8fafc;
        }

        .checkbox {
          width: 1.375rem;
          height: 1.375rem;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .checkbox.checked {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          box-shadow: 0 2px 4px -1px rgba(59, 130, 246, 0.3);
        }

        .checkbox-label {
          font-size: 0.8125rem;
          color: #374151;
          font-weight: 600;
          text-transform: capitalize;
        }

        /* Buttons */
        .btn {
          padding: 1rem 2rem;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          text-decoration: none;
          outline: none;
          white-space: nowrap;
          min-height: 3.25rem;
          letter-spacing: 0.025em;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border-color: transparent;
          box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
          background: white;
          color: #64748b;
          border-color: #cbd5e1;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          color: #374151;
          transform: translateY(-1px);
        }

        .btn:disabled,
        .btn.loading {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2.5rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        /* Admin List */
        .admin-list {
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .admin-item {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .admin-item:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .admin-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .admin-card:hover {
          background: #f8fafc;
        }

        .admin-card.selected {
          background: #f0f9ff;
          border-color: #0ea5e9;
        }

        .admin-card.inactive {
          opacity: 0.6;
        }

        .admin-info {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex: 1;
          min-width: 0;
        }

        .admin-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px -2px rgba(59, 130, 246, 0.3);
        }

        .admin-details {
          flex: 1;
          min-width: 0;
        }

        .admin-name {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 0.375rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-email,
        .admin-phone {
          font-size: 0.8125rem;
          color: #64748b;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }

        .admin-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.625rem;
          flex-shrink: 0;
        }

        .role-badge,
        .status-badge {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.075em;
        }

        .role-badge.admin {
          background: linear-gradient(135deg, #ede9fe, #ddd6fe);
          color: #7c3aed;
          border: 1px solid #d8b4fe;
        }

        .role-badge.subadmin {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1d4ed8;
          border: 1px solid #93c5fd;
        }

        .status-badge.active {
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          color: #065f46;
          border: 1px solid #6ee7b7;
        }

        .status-badge.inactive {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          border: 1px solid #f87171;
        }

        .status-badge.suspended {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          border: 1px solid #f59e0b;
        }

        /* Expanded Content */
        .admin-expanded {
          border-top: 1px solid #e2e8f0;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .expanded-content {
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
        }

        .expanded-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 1.25rem;
        }

        /* Permissions Grid */
        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .permission-module {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1.25rem;
          transition: all 0.2s ease;
        }

        .permission-module:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .permission-module-title {
          font-weight: 700;
          color: #374151;
          margin-bottom: 1rem;
          text-transform: capitalize;
          font-size: 0.9375rem;
        }

        .permission-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
        }

        .permission-tag {
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          border: 1px solid;
        }

        .permission-tag.read { 
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af; 
          border-color: #93c5fd;
        }
        .permission-tag.write { 
          background: linear-gradient(135deg, #dcfce7, #a7f3d0);
          color: #166534; 
          border-color: #6ee7b7;
        }
        .permission-tag.delete { 
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b; 
          border-color: #f87171;
        }
        .permission-tag.add { 
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e; 
          border-color: #f59e0b;
        }

        .no-permissions {
          color: #64748b;
          font-style: italic;
          text-align: center;
          padding: 2rem;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .action-btn {
          padding: 1rem 1.5rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          white-space: nowrap;
          min-height: 3rem;
          letter-spacing: 0.025em;
        }

        .action-btn.activate {
          background: linear-gradient(135deg, #dcfce7, #a7f3d0);
          color: #166534;
          border-color: #bbf7d0;
        }

        .action-btn.activate:hover {
          background: linear-gradient(135deg, #bbf7d0, #86efac);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -4px rgba(34, 197, 94, 0.3);
        }

        .action-btn.deactivate {
          background: linear-gradient(135deg, #fee2e2, #fecaca);
          color: #991b1b;
          border-color: #fecaca;
        }

        .action-btn.deactivate:hover {
          background: linear-gradient(135deg, #fecaca, #f87171);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -4px rgba(239, 68, 68, 0.3);
        }

        .action-btn.edit {
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          color: #1e40af;
          border-color: #bfdbfe;
        }

        .action-btn.edit:hover {
          background: linear-gradient(135deg, #bfdbfe, #93c5fd);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -4px rgba(59, 130, 246, 0.3);
        }

        .action-btn.suspend {
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          color: #92400e;
          border-color: #fde68a;
        }

        .action-btn.suspend:hover {
          background: linear-gradient(135deg, #fde68a, #facc15);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -4px rgba(245, 158, 11, 0.3);
        }

        /* Suspend Controls */
        .suspend-controls {
          position: relative;
        }

        .suspend-form {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.75rem;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          z-index: 10;
          min-width: 220px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .suspend-input,
        .suspend-select {
          padding: 0.875rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .suspend-input:focus,
        .suspend-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          outline: none;
        }

        .suspend-confirm {
          padding: 0.875rem 1.25rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 2.75rem;
        }

        .suspend-confirm:hover {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -4px rgba(239, 68, 68, 0.4);
        }

        .suspension-notice {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border: 1px solid #f59e0b;
          border-radius: 8px;
          color: #92400e;
          font-size: 0.8125rem;
          margin-bottom: 1.25rem;
          font-weight: 600;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 4rem;
          color: #cbd5e1;
          margin-bottom: 1.5rem;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 500;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1.25rem;
          backdrop-filter: blur(8px);
        }

        .modal {
          background: white;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          padding: 2rem 2.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .modal-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.875rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 1.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background: rgba(248, 250, 252, 0.8);
          color: #374151;
          transform: rotate(90deg);
        }

        .modal-content {
          padding: 2.5rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2.5rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }

        /* Toast Messages */
        .toast {
          position: fixed;
          top: 1.25rem;
          right: 1.25rem;
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          z-index: 2000;
          display: flex;
          align-items: center;
          gap: 1rem;
          max-width: 400px;
          animation: toastSlideIn 0.3s ease-out;
          font-size: 0.9375rem;
          backdrop-filter: blur(8px);
        }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .toast.success {
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .toast.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .toast-icon {
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .expanded-content {
            grid-template-columns: 1fr;
          }
          
          .permissions-grid {
            grid-template-columns: 1fr;
          }

          .card-users-grid {
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          }
        }

        @media (max-width: 768px) {
          .admin-page-container {
            padding: 0.75rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .stat-card {
            padding: 1.25rem;
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .stat-icon {
            width: 3rem;
            height: 3rem;
            font-size: 1.25rem;
          }

          .card-chevron {
            position: absolute;
            top: 1rem;
            right: 1rem;
          }

          .card-header {
            padding: 1.5rem 2rem;
            flex-direction: column;
            gap: 1.25rem;
            align-items: stretch;
          }

          .card-details-header {
            padding: 1.5rem 2rem;
          }

          .card-details-content {
            padding: 2rem;
          }

          .search-container {
            max-width: none;
          }

          .form-container,
          .admin-list {
            padding: 2rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .role-selector {
            grid-template-columns: 1fr;
          }

          .permission-checkboxes {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .form-actions,
          .modal-actions {
            flex-direction: column-reverse;
          }

          .admin-card {
            flex-direction: column;
            align-items: stretch;
            gap: 1.25rem;
          }

          .admin-info {
            justify-content: center;
            text-align: center;
          }

          .admin-meta {
            flex-direction: row;
            justify-content: center;
            flex-wrap: wrap;
          }

          .modal {
            margin: 0.75rem;
            max-height: calc(100vh - 1.5rem);
          }

          .modal-header,
          .modal-content {
            padding: 2rem;
          }

          .toast {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }

          .action-buttons {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .action-btn {
            flex: 1;
            min-width: 0;
          }

          .card-users-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .admin-page-container {
            padding: 0.5rem;
          }

          .page-header {
            margin-bottom: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .stat-card {
            flex-direction: row;
            text-align: left;
            padding: 1rem;
          }

          .card-chevron {
            position: static;
          }

          .card-header {
            padding: 1.25rem;
          }

          .card-details-header {
            padding: 1.25rem;
          }

          .card-details-content {
            padding: 1.5rem;
          }

          .form-container,
          .admin-list {
            padding: 1.5rem;
          }

          .permission-checkboxes {
            grid-template-columns: 1fr;
          }

          .modal-header,
          .modal-content {
            padding: 1.5rem;
          }

          .suspend-form {
            position: relative;
            right: auto;
            margin-top: 0.75rem;
            width: 100%;
          }

          .action-buttons {
            flex-direction: column;
          }

          .action-btn {
            flex: none;
          }
        }

        @media (max-width: 360px) {
          .admin-page-container {
            padding: 0.25rem;
          }
          
          .modal {
            margin: 0.5rem;
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default AddAdminPage;
