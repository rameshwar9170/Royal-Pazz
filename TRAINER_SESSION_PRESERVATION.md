     <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container - Mobile App Style */
        .join-training-container {
          font-family: 'Inter', sans-serif;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Page Header - Compact Mobile Style */
        .page-header {
          text-align: center;
          margin-bottom: 16px;
          padding: 20px 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .title-icon {
          color: #6366f1;
          font-size: 1.3rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        /* Form Mode Section - Mobile App Cards */
        .form-mode-section {
          margin-bottom: 16px;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background: rgba(255, 255, 255, 0.95);
          padding: 16px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .mode-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 14px 10px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          background: white;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 70px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .mode-option:hover:not(.disabled) {
          border-color: #6366f1;
          color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
        }

        .mode-option.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: #6366f1;
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        .mode-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #94a3b8;
        }

        .mode-icon {
          font-size: 1.1rem;
        }

        .mode-option span {
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.2;
        }

        /* Training Details Card - Mobile Optimized */
        .training-details-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #f1f5f9;
        }

        .training-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          text-align: center;
        }

        .detail-item:hover {
          background: #f1f5f9;
          border-color: #6366f1;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .detail-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.8rem;
          word-break: break-word;
        }

        .detail-item.fee-item {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #f59e0b;
        }

        .detail-item.fee-item .detail-value {
          color: #92400e;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-size: 0.9rem;
        }

        .detail-item.slots-item {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
        }

        .detail-item.slots-item .detail-value {
          color: #1e40af;
          font-weight: 700;
        }

        /* Payment Section Styles */
        .payment-section {
          margin-bottom: 16px;
          animation: slideInUp 0.4s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .payment-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 2px solid #f1f5f9;
        }

        .payment-card .card-title {
          color: #6366f1;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
        }

        .security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #f0fdf4;
          color: #166534;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 16px;
          border: 1px solid #bbf7d0;
        }

        .payment-details {
          background: rgba(248, 250, 252, 0.8);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #6366f1;
        }

        .payment-details p {
          margin: 6px 0;
          font-size: 0.8rem;
          color: #374151;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-details strong {
          color: #1e293b;
          font-weight: 600;
        }

        /* Payment Options Container */
        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        /* Online Payment Button */
        .payment-button {
          width: 100%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 14px 20px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .payment-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .payment-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.7;
        }

        /* Cash Payment Button */
        .cash-payment-button {
          width: 100%;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 14px 20px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
        }

        .cash-payment-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        .cash-payment-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.7;
        }

        /* Payment Divider */
        .payment-divider {
          position: relative;
          text-align: center;
          margin: 16px 0;
        }

        .payment-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e2e8f0;
        }

        .payment-divider span {
          background: rgba(255, 255, 255, 0.95);
          padding: 0 16px;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Cash Payment Info */
        .cash-payment-info {
          background: rgba(255, 251, 235, 0.8);
          border: 1px solid #fbbf24;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
          font-size: 0.8rem;
          color: #92400e;
          line-height: 1.4;
        }

        .back-button {
          width: 100%;
          background: transparent;
          color: #64748b;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .back-button:hover:not(:disabled) {
          background: rgba(248, 250, 252, 0.8);
          border-color: #cbd5e1;
          color: #374151;
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .payment-methods {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          opacity: 0.7;
        }

        .payment-method-icon {
          width: 40px;
          height: 24px;
          background: #f3f4f6;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: 700;
          border: 1px solid #e5e7eb;
        }

        /* Registration Form - Mobile App Style */
        .registration-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f1f5f9;
        }

        .section-icon {
          color: #6366f1;
          font-size: 1rem;
        }

        /* Mobile App Form Grid - Single Column on Mobile */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .label-icon {
          color: #6366f1;
          font-size: 0.8rem;
        }

        /* Mobile-First Input Design */
        .form-input {
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          font-family: inherit;
          font-size: 16px; /* Prevents zoom on iOS */
          transition: all 0.3s ease;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.9);
          -webkit-appearance: none; /* Remove iOS styling */
          -moz-appearance: none;
          appearance: none;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background: white;
          transform: translateY(-1px);
        }

        .form-input.readonly {
          background: rgba(248, 250, 252, 0.8);
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          background: #fef2f2;
        }

        .form-input.success {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        /* Date Input Specific Styling */
        .form-input[type="date"] {
          position: relative;
          color: #374151;
        }

        .form-input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          border-radius: 4px;
          margin-left: 8px;
          opacity: 0.6;
        }

        .form-input[type="date"]:hover::-webkit-calendar-picker-indicator {
          opacity: 1;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
          padding-left: 4px;
        }

        .success-message {
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
          padding-left: 4px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Submit Button - Mobile App Style */
        .submit-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 20px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .submit-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .submit-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Notification - Mobile App Style */
        .notification {
          padding: 14px 18px;
          margin-top: 16px;
          border-radius: 16px;
          font-weight: 600;
          text-align: center;
          animation: slideIn 0.3s ease-out;
          font-size: 0.9rem;
        }

        .notification.success {
          background: rgba(240, 253, 244, 0.95);
          color: #15803d;
          border: 2px solid #22c55e;
          backdrop-filter: blur(10px);
        }

        .notification.error {
          background: rgba(254, 242, 242, 0.95);
          color: #dc2626;
          border: 2px solid #ef4444;
          backdrop-filter: blur(10px);
        }

        .notification.info {
          background: rgba(240, 249, 255, 0.95);
          color: #0369a1;
          border: 2px solid #0ea5e9;
          backdrop-filter: blur(10px);
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

        /* Mobile Specific Optimizations */
        @media (max-width: 320px) {
          .join-training-container {
            padding: 10px;
          }
          
          .training-details-card,
          .form-section,
          .payment-card {
            padding: 14px;
          }
          
          .training-details-grid {
            gap: 6px;
          }
          
          .detail-item {
            padding: 8px;
          }
          
          .detail-label {
            font-size: 0.65rem;
          }
          
          .detail-value {
            font-size: 0.75rem;
          }
          
          .form-input {
            padding: 12px 14px;
          }
        }

        /* Small Mobile Optimizations */
        @media (max-width: 480px) {
          .page-title {
            font-size: 1.4rem;
          }
          
          .mode-option span {
            font-size: 0.75rem;
          }
          
          .form-grid {
            gap: 14px;
          }
        }

        /* Tablet Styles */
        @media (min-width: 768px) {
          .join-training-container {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }

          .training-details-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .payment-methods {
            gap: 12px;
          }

          .payment-method-icon {
            width: 45px;
            height: 26px;
            font-size: 0.75rem;
          }
        }

        /* Desktop Styles */
        @media (min-width: 1024px) {
          .join-training-container {
            padding: 24px;
            max-width: 1000px;
          }
          
          .mode-selector {
            max-width: 600px;
            margin: 0 auto;
            gap: 16px;
          }
          
          .mode-option {
            padding: 20px 16px;
            min-height: 85px;
          }
          
          .mode-option span {
            font-size: 0.9rem;
          }

          .form-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .payment-card {
            max-width: 600px;
            margin: 0 auto;
          }
        }
      `}</style>