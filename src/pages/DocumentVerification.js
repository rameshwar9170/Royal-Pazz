import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { ref as dbRef, onValue, update, get, set } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { storage, database } from '../firebase/config';

const DocumentVerification = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [verificationData, setVerificationData] = useState({
    panCard: {
      panNumber: '',
      nameOnPan: '',
      file: null,
      uploaded: false,
      downloadURL: '',
      status: 'pending',
      fileName: '',
      storagePath: ''
    },
    aadharCard: {
      aadharNumber: '',
      nameOnAadhar: '',
      file: null,
      uploaded: false,
      downloadURL: '',
      status: 'pending',
      fileName: '',
      storagePath: ''
    },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'savings',
      file: null,
      uploaded: false,
      downloadURL: '',
      status: 'pending',
      fileName: '',
      storagePath: ''
    }
  });
  
  const [uploading, setUploading] = useState(false);
  const [overallStatus, setOverallStatus] = useState('not_started');
  const [userDetails, setUserDetails] = useState(null);

  // Check authentication state
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User not logged in');
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Enhanced verification data listener
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;
    
    // Use HTAMS/users/{userId} path
    const userRef = dbRef(database, `HTAMS/users/${userId}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserDetails(userData);
        
        // Pre-fill existing data if available
        setVerificationData(prev => ({
          ...prev,
          panCard: {
            ...prev.panCard,
            panNumber: userData.pan || '',
            nameOnPan: userData.name || ''
          },
          aadharCard: {
            ...prev.aadharCard,
            aadharNumber: userData.aadhar || '',
            nameOnAadhar: userData.name || ''
          },
          bankDetails: {
            ...prev.bankDetails,
            accountHolderName: userData.bankDetails?.accountHolderName || userData.name || '',
            accountNumber: userData.bankDetails?.accountNumber || '',
            ifscCode: userData.bankDetails?.ifscCode || '',
            bankName: userData.bankDetails?.bankName || '',
            branchName: userData.bankDetails?.branchName || '',
            accountType: userData.bankDetails?.accountType || 'savings'
          }
        }));
      }
    }).catch((error) => {
      console.error('Error fetching user data:', error);
    });

    // Listen to documentVerification under HTAMS/users/{userId}
    const verificationRef = dbRef(database, `HTAMS/users/${userId}/documentVerification`);
    const unsubscribe = onValue(verificationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setOverallStatus(data.overallStatus || 'not_started');
        
        // Update verification data with correct individual document statuses
        if (data.documents) {
          setVerificationData(prev => {
            const updated = { ...prev };
            
            // Process each document individually
            Object.keys(updated).forEach(docType => {
              if (data.documents[docType]) {
                const docData = data.documents[docType];
                updated[docType] = {
                  ...updated[docType],
                  ...docData.formData,
                  uploaded: !!(docData.downloadURL && docData.downloadURL.trim() !== ''),
                  downloadURL: docData.downloadURL || '',
                  status: docData.verificationStatus || docData.status || 'pending',
                  fileName: docData.fileName || '',
                  storagePath: docData.storagePath || '',
                  uploadedAt: docData.uploadedAt || '',
                  rejectionReason: docData.rejectionReason || ''
                };
              } else {
                updated[docType] = {
                  ...updated[docType],
                  uploaded: false,
                  status: 'pending',
                  downloadURL: '',
                  fileName: '',
                  storagePath: ''
                };
              }
            });
            
            console.log('Updated verification data:', updated);
            return updated;
          });
        } else {
          setVerificationData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(docType => {
              updated[docType] = {
                ...updated[docType],
                uploaded: false,
                status: 'pending',
                downloadURL: '',
                fileName: '',
                storagePath: ''
              };
            });
            return updated;
          });
        }
      } else {
        console.log('No verification data found');
        setOverallStatus('not_started');
      }
    }, (error) => {
      console.error('Error listening to verification data:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Updated documentSteps without address
  const documentSteps = [
    { 
      key: 'panCard', 
      title: 'PAN Card Details',
      icon: '🏦',
      description: 'Enter your PAN card information and upload photo'
    },
    { 
      key: 'aadharCard', 
      title: 'Aadhar Card Details',
      icon: '🆔', 
      description: 'Enter your Aadhar card information and upload photo'
    },
    { 
      key: 'bankDetails', 
      title: 'Bank Account Details',
      icon: '💳',
      description: 'Enter your bank account information and upload passbook'
    }
  ];

  // Validation functions
  const validatePAN = (pan) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateAadhar = (aadhar) => {
    const aadharRegex = /^[0-9]{12}$/;
    return aadharRegex.test(aadhar.replace(/\s/g, ''));
  };

  const validateIFSC = (ifsc) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  };

  const handleInputChange = (docType, field, value) => {
    setVerificationData(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value
      }
    }));
  };

  // Enhanced file selection with comprehensive validation
  const handleFileSelect = (docType, file) => {
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    if (file.size === 0) {
      alert('Selected file is empty. Please choose a valid file.');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(`File size is ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed size is 5MB.`);
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert(`File type "${file.type}" is not allowed. Please upload JPG, PNG, or PDF files only.`);
      return;
    }
    
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert(`File extension ".${fileExtension}" is not allowed.`);
      return;
    }
    
    const validFileName = /^[a-zA-Z0-9._\-\s]+$/.test(file.name);
    if (!validFileName) {
      alert('File name contains invalid characters. Please rename the file using only letters, numbers, dots, dashes, and spaces.');
      return;
    }
    
    console.log('File validation passed');
    
    setVerificationData(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        file: file
      }
    }));
  };

  const validateCurrentStep = () => {
    const currentDoc = documentSteps[currentStep].key;
    const data = verificationData[currentDoc];
    
    switch (currentDoc) {
      case 'panCard':
        if (!data.panNumber || !validatePAN(data.panNumber)) {
          alert('Please enter a valid PAN number (Format: ABCDE1234F)');
          return false;
        }
        if (!data.nameOnPan || data.nameOnPan.length < 2) {
          alert('Please enter name as on PAN card');
          return false;
        }
        if (!data.file && !data.uploaded) {
          alert('Please select PAN card photo');
          return false;
        }
        break;
        
      case 'aadharCard':
        if (!data.aadharNumber || !validateAadhar(data.aadharNumber)) {
          alert('Please enter a valid 12-digit Aadhar number');
          return false;
        }
        if (!data.nameOnAadhar || data.nameOnAadhar.length < 2) {
          alert('Please enter name as on Aadhar card');
          return false;
        }
        if (!data.file && !data.uploaded) {
          alert('Please select Aadhar card photo');
          return false;
        }
        break;
        
      case 'bankDetails':
        if (!data.accountHolderName || data.accountHolderName.length < 2) {
          alert('Please enter account holder name');
          return false;
        }
        if (!data.accountNumber || data.accountNumber.length < 9) {
          alert('Please enter valid account number');
          return false;
        }
        if (data.accountNumber !== data.confirmAccountNumber) {
          alert('Account numbers do not match');
          return false;
        }
        if (!data.ifscCode || !validateIFSC(data.ifscCode)) {
          alert('Please enter valid IFSC code (Format: ABCD0123456)');
          return false;
        }
        if (!data.bankName || !data.branchName) {
          alert('Please enter bank name and branch name');
          return false;
        }
        if (!data.file && !data.uploaded) {
          alert('Please select bank passbook/statement photo');
          return false;
        }
        break;
        
      default:
        return false;
    }
    
    return true;
  };

  const handleButtonClick = (action) => {
    if (navigator.vibrate && isMobile) {
      navigator.vibrate(50);
    }
    action();
  };

  // Helper function to get form data based on document type
  const getFormDataByDocType = (docType, data) => {
    const baseData = {
      docType,
      uploadedAt: new Date().toISOString()
    };

    switch (docType) {
      case 'panCard':
        return {
          ...baseData,
          panNumber: data.panNumber || '',
          nameOnPan: data.nameOnPan || ''
        };
      
      case 'aadharCard':
        return {
          ...baseData,
          aadharNumber: data.aadharNumber || '',
          nameOnAadhar: data.nameOnAadhar || ''
        };
      
      case 'bankDetails':
        return {
          ...baseData,
          accountHolderName: data.accountHolderName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          bankName: data.bankName || '',
          branchName: data.branchName || '',
          accountType: data.accountType || 'savings'
        };
      
      default:
        return baseData;
    }
  };

  // Upload function
  const uploadCurrentDocument = async () => {
    if (!currentUser || !currentUser.uid) {
      alert('User not authenticated. Please login again.');
      return;
    }

    if (!validateCurrentStep()) return;
    
    const currentDoc = documentSteps[currentStep].key;
    const data = verificationData[currentDoc];
    const userId = currentUser.uid;
    
    console.log('Upload attempt:', { currentDoc, hasFile: !!data.file, userId });
    
    if (!data.file) {
      alert('Please select a file first');
      return;
    }
    
    setUploading(true);
    
    try {
      const timestamp = Date.now();
      const fileExtension = data.file.name.split('.').pop().toLowerCase();
      const sanitizedFileName = data.file.name.replace(/[^a-zA-Z0-9._\-]/g, '_');
      const fileName = `${currentDoc}_${userId}_${timestamp}.${fileExtension}`;
      const storagePath = `document_verification/${userId}/${fileName}`;
      
      const storageRef = ref(storage, storagePath);
      
      const metadata = {
        contentType: data.file.type,
        contentDisposition: `attachment; filename="${sanitizedFileName}"`,
        customMetadata: {
          userId: String(userId),
          docType: currentDoc,
          originalFileName: data.file.name,
          uploadedAt: new Date().toISOString(),
          fileSize: String(data.file.size),
          documentStep: String(currentStep)
        }
      };
      
      const uploadResult = await uploadBytes(storageRef, data.file, metadata);
      console.log('File uploaded successfully');
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained');
      
      const docData = {
        fileName: data.file.name,
        sanitizedFileName,
        storagePath,
        downloadURL,
        fileSize: data.file.size,
        fileType: data.file.type,
        uploadedAt: new Date().toISOString(),
        docType: currentDoc,
        userId,
        status: 'pending',
        formData: getFormDataByDocType(currentDoc, data),
        verificationStatus: 'pending',
        verifiedAt: null,
        verifiedBy: null,
        rejectionReason: null
      };
      
      console.log('Preparing database save:', docData);
      
      const verificationRef = dbRef(database, `HTAMS/users/${userId}/documentVerification`);
      await update(verificationRef, {
        lastUpdated: new Date().toISOString(),
        overallStatus: 'uploaded',
        totalDocuments: Object.keys(verificationData).filter(key => 
          verificationData[key].uploaded || key === currentDoc
        ).length,
        completedSteps: currentStep + 1
      });

      const documentRef = dbRef(database, `HTAMS/users/${userId}/documentVerification/documents/${currentDoc}`);
      await set(documentRef, docData);
      
      console.log('Database updated successfully');
      
      setVerificationData(prev => ({
        ...prev,
        [currentDoc]: {
          ...prev[currentDoc],
          uploaded: true,
          downloadURL,
          status: 'pending',
          fileName: data.file.name,
          storagePath,
          uploadedAt: new Date().toISOString()
        }
      }));
      
      alert('Document uploaded successfully!');
      
      if (currentStep < documentSteps.length - 1) {
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Upload error details:', error);
      
      let errorMessage = 'Failed to upload document: ';
      
      if (error.code) {
        switch (error.code) {
          case 'storage/unauthorized':
            errorMessage += 'Access denied. Please check your authentication and try again.';
            break;
          case 'storage/canceled':
            errorMessage += 'Upload was canceled. Please try again.';
            break;
          case 'storage/unknown':
            errorMessage += 'An unknown error occurred. Please try again.';
            break;
          case 'storage/invalid-format':
            errorMessage += 'Invalid file format. Please upload JPG, PNG, or PDF files only.';
            break;
          default:
            errorMessage += `Storage error (${error.code}): ${error.message}`;
        }
      } else {
        errorMessage += `${error.message}. Please try again or contact support.`;
      }
      
      alert(errorMessage);
      
    } finally {
      setUploading(false);
    }
  };

  // Delete function
  const deleteDocument = async (docType) => {
    if (!currentUser || !currentUser.uid) {
      alert('User not authenticated');
      return;
    }

    const data = verificationData[docType];
    const userId = currentUser.uid;
    
    if (!data.storagePath) return;

    if (!window.confirm('Are you sure you want to delete this document? You will need to upload it again.')) {
      return;
    }

    try {
      setUploading(true);
      
      const storageRef = ref(storage, data.storagePath);
      await deleteObject(storageRef);
      
      const documentRef = dbRef(database, `HTAMS/users/${userId}/documentVerification/documents/${docType}`);
      await set(documentRef, null);
      
      const verificationRef = dbRef(database, `HTAMS/users/${userId}/documentVerification`);
      await update(verificationRef, {
        lastUpdated: new Date().toISOString()
      });
      
      setVerificationData(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          file: null,
          uploaded: false,
          downloadURL: '',
          status: 'pending',
          fileName: '',
          storagePath: ''
        }
      }));
      
      alert('Document deleted successfully!');
      
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    } finally {
      setUploading(false);
    }
  };
    
  // Submit function
  const submitAllDocuments = async () => {
    if (!currentUser || !currentUser.uid) {
      alert('User not authenticated');
      return;
    }

    const userId = currentUser.uid;

    try {
      const verificationRef = dbRef(database, `HTAMS/users/${userId}/documentVerification`);
      await update(verificationRef, {
        overallStatus: 'submitted',
        submittedAt: new Date().toISOString(),
        userDetails: {
          userId,
          name: userDetails?.name,
          email: userDetails?.email,
          phone: userDetails?.phone,
          role: userDetails?.role,
          currentLevel: userDetails?.currentLevel
        }
      });
      
      await update(dbRef(database, `HTAMS/users/${userId}`), {
        documentVerificationStatus: 'submitted',
        pan: verificationData.panCard.panNumber,
        aadhar: verificationData.aadharCard.aadharNumber,
        bankDetails: {
          accountHolderName: verificationData.bankDetails.accountHolderName,
          accountNumber: verificationData.bankDetails.accountNumber,
          ifscCode: verificationData.bankDetails.ifscCode,
          bankName: verificationData.bankDetails.bankName,
          branchName: verificationData.bankDetails.branchName,
          accountType: verificationData.bankDetails.accountType
        }
      });
      
      alert('All documents submitted for admin verification!');
      setOverallStatus('submitted');
      
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit documents');
    }
  };

  // Enhanced document form renderer
  const renderDocumentForm = () => {
    const currentDoc = documentSteps[currentStep].key;
    const data = verificationData[currentDoc];
    
    if (data.status === 'rejected') {
      return (
        <div className="rejection-message">
          <div className="rejection-icon">❌</div>
          <h3>Document Rejected</h3>
          <p>This document was rejected and needs to be re-uploaded.</p>
          {data.rejectionReason && (
            <div className="rejection-reason">
              <strong>Reason:</strong> {data.rejectionReason}
            </div>
          )}
          <button 
            onClick={() => {
              setVerificationData(prev => ({
                ...prev,
                [currentDoc]: {
                  ...prev[currentDoc],
                  uploaded: false,
                  status: 'pending',
                  downloadURL: '',
                  fileName: '',
                  storagePath: '',
                  rejectionReason: ''
                }
              }));
            }}
            className="reupload-btn"
          >
            Re-upload Document
          </button>
        </div>
      );
    }
    
    if (data.uploaded && data.status !== 'rejected') {
      return (
        <div className="uploaded-confirmation">
          <div className="success-icon">
            {data.status === 'approved' ? '✅' : data.status === 'pending' ? '⏳' : '📄'}
          </div>
          <h3>
            {data.status === 'approved' ? 'Document Verified Successfully' : 'Document Uploaded Successfully'}
          </h3>
          <p>Status: <span className={`status ${data.status}`}>
            {data.status === 'approved' ? 'APPROVED' : 
             data.status === 'pending' ? 'UNDER REVIEW' : 
             data.status.toUpperCase()}
          </span></p>
          <div className="uploaded-details">
            <p><strong>File:</strong> {data.fileName || 'Document uploaded'}</p>
            <p><strong>Uploaded:</strong> {data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
            {data.status === 'approved' && (
              <p className="verification-success">
                ✅ This document has been verified by admin
              </p>
            )}
            {data.downloadURL && (
              <p>
                <a 
                  href={data.downloadURL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="download-link"
                >
                  View Document
                </a>
              </p>
            )}
            {overallStatus !== 'submitted' && data.status !== 'approved' && (
              <button 
                onClick={() => deleteDocument(currentDoc)}
                className="delete-btn"
                disabled={uploading}
              >
                Delete Document
              </button>
            )}
          </div>
        </div>
      );
    }

    switch (currentDoc) {
      case 'panCard':
        return (
          <div className="document-form">
            <h3>🏦 PAN Card Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>PAN Card Number *</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={data.panNumber}
                  onChange={(e) => handleInputChange('panCard', 'panNumber', e.target.value.toUpperCase())}
                  maxLength={10}
                  className={data.panNumber && !validatePAN(data.panNumber) ? 'invalid' : ''}
                />
                <small>Format: 5 letters + 4 numbers + 1 letter</small>
              </div>
              
              <div className="form-group">
                <label>Name on PAN Card *</label>
                <input
                  type="text"
                  placeholder="Full name as on PAN card"
                  value={data.nameOnPan}
                  onChange={(e) => handleInputChange('panCard', 'nameOnPan', e.target.value)}
                />
              </div>
              
              <div className="form-group full-width">
                <label>Upload PAN Card Photo *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileSelect('panCard', e.target.files[0])}
                  className="file-input"
                />
                <small>Upload clear photo of PAN card (JPG, PNG, PDF - Max 5MB)</small>
                {data.file && <p className="selected-file">Selected: {data.file.name}</p>}
              </div>
            </div>
          </div>
        );
        
      case 'aadharCard':
        return (
          <div className="document-form">
            <h3>🆔 Aadhar Card Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Aadhar Number *</label>
                <input
                  type="text"
                  placeholder="1234 5678 9012"
                  value={data.aadharNumber}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                    if (value.length <= 12) {
                      value = value.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
                      handleInputChange('aadharCard', 'aadharNumber', value);
                    }
                  }}
                  maxLength={14}
                  className={data.aadharNumber && !validateAadhar(data.aadharNumber) ? 'invalid' : ''}
                />
                <small>12-digit Aadhar number</small>
              </div>
              
              <div className="form-group">
                <label>Name on Aadhar Card *</label>
                <input
                  type="text"
                  placeholder="Full name as on Aadhar card"
                  value={data.nameOnAadhar}
                  onChange={(e) => handleInputChange('aadharCard', 'nameOnAadhar', e.target.value)}
                />
              </div>
              
              <div className="form-group full-width">
                <label>Upload Aadhar Card Photo *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileSelect('aadharCard', e.target.files[0])}
                  className="file-input"
                />
                <small>Upload clear photo of both sides of Aadhar card (JPG, PNG, PDF - Max 5MB)</small>
                {data.file && <p className="selected-file">Selected: {data.file.name}</p>}
              </div>
            </div>
          </div>
        );
        
      case 'bankDetails':
        return (
          <div className="document-form">
            <h3>💳 Bank Account Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Account Holder Name *</label>
                <input
                  type="text"
                  placeholder="Name as per bank account"
                  value={data.accountHolderName}
                  onChange={(e) => handleInputChange('bankDetails', 'accountHolderName', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Account Type *</label>
                <select
                  value={data.accountType}
                  onChange={(e) => handleInputChange('bankDetails', 'accountType', e.target.value)}
                >
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Account Number *</label>
                <input
                  type="text"
                  placeholder="Bank account number"
                  value={data.accountNumber}
                  onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Confirm Account Number *</label>
                <input
                  type="text"
                  placeholder="Re-enter account number"
                  value={data.confirmAccountNumber}
                  onChange={(e) => handleInputChange('bankDetails', 'confirmAccountNumber', e.target.value)}
                  className={data.confirmAccountNumber && data.accountNumber !== data.confirmAccountNumber ? 'invalid' : ''}
                />
              </div>
              
              <div className="form-group">
                <label>IFSC Code *</label>
                <input
                  type="text"
                  placeholder="ABCD0123456"
                  value={data.ifscCode}
                  onChange={(e) => handleInputChange('bankDetails', 'ifscCode', e.target.value.toUpperCase())}
                  maxLength={11}
                  className={data.ifscCode && !validateIFSC(data.ifscCode) ? 'invalid' : ''}
                />
                <small>11-character IFSC code</small>
              </div>
              
              <div className="form-group">
                <label>Bank Name *</label>
                <input
                  type="text"
                  placeholder="Bank name"
                  value={data.bankName}
                  onChange={(e) => handleInputChange('bankDetails', 'bankName', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  type="text"
                  placeholder="Branch name"
                  value={data.branchName}
                  onChange={(e) => handleInputChange('bankDetails', 'branchName', e.target.value)}
                />
              </div>
              
              <div className="form-group full-width">
                <label>Upload Bank Passbook/Statement *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileSelect('bankDetails', e.target.files[0])}
                  className="file-input"
                />
                <small>Upload first page of bank passbook or bank statement (JPG, PNG, PDF - Max 5MB)</small>
                {data.file && <p className="selected-file">Selected: {data.file.name}</p>}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <>
        <style jsx>{styles}</style>
        <div className="verification-container">
          <div className="page-loading-overlay">
            <div className="loading-spinner"></div>
            <p className="loading-text">Checking authentication...</p>
          </div>
        </div>
      </>
    );
  }

  // Show login prompt if user is not authenticated
  if (!currentUser) {
    return (
      <>
        <style jsx>{styles}</style>
        <div className="verification-container">
          <div className="auth-required">
            <div className="auth-icon">🔐</div>
            <h2>Authentication Required</h2>
            <p>Please login to access document verification.</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-btn"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </>
    );
  }

  // If verification is approved, show success message
  if (overallStatus === 'approved') {
    return (
      <>
        <style jsx>{styles}</style>
        <div className="verification-container">
          <div className="success-message">
            <div className="success-icon">🎉</div>
            <h2>Document Verification Complete!</h2>
            <p>All your documents have been successfully verified.</p>
            <div className="success-details">
              <p><strong>Agency Name:</strong> {userDetails?.name}</p>
              <p><strong>Level:</strong> {userDetails?.currentLevel}</p>
              <p><strong>Verification Date:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span className="approved">APPROVED</span></p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx>{styles}</style>
      <div className="verification-container">
        <div className="verification-header">
          <h1>Agency Document Verification</h1>
          <p>Complete your profile by providing document details and uploading photos</p>
          <div className="user-info">
            <p><strong>User:</strong> {currentUser?.email}</p>
            <p><strong>ID:</strong> {currentUser?.uid}</p>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / documentSteps.length) * 100}%` }}
            ></div>
          </div>
          
          <div className="step-indicators">
            {documentSteps.map((step, index) => (
              <div 
                key={step.key}
                className={`step-indicator ${index <= currentStep ? 'active' : ''} ${verificationData[step.key].uploaded ? 'completed' : ''}`}
              >
                <div className="step-icon">{step.icon}</div>
                <div className="step-title">{step.title}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="verification-content">
          <div className="current-step">
            {/* Loading overlay only covers the form section */}
            {uploading && (
              <div className="upload-loading-overlay">
                <div className="loading-spinner"></div>
                <p className="loading-text">
                  Uploading document...
                </p>
              </div>
            )}
            
            <div className="step-header">
              <h2>
                {documentSteps[currentStep].icon} {documentSteps[currentStep].title}
              </h2>
              <p>{documentSteps[currentStep].description}</p>
            </div>
            
            {renderDocumentForm()}
            
            <div className="step-actions">
              {currentStep > 0 && overallStatus !== 'submitted' && (
                <button 
                  onClick={() => handleButtonClick(() => setCurrentStep(currentStep - 1))}
                  className="prev-btn"
                  disabled={uploading}
                >
                  ← Previous
                </button>
              )}
              
              {!verificationData[documentSteps[currentStep].key].uploaded && overallStatus !== 'submitted' && (
                <button 
                  onClick={() => handleButtonClick(uploadCurrentDocument)}
                  disabled={uploading}
                  className="upload-btn"
                >
                  {uploading ? 'Uploading...' : `Upload ${documentSteps[currentStep].title}`}
                </button>
              )}
              
              {verificationData[documentSteps[currentStep].key].uploaded && currentStep < documentSteps.length - 1 && (
                <button 
                  onClick={() => handleButtonClick(() => setCurrentStep(currentStep + 1))}
                  className="next-btn"
                  disabled={uploading}
                >
                  Next →
                </button>
              )}
              
              {currentStep === documentSteps.length - 1 && 
               Object.values(verificationData).every(doc => doc.uploaded) && 
               overallStatus !== 'submitted' && (
                <button 
                  onClick={() => handleButtonClick(submitAllDocuments)}
                  className="submit-all-btn"
                  disabled={uploading}
                >
                  Submit All Documents for Verification
                </button>
              )}
            </div>
          </div>
          
          {overallStatus === 'submitted' && (
            <div className="submission-status">
              <h3>📋 Documents Submitted</h3>
              <p>Your documents are being reviewed by our admin team. You will be notified once the verification is complete.</p>
              <div className="submission-details">
                <p><strong>Submitted At:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Total Documents:</strong> {Object.keys(verificationData).length}</p>
                <p><strong>Status:</strong> Under Review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const styles = `
  /* Professional White Background Design - Fully Responsive */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

*::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

body {
  margin: 0;
  padding: 0;
  background-color: #ffffff;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

body::-webkit-scrollbar {
  display: none;
}

.verification-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: clamp(12px, 3vw, 16px);
  background-color: #ffffff;
  min-height: 100vh;
  color: #1f2937;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.verification-container::-webkit-scrollbar {
  display: none;
}

/* Authentication Required Styles */
.auth-required {
  text-align: center;
  padding: clamp(40px, 8vw, 60px) clamp(16px, 4vw, 24px);
  background-color: #fef2f2;
  border-radius: clamp(12px, 3vw, 16px);
  border: 2px solid #ef4444;
  margin: clamp(20px, 5vw, 40px) clamp(12px, 3vw, 20px);
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.15);
}

.auth-icon {
  font-size: clamp(50px, 10vw, 80px);
  margin-bottom: clamp(16px, 3vw, 20px);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.auth-required h2 {
  color: #dc2626;
  margin-bottom: clamp(12px, 3vw, 16px);
  font-size: clamp(18px, 4.5vw, 28px);
  font-weight: 700;
  line-height: 1.2;
}

.auth-required p {
  color: #991b1b;
  margin-bottom: clamp(20px, 4vw, 24px);
  font-size: clamp(13px, 3.2vw, 16px);
  line-height: 1.5;
}

.retry-btn {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: clamp(14px, 3.5vw, 16px) clamp(24px, 6vw, 32px);
  border-radius: clamp(8px, 2vw, 10px);
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.retry-btn:hover {
  background-color: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

/* Header Section */
.verification-header {
  text-align: center;
  margin-bottom: clamp(24px, 5vw, 32px);
  padding: clamp(20px, 4vw, 24px) clamp(12px, 3vw, 16px);
  background-color: #ffffff;
  border-radius: clamp(12px, 3vw, 16px);
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.verification-header h1 {
  color: #111827;
  font-size: clamp(20px, 5.5vw, 36px);
  margin-bottom: clamp(10px, 2.5vw, 12px);
  line-height: 1.25;
  font-weight: 700;
  word-wrap: break-word;
}

.verification-header p {
  color: #6b7280;
  font-size: clamp(13px, 3.2vw, 16px);
  margin-bottom: clamp(16px, 4vw, 20px);
  line-height: 1.5;
  font-weight: 400;
}

.user-info {
  background-color: #f9fafb;
  padding: clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 16px);
  border-radius: clamp(6px, 1.5vw, 8px);
  margin-bottom: clamp(16px, 4vw, 20px);
  border: 1px solid #e5e7eb;
}

.user-info p {
  margin: clamp(3px, 1vw, 4px) 0;
  font-size: clamp(11px, 2.8vw, 14px);
  color: #374151;
  line-height: 1.4;
}

/* Progress Bar */
.progress-bar {
  width: 100%;
  height: clamp(6px, 1.5vw, 8px);
  background-color: #f3f4f6;
  border-radius: 20px;
  margin-bottom: clamp(20px, 4vw, 24px);
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 20px;
  background-size: 200% 100%;
  animation: progressShimmer 2s linear infinite;
}

@keyframes progressShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Step Indicators - Optimized for all screens */
.step-indicators {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(8px, 2vw, 12px);
  margin-bottom: clamp(24px, 5vw, 32px);
}

.step-indicator {
  text-align: center;
  padding: clamp(12px, 3vw, 16px) clamp(6px, 1.5vw, 8px);
  border-radius: clamp(8px, 2vw, 12px);
  border: 2px solid #e5e7eb;
  background-color: #f9fafb;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: clamp(75px, 15vw, 88px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.step-indicator.active {
  border-color: #3b82f6;
  background-color: #eff6ff;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.15);
}

.step-indicator.completed {
  border-color: #10b981;
  background-color: #ecfdf5;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
}

.step-icon {
  font-size: clamp(18px, 4.5vw, 24px);
  margin-bottom: clamp(6px, 1.5vw, 8px);
}

.step-title {
  font-size: clamp(10px, 2.6vw, 14px);
  font-weight: 600;
  color: #374151;
  line-height: 1.3;
  word-wrap: break-word;
  padding: 0 2px;
}

.step-indicator.active .step-title {
  color: #3b82f6;
  font-weight: 700;
}

.step-indicator.completed .step-title {
  color: #059669;
  font-weight: 700;
}

/* Main Content */
.verification-content {
  background-color: #ffffff;
  border-radius: clamp(12px, 3vw, 16px);
  padding: clamp(20px, 4vw, 24px);
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  position: relative;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.verification-content::-webkit-scrollbar {
  display: none;
}

.current-step {
  position: relative;
}

.step-header {
  text-align: center;
  margin-bottom: clamp(20px, 4vw, 28px);
}

.step-header h2 {
  color: #111827;
  font-size: clamp(18px, 4.5vw, 26px);
  margin-bottom: clamp(6px, 1.5vw, 8px);
  line-height: 1.3;
  font-weight: 600;
}

.step-header p {
  color: #6b7280;
  font-size: clamp(13px, 3.2vw, 16px);
  line-height: 1.5;
}

/* Document Form */
.document-form h3 {
  color: #111827;
  font-size: clamp(16px, 4vw, 22px);
  margin-bottom: clamp(20px, 4vw, 24px);
  text-align: center;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(16px, 3.5vw, 20px);
  margin-bottom: clamp(24px, 5vw, 28px);
}

.form-group {
  width: 100%;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  display: block;
  color: #374151;
  font-weight: 600;
  margin-bottom: clamp(6px, 1.5vw, 8px);
  font-size: clamp(13px, 3.2vw, 16px);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: clamp(12px, 3vw, 14px) clamp(14px, 3.5vw, 16px);
  border: 2px solid #d1d5db;
  border-radius: clamp(8px, 2vw, 10px);
  background-color: #ffffff;
  color: #111827;
  font-size: clamp(14px, 3.5vw, 16px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
  font-family: inherit;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #3b82f6;
  background-color: #eff6ff;
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  outline: 3px solid rgba(59, 130, 246, 0.1);
  outline-offset: 2px;
}

.form-group input.invalid {
  border-color: #ef4444;
  background-color: #fef2f2;
  animation: shake 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.form-group small {
  display: block;
  color: #6b7280;
  font-size: clamp(11px, 2.6vw, 14px);
  margin-top: clamp(4px, 1vw, 6px);
  line-height: 1.4;
}

/* File Input */
.file-input {
  padding: clamp(20px, 5vw, 24px) !important;
  cursor: pointer;
  border: 2px dashed #3b82f6 !important;
  background-color: #eff6ff !important;
  text-align: center;
  position: relative;
  transition: all 0.3s ease;
}

.file-input:hover {
  border-color: #2563eb !important;
  background-color: #dbeafe !important;
}

.selected-file {
  color: #059669;
  font-size: clamp(13px, 3.2vw, 16px);
  margin-top: clamp(10px, 2.5vw, 12px);
  font-weight: 500;
  padding: clamp(8px, 2vw, 10px) clamp(12px, 3vw, 14px);
  background-color: #ecfdf5;
  border-radius: clamp(6px, 1.5vw, 8px);
  border: 1px solid #10b981;
}

/* Rejection Message Styles */
.rejection-message {
  text-align: center;
  background-color: #fef2f2;
  padding: clamp(24px, 5vw, 32px) clamp(20px, 4vw, 24px);
  border-radius: clamp(10px, 2.5vw, 12px);
  border: 2px solid #ef4444;
}

.rejection-icon {
  font-size: clamp(36px, 8vw, 48px);
  margin-bottom: clamp(12px, 3vw, 16px);
}

.rejection-message h3 {
  color: #dc2626;
  margin-bottom: clamp(12px, 3vw, 16px);
  font-size: clamp(16px, 4vw, 22px);
  font-weight: 600;
}

.rejection-reason {
  background-color: #ffffff;
  padding: clamp(14px, 3.5vw, 16px);
  border-radius: clamp(6px, 1.5vw, 8px);
  margin: clamp(14px, 3.5vw, 16px) 0;
  border: 1px solid #d1d5db;
  color: #991b1b;
}

.reupload-btn {
  background-color: #ef4444;
  color: #ffffff;
  border: none;
  padding: clamp(10px, 2.5vw, 12px) clamp(20px, 5vw, 24px);
  border-radius: clamp(6px, 1.5vw, 8px);
  font-size: clamp(13px, 3.2vw, 14px);
  font-weight: 600;
  cursor: pointer;
  margin-top: clamp(14px, 3.5vw, 16px);
  transition: all 0.3s ease;
}

.reupload-btn:hover {
  background-color: #dc2626;
}

/* Uploaded Confirmation */
.uploaded-confirmation {
  text-align: center;
  background-color: #ecfdf5;
  padding: clamp(24px, 5vw, 32px) clamp(20px, 4vw, 24px);
  border-radius: clamp(10px, 2.5vw, 12px);
  border: 2px solid #10b981;
}

.success-icon {
  font-size: clamp(36px, 8vw, 48px);
  margin-bottom: clamp(12px, 3vw, 16px);
  animation: bounce 1.2s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.uploaded-confirmation h3 {
  color: #059669;
  margin-bottom: clamp(12px, 3vw, 16px);
  font-size: clamp(16px, 4vw, 22px);
  font-weight: 600;
}

.uploaded-details {
  background-color: #ffffff;
  padding: clamp(14px, 3.5vw, 16px);
  border-radius: clamp(6px, 1.5vw, 8px);
  margin-top: clamp(14px, 3.5vw, 16px);
  border: 1px solid #d1d5db;
}

.uploaded-details p {
  margin: clamp(6px, 1.5vw, 8px) 0;
  color: #374151;
  font-size: clamp(13px, 3.2vw, 16px);
}

/* Verification Success Message */
.verification-success {
  color: #059669;
  font-weight: 600;
  padding: clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 16px);
  background-color: #ecfdf5;
  border-radius: clamp(6px, 1.5vw, 8px);
  border: 1px solid #10b981;
  margin: clamp(10px, 2.5vw, 12px) 0;
}

.download-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
  padding: clamp(6px, 1.5vw, 8px) clamp(14px, 3.5vw, 16px);
  background-color: #eff6ff;
  border-radius: clamp(5px, 1.2vw, 6px);
  display: inline-block;
  margin: clamp(6px, 1.5vw, 8px) clamp(3px, 0.8vw, 4px);
  border: 1px solid #3b82f6;
  transition: all 0.3s ease;
  font-size: clamp(13px, 3.2vw, 14px);
}

.download-link:hover {
  background-color: #3b82f6;
  color: #ffffff;
}

.delete-btn {
  background-color: #ef4444;
  color: #ffffff;
  border: none;
  padding: clamp(6px, 1.5vw, 8px) clamp(14px, 3.5vw, 16px);
  border-radius: clamp(5px, 1.2vw, 6px);
  font-size: clamp(13px, 3.2vw, 14px);
  font-weight: 600;
  cursor: pointer;
  margin: clamp(6px, 1.5vw, 8px) clamp(3px, 0.8vw, 4px);
  transition: all 0.3s ease;
}

.delete-btn:hover:not(:disabled) {
  background-color: #dc2626;
}

.delete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Status Badges */
.status {
  padding: clamp(5px, 1.2vw, 6px) clamp(12px, 3vw, 14px);
  border-radius: 20px;
  font-size: clamp(10px, 2.4vw, 12px);
  font-weight: 700;
  text-transform: uppercase;
  display: inline-block;
  letter-spacing: 0.5px;
}

.status.pending {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}

.status.approved {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.status.rejected {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

/* Action Buttons */
.step-actions {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 3vw, 16px);
  margin-top: clamp(24px, 5vw, 32px);
}

.prev-btn,
.next-btn,
.upload-btn,
.submit-all-btn {
  width: 100%;
  padding: clamp(14px, 3.5vw, 16px) clamp(20px, 5vw, 24px);
  border: none;
  border-radius: clamp(8px, 2vw, 10px);
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.prev-btn {
  background-color: #f3f4f6;
  color: #374151;
  border: 2px solid #d1d5db;
  order: 2;
}

.next-btn {
  background-color: #0ea5e9;
  color: #ffffff;
  border: 2px solid #0ea5e9;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.25);
  order: 3;
}

.upload-btn {
  background-color: #3b82f6;
  color: #ffffff;
  border: 2px solid #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
  order: 1;
}

.submit-all-btn {
  background-color: #10b981;
  color: #ffffff;
  border: 2px solid #10b981;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
  order: 1;
}

.prev-btn:hover:not(:disabled) {
  background-color: #e5e7eb;
  border-color: #9ca3af;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.next-btn:hover:not(:disabled),
.upload-btn:hover:not(:disabled),
.submit-all-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.next-btn:hover:not(:disabled) {
  background-color: #0284c7;
}

.upload-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.submit-all-btn:hover:not(:disabled) {
  background-color: #059669;
}

.prev-btn:disabled,
.next-btn:disabled,
.upload-btn:disabled,
.submit-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  background-color: #9ca3af;
  border-color: #9ca3af;
  box-shadow: none;
}

/* Submission Status */
.submission-status {
  background-color: #fef3c7;
  padding: clamp(24px, 5vw, 28px) clamp(20px, 4vw, 24px);
  border-radius: clamp(10px, 2.5vw, 12px);
  border: 2px solid #f59e0b;
  text-align: center;
  margin-top: clamp(24px, 5vw, 28px);
}

.submission-status h3 {
  color: #92400e;
  margin-bottom: clamp(12px, 3vw, 16px);
  font-size: clamp(16px, 4vw, 22px);
  font-weight: 600;
}

.submission-status p {
  color: #78350f;
  font-size: clamp(13px, 3.2vw, 16px);
  line-height: 1.6;
  margin-bottom: clamp(12px, 3vw, 16px);
}

.submission-details {
  background-color: rgba(255, 255, 255, 0.8);
  padding: clamp(14px, 3.5vw, 16px);
  border-radius: clamp(6px, 1.5vw, 8px);
  margin-top: clamp(14px, 3.5vw, 16px);
}

.submission-details p {
  margin: clamp(6px, 1.5vw, 8px) 0;
  color: #78350f;
  font-size: clamp(13px, 3.2vw, 16px);
}

/* Success Message */
.success-message {
  text-align: center;
  background: linear-gradient(135deg, #10b981, #34d399);
  padding: clamp(32px, 7vw, 40px) clamp(20px, 4vw, 24px);
  border-radius: clamp(16px, 4vw, 20px);
  color: #ffffff;
  box-shadow: 0 10px 50px rgba(16, 185, 129, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.success-message .success-icon {
  font-size: clamp(50px, 12vw, 80px);
  margin-bottom: clamp(16px, 4vw, 20px);
  animation: celebration 2s ease-in-out;
}

@keyframes celebration {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.05) rotate(-3deg); }
  75% { transform: scale(1.05) rotate(3deg); }
}

.success-message h2 {
  font-size: clamp(20px, 6vw, 32px);
  margin-bottom: clamp(12px, 3vw, 16px);
  line-height: 1.3;
  font-weight: 700;
}

.success-details {
  background-color: rgba(255, 255, 255, 0.2);
  padding: clamp(16px, 4vw, 20px);
  border-radius: clamp(10px, 2.5vw, 12px);
  margin-top: clamp(20px, 5vw, 24px);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.success-details p {
  margin: clamp(8px, 2vw, 10px) 0;
  font-size: clamp(13px, 3.2vw, 16px);
  line-height: 1.5;
}

.success-details .approved {
  color: #d1fae5;
  font-weight: 700;
}

/* Updated Loading Overlays */
.page-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(8px);
}

.upload-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(4px);
  border-radius: clamp(10px, 2.5vw, 12px);
}

.loading-spinner {
  width: clamp(40px, 10vw, 50px);
  height: clamp(40px, 10vw, 50px);
  border: clamp(3px, 0.8vw, 4px) solid #e5e7eb;
  border-top: clamp(3px, 0.8vw, 4px) solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: clamp(12px, 3vw, 16px);
}

.loading-text {
  color: #374151;
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: 600;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ========================================
   MOBILE RESPONSIVE BREAKPOINTS
   ======================================== */

/* Extra Small Mobile (320px - 374px) */
@media (min-width: 320px) and (max-width: 374px) {
  .verification-container {
    padding: 10px;
  }
  
  .verification-header {
    padding: 18px 12px;
    margin-bottom: 20px;
  }
  
  .verification-content {
    padding: 16px;
  }
  
  .step-indicators {
    gap: 6px;
  }
  
  .step-indicator {
    min-height: 72px;
    padding: 10px 5px;
  }
  
  .step-title {
    font-size: 9px;
  }
}

/* Small Mobile (375px - 424px) */
@media (min-width: 375px) and (max-width: 424px) {
  .verification-container {
    padding: 12px;
  }
  
  .verification-header {
    padding: 20px 14px;
  }
  
  .verification-content {
    padding: 18px;
  }
  
  .step-indicator {
    min-height: 78px;
    padding: 12px 6px;
  }
}

/* Medium Mobile (425px - 639px) */
@media (min-width: 425px) and (max-width: 639px) {
  .verification-container {
    padding: 14px;
  }
  
  .verification-header {
    padding: 22px 16px;
  }
  
  .verification-content {
    padding: 20px;
  }
  
  .step-indicator {
    min-height: 82px;
  }
}

/* Small Tablet (640px - 767px) */
@media (min-width: 640px) {
  .verification-container {
    padding: 20px;
  }
  
  .verification-header {
    padding: 28px 20px;
  }
  
  .verification-content {
    padding: 28px;
  }
  
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  
  .step-actions {
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .prev-btn,
  .next-btn,
  .upload-btn,
  .submit-all-btn {
    width: auto;
    min-width: 140px;
    padding: 12px 24px;
    order: initial;
  }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) {
  .verification-container {
    padding: 24px;
  }
  
  .verification-header {
    padding: 32px 24px;
  }
  
  .verification-content {
    padding: 32px;
  }
  
  .step-indicators {
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  
  .prev-btn,
  .next-btn,
  .upload-btn,
  .submit-all-btn {
    min-width: 160px;
    padding: 14px 28px;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .verification-container {
    padding: 32px;
  }
  
  .verification-header {
    padding: 40px 32px;
  }
  
  .verification-content {
    padding: 40px;
  }
  
  .form-grid {
    gap: 24px;
  }
  
  .prev-btn,
  .next-btn,
  .upload-btn,
  .submit-all-btn {
    min-width: 180px;
    padding: 16px 32px;
  }
}

/* Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .prev-btn,
  .next-btn,
  .upload-btn,
  .submit-all-btn {
    min-width: 200px;
    padding: 18px 36px;
  }
}

/* Touch-friendly improvements for mobile */
@media (hover: none) and (pointer: coarse) {
  .step-indicator {
    padding: 16px 12px;
    min-height: 90px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: 14px 16px;
    font-size: 16px;
    border-radius: 10px;
    min-height: 48px;
  }
  
  .prev-btn,
  .next-btn,
  .upload-btn,
  .submit-all-btn {
    padding: 16px 24px;
    font-size: 16px;
    border-radius: 10px;
    min-height: 50px;
  }
  
  .download-link,
  .delete-btn,
  .reupload-btn,
  .retry-btn {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

/* Landscape orientation on mobile */
@media (max-width: 896px) and (orientation: landscape) {
  .verification-header {
    padding: 16px;
  }
  
  .verification-content {
    padding: 20px;
  }
  
  .step-indicator {
    min-height: 65px;
    padding: 10px 8px;
  }
  
  .step-icon {
    font-size: 18px;
    margin-bottom: 4px;
  }
}

/* Print styles */
@media print {
  .verification-container {
    background-color: transparent;
    box-shadow: none;
  }
  
  .page-loading-overlay,
  .upload-loading-overlay {
    display: none;
  }
  
  .step-actions {
    display: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .step-indicator {
    border-width: 3px;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    border-width: 3px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

`;

export default DocumentVerification;
