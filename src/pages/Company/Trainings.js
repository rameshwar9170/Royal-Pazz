import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { ref, get, push, set, remove, update } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';

const Trainings = () => {
  const navigate = useNavigate();
  
  // NEW: State variables for handling auth during trainer registration
  const [isRegisteringTrainer, setIsRegisteringTrainer] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  
  // Existing state variables
  const [trainers, setTrainers] = useState([]);
  const [activeTrainers, setActiveTrainers] = useState([]);
  const [expandedTrainingId, setExpandedTrainingId] = useState(null);
  const [expandedTrainerId, setExpandedTrainerId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [filteredTrainers, setFilteredTrainers] = useState([]);
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTrainerForReport, setSelectedTrainerForReport] = useState(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedTrainerForSuspend, setSelectedTrainerForSuspend] = useState(null);
  const [suspendForm, setSuspendForm] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [trainerStats, setTrainerStats] = useState({
    totalTrainers: 0,
    activeTrainers: 0,
    inactiveTrainers: 0,
    suspendedTrainers: 0
  });
  const [trainerForm, setTrainerForm] = useState({
    name: '',
    phone: '',
    email: '',
    experience: '',
    panCard: '',
    aadharCard: '',
    birthDate: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [selectedTrainers, setSelectedTrainers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // NEW: useEffect to handle authentication state changes during trainer registration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Store the admin user when they're logged in (not during trainer registration)
        if (!isRegisteringTrainer) {
          setAdminUser(user);
        }
        
        // If we're registering a trainer and a new user is signed in
        if (isRegisteringTrainer && adminUser && user.email !== adminUser.email) {
          console.log('Trainer account created, signing out trainer and maintaining page');
          // This is the newly created trainer, sign them out immediately
          signOut(auth).then(() => {
            console.log('Trainer signed out successfully');
            // Reset flag after trainer is signed out
            setTimeout(() => {
              setIsRegisteringTrainer(false);
            }, 500);
          }).catch((error) => {
            console.error('Error signing out trainer:', error);
            setIsRegisteringTrainer(false);
          });
        }
      } else {
        // User signed out
        if (!isRegisteringTrainer) {
          // Only handle logout if we're not in the middle of trainer registration
          console.log('Admin signed out normally');
          // You can add logout handling here if needed
        }
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [isRegisteringTrainer, adminUser]);

  // Sanitization functions
// Enhanced Sanitization functions with character-only validation
const sanitizeName = (input) => {
  // Only allow letters, spaces, and common name characters (apostrophes, hyphens)
  return input.replace(/[^a-zA-Z\s'-]/g, '').replace(/\s{2,}/g, ' ').trimStart();
};

const sanitizeExperience = (input) => {
  // Allow letters, numbers, spaces, and common punctuation for experience descriptions
  return input.replace(/[^a-zA-Z0-9\s.,-]/g, '').replace(/\s{2,}/g, ' ').trimStart();
};

const sanitizeAddress = (input) => {
  // Allow letters, numbers, spaces, and common address characters
  return input.replace(/[^a-zA-Z0-9\s.,-/#]/g, '').replace(/\s{2,}/g, ' ').trimStart();
};

const sanitizeCity = (input) => {
  // Only allow letters and spaces for city names
  return input.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ').trimStart();
};

const sanitizePhone = (input) => {
  // Only digits, limit to 10 characters
  const digits = input.replace(/\D/g, '');
  return digits.slice(0, 10);
};

const sanitizeEmail = (input) => {
  // Remove spaces, convert to lowercase, allow email characters
  return input.replace(/\s/g, '').toLowerCase().replace(/[^a-zA-Z0-9@._-]/g, '').trim();
};

const sanitizePanCard = (input) => {
  // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234R)
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 10);
};


const sanitizeAadharCard = (input) => {
  // Only digits, limit to 12 characters
  const digits = input.replace(/\D/g, '');
  return digits.slice(0, 12);
};

const sanitizePincode = (input) => {
  // Only digits, limit to 6 characters
  const digits = input.replace(/\D/g, '');
  return digits.slice(0, 6);
};

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('htamsUser');
  };

  const toggleTrainerForm = () => {
    setShowTrainerForm(prev => !prev);
    if (showTrainerForm) {
      resetTrainerForm();
      setEditingTrainer(null);
    }
  };

  const resetTrainerForm = () => {
    setTrainerForm({
      name: '',
      phone: '',
      email: '',
      experience: '',
      panCard: '',
      aadharCard: '',
      birthDate: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    });
  };

  const handleEditTrainer = (trainer) => {
    setTrainerForm({
      name: trainer.name || '',
      phone: trainer.phone || '',
      email: trainer.email || '',
      experience: trainer.experience || '',
      panCard: trainer.panCard || '',
      aadharCard: trainer.aadharCard || '',
      birthDate: trainer.birthDate || '',
      address: trainer.address || '',
      city: trainer.city || '',
      state: trainer.state || '',
      pincode: trainer.pincode || '',
    });
    
    setEditingTrainer(trainer);
    setShowTrainerForm(true);
  };

  // Function to check if trainer is currently suspended
  const isTrainerSuspended = (trainer) => {
    if (!trainer.suspendPeriod) return false;
    const today = new Date();
    const startDate = new Date(trainer.suspendPeriod.start);
    const endDate = new Date(trainer.suspendPeriod.end);
    return today >= startDate && today <= endDate;
  };

  // Calculate trainer statistics with filters
  const calculateTrainerStats = (trainersData) => {
    const active = trainersData.filter(trainer => trainer.active === true);
    const inactive = trainersData.filter(trainer => trainer.active === false);
    const suspended = trainersData.filter(trainer => isTrainerSuspended(trainer));
    
    setActiveTrainers(active);
    
    setTrainerStats({
      totalTrainers: trainersData.length,
      activeTrainers: active.length,
      inactiveTrainers: inactive.length,
      suspendedTrainers: suspended.length
    });
  };

  // Filter trainers based on status
  const filterTrainersByStatus = (trainersData, status) => {
    switch (status) {
      case 'active':
        return trainersData.filter(trainer => trainer.active === true && !isTrainerSuspended(trainer));
      case 'inactive':
        return trainersData.filter(trainer => trainer.active === false);
      case 'suspended':
        return trainersData.filter(trainer => isTrainerSuspended(trainer));
      case 'all':
        return trainersData;
      default:
        return trainersData;
    }
  };

  // Load initial data only once
  useEffect(() => {
    const loadInitialData = async () => {
      if (dataLoaded) return;
      
      try {
        setLoadingTrainers(true);
        const trainersRef = ref(db, 'HTAMS/company/trainers');
        const trainersSnapshot = await get(trainersRef);
        const trainersData = trainersSnapshot.val() || {};
        const formattedTrainers = Object.entries(trainersData)
          .map(([id, value]) => ({ id, ...value }));
        setTrainers(formattedTrainers);
        calculateTrainerStats(formattedTrainers);
        setLoadingTrainers(false);
        
        setDataLoaded(true);
        
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setLoadingTrainers(false);
      }
    };

    loadInitialData();
  }, [dataLoaded]);

  // Update filtered trainers when status filter or trainers change
  useEffect(() => {
    const filtered = filterTrainersByStatus(trainers, statusFilter);
    setFilteredTrainers(filtered);
  }, [trainers, statusFilter]);

  // Enhanced validation function for different field types
const validateField = (name, value) => {
  const errors = {};
  
  switch (name) {
    case 'name':
      if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        errors.name = 'Name can only contain letters, spaces, apostrophes, and hyphens';
      }
      if (value.trim().length < 2) {
        errors.name = 'Name must be at least 2 characters long';
      }
      break;
      
    case 'city':
      if (!/^[a-zA-Z\s]+$/.test(value)) {
        errors.city = 'City name can only contain letters and spaces';
      }
      break;
      
    case 'phone':
      if (!/^\d{10}$/.test(value)) {
        errors.phone = 'Phone number must be exactly 10 digits';
      }
      break;
      
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.email = 'Please enter a valid email address';
      }
      break;
      
    case 'panCard':
      // Updated PAN regex: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234R)
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(value)) {
        errors.panCard = 'PAN card must be in format: ABCDE1234R (5 letters, 4 digits, 1 letter)';
      }
      break;
      
    case 'aadharCard':
      if (!/^\d{12}$/.test(value)) {
        errors.aadharCard = 'Aadhar card must be exactly 12 digits';
      }
      break;
      
    case 'pincode':
      if (!/^\d{6}$/.test(value)) {
        errors.pincode = 'Pincode must be exactly 6 digits';
      }
      break;
      
    default:
      break;
  }
  
  return errors;
};

const handleTrainerChange = (e) => {
  const { name, value } = e.target;
  let processedValue = value;
  
  // Apply field-specific sanitization
  switch (name) {
    case 'name':
      processedValue = sanitizeName(value);
      break;
    case 'experience':
      processedValue = sanitizeExperience(value);
      break;
    case 'city':
      processedValue = sanitizeCity(value);
      break;
    case 'address':
      processedValue = sanitizeAddress(value);
      break;
    case 'phone':
      processedValue = sanitizePhone(value);
      break;
    case 'email':
      processedValue = sanitizeEmail(value);
      break;
    case 'panCard':
      processedValue = sanitizePanCard(value);
      break;
    case 'aadharCard':
      processedValue = sanitizeAadharCard(value);
      break;
    case 'pincode':
      processedValue = sanitizePincode(value);
      break;
    case 'state':
    case 'birthDate':
      processedValue = value;
      break;
    default:
      processedValue = value;
  }
  
  // Validate the processed value
  const fieldErrors = validateField(name, processedValue);
  
  // Update form state
  setTrainerForm((prev) => ({ ...prev, [name]: processedValue }));
  
  // You can add error state handling here if needed
  // For now, we'll just log validation errors
  if (Object.keys(fieldErrors).length > 0) {
    console.log('Validation errors:', fieldErrors);
  }
};


  // Final cleanup on blur for text fields
  const handleTrainerBlur = (e) => {
    const { name, value } = e.target;
    let cleanedValue = value;
    
    switch (name) {
      case 'name':
      case 'experience':
      case 'city':
        cleanedValue = value.trim().replace(/\s{2,}/g, ' ');
        break;
      case 'address':
        cleanedValue = value.trim();
        break;
      default:
        return;
    }
    
    if (cleanedValue !== value) {
      setTrainerForm((prev) => ({ ...prev, [name]: cleanedValue }));
    }
  };

  // Enhanced Toggle trainer active/inactive status
  const handleToggleTrainerStatus = async (trainerId) => {
    const trainer = trainers.find(t => t.id === trainerId);
    if (!trainer) {
      alert('Trainer not found!');
      return;
    }

    const newStatus = !trainer.active;
    const action = newStatus ? 'activate' : 'deactivate';
    
    const confirmMessage = `Are you sure you want to ${action} trainer "${trainer.name}"?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const updatedTrainers = trainers.map(t => 
        t.id === trainerId ? { ...t, active: newStatus } : t
      );
      
      setTrainers(updatedTrainers);
      calculateTrainerStats(updatedTrainers);
      
      const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
      await update(trainerRef, { 
        active: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: auth.currentUser?.email || 'admin'
      });
      
      alert(`✅ Trainer "${trainer.name}" has been ${action}d successfully!`);
      
    } catch (error) {
      console.error('Error updating trainer status:', error);
      
      const rolledBackTrainers = trainers.map(t => 
        t.id === trainerId ? { ...t, active: !newStatus } : t
      );
      setTrainers(rolledBackTrainers);
      calculateTrainerStats(rolledBackTrainers);
      
      alert(`❌ Failed to ${action} trainer: ${error.message}`);
    }
  };

  const handleToggleTrainerDetails = (trainer) => {
    if (expandedTrainerId === trainer.id) {
      setExpandedTrainerId(null);
    } else {
      setExpandedTrainerId(trainer.id);
    }
  };

  const handleShowTrainerReport = (trainer) => {
    setSelectedTrainerForReport(trainer);
    setShowReportModal(true);
  };

  const handleShowSuspendModal = (trainer) => {
    setSelectedTrainerForSuspend(trainer);
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSuspendForm({
      startDate: today,
      endDate: futureDate,
      reason: ''
    });
    setShowSuspendModal(true);
  };

  const handleSuspendSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTrainerForSuspend) return;

    const suspendData = {
      suspendPeriod: {
        start: suspendForm.startDate,
        end: suspendForm.endDate,
        reason: suspendForm.reason,
        suspendedAt: new Date().toISOString()
      },
      active: false
    };

    try {
      const updatedTrainers = trainers.map(t => 
        t.id === selectedTrainerForSuspend.id 
          ? { ...t, ...suspendData }
          : t
      );
      
      setTrainers(updatedTrainers);
      calculateTrainerStats(updatedTrainers);
      
      const trainerRef = ref(db, `HTAMS/company/trainers/${selectedTrainerForSuspend.id}`);
      await update(trainerRef, suspendData);
      
      alert('Trainer suspended successfully');
      setShowSuspendModal(false);
      setSuspendForm({ startDate: '', endDate: '', reason: '' });
      setSelectedTrainerForSuspend(null);
      
    } catch (error) {
      alert('Failed to suspend trainer: ' + error.message);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedTrainers.length === 0) {
      alert('Please select at least one trainer');
      return;
    }

    if (!bulkAction) {
      alert('Please select an action');
      return;
    }

    const action = bulkAction === 'activate' ? 'activate' : 'deactivate';
    const newStatus = bulkAction === 'activate';

    if (!window.confirm(`Are you sure you want to ${action} ${selectedTrainers.length} trainer(s)?`)) {
      return;
    }

    try {
      const updates = {};
      selectedTrainers.forEach(trainerId => {
        updates[`HTAMS/company/trainers/${trainerId}/active`] = newStatus;
        updates[`HTAMS/company/trainers/${trainerId}/statusUpdatedAt`] = new Date().toISOString();
      });

      const updatedTrainers = trainers.map(t => 
        selectedTrainers.includes(t.id) ? { ...t, active: newStatus } : t
      );
      
      setTrainers(updatedTrainers);
      calculateTrainerStats(updatedTrainers);

      await update(ref(db), updates);
      
      alert(`✅ Successfully ${action}d ${selectedTrainers.length} trainer(s)!`);
      setSelectedTrainers([]);
      setBulkAction('');
      
    } catch (error) {
      console.error('Bulk update error:', error);
      alert(`❌ Failed to update trainers: ${error.message}`);
    }
  };

  // Helper function to validate PAN card format step by step
const validatePanFormat = (pan) => {
  if (!pan || pan.length !== 10) {
    return 'PAN must be exactly 10 characters';
  }
  
  // Check first 5 characters (should be letters)
  if (!/^[A-Z]{5}/.test(pan.substring(0, 5))) {
    return 'First 5 characters must be letters (A-Z)';
  }
  
  // Check next 4 characters (should be digits)
  if (!/^[0-9]{4}/.test(pan.substring(5, 9))) {
    return 'Characters 6-9 must be digits (0-9)';
  }
  
  // Check last character (should be a letter)
  if (!/^[A-Z]/.test(pan.substring(9, 10))) {
    return 'Last character must be a letter (A-Z)';
  }
  
  return null; // Valid PAN format
};

  // UPDATED: Trainer form submission with useEffect handling
// UPDATED: Trainer form submission without page redirect
const handleTrainerSubmit = async (e) => {
  e.preventDefault();
  
  let trainerId = null;

  try {
    if (editingTrainer) {
      // Update existing trainer logic (unchanged)
      trainerId = editingTrainer.id;
      
      const updatedTrainerData = {
        ...trainerForm,
        id: trainerId,
        registrationDate: editingTrainer.registrationDate,
        active: editingTrainer.active !== undefined ? editingTrainer.active : true
      };
      
      const updatedTrainers = trainers.map(trainer => 
        trainer.id === trainerId ? updatedTrainerData : trainer
      );
      
      setTrainers(updatedTrainers);
      calculateTrainerStats(updatedTrainers);
      
      const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
      await update(trainerRef, trainerForm);
      
      alert('Trainer updated successfully');
      
    } else {
      // NEW TRAINER REGISTRATION - SIMPLIFIED WITHOUT FIREBASE AUTH
      
      // Generate a unique ID for the trainer (without Firebase Auth)
      const timestamp = new Date().getTime();
      const randomId = Math.random().toString(36).substring(2, 15);
      trainerId = `trainer_${timestamp}_${randomId}`;
      
      console.log('Creating trainer with ID:', trainerId);
      
      const newTrainerData = { 
        ...trainerForm, 
        id: trainerId,
        registrationDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        active: true,
        role: 'trainer',
        firstTime: true,
        lastLoginAt: null,
        authMethod: 'manual' // Indicate this trainer was created manually
      };
      
      // Update UI immediately
      const updatedTrainers = [...trainers, newTrainerData];
      setTrainers(updatedTrainers);
      calculateTrainerStats(updatedTrainers);
      
      // Save to database
      const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
      await set(trainerRef, newTrainerData);
      
      console.log('Trainer data saved to database successfully');
      
      alert('Trainer registered successfully!');
    }
    
    // Reset form and close it
    resetTrainerForm();
    setEditingTrainer(null);
    setShowTrainerForm(false);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    let errorMessage = `Failed to ${editingTrainer ? 'update' : 'register'} trainer: ${error.message}`;
    
    alert(errorMessage);
    
    // Rollback changes if there was an error
    if (!editingTrainer && trainerId) {
      const updatedTrainers = trainers.filter(t => t.id !== trainerId);
      setTrainers(updatedTrainers);
      calculateTrainerStats(updatedTrainers);
    }
  }
};


  const handleDeleteTrainer = async (trainerId) => {
    if (window.confirm('Are you sure you want to delete this trainer?')) {
      const trainerToDelete = trainers.find(t => t.id === trainerId);
      
      try {
        const updatedTrainers = trainers.filter(trainer => trainer.id !== trainerId);
        setTrainers(updatedTrainers);
        calculateTrainerStats(updatedTrainers);
        
        const trainerRef = ref(db, `HTAMS/company/trainers/${trainerId}`);
        await remove(trainerRef);
        
        alert('Trainer deleted successfully');
        
      } catch (error) {
        alert('Failed to delete trainer: ' + error.message);
        
        if (trainerToDelete) {
          const restoredTrainers = [...trainers, trainerToDelete];
          setTrainers(restoredTrainers);
          calculateTrainerStats(restoredTrainers);
        }
      }
    }
  };

  // Enhanced Trainer Statistics Cards
  const TrainerStatsCards = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      margin: '20px 0'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: '2rem' }}>👥</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
            {trainerStats.totalTrainers}
          </h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>Total Trainers</p>
        </div>
      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: '2rem' }}>✅</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
            {trainerStats.activeTrainers}
          </h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>Active Trainers</p>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: '2rem' }}>❌</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
            {trainerStats.inactiveTrainers}
          </h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>Inactive Trainers</p>
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontSize: '2rem' }}>⏸️</div>
        <div>
          <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
            {trainerStats.suspendedTrainers}
          </h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>Suspended</p>
        </div>
      </div>
    </div>
  );

  // Status Filter Buttons
  const StatusFilterButtons = () => (
    <div style={{
      display: 'flex',
      gap: '12px',
      margin: '20px 0',
      flexWrap: 'wrap'
    }}>
      {[
        { key: 'all', label: 'All Trainers', color: '#6b7280' },
        { key: 'active', label: 'Active', color: '#10b981' },
        { key: 'inactive', label: 'Inactive', color: '#ef4444' },
        { key: 'suspended', label: 'Suspended', color: '#8b5cf6' }
      ].map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => setStatusFilter(key)}
          style={{
            background: statusFilter === key ? color : 'white',
            color: statusFilter === key ? 'white' : color,
            border: `2px solid ${color}`,
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          {label} ({
            key === 'all' ? trainerStats.totalTrainers :
            key === 'active' ? trainerStats.activeTrainers :
            key === 'inactive' ? trainerStats.inactiveTrainers :
            trainerStats.suspendedTrainers
          })
        </button>
      ))}
    </div>
  );

  // Bulk Status Update Component
  // const BulkStatusUpdate = () => (
  //   <div style={{
  //     background: 'white',
  //     borderRadius: '8px',
  //     padding: '16px',
  //     margin: '20px 0',
  //     boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  //     border: '1px solid #e5e7eb'
  //   }}>
  //     <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>🔄 Bulk Status Update</h3>
      
  //     <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
  //       <select
  //         value={bulkAction}
  //         onChange={(e) => setBulkAction(e.target.value)}
  //         style={{
  //           padding: '8px 12px',
  //           border: '1px solid #d1d5db',
  //           borderRadius: '6px',
  //           fontSize: '14px'
  //         }}
  //       >
  //         <option value="">Select Action</option>
  //         <option value="activate">Activate Selected</option>
  //         <option value="deactivate">Deactivate Selected</option>
  //       </select>
        
  //       <button
  //         onClick={handleBulkStatusUpdate}
  //         disabled={selectedTrainers.length === 0 || !bulkAction}
  //         style={{
  //           background: selectedTrainers.length === 0 || !bulkAction ? '#d1d5db' : '#3b82f6',
  //           color: 'white',
  //           border: 'none',
  //           padding: '8px 16px',
  //           borderRadius: '6px',
  //           cursor: selectedTrainers.length === 0 || !bulkAction ? 'not-allowed' : 'pointer',
  //           fontSize: '14px',
  //           fontWeight: '500'
  //         }}
  //       >
  //         Update {selectedTrainers.length} Selected
  //       </button>
        
  //       <span style={{ color: '#6b7280', fontSize: '14px' }}>
  //         Selected: {selectedTrainers.length} trainer(s)
  //       </span>
  //     </div>
  //   </div>
  // );

  // Enhanced Trainers Table Component
  const EnhancedTrainersTable = () => (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      margin: '20px 0'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        background: '#f9fafb'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          👥 Trainers Management
          <span style={{
            background: '#3b82f6',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            ({filteredTrainers.length})
          </span>
        </h2>
      </div>
      
      {loadingTrainers ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem',
          color: '#6b7280'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p>Loading trainers...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Trainer Info
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Contact
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Experience
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTrainers.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }}>👥</div>
                        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                          No {statusFilter === 'all' ? '' : statusFilter} trainers found
                        </p>
                        {statusFilter === 'all' && (
                          <button 
                            onClick={toggleTrainerForm}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '0.75rem 1.5rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Register First Trainer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrainers.map((trainer) => {
                    const isSuspended = isTrainerSuspended(trainer);
                    const isExpanded = expandedTrainerId === trainer.id;
                    
                    return (
                      <React.Fragment key={trainer.id}>
                        {/* Main Trainer Row */}
                        <tr
                          style={{ 
                            borderBottom: isExpanded ? 'none' : '1px solid #e5e7eb',
                            background: isExpanded ? '#f8fafc' : 'transparent'
                          }}
                          onMouseEnter={(e) => !isExpanded && (e.target.closest('tr').style.backgroundColor = '#f9fafb')}
                          onMouseLeave={(e) => !isExpanded && (e.target.closest('tr').style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <strong style={{ color: '#1e293b', fontSize: '1rem' }}>
                                  {trainer.name}
                                </strong>
                                <small style={{ color: '#64748b' }}>
                                  ID: {trainer.id?.slice(0, 8)}...
                                </small>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.9rem' }}>{trainer.phone}</span>
                              <small style={{ color: '#64748b' }}>{trainer.email}</small>
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{
                              background: '#dbeafe',
                              color: '#1e40af',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              display: 'inline-block'
                            }}>
                              {trainer.experience}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                background: trainer.active ? '#d1fae5' : '#fee2e2',
                                color: trainer.active ? '#059669' : '#dc2626',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                width: 'fit-content'
                              }}>
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: trainer.active ? '#059669' : '#dc2626'
                                }}></div>
                                {trainer.active ? 'Active' : 'Inactive'}
                              </div>
                              
                              <button
                                onClick={() => handleToggleTrainerStatus(trainer.id)}
                                style={{
                                  background: trainer.active ? '#fecaca' : '#bbf7d0',
                                  color: trainer.active ? '#b91c1c' : '#15803d',
                                  border: `1px solid ${trainer.active ? '#f87171' : '#4ade80'}`,
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  width: 'fit-content'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'scale(1)';
                                }}
                                title={`Click to ${trainer.active ? 'deactivate' : 'activate'} trainer`}
                              >
                                {trainer.active ? '🔴 Deactivate' : '🟢 Activate'}
                              </button>
                              
                              {isSuspended && (
                                <div style={{
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  padding: '2px 6px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  border: '1px solid #fbbf24'
                                }}>
                                  ⏸️ Suspended until {new Date(trainer.suspendPeriod.end).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              onClick={() => handleToggleTrainerDetails(trainer)}
                              title={isExpanded ? "Hide Details" : "View Details"}
                              style={{
                                background: isExpanded ? '#059669' : '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                            >
                              {isExpanded ? '👁️ Hide Details' : '👁️ View Details'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* EXPANDED DETAILS ROW */}
                        {isExpanded && (
                          <tr style={{ 
                            borderBottom: '1px solid #e5e7eb',
                            background: '#f8fafc'
                          }}>
                            <td colSpan="5" style={{ padding: '0' }}>
                              <div style={{
                                padding: '24px',
                                background: 'white',
                                margin: '8px',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}>
                                <div style={{ marginBottom: '24px' }}>
                                  <h3 style={{ 
                                    color: '#1f2937', 
                                    marginBottom: '16px',
                                    fontSize: '1.25rem',
                                    fontWeight: '600',
                                    borderBottom: '2px solid #e5e7eb',
                                    paddingBottom: '8px'
                                  }}>
                                    👤 Trainer Details
                                  </h3>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px'
                                  }}>
                                    <div><strong>Name:</strong> {trainer.name}</div>
                                    <div><strong>Email:</strong> {trainer.email}</div>
                                    <div><strong>Phone:</strong> {trainer.phone}</div>
                                    <div><strong>Experience:</strong> {trainer.experience}</div>
                                    <div><strong>Birth Date:</strong> {trainer.birthDate || 'N/A'}</div>
                                    <div><strong>PAN Card:</strong> {trainer.panCard || 'N/A'}</div>
                                    <div><strong>Aadhar Card:</strong> {trainer.aadharCard || 'N/A'}</div>
                                    <div><strong>City:</strong> {trainer.city || 'N/A'}</div>
                                    <div><strong>State:</strong> {trainer.state || 'N/A'}</div>
                                    <div><strong>Pincode:</strong> {trainer.pincode || 'N/A'}</div>
                                    <div><strong>Status:</strong> {trainer.active ? 'Active' : 'Inactive'}</div>
                                    <div><strong>Registration Date:</strong> {trainer.registrationDate || 'N/A'}</div>
                                  </div>
                                  
                                  {trainer.address && (
                                    <div style={{ marginTop: '16px' }}>
                                      <strong>Address:</strong><br />
                                      <div style={{ 
                                        background: '#f9fafb', 
                                        padding: '8px', 
                                        borderRadius: '4px', 
                                        marginTop: '4px' 
                                      }}>
                                        {trainer.address}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {isTrainerSuspended(trainer) && (
                                    <div style={{
                                      marginTop: '16px',
                                      padding: '12px',
                                      background: '#fef3c7',
                                      border: '1px solid #f59e0b',
                                      borderRadius: '8px',
                                      color: '#92400e'
                                    }}>
                                      <strong>⚠️ Suspended</strong><br />
                                      Period: {new Date(trainer.suspendPeriod.start).toLocaleDateString()} - {new Date(trainer.suspendPeriod.end).toLocaleDateString()}<br />
                                      {trainer.suspendPeriod.reason && (
                                        <>Reason: {trainer.suspendPeriod.reason}</>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                  <h4 style={{ 
                                    color: '#1f2937', 
                                    marginBottom: '12px',
                                    fontSize: '1rem',
                                    fontWeight: '600'
                                  }}>
                                    🔧 Actions
                                  </h4>
                                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => handleEditTrainer(trainer)}
                                      style={{
                                        background: '#f59e0b',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      ✏️ Update Trainer
                                    </button>
                                    
                                    <button
                                      onClick={() => handleShowTrainerReport(trainer)}
                                      style={{
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      📊 View Report
                                    </button>
                                    
                                    {!isSuspended && (
                                      <button
                                        onClick={() => handleShowSuspendModal(trainer)}
                                        style={{
                                          background: '#8b5cf6',
                                          color: 'white',
                                          border: 'none',
                                          padding: '8px 16px',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          fontWeight: '500'
                                        }}
                                      >
                                        ⏸️ Suspend Trainer
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => handleDeleteTrainer(trainer.id)}
                                      style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                      }}
                                    >
                                      🗑️ Delete Trainer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            Trainer Management
          </h1>
          
          <button
            onClick={() => navigate('/company-dashboard/total-trainers')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 12px -2px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0px)';
              e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }}
          >
            🎓 Create Trainings
          </button>
        </div>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Register and manage trainers for your training programs
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Trainer Statistics */}
        <TrainerStatsCards />
        
        {/* Status Filter Buttons */}
        <StatusFilterButtons />
        
        {/* Bulk Status Update */}
        {/* <BulkStatusUpdate /> */}
        
        {/* Toggle Button for Registration Form */}
        <button
          onClick={toggleTrainerForm}
          style={{
            background: showTrainerForm ? '#dc2626' : '#2563eb',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            margin: '20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {showTrainerForm ? '➖' : '➕'}
          {editingTrainer 
            ? showTrainerForm ? "Hide Edit Form" : "Show Edit Form"
            : showTrainerForm ? "Hide Registration Form" : "Register New Trainer"
          }
        </button>

        {/* Edit Mode Indicator */}
        {editingTrainer && showTrainerForm && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px',
            margin: '16px 0',
            color: '#92400e'
          }}>
            📝 Editing Trainer: {editingTrainer.name}
          </div>
        )}

        {/* Registration Status Indicator */}
        {isRegisteringTrainer && (
          <div style={{
            background: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px',
            margin: '16px 0',
            color: '#1e40af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #3b82f6',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            🔄 Registering trainer... Please wait.
          </div>
        )}

        {/* Trainer Registration/Edit Form */}
        {showTrainerForm && (
          <form 
            onSubmit={handleTrainerSubmit}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Personal Information Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#1f2937', marginBottom: '16px' }}>Personal Information</h3>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Full Name *
                </label>
                <input
                  name="name"
                  value={trainerForm.name}
                  onChange={handleTrainerChange}
                  onBlur={handleTrainerBlur}
                  placeholder="Enter full name (e.g., John Smith)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={trainerForm.birthDate}
                  onChange={handleTrainerChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Phone Number *
                </label>
                <input
                  name="phone"
                  value={trainerForm.phone}
                  onChange={handleTrainerChange}
                  placeholder="Enter phone number (digits only)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={trainerForm.email}
                  onChange={handleTrainerChange}
                  placeholder="Enter email address"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Experience/Qualifications *
                </label>
                <input
                  name="experience"
                  value={trainerForm.experience}
                  onChange={handleTrainerChange}
                  onBlur={handleTrainerBlur}
                  placeholder="Enter experience (e.g., 5 years software training)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Document Information Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#1f2937', marginBottom: '16px' }}>Document Information</h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* PAN Card Field - Updated with correct format */}
<div>
  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
    PAN Card Number *
  </label>
  <input
    name="panCard"
    value={trainerForm.panCard}
    onChange={handleTrainerChange}
    placeholder="Enter PAN (format: ABCDE1234R)"
    required
    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
    title="PAN must be in format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234R)"
    maxLength="10"
    style={{
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      textTransform: 'uppercase'
    }}
  />
</div>


              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Aadhar Card Number *
                </label>
                <input
                  name="aadharCard"
                  value={trainerForm.aadharCard}
                  onChange={handleTrainerChange}
                  placeholder="Enter Aadhar number (digits only)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Address Information Section */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#1f2937', marginBottom: '16px' }}>Address Information</h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Address *
              </label>
              <textarea
                name="address"
                value={trainerForm.address}
                onChange={handleTrainerChange}
                onBlur={handleTrainerBlur}
                placeholder="Enter full address (e.g., 123 Main Street, Apartment 4B)"
                required
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  City *
                </label>
                <input
                  name="city"
                  value={trainerForm.city}
                  onChange={handleTrainerChange}
                  onBlur={handleTrainerBlur}
                  placeholder="Enter city (e.g., New York)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  State *
                </label>
                <select
                  name="state"
                  value={trainerForm.state}
                  onChange={handleTrainerChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select State</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Delhi">Delhi</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Pincode *
                </label>
                <input
                  name="pincode"
                  value={trainerForm.pincode}
                  onChange={handleTrainerChange}
                  placeholder="Enter pincode (digits only)"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isRegisteringTrainer}
              style={{
                background: isRegisteringTrainer ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: isRegisteringTrainer ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isRegisteringTrainer ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Registering...
                </>
              ) : (
                editingTrainer ? "Update Trainer" : "Register Trainer"
              )}
            </button>
          </form>
        )}
        
        <EnhancedTrainersTable />
      </div>

      {/* Trainer Report Modal */}
      {showReportModal && selectedTrainerForReport && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowReportModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>📊 Trainer Report</h2>
              <button
                onClick={() => setShowReportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <h3 style={{ color: '#1f2937' }}>{selectedTrainerForReport.name}</h3>
            
            <p style={{ color: '#6b7280' }}>
              Detailed reports and analytics will be available in future updates.
            </p>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && selectedTrainerForSuspend && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowSuspendModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: 0, color: '#dc2626' }}>⏸️ Suspend Trainer</h2>
              <button
                onClick={() => setShowSuspendModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              You are suspending <strong>{selectedTrainerForSuspend.name}</strong>. 
              Please specify the suspension period and reason.
            </p>
            
            <form onSubmit={handleSuspendSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={suspendForm.startDate}
                  onChange={(e) => setSuspendForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  End Date *
                </label>
                <input
                  type="date"
                  value={suspendForm.endDate}
                  onChange={(e) => setSuspendForm(prev => ({ ...prev, endDate: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Reason for Suspension *
                </label>
                <textarea
                  value={suspendForm.reason}
                  onChange={(e) => setSuspendForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please provide reason for suspension..."
                  required
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  style={{
                    flex: 1,
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Suspend Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Trainings;
