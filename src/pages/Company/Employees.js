import React, { useState, useEffect } from 'react';
import { ref, push, onValue, set, remove } from 'firebase/database';
import { db } from '../../firebase/config';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaTimes, 
  FaUser, 
  FaPhone, 
  FaEnvelope, 
  FaIdCard,
  FaBriefcase,
  FaCalendar,
  FaClock,
  FaUniversity,
  FaBars
} from 'react-icons/fa';

function Employees() {
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    aadhar: '',
    role: '',
    joiningDate: '',
    shift: '',
    salaryAccount: {
      accountNo: '',
      ifscCode: '',
      bankName: ''
    }
  });

  const [employees, setEmployees] = useState({});
  const [filteredEmployees, setFilteredEmployees] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
    if (isFormVisible) {
      resetForm();
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      mobile: '',
      email: '',
      aadhar: '',
      role: '',
      joiningDate: '',
      shift: '',
      salaryAccount: {
        accountNo: '',
        ifscCode: '',
        bankName: ''
      }
    });
    setEditingId(null);
    setErrors({});
  };

  const closeDetails = () => setSelectedEmployee(null);

  // Validation functions
  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          error = 'Name can only contain letters and spaces';
        }
        break;
        
      case 'mobile':
        if (!value) {
          error = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(value)) {
          error = 'Mobile number must be exactly 10 digits';
        }
        break;
        
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'aadhar':
        if (!value) {
          error = 'Aadhar number is required';
        } else if (!/^\d{12}$/.test(value)) {
          error = 'Aadhar number must be exactly 12 digits';
        }
        break;
        
      case 'role':
        if (!value) {
          error = 'Role is required';
        }
        break;
        
      case 'joiningDate':
        if (!value) {
          error = 'Joining date is required';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(23, 59, 59, 999); // End of today
          if (selectedDate > today) {
            error = 'Joining date cannot be in the future';
          }
        }
        break;
        
      case 'bankName':
        if (!value.trim()) {
          error = 'Bank name is required';
        } else if (value.trim().length < 2) {
          error = 'Bank name must be at least 2 characters';
        }
        break;
        
      case 'accountNo':
        if (!value) {
          error = 'Account number is required';
        } else if (!/^\d{9,18}$/.test(value)) {
          error = 'Account number must be 9-18 digits';
        }
        break;
        
      case 'ifscCode':
        if (!value) {
          error = 'IFSC code is required';
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) {
          error = 'Invalid IFSC code format (e.g., SBIN0001234)';
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };

  // Input formatters
  const formatInput = (name, value) => {
    switch (name) {
      case 'mobile':
        // Only allow digits, max 10
        return value.replace(/\D/g, '').slice(0, 10);
        
      case 'aadhar':
        // Only allow digits, max 12
        return value.replace(/\D/g, '').slice(0, 12);
        
      case 'accountNo':
        // Only allow digits, max 18
        return value.replace(/\D/g, '').slice(0, 18);
        
      case 'ifscCode':
        // Convert to uppercase, only alphanumeric, max 11
        return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
        
      case 'name':
      case 'bankName':
        // Only allow letters and spaces, trim multiple spaces
        return value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
        
      default:
        return value;
    }
  };

  useEffect(() => {
    const cachedEmployees = localStorage.getItem('htamsEmployees');
    if (cachedEmployees) {
      const parsed = JSON.parse(cachedEmployees);
      setEmployees(parsed);
      setFilteredEmployees(parsed);
    }

    const employeeRef = ref(db, 'HTAMS/company/Employees/');
    const unsubscribe = onValue(
      employeeRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setEmployees(data);
          setFilteredEmployees(data);
          localStorage.setItem('htamsEmployees', JSON.stringify(data));
        } else {
          setEmployees({});
          setFilteredEmployees({});
          localStorage.removeItem('htamsEmployees');
        }
      },
      (error) => {
        console.error('Firebase error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = formatInput(name, value);
    
    if (['accountNo', 'ifscCode', 'bankName'].includes(name)) {
      setForm((prev) => ({
        ...prev,
        salaryAccount: {
          ...prev.salaryAccount,
          [name]: formattedValue
        }
      }));
      
      // Validate and set error for salary account fields
      const error = validateField(name, formattedValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: formattedValue
      }));
      
      // Validate and set error for regular fields
      const error = validateField(name, formattedValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate all fields
    Object.keys(form).forEach(key => {
      if (key === 'salaryAccount') {
        Object.keys(form.salaryAccount).forEach(subKey => {
          const error = validateField(subKey, form.salaryAccount[subKey]);
          if (error) newErrors[subKey] = error;
        });
      } else {
        const error = validateField(key, form[key]);
        if (error) newErrors[key] = error;
      }
    });
    
    // Check for duplicate mobile and aadhar
    const existingEmployees = Object.entries(employees);
    
    // Check mobile duplication
    const mobileExists = existingEmployees.find(([id, emp]) => 
      emp.mobile === form.mobile && (!editingId || id !== editingId)
    );
    if (mobileExists) {
      newErrors.mobile = 'This mobile number is already registered';
    }
    
    // Check aadhar duplication
    const aadharExists = existingEmployees.find(([id, emp]) => 
      emp.aadhar === form.aadhar && (!editingId || id !== editingId)
    );
    if (aadharExists) {
      newErrors.aadhar = 'This Aadhar number is already registered';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fix all validation errors before submitting');
      return;
    }
    
    setLoading(true);

    const employeeRef = editingId
      ? ref(db, `HTAMS/company/Employees/${editingId}`)
      : ref(db, 'HTAMS/company/Employees/');

    const action = editingId ? set : push;

    try {
      await action(employeeRef, form);
      alert(editingId ? 'Employee updated successfully!' : 'Employee added successfully!');
      localStorage.removeItem('htamsEmployees');
      resetForm();
      setIsFormVisible(false);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id, emp) => {
    setForm(emp);
    setEditingId(id);
    setIsFormVisible(true);
    setErrors({});
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete employee: ${name}?`)) {
      setLoading(true);
      const employeeRef = ref(db, `HTAMS/company/Employees/${id}`);
      try {
        await remove(employeeRef);
        alert(`Employee ${name} deleted successfully!`);
        localStorage.removeItem('htamsEmployees');
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRowClick = (emp) => {
    setSelectedEmployee(emp);
  };

  const handleSearch = () => {
    const query = searchQuery.toLowerCase();
    const filtered = Object.entries(employees).reduce((acc, [id, emp]) => {
      const nameMatch = emp.name.toLowerCase().includes(query);
      const mobileMatch = emp.mobile.includes(query);
      const roleMatch = emp.role.toLowerCase().includes(query);
      if (nameMatch || mobileMatch || roleMatch) {
        acc[id] = emp;
      }
      return acc;
    }, {});
    setFilteredEmployees(filtered);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredEmployees(employees);
  };

  return (
    <div className="employee-management">
      <div className="page-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="page-title">
              <FaUser className="page-icon" />
              Employee Management
            </h1>
            <p className="page-subtitle">Manage your team members and their information</p>
          </div>
          <div className="header-right">
            <div className="total-employees-card">
              <div className="total-employees-number">{Object.keys(employees).length}</div>
              <div className="total-employees-label">TOTAL EMPLOYEES</div>
            </div>
          </div>
        </div>
      </div>

      {isFormVisible && (
        <div className="form-container">
          <div className="form-header">
            <h2 className="form-title">
              {editingId ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button onClick={toggleForm} className="close-btn">
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="employee-form">
            <div className="form-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    <FaUser className="label-icon" />
                    Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="mobile" className="form-label">
                    <FaPhone className="label-icon" />
                    Mobile Number *
                  </label>
                  <input
                    id="mobile"
                    type="tel"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    required
                    className={`form-input ${errors.mobile ? 'error' : ''}`}
                  />
                  {errors.mobile && <span className="error-message">{errors.mobile}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <FaEnvelope className="label-icon" />
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="aadhar" className="form-label">
                    <FaIdCard className="label-icon" />
                    Aadhar Number *
                  </label>
                  <input
                    id="aadhar"
                    type="text"
                    name="aadhar"
                    value={form.aadhar}
                    onChange={handleChange}
                    placeholder="12-digit Aadhar number"
                    required
                    className={`form-input ${errors.aadhar ? 'error' : ''}`}
                  />
                  {errors.aadhar && <span className="error-message">{errors.aadhar}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Job Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="role" className="form-label">
                    <FaBriefcase className="label-icon" />
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                    className={`form-input ${errors.role ? 'error' : ''}`}
                  >
                    <option value="">Select Role</option>
                    <option value="Technician">Technician</option>
                    <option value="Sales">Sales</option>
                    <option value="Service">Service</option>
                    <option value="Admin">Admin</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Manager">Manager</option>
                  </select>
                  {errors.role && <span className="error-message">{errors.role}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="joiningDate" className="form-label">
                    <FaCalendar className="label-icon" />
                    Joining Date *
                  </label>
                  <input
                    id="joiningDate"
                    type="date"
                    name="joiningDate"
                    value={form.joiningDate}
                    onChange={handleChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className={`form-input ${errors.joiningDate ? 'error' : ''}`}
                  />
                  {errors.joiningDate && <span className="error-message">{errors.joiningDate}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="shift" className="form-label">
                    <FaClock className="label-icon" />
                    Shift/Working Time
                  </label>
                  <input
                    id="shift"
                    type="text"
                    name="shift"
                    value={form.shift}
                    onChange={handleChange}
                    placeholder="e.g., 9 AM - 6 PM"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Bank Details</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="bankName" className="form-label">
                    <FaUniversity className="label-icon" />
                    Bank Name *
                  </label>
                  <input
                    id="bankName"
                    type="text"
                    name="bankName"
                    value={form.salaryAccount.bankName}
                    onChange={handleChange}
                    placeholder="Enter bank name"
                    required
                    className={`form-input ${errors.bankName ? 'error' : ''}`}
                  />
                  {errors.bankName && <span className="error-message">{errors.bankName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="accountNo" className="form-label">
                    Account Number *
                  </label>
                  <input
                    id="accountNo"
                    type="text"
                    name="accountNo"
                    value={form.salaryAccount.accountNo}
                    onChange={handleChange}
                    placeholder="Enter account number (9-18 digits)"
                    required
                    className={`form-input ${errors.accountNo ? 'error' : ''}`}
                  />
                  {errors.accountNo && <span className="error-message">{errors.accountNo}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="ifscCode" className="form-label">
                    IFSC Code *
                  </label>
                  <input
                    id="ifscCode"
                    type="text"
                    name="ifscCode"
                    value={form.salaryAccount.ifscCode}
                    onChange={handleChange}
                    placeholder="e.g., SBIN0001234"
                    required
                    className={`form-input ${errors.ifscCode ? 'error' : ''}`}
                  />
                  {errors.ifscCode && <span className="error-message">{errors.ifscCode}</span>}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={toggleForm} 
                className="secondary-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="primary-btn"
                disabled={loading}
              >
                {loading ? 'Saving...' : (editingId ? 'Update Employee' : 'Add Employee')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="content-container">
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, or role..."
                className="search-input"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchQuery && (
                <button onClick={clearSearch} className="clear-btn">
                  <FaTimes />
                </button>
              )}
            </div>
            <button onClick={handleSearch} className="search-btn">
              Search
            </button>
            <button onClick={toggleForm} className="primary-btn add-btn">
              <FaPlus className="btn-icon" />
              <span className="btn-text">{isFormVisible ? 'Cancel' : 'Add Employee'}</span>
            </button>
          </div>
        </div>

        <div className="table-section">
          <div className="table-header">
            <h3 className="table-title">All Employees ({Object.keys(filteredEmployees).length})</h3>
          </div>
          
          {/* Mobile Card View */}
          <div className="mobile-cards">
            {Object.entries(filteredEmployees).map(([id, emp]) => (
              <div key={id} className="employee-card" onClick={() => handleRowClick(emp)}>
                <div className="card-header">
                  <div className="employee-info">
                    <div className="employee-name">{emp.name}</div>
                    <div className="employee-id">ID: {emp.aadhar}</div>
                  </div>
                  <span className={`role-badge ${emp.role.toLowerCase()}`}>
                    {emp.role.toUpperCase()}
                  </span>
                </div>
                <div className="card-body">
                  <div className="contact-info">
                    <div className="contact-item">
                      <FaPhone className="contact-icon" />
                      <span>{emp.mobile}</span>
                    </div>
                    <div className="contact-item">
                      <FaEnvelope className="contact-icon" />
                      <span>{emp.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="employment-info">
                    <div className="info-item">
                      <FaCalendar className="info-icon" />
                      <span>{new Date(emp.joiningDate).toLocaleDateString()}</span>
                    </div>
                    <div className="info-item">
                      <FaClock className="info-icon" />
                      <span>{emp.shift || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(emp);
                    }}
                    title="View Employee"
                  >
                    👁️
                  </button>
                  <button
                    className="action-btn edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(id, emp);
                    }}
                    title="Edit Employee"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(id, emp.name);
                    }}
                    title="Delete Employee"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>ROLE</th>
                  <th>CONTACT</th>
                  <th>JOINING DATE</th>
                  <th>SHIFT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredEmployees).map(([id, emp]) => (
                  <tr key={id} onClick={() => handleRowClick(emp)} className="employee-row">
                    <td className="name-cell">
                      <div className="employee-info">
                        <div className="employee-name">{emp.name}</div>
                        <div className="employee-id">ID: {emp.aadhar}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${emp.role.toLowerCase()}`}>
                        {emp.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="contact-cell">
                      <div className="contact-info">
                        <div className="phone">📞 {emp.mobile}</div>
                        <div className="email">📧 {emp.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td>{new Date(emp.joiningDate).toLocaleDateString()}</td>
                    <td>{emp.shift || 'N/A'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(emp);
                          }}
                          title="View Employee"
                        >
                          👁️
                        </button>
                        <button
                          className="action-btn edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(id, emp);
                          }}
                          title="Edit Employee"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(id, emp.name);
                          }}
                          title="Delete Employee"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {Object.keys(filteredEmployees).length === 0 && (
            <div className="empty-state">
              <FaUser className="empty-icon" />
              <h3>No employees found</h3>
              <p>Try adjusting your search criteria or add a new employee.</p>
            </div>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Employee Details</h3>
              <button onClick={closeDetails} className="modal-close-btn">
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="employee-info-grid">
                <div className="info-section">
                  <h4>Personal Information</h4>
                  <div className="info-item">
                    <FaUser className="info-icon" />
                    <div>
                      <span className="info-label">Name</span>
                      <span className="info-value">{selectedEmployee.name}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaPhone className="info-icon" />
                    <div>
                      <span className="info-label">Mobile</span>
                      <span className="info-value">{selectedEmployee.mobile}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaEnvelope className="info-icon" />
                    <div>
                      <span className="info-label">Email</span>
                      <span className="info-value">{selectedEmployee.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaIdCard className="info-icon" />
                    <div>
                      <span className="info-label">Aadhar</span>
                      <span className="info-value">{selectedEmployee.aadhar}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Job Information</h4>
                  <div className="info-item">
                    <FaBriefcase className="info-icon" />
                    <div>
                      <span className="info-label">Role</span>
                      <span className="info-value">{selectedEmployee.role}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaCalendar className="info-icon" />
                    <div>
                      <span className="info-label">Joining Date</span>
                      <span className="info-value">
                        {new Date(selectedEmployee.joiningDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaClock className="info-icon" />
                    <div>
                      <span className="info-label">Shift</span>
                      <span className="info-value">{selectedEmployee.shift || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Bank Details</h4>
                  <div className="info-item">
                    <FaUniversity className="info-icon" />
                    <div>
                      <span className="info-label">Bank Name</span>
                      <span className="info-value">
                        {selectedEmployee.salaryAccount?.bankName || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div>
                      <span className="info-label">Account Number</span>
                      <span className="info-value">
                        {selectedEmployee.salaryAccount?.accountNo || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div>
                      <span className="info-label">IFSC Code</span>
                      <span className="info-value">
                        {selectedEmployee.salaryAccount?.ifscCode || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

<style jsx>{`
  /* Base and layout */
  .employee-management {
    background-color: #f0f4ff;
    min-height: 100vh;
    padding: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #223344;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .page-header {
    background: #f0f4ff;
    padding: 1.25rem 1.25rem 2.5rem;
    color: #223344;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid #d1d9f2;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .header-left {
    flex: 1 1 280px;
    min-width: 0;
  }

  .page-title {
    font-size: clamp(1.75rem, 4vw, 2.25rem);
    font-weight: 800;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    color: #1a202c;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.07);
  }

  .page-icon {
    font-size: clamp(1.5rem, 3vw, 1.75rem);
    color: #4f67f5;
  }

  .page-subtitle {
    font-size: clamp(1rem, 2.5vw, 1.125rem);
    color: #4a5568;
    margin: 0.6rem 0 0 0;
    font-weight: 500;
    letter-spacing: 0.015em;
  }

  .header-right {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 160px;
  }

  .total-employees-card {
    background: linear-gradient(135deg, #4f67f5 0%, #6a88ff 100%);
    color: white;
    padding: 1.25rem 2rem;
    border-radius: 14px;
    text-align: center;
    min-width: 160px;
    box-shadow: 0 12px 28px rgba(79, 103, 245, 0.35);
    user-select: none;
    font-feature-settings: "tnum";
  }

  .total-employees-number {
    font-size: clamp(2rem, 6vw, 3rem);
    font-weight: 900;
    margin: 0;
    line-height: 1;
    letter-spacing: 0.03em;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  .total-employees-label {
    font-size: clamp(0.8rem, 2.25vw, 1rem);
    font-weight: 700;
    margin: 0.6rem 0 0 0;
    opacity: 0.95;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Segoe UI Black', 'Arial Black', Arial, sans-serif;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  /* Buttons */
  .primary-btn,
  .secondary-btn {
    border-radius: 10px;
    font-size: clamp(1rem, 2.5vw, 1.05rem);
    font-weight: 700;
    cursor: pointer;
    padding: 0.85rem 1.4rem;
    transition: background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    white-space: nowrap;
    user-select: none;
  }

  .primary-btn {
    background: linear-gradient(135deg, #4f67f5 0%, #7686ff 100%);
    color: white;
    border: none;
    box-shadow: 0 6px 18px rgba(79, 103, 245, 0.45);
    outline-offset: 3px;
  }

  .primary-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #4861e6, #667aff);
    box-shadow: 0 8px 24px rgba(79, 103, 245, 0.6);
    transform: translateY(-2px);
  }

  .primary-btn:focus-visible {
    outline: 3px solid #9baafb;
    outline-offset: 3px;
  }

  .secondary-btn {
    background: #e8ebff;
    color: #4a5568;
    border: 2.5px solid #b7bdff;
    font-weight: 600;
    box-shadow: none;
    outline-offset: 2px;
  }

  .secondary-btn:hover:not(:disabled) {
    background: #c4caff;
    color: #333;
    border-color: #9aaaff;
    box-shadow: 0 0 8px 2px rgba(93, 103, 255, 0.35);
  }

  .secondary-btn:focus-visible {
    outline: 3px solid #a3b3ff;
    outline-offset: 2px;
  }

  .primary-btn:disabled,
  .secondary-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-icon {
    font-size: 1rem;
    flex-shrink: 0;
    user-select: none;
    pointer-events: none;
    color: inherit;
  }

  .btn-text {
    display: inline;
  }

  /* Form container */
  .form-container {
    background: white;
    margin: -1.25rem 1.25rem 1.5rem;
    border-radius: 16px;
    box-shadow: 0 18px 44px rgba(34, 50, 68, 0.12);
    position: relative;
    z-index: 2;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.75rem 2rem 1rem;
    border-bottom: 1px solid #d1d9f2;
    margin-bottom: 1.5rem;
  }

  .form-title {
    font-size: clamp(1.45rem, 3vw, 1.75rem);
    font-weight: 800;
    color: #1a202c;
    margin: 0;
    letter-spacing: 0.02em;
  }

  .close-btn {
    background: #f2f6ff;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #657ea3;
    transition: background-color 0.25s ease, color 0.25s ease;
    flex-shrink: 0;
  }

  .close-btn:hover,
  .close-btn:focus-visible {
    background: #dbe7ff;
    color: #3a4a7e;
    outline: none;
  }

  /* Form styles */
  .employee-form {
    padding: 0 2rem 2rem;
  }

  .form-section {
    margin-bottom: 2.5rem;
  }

  .section-title {
    font-size: clamp(1.2rem, 2.5vw, 1.35rem);
    font-weight: 700;
    color: #1a202c;
    margin: 0 0 1.15rem 0;
    padding-bottom: 0.6rem;
    border-bottom: 3px solid #e3e9fe;
    letter-spacing: 0.03em;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.2rem 2rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-label {
    font-size: 0.95rem;
    font-weight: 700;
    color: #344054;
    margin-bottom: 0.6rem;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    user-select: none;
  }

  .label-icon {
    color: #4961f7;
    font-size: 1rem;
    flex-shrink: 0;
  }

  input.form-input,
  select.form-input {
    width: 100%;
    padding: 0.85rem 1rem;
    border: 2.5px solid #d1d9f2;
    border-radius: 12px;
    font-size: 1.05rem;
    font-weight: 500;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    background-color: #feffff;
    color: #1a202c;
    font-family: inherit;
  }

  input.form-input::placeholder,
  select.form-input::placeholder {
    color: #718096;
  }

  input.form-input:focus,
  select.form-input:focus {
    outline: none;
    border-color: #4961f7;
    box-shadow: 0 0 0 4px rgba(73, 97, 247, 0.2);
  }

  input.form-input.error,
  select.form-input.error {
    border-color: #f44336;
    box-shadow: 0 0 0 4px rgba(244, 67, 54, 0.18);
    background-color: #ffebeb;
  }

  .error-message {
    color: #f44336;
    font-size: 0.8rem;
    margin-top: 0.35rem;
    font-weight: 600;
    line-height: 1.1;
    user-select: none;
  }

  /* Form actions */
  .form-actions {
    display: flex;
    gap: 1.5rem;
    justify-content: flex-end;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1.5px solid #d1d9f2;
    flex-wrap: wrap;
  }

  /* Content container */
  .content-container {
    max-width: 1200px;
    margin: 0 auto 2rem;
    padding: 0 1rem;
  }

  /* Search section */
  .search-section {
    margin-bottom: 2rem;
  }

  .search-container {
    background: white;
    padding: 1.25rem 1.5rem;
    border-radius: 16px;
    box-shadow: 0 6px 14px rgba(34, 50, 68, 0.1);
    display: flex;
    gap: 1.15rem;
    align-items: flex-end;
    flex-wrap: wrap;
  }

  .search-input-wrapper {
    position: relative;
    flex: 1 1 300px;
    min-width: 220px;
  }

  .search-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #8a9bc9;
    font-size: 1rem;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 1rem 1rem 1rem 3.2rem;
    border: 2.5px solid #c3ccee;
    border-radius: 14px;
    font-size: 1.1rem;
    font-weight: 600;
    font-family: inherit;
    color: #2a374d;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }

  .search-input::placeholder {
    color: #a0abc9;
    font-weight: 500;
  }

  .search-input:focus {
    outline: none;
    border-color: #4f67f5;
    box-shadow: 0 0 0 5px rgba(79, 103, 245, 0.25);
  }

  .clear-btn {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: #8a9bc9;
    padding: 0.3rem;
    border-radius: 6px;
    transition: color 0.2s ease, background-color 0.2s ease;
  }

  .clear-btn:hover,
  .clear-btn:focus-visible {
    color: #3551b0;
    background: #dae2ff;
    outline: none;
  }

  .search-btn {
    background: #4f67f5;
    color: white;
    border: none;
    padding: 1rem 1.5rem;
    border-radius: 14px;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 700;
    white-space: nowrap;
    transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
    box-shadow: 0 6px 14px rgba(79, 103, 245, 0.5);
  }

  .search-btn:hover,
  .search-btn:focus-visible {
    background: #3851d3;
    box-shadow: 0 8px 20px rgba(52, 71, 188, 0.6);
    transform: translateY(-2px);
    outline: none;
  }

  .add-btn {
    flex-shrink: 0;
  }

  /* Table section */
  .table-section {
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(34, 50, 68, 0.12);
    overflow: hidden;
  }

  .table-header {
    padding: 1.25rem 2rem;
    border-bottom: 1px solid #d1d9f2;
  }

  .table-title {
    font-size: clamp(1.25rem, 3vw, 1.4rem);
    font-weight: 900;
    color: #1a202c;
    margin: 0;
    letter-spacing: 0.04em;
  }

  /* Mobile card view */
  .mobile-cards {
    display: none;
    padding: 1.2rem;
    gap: 1.25rem;
    flex-direction: column;
  }

  .employee-card {
    background: #f1f5ff;
    border-radius: 16px;
    padding: 1.3rem 1.5rem;
    border: 1px solid #ccd6f6;
    cursor: pointer;
    transition: box-shadow 0.3s ease, transform 0.3s ease;
    box-shadow: 0 5px 20px rgba(100, 120, 255, 0.1);
  }

  .employee-card:hover,
  .employee-card:focus-within {
    box-shadow: 0 8px 28px rgba(79, 103, 245, 0.3);
    transform: translateY(-3px);
    outline: none;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .card-body {
    margin-bottom: 1.2rem;
  }

  .contact-info {
    margin-bottom: 1rem;
  }

  .contact-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    font-size: 0.95rem;
    color: #344054;
    user-select: text;
  }

  .contact-icon {
    color: #4f67f5;
    font-size: 0.8rem;
    width: 14px;
  }

  .employment-info {
    display: flex;
    gap: 1.3rem;
    flex-wrap: wrap;
    color: #475569;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.9rem;
  }

  .info-icon {
    color: #4f67f5;
    font-size: 0.8rem;
    width: 14px;
  }

  .card-actions {
    display: flex;
    gap: 0.7rem;
    justify-content: flex-end;
  }

  /* Desktop table view */
  .table-container {
    overflow-x: auto;
  }

  .employee-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 10px;
    background-clip: padding-box;
    font-variant-numeric: tabular-nums;
  }

  .employee-table th {
    background: #364fc7;
    color: white;
    padding: 1.3rem 1.5rem;
    text-align: left;
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }

  .employee-table td {
    padding: 1.25rem 1.5rem;
    vertical-align: middle;
    background: white;
    color: #2a374d;
    font-weight: 600;
    font-size: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgb(115 125 170 / 0.08);
    user-select: text;
  }

  .employee-row {
    cursor: pointer;
    transition: background-color 0.25s ease;
    vertical-align: middle;
  }

  .employee-row:hover,
  .employee-row:focus-within {
    background-color: #f1f3ff;
    outline: none;
  }

  .name-cell {
    font-weight: 700;
  }

  .employee-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .employee-name {
    font-size: 1.1rem;
    font-weight: 800;
    color: #1e293b;
  }

  .employee-id {
    font-size: 0.82rem;
    color: #64748b;
    user-select: none;
  }

  .contact-cell {
    font-size: 0.9rem;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .phone,
  .email {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.9rem;
    user-select: text;
    color: #394867;
  }

  /* Role badges */
  .role-badge {
    display: inline-block;
    padding: 0.3rem 0.9rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.035em;
    user-select: none;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.07);
  }

  .role-badge.technician {
    background-color: #4f67f5;
    color: white;
  }

  .role-badge.sales {
    background-color: #22c55e;
    color: white;
  }

  .role-badge.service {
    background-color: #fbbf24;
    color: white;
  }

  .role-badge.admin {
    background-color: #e11d48;
    color: white;
  }

  .role-badge.trainer {
    background-color: #7c3aed;
    color: white;
  }

  .role-badge.manager {
    background-color: #ef4444;
    color: white;
  }

  .action-buttons {
    display: flex;
    gap: 0.7rem;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: background-color 0.25s ease, transform 0.25s ease;
  }

  .action-btn:focus-visible {
    outline: 3px solid #5167f5;
    outline-offset: 3px;
  }

  .view-btn {
    background-color: #4f67f5;
    color: white;
  }

  .view-btn:hover,
  .view-btn:focus-visible {
    background-color: #3c52d6;
    transform: translateY(-1px);
  }

  .edit-btn {
    background-color: #fbbf24;
    color: #3f3f46;
  }

  .edit-btn:hover,
  .edit-btn:focus-visible {
    background-color: #eab308;
    transform: translateY(-1px);
    color: #27272a;
  }

  .delete-btn {
    background-color: #ef4444;
    color: white;
  }

  .delete-btn:hover,
  .delete-btn:focus-visible {
    background-color: #dc2626;
    transform: translateY(-1px);
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 3.5rem 1.5rem;
    color: #64748b;
  }

  .empty-icon {
    font-size: 3.5rem;
    color: #cbd5e0;
    margin-bottom: 1.2rem;
  }

  .empty-state h3 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 0 0 0.7rem 0;
  }

  .empty-state p {
    font-size: 1.1rem;
    margin: 0;
    font-weight: 500;
  }

  /* Modal overlay and content */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1200;
    backdrop-filter: blur(6px);
    padding: 1.25rem;
  }

  .employee-modal {
    background: white;
    border-radius: 24px;
    box-shadow: 0 35px 80px rgba(30, 42, 91, 0.3);
    max-width: 850px;
    min-width: 320px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2rem 2rem 1.25rem;
    border-bottom: 1.2px solid #d1d9f2;
  }

  .modal-title {
    font-size: clamp(1.5rem, 3vw, 1.8rem);
    font-weight: 900;
    color: #111827;
    margin: 0;
    letter-spacing: 0.04em;
  }

  .modal-close-btn {
    background: #f0f4ff;
    border: none;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    transition: background-color 0.2s ease, color 0.2s ease;
    flex-shrink: 0;
  }

  .modal-close-btn:hover,
  .modal-close-btn:focus-visible {
    background: #dbe7ff;
    color: #344eab;
    outline: none;
  }

  .modal-body {
    padding: 2rem;
  }

  .employee-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem 2.5rem;
  }

  .info-section {
    background: #f2f7ff;
    padding: 1.5rem;
    border-radius: 18px;
  }

  .info-section h4 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #192029;
    margin: 0 0 1.25rem 0;
    padding-bottom: 0.8rem;
    border-bottom: 3px solid #d9e1ff;
    letter-spacing: 0.02em;
  }

  .info-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.4rem;
  }

  .info-item:last-child {
    margin-bottom: 0;
  }

  .info-icon {
    color: #3f51c7;
    font-size: 1.1rem;
    margin-top: 0.25rem;
    flex-shrink: 0;
    user-select: none;
  }

  .info-item > div {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }

  .info-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: #57606a;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    user-select: none;
  }

  .info-value {
    font-size: 0.95rem;
    color: #192029;
    font-weight: 600;
    word-break: break-word;
    user-select: text;
  }

  /* Responsive breakpoints */
  @media (max-width: 1024px) {
    .form-grid {
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }

    .search-container {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input-wrapper {
      max-width: none;
      order: 1;
    }

    .search-btn {
      order: 2;
      margin-top: 0.7rem;
    }

    .add-btn {
      order: 3;
      margin-top: 0.7rem;
      align-self: flex-start;
    }
  }

  @media (max-width: 768px) {
    .page-header {
      padding: 1rem 0.75rem 1.75rem;
    }

    .header-content {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1.25rem;
    }

    .header-left {
      flex: none;
    }

    .total-employees-card {
      min-width: 140px;
      padding: 1rem 1.5rem;
    }

    .form-container {
      margin: -1rem 0.75rem 1rem;
      border-radius: 14px;
    }

    .content-container {
      padding: 0 0.75rem;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
      gap: 1rem;
    }

    .btn-text {
      display: none;
    }

    /* Show mobile cards, hide table */
    .mobile-cards {
      display: flex;
    }

    .table-container {
      display: none;
    }

    .employee-info-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .page-header {
      padding: 0.75rem 0.5rem 1rem;
    }

    .form-container {
      margin: -0.75rem 0.5rem 0.75rem;
      border-radius: 12px;
    }

    .content-container {
      padding: 0 0.5rem;
    }

    .search-container,
    .mobile-cards,
    .form-header,
    .employee-form {
      padding: 0.75rem;
    }

    .total-employees-card {
      padding: 0.75rem 1rem;
      min-width: 120px;
    }

    .employee-card {
      padding: 0.75rem 1rem;
      border-radius: 14px;
    }

    .modal-body {
      padding: 1rem;
    }

    .info-section {
      padding: 0.75rem;
      border-radius: 14px;
    }
  }
`}</style>

    </div>
  );
}

export default Employees;
