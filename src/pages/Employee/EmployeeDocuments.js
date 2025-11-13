import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaFileAlt, FaDownload, FaEye, FaIdCard, FaUpload } from 'react-icons/fa';

const EmployeeDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const employeeId = localStorage.getItem('employeeId');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const employeeRef = ref(database, `HTAMS/company/Employees/${employeeId}`);
      const snapshot = await get(employeeRef);
      
      if (snapshot.exists()) {
        const employeeData = snapshot.val();
        const docs = [];

        // Add PAN card if exists
        if (employeeData.panCard && employeeData.panCard.downloadURL) {
          docs.push({
            id: 'pan',
            name: 'PAN Card',
            type: 'Identity Document',
            url: employeeData.panCard.downloadURL,
            uploadedAt: employeeData.panCard.uploadedAt,
            fileName: employeeData.panCard.fileName,
            status: 'verified'
          });
        }

        // Add other documents if they exist
        if (employeeData.documents) {
          Object.entries(employeeData.documents).forEach(([key, doc]) => {
            docs.push({
              id: key,
              name: doc.name || key,
              type: doc.type || 'Document',
              url: doc.downloadURL,
              uploadedAt: doc.uploadedAt,
              fileName: doc.fileName,
              status: doc.status || 'pending'
            });
          });
        }

        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDocument = (document) => {
    setSelectedDocument(document);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDocument(null);
  };

  const downloadDocument = (document) => {
    const link = document.createElement('a');
    link.href = document.url;
    link.download = document.fileName || `${document.name}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getDocumentIcon = (type) => {
    if (type.toLowerCase().includes('identity') || type.toLowerCase().includes('pan')) {
      return <FaIdCard />;
    }
    return <FaFileAlt />;
  };

  if (loading) {
    return (
      <div className="documents-container">
        <div className="loading">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h1>
          <FaFileAlt className="page-icon" />
          My Documents
        </h1>
        <button className="upload-btn">
          <FaUpload /> Upload Document
        </button>
      </div>

      <div className="documents-grid">
        {documents.map(document => (
          <div key={document.id} className="document-card">
            <div className="document-header">
              <div className="document-icon">
                {getDocumentIcon(document.type)}
              </div>
              <div className={`document-status status-${document.status}`}>
                {document.status}
              </div>
            </div>

            <div className="document-content">
              <h3 className="document-name">{document.name}</h3>
              <p className="document-type">{document.type}</p>
              {document.fileName && (
                <p className="document-filename">{document.fileName}</p>
              )}
              {document.uploadedAt && (
                <p className="document-date">
                  Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="document-actions">
              <button 
                className="action-btn view-btn"
                onClick={() => openDocument(document)}
                title="View Document"
              >
                <FaEye />
              </button>
              <button 
                className="action-btn download-btn"
                onClick={() => downloadDocument(document)}
                title="Download Document"
              >
                <FaDownload />
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="empty-state">
          <FaFileAlt className="empty-icon" />
          <h3>No documents found</h3>
          <p>You haven't uploaded any documents yet.</p>
          <button className="upload-btn">
            <FaUpload /> Upload Your First Document
          </button>
        </div>
      )}

      {/* Document Modal */}
      {showModal && selectedDocument && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDocument.name}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <img 
                src={selectedDocument.url} 
                alt={selectedDocument.name}
                className="document-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="document-error" style={{display: 'none'}}>
                <p>Unable to display document. Please download to view.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn download-btn"
                onClick={() => downloadDocument(selectedDocument)}
              >
                <FaDownload /> Download
              </button>
              <button className="modal-btn close-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .documents-container {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .documents-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .documents-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #111827;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .page-icon {
          color: #3b82f6;
        }

        .upload-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .document-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          transition: all 0.2s ease;
        }

        .document-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .document-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .document-icon {
          width: 40px;
          height: 40px;
          background: #eff6ff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          font-size: 1.25rem;
        }

        .document-status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-verified {
          background: #f0fdf4;
          color: #16a34a;
        }

        .status-pending {
          background: #fef3c7;
          color: #d97706;
        }

        .status-rejected {
          background: #fef2f2;
          color: #dc2626;
        }

        .document-content {
          margin-bottom: 1.5rem;
        }

        .document-name {
          color: #111827;
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 0.5rem 0;
        }

        .document-type {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0 0 0.25rem 0;
        }

        .document-filename {
          color: #9ca3af;
          font-size: 0.75rem;
          margin: 0 0 0.25rem 0;
          font-style: italic;
        }

        .document-date {
          color: #6b7280;
          font-size: 0.75rem;
          margin: 0;
        }

        .document-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .view-btn {
          background: #3b82f6;
          color: white;
        }

        .download-btn {
          background: #10b981;
          color: white;
        }

        .action-btn:hover {
          transform: translateY(-1px);
        }

        .loading {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
          font-size: 1.125rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          margin: 0 0 1.5rem 0;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          color: #111827;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
        }

        .modal-close:hover {
          color: #374151;
        }

        .modal-body {
          padding: 1.5rem;
          text-align: center;
          max-height: 60vh;
          overflow-y: auto;
        }

        .document-image {
          max-width: 100%;
          max-height: 500px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .document-error {
          padding: 2rem;
          color: #6b7280;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          justify-content: flex-end;
        }

        .modal-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-btn.download-btn {
          background: #10b981;
          color: white;
        }

        .modal-btn.close-btn {
          background: #e5e7eb;
          color: #374151;
        }

        .modal-btn:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .documents-container {
            padding: 1rem;
          }

          .documents-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .documents-grid {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
            margin: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeDocuments;
