import React, { useState, useEffect } from 'react';
import { ref, push, onValue, set, remove, update } from 'firebase/database';
// Remove Firebase Auth completely
import { database, storage } from '../../firebase/config'; // Add storage import
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    pan: '',
    role: '',
    joiningDate: '',
    shift: '',
    salaryAccount: {
      accountNo: '',
      ifscCode: '',
      bankName: ''
    },
    panCard: {
      file: null,
      downloadURL: '',
      fileName: '',
      uploadedAt: ''
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
  const [uploadingPan, setUploadingPan] = useState(false);
  const [showPanModal, setShowPanModal] = useState(false);
  const [selectedPanImage, setSelectedPanImage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMobileAuth, setShowMobileAuth] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

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
      pan: '',
      role: '',
      joiningDate: '',
      shift: '',
      salaryAccount: {
        accountNo: '',
        ifscCode: '',
        bankName: ''
      },
      panCard: {
        file: null,
        downloadURL: '',
        fileName: '',
        uploadedAt: ''
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
        
      case 'pan':
        if (!value) {
          error = 'PAN number is required';
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) {
          error = 'Invalid PAN format (e.g., ABCDE1234F)';
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
          // Validate DD/MM/YYYY format
          const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
          if (!datePattern.test(value)) {
            error = 'Date must be in DD/MM/YYYY format';
          } else {
            const parts = value.split('/');
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            
            // Validate date components
            if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
              error = 'Invalid date';
            } else {
              const selectedDate = new Date(year, month - 1, day);
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              if (selectedDate > today) {
                error = 'Joining date cannot be in the future';
              }
            }
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

  // Date formatting functions
  const formatDateToDDMMYYYY = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  const formatDateFromDDMMYYYY = (ddmmyyyy) => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return ddmmyyyy;
  };

  const convertDateForInput = (ddmmyyyy) => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
  };

  // Input formatters
  const formatInput = (name, value) => {
    switch (name) {
      case 'mobile':
        return value.replace(/\D/g, '').slice(0, 10);
      case 'aadhar':
        return value.replace(/\D/g, '').slice(0, 12);
      case 'pan':
        return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
      case 'accountNo':
        return value.replace(/\D/g, '').slice(0, 18);
      case 'ifscCode':
        return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
      case 'name':
      case 'bankName':
        return value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
      case 'joiningDate':
        // Convert from YYYY-MM-DD to DD/MM/YYYY for display
        return formatDateToDDMMYYYY(value);
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

    // Check for duplicate mobile, aadhar, and PAN
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

    const panExists = existingEmployees.find(([id, emp]) => 
      emp.pan === form.pan && (!editingId || id !== editingId)
    );
    if (panExists) {
      newErrors.pan = 'This PAN number is already registered';
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

      // Upload PAN card if file is selected
      let panCardData = form.panCard;
      if (form.panCard.file) {
        setUploadingPan(true);
        try {
          const panFileName = `panCard_${form.mobile}_${Date.now()}.${form.panCard.file.name.split('.').pop()}`;
          const panStorageRef = storageRef(storage, `employee_documents/${form.mobile}/${panFileName}`);
          
          console.log('Uploading PAN card:', panFileName);
          const panSnapshot = await uploadBytes(panStorageRef, form.panCard.file);
          const panDownloadURL = await getDownloadURL(panSnapshot.ref);
          
          panCardData = {
            downloadURL: panDownloadURL,
            fileName: form.panCard.file.name,
            uploadedAt: new Date().toISOString(),
            storagePath: `employee_documents/${form.mobile}/${panFileName}`
          };
          
          console.log('PAN card uploaded successfully:', panDownloadURL);
        } catch (uploadError) {
          console.error('PAN card upload failed:', uploadError);
          alert('Failed to upload PAN card. Please try again.');
          return;
        } finally {
          setUploadingPan(false);
        }
      }

      // Create employee data without authentication
      const employeeData = {
        name: form.name.trim(),
        mobile: form.mobile,
        email: form.email.trim(),
        aadhar: form.aadhar,
        pan: form.pan.toUpperCase(),
        role: form.role,
        joiningDate: form.joiningDate,
        shift: form.shift.trim(),
        salaryAccount: {
          accountNo: form.salaryAccount.accountNo,
          ifscCode: form.salaryAccount.ifscCode.toUpperCase(),
          bankName: form.salaryAccount.bankName.trim(),
        },
        panCard: panCardData,
        userId: userId,
        confirmed: editingId ? form.confirmed : true,
        registrationDate: editingId ? form.registrationDate : new Date().toISOString(),
        whatsappSent: editingId ? form.whatsappSent : false,
        // Login credentials setup
        defaultPassword: form.mobile, // Use mobile as default password
        passwordChanged: false, // Track if user changed password
        lastLoginAt: null,
        loginEnabled: true,
        firstTime: true, // First time login requires password setup
        mobileVerified: false, // Mobile verification status
        emailVerified: false // Email verification status
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

        // Create technician account in separate node for login system
        const technicianData = {
          employeeId: newEmployeeId,
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile,
          role: form.role,
          defaultPassword: form.mobile,
          passwordChanged: false,
          firstTime: true,
          mobileVerified: false,
          emailVerified: false,
          accountStatus: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: null
        };
        
        const technicianRef = ref(database, `HTAMS/technicians/${newEmployeeId}`);
        await set(technicianRef, technicianData);

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
            portalUrl: 'https://ONDO.co.in/employee-login', // Updated URL
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
          portalUrl: 'https://ONDO.co.in/employee-login',
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

  // PAN card file handling
  const handlePanCardUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload only image files (JPG, PNG, GIF) or PDF files.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB.');
        return;
      }
      
      setForm(prev => ({
        ...prev,
        panCard: {
          ...prev.panCard,
          file: file,
          fileName: file.name
        }
      }));
    }
  };

  const removePanCard = () => {
    setForm(prev => ({
      ...prev,
      panCard: {
        file: null,
        downloadURL: '',
        fileName: '',
        uploadedAt: ''
      }
    }));
  };

  const openPanModal = (imageUrl) => {
    setSelectedPanImage(imageUrl);
    setShowPanModal(true);
  };

  const closePanModal = () => {
    setShowPanModal(false);
    setSelectedPanImage(null);
  };

  // Mobile OTP functions
  const sendMobileOtp = async (mobile) => {
    try {
      // Simulate OTP sending (replace with actual SMS service)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('Generated OTP for', mobile, ':', otp);
      
      // Store OTP in session storage for verification (in production, use secure backend)
      sessionStorage.setItem(`otp_${mobile}`, otp);
      sessionStorage.setItem(`otp_${mobile}_timestamp`, Date.now().toString());
      
      setOtpSent(true);
      alert(`OTP sent to ${mobile}: ${otp} (Demo mode - in production this would be sent via SMS)`);
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      alert('Failed to send OTP. Please try again.');
      return false;
    }
  };

  const verifyMobileOtp = async (mobile, enteredOtp) => {
    try {
      const storedOtp = sessionStorage.getItem(`otp_${mobile}`);
      const timestamp = sessionStorage.getItem(`otp_${mobile}_timestamp`);
      
      if (!storedOtp || !timestamp) {
        alert('OTP expired or not found. Please request a new OTP.');
        return false;
      }
      
      // Check if OTP is expired (5 minutes)
      const otpAge = Date.now() - parseInt(timestamp);
      if (otpAge > 5 * 60 * 1000) {
        alert('OTP expired. Please request a new OTP.');
        sessionStorage.removeItem(`otp_${mobile}`);
        sessionStorage.removeItem(`otp_${mobile}_timestamp`);
        return false;
      }
      
      if (storedOtp === enteredOtp) {
        // Update employee mobile verification status
        const employeeRef = ref(database, `HTAMS/company/Employees/${mobile}`);
        await update(employeeRef, { mobileVerified: true });
        
        // Update technician account
        const technicianRef = ref(database, `HTAMS/technicians/${mobile}`);
        await update(technicianRef, { mobileVerified: true });
        
        // Clean up OTP
        sessionStorage.removeItem(`otp_${mobile}`);
        sessionStorage.removeItem(`otp_${mobile}_timestamp`);
        
        alert('Mobile number verified successfully!');
        return true;
      } else {
        alert('Invalid OTP. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      alert('Failed to verify OTP. Please try again.');
      return false;
    }
  };

  const handleMobileAuth = async (employeeId) => {
    setShowMobileAuth(true);
    setMobileOtp('');
    setOtpSent(false);
    
    // Auto-send OTP
    const employee = Object.entries(employees).find(([id]) => id === employeeId)?.[1];
    if (employee && employee.mobile) {
      await sendMobileOtp(employee.mobile);
    }
  };

  const handleOtpVerification = async (employeeId) => {
    if (!mobileOtp || mobileOtp.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }
    
    setVerifyingOtp(true);
    const employee = Object.entries(employees).find(([id]) => id === employeeId)?.[1];
    
    if (employee) {
      const verified = await verifyMobileOtp(employee.mobile, mobileOtp);
      if (verified) {
        setShowMobileAuth(false);
        // Refresh employee data
        window.location.reload();
      }
    }
    setVerifyingOtp(false);
  };

  return (
    <div className="employee-management">
      {/* Page Header */}
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

                <div className="form-group">
                  <label htmlFor="pan" className="form-label">
                    <FaIdCard className="label-icon" />
                    PAN Number
                  </label>
                  <input
                    id="pan"
                    type="text"
                    name="pan"
                    value={form.pan}
                    onChange={handleChange}
                    placeholder="e.g., ABCDE1234F"
                    required
                    className={`form-input ${errors.pan ? 'error' : ''}`}
                  />
                  {errors.pan && <span className="error-message">{errors.pan}</span>}
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
                  <div className="date-input-container">
                    <input
                      id="joiningDate"
                      type="text"
                      name="joiningDate"
                      value={form.joiningDate}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^0-9/]/g, '');
                        // Auto-format as user types DD/MM/YYYY
                        if (value.length >= 2 && value.indexOf('/') === -1) {
                          value = value.substring(0, 2) + '/' + value.substring(2);
                        }
                        if (value.length >= 5 && value.lastIndexOf('/') === 2) {
                          value = value.substring(0, 5) + '/' + value.substring(5);
                        }
                        if (value.length > 10) {
                          value = value.substring(0, 10);
                        }
                        setForm(prev => ({ ...prev, joiningDate: value }));
                        
                        // Validate the date
                        const error = validateField('joiningDate', value);
                        setErrors(prev => ({ ...prev, joiningDate: error }));
                      }}
                      placeholder="DD/MM/YYYY"
                      maxLength="10"
                      required
                      className={`form-input ${errors.joiningDate ? 'error' : ''}`}
                    />
                    <button
                      type="button"
                      className="calendar-btn"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      title="Open Calendar"
                    >
                      📅
                    </button>
                    {showDatePicker && (
                      <div className="date-picker-overlay" onClick={() => setShowDatePicker(false)}>
                        <div className="date-picker-container" onClick={(e) => e.stopPropagation()}>
                          <div className="date-picker-header">
                            <h4>Select Joining Date</h4>
                            <button 
                              type="button" 
                              className="close-picker-btn"
                              onClick={() => setShowDatePicker(false)}
                            >
                              ×
                            </button>
                          </div>
                          <input
                            type="date"
                            className="calendar-input"
                            value={convertDateForInput(form.joiningDate)}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => {
                              if (e.target.value) {
                                const formattedDate = formatDateToDDMMYYYY(e.target.value);
                                setForm(prev => ({ ...prev, joiningDate: formattedDate }));
                                const error = validateField('joiningDate', formattedDate);
                                setErrors(prev => ({ ...prev, joiningDate: error }));
                                setShowDatePicker(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
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
                disabled={loading || uploadingPan}
              >
                {uploadingPan ? 'Uploading PAN...' : loading ? 'Saving...' : editingId ? 'Update Employee' : 'Add Employee'}
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
                      <span>{getDisplayValue(emp.joiningDate)}</span>
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
                  {!emp.mobileVerified && (
                    <button 
                      className="action-btn verify-btn" 
                      onClick={(e) => {e.stopPropagation(); handleMobileAuth(id);}} 
                      title="Verify Mobile"
                    >
                      📱
                    </button>
                  )}
                  {emp.mobileVerified && (
                    <button 
                      className="action-btn verified-btn" 
                      title="Mobile Verified" 
                      disabled
                    >
                      📱✅
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
                    <td>{getDisplayValue(emp.joiningDate)}</td>
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
                        {!emp.mobileVerified && (
                          <button 
                            className="action-btn verify-btn" 
                            onClick={(e) => {e.stopPropagation(); handleMobileAuth(id);}} 
                            title="Verify Mobile"
                          >
                            📱
                          </button>
                        )}
                        {emp.mobileVerified && (
                          <button 
                            className="action-btn verified-btn" 
                            title="Mobile Verified" 
                            disabled
                          >
                            📱✅
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
                  <div className="info-item">
                    <FaIdCard className="info-icon" />
                    <div>
                      <span className="info-label">PAN</span>
                      <span className="info-value">{getDisplayValue(selectedEmployee.pan)}</span>
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
                        {getDisplayValue(selectedEmployee.joiningDate)}
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

                {/* PAN Card Document Section */}
                <div className="info-section">
                  <h4>Documents</h4>
                  <div className="info-item">
                    <FaIdCard className="info-icon" />
                    <div>
                      <span className="info-label">PAN Card</span>
                      <div className="info-value">
                        {selectedEmployee.panCard?.downloadURL ? (
                          <div className="document-actions">
                            <span className="document-status">✅ Uploaded</span>
                            <button 
                              className="view-document-btn"
                              onClick={() => openPanModal(selectedEmployee.panCard.downloadURL)}
                            >
                              👁️ View Document
                            </button>
                          </div>
                        ) : (
                          <span className="document-status missing">❌ Not Uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedEmployee.panCard?.uploadedAt && (
                    <div className="info-item">
                      <div>
                        <span className="info-label">Upload Date</span>
                        <span className="info-value">
                          {formatDateToDDMMYYYY(selectedEmployee.panCard.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAN Card Modal */}
      {showPanModal && selectedPanImage && (
        <div className="pan-modal-overlay" onClick={closePanModal}>
          <div className="pan-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pan-modal-header">
              <h3>📄 PAN Card Document</h3>
              <button className="pan-close-btn" onClick={closePanModal}>×</button>
            </div>
            <div className="pan-modal-body">
              <img 
                src={selectedPanImage} 
                alt="PAN Card Document"
                className="pan-document-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="pan-error-message" style={{display: 'none'}}>
                <h4>❌ Failed to Load Document</h4>
                <p>The PAN card document could not be displayed.</p>
              </div>
            </div>
            <div className="pan-modal-footer">
              <a 
                href={selectedPanImage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="download-pan-btn"
              >
                📥 Download
              </a>
              <button className="close-pan-btn" onClick={closePanModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Authentication Modal */}
      {showMobileAuth && (
        <div className="mobile-auth-overlay" onClick={() => setShowMobileAuth(false)}>
          <div className="mobile-auth-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-auth-header">
              <h3>📱 Mobile Verification</h3>
              <button className="mobile-auth-close-btn" onClick={() => setShowMobileAuth(false)}>×</button>
            </div>
            <div className="mobile-auth-body">
              <div className="verification-steps">
                <div className="step-indicator">
                  <div className="step active">1</div>
                  <div className="step-line"></div>
                  <div className="step">2</div>
                </div>
                <div className="step-labels">
                  <span className="step-label active">Send OTP</span>
                  <span className="step-label">Verify OTP</span>
                </div>
              </div>
              
              {otpSent ? (
                <div className="otp-verification">
                  <h4>Enter Verification Code</h4>
                  <p>We've sent a 6-digit code to your mobile number</p>
                  <div className="otp-input-container">
                    <input
                      type="text"
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="otp-input"
                      maxLength="6"
                    />
                  </div>
                  <div className="otp-actions">
                    <button
                      className="verify-otp-btn"
                      onClick={() => handleOtpVerification(Object.entries(employees).find(([id, emp]) => showMobileAuth)?.[0])}
                      disabled={verifyingOtp || mobileOtp.length !== 6}
                    >
                      {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button
                      className="resend-otp-btn"
                      onClick={() => {
                        const employee = Object.entries(employees).find(([id, emp]) => showMobileAuth)?.[1];
                        if (employee) sendMobileOtp(employee.mobile);
                      }}
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>
              ) : (
                <div className="otp-sending">
                  <h4>Sending OTP...</h4>
                  <p>Please wait while we send the verification code</p>
                  <div className="loading-spinner"></div>
                </div>
              )}
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
          background: #002B5C;
          padding: 1.5rem 1.5rem 1rem;
          color: white;
          position: relative;
          overflow: hidden;
          margin: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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
          color: white;
        }

        .page-icon {
          font-size: clamp(1.25rem, 3vw, 1.5rem);
          color: #F36F21;
          flex-shrink: 0;
        }

        .page-subtitle {
          font-size: clamp(0.875rem, 2.5vw, 1rem);
          color: rgba(255, 255, 255, 0.85);
          margin: 0.5rem 0 0 0;
          font-weight: 400;
        }

        .header-right {
          flex-shrink: 0;
        }

        .total-employees-card {
          background: #F36F21;
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          text-align: center;
          min-width: 150px;
          box-shadow: 0 4px 12px rgba(243, 111, 33, 0.4);
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .total-employees-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(243, 111, 33, 0.5);
          border-color: white;
        }

        .total-employees-number {
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          font-weight: 800;
          margin: 0;
          line-height: 1;
        }

        .total-employees-label {
          font-size: clamp(0.7rem, 2vw, 0.8rem);
          font-weight: 600;
          margin: 0.5rem 0 0 0;
          opacity: 0.95;
          letter-spacing: 0.05em;
        }

        .primary-btn {
          background: #F36F21;
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
          box-shadow: 0 4px 12px rgba(243, 111, 33, 0.3);
          white-space: nowrap;
        }

        .primary-btn:hover {
          background: #d96419;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(243, 111, 33, 0.4);
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
          border-color: #F36F21;
          box-shadow: 0 0 0 3px rgba(243, 111, 33, 0.1);
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
          color: #F36F21;
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
          color: #F36F21;
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
          background: #002B5C;
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
          background-color: #002B5C;
          color: white;
        }

        .view-btn:hover {
          background-color: #003875;
          transform: translateY(-1px);
        }

        .edit-btn {
          background-color: #F36F21;
          color: white;
        }

        .edit-btn:hover {
          background-color: #d96419;
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
          background: #F36F21;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .modal-close-btn:hover {
          background: #d96419;
          transform: rotate(90deg);
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
          color: #F36F21;
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

        /* PAN Card Upload Styles */
        .file-upload-container {
          position: relative;
        }

        .file-input {
          position: absolute;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
          z-index: 2;
        }

        .file-upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          background-color: #f9fafb;
          transition: all 0.3s ease;
          position: relative;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .file-upload-area:hover {
          border-color: #3b82f6;
          background-color: #eff6ff;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .upload-icon {
          font-size: 2rem;
          color: #6b7280;
        }

        .upload-text {
          color: #374151;
          line-height: 1.5;
        }

        .upload-text strong {
          color: #1f2937;
          font-weight: 600;
        }

        .upload-text small {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .file-preview {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }

        .file-info,
        .existing-file {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #ffffff;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .file-name {
          color: #374151;
          font-weight: 500;
          flex: 1;
          margin-right: 1rem;
        }

        .remove-file-btn,
        .view-file-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .remove-file-btn:hover {
          background-color: #fef2f2;
        }

        .view-file-btn {
          background-color: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .view-file-btn:hover {
          background-color: #2563eb;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        /* Document Actions Styles */
        .document-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .document-status {
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          background-color: #dcfce7;
          color: #166534;
        }

        .document-status.missing {
          background-color: #fef2f2;
          color: #991b1b;
        }

        .view-document-btn {
          background-color: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-document-btn:hover {
          background-color: #2563eb;
          transform: translateY(-1px);
        }

        /* Date Input and Calendar Picker Styles */
        .date-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .calendar-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 0 6px 6px 0;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s ease;
          border-left: 1px solid #e5e7eb;
          margin-left: -1px;
        }

        .calendar-btn:hover {
          background: #2563eb;
          transform: scale(1.05);
        }

        .date-input-container .form-input {
          border-radius: 6px 0 0 6px;
          flex: 1;
        }

        .date-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .date-picker-container {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          border: 1px solid #e5e7eb;
          min-width: 300px;
          animation: slideIn 0.3s ease-out;
        }

        .date-picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .date-picker-header h4 {
          margin: 0;
          color: #374151;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .close-picker-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 24px;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-picker-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
        }

        .calendar-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .calendar-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .calendar-input:hover {
          border-color: #9ca3af;
        }

        /* PAN Card Modal Styles */
        .pan-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.3s ease-out;
        }

        .pan-modal-content {
          background-color: #ffffff;
          border-radius: 16px;
          width: 95%;
          max-width: 800px;
          max-height: 95vh;
          overflow: hidden;
          box-shadow: 0 25px 75px rgba(0, 0, 0, 0.5);
          border: 1px solid #e5e7eb;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .pan-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid #e5e7eb;
          background-color: #f9fafb;
        }

        .pan-modal-header h3 {
          color: #111827;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .pan-close-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 32px;
          cursor: pointer;
          padding: 5px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .pan-close-btn:hover {
          background-color: #fef2f2;
          color: #ef4444;
          transform: scale(1.1);
        }

        .pan-modal-body {
          padding: 20px;
          text-align: center;
          background-color: #f9fafb;
          max-height: 70vh;
          overflow-y: auto;
        }

        .pan-document-image {
          max-width: 100%;
          max-height: 60vh;
          width: auto;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
          border: 2px solid #e5e7eb;
          transition: transform 0.3s ease;
          cursor: zoom-in;
        }

        .pan-document-image:hover {
          transform: scale(1.02);
        }

        .pan-error-message {
          background-color: #fef2f2;
          color: #991b1b;
          padding: 30px 20px;
          border-radius: 12px;
          border: 2px dashed #ef4444;
          font-size: 14px;
          line-height: 1.5;
        }

        .pan-error-message h4 {
          color: #dc2626;
          font-size: 18px;
          margin-bottom: 15px;
          font-weight: 700;
        }

        .pan-modal-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-top: 1px solid #e5e7eb;
          background-color: #ffffff;
          gap: 15px;
        }

        .download-pan-btn {
          background: linear-gradient(135deg, #10b981, #34d399);
          color: #ffffff;
          text-decoration: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .download-pan-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .close-pan-btn {
          background-color: #e5e7eb;
          color: #374151;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .close-pan-btn:hover {
          background-color: #d1d5db;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .pan-modal-content {
            width: 98%;
            margin: 10px;
          }

          .pan-modal-header {
            padding: 15px 20px;
          }

          .pan-modal-header h3 {
            font-size: 18px;
          }

          .pan-modal-body {
            padding: 15px;
          }

          .pan-document-image {
            max-height: 50vh;
          }

          .pan-modal-footer {
            flex-direction: column;
            gap: 10px;
            padding: 15px 20px;
          }

          .download-pan-btn,
          .close-pan-btn {
            width: 100%;
            text-align: center;
          }
        }

        /* Mobile Authentication Modal Styles */
        .mobile-auth-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          backdrop-filter: blur(5px);
          animation: fadeIn 0.3s ease-out;
        }

        .mobile-auth-content {
          background-color: #ffffff;
          border-radius: 16px;
          width: 95%;
          max-width: 450px;
          box-shadow: 0 25px 75px rgba(0, 0, 0, 0.3);
          border: 1px solid #e5e7eb;
          animation: slideIn 0.3s ease-out;
          overflow: hidden;
        }

        .mobile-auth-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 25px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .mobile-auth-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .mobile-auth-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 5px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .mobile-auth-close-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .mobile-auth-body {
          padding: 25px;
        }

        .verification-steps {
          margin-bottom: 25px;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }

        .step {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .step.active {
          background-color: #3b82f6;
          color: white;
        }

        .step-line {
          width: 40px;
          height: 2px;
          background-color: #e5e7eb;
          margin: 0 10px;
        }

        .step-labels {
          display: flex;
          justify-content: space-between;
          padding: 0 15px;
        }

        .step-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .step-label.active {
          color: #3b82f6;
        }

        .otp-verification {
          text-align: center;
        }

        .otp-verification h4 {
          margin: 0 0 10px 0;
          color: #111827;
          font-size: 18px;
          font-weight: 600;
        }

        .otp-verification p {
          margin: 0 0 20px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .otp-input-container {
          margin-bottom: 20px;
        }

        .otp-input {
          width: 100%;
          padding: 15px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 18px;
          text-align: center;
          letter-spacing: 3px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .otp-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .otp-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .verify-otp-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 16px;
        }

        .verify-otp-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .verify-otp-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .resend-otp-btn {
          background: none;
          border: 1px solid #e5e7eb;
          color: #6b7280;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .resend-otp-btn:hover {
          background-color: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        .otp-sending {
          text-align: center;
        }

        .otp-sending h4 {
          margin: 0 0 10px 0;
          color: #111827;
          font-size: 18px;
          font-weight: 600;
        }

        .otp-sending p {
          margin: 0 0 20px 0;
          color: #6b7280;
          font-size: 14px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Verify Button Styles */
        .verify-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .verify-btn:hover {
          background: linear-gradient(135deg, #d97706, #b45309);
          transform: translateY(-1px);
        }

        .verified-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          opacity: 0.8;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .mobile-auth-content {
            width: 98%;
            margin: 10px;
          }

          .mobile-auth-header {
            padding: 15px 20px;
          }

          .mobile-auth-body {
            padding: 20px;
          }

          .otp-input {
            font-size: 16px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}

export default Employees;
