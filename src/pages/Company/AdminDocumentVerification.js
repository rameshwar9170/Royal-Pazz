import React, { useState, useEffect } from 'react';
import { ref as dbRef, onValue, update, get } from 'firebase/database';
import { database } from '../../firebase/config';

const AdminDocumentVerification = () => {
  const [verifications, setVerifications] = useState([]);
  const [filteredVerifications, setFilteredVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('submitted'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Enhanced document data extraction function for 3 documents only
  const extractDocumentData = async (userId, documentType) => {
    try {
      console.log(`🔍 Starting data extraction for ${documentType} - User: ${userId}`);
      
      const userRef = dbRef(database, `HTAMS/users/${userId}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();
      
      if (!userData) {
        console.log('❌ User data not found');
        return;
      }

      const document = userData?.documentVerification?.documents?.[documentType];
      
      if (!document) {
        console.log('❌ Document not found');
        return;
      }

      // Check if document is approved (check both fields)
      const isApproved = document.status === 'approved' || document.verificationStatus === 'approved';
      
      if (isApproved && document.formData) {
        const updates = {};
        
        console.log(`📄 Document form data:`, document.formData);
        
        // Extract data based on document type (only 3 types)
        if (documentType === 'panCard' && document.formData.panNumber) {
          updates.pan = document.formData.panNumber;
          console.log(`✅ Extracted PAN: ${document.formData.panNumber}`);
        }
        
        if (documentType === 'aadharCard' && document.formData.aadharNumber) {
          updates.aadhar = document.formData.aadharNumber.replace(/\s/g, '');
          console.log(`✅ Extracted Aadhar: ${updates.aadhar}`);
        }
        
        if (documentType === 'bankDetails' && document.formData.accountHolderName) {
          updates.bankDetails = {
            accountHolderName: document.formData.accountHolderName,
            accountNumber: document.formData.accountNumber,
            bankName: document.formData.bankName,
            ifscCode: document.formData.ifscCode,
            branchName: document.formData.branchName,
            accountType: document.formData.accountType,
            verified: true,
            verifiedAt: Date.now()
          };
          console.log(`✅ Extracted Bank Details`);
        }
        
        // Update user profile if we have data to update
        if (Object.keys(updates).length > 0) {
          await update(userRef, updates);
          console.log(`✅ Successfully saved to user profile:`, updates);
          
          // Also update last updated timestamp
          await update(userRef, {
            lastUpdated: Date.now(),
            [`${documentType}VerifiedAt`]: Date.now()
          });
        } else {
          console.log(`⚠️ No data to extract for ${documentType}`);
        }
      } else {
        console.log(`❌ Document not approved or missing form data:`, {
          isApproved,
          hasFormData: !!document.formData
        });
      }
    } catch (error) {
      console.error('❌ Error extracting document data:', error);
    }
  };

  // Load verification data with proper status handling
  useEffect(() => {
    const verificationRef = dbRef(database, 'HTAMS/users');
    const unsubscribe = onValue(verificationRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const verificationList = [];
        
        Object.entries(userData).forEach(([userId, user]) => {
          if (user.documentVerification && user.documentVerification.documents) {
            const verification = user.documentVerification;
            
            // Process documents with correct status priority
            const processedDocuments = {};
            Object.entries(verification.documents).forEach(([docType, docData]) => {
              if (['panCard', 'aadharCard', 'bankDetails'].includes(docType)) {
                // Proper status determination
                let documentStatus = 'pending'; // Default status
                
                // Check both status fields and prioritize the most recent/accurate one
                if (docData.verificationStatus) {
                  documentStatus = docData.verificationStatus;
                } else if (docData.status) {
                  documentStatus = docData.status;
                }
                
                // If document has been reviewed, use that status
                if (docData.reviewedBy === 'admin' && (docData.status === 'approved' || docData.status === 'rejected')) {
                  documentStatus = docData.status;
                }
                
                processedDocuments[docType] = {
                  ...docData,
                  uploaded: !!(docData.downloadURL && docData.downloadURL.trim() !== ''),
                  status: documentStatus
                };
                
                console.log(`Document ${docType} status: ${documentStatus}`, docData);
              }
            });

            if (Object.keys(processedDocuments).length > 0) {
              verificationList.push({
                userId,
                ...verification,
                documents: processedDocuments,
                userDetails: {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  currentLevel: user.currentLevel || user.role
                },
                submittedDate: new Date(verification.lastUpdated || Date.now())
              });
            }
          }
        });
        
        // Sort by priority
        verificationList.sort((a, b) => {
          if (a.overallStatus === 'submitted' && b.overallStatus !== 'submitted') return -1;
          if (b.overallStatus === 'submitted' && a.overallStatus !== 'submitted') return 1;
          return b.submittedDate - a.submittedDate;
        });
        
        setVerifications(verificationList);
        setFilteredVerifications(verificationList);
        console.log('Loaded verifications:', verificationList);
      } else {
        setVerifications([]);
        setFilteredVerifications([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = verifications;

    if (filter !== 'all') {
      filtered = filtered.filter(v => v.overallStatus === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.userDetails?.name?.toLowerCase().includes(query) ||
        v.userDetails?.email?.toLowerCase().includes(query) ||
        v.userDetails?.phone?.includes(query) ||
        v.userId.toLowerCase().includes(query)
      );
    }

    setFilteredVerifications(filtered);
  }, [filter, searchQuery, verifications]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '📄';
    }
  };

  // Enhanced document action handler with immediate status update
  const handleDocumentAction = async (userId, docType, action, rejectionReason = '') => {
    try {
      console.log(`🔄 Processing ${action} for ${docType} - User: ${userId}`);
      
      const timestamp = Date.now();
      
      // Update local state IMMEDIATELY to prevent UI delay
      setVerifications(prevVerifications => {
        return prevVerifications.map(verification => {
          if (verification.userId === userId) {
            const updatedDocuments = {
              ...verification.documents,
              [docType]: {
                ...verification.documents[docType],
                status: action,
                verificationStatus: action,
                reviewedAt: timestamp,
                reviewedBy: 'admin',
                ...(action === 'rejected' && rejectionReason && { rejectionReason })
              }
            };

            return {
              ...verification,
              documents: updatedDocuments
            };
          }
          return verification;
        });
      });

      // Update Firebase
      const updates = {};
      updates[`HTAMS/users/${userId}/documentVerification/documents/${docType}/status`] = action;
      updates[`HTAMS/users/${userId}/documentVerification/documents/${docType}/verificationStatus`] = action;
      updates[`HTAMS/users/${userId}/documentVerification/documents/${docType}/reviewedAt`] = timestamp;
      updates[`HTAMS/users/${userId}/documentVerification/documents/${docType}/reviewedBy`] = 'admin';
      
      if (action === 'rejected' && rejectionReason) {
        updates[`HTAMS/users/${userId}/documentVerification/documents/${docType}/rejectionReason`] = rejectionReason;
      }

      await update(dbRef(database), updates);
      console.log('✅ Document status updated in Firebase');

      // Extract data if approved
      if (action === 'approved') {
        console.log('🎯 Document approved, extracting data...');
        setTimeout(() => {
          extractDocumentData(userId, docType);
        }, 100);
      }

      // Check if all documents are processed
      const verification = verifications.find(v => v.userId === userId);
      if (verification) {
        const requiredDocuments = ['panCard', 'aadharCard', 'bankDetails'];
        const updatedDocs = { ...verification.documents };
        updatedDocs[docType] = {
          ...updatedDocs[docType],
          status: action,
          verificationStatus: action
        };

        const processedRequiredDocs = requiredDocuments.filter(docKey => 
          updatedDocs[docKey] && 
          (updatedDocs[docKey].status === 'approved' || updatedDocs[docKey].status === 'rejected')
        );

        // Only set overall status when ALL 3 documents are processed
        if (processedRequiredDocs.length === requiredDocuments.length) {
          const allApproved = requiredDocuments.every(docKey => 
            updatedDocs[docKey] && updatedDocs[docKey].status === 'approved'
          );
          const finalStatus = allApproved ? 'approved' : 'rejected';

          const finalUpdates = {};
          finalUpdates[`HTAMS/users/${userId}/documentVerification/overallStatus`] = finalStatus;
          finalUpdates[`HTAMS/users/${userId}/documentVerification/finalReviewAt`] = timestamp;
          finalUpdates[`HTAMS/users/${userId}/documentVerification/reviewedBy`] = 'admin';
          finalUpdates[`HTAMS/users/${userId}/documentVerificationStatus`] = finalStatus;
          finalUpdates[`HTAMS/users/${userId}/documentVerificationCompletedAt`] = timestamp;

          await update(dbRef(database), finalUpdates);
          console.log(`🎉 Final verification status: ${finalStatus}`);

          alert(`✅ All documents ${finalStatus} for ${verification.userDetails?.name}`);
          setShowModal(false);
        } else {
          console.log(`✅ Document ${docType} ${action} - ${3 - processedRequiredDocs.length} documents remaining`);
          alert(`✅ Document ${docType} ${action} successfully!`);
        }
      }
    } catch (error) {
      console.error('❌ Error updating document:', error);
      alert('❌ Failed to update document status: ' + error.message);
    }
  };

  // Handle Quick Approve
  const handleQuickApproveClick = (verification) => {
    setConfirmAction({
      type: 'quickApprove',
      verification,
      title: 'Quick Approve All Documents',
      message: `Are you sure you want to approve all documents for ${verification.userDetails?.name}?`,
      confirmText: 'Yes, Approve All',
      onConfirm: () => handleQuickApprove(verification)
    });
    setShowConfirmModal(true);
  };

  const handleQuickApprove = async (verification) => {
    try {
      console.log('🚀 Quick approving all documents for:', verification.userDetails?.name);
      
      const timestamp = Date.now();
      const updates = {};
      
      const requiredDocuments = ['panCard', 'aadharCard', 'bankDetails'];
      requiredDocuments.forEach(docType => {
        if (verification.documents[docType]) {
          updates[`HTAMS/users/${verification.userId}/documentVerification/documents/${docType}/status`] = 'approved';
          updates[`HTAMS/users/${verification.userId}/documentVerification/documents/${docType}/verificationStatus`] = 'approved';
          updates[`HTAMS/users/${verification.userId}/documentVerification/documents/${docType}/reviewedAt`] = timestamp;
          updates[`HTAMS/users/${verification.userId}/documentVerification/documents/${docType}/reviewedBy`] = 'admin';
        }
      });
      
      const availableDocuments = requiredDocuments.filter(docType => verification.documents[docType]);
      if (availableDocuments.length === requiredDocuments.length) {
        updates[`HTAMS/users/${verification.userId}/documentVerification/overallStatus`] = 'approved';
        updates[`HTAMS/users/${verification.userId}/documentVerification/finalReviewAt`] = timestamp;
        updates[`HTAMS/users/${verification.userId}/documentVerification/reviewedBy`] = 'admin';
        updates[`HTAMS/users/${verification.userId}/documentVerificationStatus`] = 'approved';
        updates[`HTAMS/users/${verification.userId}/documentVerificationCompletedAt`] = timestamp;
      }

      await update(dbRef(database), updates);

      // Extract data from all approved documents
      setTimeout(async () => {
        for (const docType of availableDocuments) {
          await extractDocumentData(verification.userId, docType);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }, 200);
      
      alert(`✅ All available documents approved for ${verification.userDetails?.name}`);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('❌ Error approving documents:', error);
      alert('❌ Failed to approve documents: ' + error.message);
    }
  };

  const handleRejectDocument = (userId, docType) => {
    const reason = prompt('Enter rejection reason:');
    if (reason && reason.trim()) {
      handleDocumentAction(userId, docType, 'rejected', reason.trim());
    }
  };

  // Debug helper function
  const debugDocumentData = (verification) => {
    console.log('=== DEBUGGING DOCUMENT DATA ===');
    console.log('User ID:', verification.userId);
    console.log('User Details:', verification.userDetails);
    console.log('Documents:', verification.documents);
    
    Object.entries(verification.documents).forEach(([docType, doc]) => {
      console.log(`\n--- ${docType.toUpperCase()} ---`);
      console.log('Status:', doc.status);
      console.log('Uploaded:', doc.uploaded);
      console.log('Form Data:', doc.formData);
      console.log('Full Document Object:', doc);
    });
    console.log('=== END DEBUG ===\n');
  };

  const openVerificationModal = (verification) => {
    debugDocumentData(verification); // Add debug logging
    setSelectedVerification(verification);
    setShowModal(true);
  };

  const getDocumentTypeLabel = (docType) => {
    const labels = {
      panCard: 'PAN Card',
      aadharCard: 'Aadhar Card',
      bankDetails: 'Bank Details'
    };
    return labels[docType] || docType;
  };

  // Enhanced renderFormData function with better data handling
  const renderFormData = (docType, formData) => {
    if (!formData) {
      return (
        <div className="no-form-data">
          <p><em>No form data available</em></p>
        </div>
      );
    }
    
    switch (docType) {
      case 'panCard':
        return (
          <div className="form-data-section">
            <p><strong>PAN Number:</strong> <span className="data-value">{formData.panNumber || 'Not provided'}</span></p>
            <p><strong>Name on PAN:</strong> <span className="data-value">{formData.nameOnPan || 'Not provided'}</span></p>
            {formData.uploadedAt && (
              <p><strong>Uploaded At:</strong> <span className="data-value">{new Date(formData.uploadedAt).toLocaleDateString()}</span></p>
            )}
          </div>
        );
      case 'aadharCard':
        return (
          <div className="form-data-section">
            <p><strong>Aadhar Number:</strong> <span className="data-value">{formData.aadharNumber || 'Not provided'}</span></p>
            <p><strong>Name on Aadhar:</strong> <span className="data-value">{formData.nameOnAadhar || 'Not provided'}</span></p>
            {formData.uploadedAt && (
              <p><strong>Uploaded At:</strong> <span className="data-value">{new Date(formData.uploadedAt).toLocaleDateString()}</span></p>
            )}
          </div>
        );
      case 'bankDetails':
        return (
          <div className="form-data-section">
            <p><strong>Account Holder:</strong> <span className="data-value">{formData.accountHolderName || 'Not provided'}</span></p>
            <p><strong>Account Number:</strong> <span className="data-value">{formData.accountNumber || 'Not provided'}</span></p>
            <p><strong>IFSC Code:</strong> <span className="data-value">{formData.ifscCode || 'Not provided'}</span></p>
            <p><strong>Bank Name:</strong> <span className="data-value">{formData.bankName || 'Not provided'}</span></p>
            <p><strong>Branch:</strong> <span className="data-value">{formData.branchName || 'Not provided'}</span></p>
            <p><strong>Account Type:</strong> <span className="data-value">{formData.accountType || 'Not provided'}</span></p>
            {formData.uploadedAt && (
              <p><strong>Uploaded At:</strong> <span className="data-value">{new Date(formData.uploadedAt).toLocaleDateString()}</span></p>
            )}
          </div>
        );
      default:
        return (
          <div className="unknown-document">
            <p><em>Unknown document type: {docType}</em></p>
            <pre>{JSON.stringify(formData, null, 2)}</pre>
          </div>
        );
    }
  };

  const ConfirmationModal = () => {
    if (!showConfirmModal || !confirmAction) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
        <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-header">
            <h3>{confirmAction.title}</h3>
          </div>
          <div className="confirm-body">
            <p>{confirmAction.message}</p>
          </div>
          <div className="confirm-actions">
            <button 
              className="cancel-btn"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </button>
            <button 
              className="confirm-btn"
              onClick={() => {
                confirmAction.onConfirm();
                setShowConfirmModal(false);
              }}
            >
              {confirmAction.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <style jsx>{adminStyles}</style>
        <div className="admin-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading document verifications...</p>
          </div>
        </div>
      </>
    );
  }

  const pendingCount = verifications.filter(v => v.overallStatus === 'submitted').length;
  const approvedCount = verifications.filter(v => v.overallStatus === 'approved').length;
  const rejectedCount = verifications.filter(v => v.overallStatus === 'rejected').length;

  return (
    <>
      <style jsx>{adminStyles}</style>
      <div className="admin-container">
        <div className="admin-header">
          <h1>📋 Document Verification Dashboard</h1>
          <p>Review and approve agency document submissions (PAN, Aadhar, Bank)</p>
          
          {pendingCount > 0 && (
            <div className="urgent-notice">
              <span className="urgent-icon">🚨</span>
              <strong>{pendingCount} document{pendingCount > 1 ? 's' : ''} awaiting your review!</strong>
            </div>
          )}
          
          <div className="admin-stats">
            <div className="stat-card pending">
              <div className="stat-number">{pendingCount}</div>
              <div className="stat-label">Pending Review</div>
            </div>
            <div className="stat-card approved">
              <div className="stat-number">{approvedCount}</div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-card rejected">
              <div className="stat-number">{rejectedCount}</div>
              <div className="stat-label">Rejected</div>
            </div>
            <div className="stat-card total">
              <div className="stat-number">{verifications.length}</div>
              <div className="stat-label">Total Submissions</div>
            </div>
          </div>
        </div>

        <div className="admin-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search by name, email, phone, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-buttons">
              <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All ({verifications.length})
            </button>
            <button 
              className={filter === 'submitted' ? 'active pending' : ''}
              onClick={() => setFilter('submitted')}
            >
              🚨 Pending ({pendingCount})
            </button>
          
            <button 
              className={filter === 'approved' ? 'active approved' : ''}
              onClick={() => setFilter('approved')}
            >
              ✅ Approved ({approvedCount})
            </button>
            <button 
              className={filter === 'rejected' ? 'active rejected' : ''}
              onClick={() => setFilter('rejected')}
            >
              ❌ Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        {filteredVerifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {filter === 'submitted' ? '🎉' : '📄'}
            </div>
            <h3>
              {filter === 'submitted' 
                ? 'No Pending Verifications!' 
                : 'No verifications found'
              }
            </h3>
            <p>
              {filter === 'submitted' 
                ? 'Great! All document verifications have been processed.' 
                : 'No document verifications match your current filter.'
              }
            </p>
          </div>
        ) : (
          <div className="verification-list">
            {filteredVerifications.map((verification) => (
              <div 
                key={verification.userId} 
                className={`verification-card ${verification.overallStatus === 'submitted' ? 'pending-highlight' : ''}`}
              >
                <div className="card-header">
                  <div className="user-info">
                    <h3>
                      {verification.userDetails?.name || 'Unknown User'}
                      {verification.overallStatus === 'submitted' && (
                        <span className="urgent-badge">🚨 URGENT</span>
                      )}
                    </h3>
                    <div className="user-details">
                      <span>📧 {verification.userDetails?.email}</span>
                      <span>📱 {verification.userDetails?.phone}</span>
                      <span>🏢 {verification.userDetails?.currentLevel}</span>
                    </div>
                  </div>
                  <div className="status-section">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(verification.overallStatus) }}
                    >
                      {getStatusIcon(verification.overallStatus)} {verification.overallStatus?.toUpperCase()}
                    </span>
                    <div className="submission-date">
                      📅 {verification.submittedDate.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Document summary with correct status display */}
                <div className="documents-summary">
                  {verification.documents && Object.entries(verification.documents)
                    .filter(([docType]) => ['panCard', 'aadharCard', 'bankDetails'].includes(docType))
                    .map(([docType, doc]) => (
                    <div key={docType} className="doc-summary">
                      <span className="doc-name">{getDocumentTypeLabel(docType)}</span>
                      <div className="doc-status-group">
                        {doc.uploaded && (
                          <span className="upload-indicator">📎</span>
                        )}
                        <span 
                          className={`doc-status ${doc.status}`}
                          style={{ backgroundColor: getStatusColor(doc.status) }}
                          title={`Status: ${doc.status.toUpperCase()}`}
                        >
                          {getStatusIcon(doc.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-actions">
                  <button 
                    className="review-btn"
                    onClick={() => openVerificationModal(verification)}
                  >
                    🔍 Review Documents
                  </button>
                  {verification.overallStatus === 'submitted' && (
                    <div className="quick-actions">
                      <button 
                        className="quick-approve"
                        onClick={() => handleQuickApproveClick(verification)}
                      >
                        ✅ Quick Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Document Review Modal */}
        {showModal && selectedVerification && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="clean-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="clean-modal-header">
                <div className="header-info">
                  <div className="header-icon">📋</div>
                  <h2>{selectedVerification.userDetails?.name || 'Document Review'}</h2>
                </div>
                <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
              </div>
              
              <div className="clean-user-bar">
                <div className="user-info-item">
                  <strong>Email:</strong> {selectedVerification.userDetails?.email || '-'}
                </div>
                <div className="user-info-item">
                  <strong>Phone:</strong> {selectedVerification.userDetails?.phone || '-'}
                </div>
                <div className="user-info-item">
                  <strong>Level:</strong> {selectedVerification.userDetails?.currentLevel || '-'}
                </div>
                <div className="user-info-item">
                  <strong>Submitted:</strong> {selectedVerification.submittedDate.toLocaleDateString()}
                </div>
              </div>

              <div className="clean-documents-list">
                {selectedVerification.documents && Object.entries(selectedVerification.documents)
                  .filter(([docType]) => ['panCard', 'aadharCard', 'bankDetails'].includes(docType))
                  .map(([docType, doc]) => (
                  <div key={docType} className="clean-document-card">
                    <div className="clean-doc-header">
                      <h3>
                        {getDocumentTypeLabel(docType)}
                        {doc.uploaded && <span className="uploaded-indicator">📎 padding</span>}
                      </h3>
                      <span 
                        className={`clean-status-badge ${doc.status}`}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="clean-doc-details">
                      <p><strong>File:</strong> {doc.fileName || 'No file'}</p>
                      <p><strong>Uploaded:</strong> {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Not uploaded'}</p>
                      <p><strong>Current Status:</strong> <span className={`inline-status ${doc.status}`}>{doc.status.toUpperCase()}</span></p>
                      
                      {/* Always show form data regardless of status */}
                      {doc.formData && (
                        <div className="clean-form-data">
                          <h4>📄 Document Information:</h4>
                          {renderFormData(docType, doc.formData)}
                        </div>
                      )}

                      {/* Show debug info if formData is missing */}
                      {!doc.formData && (
                        <div className="missing-data-notice">
                          <p><strong>⚠️ Form Data Missing:</strong> Document uploaded but form information not found.</p>
                          <details>
                            <summary>Debug Info</summary>
                            <pre>{JSON.stringify(doc, null, 2)}</pre>
                          </details>
                        </div>
                      )}

                      {doc.status === 'rejected' && doc.rejectionReason && (
                        <div className="clean-rejection-reason">
                          <strong>Rejection Reason:</strong> {doc.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="clean-doc-actions">
                      {doc.uploaded && doc.downloadURL ? (
                        <a 
                          href={doc.downloadURL} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="clean-view-btn"
                        >
                          📄 View Document
                        </a>
                      ) : (
                        <div className="no-document-notice">
                          ⚠️ No document uploaded yet
                        </div>
                      )}
                      
                      {/* Show action buttons for pending documents */}
                      {doc.status === 'pending' && doc.uploaded && (
                        <div className="clean-approval-buttons">
                          <button 
                            className="clean-approve-btn"
                            onClick={() => handleDocumentAction(selectedVerification.userId, docType, 'approved')}
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="clean-reject-btn"
                            onClick={() => handleRejectDocument(selectedVerification.userId, docType)}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}

                      {doc.status === 'approved' && (
                        <div className="status-message approved-message">
                          ✅ This document has been approved
                        </div>
                      )}

                      {doc.status === 'rejected' && (
                        <div className="status-message rejected-message">
                          ❌ This document has been rejected
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal />
      </div>
    </>
  );
};

const adminStyles = `
  .admin-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
    min-height: 100vh;
    color: #1f2937;
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .admin-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 30px 20px;
    background-color: #ffffff;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .admin-header h1 {
    color: #111827;
    font-size: clamp(24px, 5vw, 32px);
    margin-bottom: 10px;
    font-weight: 700;
  }

  .admin-header p {
    color: #6b7280;
    font-size: 16px;
    margin-bottom: 20px;
  }

  .urgent-notice {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(248, 113, 113, 0.05));
    border: 2px solid #ef4444;
    border-radius: 12px;
    padding: 15px 20px;
    margin-bottom: 20px;
    color: #dc2626;
    font-size: 16px;
    animation: pulse 2s infinite;
  }

  .urgent-icon {
    font-size: 20px;
    margin-right: 10px;
  }

  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  }

  .admin-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  .stat-card {
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #e5e7eb;
    transition: all 0.3s ease;
    background-color: #ffffff;
  }

  .stat-card.pending {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border-color: #f59e0b;
    transform: scale(1.05);
    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.2);
  }

  .stat-card.approved {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-color: #10b981;
  }

  .stat-card.rejected {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border-color: #ef4444;
  }

  .stat-card.total {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border-color: #3b82f6;
  }

  .stat-number {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 14px;
    color: #6b7280;
    font-weight: 500;
  }

  .admin-controls {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 30px;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .search-box input {
    width: 100%;
    padding: 15px 20px;
    border: 2px solid #d1d5db;
    border-radius: 10px;
    background-color: #ffffff;
    color: #111827;
    font-size: 16px;
    transition: all 0.3s ease;
  }

  .search-box input:focus {
    outline: none;
    border-color: #3b82f6;
    background-color: #eff6ff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .filter-buttons button {
    padding: 12px 20px;
    border: 2px solid #d1d5db;
    border-radius: 25px;
    background-color: #ffffff;
    color: #6b7280;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .filter-buttons button:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
  }

  .filter-buttons button.active {
    background-color: #3b82f6;
    border-color: #3b82f6;
    color: #ffffff;
  }

  .filter-buttons button.active.pending {
    background: linear-gradient(135deg, #f59e0b, #fbbf24);
    border-color: #f59e0b;
    animation: glow 2s ease-in-out infinite alternate;
    font-weight: 700;
  }

  @keyframes glow {
    from { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
    to { box-shadow: 0 0 20px rgba(245, 158, 11, 0.8); }
  }

  .filter-buttons button.active.approved {
    background-color: #10b981;
    border-color: #10b981;
  }

  .filter-buttons button.active.rejected {
    background-color: #ef4444;
    border-color: #ef4444;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    background-color: #ffffff;
    border-radius: 16px;
    border: 2px dashed #d1d5db;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }

  .empty-state h3 {
    color: #111827;
    margin-bottom: 10px;
    font-size: 24px;
  }

  .empty-state p {
    color: #6b7280;
    font-size: 16px;
  }

  .verification-list {
    display: grid;
    gap: 20px;
  }

  .verification-card {
    background-color: #ffffff;
    border-radius: 16px;
    padding: 25px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
  }

  .verification-card.pending-highlight {
    border-color: #f59e0b;
    box-shadow: 0 8px 30px rgba(245, 158, 11, 0.15);
    background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%);
  }

  .verification-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
  }

  .user-info h3 {
    color: #111827;
    font-size: 20px;
    margin-bottom: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .urgent-badge {
    background: linear-gradient(135deg, #ef4444, #f87171);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 12px;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.5; }
  }

  .user-details {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    font-size: 14px;
    color: #6b7280;
  }

  .status-section {
    text-align: right;
  }

  .status-badge {
    padding: 8px 16px;
    border-radius: 20px;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: inline-block;
    margin-bottom: 8px;
  }

  .submission-date {
    font-size: 12px;
    color: #6b7280;
  }

  .documents-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .doc-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background-color: #ffffff;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }

  .doc-name {
    font-size: 12px;
    color: #374151;
    font-weight: 500;
  }

  .doc-status-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .upload-indicator {
    font-size: 12px;
    color: #10b981;
  }

  .doc-status {
    padding: 4px 8px;
    border-radius: 10px;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
  }

  .card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .review-btn {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    color: #ffffff;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .review-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .quick-approve {
    background: linear-gradient(135deg, #10b981, #34d399);
    color: #ffffff;
    border: none;
    padding: 10px 18px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    animation: pulse-green 3s infinite;
  }

  @keyframes pulse-green {
    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  }

  .quick-approve:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(8px);
  }

  .clean-modal-content {
    background-color: #ffffff;
    border-radius: 16px;
    width: 95%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 75px rgba(0, 0, 0, 0.3);
    border: 1px solid #e5e7eb;
  }

  .clean-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    border-bottom: 1px solid #e5e7eb;
    background-color: #f9fafb;
  }

  .header-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-icon {
    font-size: 24px;
  }

  .header-info h2 {
    color: #111827;
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #6b7280;
    font-size: 28px;
    cursor: pointer;
    padding: 5px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
  }

  .close-btn:hover {
    background-color: #fef2f2;
    color: #ef4444;
  }

  .clean-user-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    background-color: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    padding: 0;
  }

  .user-info-item {
    padding: 18px 20px;
    color: #374151;
    font-size: 14px;
    border-right: 1px solid #e5e7eb;
  }

  .user-info-item:last-child {
    border-right: none;
  }

  .user-info-item strong {
    color: #111827;
    display: block;
    margin-bottom: 4px;
  }

  .clean-documents-list {
    padding: 25px;
    display: grid;
    gap: 25px;
  }

  .clean-document-card {
    background-color: #f9fafb;
    border-radius: 12px;
    padding: 25px;
    border: 1px solid #e5e7eb;
  }

  .clean-doc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .clean-doc-header h3 {
    color: #111827;
    font-size: 20px;
    margin: 0;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .uploaded-indicator {
    font-size: 14px;
    color: #10b981;
    font-weight: 500;
  }

  .clean-status-badge {
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .clean-status-badge.pending {
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #f59e0b;
  }

  .clean-status-badge.approved {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
  }

  .clean-status-badge.rejected {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #ef4444;
  }

  .clean-doc-details {
    margin-bottom: 20px;
  }

  .clean-doc-details p {
    margin: 10px 0;
    color: #374151;
    font-size: 14px;
  }

  .clean-doc-details strong {
    color: #111827;
  }

  .inline-status {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .inline-status.pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .inline-status.approved {
    background-color: #d1fae5;
    color: #065f46;
  }

  .inline-status.rejected {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .clean-form-data {
    background-color: #ffffff;
    padding: 18px;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #e5e7eb;
    border-left: 4px solid #3b82f6;
  }

  .clean-form-data h4 {
    color: #111827;
    margin-bottom: 12px;
    font-size: 16px;
    font-weight: 600;
  }

  .form-data-section p {
    margin: 8px 0;
    color: #374151;
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .data-value {
    color: #111827;
    font-weight: 600;
    background-color: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .no-form-data {
    background-color: #fef3c7;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid #f59e0b;
    color: #92400e;
    font-style: italic;
  }

  .missing-data-notice {
    background-color: #fef2f2;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid #ef4444;
    color: #991b1b;
    margin: 12px 0;
  }

  .missing-data-notice details {
    margin-top: 8px;
  }

  .missing-data-notice summary {
    cursor: pointer;
    font-weight: 600;
    color: #dc2626;
  }

  .missing-data-notice pre {
    background-color: #ffffff;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #374151;
    overflow-x: auto;
    margin-top: 8px;
    border: 1px solid #e5e7eb;
  }

  .unknown-document {
    background-color: #f3f4f6;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid #6b7280;
    color: #374151;
  }

  .unknown-document pre {
    background-color: #ffffff;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 8px;
  }

  .clean-rejection-reason {
    background-color: #fef2f2;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #ef4444;
    color: #991b1b;
    font-size: 14px;
    margin: 15px 0;
  }

  .no-document-notice {
    background-color: #fef3c7;
    color: #92400e;
    padding: 14px 20px;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    border: 1px solid #f59e0b;
  }

  .clean-doc-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .clean-view-btn {
    background: linear-gradient(135deg, #06b6d4, #38bdf8);
    color: #ffffff;
    text-decoration: none;
    padding: 14px 20px;
    border-radius: 8px;
    font-weight: 600;
    text-align: center;
    transition: all 0.3s ease;
    font-size: 14px;
    display: block;
  }

  .clean-view-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
  }

  .clean-approval-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .clean-approve-btn,
  .clean-reject-btn {
    padding: 14px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
  }

  .clean-approve-btn {
    background: linear-gradient(135deg, #10b981, #34d399);
    color: #ffffff;
  }

  .clean-approve-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }

  .clean-reject-btn {
    background: linear-gradient(135deg, #ef4444, #f87171);
    color: #ffffff;
  }

  .clean-reject-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .status-message {
    padding: 12px 16px;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
  }

  .approved-message {
    background-color: #d1fae5;
    color: #065f46;
    border: 1px solid #10b981;
  }

  .rejected-message {
    background-color: #fee2e2;
    color: #991b1b;
    border: 1px solid #ef4444;
  }

  .confirmation-modal {
    background-color: #ffffff;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid #e5e7eb;
  }

  .confirm-header {
    padding: 20px 20px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .confirm-header h3 {
    color: #111827;
    font-size: 20px;
    margin: 0 0 20px 0;
    font-weight: 600;
  }

  .confirm-body {
    padding: 20px;
  }

  .confirm-body p {
    color: #374151;
    font-size: 16px;
    margin: 0;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 10px;
    padding: 0 20px 20px;
    justify-content: flex-end;
  }

  .cancel-btn {
    background-color: #e5e7eb;
    color: #374151;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cancel-btn:hover {
    background-color: #d1d5db;
  }

  .confirm-btn {
    background: linear-gradient(135deg, #10b981, #34d399);
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .confirm-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }

  .loading-state {
    text-align: center;
    padding: 100px 20px;
    color: #6b7280;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .admin-container {
      padding: 15px;
    }

    .admin-controls {
      padding: 15px;
    }

    .filter-buttons {
      justify-content: center;
    }

    .filter-buttons button {
      font-size: 12px;
      padding: 8px 16px;
    }

    .verification-card {
      padding: 20px;
    }

    .card-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .status-section {
      text-align: left;
    }

    .documents-summary {
      grid-template-columns: 1fr;
    }

    .clean-modal-content {
      width: 98%;
      margin: 10px;
    }

    .clean-user-bar {
      grid-template-columns: 1fr;
    }

    .user-info-item {
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
    }

    .user-info-item:last-child {
      border-bottom: none;
    }

    .clean-approval-buttons {
      grid-template-columns: 1fr;
    }

    .confirmation-modal {
      width: 95%;
    }
  }

  @media (max-width: 480px) {
    .admin-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .user-details {
      flex-direction: column;
      gap: 8px;
    }

    .card-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .clean-documents-list {
      padding: 20px;
    }
  }
`;

export default AdminDocumentVerification;
