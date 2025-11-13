import React, { useState, useEffect } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { db } from '../../firebase/config';
import { FiCheck, FiX, FiEye, FiDownload, FiClock, FiDollarSign, FiUser, FiPhone, FiPackage, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import './ChequeApproval.css';

const ChequeApproval = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState('');

  // Fetch orders with cheque payments
  useEffect(() => {
    const ordersRef = ref(db, 'HTAMS/orders');
    
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chequeOrders = Object.entries(data)
          .map(([orderId, order]) => ({
            orderId,
            ...order
          }))
          .filter(order => order.paymentDetails?.payment_method === 'Cheque')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setPendingOrders(chequeOrders);
      } else {
        setPendingOrders([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter orders based on status and search query
  const filteredOrders = pendingOrders.filter(order => {
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'pending' && order.paymentDetails?.payment_status === 'awaiting_verification') ||
      (filterStatus === 'approved' && order.paymentDetails?.payment_status === 'verified') ||
      (filterStatus === 'rejected' && order.paymentDetails?.payment_status === 'rejected');
    
    const searchMatch = !searchQuery || 
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone?.includes(searchQuery) ||
      order.orderId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  // Statistics
  const stats = {
    pending: pendingOrders.filter(o => o.paymentDetails?.payment_status === 'awaiting_verification').length,
    approved: pendingOrders.filter(o => o.paymentDetails?.payment_status === 'verified').length,
    rejected: pendingOrders.filter(o => o.paymentDetails?.payment_status === 'rejected').length,
    totalAmount: pendingOrders
      .filter(o => o.paymentDetails?.payment_status === 'awaiting_verification')
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
  };

  // Distribute commission for approved cheque payment
  const distributeCommission = async (order) => {
    try {
      console.log('=== STARTING COMMISSION DISTRIBUTION FOR CHEQUE PAYMENT ===');
      console.log('Full Order Object:', order);
      
      // Get seller ID from various possible fields
      const sellerId = order.placedBy || order.sellerId || order.userId || order.createdBy;
      
      if (!sellerId) {
        console.error('No seller ID found in order:', order);
        throw new Error('Unable to find seller ID in order data');
      }

      const items = order.items || [];
      
      if (!items || items.length === 0) {
        console.error('No items found in order:', order);
        throw new Error('No items found in order');
      }

      console.log('Processing items:', items);
      const commissionResults = [];

      for (const item of items) {
        // Declare variables outside try block for catch block access
        let productId = 'unknown';
        let productName = 'Unknown Product';
        
        try {
          // Get product details from various possible fields
          productId = item.id || item.productId || item.product_id || 'unknown';
          productName = item.name || item.productName || item.product_name || 'Unknown Product';
          const itemPrice = item.mrp || item.price || item.unitPrice || 0;
          const itemQuantity = item.quantity || 1;
          
          console.log('Processing item:', {
            productId,
            productName,
            itemPrice,
            itemQuantity,
            rawItem: item
          });

          if (!productId || productId === 'unknown') {
            console.error('Item missing product ID:', item);
            throw new Error('Product ID not found in item');
          }

          if (!itemPrice || itemPrice <= 0) {
            console.error('Invalid item price:', item);
            throw new Error('Invalid product price');
          }

          const apiPayload = {
            sellerId: sellerId,
            amount: itemPrice * itemQuantity,
            product: {
              id: productId,
              name: productName,
            },
            orderId: `${order.orderId}_${productId}`,
            idempotencyKey: `cheque_${order.orderId}_${productId}_${Date.now()}`,
          };

          console.log('Commission API Payload:', apiPayload);

          const response = await fetch('https://processsale-udqmpp6qhq-uc.a.run.app', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiPayload),
          });

          const responseText = await response.text();
          console.log('Commission API Response:', responseText);

          if (response.ok) {
            const result = JSON.parse(responseText);
            commissionResults.push({ 
              productId: productId, 
              productName: productName,
              result: { ok: true, ...result } 
            });
          } else {
            throw new Error(`API call failed: ${response.status} - ${responseText}`);
          }
        } catch (error) {
          console.error(`Commission failed for ${productName}:`, error);
          commissionResults.push({ 
            productId: productId, 
            productName: productName,
            result: { ok: false, error: error.message } 
          });
        }
      }

      const allDistributed = commissionResults.length > 0 && commissionResults.every(r => r.result?.ok);
      const partialDistributed = commissionResults.some(r => r.result?.ok);

      const distributionStatus = allDistributed
        ? 'distributed'
        : partialDistributed
          ? 'partially_distributed'
          : 'failed';

      console.log('Commission Distribution Results:', {
        total: commissionResults.length,
        successful: commissionResults.filter(r => r.result?.ok).length,
        failed: commissionResults.filter(r => !r.result?.ok).length,
        status: distributionStatus
      });

      return {
        success: allDistributed,
        distributionStatus,
        results: commissionResults,
        distributed: commissionResults.filter(r => r.result?.ok).length,
        totalItems: commissionResults.length,
      };
    } catch (error) {
      console.error('Commission distribution error:', error);
      return {
        success: false,
        distributionStatus: 'failed',
        error: error.message
      };
    }
  };

  // Approve cheque payment
  const handleApprove = async (order) => {
    if (!window.confirm(`Approve cheque payment for ${order.customerName}?\nAmount: ₹${order.totalAmount}\n\nThis will distribute commission to the seller.`)) {
      return;
    }

    setProcessing(true);
    try {
      console.log('=== APPROVING CHEQUE PAYMENT ===', order.orderId);

      // Distribute commission first
      const commissionResult = await distributeCommission(order);
      
      if (!commissionResult.success) {
        const proceed = window.confirm(
          `Warning: Commission distribution ${commissionResult.distributionStatus === 'partially_distributed' ? 'partially failed' : 'failed'}.\n\n` +
          `Successful: ${commissionResult.distributed || 0} of ${commissionResult.totalItems || 0} items\n\n` +
          `Do you still want to approve the payment?`
        );
        
        if (!proceed) {
          setProcessing(false);
          return;
        }
      }

      // Sanitize commission results to remove any undefined values
      const sanitizeResults = (results) => {
        return results.map(result => ({
          productId: result.productId || 'unknown',
          productName: result.productName || 'Unknown Product',
          result: {
            ok: result.result?.ok || false,
            error: result.result?.error || null
          }
        }));
      };

      // Update order status
      const orderRef = ref(db, `HTAMS/orders/${order.orderId}`);
      const updateData = {
        'paymentDetails/payment_status': 'verified',
        'paymentDetails/verifiedAt': new Date().toISOString(),
        'paymentDetails/verifiedBy': 'admin',
        status: 'Confirmed',
        commissionStatus: commissionResult.distributionStatus || 'failed',
        commissionSummary: {
          distributed: commissionResult.distributed || 0,
          totalItems: commissionResult.totalItems || 0,
          lastUpdated: new Date().toISOString(),
          results: sanitizeResults(commissionResult.results || []),
          distributionStatus: commissionResult.distributionStatus || 'failed',
        },
        updatedAt: new Date().toISOString(),
      };

      console.log('Updating order with data:', updateData);
      await update(orderRef, updateData);

      alert(
        `✅ Cheque payment approved successfully!\n\n` +
        `Order: ${order.orderId}\n` +
        `Commission: ${commissionResult.distributed || 0}/${commissionResult.totalItems || 0} items distributed\n` +
        `Status: ${commissionResult.distributionStatus}`
      );
      
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error approving cheque:', error);
      alert('Failed to approve cheque payment: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Reject cheque payment
  const handleReject = async (order) => {
    const reason = window.prompt(`Reject cheque payment for ${order.customerName}?\n\nPlease provide a reason:`);
    
    if (!reason) return;

    setProcessing(true);
    try {
      const orderRef = ref(db, `HTAMS/orders/${order.orderId}`);
      await update(orderRef, {
        'paymentDetails/payment_status': 'rejected',
        'paymentDetails/rejectedAt': new Date().toISOString(),
        'paymentDetails/rejectedBy': 'admin',
        'paymentDetails/rejectionReason': reason,
        status: 'Cancelled',
        commissionStatus: 'cancelled',
        updatedAt: new Date().toISOString(),
      });

      alert(`❌ Cheque payment rejected.\n\nReason: ${reason}`);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error rejecting cheque:', error);
      alert('Failed to reject cheque payment: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // View cheque image in modal
  const viewChequeImage = (imageUrl) => {
    setModalImage(imageUrl);
    setShowImageModal(true);
  };

  // Download cheque image
  const downloadCheque = (imageUrl, orderId) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `cheque_${orderId}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      'awaiting_verification': { label: 'Pending', icon: FiClock, color: 'warning' },
      'verified': { label: 'Approved', icon: FiCheck, color: 'success' },
      'rejected': { label: 'Rejected', icon: FiX, color: 'danger' },
    };

    const config = statusConfig[status] || statusConfig['awaiting_verification'];
    const Icon = config.icon;

    return (
      <span className={`status-badge status-${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="cheque-approval-container">
        <div className="loading-spinner">
          <FiClock size={48} className="spinning" />
          <p>Loading cheque payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cheque-approval-container">
      {/* Header */}
      <div className="cheque-header">
        <div className="header-content">
          <h1>Cheque Payment Approval</h1>
          <p>Verify and approve uploaded cheque payments to distribute commissions</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card pending" onClick={() => setFilterStatus('pending')}>
          <div className="stat-content">
            <h3>{stats.pending}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="stat-card approved" onClick={() => setFilterStatus('approved')}>
          <div className="stat-content">
            <h3>{stats.approved}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div className="stat-card rejected" onClick={() => setFilterStatus('rejected')}>
          <div className="stat-content">
            <h3>{stats.rejected}</h3>
            <p>Rejected</p>
          </div>
        </div>
        <div className="stat-card amount">
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalAmount)}</h3>
            <p>Pending Amount</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Orders
          </button>
          <button
            className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'approved' ? 'active' : ''}`}
            onClick={() => setFilterStatus('approved')}
          >
            Approved ({stats.approved})
          </button>
          <button
            className={`filter-tab ${filterStatus === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected ({stats.rejected})
          </button>
        </div>

        <div className="search-box">
          <FiUser size={18} />
          <input
            type="text"
            placeholder="Search by customer name, phone, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-section">
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <FiAlertCircle size={64} />
            <h3>No cheque payments found</h3>
            <p>
              {filterStatus === 'pending'
                ? 'No pending cheque payments awaiting verification'
                : `No ${filterStatus} cheque payments`}
            </p>
          </div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map((order) => (
              <div key={order.orderId} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>{order.customerName}</h3>
                    <span className="order-id">#{order.orderId?.slice(-8)}</span>
                  </div>
                  {getStatusBadge(order.paymentDetails?.payment_status)}
                </div>

                <div className="order-details">
                  <div className="detail-row-group">
                    <div className="detail-row">
                      <FiPhone size={14} />
                      <span>{order.customerPhone}</span>
                    </div>
                    <div className="detail-row">
                      <FiDollarSign size={14} />
                      <span className="amount">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                  <div className="detail-row-group">
                    <div className="detail-row">
                      <FiPackage size={14} />
                      <span>{order.items?.length || 0} item(s)</span>
                    </div>
                    <div className="detail-row">
                      <FiCalendar size={14} />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                {order.items && order.items.length > 0 && (
                  <div className="product-info">
                    <div className="product-info-header">Products:</div>
                    <div className="product-list">
                      {order.items.map((item, idx) => {
                        const itemPrice = item.mrp || item.price || item.unitPrice || item.itemPrice || 0;
                        const itemQuantity = item.quantity || 1;
                        return (
                          <div key={idx} className="product-item">
                            <span className="product-name">{item.name || item.productName || 'Product'}</span>
                            <span className="product-details">
                              Qty: {itemQuantity} × ₹{itemPrice.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="utr-display">
                  <div className="utr-display-header">
                    <span className="utr-label">UTR Number</span>
                    <span className="utr-value">
                      {order.paymentDetails?.utrNumber ? order.paymentDetails.utrNumber : 'Not provided'}
                    </span>
                  </div>
                  {order.paymentDetails?.utrUpdatedAt && (
                    <span className="utr-meta">Updated on {formatDate(order.paymentDetails.utrUpdatedAt)}</span>
                  )}
                </div>

                {order.chequeDetails?.imageUrl && (
                  <div className="cheque-preview">
                    <img
                      src={order.chequeDetails.imageUrl}
                      alt="Cheque"
                      onClick={() => viewChequeImage(order.chequeDetails.imageUrl)}
                    />
                    <button
                      className="view-btn"
                      onClick={() => viewChequeImage(order.chequeDetails.imageUrl)}
                    >
                      <FiEye size={16} />
                      View Full
                    </button>
                  </div>
                )}

                {order.paymentDetails?.payment_status === 'awaiting_verification' && (
                  <div className="order-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(order)}
                      disabled={processing}
                    >
                      <FiCheck size={18} />
                      Approve & Distribute
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReject(order)}
                      disabled={processing}
                    >
                      <FiX size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {order.paymentDetails?.payment_status === 'verified' && order.commissionSummary && (
                  <div className="commission-info">
                    <FiCheck className="commission-icon" />
                    <span>
                      Commission: {order.commissionSummary.distributed}/{order.commissionSummary.totalItems} items
                    </span>
                  </div>
                )}

                {order.paymentDetails?.payment_status === 'rejected' && order.paymentDetails?.rejectionReason && (
                  <div className="rejection-reason">
                    <FiAlertCircle className="rejection-icon" />
                    <span>{order.paymentDetails.rejectionReason}</span>
                  </div>
                )}

                {order.chequeDetails?.imageUrl && (
                  <button
                    className="download-btn"
                    onClick={() => downloadCheque(order.chequeDetails.imageUrl, order.orderId)}
                  >
                    <FiDownload size={14} />
                    Download Cheque
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="image-modal" onClick={() => setShowImageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal" onClick={() => setShowImageModal(false)}>
              <FiX size={24} />
            </button>
            <img src={modalImage} alt="Cheque Full View" />
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {processing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <FiClock size={48} className="spinning" />
            <h3>Processing...</h3>
            <p>Please wait while we process the payment and distribute commission</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChequeApproval;
