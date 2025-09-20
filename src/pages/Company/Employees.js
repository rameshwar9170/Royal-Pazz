import React, { useState, useEffect } from 'react';
import { ref, push, onValue, set, remove } from 'firebase/database';
// Remove Firebase Auth completely
import { database } from '../../firebase/config'; // Remove auth import
import { sendWelcomeMessage, generateUserId, formatDate } from '../../services/whatsappService';
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
  FaBars,
  FaCheckCircle,
  FaWhatsapp
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
  const [confirmingEmployee, setConfirmingEmployee] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
    if (isFormVisible) resetForm();
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

  // Simplified validation - email optional for all roles
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
        // Email is optional for all roles now
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
          today.setHours(23, 59, 59, 999);
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
        return value.replace(/\D/g, '').slice(0, 10);
      case 'aadhar':
        return value.replace(/\D/g, '').slice(0, 12);
      case 'accountNo':
        return value.replace(/\D/g, '').slice(0, 18);
      case 'ifscCode':
        return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
      case 'name':
      case 'bankName':
        return value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
      default:
        return value;
    }
  };

  // Firebase data processing
  useEffect(() => {
    console.log('Employee component mounted, starting Firebase connection...');
    
    const employeeRef = ref(database, 'HTAMS/company/Employees');
    console.log('Connecting to Firebase path:', 'HTAMS/company/Employees');
    
    const unsubscribe = onValue(employeeRef, (snapshot) => {
      console.log('Firebase snapshot received');
      console.log('Snapshot exists:', snapshot.exists());
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('Raw Firebase data:', data);
        
        let processedData = {};
        
        // Check if this is a single employee stored incorrectly (has name, mobile, etc. directly)
        if (data.name && data.mobile && data.aadhar) {
          console.log('Detected single employee stored incorrectly, converting to proper structure');
          const employeeId = data.mobile;
          processedData[employeeId] = {
            name: data.name || 'Unknown',
            mobile: data.mobile || 'N/A',
            email: data.email || '',
            aadhar: data.aadhar || 'N/A',
            role: data.role || 'Unassigned',
            joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
            shift: data.shift || '',
            salaryAccount: {
              accountNo: data.salaryAccount?.accountNo || '',
              ifscCode: data.salaryAccount?.ifscCode || '',
              bankName: data.salaryAccount?.bankName || '',
            },
            userId: data.userId || '',
            confirmed: data.confirmed || false,
            registrationDate: data.registrationDate || new Date().toISOString(),
            whatsappSent: data.whatsappSent || false,
            whatsappSentDate: data.whatsappSentDate || '',
            // Login credentials - NO authentication
            defaultPassword: data.mobile || data.defaultPassword, // Mobile as default password
            passwordChanged: data.passwordChanged || false,
            lastLoginAt: data.lastLoginAt || null,
            loginEnabled: true,
            firstTime: false // No auth setup needed
          };
          console.log('Single employee processed:', processedData);
        } 
        // If data has multiple employees with proper IDs as keys
        else if (typeof data === 'object') {
          console.log('Processing multiple employees with proper structure');
          Object.entries(data).forEach(([id, emp]) => {
            // Skip if this is not an employee object (has name property)
            if (emp && typeof emp === 'object' && emp.name) {
              console.log(`Processing Employee ${id}:`, emp);
              processedData[id] = {
                name: emp.name || 'Unknown',
                mobile: emp.mobile || 'N/A',
                email: emp.email || '',
                aadhar: emp.aadhar || 'N/A',
                role: emp.role || 'Unassigned',
                joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
                shift: emp.shift || '',
                salaryAccount: {
                  accountNo: emp.salaryAccount?.accountNo || emp.accountNo || '',
                  ifscCode: emp.salaryAccount?.ifscCode || emp.ifscCode || '',
                  bankName: emp.salaryAccount?.bankName || emp.bankName || '',
                },
                userId: emp.userId || '',
                confirmed: emp.confirmed || false,
                registrationDate: emp.registrationDate || new Date().toISOString(),
                whatsappSent: emp.whatsappSent || false,
                whatsappSentDate: emp.whatsappSentDate || '',
                // Login credentials - NO authentication
                defaultPassword: emp.mobile || emp.defaultPassword,
                passwordChanged: emp.passwordChanged || false,
                lastLoginAt: emp.lastLoginAt || null,
                loginEnabled: emp.loginEnabled !== undefined ? emp.loginEnabled : true,
                firstTime: false // No auth setup needed
              };
              console.log(`Processed Employee ${id}:`, processedData[id]);
            } else {
              console.log(`Skipping invalid employee data for ${id}:`, emp);
            }
          });
        }
        
        console.log('Final processed data:', processedData);
        console.log('Total valid employees:', Object.keys(processedData).length);
        
        setEmployees(processedData);
        setFilteredEmployees(processedData);
      } else {
        console.log('No data at HTAMS/company/Employees');
        setEmployees({});
        setFilteredEmployees({});
      }
    }, (error) => {
      console.error('Firebase connection error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setEmployees({});
      setFilteredEmployees({});
    });
    
    console.log('Firebase listener attached, waiting for data...');
    
    return () => {
      console.log('Cleaning up Firebase listener');
      unsubscribe();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = formatInput(name, value);
    
    if (['accountNo', 'ifscCode', 'bankName'].includes(name)) {
      setForm(prev => ({
        ...prev,
        salaryAccount: {
          ...prev.salaryAccount,
          [name]: formattedValue
        }
      }));
      
      const error = validateField(name, formattedValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      
      const error = validateField(name, formattedValue);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
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
    const mobileExists = existingEmployees.find(([id, emp]) => 
      emp.mobile === form.mobile && (!editingId || id !== editingId)
    );
    if (mobileExists) {
      newErrors.mobile = 'This mobile number is already registered';
    }

    const aadharExists = existingEmployees.find(([id, emp]) => 
      emp.aadhar === form.aadhar && (!editingId || id !== editingId)
    );
    if (aadharExists) {
      newErrors.aadhar = 'This Aadhar number is already registered';
    }

    // Check for duplicate email if provided
    if (form.email) {
      const emailExists = existingEmployees.find(([id, emp]) => 
        emp.email === form.email && (!editingId || id !== editingId)
      );
      if (emailExists) {
        newErrors.email = 'This email is already registered';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SIMPLIFIED Submit handler - NO Firebase Authentication
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fix all validation errors before submitting');
      return;
    }

    setLoading(true);
    try {
      const userId = !editingId ? generateUserId(form) : form.userId || generateUserId(form);

      // Create employee data without authentication
      const employeeData = {
        name: form.name.trim(),
        mobile: form.mobile,
        email: form.email.trim(),
        aadhar: form.aadhar,
        role: form.role,
        joiningDate: form.joiningDate,
        shift: form.shift.trim(),
        salaryAccount: {
          accountNo: form.salaryAccount.accountNo,
          ifscCode: form.salaryAccount.ifscCode.toUpperCase(),
          bankName: form.salaryAccount.bankName.trim(),
        },
        userId: userId,
        confirmed: editingId ? form.confirmed : true,
        registrationDate: editingId ? form.registrationDate : new Date().toISOString(),
        whatsappSent: editingId ? form.whatsappSent : false,
        // Login credentials for all roles - NO authentication
        defaultPassword: form.mobile, // Use mobile as default password
        passwordChanged: false, // Track if user changed password
        lastLoginAt: null,
        loginEnabled: true, // All employees can login
        firstTime: false // Set to false since no auth setup needed
      };

      console.log('Saving employee data:', employeeData);

      if (editingId) {
        // Update existing employee
        const employeeRef = ref(database, `HTAMS/company/Employees/${editingId}`);
        await set(employeeRef, employeeData);
        alert('Employee updated successfully!');
      } else {
        // Add new employee with mobile number as ID
        const newEmployeeId = form.mobile;
        const employeeRef = ref(database, `HTAMS/company/Employees/${newEmployeeId}`);
        await set(employeeRef, employeeData);

        // Send WhatsApp message for new employees
        console.log('Starting WhatsApp process for new employee...');
        setWhatsappLoading(true);
        try {
          const participantData = {
            userId: userId,
            joiningDate: formatDate(form.joiningDate),
            name: form.name,
            mobile: form.mobile,
            email: form.email || 'N/A',
            role: form.role,
            portalUrl: 'https://royal-pazz.vercel.app/employee-login', // Updated URL
            hasAuth: false, // No Firebase Auth
            defaultPassword: form.mobile, // Mobile number as password
            loginInstructions: `Login with Email: ${form.email} and Password: ${form.mobile}`
          };

          console.log('Participant data prepared:', participantData);
          const messageSent = await sendWelcomeMessage(participantData);
          console.log('Message sent result:', messageSent);

          if (messageSent) {
            const updatedData = {
              ...employeeData,
              whatsappSent: true,
              whatsappSentDate: new Date().toISOString()
            };
            await set(employeeRef, updatedData);
            
            let successMessage = `Employee added successfully! Login details sent to WhatsApp: +91${form.mobile}`;
            alert(successMessage);
          } else {
            alert(`Employee added successfully! WhatsApp message failed to send.`);
          }
        } catch (whatsappError) {
          console.error('WhatsApp sending error:', whatsappError);
          alert(`Employee added successfully! WhatsApp message failed to send: ${whatsappError.message}`);
        } finally {
          setWhatsappLoading(false);
        }
      }

      resetForm();
      setIsFormVisible(false);
    } catch (err) {
      console.error('Error saving employee:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Keep all your existing handler functions
  const handleEdit = (id, emp) => {
    console.log('Editing employee:', id, emp);
    setForm(emp);
    setEditingId(id);
    setIsFormVisible(true);
    setErrors({});
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete employee ${name}?`)) {
      setLoading(true);
      const employeeRef = ref(database, `HTAMS/company/Employees/${id}`);
      try {
        await remove(employeeRef);
        alert(`Employee ${name} deleted successfully!`);
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirmParticipant = async (id, employee) => {
    if (window.confirm(`Confirm ${employee.name} as a participant and send welcome message via WhatsApp?`)) {
      setConfirmingEmployee(id);
      setWhatsappLoading(true);
      
      try {
        const userId = generateUserId(employee);
        const participantData = {
          userId: userId,
          joiningDate: formatDate(employee.joiningDate),
          name: employee.name,
          mobile: employee.mobile,
          email: employee.email || 'N/A',
          role: employee.role,
          portalUrl: 'https://royal-pazz.vercel.app/employee-login',
          hasAuth: false, // No authentication
          defaultPassword: employee.mobile, // Mobile as password
          loginInstructions: `Login with Email: ${employee.email} and Password: ${employee.mobile}`
        };

        const messageSent = await sendWelcomeMessage(participantData);
        
        if (messageSent) {
          const employeeRef = ref(database, `HTAMS/company/Employees/${id}`);
          await set(employeeRef, {
            ...employee,
            confirmed: true,
            userId: userId,
            confirmationDate: new Date().toISOString(),
            whatsappSent: true
          });
          
          let successMessage = `${employee.name} confirmed successfully! Welcome message sent to WhatsApp: +91${employee.mobile}`;
          alert(successMessage);
        } else {
          alert('Failed to send WhatsApp message. Please try again.');
        }
      } catch (error) {
        console.error('Error confirming participant:', error);
        alert(`Error confirming participant: ${error.message}`);
      } finally {
        setConfirmingEmployee(null);
        setWhatsappLoading(false);
      }
    }
  };

  const handleRowClick = (emp) => {
    console.log('Viewing employee details:', emp);
    setSelectedEmployee(emp);
  };

  const handleSearch = () => {
    const query = searchQuery.toLowerCase();
    const filtered = Object.entries(employees).reduce((acc, [id, emp]) => {
      const nameMatch = emp.name?.toLowerCase().includes(query) || false;
      const mobileMatch = emp.mobile?.includes(query) || false;
      const roleMatch = emp.role?.toLowerCase().includes(query) || false;
      
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

  // Enhanced display helper function
  const getDisplayValue = (value, fallback = 'N/A') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
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

      {/* Form section */}
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
                    Full Name
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
                    Mobile Number
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
                    Email Address (Optional)
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
                    Aadhar Number
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
                    Role
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
                    Joining Date
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
                    Bank Name
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
                    Account Number
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
                    IFSC Code
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
                {loading ? 'Saving...' : editingId ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and table sections - keeping your existing layout */}
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
                    <div className="employee-name">{getDisplayValue(emp.name)}</div>
                    <div className="employee-id">Mobile: {getDisplayValue(emp.mobile)}</div>
                  </div>
                  <span className={`role-badge ${emp.role?.toLowerCase() || 'default'}`}>
                    {getDisplayValue(emp.role?.toUpperCase())}
                  </span>
                </div>
                
                <div className="card-body">
                  <div className="contact-info">
                    <div className="contact-item">
                      <FaPhone className="contact-icon" />
                      <span>{getDisplayValue(emp.mobile)}</span>
                    </div>
                    <div className="contact-item">
                      <FaEnvelope className="contact-icon" />
                      <span>{getDisplayValue(emp.email)}</span>
                    </div>
                  </div>
                  
                  <div className="employment-info">
                    <div className="info-item">
                      <FaCalendar className="info-icon" />
                      <span>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <FaClock className="info-icon" />
                      <span>{getDisplayValue(emp.shift)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="card-actions">
                  <button 
                    className="action-btn view-btn" 
                    onClick={(e) => {e.stopPropagation(); handleRowClick(emp);}} 
                    title="View Employee"
                  >
                    👁️
                  </button>
                  <button 
                    className="action-btn edit-btn" 
                    onClick={(e) => {e.stopPropagation(); handleEdit(id, emp);}} 
                    title="Edit Employee"
                  >
                    ✏️
                  </button>
                  {!emp.confirmed && (
                    <button 
                      className="action-btn confirm-btn" 
                      onClick={(e) => {e.stopPropagation(); handleConfirmParticipant(id, emp);}} 
                      title="Confirm Participant & Send WhatsApp"
                      disabled={confirmingEmployee === id || whatsappLoading}
                    >
                      {confirmingEmployee === id ? '⏳' : '✅'}
                    </button>
                  )}
                  {emp.confirmed && (
                    <button 
                      className="action-btn confirmed-btn" 
                      title="Participant Confirmed" 
                      disabled
                    >
                      ✅
                    </button>
                  )}
                  <button 
                    className="action-btn delete-btn" 
                    onClick={(e) => {e.stopPropagation(); handleDelete(id, emp.name);}} 
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
                        <div className="employee-name">{getDisplayValue(emp.name)}</div>
                        <div className="employee-id">Mobile: {getDisplayValue(emp.mobile)}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${emp.role?.toLowerCase() || 'default'}`}>
                        {getDisplayValue(emp.role?.toUpperCase())}
                      </span>
                    </td>
                    <td className="contact-cell">
                      <div className="contact-info">
                        <div className="phone">{getDisplayValue(emp.mobile)}</div>
                        <div className="email">{getDisplayValue(emp.email)}</div>
                      </div>
                    </td>
                    <td>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}</td>
                    <td>{getDisplayValue(emp.shift)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn view-btn" 
                          onClick={(e) => {e.stopPropagation(); handleRowClick(emp);}} 
                          title="View Employee"
                        >
                          👁️
                        </button>
                        <button 
                          className="action-btn edit-btn" 
                          onClick={(e) => {e.stopPropagation(); handleEdit(id, emp);}} 
                          title="Edit Employee"
                        >
                          ✏️
                        </button>
                        {!emp.confirmed && (
                          <button 
                            className="action-btn confirm-btn" 
                            onClick={(e) => {e.stopPropagation(); handleConfirmParticipant(id, emp);}} 
                            title="Confirm Participant & Send WhatsApp"
                            disabled={confirmingEmployee === id || whatsappLoading}
                          >
                            {confirmingEmployee === id ? '⏳' : '✅'}
                          </button>
                        )}
                        {emp.confirmed && (
                          <button 
                            className="action-btn confirmed-btn" 
                            title="Participant Confirmed" 
                            disabled
                          >
                            ✅
                          </button>
                        )}
                        <button 
                          className="action-btn delete-btn" 
                          onClick={(e) => {e.stopPropagation(); handleDelete(id, emp.name);}} 
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
              <p>Add employees using the "Add Employee" button above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal for employee details */}
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
                      <span className="info-value">{getDisplayValue(selectedEmployee.name)}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaPhone className="info-icon" />
                    <div>
                      <span className="info-label">Mobile</span>
                      <span className="info-value">{getDisplayValue(selectedEmployee.mobile)}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaEnvelope className="info-icon" />
                    <div>
                      <span className="info-label">Email</span>
                      <span className="info-value">{getDisplayValue(selectedEmployee.email)}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaIdCard className="info-icon" />
                    <div>
                      <span className="info-label">Aadhar</span>
                      <span className="info-value">{getDisplayValue(selectedEmployee.aadhar)}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Job Information</h4>
                  <div className="info-item">
                    <FaBriefcase className="info-icon" />
                    <div>
                      <span className="info-label">Role</span>
                      <span className="info-value">{getDisplayValue(selectedEmployee.role)}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaCalendar className="info-icon" />
                    <div>
                      <span className="info-label">Joining Date</span>
                      <span className="info-value">
                        {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <FaClock className="info-icon" />
                    <div>
                      <span className="info-label">Shift</span>
                      <span className="info-value">{getDisplayValue(selectedEmployee.shift)}</span>
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
                        {getDisplayValue(selectedEmployee.salaryAccount?.bankName)}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div>
                      <span className="info-label">Account Number</span>
                      <span className="info-value">
                        {getDisplayValue(selectedEmployee.salaryAccount?.accountNo)}
                      </span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div>
                      <span className="info-label">IFSC Code</span>
                      <span className="info-value">
                        {getDisplayValue(selectedEmployee.salaryAccount?.ifscCode)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
  



      {/* Add your existing CSS styles here - keeping them the same */}
      <style jsx>{`
        /* All your existing CSS styles remain unchanged */
        .employee-management {
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 0;
        }

        .page-header {
          background: #f8fafc;
          padding: 1rem 1rem 2rem;
          color: #2d3748;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid #e2e8f0;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          gap: 1rem;
        }

        .header-left {
          flex: 1;
          min-width: 0;
        }

        .page-title {
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #2d3748;
        }

        .page-icon {
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          color: #6366f1;
          flex-shrink: 0;
        }

        .page-subtitle {
          font-size: clamp(0.875rem, 2.5vw, 1rem);
          color: #64748b;
          margin: 0.5rem 0 0 0;
          font-weight: 400;
        }

        .header-right {
          flex-shrink: 0;
        }

        .total-employees-card {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          text-align: center;
          min-width: 150px;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }

        .total-employees-number {
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          font-weight: 800;
          margin: 0;
          line-height: 1;
        }

        .total-employees-label {
          font-size: clamp(0.75rem, 2vw, 0.875rem);
          font-weight: 600;
          margin: 0.5rem 0 0 0;
          opacity: 0.9;
          letter-spacing: 0.05em;
        }

        .primary-btn {
          background: #6366f1;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: clamp(0.875rem, 2.5vw, 1rem);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          white-space: nowrap;
        }

        .primary-btn:hover {
          background: #5855eb;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }

        .btn-icon {
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .btn-text {
          display: inline;
        }

        .form-container {
          background: white;
          margin: -1rem 1rem 1rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          position: relative;
          z-index: 2;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }

        .form-title {
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          font-weight: 700;
          color: #2d3748;
          margin: 0;
        }

        .close-btn {
          background: #f7fafc;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .close-btn:hover {
          background: #e2e8f0;
          color: #1a202c;
        }

        .employee-form {
          padding: 0 1.5rem 1.5rem;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: clamp(1rem, 2.5vw, 1.125rem);
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .label-icon {
          color: #667eea;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .form-input, .employee-form select {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background-color: #ffffff;
        }

        .form-input:focus, .employee-form select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          font-weight: 500;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .secondary-btn {
          background: #f7fafc;
          color: #64748b;
          border: 2px solid #e2e8f0;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .secondary-btn:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1a202c;
        }

        .secondary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .content-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .search-section {
          margin-bottom: 1.5rem;
        }

        .search-container {
          background: white;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          display: flex;
          gap: 1rem;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .search-input-wrapper {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 0.875rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .clear-btn {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .clear-btn:hover {
          color: #1a202c;
          background: #f1f5f9;
        }

        .search-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .search-btn:hover {
          background: #5a67d8;
          transform: translateY(-1px);
        }

        .add-btn {
          flex-shrink: 0;
        }

        .table-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }

        .table-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-title {
          font-size: clamp(1.125rem, 3vw, 1.25rem);
          font-weight: 700;
          color: #2d3748;
          margin: 0;
        }

        /* Mobile Card View */
        .mobile-cards {
          display: none;
          padding: 1rem;
          gap: 1rem;
          flex-direction: column;
        }

        .employee-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .employee-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .card-body {
          margin-bottom: 1rem;
        }

        .contact-info {
          margin-bottom: 0.75rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .contact-icon {
          color: #6366f1;
          font-size: 0.75rem;
          width: 12px;
        }

        .employment-info {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .info-icon {
          color: #6366f1;
          font-size: 0.75rem;
          width: 12px;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        /* Desktop Table View */
        .table-container {
          overflow-x: auto;
        }

        .employee-table {
          width: 100%;
          border-collapse: collapse;
        }

        .employee-table th {
          background: #4a5568;
          color: white;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e2e8f0;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .employee-table td {
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }

        .employee-row {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .employee-row:hover {
          background-color: #f8fafc;
        }

        .name-cell {
          font-weight: 600;
        }

        .employee-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .employee-name {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
        }

        .employee-id {
          font-size: 0.75rem;
          color: #64748b;
        }

        .contact-cell {
          font-size: 0.875rem;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .phone, .email {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
        }

        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .role-badge.technician {
          background-color: #6366f1;
          color: white;
        }

        .role-badge.sales {
          background-color: #10b981;
          color: white;
        }

        .role-badge.service {
          background-color: #f59e0b;
          color: white;
        }

        .role-badge.admin {
          background-color: #ec4899;
          color: white;
        }

        .role-badge.trainer {
          background-color: #8b5cf6;
          color: white;
        }

        .role-badge.manager {
          background-color: #ef4444;
          color: white;
        }

        .role-badge.default {
          background-color: #6b7280;
          color: white;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .view-btn {
          background-color: #6366f1;
          color: white;
        }

        .view-btn:hover {
          background-color: #5855eb;
          transform: translateY(-1px);
        }

        .edit-btn {
          background-color: #f59e0b;
          color: white;
        }

        .edit-btn:hover {
          background-color: #d97706;
          transform: translateY(-1px);
        }

        .delete-btn {
          background-color: #ef4444;
          color: white;
        }

        .delete-btn:hover {
          background-color: #dc2626;
          transform: translateY(-1px);
        }

        .confirm-btn {
          background-color: #10b981;
          color: white;
        }

        .confirm-btn:hover:not(:disabled) {
          background-color: #059669;
          transform: translateY(-1px);
        }

        .confirm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .confirmed-btn {
          background-color: #6b7280;
          color: white;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #64748b;
        }

        .empty-icon {
          font-size: 3rem;
          color: #cbd5e0;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          font-size: 1rem;
          margin: 0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 1rem;
        }

        .employee-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 1rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-title {
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          font-weight: 700;
          color: #2d3748;
          margin: 0;
        }

        .modal-close-btn {
          background: #f7fafc;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background: #e2e8f0;
          color: #1a202c;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .employee-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .info-section {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
        }

        .info-section h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin: 0 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .info-item:last-child {
          margin-bottom: 0;
        }

        .info-icon {
          color: #667eea;
          font-size: 1rem;
          margin-top: 0.125rem;
          flex-shrink: 0;
        }

        .info-item > div {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.875rem;
          color: #2d3748;
          font-weight: 500;
          word-break: break-all;
        }

        /* Responsive breakpoints */
        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
          }
          
          .add-btn {
            order: 3;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            padding: 1rem 0.75rem 1.5rem;
          }

          .header-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1rem;
          }

          .header-left {
            flex: none;
          }

          .total-employees-card {
            min-width: 140px;
          }

          .form-container {
            margin: -1rem 0.75rem 1rem;
          }

          .content-container {
            padding: 0 0.75rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
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
            padding: 0.75rem;
          }

          .modal-body {
            padding: 1rem;
          }

          .info-section {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Employees;
