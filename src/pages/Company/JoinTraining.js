import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ref, get, update, push, runTransaction } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaIdCard, FaCamera, FaShieldAlt, FaCheck, FaSpinner } from 'react-icons/fa';

// Module-level cache keyed by training id
const cachedTrainingData = {};

const JoinTraining = () => {
  const { id } = useParams();
  const location = useLocation();

  const getQueryParam = (key) => {
    return new URLSearchParams(location.search).get(key);
  };

  const [formMode, setFormMode] = useState('user');
  const [training, setTraining] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP verification states
  const [requestId, setRequestId] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Name validation states
  const [nameMatched, setNameMatched] = useState(false);
  const [nameMatchError, setNameMatchError] = useState('');

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState({});

  const [participant, setParticipant] = useState({
    name: '',
    firmName: '',
    mobile: '',
    email: '',
    referredBy: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    aadhar: '',
    aadharOtp: '',
    pan: '',
    panPhoto: null,
    passportPhoto: null,
    panPhotoUrl: '',
    passportPhotoUrl: '',
    otpSent: false,
    isOtpVerified: false,
    firmPan: '',
    aadharOwnerName: '',
    aadharOwnerAadhar: '',
    verifiedName: '',
    verifiedGender: '',
    verifiedDob: '',
  });

  const [passportPhotoError, setPassportPhotoError] = useState('');
  const [panPhotoError, setPanPhotoError] = useState('');

  // Backend proxy URLs
  const BACKEND_BASE_URL = 'https://kycapi-udqmpp6qhq-uc.a.run.app';
  const GENERATE_OTP_URL = `${BACKEND_BASE_URL}/api/generate-otp`;
  const VERIFY_OTP_URL = `${BACKEND_BASE_URL}/api/verify-otp`;

  // Field validation functions
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    if (name.length > 50) return 'Name must not exceed 50 characters';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.trim() !== name) return 'Name cannot have leading or trailing spaces';
    if (/\s{2,}/.test(name)) return 'Name cannot have multiple consecutive spaces';
    return '';
  };

  const validateFirmName = (firmName) => {
    const firmNameRegex = /^[a-zA-Z0-9\s&.-]+$/;
    if (!firmName) return 'Firm name is required';
    if (firmName.length < 2) return 'Firm name must be at least 2 characters long';
    if (firmName.length > 100) return 'Firm name must not exceed 100 characters';
    if (!firmNameRegex.test(firmName)) return 'Firm name can only contain letters, numbers, spaces, &, ., and -';
    if (firmName.trim() !== firmName) return 'Firm name cannot have leading or trailing spaces';
    if (/\s{2,}/.test(firmName)) return 'Firm name cannot have multiple consecutive spaces';
    return '';
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile) return 'Mobile number is required';
    if (!/^\d+$/.test(mobile)) return 'Mobile number can only contain digits';
    if (!mobileRegex.test(mobile)) return 'Enter a valid 10-digit Indian mobile number starting with 6-9';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (email.length > 100) return 'Email must not exceed 100 characters';
    if (!emailRegex.test(email)) return 'Enter a valid email address';
    if (email !== email.toLowerCase()) return 'Email should be in lowercase';
    return '';
  };

  const validateAddress = (address) => {
    const addressRegex = /^[a-zA-Z0-9\s,./\-#()]+$/;
    if (!address) return 'Address is required';
    if (address.length < 10) return 'Address must be at least 10 characters long';
    if (address.length > 200) return 'Address must not exceed 200 characters';
    if (!addressRegex.test(address)) return 'Address contains invalid characters';
    if (address.trim() !== address) return 'Address cannot have leading or trailing spaces';
    if (/\s{2,}/.test(address)) return 'Address cannot have multiple consecutive spaces';
    return '';
  };

  const validateCity = (city) => {
    const cityRegex = /^[a-zA-Z\s]+$/;
    if (!city) return 'City is required';
    if (city.length < 2) return 'City must be at least 2 characters long';
    if (city.length > 50) return 'City must not exceed 50 characters';
    if (!cityRegex.test(city)) return 'City can only contain letters and spaces';
    if (city.trim() !== city) return 'City cannot have leading or trailing spaces';
    if (/\s{2,}/.test(city)) return 'City cannot have multiple consecutive spaces';
    return '';
  };

  const validateState = (state) => {
    const stateRegex = /^[a-zA-Z\s]+$/;
    if (!state) return 'State is required';
    if (state.length < 2) return 'State must be at least 2 characters long';
    if (state.length > 50) return 'State must not exceed 50 characters';
    if (!stateRegex.test(state)) return 'State can only contain letters and spaces';
    if (state.trim() !== state) return 'State cannot have leading or trailing spaces';
    if (/\s{2,}/.test(state)) return 'State cannot have multiple consecutive spaces';
    return '';
  };

  const validatePin = (pin) => {
    const pinRegex = /^\d{6}$/;
    if (!pin) return 'PIN code is required';
    if (!/^\d+$/.test(pin)) return 'PIN code can only contain digits';
    if (!pinRegex.test(pin)) return 'Enter a valid 6-digit PIN code';
    if (pin.startsWith('0')) return 'PIN code cannot start with 0';
    return '';
  };

  const validateAadhar = (aadhar) => {
    const aadharRegex = /^\d{12}$/;
    if (!aadhar) return 'Aadhaar number is required';
    if (!/^\d+$/.test(aadhar)) return 'Aadhaar number can only contain digits';
    if (!aadharRegex.test(aadhar)) return 'Enter a valid 12-digit Aadhaar number';
    if (/^(\d)\1{11}$/.test(aadhar)) return 'Aadhaar number cannot have all same digits';
    return '';
  };

  const validatePan = (pan) => {
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
    if (!pan) return 'PAN number is required';
    if (pan.length !== 10) return 'PAN number must be exactly 10 characters';
    if (pan !== pan.toUpperCase()) return 'PAN number must be in uppercase';
    if (!panRegex.test(pan)) return 'Enter a valid PAN number (e.g., ABCDE1234F)';
    return '';
  };

  const validateOtp = (otp) => {
    const otpRegex = /^\d{6}$/;
    if (!otp) return 'OTP is required';
    if (!/^\d+$/.test(otp)) return 'OTP can only contain digits';
    if (!otpRegex.test(otp)) return 'Enter a valid 6-digit OTP';
    return '';
  };

  // Helper function to validate field
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
      case 'aadharOwnerName':
        return validateName(value);
      case 'firmName':
        return validateFirmName(value);
      case 'mobile':
        return validateMobile(value);
      case 'email':
        return validateEmail(value);
      case 'address':
        return validateAddress(value);
      case 'city':
        return validateCity(value);
      case 'state':
        return validateState(value);
      case 'pin':
        return validatePin(value);
      case 'aadhar':
      case 'aadharOwnerAadhar':
        return validateAadhar(value);
      case 'pan':
      case 'firmPan':
        return validatePan(value);
      case 'aadharOtp':
        return validateOtp(value);
      default:
        return '';
    }
  };

  // Helper function to normalize names for comparison
  const normalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .split(' ')
      .filter(word => word.length > 0)
      .sort() // Sort words to handle different order
      .join(' ');
  };

  // Helper function to check if names match
  const checkNameMatch = (enteredName, aadhaarName) => {
    if (!enteredName || !aadhaarName) return false;

    const normalizedEntered = normalizeName(enteredName);
    const normalizedAadhaar = normalizeName(aadhaarName);

    // Direct match
    if (normalizedEntered === normalizedAadhaar) return true;

    // Check if entered name is contained in aadhaar name or vice versa
    const enteredWords = normalizedEntered.split(' ');
    const aadhaarWords = normalizedAadhaar.split(' ');

    // Check if at least 70% of words match
    const commonWords = enteredWords.filter(word =>
      aadhaarWords.some(aadhaarWord =>
        aadhaarWord.includes(word) || word.includes(aadhaarWord)
      )
    );

    const matchPercentage = commonWords.length / Math.max(enteredWords.length, aadhaarWords.length);
    return matchPercentage >= 0.7; // At least 70% match required
  };

  // Function to validate name without re-verification
  const validateNameMatch = () => {
    if (!participant.isOtpVerified || !participant.verifiedName) return;

    const enteredName = formMode === 'user' ? participant.name : participant.aadharOwnerName;
    const aadhaarName = participant.verifiedName;

    if (checkNameMatch(enteredName, aadhaarName)) {
      setNameMatched(true);
      setNameMatchError('');
      setMessage(`Name verification successful! Your entered name matches with Aadhaar records. You can now proceed to submit the form.`);
    } else {
      setNameMatched(false);
      setNameMatchError(`Name mismatch! Entered: "${enteredName}" vs Aadhaar: "${aadhaarName}". Please check and correct your name.`);
      setMessage('');
    }
  };

  // Cache referrer so it doesn't trigger multiple updates
  useEffect(() => {
    const referrer = getQueryParam('ref');
    if (referrer) setParticipant((p) => ({ ...p, referredBy: referrer }));
  }, [location.search]);

  useEffect(() => {
    const fetchTraining = async () => {
      if (cachedTrainingData[id]) {
        const data = cachedTrainingData[id];
        if (data.expiresAt && Date.now() > data.expiresAt) {
          setMessage('This training link has expired.');
        } else {
          setTraining(data);
        }
        return;
      }
      try {
        const snap = await get(ref(db, `HTAMS/company/trainings/${id}`));
        if (snap.exists()) {
          const data = snap.val();
          if (data.expiresAt && Date.now() > data.expiresAt) {
            setMessage('This training link has expired.');
          } else {
            cachedTrainingData[id] = data;
            setTraining(data);
          }
        } else {
          setMessage('Training not found or invalid link.');
        }
      } catch {
        setMessage('Error loading training. Please try again.');
      }
    };

    fetchTraining();
  }, [id, location.search]);

  // Effect to validate name when user changes name after OTP verification
  useEffect(() => {
    if (participant.isOtpVerified && participant.verifiedName) {
      validateNameMatch();
    }
  }, [participant.name, participant.aadharOwnerName, participant.isOtpVerified, participant.verifiedName, formMode]);

  // Upload file to Firebase Storage
  const uploadFileToStorage = async (file, path) => {
    try {
      const fileRef = storageRef(storage, path);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  };

  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    if (name === 'passportPhoto' && files && files[0]) {
      const file = files[0];

      // Check file type
      if (!file.type.startsWith('image/')) {
        setPassportPhotoError('Please upload only image files (JPG, PNG, etc.).');
        setParticipant((prev) => ({ ...prev, passportPhoto: null }));
        return;
      }

      // Allow only files up to 100 KB
      if (file.size > 100 * 1024) {
        setPassportPhotoError('Photo must be less than or equal to 100 KB.');
        setParticipant((prev) => ({ ...prev, passportPhoto: null }));
        return;
      }

      // ✅ Valid file
      setPassportPhotoError('');
      setParticipant((prev) => ({ ...prev, passportPhoto: file }));
      return;
    }

    if (name === 'panPhoto' && files && files[0]) {
      const file = files[0];

      // Check file type
      if (!file.type.startsWith('image/')) {
        setPanPhotoError('Please upload only image files (JPG, PNG, etc.).');
        setParticipant((prev) => ({ ...prev, panPhoto: null }));
        return;
      }

      if (file.size > 100 * 1024) {
        setPanPhotoError('PAN card photo must be 100 KB or less.');
        setParticipant((prev) => ({ ...prev, panPhoto: null }));
        return;
      }
      setPanPhotoError('');
      setParticipant((prev) => ({ ...prev, panPhoto: file }));
      return;
    }

    // For text inputs, validate and update
    let processedValue = value;

    // Apply field-specific processing
    switch (name) {
      case 'name':
      case 'aadharOwnerName':
      case 'city':
      case 'state':
        // Only allow letters and single spaces for names and locations
        processedValue = value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
        break;
      case 'firmName':
        // Allow letters, numbers, spaces, and common business characters
        processedValue = value.replace(/[^a-zA-Z0-9\s&.-]/g, '').replace(/\s+/g, ' ');
        break;
      case 'mobile':
        // Only allow digits, limit to 10 digits
        processedValue = value.replace(/\D/g, '').slice(0, 10);
        break;
      case 'email':
        // Convert to lowercase and trim
        processedValue = value.toLowerCase().trim();
        break;
      case 'pin':
        // Only allow digits, limit to 6 digits
        processedValue = value.replace(/\D/g, '').slice(0, 6);
        break;
      case 'aadhar':
      case 'aadharOwnerAadhar':
        // Only allow digits, limit to 12 digits
        processedValue = value.replace(/\D/g, '').slice(0, 12);
        break;
      case 'pan':
      case 'firmPan':
        // Convert to uppercase, limit to 10 characters
        processedValue = value.toUpperCase().slice(0, 10);
        break;
      case 'aadharOtp':
        // Only allow digits, limit to 6 digits
        processedValue = value.replace(/\D/g, '').slice(0, 6);
        break;
      case 'address':
        // Allow alphanumeric, spaces, and common address characters
        processedValue = value.replace(/[^a-zA-Z0-9\s,./\-#()]/g, '').replace(/\s+/g, ' ');
        break;
      default:
        break;
    }

    // Update participant data
    setParticipant((prev) => ({ ...prev, [name]: processedValue }));

    // Validate the field
    const error = validateField(name, processedValue);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  // Real Aadhaar OTP Generation via backend proxy
  const sendOtp = async () => {
    const aadharToCheck = formMode === 'firm' && participant.aadharOwnerAadhar ? participant.aadharOwnerAadhar : participant.aadhar;
    
    const aadharError = validateAadhar(aadharToCheck);
    if (aadharError) {
      setMessage(aadharError);
      return;
    }

    setOtpLoading(true);
    setMessage('Sending OTP to your Aadhaar-linked mobile...');

    try {
      const response = await fetch(GENERATE_OTP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_number: aadharToCheck }),
      });

      const data = await response.json();
      console.log('OTP Generate Response:', data);

      if (data.status_code === 200 && data.status === 'success') {
        setRequestId(data.request_id);
        setParticipant((prev) => ({ ...prev, otpSent: true }));
        setMessage('OTP sent successfully to your Aadhaar-linked mobile number!');
      } else if (data.status_code === 400) {
        const errorMessage = data.data?.message || 'Unknown error occurred';
        if (data.data?.otp_sent) {
          setMessage('OTP sent but with an issue: ' + errorMessage);
          setParticipant((prev) => ({ ...prev, otpSent: true }));
        } else {
          setMessage('Error: ' + errorMessage);
        }
      } else {
        setMessage('Error: ' + (data.message || 'Unknown error occurred'));
      }
    } catch (error) {
      console.error('OTP Generation Error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Real Aadhaar OTP Verification via backend proxy with name matching
  const verifyOtp = async () => {
    if (!requestId || !participant.aadharOtp) {
      setMessage('Please enter the OTP received on your mobile.');
      return;
    }

    const otpError = validateOtp(participant.aadharOtp);
    if (otpError) {
      setMessage(otpError);
      return;
    }

    setVerifyingOtp(true);
    setMessage('Verifying OTP and fetching Aadhaar details...');

    try {
      const response = await fetch(VERIFY_OTP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          otp: participant.aadharOtp
        }),
      });

      const data = await response.json();
      console.log('OTP Verification Response:', data);

      if (data.status_code === 200 && data.status === 'success' && data.data) {
        const verifiedData = data.data;

        // Update participant data with verified information
        setParticipant((prev) => ({
          ...prev,
          isOtpVerified: true,
          verifiedName: verifiedData.full_name || 'N/A',
          verifiedGender: verifiedData.gender || 'N/A',
          verifiedDob: verifiedData.dob || 'N/A'
        }));

        // Name matching will be handled by useEffect automatically
        setMessage('Aadhaar OTP verified successfully! Checking name match...');
      } else {
        const errorMessage = data.message || 'Verification failed due to unknown error';
        setMessage('Verification failed: ' + errorMessage);
      }
    } catch (error) {
      console.error('OTP Verification Error:', error);
      setMessage('Network error during verification. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Centralized single call email existence check
  const checkEmailExists = async (email) => {
    const emailKey = email.toLowerCase().replace(/\./g, ',');
    try {
      const snap = await get(ref(db, `HTAMS/emails/${emailKey}`));
      if (snap.exists()) {
        setMessage('This email is already registered.');
        return true;
      }
      return false;
    } catch {
      setMessage('Error checking email. Please try again.');
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const requiredFieldsUser = ['name', 'mobile', 'email', 'address', 'city', 'state', 'pin', 'aadhar', 'pan'];
    const requiredFieldsFirm = ['firmName', 'mobile', 'email', 'address', 'city', 'state', 'pin', 'firmPan', 'aadharOwnerName', 'aadharOwnerAadhar'];

    const requiredFields = formMode === 'user' ? requiredFieldsUser : requiredFieldsFirm;

    // Validate all required fields
    let hasErrors = false;
    const newFieldErrors = {};

    for (const field of requiredFields) {
      const error = validateField(field, participant[field]);
      if (error) {
        newFieldErrors[field] = error;
        hasErrors = true;
      }
    }

    setFieldErrors(newFieldErrors);

    if (hasErrors) {
      setMessage('Please fix all field errors before submitting.');
      setIsSubmitting(false);
      return;
    }

    if (!participant.passportPhoto || !participant.panPhoto) {
      setMessage('Please upload both passport photo and PAN card photo.');
      setIsSubmitting(false);
      return;
    }

    if (passportPhotoError || panPhotoError) {
      setMessage('Please fix photo upload errors.');
      setIsSubmitting(false);
      return;
    }

    if (!participant.isOtpVerified) {
      setMessage('Please verify Aadhaar OTP before submitting.');
      setIsSubmitting(false);
      return;
    }

    // Critical validation: Check if name is matched
    if (!nameMatched) {
      setMessage('Cannot submit form: Name verification failed. Your entered name must match with your Aadhaar card exactly.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Checking if email is already registered...');
    if (await checkEmailExists(participant.email)) {
      setIsSubmitting(false);
      return;
    }

    setMessage('Uploading photos to Firebase Storage...');
    setUploadingFiles(true);

    try {
      // Upload files to Firebase Storage
      const timestamp = Date.now();
      const passportPhotoPath = `trainings/${id}/participants/passport_photos/${timestamp}_${participant.passportPhoto.name}`;
      const panPhotoPath = `trainings/${id}/participants/pan_photos/${timestamp}_${participant.panPhoto.name}`;

      const [passportPhotoUrl, panPhotoUrl] = await Promise.all([
        uploadFileToStorage(participant.passportPhoto, passportPhotoPath),
        uploadFileToStorage(participant.panPhoto, panPhotoPath)
      ]);

      setParticipant(prev => ({
        ...prev,
        passportPhotoUrl,
        panPhotoUrl
      }));

      setMessage('Photos uploaded successfully. Processing registration...');
      setUploadingFiles(false);

      // Continue with registration process
      const trainingRef = ref(db, `HTAMS/company/trainings/${id}`);
      let canJoin = false;

      await runTransaction(trainingRef, (data) => {
        if (data) {
          if ((data.joinedCount || 0) >= (data.candidates || 0)) return undefined;
          return { ...data, joinedCount: (data.joinedCount || 0) + 1 };
        }
        return data;
      }).then(r => { canJoin = r.committed; });

      if (!canJoin) {
        setMessage('All slots are filled for this training.');
        await update(trainingRef, { expiresAt: Date.now() });
        setIsSubmitting(false);
        return;
      }

      setMessage('Saving your registration...');

      const pKey = push(ref(db, `HTAMS/company/trainings/${id}/participants`)).key;
      const emailKey = participant.email.toLowerCase().replace(/\./g, ',');

      // Base data differs by mode
      const baseData = formMode === 'user'
        ? {
          name: participant.name,
          aadhar: participant.aadhar,
          pan: participant.pan,
          aadhaar_verification: {
            verified_name: participant.verifiedName,
            verified_gender: participant.verifiedGender,
            verified_dob: participant.verifiedDob,
            verified_at: Date.now(),
            status: 'verified',
            name_matched: true,
            entered_name: participant.name
          }
        }
        : {
          firmName: participant.firmName,
          name: participant.firmName,
          firmPan: participant.firmPan,
          aadharOwnerName: participant.aadharOwnerName,
          aadharOwnerAadhar: participant.aadharOwnerAadhar,
          aadhaar_verification: {
            verified_name: participant.verifiedName,
            verified_gender: participant.verifiedGender,
            verified_dob: participant.verifiedDob,
            verified_at: Date.now(),
            status: 'verified',
            owner_name: participant.aadharOwnerName,
            name_matched: true,
            entered_name: participant.aadharOwnerName
          }
        };

      const newParticipant = {
        ...baseData,
        mobile: participant.mobile,
        email: participant.email,
        referredBy: participant.referredBy,
        address: participant.address,
        city: participant.city,
        state: participant.state,
        pin: participant.pin,
        passportPhotoUrl: passportPhotoUrl,
        panPhotoUrl: panPhotoUrl,
        trainingId: id,
        joinedAt: Date.now(),
        status: 'joined',
        confirmedByTrainer: false,
        formMode,
      };

      const updates = {};
      updates[`HTAMS/company/trainings/${id}/participants/${pKey}`] = newParticipant;
      // updates[`HTAMS/users/${id}/${pKey}`] = newParticipant;
      updates[`HTAMS/emails/${emailKey}`] = { trainingId: id, type: 'training', timestamp: Date.now() };
      updates[`HTAMS/company/trainings/${id}/updatedAt`] = Date.now();

      await update(ref(db), updates);

      setMessage('Successfully joined the training with verified Aadhaar and name matching! Welcome aboard!');

      // Reset form
      setParticipant({
        name: '', firmName: '', mobile: '', email: '', referredBy: participant.referredBy, address: '', city: '', state: '', pin: '',
        aadhar: '', aadharOtp: '', pan: '', panPhoto: null, passportPhoto: null, panPhotoUrl: '', passportPhotoUrl: '',
        otpSent: false, isOtpVerified: false, firmPan: '', aadharOwnerName: '', aadharOwnerAadhar: '',
        verifiedName: '', verifiedGender: '', verifiedDob: ''
      });
      setRequestId('');
      setNameMatched(false);
      setNameMatchError('');
      setFieldErrors({});

    } catch (error) {
      console.error('Registration Error:', error);
      setMessage('Registration failed. Please try again or contact support.');
      setUploadingFiles(false);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="join-training-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <FaShieldAlt className="title-icon" />
          Join Training Program
        </h1>
        <p className="page-subtitle">Complete your secure registration with Aadhaar verification</p>
      </div>

      {/* Form Mode Selector */}
      <div className="form-mode-section">
        <div className="mode-selector">
          <button
            className={`mode-option ${formMode === 'user' ? 'active' : ''}`}
            onClick={() => setFormMode('user')}
          >
            <FaUser className="mode-icon" />
            <span>Individual User</span>
          </button>
          <button
            className={`mode-option ${formMode === 'firm' ? 'active' : ''}`}
            onClick={() => setFormMode('firm')}
          >
            <FaMapMarkerAlt className="mode-icon" />
            <span>Firm / Organization</span>
          </button>
        </div>
      </div>

      {/* Training Details */}
      {training && (
        <div className="training-details-card">
          <h3 className="card-title">Training Details</h3>
          <div className="training-details-grid">
            <div className="detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{training.location}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date</span>
              <span className="detail-value">{training.date}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time</span>
              <span className="detail-value">{training.time}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Available Slots</span>
              <span className="detail-value">{(training.candidates || 0) - (training.joinedCount || 0)} / {training.candidates || 0}</span>
            </div>
            {training.expireDate && (
              <div className="detail-item">
                <span className="detail-label">Expires</span>
                <span className="detail-value">{new Date(training.expireDate).toDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="registration-form">
        {/* Personal Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <FaUser className="section-icon" />
            Personal Information
          </h3>
          <div className="form-grid">
            {formMode === 'user' ? (
              <div className="form-group">
                <label className="form-label">
                  <FaUser className="label-icon" />
                  Full Name * (Must match Aadhaar exactly)
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name as on Aadhaar card"
                  value={participant.name}
                  onChange={handleChange}
                  required
                  className={`form-input ${
                    fieldErrors.name ? 'error' : 
                    nameMatchError ? 'error' : 
                    nameMatched ? 'success' : ''
                  }`}
                />
                {fieldErrors.name && <div className="error-message">{fieldErrors.name}</div>}
                {!fieldErrors.name && nameMatchError && <div className="error-message">{nameMatchError}</div>}
                {!fieldErrors.name && nameMatched && <div className="success-message">Name matches with Aadhaar records ✓</div>}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  <FaMapMarkerAlt className="label-icon" />
                  Firm/Organization Name *
                </label>
                <input
                  type="text"
                  name="firmName"
                  placeholder="Enter firm/organization name"
                  value={participant.firmName}
                  onChange={handleChange}
                  required
                  className={`form-input ${fieldErrors.firmName ? 'error' : ''}`}
                />
                {fieldErrors.firmName && <div className="error-message">{fieldErrors.firmName}</div>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">
                <FaPhone className="label-icon" />
                Mobile Number *
              </label>
              <input
                type="tel"
                name="mobile"
                placeholder="Enter 10-digit mobile number"
                value={participant.mobile}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.mobile ? 'error' : ''}`}
              />
              {fieldErrors.mobile && <div className="error-message">{fieldErrors.mobile}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">
                <FaEnvelope className="label-icon" />
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={participant.email}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              />
              {fieldErrors.email && <div className="error-message">{fieldErrors.email}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">
                <FaUser className="label-icon" />
                Referred By
              </label>
              <input
                type="text"
                name="referredBy"
                placeholder="Referrer name (auto-filled)"
                value={participant.referredBy}
                readOnly
                className="form-input readonly"
              />
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <FaMapMarkerAlt className="section-icon" />
            Address Information
          </h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">
                <FaMapMarkerAlt className="label-icon" />
                Address *
              </label>
              <input
                type="text"
                name="address"
                placeholder="Enter your full address"
                value={participant.address}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.address ? 'error' : ''}`}
              />
              {fieldErrors.address && <div className="error-message">{fieldErrors.address}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                name="city"
                placeholder="Enter your city"
                value={participant.city}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.city ? 'error' : ''}`}
              />
              {fieldErrors.city && <div className="error-message">{fieldErrors.city}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <input
                type="text"
                name="state"
                placeholder="Enter your state"
                value={participant.state}
                onChange={handleChange}
                required
                className={`form-input ${fieldErrors.state ? 'error' : ''}`}
              />
              {fieldErrors.state && <div className="error-message">{fieldErrors.state}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">PIN Code *</label>
              <input
                type="text"
                name="pin"
                placeholder="Enter 6-digit PIN code"
                value={participant.pin}
                onChange={handleChange}
                maxLength="6"
                required
                className={`form-input ${fieldErrors.pin ? 'error' : ''}`}
              />
              {fieldErrors.pin && <div className="error-message">{fieldErrors.pin}</div>}
            </div>
          </div>
        </div>

        {/* Aadhaar Owner Info for firm */}
        {formMode === 'firm' && (
          <div className="form-section">
            <h3 className="section-title">
              <FaIdCard className="section-icon" />
              Aadhaar Owner Information
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  <FaUser className="label-icon" />
                  Aadhaar Owner Name * (Must match Aadhaar exactly)
                </label>
                <input
                  type="text"
                  name="aadharOwnerName"
                  placeholder="Aadhaar owner's full name as on Aadhaar card"
                  value={participant.aadharOwnerName}
                  onChange={handleChange}
                  required
                  className={`form-input ${
                    fieldErrors.aadharOwnerName ? 'error' : 
                    nameMatchError ? 'error' : 
                    nameMatched ? 'success' : ''
                  }`}
                />
                {fieldErrors.aadharOwnerName && <div className="error-message">{fieldErrors.aadharOwnerName}</div>}
                {!fieldErrors.aadharOwnerName && nameMatchError && <div className="error-message">{nameMatchError}</div>}
                {!fieldErrors.aadharOwnerName && nameMatched && <div className="success-message">Name matches with Aadhaar records ✓</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  <FaIdCard className="label-icon" />
                  Aadhaar Owner Number *
                </label>
                <input
                  type="text"
                  name="aadharOwnerAadhar"
                  placeholder="Aadhaar number of owner"
                  value={participant.aadharOwnerAadhar}
                  onChange={handleChange}
                  maxLength="12"
                  required
                  className={`form-input ${fieldErrors.aadharOwnerAadhar ? 'error' : ''}`}
                />
                {fieldErrors.aadharOwnerAadhar && <div className="error-message">{fieldErrors.aadharOwnerAadhar}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Aadhaar Verification Section */}
        <div className="form-section verification-section">
          <h3 className="section-title">
            <FaShieldAlt className="section-icon" />
            Aadhaar Verification
          </h3>
          <div className="verification-grid">
            {formMode === 'user' && (
              <div className="form-group">
                <label className="form-label">
                  <FaIdCard className="label-icon" />
                  Aadhaar Number *
                </label>
                <input
                  type="text"
                  name="aadhar"
                  placeholder="Enter 12-digit Aadhaar number"
                  value={participant.aadhar}
                  onChange={handleChange}
                  maxLength="12"
                  required
                  disabled={participant.otpSent}
                  className={`form-input ${fieldErrors.aadhar ? 'error' : ''}`}
                />
                {fieldErrors.aadhar && <div className="error-message">{fieldErrors.aadhar}</div>}
              </div>
            )}

            {!participant.otpSent ? (
              <div className="verification-actions">
                <button
                  type="button"
                  className={`action-button primary ${otpLoading ? 'loading' : ''}`}
                  onClick={sendOtp}
                  disabled={otpLoading}
                >
                  {otpLoading ? (
                    <>
                      <FaSpinner className="spinner" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <FaShieldAlt />
                      Send OTP
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="otp-verification">
                <div className="form-group">
                  <label className="form-label">Enter OTP *</label>
                  <input
                    type="text"
                    name="aadharOtp"
                    placeholder="Enter 6-digit OTP from your mobile"
                    value={participant.aadharOtp}
                    onChange={handleChange}
                    maxLength="6"
                    disabled={participant.isOtpVerified}
                    className={`form-input ${fieldErrors.aadharOtp ? 'error' : ''}`}
                  />
                  {fieldErrors.aadharOtp && <div className="error-message">{fieldErrors.aadharOtp}</div>}
                </div>
                <button
                  type="button"
                  className={`action-button ${participant.isOtpVerified ? 'success' : verifyingOtp ? 'loading' : 'primary'}`}
                  onClick={verifyOtp}
                  disabled={participant.isOtpVerified || verifyingOtp}
                >
                  {participant.isOtpVerified ? (
                    <>
                      <FaCheck />
                      OTP Verified
                    </>
                  ) : verifyingOtp ? (
                    <>
                      <FaSpinner className="spinner" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FaShieldAlt />
                      Verify OTP
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Show verified Aadhaar details */}
          {participant.isOtpVerified && participant.verifiedName && (
            <div className={`verified-details ${nameMatched ? 'success' : 'error'}`}>
              <h4>{nameMatched ? 'Name Verification Successful' : 'Name Verification Required'}</h4>
              <div className="verification-details-grid">
                <div className="verification-detail">
                  <span className="detail-label">Entered Name:</span>
                  <span className="detail-value">{formMode === 'user' ? participant.name : participant.aadharOwnerName}</span>
                </div>
                <div className="verification-detail">
                  <span className="detail-label">Aadhaar Name:</span>
                  <span className="detail-value">{participant.verifiedName}</span>
                </div>
                <div className="verification-detail">
                  <span className="detail-label">Date of Birth:</span>
                  <span className="detail-value">{participant.verifiedDob}</span>
                </div>
                <div className="verification-detail">
                  <span className="detail-label">Gender:</span>
                  <span className="detail-value">{participant.verifiedGender}</span>
                </div>
              </div>
              {!nameMatched && (
                <div className="name-mismatch-warning">
                  <p><strong>Instructions:</strong> Please correct your name in the form above to match exactly with your Aadhaar card. The system will automatically validate the match once you update your name.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Information Section */}
        <div className="form-section">
          <h3 className="section-title">
            <FaIdCard className="section-icon" />
            Document Information
          </h3>
          <div className="form-grid">
            {formMode === 'user' ? (
              <div className="form-group">
                <label className="form-label">
                  <FaIdCard className="label-icon" />
                  PAN Card Number *
                </label>
                <input
                  type="text"
                  name="pan"
                  placeholder="Enter PAN card number (e.g., ABCDE1234F)"
                  value={participant.pan}
                  onChange={handleChange}
                  style={{ textTransform: 'uppercase' }}
                  maxLength="10"
                  required
                  className={`form-input ${fieldErrors.pan ? 'error' : ''}`}
                />
                {fieldErrors.pan && <div className="error-message">{fieldErrors.pan}</div>}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  <FaIdCard className="label-icon" />
                  Firm PAN Card Number *
                </label>
                <input
                  type="text"
                  name="firmPan"
                  placeholder="Enter firm/organization PAN (e.g., ABCDE1234F)"
                  value={participant.firmPan}
                  onChange={handleChange}
                  style={{ textTransform: 'uppercase' }}
                  maxLength="10"
                  required
                  className={`form-input ${fieldErrors.firmPan ? 'error' : ''}`}
                />
                {fieldErrors.firmPan && <div className="error-message">{fieldErrors.firmPan}</div>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">
                <FaIdCard className="label-icon" />
                PAN Card Photo *
              </label>
              <input
                type="file"
                accept="image/*"
                name="panPhoto"
                onChange={handleChange}
                required
                className="form-input file-input"
              />
              <small className="help-text">Clear photo of your PAN card (JPG, PNG, max 100KB)</small>
              {panPhotoError && <div className="error-message">{panPhotoError}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">
                <FaCamera className="label-icon" />
                Passport Size Photo *
              </label>
              <input
                type="file"
                accept="image/*"
                name="passportPhoto"
                onChange={handleChange}
                required
                className="form-input file-input"
              />
              <small className="help-text">Upload passport size photo (JPG, PNG, max 100KB)</small>
              {passportPhotoError && <div className="error-message">{passportPhotoError}</div>}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className={`submit-button ${isSubmitting || uploadingFiles || !nameMatched ? 'disabled' : ''}`}
          disabled={isSubmitting || !training || uploadingFiles || !nameMatched}
        >
          {!nameMatched ? (
            'Complete Name Verification First'
          ) : isSubmitting ? (
            <>
              <FaSpinner className="spinner" />
              {uploadingFiles ? 'Uploading Photos...' : 'Processing...'}
            </>
          ) : (
            <>
              <FaCheck />
              Join Training Now
            </>
          )}
        </button>
      </form>

      {message && (
        <div className={`notification ${
          message.includes('successfully') || message.includes('Welcome') || message.includes('successful')
            ? 'success'
            : message.includes('Checking') || message.includes('Uploading') || message.includes('Verifying') || message.includes('Sending') || message.includes('Processing')
              ? 'info'
              : 'error'
        }`}>
          {message}
        </div>
      )}
  

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container */
        .join-training-container {
          font-family: 'Inter', sans-serif;
          padding: 16px;
          background: #f8fafc;
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Page Header */
        .page-header {
          text-align: center;
          margin-bottom: 24px;
          padding: 24px 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .title-icon {
          color: #6366f1;
          font-size: 1.5rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 1rem;
          margin: 0;
        }

        /* Form Mode Section */
        .form-mode-section {
          margin-bottom: 24px;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .mode-option {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-option:hover {
          border-color: #6366f1;
          color: #6366f1;
        }

        .mode-option.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: #6366f1;
          color: white;
        }

        .mode-icon {
          font-size: 1.1rem;
        }

        /* Training Details Card */
        .training-details-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }

        .training-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .detail-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.875rem;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
        }

        /* Registration Form */
        .registration-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .verification-section {
          border: 2px solid #f59e0b;
          background: #fefbf2;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f1f5f9;
        }

        .section-icon {
          color: #6366f1;
          font-size: 1.1rem;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .label-icon {
          color: #6366f1;
          font-size: 0.875rem;
        }

        .form-input {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          // font-size: 16px;
          font-family: inherit;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-input.readonly {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .form-input.success {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .file-input {
          padding: 8px;
        }

        .help-text {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 4px;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }

        .success-message {
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }

        /* Verification Grid */
        .verification-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .verification-actions {
          display: flex;
          justify-content: center;
        }

        .otp-verification {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .action-button.primary {
          background: #6366f1;
          color: white;
        }

        .action-button.primary:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .action-button.success {
          background: #10b981;
          color: white;
          cursor: default;
        }

        .action-button.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Verified Details */
        .verified-details {
          margin-top: 20px;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
        }

        .verified-details.success {
          background: #f0fdf4;
          border-color: #10b981;
        }

        .verified-details.error {
          background: #fef2f2;
          border-color: #ef4444;
        }

        .verified-details h4 {
          margin: 0 0 16px 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .verification-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .verification-detail {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .verification-detail:last-child {
          border-bottom: none;
        }

        .name-mismatch-warning {
          background: rgba(239, 68, 68, 0.1);
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }

        .name-mismatch-warning p {
          margin: 0;
          color: #dc2626;
          font-size: 0.875rem;
        }

        /* Submit Button */
        .submit-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .submit-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .submit-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Notification */
        .notification {
          padding: 16px 20px;
          margin-top: 24px;
          border-radius: 12px;
          font-weight: 600;
          text-align: center;
          animation: slideIn 0.3s ease-out;
        }

        .notification.success {
          background: #f0fdf4;
          color: #15803d;
          border: 2px solid #22c55e;
        }

        .notification.error {
          background: #fef2f2;
          color: #dc2626;
          border: 2px solid #ef4444;
        }

        .notification.info {
          background: #f0f9ff;
          color: #0369a1;
          border: 2px solid #0ea5e9;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Tablet Styles (768px and up) */
        @media (min-width: 768px) {
          .join-training-container {
            padding: 24px;
            max-width: 900px;
            margin: 0 auto;
          }

          .mode-selector {
            grid-template-columns: 1fr 1fr;
          }

          .training-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }

          .verification-grid {
            grid-template-columns: 2fr 1fr;
            align-items: end;
          }

          .otp-verification {
            grid-template-columns: 2fr 1fr;
            align-items: end;
          }

          .verification-details-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }

        /* Desktop Styles (1024px and up) */
        @media (min-width: 1024px) {
          .join-training-container {
            padding: 32px;
            max-width: 1000px;
          }

          .training-details-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .form-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .verification-details-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default JoinTraining;
