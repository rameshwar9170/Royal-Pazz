import React, { useEffect, useState } from 'react';
import { ref, get, push, set, update } from 'firebase/database';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
    accusage: "1"
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
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
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
        
        // Send SMS notifications to participants
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

  // ENHANCED SEARCH AND FILTER FUNCTIONALITY
  const filteredTrainings = trainings.filter(t => {
    // Enhanced search functionality - searches in multiple fields
    const matchesSearch = !searchTerm || 
      t.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(t.products) && t.products.some(product => 
        product.toLowerCase().includes(searchTerm.toLowerCase())
      )) ||
      (typeof t.products === 'string' && t.products.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && isActiveTraining(t)) ||
      (filterStatus === 'pending' && t.status === 'pending') ||
      (filterStatus === 'completed' && t.status === 'completed');
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalTrainings = filteredTrainings.length;
  const totalPages = Math.ceil(totalTrainings / trainingsPerPage);
  const indexOfLastTraining = currentPage * trainingsPerPage;
  const indexOfFirstTraining = indexOfLastTraining - trainingsPerPage;
  const currentTrainings = filteredTrainings.slice(indexOfFirstTraining, indexOfLastTraining);

  // Clear search function
  const clearSearch = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

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
        const updateCode = String(Math.floor(Math.random() * 900000) + 100000);
        const safeLocation = training.location.replace(/"/g, '');
        const message = `Training ${safeLocation} has been updated. Your Verification Code is ${updateCode}. - Expertskill Technology.`;
        const encodedMessage = encodeURIComponent(message);

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

        await new Promise(resolve => setTimeout(resolve, 500));

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
        return participant.mobile || participant.phone || participant.contact || null;
      })
      .filter(mobile => mobile && mobile.length >= 10)
      .map(mobile => {
        return mobile.replace(/[^\d]/g, '').slice(-10);
      });
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

// Enhanced Responsive Styles with Fixed Card Sizing
const styles = {
  // Root container - fully responsive
  dashPremiumRoot: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #5566b1ff 0%, #8759b1ff 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: 'clamp(10px, 3vw, 20px)',
    boxSizing: 'border-box',
  },
  
  // Header section with improved responsive design
  dashPremiumHeader: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 'clamp(12px, 3vw, 20px)',
    padding: 'clamp(20px, 4vw, 30px)',
    marginBottom: 'clamp(20px, 4vw, 30px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
    width: '100%',
    boxSizing: 'border-box',
  },

  headerTitleSection: {
    textAlign: 'center',
    marginBottom: 'clamp(25px, 5vw, 35px)',
  },

  dashPremiumPageTitle: {
    fontSize: 'clamp(1.8rem, 6vw, 2.8rem)',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
    textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
    lineHeight: '1.1',
    background: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    wordBreak: 'break-word',
  },

  dashPremiumPageSubtitle: {
    fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
    color: 'rgba(255,255,255,0.9)',
    margin: '12px 0 0 0',
    fontWeight: '500',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  },

  // Fully responsive controls section
  controlsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(15px, 3vw, 20px)',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 'clamp(12px, 3vw, 16px)',
    padding: 'clamp(15px, 3vw, 20px)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    width: '100%',
    boxSizing: 'border-box',
  },

  // Search section responsive design
  searchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
  },

  searchFiltersRow: {
    display: 'flex',
    gap: '15px',
    width: '100%',
    flexWrap: 'wrap',
  },

  searchWrapper: {
    position: 'relative',
    flex: '1',
    minWidth: '200px',
    display: 'flex',
    alignItems: 'center',
  },

  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '1.2rem',
    color: '#6366f1',
    zIndex: 2,
    pointerEvents: 'none',
  },

  searchInput: {
    width: '100%',
    padding: '14px 16px 14px 50px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: 'clamp(10px, 2vw, 14px)',
    fontSize: 'clamp(14px, 3vw, 16px)',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.95)',
    color: '#374151',
    minHeight: '52px',
    fontWeight: '500',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },

  clearSearchBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    transition: 'all 0.2s ease',
    width: '28px',
    height: '28px',
  },

  filterWrapper: {
    flex: '1',
    minWidth: '150px',
    display: 'flex',
    alignItems: 'center',
  },

  filterSelect: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: 'clamp(10px, 2vw, 14px)',
    fontSize: 'clamp(14px, 3vw, 16px)',
    background: 'rgba(255,255,255,0.95)',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    minHeight: '52px',
    fontWeight: '500',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },

  // Enhanced responsive buttons section
  buttonsSection: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },

  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 26px',
    border: 'none',
    borderRadius: 'clamp(10px, 2vw, 14px)',
    fontWeight: '700',
    fontSize: 'clamp(13px, 3vw, 15px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(0,0,0,0.25)',
    minWidth: '140px',
    minHeight: '52px',
    whiteSpace: 'nowrap',
    position: 'relative',
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flex: '1 1 auto',
    maxWidth: '220px',
  },

  actionBtnPrimary: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
  },

  actionBtnDanger: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: 'white',
  },

  actionBtnSuccess: {
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: 'white',
  },

  btnIcon: {
    fontSize: 'clamp(16px, 3vw, 18px)',
    fontWeight: 'bold',
  },

  // Search results info - responsive
  searchResultsInfo: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 'clamp(10px, 2vw, 12px)',
    padding: '15px 20px',
    marginBottom: '20px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 'clamp(13px, 3vw, 14px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    boxSizing: 'border-box',
  },

  searchResultsText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },

  resultCount: {
    background: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: '20px',
    fontWeight: '600',
    color: 'white',
  },

  clearAllBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    padding: '6px 12px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },

  // Form container - fully responsive
  createTrainingFormContainer: {
    background: 'white',
    borderRadius: 'clamp(15px, 3vw, 20px)',
    padding: 'clamp(20px, 4vw, 30px)',
    marginBottom: 'clamp(20px, 4vw, 30px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    width: '100%',
    boxSizing: 'border-box',
  },

  formHeader: {
    marginBottom: '25px',
    textAlign: 'center',
  },

  formTitle: {
    fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },

  trainingForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    width: '100%',
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  },

  formLabel: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 'clamp(13px, 3vw, 14px)',
  },

  formInput: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 'clamp(8px, 2vw, 10px)',
    fontSize: 'clamp(13px, 3vw, 14px)',
    transition: 'all 0.2s ease',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '44px',
  },

  formSelect: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 'clamp(8px, 2vw, 10px)',
    fontSize: 'clamp(13px, 3vw, 14px)',
    transition: 'all 0.2s ease',
    background: 'white',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '44px',
  },

  formSubmitBtn: {
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: 'clamp(10px, 2vw, 12px)',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '20px',
    alignSelf: 'center',
    boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)',
    minHeight: '48px',
    minWidth: '160px',
    maxWidth: '300px',
    width: '100%',
  },

  // Stats container - responsive grid
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
    width: '100%',
    boxSizing: 'border-box',
  },

  statCard: {
    background: 'white',
    borderRadius: 'clamp(12px, 3vw, 16px)',
    padding: 'clamp(18px, 4vw, 25px)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    border: '1px solid rgba(255,255,255,0.2)',
    minHeight: '120px',
    boxSizing: 'border-box',
  },

  statCardTotal: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
  },

  statCardParticipants: {
    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
    color: 'white',
  },

  statCardActive: {
    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    color: 'white',
  },

  statCardCompleted: {
    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    color: 'white',
  },

  statIcon: {
    fontSize: 'clamp(2rem, 6vw, 2.5rem)',
    opacity: '0.9',
    flexShrink: 0,
  },

  statContent: {
    flex: 1,
    minWidth: 0,
  },

  statNumber: {
    fontSize: 'clamp(1.8rem, 5vw, 2.2rem)',
    fontWeight: '700',
    marginBottom: '5px',
    lineHeight: '1',
  },

  statLabel: {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    opacity: '0.9',
    fontWeight: '500',
    lineHeight: '1.2',
  },

  // Pagination info - responsive
  paginationInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '0 10px',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: 'clamp(12px, 3vw, 14px)',
  },

  paginationText: {
    color: '#f0f0f0',
    fontSize: 'clamp(12px, 3vw, 14px)',
  },

  highlight: {
    color: 'white',
    fontWeight: '600',
  },

  // IMPROVED: Training cards container with consistent sizing
  trainingCardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
    width: '100%',
    boxSizing: 'border-box',
    justifyItems: 'stretch',
    alignItems: 'stretch',
  },

  trainingCardWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    height: '100%', // Make wrapper take full height
  },

  // FIXED: Consistent card sizing across all devices
  trainingCard: {
    background: 'white',
    borderRadius: 'clamp(12px, 3vw, 16px)',
    padding: '18px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.06)',
    width: '100%',
    minHeight: '320px', // Fixed minimum height for all cards
    maxHeight: 'none', // Allow natural expansion
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Distribute content evenly
    position: 'relative',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
    flex: 'none', // Don't grow/shrink
  },

  trainerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1',
    minWidth: '180px',
  },

  trainerAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '700',
    fontSize: '1.1rem',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
    flexShrink: 0,
  },

  trainerDetails: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },

  trainerName: {
    fontSize: 'clamp(1rem, 3vw, 1.15rem)',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 4px 0',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  trainerLocation: {
    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },

  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    lineHeight: '1',
  },

  statusBadgeActive: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
  },

  statusBadgePending: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
  },

  statusBadgeCompleted: {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
  },

  editBtn: {
    width: '34px',
    height: '34px',
    border: 'none',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
  },

  // IMPROVED: Card details with consistent spacing
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    flex: '1', // Take remaining space
    minHeight: '150px', // Ensure minimum content height
  },

  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: '8px',
    borderLeft: '3px solid #4f46e5',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '40px', // Consistent height for all items
  },

  detailIcon: {
    fontSize: '1rem',
    minWidth: '18px',
    flexShrink: 0,
    color: '#4f46e5',
  },

  detailLabel: {
    fontWeight: '600',
    color: '#374151',
    minWidth: '72px',
    fontSize: 'clamp(11px, 3vw, 13px)',
    flexShrink: 0,
  },

  detailValue: {
    color: '#6b7280',
    fontWeight: '500',
    fontSize: 'clamp(11px, 3vw, 13px)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // IMPROVED: Link section with consistent sizing
  linkSection: {
    background: 'white',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '2px solid',
    transition: 'all 0.2s ease',
    flexWrap: 'wrap',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '70px', // Consistent minimum height
    marginTop: 'auto', // Push to bottom of wrapper
  },

  linkSectionAccessible: {
    borderColor: '#10b981',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.05))',
  },

  linkSectionExpired: {
    borderColor: '#ef4444',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(220, 38, 38, 0.05))',
  },

  linkInfo: {
    flex: 1,
    minWidth: '120px',
  },

  linkStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600',
    marginBottom: '4px',
    fontSize: 'clamp(11px, 3vw, 13px)',
  },

  linkStatusAccessible: {
    color: '#f7f7f7ff',
  },

  linkStatusExpired: {
    color: '#ffffffff',
  },

  linkIcon: {
    fontSize: '10px',
  },

  linkText: {
    fontSize: 'clamp(11px, 3vw, 13px)',
  },

  linkExpire: {
    fontSize: 'clamp(10px, 3vw, 11px)',
    color: '#ffffffff',
    fontWeight: '500',
  },

  linkActions: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  linkBtn: {
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    fontSize: 'clamp(10px, 3vw, 11px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    minHeight: '28px',
    whiteSpace: 'nowrap',
  },

  linkBtnCopy: {
    background: '#6b7280',
    color: 'white',
  },

  linkBtnCopied: {
    background: '#10b981',
    color: 'white',
  },

  linkBtnOpen: {
    background: '#059669',
    color: 'white',
  },

  linkBtnExpired: {
    background: '#dc2626',
    color: 'white',
    cursor: 'not-allowed',
  },

  // Pagination - responsive
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '40px',
    flexWrap: 'wrap',
    padding: '0 10px',
  },

  paginationBtn: {
    padding: '10px 16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 'clamp(12px, 3vw, 14px)',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    minHeight: '40px',
    whiteSpace: 'nowrap',
  },

  paginationBtnDisabled: {
    opacity: '0.5',
    cursor: 'not-allowed',
  },

  pageNumbers: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  pageNumber: {
    width: '40px',
    height: '40px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 'clamp(12px, 3vw, 14px)',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageNumberActive: {
    background: 'white',
    color: '#4f46e5',
    borderColor: 'white',
  },

  // Loading skeleton with consistent height
  skeleton: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'loading 1.5s infinite',
    minHeight: '320px', // Match card minimum height
    borderRadius: 'clamp(12px, 3vw, 16px)',
  },

  skeletonLine: {
    height: '18px',
    borderRadius: '4px',
    marginBottom: '8px',
  },

  skeletonLineTitle: {
    height: '20px',
    width: '70%',
  },

  skeletonLineText: {
    width: '100%',
  },

  // Empty state
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
    color: '#f0f0f0',
  },

  emptyIcon: {
    fontSize: 'clamp(3rem, 8vw, 4rem)',
    marginBottom: '20px',
  },

  emptyStateH3: {
    fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
    marginBottom: '10px',
    color: '#ffffff',
  },

  emptyStateP: {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    opacity: '0.8',
    color: '#f0f0f0',
  },

  // Modal styles (keeping your existing modal styles)
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    boxSizing: 'border-box',
  },

  modalContainer: {
    background: 'white',
    borderRadius: 'clamp(15px, 3vw, 20px)',
    maxWidth: 'min(800px, 95vw)',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    boxSizing: 'border-box',
  },

  modalHeader: {
    padding: '25px 25px 0 25px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '15px',
  },

  modalHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1,
    minWidth: 0,
  },

  modalTrainerAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '700',
    fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
    flexShrink: 0,
  },

  modalTrainerInfo: {
    flex: 1,
    minWidth: 0,
  },

  modalTitle: {
    fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 10px 0',
    lineHeight: '1.2',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  modalStatus: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: 'clamp(12px, 3vw, 14px)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },

  modalStatusActive: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: 'white',
  },

  modalStatusPending: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: 'white',
  },

  modalStatusCompleted: {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    color: 'white',
  },

  modalClose: {
    width: '40px',
    height: '40px',
    border: 'none',
    borderRadius: '50%',
    background: '#f3f4f6',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },

  modalContent: {
    padding: '0 25px 25px 25px',
  },

  modalSection: {
    marginBottom: '30px',
  },

  sectionTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 1.2rem)',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px',
    paddingBottom: '10px',
    borderBottom: '2px solid #e5e7eb',
  },

  detailGrid: {
    display: 'grid',
    gap: '15px',
    width: '100%',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '10px',
    borderLeft: '4px solid #4f46e5',
    gap: '10px',
    flexWrap: 'wrap',
    boxSizing: 'border-box',
  },

  detailRowFull: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '10px',
  },

  detailKey: {
    fontWeight: '600',
    color: '#374151',
    minWidth: '120px',
    fontSize: 'clamp(12px, 3vw, 14px)',
    flexShrink: 0,
  },

  detailVal: {
    color: '#6b7280',
    textAlign: 'right',
    flex: 1,
    fontSize: 'clamp(12px, 3vw, 14px)',
    wordBreak: 'break-word',
  },

  productsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
    width: '100%',
  },

  productTag: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: 'clamp(10px, 3vw, 12px)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },

  // Participants section - responsive
  participantsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '15px',
    width: '100%',
  },

  participantCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s ease',
    width: '100%',
    boxSizing: 'border-box',
  },

  participantAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '1rem',
    flexShrink: 0,
  },

  participantInfo: {
    flex: 1,
    minWidth: 0,
  },

  participantName: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
    fontSize: 'clamp(13px, 3vw, 14px)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  participantContact: {
    fontSize: 'clamp(11px, 3vw, 12px)',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  participantStatus: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0,
  },

  participantStatusConfirmed: {
    background: '#10b981',
    color: 'white',
  },

  participantStatusPending: {
    background: '#f59e0b',
    color: 'white',
  },
};

// Add responsive CSS for additional media queries
const additionalCSS = `
  <style>
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Improved responsive breakpoints for cards */
    @media (max-width: 1400px) {
      .training-cards-container {
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
      }
    }

    @media (max-width: 1024px) {
      .training-cards-container {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
        gap: 18px !important;
      }
    }

    @media (max-width: 768px) {
      .training-cards-container {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
        gap: 16px !important;
      }
      
      .mobile-stack {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 12px !important;
      }
      
      .mobile-full-width {
        width: 100% !important;
        max-width: none !important;
      }
      
      .mobile-text-center {
        text-align: center !important;
      }
      
      .mobile-hide-text {
        font-size: 0 !important;
      }
      
      .mobile-hide-text::before {
        font-size: 14px !important;
        content: attr(data-mobile-text) !important;
      }
    }

    @media (max-width: 640px) {
      .training-cards-container {
        grid-template-columns: 1fr !important;
        gap: 15px !important;
      }
    }

    @media (max-width: 480px) {
      .training-cards-container {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      
      .extra-small-text {
        font-size: 12px !important;
      }
      
      .extra-small-padding {
        padding: 8px !important;
      }
    }

    /* Ensure cards maintain consistent aspect ratio */
    .training-card-wrapper {
      aspect-ratio: auto !important;
    }

    .training-card {
      height: auto !important;
      min-height: 320px !important;
    }

    @media (max-width: 480px) {
      .training-card {
        min-height: 280px !important;
      }
    }
  </style>
`;

  // Add CSS keyframes for skeleton animation
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .mobile-stack {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      
      .mobile-full-width {
        width: 100% !important;
        max-width: none !important;
      }
      
      .mobile-text-center {
        text-align: center !important;
      }
      
      .mobile-hide-text {
        font-size: 0 !important;
      }
      
      .mobile-hide-text::before {
        font-size: 14px !important;
        content: attr(data-mobile-text) !important;
      }
    }

    @media (max-width: 480px) {
      .extra-small-text {
        font-size: 12px !important;
      }
      
      .extra-small-padding {
        padding: 10px !important;
      }
    }
  `;
  
  if (!document.head.querySelector('#responsive-training-styles')) {
    styleSheet.id = 'responsive-training-styles';
    document.head.appendChild(styleSheet);
  }

  return (
    <div style={styles.dashPremiumRoot}>
      {/* Enhanced Header Section with Organized Layout */}
      <div style={styles.dashPremiumHeader}>
        {/* Title Section */}
        <div style={styles.headerTitleSection}>
          <h1 style={styles.dashPremiumPageTitle}>🎓 Training Dashboard</h1>
          <p style={styles.dashPremiumPageSubtitle}>Monitor and manage all training sessions with ease</p>
        </div>
        
        {/* Enhanced Combined Controls Section */}
        <div style={styles.controlsSection}>
          {/* Enhanced Search Section */}
          <div style={styles.searchSection}>
            <div style={styles.searchFiltersRow}>
              <div style={styles.searchWrapper}>
                <div style={styles.searchIcon}>🔍</div>
                <input
                  type="text"
                  placeholder="Search trainings, trainers, locations, venues, products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.15)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                />
                {searchTerm && (
                  <button
                    style={styles.clearSearchBtn}
                    onClick={() => setSearchTerm('')}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                      e.target.style.color = '#374151';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#6b7280';
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div style={styles.filterWrapper}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={styles.filterSelect}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.15)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <option value="all">🔄 All Status</option>
                  <option value="active">⚡ Active</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="completed">✅ Completed</option>
                </select>
              </div>
            </div>

            {/* Enhanced Buttons Section */}
            <div style={styles.buttonsSection}>
              <button 
                style={{
                  ...styles.actionBtn,
                  ...(showCreateForm ? styles.actionBtnDanger : styles.actionBtnPrimary)
                }}
                onClick={toggleCreateForm}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.02)';
                  e.target.style.boxShadow = '0 12px 35px rgba(0,0,0,0.35)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
                }}
              >
                {showCreateForm ? (
                  <>
                    <span style={styles.btnIcon}>✕</span>
                    <span className="mobile-hide-text" data-mobile-text="Close">Close Form</span>
                  </>
                ) : (
                  <>
                    <span style={styles.btnIcon}>+</span>
                    <span className="mobile-hide-text" data-mobile-text="Create">Create Training</span>
                  </>
                )}
              </button>

              <button 
                style={{...styles.actionBtn, ...styles.actionBtnSuccess}}
                onClick={handleNavigateToTrainers}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-3px) scale(1.02)';
                  e.target.style.boxShadow = '0 12px 35px rgba(0,0,0,0.35)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
                }}
              >
                <span style={styles.btnIcon}>👨‍🏫</span>
                <span className="mobile-hide-text" data-mobile-text="Trainer">Register Trainer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Info */}
      {(searchTerm || filterStatus !== 'all') && (
        <div style={styles.searchResultsInfo}>
          <div style={styles.searchResultsText}>
            <span>🔍 Search Results:</span>
            <span style={styles.resultCount}>{filteredTrainings.length}</span>
            <span>training{filteredTrainings.length !== 1 ? 's' : ''} found</span>
            {searchTerm && <span>for "{searchTerm}"</span>}
            {filterStatus !== 'all' && <span>with status "{filterStatus}"</span>}
          </div>
          {(searchTerm || filterStatus !== 'all') && (
            <button
              style={styles.clearAllBtn}
              onClick={clearSearch}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Training Form */}
      {showCreateForm && (
        <div style={styles.createTrainingFormContainer}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>
              {editingTraining ? "✏️ Edit Training" : "🆕 Create New Training"}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} style={styles.trainingForm}>
            <div style={styles.formGrid}>
              {/* Location */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>📍 Location *</label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Enter training location"
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Venue */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>🏢 Venue *</label>
                <input
                  name="venue"
                  value={form.venue}
                  onChange={handleChange}
                  placeholder="Enter training venue"
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Start Date */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>📅 Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* End Date */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>📅 End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Start Time */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>🕐 Start Time *</label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Products */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>📦 Products *</label>
                <input
                  name="products"
                  value={form.products}
                  onChange={handleChange}
                  placeholder="Products (comma-separated)"
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Candidates */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>👥 Candidates *</label>
                <input
                  type="number"
                  name="candidates"
                  value={form.candidates}
                  onChange={handleChange}
                  placeholder="Number of candidates"
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Trainer */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>👨‍🏫 Trainer *</label>
                <select
                  name="trainerId"
                  value={form.trainerId}
                  onChange={handleChange}
                  required
                  style={styles.formSelect}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
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

              {/* Link Expire Date */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>⏰ Link Expire Date *</label>
                <input
                  type="date"
                  name="expireDate"
                  value={form.expireDate}
                  onChange={handleChange}
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Duration */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>⏱️ Duration (Hours) *</label>
                <input
                  type="number"
                  name="accessDuration"
                  value={form.accessDuration}
                  onChange={handleChange}
                  placeholder="Duration in hours"
                  required
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Fees */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>💰 Fees (₹) *</label>
                <input
                  type="number"
                  name="fees"
                  value={form.fees}
                  onChange={handleChange}
                  placeholder="Training fees"
                  required
                  min="0"
                  step="0.01"
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Photo URL */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>🖼️ Photo URL</label>
                <input
                  name="photo"
                  value={form.photo}
                  onChange={handleChange}
                  placeholder="Photo URL (optional)"
                  style={styles.formInput}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              style={styles.formSubmitBtn}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(5, 150, 105, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.3)';
              }}
            >
              {editingTraining ? "💾 Update Training" : "✨ Create Training"}
            </button>
          </form>
        </div>
      )}

      {/* Enhanced Stats Cards */}
      <div style={styles.statsContainer}>
        <div 
          style={{...styles.statCard, ...styles.statCardTotal}}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statIcon}>📚</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{trainings.length}</div>
            <div style={styles.statLabel}>Total Trainings</div>
          </div>
        </div>
        
        <div 
          style={{...styles.statCard, ...styles.statCardParticipants}}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statIcon}>👥</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{participantCount}</div>
            <div style={styles.statLabel}>Total Participants</div>
          </div>
        </div>
        
        <div 
          style={{...styles.statCard, ...styles.statCardActive}}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statIcon}>⚡</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{activeCount}</div>
            <div style={styles.statLabel}>Active Sessions</div>
          </div>
        </div>
        
        <div 
          style={{...styles.statCard, ...styles.statCardCompleted}}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
          }}
        >
          <div style={styles.statIcon}>✅</div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{completedCount}</div>
            <div style={styles.statLabel}>Completed</div>
          </div>
        </div>
      </div>

      {/* Pagination Info */}
      <div style={styles.paginationInfo}>
        <div style={styles.paginationText}>
          Showing <span style={styles.highlight}>{indexOfFirstTraining + 1}-{Math.min(indexOfLastTraining, totalTrainings)}</span> of <span style={styles.highlight}>{totalTrainings}</span> trainings
        </div>
        <div style={styles.paginationText}>
          Page <span style={styles.highlight}>{currentPage}</span> of <span style={styles.highlight}>{totalPages}</span>
        </div>
      </div>

      {/* Enhanced Training Cards */}
      <div style={styles.trainingCardsContainer}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{...styles.trainingCard, ...styles.skeleton}}>
              <div style={{...styles.skeletonLine, ...styles.skeletonLineTitle}}></div>
              <div style={{...styles.skeletonLine, ...styles.skeletonLineText}}></div>
              <div style={{...styles.skeletonLine, ...styles.skeletonLineText}}></div>
            </div>
          ))
        ) : currentTrainings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h3 style={styles.emptyStateH3}>No trainings found</h3>
            <p style={styles.emptyStateP}>
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first training to get started'}
            </p>
          </div>
        ) : (
          currentTrainings.map((t, idx) => (
            <div key={t.id} style={styles.trainingCardWrapper}>
              <div
                style={styles.trainingCard}
                onClick={() => setSelected(t)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                }}
              >
                <div style={styles.cardHeader} className="mobile-stack">
                  <div style={styles.trainerInfo}>
                    <div style={styles.trainerAvatar}>
                      {t.trainerName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={styles.trainerDetails}>
                      <h3 style={styles.trainerName}>
                        {t.trainerName || "Unknown Trainer"}
                      </h3>
                      <p style={styles.trainerLocation}>
                        📍 {t.location || 'No location'}
                      </p>
                    </div>
                  </div>
                  
                  <div style={styles.cardActions} className="mobile-full-width mobile-stack">
                    <span style={{
                      ...styles.statusBadge,
                      ...(isActiveTraining(t) 
                        ? styles.statusBadgeActive 
                        : t.status === 'completed' 
                          ? styles.statusBadgeCompleted 
                          : styles.statusBadgePending
                      )
                    }}>
                      {isActiveTraining(t) ? "⚡ Active" : `📌 ${t.status || 'Pending'}`}
                    </span>
                    {isActiveTraining(t) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTraining(t);
                        }}
                        style={styles.editBtn}
                        title="Update Training"
                        onMouseOver={(e) => {
                          e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={styles.cardDetails}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>📅</span>
                    <span style={styles.detailLabel}>Start Date</span>
                    <span style={styles.detailValue}>
                      {formatDate(getStartDate(t), 'start date')}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>👥</span>
                    <span style={styles.detailLabel}>Participants</span>
                    <span style={styles.detailValue}>
                      {t.participants ? Object.keys(t.participants).length : 0}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailIcon}>🏢</span>
                    <span style={styles.detailLabel}>Venue</span>
                    <span style={styles.detailValue}>{t.venue || '—'}</span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Training Link Section */}
              {t.joinLink && (
                <div style={{
                  ...styles.linkSection,
                  ...(isLinkAccessible(t) 
                    ? styles.linkSectionAccessible 
                    : styles.linkSectionExpired
                  )
                }}>
                  <div style={styles.linkInfo}>
                    <div style={{
                      ...styles.linkStatus,
                      ...(isLinkAccessible(t) 
                        ? styles.linkStatusAccessible 
                        : styles.linkStatusExpired
                      )
                    }}>
                      <span style={styles.linkIcon}>{isLinkAccessible(t) ? '🟢' : '🔴'}</span>
                      <span style={styles.linkText}>
                        Training Link: {isLinkAccessible(t) ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    <div style={styles.linkExpire}>
                      Expires: {formatDate(t.expireDate)}
                    </div>
                  </div>
                  
                  <div style={styles.linkActions}>
                    <button
                      onClick={() => copyTrainingLink(t.joinLink, t.id)}
                      style={{
                        ...styles.linkBtn,
                        ...(copiedId === t.id ? styles.linkBtnCopied : styles.linkBtnCopy)
                      }}
                      title="Copy Training Link"
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      {copiedId === t.id ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    
                    {isLinkAccessible(t) ? (
                      <a
                        href={t.joinLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{...styles.linkBtn, ...styles.linkBtnOpen}}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        🔗 Open
                      </a>
                    ) : (
                      <span style={{...styles.linkBtn, ...styles.linkBtnExpired}}>
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

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div style={styles.paginationContainer}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            style={{
              ...styles.paginationBtn,
              ...(currentPage === 1 ? styles.paginationBtnDisabled : {})
            }}
            onMouseOver={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            ← Previous
          </button>

          <div style={styles.pageNumbers}>
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
                    ...styles.pageNumber,
                    ...(currentPage === pageNum ? styles.pageNumberActive : {})
                  }}
                  onMouseOver={(e) => {
                    if (currentPage !== pageNum) {
                      e.target.style.background = 'rgba(255,255,255,0.2)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentPage !== pageNum) {
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              ...styles.paginationBtn,
              ...(currentPage === totalPages ? styles.paginationBtnDisabled : {})
            }}
            onMouseOver={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Enhanced Modal */}
      {selected && (
        <div 
          style={styles.modalOverlay} 
          onClick={() => setSelected(null)}
        >
          <div 
            style={styles.modalContainer} 
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderContent}>
                <div style={styles.modalTrainerAvatar}>
                  {selected.trainerName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={styles.modalTrainerInfo}>
                  <h2 style={styles.modalTitle}>
                    {selected.trainerName || "Training Details"}
                  </h2>
                  <span style={{
                    ...styles.modalStatus,
                    ...(isActiveTraining(selected) 
                      ? styles.modalStatusActive 
                      : selected.status === 'completed' 
                        ? styles.modalStatusCompleted 
                        : styles.modalStatusPending
                    )
                  }}>
                    {isActiveTraining(selected) ? "⚡ Active" : `📌 ${selected.status || 'Pending'}`}
                  </span>
                </div>
              </div>
              <button 
                style={styles.modalClose} 
                onClick={() => setSelected(null)}
                aria-label="Close modal"
                onMouseOver={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#6b7280';
                }}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalContent}>
              <div style={styles.modalSection}>
                <h3 style={styles.sectionTitle}>📋 Training Information</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>🆔 Trainer ID</span>
                    <span style={styles.detailVal}>{selected.trainerId || "—"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>📅 Start Date</span>
                    <span style={styles.detailVal}>
                      {formatDate(getStartDate(selected), 'modal start date')}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>🕐 Time</span>
                    <span style={styles.detailVal}>{selected.time || "—"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>⏰ Expire Date</span>
                    <span style={styles.detailVal}>
                      {formatDate(getExpireDate(selected), 'modal expire date')}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>📍 Location</span>
                    <span style={styles.detailVal}>{selected.location || "—"}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>🏢 Venue</span>
                    <span style={styles.detailVal}>{selected.venue || "—"}</span>
                  </div>
                  {selected.products && selected.products.length > 0 && (
                    <div style={{...styles.detailRow, ...styles.detailRowFull}}>
                      <span style={styles.detailKey}>📦 Products</span>
                      <span style={styles.detailVal}>
                        <div style={styles.productsList}>
                          {selected.products.map((product, idx) => (
                            <span key={idx} style={styles.productTag}>
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
                <div style={styles.modalSection}>
                  <h3 style={styles.sectionTitle}>
                    👥 Participants ({Object.keys(selected.participants).length})
                  </h3>
                  <div style={styles.participantsGrid}>
                    {Object.values(selected.participants).map((participant, i) => (
                      <div 
                        key={i} 
                        style={styles.participantCard}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div style={styles.participantAvatar}>
                          {participant.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div style={styles.participantInfo}>
                          <div style={styles.participantName}>
                            {participant.name}
                          </div>
                          <div style={styles.participantContact}>
                            {participant.email}
                          </div>
                        </div>
                        <div style={{
                          ...styles.participantStatus,
                          ...(participant.status === 'confirmed' || participant.confirmedByTrainer 
                            ? styles.participantStatusConfirmed 
                            : styles.participantStatusPending
                          )
                        }}>
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
