import React, { useEffect, useState } from 'react';
import { ref, get, push, set, update } from 'firebase/database';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import '../styles/DashboardPremium.css';

function isActiveTraining(training) {
  if (training.status === 'active') return true;
  if (training.expireDate) {
    const now = Date.now();
    const exp = new Date(training.expireDate).getTime();
    if (exp > now) return true;
  }
  return false;
}

export default function Dashboard() {
  const navigate = useNavigate(); // Navigation hook
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const SMS_CONFIG = {
  username: "Experts",
  authkey: "ba9dcdcdfcXX",
  senderId: "EXTSKL",
  accusage: "1" // Add this if needed
};

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [trainingsPerPage] = useState(10);
  
  // Create Training Form States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [form, setForm] = useState({
    location: '',
    venue: '',
    startDate: '',
    endDate: '',
    time: '',
    products: '',
    candidates: '',
    trainerId: '',
    expireDate: '',
    accessDuration: '',
    fees: '',
    photo: '',
  });

  // Copy link state
  const [copiedId, setCopiedId] = useState(null);

  // Navigation function for trainers page
  const handleNavigateToTrainers = () => {
    navigate('/company-dashboard/trainers');
  };

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [tSnap, uSnap, trainersSnap] = await Promise.all([
          get(ref(db, 'HTAMS/company/trainings')),
          get(ref(db, 'HTAMS/users')),
          get(ref(db, 'HTAMS/company/trainers')),
        ]);
        
        const tArr = tSnap.exists()
          ? Object.entries(tSnap.val()).map(([id, t]) => {
              console.log(`Training ${id}:`, {
                date: t.date,
                expireDate: t.expireDate,
                startDate: t.startDate,
                trainerName: t.trainerName
              });
              return { id, ...t };
            })
          : [];
          
        const uArr = uSnap.exists()
          ? Object.entries(uSnap.val()).map(([uid, u]) => ({ ...u, uid }))
          : [];
          
        const trainersArr = trainersSnap.exists()
          ? Object.entries(trainersSnap.val()).map(([id, trainer]) => ({ id, ...trainer }))
          : [];
          
        // Sort trainings by date (latest first)
        const sortedTrainings = tArr.sort((a, b) => {
          const dateA = new Date(getStartDate(a) || '1900-01-01').getTime();
          const dateB = new Date(getStartDate(b) || '1900-01-01').getTime();
          return dateB - dateA; // Descending order (latest first)
        });
          
        setTrainings(sortedTrainings);
        setUsers(uArr);
        setTrainers(trainersArr);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Create Training Form Functions
  const toggleCreateForm = () => {
    setShowCreateForm(prev => !prev);
    if (showCreateForm) {
      resetForm();
      setEditingTraining(null);
    }
  };

  const resetForm = () => {
    setForm({
      location: '',
      venue: '',
      startDate: '',
      endDate: '',
      time: '',
      products: '',
      candidates: '',
      trainerId: '',
      expireDate: '',
      accessDuration: '',
      fees: '',
      photo: '',
    });
    setEditingTraining(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Edit training function
  const handleEditTraining = (training) => {
    setEditingTraining(training);
    setForm({
      location: training.location || '',
      venue: training.venue || '',
      startDate: training.startDate || '',
      endDate: training.endDate || '',
      time: training.time || '',
      products: Array.isArray(training.products)
        ? training.products.join(', ')
        : training.products || '',
      candidates: training.candidates ? training.candidates.toString() : '',
      trainerId: training.trainerId || '',
      expireDate: training.expireDate || '',
      accessDuration: training.accessDuration ? training.accessDuration.toString() : '',
      fees: training.fees !== undefined ? training.fees.toString() : '',
      photo: training.photo || '',
    });
    setShowCreateForm(true);
  };

  // Copy link function
  const copyTrainingLink = async (link, trainingId) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(trainingId);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(trainingId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const validateDates = () => {
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    const expireDate = new Date(form.expireDate);
    const today = new Date();
    
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    expireDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return { valid: false, message: 'Training start date cannot be before today' };
    }

    if (endDate < startDate) {
      return { valid: false, message: 'Training end date cannot be before start date' };
    }

    if (expireDate < today) {
      return { valid: false, message: 'Link expiration date cannot be before today' };
    }

    if (expireDate >= startDate) {
      return { valid: false, message: 'Link expiration date must be before training start date' };
    }

    return { valid: true };
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  const selectedTrainer = trainers.find((t) => t.id === form.trainerId);
  if (!selectedTrainer) {
    alert('Please select a trainer');
    return;
  }

  const dateValidation = validateDates();
  if (!dateValidation.valid) {
    alert(dateValidation.message);
    return;
  }

  if (isNaN(parseInt(form.candidates)) || parseInt(form.candidates) <= 0) {
    alert('Candidate count must be a valid positive number');
    return;
  }
  if (isNaN(parseInt(form.accessDuration)) || parseInt(form.accessDuration) <= 0) {
    alert('Access duration must be a valid positive number');
    return;
  }
  if (form.fees === '' || isNaN(parseFloat(form.fees)) || parseFloat(form.fees) < 0) {
    alert('Fees must be a valid positive number');
    return;
  }

  const dataToSave = {
    ...form,
    products: form.products.split(',').map((p) => p.trim()).filter(p => p.length > 0),
    candidates: parseInt(form.candidates),
    fees: parseFloat(form.fees),
    accessDuration: parseInt(form.accessDuration),
    trainerName: selectedTrainer.name || '',
    photo: form.photo || '',
    status: form.status || 'pending',
  };

  try {
    if (editingTraining) {
      // UPDATE EXISTING TRAINING
      const trainingRef = ref(db, `HTAMS/company/trainings/${editingTraining.id}`);
      await update(trainingRef, dataToSave);
      
      // Update and re-sort trainings
      const updatedTrainings = trainings.map(training => 
        training.id === editingTraining.id 
          ? { ...training, ...dataToSave }
          : training
      ).sort((a, b) => {
        const dateA = new Date(getStartDate(a) || '1900-01-01').getTime();
        const dateB = new Date(getStartDate(b) || '1900-01-01').getTime();
        return dateB - dateA;
      });
      
      setTrainings(updatedTrainings);
      
// **NEW: Send SMS notifications to participants**
if (editingTraining.participants) {
  const participantMobiles = extractParticipantMobiles(editingTraining.participants);

  if (participantMobiles.length > 0) {
    console.log('Sending SMS to participants:', participantMobiles);

    const smsResult = await sendTrainingUpdateMessage(
      { ...editingTraining, ...dataToSave },
      participantMobiles
    );

    console.log('SMS Result:', smsResult);

    if (smsResult.success) {
      alert(`Training updated successfully! ${smsResult.message}`);
    } else {
      alert(`Training updated successfully, but some SMS failed: ${smsResult.message}`);
    }

  } else {
    alert('Training updated successfully! (No valid participant mobile numbers)');
  }
} else {
  alert('Training updated successfully! (No participants found)');
}


      
    } else {
      // CREATE NEW TRAINING
      const newRef = push(ref(db, 'HTAMS/company/trainings'));
      const trainingId = newRef.key;
      const joinLink = `${window.location.origin}/join-training/${trainingId}`;
      
      const newTrainingData = { 
        ...dataToSave, 
        id: trainingId,
        status: 'pending', 
        joinLink, 
        joinedCount: 0 
      };
      
      // Add new training and re-sort
      const updatedTrainings = [newTrainingData, ...trainings].sort((a, b) => {
        const dateA = new Date(getStartDate(a) || '1900-01-01').getTime();
        const dateB = new Date(getStartDate(b) || '1900-01-01').getTime();
        return dateB - dateA;
      });
      
      setTrainings(updatedTrainings);
      await set(newRef, newTrainingData);
      alert('Training created successfully');
    }
    
    resetForm();
    setShowCreateForm(false);
    
  } catch (error) {
    alert('Failed to save training: ' + error.message);
  }
};


  // Stats calculation
  const participantCount = trainings.reduce(
    (sum, t) => sum + (t.participants ? Object.keys(t.participants).length : 0), 0);
  const activeCount = trainings.filter(isActiveTraining).length;
 const completedCount = trainings.filter(t => t.status === 'completed').length;


  // Filter trainings based on search and status
  const filteredTrainings = trainings.filter(t => {
    const matchesSearch = !searchTerm || 
      t.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && isActiveTraining(t)) ||
      t.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalTrainings = filteredTrainings.length;
  const totalPages = Math.ceil(totalTrainings / trainingsPerPage);
  const indexOfLastTraining = currentPage * trainingsPerPage;
  const indexOfFirstTraining = indexOfLastTraining - trainingsPerPage;
  const currentTrainings = filteredTrainings.slice(indexOfFirstTraining, indexOfLastTraining);

  // Enhanced formatDate function
  const formatDate = (dateString, fieldName = 'unknown') => {
    if (!dateString || dateString === '' || dateString === null || dateString === undefined) {
      return '—';
    }
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return '—';
      }
      
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return '—';
    }
  };

  // Function to get start date from multiple possible fields
  const getStartDate = (training) => {
    return training.startDate || training.date || training.trainingDate || null;
  };

  // Function to get expire date
  const getExpireDate = (training) => {
    return training.expireDate || training.endDate || training.expiryDate || null;
  };

  // Function to check if link is accessible
  const isLinkAccessible = (training) => {
    if (!training.expireDate) return false;
    const now = new Date();
    const expire = new Date(training.expireDate);
    return now <= expire;
  };

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

const sendTrainingUpdateMessage = async (training, participantMobiles) => {
  const results = [];

  for (const mobile of participantMobiles) {
    try {
      // Generate OTP
      const updateCode = String(Math.floor(Math.random() * 900000) + 100000);

      // Clean location text
      const safeLocation = training.location.replace(/"/g, '');

      // Create message
      const message = `Training ${safeLocation} has been updated. Your Verification Code is ${updateCode}. - Expertskill Technology.`;
      const encodedMessage = encodeURIComponent(message);

      // Prepare parameters
      const accusage = "1";
      const username = "Experts";
      const authkey = "ba9dcdcdfcXX";
      const mobiles = "+91" + mobile.trim();
      const senderId = "EXTSKL";

      const mainUrl = "https://mobicomm.dove-sms.com/submitsms.jsp?";
      const url = `${mainUrl}user=${username}&key=${authkey}&mobile=${mobiles}&message=${encodedMessage}&accusage=${accusage}&senderid=${senderId}`;

      console.log(`Sending to ${mobile} → URL:`, url);

      const response = await fetch(url, { method: 'GET' });
      const responseText = await response.text();

      const isSuccess = response.ok && responseText.toLowerCase().includes("success");

      if (!isSuccess) {
        console.warn(`SMS failed for ${mobile}:`, responseText);
      } else {
        console.log(`SMS sent successfully to ${mobile}`);
      }

      results.push({
        mobile,
        success: isSuccess,
        response: responseText
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // avoid spam blocking

    } catch (error) {
      console.error(`Error sending SMS to ${mobile}:`, error.message);
      results.push({ mobile, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  return {
    success: successCount > 0,
    message: `Training update notifications sent to ${successCount}/${totalCount} participants`,
    results
  };
};







const extractParticipantMobiles = (participants) => {
  if (!participants || typeof participants !== 'object') return [];
  
  return Object.values(participants)
    .map(participant => {
      // Extract mobile number from participant object
      // Adjust these field names based on your actual participant data structure
      return participant.mobile || participant.phone || participant.contact || null;
    })
    .filter(mobile => mobile && mobile.length >= 10) // Filter valid mobile numbers
    .map(mobile => {
      // Clean mobile number (remove +91, spaces, etc.)
      return mobile.replace(/[^\d]/g, '').slice(-10);
    });
};


  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  return (
    <div className="dash-premium-root">
      {/* Header */}
      <div className="dash-premium-header">
        <h1 className="dash-premium-page-title">Training Dashboard</h1>
        <p className="dash-premium-page-subtitle">Monitor and manage all training sessions</p>
        
        {/* Button Container */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '16px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Create Training Button */}
          <button 
            className="create-training-button"
            onClick={toggleCreateForm}
            style={{
              background: showCreateForm ? '#dc2626' : '#2563eb',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            {showCreateForm ? '✕ Close Form' : '+ Create Training'}
          </button>

          {/* Register Trainer Toggle Button */}
          <button 
            onClick={handleNavigateToTrainers}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#047857';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#059669';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            👨‍🏫 Register Trainer
          </button>
        </div>
      </div>

      {/* Create/Edit Training Form */}
      {showCreateForm && (
        <div className="create-training-form-container" style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          margin: '20px 0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>
            {editingTraining ? "Edit Training" : "Create New Training"}
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {/* All form fields remain the same */}
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Location *</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Training location"
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Venue *</label>
                <input
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="Training venue"
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Start Time *</label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Products *</label>
                <input
                  name="products"
                  value={form.products}
                  onChange={handleChange}
                  placeholder="Products (comma-separated)"
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Candidates *</label>
                <input
                  type="number"
                  name="candidates"
                  value={form.candidates}
                  onChange={handleChange}
                  placeholder="Number of candidates"
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Trainer *</label>
                <select
                  name="trainerId"
                  value={form.trainerId}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Trainer</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Link Expire Date *</label>
                <input
                  type="date"
                  name="expireDate"
                  value={form.expireDate}
                  onChange={handleChange}
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Duration (Hours) *</label>
                <input
                  type="number"
                  name="accessDuration"
                  value={form.accessDuration}
                  onChange={handleChange}
                  placeholder="Duration in hours"
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

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Fees (₹) *</label>
                <input
                  type="number"
                  name="fees"
                  value={form.fees}
                  onChange={handleChange}
                  placeholder="Training fees"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Photo URL</label>
                <input
                  name="photo"
                  value={form.photo}
                  onChange={handleChange}
                  placeholder="Photo URL (optional)"
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
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginTop: '16px'
              }}
            >
              {editingTraining ? "Update Training" : "Create Training"}
            </button>
          </form>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="dash-premium-metrics">
        <div className="dash-premium-metric">
          <div className="dash-premium-metric-icon">📚</div>
          <div className="dash-premium-metric-content">
            <div className="dash-premium-metric-num">{trainings.length}</div>
            <div className="dash-premium-metric-label">Total Trainings</div>
          </div>
        </div>
        <div className="dash-premium-metric">
          <div className="dash-premium-metric-icon">👥</div>
          <div className="dash-premium-metric-content">
            <div className="dash-premium-metric-num">{participantCount}</div>
            <div className="dash-premium-metric-label">Participants</div>
          </div>
        </div>
        <div className="dash-premium-metric">
          <div className="dash-premium-metric-icon">⚡</div>
          <div className="dash-premium-metric-content">
            <div className="dash-premium-metric-num">{activeCount}</div>
            <div className="dash-premium-metric-label">Active</div>
          </div>
        </div>
        <div className="dash-premium-metric">
          <div className="dash-premium-metric-icon">✅</div>
          <div className="dash-premium-metric-content">
            <div className="dash-premium-metric-num">{completedCount}</div>
            <div className="dash-premium-metric-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="dash-premium-filters">
        <div className="dash-premium-search-container">
          <input
            type="text"
            placeholder="Search trainings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dash-premium-search-input"
          />
          <div className="dash-premium-search-icon">🔍</div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="dash-premium-filter-select"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          {/* <option value="pending">Pending</option> */}
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Pagination Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '20px 0 10px 0',
        padding: '0 10px'
      }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          Showing {indexOfFirstTraining + 1}-{Math.min(indexOfLastTraining, totalTrainings)} of {totalTrainings} trainings
        </div>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Training Cards */}
     {/* Training Cards */}
{/* Training Cards */}
<div className="dash-premium-lists">
  {loading ? (
    Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="dash-premium-card-skeleton">
        <div className="dash-premium-skeleton-line dash-premium-skeleton-title"></div>
        <div className="dash-premium-skeleton-line dash-premium-skeleton-text"></div>
        <div className="dash-premium-skeleton-line dash-premium-skeleton-text"></div>
      </div>
    ))
  ) : currentTrainings.length === 0 ? (
    <div className="dash-premium-empty-state">
      <div className="dash-premium-empty-icon">📋</div>
      <h3>No trainings found</h3>
      <p>Try adjusting your search or filter criteria</p>
    </div>
  ) : (
    currentTrainings.map(t => (
      <div key={t.id} className="training-card-wrapper">
        <button
          className="dash-premium-card"
          onClick={() => setSelected(t)}
        >
          <div className="dash-premium-card-header">
            <div className="dash-premium-trainer-info">
              <div className="dash-premium-trainer-avatar">
                {t.trainerName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="dash-premium-trainer-details">
                <h3 className="dash-premium-trainer-name">
                  {t.trainerName || "Unknown Trainer"}
                </h3>
                <p className="dash-premium-trainer-location">
                  {t.location || 'No location'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`dash-premium-status ${isActiveTraining(t) ? 'active' : t.status || 'pending'}`}>
                {isActiveTraining(t) ? "Active" : (t.status || 'Pending')}
              </span>
              {/* Update Button - Only show for active trainings */}
              {isActiveTraining(t) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the card click
                    console.log('Update button clicked for:', t.id); // Debug log
                    handleEditTraining(t);
                  }}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                  title="Update Training"
                >
                  ✏️ Update
                </button>
              )}
            </div>
          </div>
          
          <div className="dash-premium-card-details">
            <div className="dash-premium-detail-item">
              <span className="dash-premium-detail-label">Start Date</span>
              <span className="dash-premium-detail-value">
                {formatDate(getStartDate(t), 'start date')}
              </span>
            </div>
            <div className="dash-premium-detail-item">
              <span className="dash-premium-detail-label">Participants</span>
              <span className="dash-premium-detail-value">
                {t.participants ? Object.keys(t.participants).length : 0}
              </span>
            </div>
            <div className="dash-premium-detail-item">
              <span className="dash-premium-detail-label">Venue</span>
              <span className="dash-premium-detail-value">{t.venue || '—'}</span>
            </div>
          </div>
        </button>
        
        {/* Training Link with Copy functionality */}
        {t.joinLink && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            background: isLinkAccessible(t) ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${isLinkAccessible(t) ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: isLinkAccessible(t) ? '#065f46' : '#991b1b'
              }}>
                Training Link: {isLinkAccessible(t) ? 'Active' : 'Expired'}
              </span>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                Expires: {formatDate(t.expireDate)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Copy Link Button */}
              <button
                onClick={() => copyTrainingLink(t.joinLink, t.id)}
                style={{
                  background: copiedId === t.id ? '#10b981' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Copy Training Link"
              >
                {copiedId === t.id ? '✓ Copied!' : '📋 Copy'}
              </button>
              
              {/* Open Link Button */}
              {isLinkAccessible(t) ? (
                <a
                  href={t.joinLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: '#059669',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  🔗 Open
                </a>
              ) : (
                <span style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  ❌ Expired
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    ))
  )}
</div>



      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          margin: '30px 0',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: currentPage === 1 ? '#f9fafb' : 'white',
              color: currentPage === 1 ? '#9ca3af' : '#374151',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ← Previous
          </button>

          {/* Page Numbers */}
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (currentPage <= 4) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = currentPage - 3 + i;
            }

            if (pageNum < 1 || pageNum > totalPages) return null;

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: currentPage === pageNum ? '#2563eb' : 'white',
                  color: currentPage === pageNum ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  minWidth: '40px'
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: currentPage === totalPages ? '#f9fafb' : 'white',
              color: currentPage === totalPages ? '#9ca3af' : '#374151',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Enhanced Modal */}
      {selected && (
        <div 
          className="dash-premium-modal-overlay" 
          onClick={() => setSelected(null)}
        >
          <div 
            className="dash-premium-modal" 
            onClick={e => e.stopPropagation()}
          >
            <div className="dash-premium-modal-header">
              <div className="dash-premium-modal-header-content">
                <div className="dash-premium-modal-trainer-avatar">
                  {selected.trainerName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="dash-premium-modal-trainer-info">
                  <h2 className="dash-premium-modal-title">
                    {selected.trainerName || "Training Details"}
                  </h2>
                  <span className={`dash-premium-status dash-premium-status-large ${
                    isActiveTraining(selected) ? 'active' : selected.status || 'pending'
                  }`}>
                    {isActiveTraining(selected) ? "Active" : (selected.status || 'Pending')}
                  </span>
                </div>
              </div>
              <button 
                className="dash-premium-modal-close" 
                onClick={() => setSelected(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="dash-premium-modal-content">
              <div className="dash-premium-modal-section">
                <h3 className="dash-premium-section-title">Training Information</h3>
                <div className="dash-premium-detail-grid">
                  <div className="dash-premium-detail-row">
                    <span className="dash-premium-detail-key">Trainer ID</span>
                    <span className="dash-premium-detail-val">{selected.trainerId || "—"}</span>
                  </div>
                  <div className="dash-premium-detail-row">
                    <span className="dash-premium-detail-key">Start Date</span>
                    <span className="dash-premium-detail-val">
                      {formatDate(getStartDate(selected), 'modal start date')}
                    </span>
                  </div>
                  <div className="dash-premium-detail-row">
                    <span className="dash-premium-detail-key">Time</span>
                    <span className="dash-premium-detail-val">{selected.time || "—"}</span>
                  </div>
                  <div className="dash-premium-detail-row">
                    <span className="dash-premium-detail-key">Expire Date</span>
                    <span className="dash-premium-detail-val">
                      {formatDate(getExpireDate(selected), 'modal expire date')}
                    </span>
                  </div>
                  <div className="dash-premium-detail-row">
                    <span className="dash-premium-detail-key">Location</span>
                    <span className="dash-premium-detail-val">{selected.location || "—"}</span>
                  </div>
                  <div className="dash-premium-detail-row">
                    <span className="dash-premium-detail-key">Venue</span>
                    <span className="dash-premium-detail-val">{selected.venue || "—"}</span>
                  </div>
                  {selected.products && selected.products.length > 0 && (
                    <div className="dash-premium-detail-row dash-premium-detail-row-full">
                      <span className="dash-premium-detail-key">Products</span>
                      <span className="dash-premium-detail-val">
                        <div className="dash-premium-products-list">
                          {selected.products.map((product, idx) => (
                            <span key={idx} className="dash-premium-product-tag">
                              {product}
                            </span>
                          ))}
                        </div>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Participants Section */}
              {selected.participants && Object.keys(selected.participants).length > 0 && (
                <div className="dash-premium-modal-section">
                  <h3 className="dash-premium-section-title">
                    Participants ({Object.keys(selected.participants).length})
                  </h3>
                  <div className="dash-premium-participants-grid">
                    {Object.values(selected.participants).map((participant, i) => (
                      <div key={i} className="dash-premium-participant-card">
                        <div className="dash-premium-participant-avatar">
                          {participant.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="dash-premium-participant-info">
                          <div className="dash-premium-participant-name">
                            {participant.name}
                          </div>
                          <div className="dash-premium-participant-contact">
                            {participant.email}
                          </div>
                        </div>
                        <div className={`dash-premium-participant-status ${
                          participant.status === 'confirmed' || participant.confirmedByTrainer 
                            ? 'confirmed' : 'pending'
                        }`}>
                          {participant.status === 'confirmed' || participant.confirmedByTrainer 
                            ? "✓" : "⏳"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
