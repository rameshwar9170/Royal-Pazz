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

  // WhatsApp API Configuration
  const WHATSAPP_API_URL = 'https://webhook.whatapi.in/webhook/68bff44c0686f623b6e1a678';

  // Generate Employee ID
  const generateEmployeeId = () => {
    return 'EMP' + Date.now().toString().slice(-6);
  };

  // Send WhatsApp Welcome Message
const sendEmployeeWelcomeMessage = async (employeeData, employeeId) => {
  try {
    // Use only first name (before the first space)
    const firstName = employeeData.name.split(' ')[0];
    
   
const simpleMessage = `employee,${employeeData.name.replace(/\s+/g, '')},${employeeData.role},${employeeId}`;
    
    const formatPhoneNumber = (phoneNumber) => {
      let cleaned = phoneNumber.replace(/[^\d]/g, '');
      if (cleaned.length === 10) {
        return '91' + cleaned;
      }
      return cleaned;
    };

    const formattedNumber = formatPhoneNumber(employeeData.mobile);
    const apiUrl = `https://webhook.whatapi.in/webhook/68bff44c0686f623b6e1a678?number=${formattedNumber}&message=${simpleMessage}`;
    
    console.log('👤 Using first name only:', firstName);
    console.log('📤 Message:', simpleMessage);
    
    const newTab = window.open(apiUrl, '_blank');
    setTimeout(() => {
      if (newTab) newTab.close();
    }, 3000);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};





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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Modified Submit Function with WhatsApp Integration

  const testWhatsAppDelivery = async () => {
  const testNumbers = [
    '919309253549', // Your main number
    form.mobile // Current form number
  ];
  
  for (const number of testNumbers) {
    if (number) {
      console.log(`\n🧪 Testing delivery to: ${number}`);
      
      try {
        const testMessage = `Test message from HTAMS system
Time: ${new Date().toLocaleString()}
This is a delivery test.`;
        
        const encodedMessage = encodeURIComponent(testMessage);
        const apiUrl = `https://webhook.whatapi.in/webhook/68bff44c0686f623b6e1a678?number=${number}&message=${encodedMessage}`;
        
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        console.log(`📊 Result for ${number}:`, result);
        
        if (result.accepted) {
          console.log(`✅ Message accepted for ${number} - Check your phone in 1-2 minutes`);
        } else {
          console.log(`❌ Message rejected for ${number}`);
        }
        
      } catch (error) {
        console.log(`🚨 Error testing ${number}:`, error.message);
      }
      
      // Wait 2 seconds between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    alert('Please fix all validation errors before submitting');
    return;
  }
  
  setLoading(true);
  
  try {
    const employeeId = editingId || generateEmployeeId();
    
    const employeeData = {
      ...form,
      employeeId: employeeId,
      registrationDate: new Date().toISOString(),
      status: 'active'
    };

    const employeeRef = editingId
      ? ref(db, `HTAMS/company/Employees/${editingId}`)
      : ref(db, 'HTAMS/company/Employees/');
    
    const action = editingId ? set : push;
    
    // Save to Firebase
    await action(employeeRef, employeeData);
    
    if (!editingId) {
      // Send WhatsApp message with working format
      try {
        const whatsappResult = await sendEmployeeWelcomeMessage(employeeData, employeeId);
        
        alert(`🎉 Employee Added Successfully!

✅ Saved to database: ${employeeData.name}
🆔 Employee ID: ${employeeId}
📱 WhatsApp sent to: ${form.mobile}
🌐 Browser will auto-close

Welcome message sent automatically!`);
        
      } catch (whatsappError) {
        console.error('WhatsApp sending failed:', whatsappError);
        alert(`✅ Employee added successfully!

🆔 Employee ID: ${employeeId}
⚠️ WhatsApp message could not be sent.

You can send it manually from the employee details.`);
      }
    } else {
      alert('Employee updated successfully!');
    }
    
    localStorage.removeItem('htamsEmployees');
    resetForm();
    setIsFormVisible(false);
    
  } catch (err) {
    console.error('Error saving employee:', err);
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

  // Manual WhatsApp Message Sending
  const sendManualWelcomeMessage = async (employee, employeeId) => {
    try {
      setLoading(true);
      await sendEmployeeWelcomeMessage(employee, employeeId);
      alert(`✅ Welcome message sent successfully to ${employee.mobile}!`);
    } catch (error) {
      alert(`❌ Failed to send WhatsApp message to ${employee.mobile}.\nPlease try again later.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-management" style={{
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      // Add this in your component's button section
{process.env.NODE_ENV === 'development' && (
  <button
    onClick={testWhatsAppDelivery}
    style={{
      padding: '12px 20px',
      backgroundColor: '#17a2b8',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      marginLeft: '10px'
    }}
  >
    🧪 Test WhatsApp Delivery
  </button>
)}

      <div className="page-header" style={{
        padding: '20px',
        backgroundColor: '#1a1a2e',
        borderBottom: '2px solid #0f3460'
      }}>
        <div className="header-content" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="header-left">
            <h1 className="page-title" style={{
              fontSize: '28px',
              margin: '0',
              color: '#00ff00',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FaUser className="page-icon" />
              Employee Management
            </h1>
            <p className="page-subtitle" style={{
              color: '#888',
              margin: '5px 0',
              fontSize: '14px'
            }}>Manage your team members and their information</p>
          </div>
          <div className="header-right">
            <div className="total-employees-card" style={{
              backgroundColor: '#16213e',
              padding: '15px 20px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid #0f3460'
            }}>
              <div className="total-employees-number" style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#00ff00'
              }}>{Object.keys(employees).length}</div>
              <div className="total-employees-label" style={{
                fontSize: '12px',
                color: '#888'
              }}>TOTAL EMPLOYEES</div>
            </div>
          </div>
        </div>
      </div>

      {isFormVisible && (
        <div className="form-container" style={{
          padding: '20px',
          backgroundColor: '#1a1a2e',
          margin: '20px',
          borderRadius: '10px',
          border: '1px solid #0f3460'
        }}>
          <div className="form-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '15px',
            borderBottom: '1px solid #16213e'
          }}>
            <h2 className="form-title" style={{
              color: '#00ff00',
              margin: '0'
            }}>
              {editingId ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <button onClick={toggleForm} className="close-btn" style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '8px 12px',
              cursor: 'pointer'
            }}>
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="employee-form">
            <div className="form-section" style={{ marginBottom: '30px' }}>
              <h3 className="section-title" style={{
                color: '#00ff00',
                marginBottom: '15px',
                fontSize: '18px'
              }}>Personal Information</h3>
              <div className="form-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div className="form-group">
                  <label htmlFor="name" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.name ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.name && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="mobile" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.mobile ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.mobile && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.mobile}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.email ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.email && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.email}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="aadhar" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.aadhar ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.aadhar && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.aadhar}</span>}
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: '30px' }}>
              <h3 className="section-title" style={{
                color: '#00ff00',
                marginBottom: '15px',
                fontSize: '18px'
              }}>Job Information</h3>
              <div className="form-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div className="form-group">
                  <label htmlFor="role" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
                    <FaBriefcase className="label-icon" />
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.role ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="">Select Role</option>
                    <option value="Technician">Technician</option>
                    <option value="Sales">Sales</option>
                    <option value="Service">Service</option>
                    <option value="Admin">Admin</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Manager">Manager</option>
                  </select>
                  {errors.role && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.role}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="joiningDate" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.joiningDate ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.joiningDate && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.joiningDate}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="shift" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: '1px solid #0f3460',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: '30px' }}>
              <h3 className="section-title" style={{
                color: '#00ff00',
                marginBottom: '15px',
                fontSize: '18px'
              }}>Bank Details</h3>
              <div className="form-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px'
              }}>
                <div className="form-group">
                  <label htmlFor="bankName" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.bankName ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.bankName && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.bankName}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="accountNo" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.accountNo ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.accountNo && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.accountNo}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="ifscCode" className="form-label" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#16213e',
                      color: 'white',
                      border: `1px solid ${errors.ifscCode ? '#dc3545' : '#0f3460'}`,
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                  {errors.ifscCode && <span style={{
                    color: '#dc3545',
                    fontSize: '12px',
                    marginTop: '5px',
                    display: 'block'
                  }}>{errors.ifscCode}</span>}
                </div>
              </div>
            </div>

            <div className="form-actions" style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'flex-end',
              paddingTop: '20px',
              borderTop: '1px solid #16213e'
            }}>
              <button 
                type="button" 
                onClick={toggleForm} 
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: loading ? '#666' : '#0f3460',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Saving...' : (editingId ? 'Update Employee' : 'Add Employee')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="content-container" style={{ padding: '20px' }}>
        <div className="search-section" style={{ marginBottom: '20px' }}>
          <div className="search-container" style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div className="search-input-wrapper" style={{
              position: 'relative',
              flex: '1',
              minWidth: '250px'
            }}>
              <FaSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#888'
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, or role..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  backgroundColor: '#16213e',
                  color: 'white',
                  border: '1px solid #0f3460',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
              />
              {searchQuery && (
                <button onClick={clearSearch} style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer'
                }}>
                  <FaTimes />
                </button>
              )}
            </div>
            <button onClick={handleSearch} style={{
              padding: '12px 20px',
              backgroundColor: '#0f3460',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Search
            </button>
            <button onClick={toggleForm} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#00ff00',
              color: '#000',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              <FaPlus />
              {isFormVisible ? 'Cancel' : 'Add Employee'}
            </button>
          </div>
        </div>

        <div className="table-section">
          <div className="table-header" style={{
            marginBottom: '15px',
            padding: '15px',
            backgroundColor: '#1a1a2e',
            borderRadius: '10px',
            border: '1px solid #0f3460'
          }}>
            <h3 className="table-title" style={{
              color: '#00ff00',
              margin: '0'
            }}>All Employees ({Object.keys(filteredEmployees).length})</h3>
          </div>
          
          {/* Mobile Card View */}
          <div className="mobile-cards" style={{
            display: 'block',
            '@media (min-width: 768px)': {
              display: 'none'
            }
          }}>
            {Object.entries(filteredEmployees).map(([id, emp]) => (
              <div key={id} 
                onClick={() => handleRowClick(emp)}
                style={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #0f3460',
                  borderRadius: '10px',
                  padding: '15px',
                  marginBottom: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.borderColor = '#00ff00'}
                onMouseLeave={(e) => e.target.style.borderColor = '#0f3460'}
              >
                <div className="card-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}>
                  <div className="employee-info">
                    <div className="employee-name" style={{
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: '#fff'
                    }}>{emp.name}</div>
                    <div className="employee-id" style={{
                      fontSize: '12px',
                      color: '#888'
                    }}>ID: {emp.employeeId || emp.aadhar}</div>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: '#0f3460',
                    color: '#00ff00'
                  }}>
                    {emp.role.toUpperCase()}
                  </span>
                </div>
                <div className="card-body">
                  <div className="contact-info" style={{ marginBottom: '10px' }}>
                    <div className="contact-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '5px',
                      fontSize: '14px'
                    }}>
                      <FaPhone style={{ color: '#00ff00' }} />
                      <span>{emp.mobile}</span>
                    </div>
                    <div className="contact-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}>
                      <FaEnvelope style={{ color: '#00ff00' }} />
                      <span>{emp.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="employment-info">
                    <div className="info-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '5px',
                      fontSize: '14px'
                    }}>
                      <FaCalendar style={{ color: '#00ff00' }} />
                      <span>{new Date(emp.joiningDate).toLocaleDateString()}</span>
                    </div>
                    <div className="info-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}>
                      <FaClock style={{ color: '#00ff00' }} />
                      <span>{emp.shift || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="card-actions" style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '15px',
                  paddingTop: '10px',
                  borderTop: '1px solid #16213e'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(emp);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="View Employee"
                  >
                    👁️ View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(id, emp);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Edit Employee"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(id, emp.name);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Delete Employee"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="table-container" style={{
            backgroundColor: '#1a1a2e',
            borderRadius: '10px',
            border: '1px solid #0f3460',
            overflow: 'hidden'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#16213e' }}>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#00ff00',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #0f3460'
                  }}>EMPLOYEE</th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#00ff00',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #0f3460'
                  }}>ROLE</th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#00ff00',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #0f3460'
                  }}>CONTACT</th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#00ff00',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #0f3460'
                  }}>JOINING DATE</th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#00ff00',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #0f3460'
                  }}>SHIFT</th>
                  <th style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#00ff00',
                    fontWeight: 'bold',
                    borderBottom: '1px solid #0f3460'
                  }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredEmployees).map(([id, emp]) => (
                  <tr key={id} 
                    onClick={() => handleRowClick(emp)}
                    style={{
                      cursor: 'pointer',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.parentNode.style.backgroundColor = '#16213e'}
                    onMouseLeave={(e) => e.target.parentNode.style.backgroundColor = 'transparent'}
                  >
                    <td style={{
                      padding: '15px',
                      borderBottom: '1px solid #16213e'
                    }}>
                      <div className="employee-info">
                        <div style={{
                          fontWeight: 'bold',
                          color: '#fff'
                        }}>{emp.name}</div>
                        <div style={{
                          fontSize: '12px',
                          color: '#888'
                        }}>ID: {emp.employeeId || emp.aadhar}</div>
                      </div>
                    </td>
                    <td style={{
                      padding: '15px',
                      borderBottom: '1px solid #16213e'
                    }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: '#0f3460',
                        color: '#00ff00'
                      }}>
                        {emp.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{
                      padding: '15px',
                      borderBottom: '1px solid #16213e'
                    }}>
                      <div className="contact-info">
                        <div style={{
                          fontSize: '14px',
                          marginBottom: '3px'
                        }}>📞 {emp.mobile}</div>
                        <div style={{
                          fontSize: '14px',
                          color: '#888'
                        }}>📧 {emp.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td style={{
                      padding: '15px',
                      borderBottom: '1px solid #16213e'
                    }}>{new Date(emp.joiningDate).toLocaleDateString()}</td>
                    <td style={{
                      padding: '15px',
                      borderBottom: '1px solid #16213e'
                    }}>{emp.shift || 'N/A'}</td>
                    <td style={{
                      padding: '15px',
                      borderBottom: '1px solid #16213e'
                    }}>
                      <div className="action-buttons" style={{
                        display: 'flex',
                        gap: '8px'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(emp);
                          }}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="View Employee"
                        >
                          👁️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(id, emp);
                          }}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          title="Edit Employee"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(id, emp.name);
                          }}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
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
            <div className="empty-state" style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#1a1a2e',
              borderRadius: '10px',
              border: '1px solid #0f3460'
            }}>
              <FaUser style={{
                fontSize: '48px',
                color: '#666',
                marginBottom: '20px'
              }} />
              <h3 style={{
                color: '#fff',
                marginBottom: '10px'
              }}>No employees found</h3>
              <p style={{
                color: '#888'
              }}>Try adjusting your search criteria or add a new employee.</p>
            </div>
          )}
        </div>
      </div>

    {selectedEmployee && (
  <div className="modal-overlay" onClick={closeDetails}>
    <div className="employee-modal" onClick={(e) => e.stopPropagation()}>
      {/* Your existing modal content */}
      
      <div className="modal-actions" style={{ 
        marginTop: '30px', 
        padding: '20px', 
        borderTop: '1px solid #16213e',
        display: 'flex', 
        gap: '15px', 
        justifyContent: 'flex-end' 
      }}>
        <button
          onClick={() => {
            const welcomeMessage = `🎉 Welcome Message 🎉

Hello ${selectedEmployee.name}!

Welcome to HTAMS Company!

👤 Your Details:
🆔 Employee ID: ${selectedEmployee.employeeId || selectedEmployee.aadhar}
📧 Email: ${selectedEmployee.email || 'Not provided'}
🏢 Role: ${selectedEmployee.role}
📅 Joining Date: ${new Date(selectedEmployee.joiningDate).toLocaleDateString()}

🔐 Login Credentials:
👤 Username: ${selectedEmployee.email || selectedEmployee.mobile}
🔑 Temporary Password: ${selectedEmployee.mobile}

Welcome to the HTAMS family! 🎊
- HTAMS Management Team`;

            const encodedMessage = encodeURIComponent(welcomeMessage);
            const formattedNumber = selectedEmployee.mobile.replace(/[^\d]/g, '');
            const finalNumber = formattedNumber.startsWith('91') ? formattedNumber : '91' + formattedNumber;
            
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${finalNumber}&text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
          }}
          style={{ 
            backgroundColor: '#25D366', 
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          📱 Send WhatsApp Message
        </button>
      </div>
    </div>
  </div>
)}






    </div>
  );
}

export default Employees;
