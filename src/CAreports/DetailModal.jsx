// components/DetailModal.jsx - Modal component for viewing detailed information
import React from 'react';
import { formatCurrency } from '../utils/formatters';
import './DetailModal.css';

const DetailModal = ({ isOpen, selectedItem, onClose }) => {
  if (!isOpen || !selectedItem) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {selectedItem.type === 'order' && 'Order Details'}
            {selectedItem.type === 'training' && 'Training Details'}
            {selectedItem.type === 'payout' && 'Payout Details'}
            {selectedItem.type === 'transaction' && 'Transaction Details'}
            {selectedItem.type === 'user' && 'User Details'}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <DetailModalContent item={selectedItem} formatCurrency={formatCurrency} />
        </div>
      </div>
    </div>
  );
};

// Detail Modal Content Component
const DetailModalContent = ({ item, formatCurrency }) => {
  if (!item) return null;

  switch (item.type) {
    case 'order':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Order Information</h3>
            <div className="detail-row">
              <label>Order Number:</label>
              <span>#{item.orderNumber}</span>
            </div>
            <div className="detail-row">
              <label>Order Date:</label>
              <span>{new Date(item.orderDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="detail-row">
              <label>Payment Method:</label>
              <span>{item.paymentMethod}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Customer Information</h3>
            <div className="detail-row">
              <label>Customer Name:</label>
              <span>{item.customerName}</span>
            </div>
            <div className="detail-row">
              <label>Customer Email:</label>
              <span>{item.customerEmail}</span>
            </div>
            <div className="detail-row">
              <label>Customer Phone:</label>
              <span>{item.customerPhone}</span>
            </div>
            <div className="detail-row">
              <label>Customer ID:</label>
              <span>{item.customerId}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Delivery Information</h3>
            <div className="detail-row">
              <label>Delivery Address:</label>
              <span>{item.deliveryAddress || 'Not provided'}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Order Summary</h3>
            <div className="detail-row">
              <label>Items Count:</label>
              <span>{item.itemsCount} items</span>
            </div>
            <div className="detail-row">
              <label>Total Amount:</label>
              <span className="amount">{formatCurrency(item.totalAmount)}</span>
            </div>
            <div className="detail-row">
              <label>GST Amount:</label>
              <span className="gst-amount">{formatCurrency(item.gstAmount)}</span>
            </div>
            <div className="detail-row">
              <label>Net Amount:</label>
              <span className="total-amount">{formatCurrency(item.netAmount)}</span>
            </div>
          </div>

          {item.items && Object.keys(item.items).length > 0 && (
            <div className="detail-section full-width">
              <h3>Order Items</h3>
              <div className="items-list">
                {Object.entries(item.items).map(([itemId, itemData]) => (
                  <div key={itemId} className="item-card">
                    <div className="item-details">
                      <strong>{itemData.name || 'Unknown Item'}</strong>
                      <p>Quantity: {itemData.quantity || 1}</p>
                      <p>Price: {formatCurrency(itemData.price || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'training':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Training Information</h3>
            <div className="detail-row">
              <label>Training Title:</label>
              <span>{item.trainingTitle}</span>
            </div>
            <div className="detail-row">
              <label>Category:</label>
              <span>{item.category}</span>
            </div>
            <div className="detail-row">
              <label>Training Date:</label>
              <span>{new Date(item.trainingDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Duration:</label>
              <span>{item.trainingDuration} hours</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
            </div>
            <div className="detail-row">
              <label>Venue:</label>
              <span>{item.venue}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Trainer Information</h3>
            <div className="detail-row">
              <label>Trainer Name:</label>
              <span>{item.trainerName}</span>
            </div>
            <div className="detail-row">
              <label>Trainer Email:</label>
              <span>{item.trainerEmail}</span>
            </div>
            <div className="detail-row">
              <label>Trainer ID:</label>
              <span>{item.trainerId}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Cost Breakdown</h3>
            <div className="detail-row">
              <label>Training Cost:</label>
              <span className="amount">{formatCurrency(item.trainingCost)}</span>
            </div>
            <div className="detail-row">
              <label>Trainer Fee:</label>
              <span className="amount">{formatCurrency(item.trainerFee)}</span>
            </div>
            <div className="detail-row">
              <label>Materials Cost:</label>
              <span className="amount">{formatCurrency(item.materialsCost)}</span>
            </div>
            <div className="detail-row">
              <label>Venue Cost:</label>
              <span className="amount">{formatCurrency(item.venueCost)}</span>
            </div>
            <div className="detail-row total-row">
              <label>Total Cost:</label>
              <span className="total-amount">{formatCurrency(item.totalCost)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Participants</h3>
            <div className="detail-row">
              <label>Participants Count:</label>
              <span>{item.participantsCount}</span>
            </div>
          </div>
        </div>
      );

    case 'payout':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Sale Information</h3>
            <div className="detail-row">
              <label>Sale ID:</label>
              <span>{item.saleId}</span>
            </div>
            <div className="detail-row">
              <label>Sale Date:</label>
              <span>{new Date(item.saleDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Order Number:</label>
              <span>#{item.orderNumber}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-row">
              <label>User Name:</label>
              <span>{item.userName}</span>
            </div>
            <div className="detail-row">
              <label>User Email:</label>
              <span>{item.userEmail}</span>
            </div>
            <div className="detail-row">
              <label>User ID:</label>
              <span>{item.userId}</span>
            </div>
            <div className="detail-row">
              <label>Role:</label>
              <span className={`role-badge ${item.userRole?.toLowerCase().replace(' ', '-')}`}>{item.userRole}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Commission Details</h3>
            <div className="detail-row">
              <label>Commission Rate:</label>
              <span>{item.commissionRate}%</span>
            </div>
            <div className="detail-row">
              <label>Sale Amount:</label>
              <span className="amount">{formatCurrency(item.saleAmount)}</span>
            </div>
            <div className="detail-row">
              <label>Commission Amount:</label>
              <span className="total-amount">{formatCurrency(item.commissionAmount)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Product & Customer</h3>
            <div className="detail-row">
              <label>Product Name:</label>
              <span>{item.productName}</span>
            </div>
            <div className="detail-row">
              <label>Customer Name:</label>
              <span>{item.customerName}</span>
            </div>
          </div>
        </div>
      );

    case 'transaction':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>Transaction Information</h3>
            <div className="detail-row">
              <label>Transaction ID:</label>
              <span>#{item.id}</span>
            </div>
            <div className="detail-row">
              <label>Date:</label>
              <span>{new Date(item.timestamp).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-row">
              <label>Type:</label>
              <span className={`type-badge ${item.type}`}>{item.type?.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.status?.toLowerCase()}`}>{item.status?.toUpperCase()}</span>
            </div>
            <div className="detail-row">
              <label>Amount:</label>
              <span className="total-amount">{formatCurrency(item.amount)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-row">
              <label>User Name:</label>
              <span>{item.userName}</span>
            </div>
            <div className="detail-row">
              <label>User Email:</label>
              <span>{item.userEmail}</span>
            </div>
            <div className="detail-row">
              <label>User ID:</label>
              <span>{item.userId}</span>
            </div>
          </div>

          {item.bankDetails && (
            <div className="detail-section">
              <h3>Bank Details</h3>
              <div className="detail-row">
                <label>Account Holder:</label>
                <span>{item.bankDetails.accountHolderName}</span>
              </div>
              <div className="detail-row">
                <label>Bank Name:</label>
                <span>{item.bankDetails.bankName}</span>
              </div>
              <div className="detail-row">
                <label>Account Number:</label>
                <span>****{item.bankDetails.accountNumber?.slice(-4)}</span>
              </div>
              <div className="detail-row">
                <label>IFSC Code:</label>
                <span>{item.bankDetails.ifscCode || 'Not provided'}</span>
              </div>
            </div>
          )}
        </div>
      );

    case 'user':
      return (
        <div className="detail-grid">
          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-row">
              <label>User Name:</label>
              <span>{item.name}</span>
            </div>
            <div className="detail-row">
              <label>Email:</label>
              <span>{item.email}</span>
            </div>
            <div className="detail-row">
              <label>User ID:</label>
              <span>{item.userId}</span>
            </div>
            <div className="detail-row">
              <label>Role:</label>
              <span className={`role-badge ${item.role?.toLowerCase().replace(' ', '-')}`}>{item.role}</span>
            </div>
            <div className="detail-row">
              <label>Current Level:</label>
              <span>{item.currentLevel}</span>
            </div>
            <div className="detail-row">
              <label>Status:</label>
              <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                {item.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Analytics</h3>
            <div className="detail-row">
              <label>Total Earnings:</label>
              <span className="amount">{formatCurrency(item.totalEarnings)}</span>
            </div>
            <div className="detail-row">
              <label>Total Received:</label>
              <span className="amount">{formatCurrency(item.totalReceived)}</span>
            </div>
            <div className="detail-row">
              <label>Total Orders:</label>
              <span>{item.totalOrders}</span>
            </div>
            <div className="detail-row">
              <label>Total Sales:</label>
              <span className="amount">{formatCurrency(item.totalSales)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Dates</h3>
            <div className="detail-row">
              <label>Joined Date:</label>
              <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : 'Unknown'}</span>
            </div>
            <div className="detail-row">
              <label>Last Login:</label>
              <span>{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</span>
            </div>
          </div>
        </div>
      );

    default:
      return <div>No details available</div>;
  }
};

export default DetailModal;
