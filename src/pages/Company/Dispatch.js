import React, { useEffect, useMemo, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../firebase/config';
import { FiPackage, FiSearch, FiUser, FiPhone, FiMapPin, FiEye, FiX, FiSave, FiLoader } from 'react-icons/fi';

const PAGE_SIZE = 15;

const Dispatch = () => {
    const [orders, setOrders] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [search, setSearch] = useState('');
    const [edits, setEdits] = useState({});
    const [saving, setSaving] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('month');
    const [currentPage, setCurrentPage] = useState(1);

    const allowedStatuses = useMemo(() => new Set(['confirmed', 'inprocess', 'accepted', 'completed']), []);

    useEffect(() => {
        setLoading(true);
        const ordersUnsub = onValue(ref(db, 'HTAMS/orders'), (snap) => {
            const data = snap.val() || {};
            const allOrders = Object.entries(data).map(([id, o]) => ({ id, ...o }));
            const visibleOrders = allOrders.filter(o => allowedStatuses.has(o.status?.toLowerCase()));
            setOrders(visibleOrders);
            setLoading(false);
        });

        const techUnsub = onValue(ref(db, 'HTAMS/company/Employees'), (snap) => {
            const data = snap.val() || {};
            setTechnicians(Object.entries(data).map(([id, emp]) => ({ id, ...emp })).filter(e => e.role?.toLowerCase() === 'technician'));
        });
        
        return () => { ordersUnsub(); techUnsub(); };
    }, [allowedStatuses]);

    const timeFilteredOrders = useMemo(() => {
        const now = new Date();
        if (timeFilter === 'all') return orders;
        return orders.filter(o => {
            if (!o.orderDate) return false;
            const orderDate = new Date(o.orderDate);
            if (isNaN(orderDate)) return false;
            
            if (timeFilter === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            if (timeFilter === 'year') return orderDate.getFullYear() === now.getFullYear();
            if (timeFilter === 'last15days') {
                const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
                return orderDate >= fifteenDaysAgo;
            }
            return true;
        });
    }, [orders, timeFilter]);

    const filteredAndSortedOrders = useMemo(() => {
        const statusOrder = { 'confirmed': 1, 'inprocess': 2, 'accepted': 3, 'completed': 4 };
        return timeFilteredOrders
            .filter(o => {
                const status = o.status?.toLowerCase() || '';
                if (activeStatusFilter !== 'all' && status !== activeStatusFilter) return false;
                const q = search.trim().toLowerCase();
                if (!q) return true;
                const hay = `${o.customerName || ''} ${o.customerPhone || ''} ${o.customerAddress?.city || ''}`.toLowerCase();
                return hay.includes(q);
            })
            .sort((a, b) => {
                const orderA = statusOrder[a.status?.toLowerCase()] || 5;
                const orderB = statusOrder[b.status?.toLowerCase()] || 5;
                if (orderA !== orderB) return orderA - orderB;
                const dateA = a.orderDate ? new Date(a.orderDate) : 0;
                const dateB = b.orderDate ? new Date(b.orderDate) : 0;
                if (isNaN(dateA) || isNaN(dateB)) return 0;
                return dateB - dateA;
            });
    }, [timeFilteredOrders, search, activeStatusFilter]);
    
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredAndSortedOrders.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredAndSortedOrders, currentPage]);
    
    const totalPages = Math.ceil(filteredAndSortedOrders.length / PAGE_SIZE);

    const summaryCounts = useMemo(() => {
        const counts = { all: timeFilteredOrders.length, confirmed: 0, inprocess: 0, accepted: 0, completed: 0, pending: 0 };
        timeFilteredOrders.forEach(o => {
            const status = o.status?.toLowerCase();
            if (status in counts) counts[status]++;
            if (status === 'confirmed' && !!o.assignedTechnicianId) counts.pending++;
        });
        return counts;
    }, [timeFilteredOrders]);

    // **FIXED FUNCTION**
    const calculateAmount = (order) => {
        if (!order) {
            return 0;
        }
        if (typeof order.totalAmount === 'number' && !isNaN(order.totalAmount)) {
            return order.totalAmount;
        }
        if (Array.isArray(order.items)) {
            const sum = order.items.reduce((acc, item) => {
                if (!item) return acc;
                const price = Number(item.totalPrice || item.price || 0);
                const quantity = Number(item.quantity || 1);
                if (!isNaN(price) && !isNaN(quantity)) {
                    return acc + (price * quantity);
                }
                return acc;
            }, 0);
            return sum;
        }
        return 0;
    };

    const getRowEdit = (order) => {
        const currentEdit = edits[order.id];
        return {
            status: currentEdit?.status ?? order.status ?? 'confirmed',
            technicianId: currentEdit?.technicianId ?? order.assignedTechnicianId ?? '',
        };
    };

    const onChangeEdit = (orderId, field, value) => {
        const order = orders.find(o => o.id === orderId);
        setEdits(prev => ({
            ...prev,
            [orderId]: {
                status: prev[orderId]?.status ?? order?.status ?? 'confirmed',
                technicianId: prev[orderId]?.technicianId ?? order?.assignedTechnicianId ?? '',
                [field]: value,
            },
        }));
    };

    const saveRow = async (order) => {
        const { status, technicianId } = getRowEdit(order);
        const tech = technicians.find(t => t.mobile === technicianId);
        const updates = {
            status: status.toLowerCase(),
            assignedTechnicianId: tech?.mobile,
            assignedTechnicianName: tech?.name,
            [`${status.toLowerCase()}At`]: new Date().toISOString(),
        };
        setSaving(s => ({ ...s, [order.id]: true }));
        try {
            await update(ref(db, `HTAMS/orders/${order.id}`), updates);
        } catch (e) {
            alert("Error: Could not save changes.");
        } finally {
            setSaving(s => ({ ...s, [order.id]: false }));
        }
    };
    
    const renderProducts = (o) => {
        if (!Array.isArray(o.items) || o.items.length === 0) return 'N/A';
        const names = o.items.map(it => it.productName || it.name).filter(Boolean);
        return names.length > 1 ? `${names[0]} +${names.length - 1} more` : (names[0] || 'N/A');
    };

    if (loading) return <div className="loading-state"><FiLoader className="loader-icon" />Loading...</div>;

    return (
        <div className="dispatch-page">
            <header className="page-header"><h1><FiPackage /> Dispatch Management</h1></header>

            <section className="summary-and-filters">
                 <div className="summary-cards">
                    {['all', 'confirmed', 'pending', 'inprocess', 'accepted', 'completed'].map(status => (
                        <button key={status} onClick={() => { setActiveStatusFilter(status); setCurrentPage(1); }} className={`summary-card ${status} ${activeStatusFilter === status ? 'active' : ''}`}>
                            <span>{summaryCounts[status]}</span> {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="filter-controls">
                    <div className="search-wrapper">
                        <FiSearch className="search-icon" /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
                    </div>
                    <select value={timeFilter} onChange={(e) => { setTimeFilter(e.target.value); setCurrentPage(1); }} className="time-filter-select">
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="last15days">Last 15 Days</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </section>

            <div className="table-wrapper">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Sr.</th><th>Customer</th><th>Products</th><th>Amount</th><th>Location</th><th>Technician</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedOrders.map((o, idx) => {
                            const edit = getRowEdit(o);
                            const isCompleted = o.status === 'completed';
                            const technicianAssigned = !!edit.technicianId;
                            return (
                                <tr key={o.id} className={isCompleted ? 'completed-row' : ''}>
                                    <td>{((currentPage - 1) * PAGE_SIZE) + idx + 1}</td>
                                    <td><div className="cell-primary"><FiUser />{o.customerName || '-'}</div><div className="cell-secondary"><FiPhone />{o.customerPhone || '-'}</div></td>
                                    <td>{renderProducts(o)}</td>
                                    <td className="amount-cell">₹{calculateAmount(o).toLocaleString('en-IN')}</td>
                                    <td><FiMapPin />{o.customerAddress?.city || '-'}</td>
                                    <td>
                                        <select className="control-input" value={edit.technicianId} onChange={(e) => onChangeEdit(o.id, 'technicianId', e.target.value)} disabled={isCompleted}>
                                            <option value="">-- Select --</option>
                                            {technicians.map(t => <option key={t.id} value={t.mobile}>{t.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select className="control-input" value={edit.status} onChange={(e) => onChangeEdit(o.id, 'status', e.target.value)} disabled={isCompleted}>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="inprocess">In Process</option>
                                            {technicianAssigned && <option value="accepted">Accepted</option>}
                                            <option value="completed">Completed</option>
                                        </select>
                                    </td>
                                    <td className="actions-cell">
                                        <button className="action-btn view-btn" onClick={() => setSelectedOrder(o)}><FiEye /> View</button>
                                        {!isCompleted && <button className="action-btn save-btn" onClick={() => saveRow(o)} disabled={!!saving[o.id]}><FiSave />{saving[o.id] ? '...' : 'Save'}</button>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                </div>
            )}

            {selectedOrder && (
                 <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedOrder(null)}><FiX /></button>
                        <h3 className="modal-title">Order Details</h3>
                        <div className="modal-grid">
                            <div className="detail-item"><strong>Customer:</strong> {selectedOrder.customerName || 'N/A'}</div>
                            <div className="detail-item"><strong>Phone:</strong> {selectedOrder.customerPhone || 'N/A'}</div>
                            <div className="detail-item full-width"><strong>Address:</strong> {`${selectedOrder.customerAddress?.street || ''}, ${selectedOrder.customerAddress?.city || ''}, ${selectedOrder.customerAddress?.state || ''} - ${selectedOrder.customerAddress?.pincode || ''}`}</div>
                            <div className="detail-item"><strong>Status:</strong> <span className={`status-tag ${selectedOrder.status}`}>{selectedOrder.status}</span></div>
                            <div className="detail-item"><strong>Amount:</strong> ₹{calculateAmount(selectedOrder).toLocaleString('en-IN')}</div>
                            <div className="detail-item"><strong>Technician:</strong> {selectedOrder.assignedTechnicianName || 'Not Assigned'}</div>
                        </div>
                        <h4 className="product-list-title">Products</h4>
                        <ul className="product-list">
                            {(selectedOrder.items || []).map((item, i) => <li key={i}>{item.productName || 'Unnamed Product'} (Qty: {item.quantity || 1})</li>)}
                        </ul>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .dispatch-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; padding: 1.5rem; min-height: 100vh; }
                .loading-state, .no-data-cell { text-align: center; padding: 2rem; color: #64748b; }
                .loader-icon { animation: spin 1s linear infinite; font-size: 2rem; margin-right: 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                .page-header h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 1.75rem; font-weight: 700; color: #1e293b; }
                
                .summary-and-filters { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; }
                .summary-cards { display: flex; gap: 1rem; flex-wrap: wrap; }
                .summary-card { background: white; padding: 0.75rem 1rem; border-radius: 0.75rem; font-weight: 600; display: flex; flex-direction: column; align-items: center; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
                .summary-card span { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
                .summary-card.active { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                .summary-card.all { color: #374151; } .summary-card.active.all { border-color: #374151; }
                .summary-card.confirmed { color: #4338ca; } .summary-card.active.confirmed { border-color: #4338ca; }
                .summary-card.pending { color: #ca8a04; } .summary-card.active.pending { border-color: #ca8a04; }
                .summary-card.inprocess { color: #c2410c; } .summary-card.active.inprocess { border-color: #c2410c; }
                .summary-card.accepted { color: #b45309; } .summary-card.active.accepted { border-color: #b45309; }
                .summary-card.completed { color: #166534; } .summary-card.active.completed { border-color: #166534; }
                
                .filter-controls { display: flex; gap: 1rem; align-items: center; }
                .search-wrapper { position: relative; }
                .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-input, .time-filter-select { padding: 0.65rem 1rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 1rem; }
                .search-input { padding-left: 2.5rem; }
                
                .table-wrapper { background-color: white; border-radius: 0.75rem; overflow-x: auto; }
                .orders-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
                .orders-table th, .orders-table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .orders-table th { background-color: #f8fafc; font-size: 0.75rem; font-weight: 600; color: #475569; }
                .cell-primary, .cell-secondary { display: flex; align-items: center; gap: 0.5rem; }
                .cell-primary { font-weight: 600; }
                .cell-secondary { color: #64748b; font-size: 0.875rem; }
                .completed-row { background-color: #f0fdf4; }
                .control-input { width: 100%; min-width: 150px; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; }
                .control-input:disabled { background-color: #e5e7eb; cursor: not-allowed; }
                .actions-cell { display: flex; gap: 0.5rem; }
                .action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; border: none; font-weight: 600; cursor: pointer; }
                .view-btn { background-color: #eef2ff; color: #4338ca; }
                .save-btn { background-color: #10b981; color: white; }
                .save-btn:disabled { background-color: #a7f3d0; cursor: not-allowed; }
                
                .pagination-controls { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
                .pagination-controls button { padding: 0.5rem 1rem; border: 1px solid #cbd5e1; background: white; border-radius: 0.5rem; cursor: pointer; }
                .pagination-controls button:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .modal-overlay { position: fixed; inset: 0; background-color: rgba(17, 24, 39, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: white; padding: 2rem; border-radius: 0.75rem; max-width: 600px; width: 100%; position: relative; }
                .modal-close-btn { position: absolute; top: 1rem; right: 1rem; background: #f3f4f6; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; }
                .modal-title { margin-top: 0; margin-bottom: 1.5rem; }
                .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
                .detail-item.full-width { grid-column: 1 / -1; }
                .status-tag { padding: 0.2rem 0.6rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; }
                .status-tag.confirmed { background-color: #e0e7ff; color: #4338ca; }
                .status-tag.inprocess { background-color: #ffedd5; color: #c2410c; }
                .status-tag.accepted { background-color: #fef3c7; color: #b45309; }
                .status-tag.completed { background-color: #dcfce7; color: #166534; }
                .product-list-title { margin-bottom: 0.5rem; font-weight: 600; }
                .product-list { list-style-position: inside; padding: 0; margin: 0; }
            `}</style>
        </div>
    );
};

export default Dispatch;
