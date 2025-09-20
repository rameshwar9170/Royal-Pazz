import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase/config'; // Adjust path as needed
import { ref, onValue, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

const PAGE_SIZE = 12;

const EmployeeDashboard = () => {
    const [assignedOrders, setAssignedOrders] = useState([]);
    const [employeeData, setEmployeeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(null);
    const fileInputRef = useRef(null);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('orderDate');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [newTasksNotification, setNewTasksNotification] = useState(null);

    useEffect(() => {
        try {
            const storedData = localStorage.getItem('employeeData');
            if (storedData) {
                setEmployeeData(JSON.parse(storedData));
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Failed to parse employee data:", error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!employeeData?.mobile) {
            setLoading(false);
            return;
        }

        const ordersRef = ref(db, 'HTAMS/orders');
        const technicianId = employeeData.mobile;

        const unsubscribe = onValue(ordersRef, (snapshot) => {
            const allOrders = snapshot.val() || {};
            const currentOrders = Object.entries(allOrders)
                .filter(([, order]) => order.assignedTechnicianId === technicianId)
                .map(([id, order]) => ({ id, ...order }));

            setAssignedOrders(currentOrders);

            const unacceptedTasks = currentOrders.filter(order => order.status === 'confirmed');
            if (unacceptedTasks.length > 0) {
                setNewTasksNotification(`You have ${unacceptedTasks.length} new task${unacceptedTasks.length > 1 ? 's' : ''} to accept.`);
            } else {
                setNewTasksNotification(null);
            }

            if (loading) {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [employeeData]);

    // Enhanced sorting logic
    const sortedAndFilteredOrders = [...assignedOrders]
        .filter(order => order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const statusOrder = { 'confirmed': 1, 'accepted': 2, 'verified': 3 };
            const statusA = statusOrder[a.status] || 4;
            const statusB = statusOrder[b.status] || 4;

            if (statusA !== statusB) {
                return statusA - statusB;
            }

            if (sortField === 'orderDate') {
                return sortDirection === 'asc' ? new Date(a.orderDate) - new Date(b.orderDate) : new Date(b.orderDate) - new Date(a.orderDate);
            }
            if (sortField === 'location') {
                const locA = a.customerAddress?.city?.toLowerCase() || '';
                const locB = b.customerAddress?.city?.toLowerCase() || '';
                if (locA < locB) return sortDirection === 'asc' ? -1 : 1;
                if (locA > locB) return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });

    const totalPages = Math.ceil(sortedAndFilteredOrders.length / PAGE_SIZE);
    const paginatedOrders = sortedAndFilteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const summaryData = {
        total: assignedOrders.length,
        completed: assignedOrders.filter(o => o.status === 'verified').length,
        newTasks: assignedOrders.filter(o => o.status === 'confirmed').length,
        accepted: assignedOrders.filter(o => o.status === 'accepted').length,
    };

    const handleAcceptOrder = (orderId) => {
        update(ref(db, `HTAMS/orders/${orderId}`), { status: 'accepted' });
    };

    const handleVerifyClick = (orderId) => {
        setSelectedOrderId(orderId);
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file || !selectedOrderId) return;
        setUploading(selectedOrderId);
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 });
            const imageRef = storageRef(storage, `verificationImages/${selectedOrderId}/${Date.now()}_${compressedFile.name}`);
            const uploadResult = await uploadBytes(imageRef, compressedFile);
            const downloadURL = await getDownloadURL(uploadResult.ref);
            navigator.geolocation.getCurrentPosition(
                (pos) => updateOrderWithVerification(selectedOrderId, downloadURL, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => updateOrderWithVerification(selectedOrderId, downloadURL, null),
                { enableHighAccuracy: true }
            );
        } catch (error) {
            console.error("Verification process error:", error);
            setUploading(null);
        }
    };

    const updateOrderWithVerification = (orderId, imageUrl, location) => {
        const updates = {
            status: 'verified',
            verificationImageUrl: imageUrl,
            verifiedAt: new Date().toISOString(),
            ...(location && { verificationLocation: location }),
        };
        update(ref(db, `HTAMS/orders/${orderId}`), updates).finally(() => {
            setUploading(null);
            if (selectedOrderDetails?.id === orderId) {
                setSelectedOrderDetails(prev => ({ ...prev, ...updates }));
            }
        });
    };

    const closePopup = () => setSelectedOrderDetails(null);

    if (loading) return <div className="loading-container">Loading Dashboard...</div>;

    return (
        <div className="dashboard-layout">
            <div className="header-section">
                <h1 className="dashboard-title">My Assigned Orders</h1>

                {newTasksNotification && (
                    <div className="notification-banner">{newTasksNotification}</div>
                )}

                <div className="summary-cards">
                    <div className="summary-card total-tasks"><h3>{summaryData.total}</h3><p>Total Tasks</p></div>
                    <div className="summary-card new-tasks"><h3>{summaryData.newTasks}</h3><p>New</p></div>
                    <div className="summary-card accepted"><h3>{summaryData.accepted}</h3><p>Accepted</p></div>
                    <div className="summary-card completed"><h3>{summaryData.completed}</h3><p>Completed</p></div>
                </div>

                <div className="filters-row">
                    <input
                        type="text"
                        placeholder="Search by customer name..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="sort-controls">
                        <label>Sort By:</label>
                        <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
                            <option value="orderDate">Date</option>
                            <option value="location">Location</option>
                        </select>
                        <button onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}>
                            {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
                        </button>
                    </div>
                </div>
            </div>

            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }}/>

            <div className="orders-grid">
                {paginatedOrders.length > 0 ? (
                    paginatedOrders.map(order => (
                        <div key={order.id} className="order-card" onClick={() => setSelectedOrderDetails(order)}>
                            <div className="card-header">
                                <h4 className="customer-name">{order.customerName}</h4>
                                <span className={`status-badge status-${order.status}`}>{order.status === 'verified' ? 'Completed' : order.status}</span>
                            </div>
                            <p className="order-brief">ID: {order.trackingId}</p>
                            <p className="order-brief">Location: {order.customerAddress.city}</p>
                        </div>
                    ))
                ) : (
                    <p className="no-orders-message">No orders match your criteria.</p>
                )}
            </div>

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                </div>
            )}

            {selectedOrderDetails && (
                <div className="popup-overlay" onClick={closePopup}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                        <button className="popup-close" onClick={closePopup} aria-label="Close">×</button>
                        <h2>Order Details</h2>
                        <div className="detail-item"><strong>Tracking ID:</strong> <span>{selectedOrderDetails.trackingId}</span></div>
                        <div className="detail-item"><strong>Customer:</strong> <span>{selectedOrderDetails.customerName}</span></div>
                        <div className="detail-item"><strong>Address:</strong> <span>{`${selectedOrderDetails.customerAddress.street}, ${selectedOrderDetails.customerAddress.city}`}</span></div>
                        <div className="detail-item"><strong>Expected Date:</strong> <span>{selectedOrderDetails.expectedDate}</span></div>
                        <div className="detail-item"><strong>Amount:</strong> <span>₹{Number(selectedOrderDetails.totalAmount).toLocaleString('en-IN')}</span></div>
                        <div className="detail-item"><strong>Status:</strong> <span className={`status-badge status-${selectedOrderDetails.status}`}>{selectedOrderDetails.status === 'verified' ? 'Completed' : selectedOrderDetails.status}</span></div>

                        {selectedOrderDetails.verificationImageUrl && <img src={selectedOrderDetails.verificationImageUrl} alt="Verification" className="verification-image"/>}

                        <div className="popup-actions">
                            {selectedOrderDetails.status === 'confirmed' && <button className="action-btn accept-btn" onClick={() => { handleAcceptOrder(selectedOrderDetails.id); closePopup(); }}>Accept Order</button>}
                            {selectedOrderDetails.status === 'accepted' && <button className="action-btn verify-btn" onClick={() => { handleVerifyClick(selectedOrderDetails.id); closePopup(); }} disabled={uploading === selectedOrderDetails.id}>{uploading === selectedOrderDetails.id ? 'Verifying...' : 'Verify'}</button>}
                            {selectedOrderDetails.status === 'verified' && <button className="action-btn verified-btn" disabled>Task Completed</button>}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .dashboard-layout { max-width: 1200px; margin: 0 auto; padding: 1rem 1rem 4rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; }
                .header-section { margin-bottom: 1.5rem; }
                .dashboard-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: #1f2937; }
                .no-orders-message, .loading-container { text-align: center; padding: 3rem; color: #6b7280; }
                
                .notification-banner { background-color: #2563eb; color: white; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-weight: 500; text-align: center; animation: slideIn 0.3s ease-out; }
                @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

                .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
                .summary-card { padding: 1rem; border-radius: 0.75rem; text-align: center; }
                .summary-card.total-tasks { background-color: #e0e7ff; color: #4338ca; }
                .summary-card.new-tasks { background-color: #dbeafe; color: #1e40af; }
                .summary-card.accepted { background-color: #ffedd5; color: #f97316; }
                .summary-card.completed { background-color: #d1fae5; color: #065f46; }
                .summary-card h3 { font-size: 2rem; font-weight: 700; margin: 0; }
                .summary-card p { margin: 0.25rem 0 0; font-weight: 600; font-size: 0.9rem; }

                .filters-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; }
                .search-input { flex: 1 1 250px; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #d1d5db; font-size: 1rem; }
                .sort-controls { display: flex; align-items: center; gap: 0.75rem; }
                .sort-controls label { font-weight: 600; color: #4b5563; }
                .sort-controls select, .sort-controls button { padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: white; cursor: pointer; }

                .orders-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
                @media (min-width: 640px) { .orders-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .orders-grid { grid-template-columns: repeat(3, 1fr); } }
                
                .order-card { background: #fff; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.07); padding: 1rem 1.25rem; cursor: pointer; transition: all 0.2s; }
                .order-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
                .customer-name { font-weight: 600; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%; }
                .order-brief { font-size: 0.9rem; color: #6b7280; margin: 0.25rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .status-badge { padding: 0.2rem 0.8rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
                .status-verified { background-color: #d1fae5; color: #065f46; }
                .status-accepted { background-color: #fef3c7; color: #b45309; }
                .status-confirmed { background-color: #dbeafe; color: #1e40af; }
                
                .pagination-controls { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 2rem; }
                .pagination-controls button { padding: 0.5rem 1rem; border: 1px solid #d1d5db; background-color: white; border-radius: 0.5rem; cursor: pointer; }
                .pagination-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
                .pagination-controls span { font-weight: 500; color: #4b5563; }

                .popup-overlay { position: fixed; inset: 0; background-color: rgba(17, 24, 39, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
                .popup-content { background: white; padding: 1.5rem; border-radius: 0.75rem; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; animation: zoomIn 0.2s ease-out; }
                @keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                .popup-close { position: absolute; top: 0.5rem; right: 0.5rem; background: #f3f4f6; border: none; border-radius: 50%; width: 32px; height: 32px; font-size: 1.2rem; cursor: pointer; }
                .detail-item { display: flex; flex-flow: row wrap; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #f3f4f6; gap: 1rem; }
                .detail-item strong { color: #4b5563; }
                .detail-item span { text-align: right; flex-grow: 1; }
                .verification-image { width: 100%; border-radius: 0.5rem; margin-top: 1rem; }
                .popup-actions { margin-top: 1.5rem; }
                .action-btn { width: 100%; padding: 0.75rem; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; font-size: 1rem; color: white; }
                .accept-btn { background-color: #2563eb; }
                .verify-btn { background-color: #f59e0b; }
                .verified-btn, .verify-btn:disabled { background-color: #d1d5db; color: #4b5563; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default EmployeeDashboard;
