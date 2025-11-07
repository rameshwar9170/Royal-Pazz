import React, { useState } from 'react';
import jsPDF from 'jspdf';

const OrderProduct = ({
  product = { name: 'Sample Product', description: 'Sample description', price: 0 }
}) => {
  const [orderFormVisible, setOrderFormVisible] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    customerName: '',
    phone: '',
    address: ''
  });
  const [bill, setBill] = useState(null);
  const [confirmationMsg, setConfirmationMsg] = useState('');

  const handleOrderClick = () => {
    setOrderFormVisible(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrderDetails((prev) => ({ ...prev, [name]: value }));
  };

  const generatePdfBill = (billData) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(22, 160, 133);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("Billing Invoice", 105, 20, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Order Date: ${billData.orderDate}`, 14, 40);

    doc.line(14, 45, 196, 45);

    let yPos = 55;
    doc.text(`Product Name: ${billData.productName}`, 14, yPos);
    yPos += 10;
    if(billData.description) {
      doc.text(`Description: ${billData.description}`, 14, yPos);
      yPos += 10;
    }
    doc.text(`Price: ₹${billData.price}`, 14, yPos);
    yPos += 10;
    doc.text(`Customer Name: ${billData.customerName}`, 14, yPos);
    yPos += 10;
    doc.text(`Phone: ${billData.phone}`, 14, yPos);
    yPos += 10;
    doc.text(`Address: ${billData.address}`, 14, yPos);

    yPos += 15;
    doc.line(14, yPos, 196, yPos);
    yPos += 10;
    doc.setFontSize(14);
    doc.text("Thank you for your order!", 105, yPos, { align: 'center' });

    doc.save('bill.pdf');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const generatedBill = {
      productName: product.name,
      description: product.description,
      price: product.price,
      customerName: orderDetails.customerName,
      phone: orderDetails.phone,
      address: orderDetails.address,
      orderDate: new Date().toLocaleString()
    };
    setBill(generatedBill);
    setOrderPlaced(true);
    setOrderFormVisible(false);
    setConfirmationMsg("Your order is confirmed. Generating your bill...");
    setTimeout(() => {
      generatePdfBill(generatedBill);
      setConfirmationMsg('');
    }, 1000);
  };

  return (
    <div className="order-product-container">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">
        
          Order Product
        </h2>
        <p className="page-subtitle">Complete your purchase and get instant billing</p>
      </div>

      {/* Product Card */}
      <div className="product-card">
        <div className="product-header">
          <h3 className="product-name">{product.name}</h3>
          <div className="product-price">₹{product.price?.toLocaleString()}</div>
        </div>
        
        <div className="product-content">
          <p className="product-description">{product.description}</p>
          
          {!orderFormVisible && !orderPlaced && (
            <button className="order-button" onClick={handleOrderClick}>
              <span className="button-icon">🛍️</span>
              Order Now
            </button>
          )}
        </div>
      </div>

      {/* Order Form */}
      {orderFormVisible && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="order-form">
            <h3 className="form-title">Customer Details</h3>
            
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">👤</span>
                Customer Name
              </label>
              <input 
                type="text" 
                name="customerName" 
                value={orderDetails.customerName} 
                onChange={handleChange} 
                required 
                className="form-input"
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">📞</span>
                Phone Number
              </label>
              <input 
                type="tel" 
                name="phone" 
                value={orderDetails.phone} 
                onChange={handleChange} 
                required 
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">📍</span>
                Delivery Address
              </label>
              <textarea 
                name="address" 
                value={orderDetails.address} 
                onChange={handleChange} 
                required 
                className="form-textarea"
                placeholder="Enter your complete delivery address"
                rows="3"
              />
            </div>

            <button type="submit" className="submit-button">
              <span className="button-icon">🧾</span>
              Place Order & Generate Bill
            </button>
          </form>
        </div>
      )}

      {/* Confirmation Message */}
      {confirmationMsg && (
        <div className="confirmation-message">
          <div className="message-content">
            <span className="message-icon">✅</span>
            {confirmationMsg}
          </div>
        </div>
      )}

      {/* Bill Summary */}
      {orderPlaced && bill && (
        <div className="bill-summary">
          <div className="bill-header">
            <h3 className="bill-title">
              
              Order Summary
            </h3>
            <div className="bill-status">Completed</div>
          </div>
          
          <div className="bill-content">
            <div className="bill-section">
              <h4 className="section-title">Product Details</h4>
              <div className="detail-row">
                <span className="detail-label">Product:</span>
                <span className="detail-value">{bill.productName}</span>
              </div>
              {bill.description && (
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{bill.description}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Price:</span>
                <span className="detail-value price-highlight">₹{bill.price?.toLocaleString()}</span>
              </div>
            </div>

            <div className="bill-section">
              <h4 className="section-title">Customer Information</h4>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{bill.customerName}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{bill.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address:</span>
                <span className="detail-value">{bill.address}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Order Date:</span>
                <span className="detail-value">{bill.orderDate}</span>
              </div>
            </div>

            <div className="bill-footer">
              <p className="download-message">
                📄 Your bill has been downloaded as a PDF file.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container */
        .order-product-container {
          font-family: 'Inter', sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 16px;
          background: #f8fafc;
          min-height: 100vh;
        }

        /* Page Header */
        .page-header {
          text-align: center;
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%);;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fcfdffff;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .page-subtitle {
          color: #c0c6cfff;
          font-size: 1rem;
          margin: 0;
        } 

        /* Product Card */
        .product-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .product-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          gap: 16px;
        }

        .product-name {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          flex: 1;
        }

        .product-price {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          font-size: 1.25rem;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 12px;
          white-space: nowrap;
        }

        .product-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-description {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.5;
          margin: 0;
        }

        /* Buttons */
        .order-button,
        .submit-button {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          width: 100%;
        }

        .order-button:hover,
        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }

        .button-icon {
          font-size: 1.1rem;
        }

        /* Form Container */
        .form-container {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }

        .order-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
          text-align: center;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .label-icon {
          font-size: 0.9rem;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        /* Confirmation Message */
        .confirmation-message {
          margin-bottom: 24px;
          animation: slideIn 0.3s ease-out;
        }

        .message-content {
          background: #dcfce7;
          border: 2px solid #16a34a;
          color: #166534;
          padding: 16px 20px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .message-icon {
          font-size: 1.2rem;
        }

        /* Bill Summary */
        .bill-summary {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          animation: slideIn 0.4s ease-out;
        }

        .bill-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .bill-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bill-status {
          background: #dcfce7;
          color: #166534;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .bill-content {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .bill-section {
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 16px;
        }

        .detail-row:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.875rem;
          text-align: right;
          word-break: break-word;
        }

        .price-highlight {
          color: #10b981 !important;
          font-size: 1rem !important;
          font-weight: 700 !important;
        }

        .bill-footer {
          text-align: center;
          padding: 16px;
          background: #f1f5f9;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .download-message {
          color: #475569;
          font-size: 0.875rem;
          font-weight: 500;
          margin: 0;
        }

        /* Animations */
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

        /* Mobile Styles (480px and below) */
        @media (max-width: 480px) {
          .order-product-container {
            padding: 12px;
          }

          .page-header,
          .product-card,
          .form-container,
          .bill-summary {
            padding: 16px;
            margin-bottom: 16px;
          }

          .page-title {
            font-size: 1.5rem;
            flex-direction: column;
            gap: 8px;
          }

          .product-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .product-name {
            font-size: 1.25rem;
          }

          .product-price {
            font-size: 1.1rem;
            align-self: flex-start;
          }

          .form-input,
          .form-textarea {
            font-size: 16px; /* Prevents zoom on iOS */
          }

          .bill-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .detail-row {
            flex-direction: column;
            gap: 4px;
          }

          .detail-value {
            text-align: left;
          }
        }

        /* Tablet Styles (481px - 768px) */
        @media (min-width: 481px) and (max-width: 768px) {
          .order-product-container {
            padding: 20px;
          }

          .order-button,
          .submit-button {
            max-width: 300px;
            margin: 0 auto;
          }
        }

        /* Desktop Styles (769px and above) */
        @media (min-width: 769px) {
          .order-product-container {
            padding: 32px;
          }

          .bill-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }

          .bill-footer {
            grid-column: 1 / -1;
          }

          .order-button,
          .submit-button {
            max-width: 400px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderProduct;
