import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    const [timeFilter, setTimeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const allowedStatuses = useMemo(() => new Set(['confirmed', 'dispatched', 'accepted', 'delivered','installed']), []);

    const resolveOrderDate = useCallback((order) => {
        if (!order) return null;
        const candidates = [
            order.orderDate,
            order.date,
            order.createdAt,
            order.created_at,
            order.timestamp,
        ];

        for (const raw of candidates) {
            if (!raw) continue;
            if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;

            if (typeof raw === 'number') {
                const normalized = raw < 1e12 ? raw * 1000 : raw;
                const date = new Date(normalized);
                if (!Number.isNaN(date.getTime())) return date;
            }

            if (typeof raw === 'string') {
                const trimmed = raw.trim();
                if (!trimmed) continue;

                const numeric = Number(trimmed);
                if (!Number.isNaN(numeric)) {
                    const normalized = trimmed.length === 10 ? numeric * 1000 : numeric;
                    const date = new Date(normalized);
                    if (!Number.isNaN(date.getTime())) return date;
                }

                const isoDate = new Date(trimmed);
                if (!Number.isNaN(isoDate.getTime())) return isoDate;

                const pattern = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
                if (pattern) {
                    const [, day, month, year] = pattern;
                    const fullYear = year.length === 2 ? `20${year}` : year;
                    const isoCandidate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    const altDate = new Date(isoCandidate);
                    if (!Number.isNaN(altDate.getTime())) return altDate;
                }
            }
        }

        return null;
    }, []);

    useEffect(() => {
        setLoading(true);
        const ordersUnsub = onValue(ref(db, 'HTAMS/orders'), (snap) => {
            const data = snap.val() || {};
            const allOrders = Object.entries(data).map(([id, o]) => ({ id, ...o }));
            console.log('📦 Total orders in database:', allOrders.length);
            console.log('📊 Order statuses:', allOrders.map(o => o.status));
            // Only show orders that have been confirmed (or beyond: inprocess, accepted, completed)
            const visibleOrders = allOrders.filter(o => {
                const status = o.status?.toLowerCase();
                return status && allowedStatuses.has(status);
            });
            console.log('✅ Visible orders after status filter:', visibleOrders.length);
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
            const orderDate = resolveOrderDate(o);
            if (!orderDate) return false;

            if (timeFilter === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            if (timeFilter === 'year') return orderDate.getFullYear() === now.getFullYear();
            if (timeFilter === 'last15days') {
                const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));
                return orderDate >= fifteenDaysAgo;
            }
            return true;
        });
    }, [orders, timeFilter, resolveOrderDate]);

    const filteredAndSortedOrders = useMemo(() => {
        const statusOrder = { 'confirmed': 1, 'dispatched': 2, 'accepted': 3, 'delivered': 4, 'installed': 5 };
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
                const dateA = resolveOrderDate(a);
                const dateB = resolveOrderDate(b);
                if (dateA && dateB) return dateB - dateA;
                if (dateA) return -1;
                if (dateB) return 1;
                return 0;
            });
    }, [timeFilteredOrders, search, activeStatusFilter, resolveOrderDate]);
    
    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredAndSortedOrders.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredAndSortedOrders, currentPage]);
    
    const totalPages = Math.ceil(filteredAndSortedOrders.length / PAGE_SIZE);

    const summaryCounts = useMemo(() => {
        const counts = { all: timeFilteredOrders.length, confirmed: 0, dispatched: 0, accepted: 0, delivered: 0, installed: 0, cancelled: 0 };
        timeFilteredOrders.forEach(o => {
            const status = o.status?.toLowerCase();
            if (status in counts) counts[status]++;
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
            <header className="page-header"><h1> Dispatch Management</h1></header>

            <section className="summary-and-filters">
                 <div className="summary-cards">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'confirmed', label: 'Confirmed' },
                        { key: 'dispatched', label: 'Dispatched' },
                        { key: 'accepted', label: 'Accepted' },
                        { key: 'delivered', label: 'Delivered' },
                        { key: 'installed', label: 'Installed' },
                        { key: 'cancelled', label: 'Cancelled' }
                    ].map(({ key, label }) => (
                        <button key={key} onClick={() => { setActiveStatusFilter(key); setCurrentPage(1); }} className={`summary-card ${key} ${activeStatusFilter === key ? 'active' : ''}`}>
                            <span>{summaryCounts[key]}</span> {label}
                        </button>
                    ))}
                </div>
                <div className="filter-controls">
                    <div className="search-wrapper">
                        <FiSearch className="search-icon" /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
                    </div>
                    <select value={timeFilter} onChange={(e) => { setTimeFilter(e.target.value); setCurrentPage(1); }} className="time-filter-select">
                        <option value="all">All Time</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="last15days">Last 15 Days</option>
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
                                            <option value="dispatched">Dispatched</option>
                                            {technicianAssigned && <option value="accepted">Accepted</option>}
                                            <option value="delivered">Delivered</option>
                                            <option value="installed">Installed</option>
                                            <option value="cancelled">Cancelled</option>
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
                .dispatch-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #e8eef3; padding: 0; min-height: 100vh; }
                .loading-state, .no-data-cell { text-align: center; padding: 2rem; color: white; }
                .loader-icon { animation: spin 1s linear infinite; font-size: 2rem; margin-right: 1rem; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                .page-header { background: #002B5C; padding: 1.25rem 1.5rem; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
                .page-header h1 { display: flex; align-items: center; gap: 0.75rem; font-size: 1.5rem; font-weight: 700; color: white; margin: 0; }
                
                .summary-and-filters { background: #002B5C; padding: 1rem 1.5rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0; }
                .summary-cards { display: flex; gap: 0.75rem; flex-wrap: wrap; }
                .summary-card { background: #F36F21; color: white; padding: 0.6rem 1rem; border-radius: 0.5rem; font-weight: 600; display: flex; flex-direction: column; align-items: center; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; min-width: 80px; }
                .summary-card span { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.15rem; }
                .summary-card.active { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(243, 111, 33, 0.4); border-color: white; }
                
                .filter-controls { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
                .search-wrapper { position: relative; }
                .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .search-input, .time-filter-select { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-size: 0.9rem; background: white; }
                .search-input { padding-left: 2.5rem; width: 200px; }
                
                .table-wrapper { background-color: white; border-radius: 0; overflow-x: auto; margin: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .orders-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
                .orders-table th, .orders-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .orders-table th { background-color: #002B5C; font-size: 0.75rem; font-weight: 600; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
                .cell-primary, .cell-secondary { display: flex; align-items: center; gap: 0.5rem; }
                .cell-primary { font-weight: 600; color: #1e293b; }
                .cell-secondary { color: #64748b; font-size: 0.85rem; }
                .amount-cell { color: #F36F21; font-weight: 700; }
                .completed-row { background-color: #f0fdf4; }
                .control-input { width: 100%; min-width: 150px; padding: 0.45rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; font-size: 0.85rem; }
                .control-input:disabled { background-color: #e5e7eb; cursor: not-allowed; }
                .actions-cell { display: flex; gap: 0.5rem; }
                .action-btn { display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.85rem; border-radius: 0.375rem; border: none; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
                .view-btn { background-color: #002B5C; color: white; }
                .view-btn:hover { background-color: #003875; }
                .save-btn { background-color: #F36F21; color: white; }
                .save-btn:hover { background-color: #d96419; }
                .save-btn:disabled { background-color: #fbb88a; cursor: not-allowed; }
                
                .pagination-controls { display: flex; justify-content: center; align-items: center; gap: 1rem; margin: 1.5rem; }
                .pagination-controls button { padding: 0.5rem 1rem; border: 1px solid #002B5C; background: white; color: #002B5C; border-radius: 0.375rem; cursor: pointer; font-weight: 600; }
                .pagination-controls button:hover:not(:disabled) { background: #002B5C; color: white; }
                .pagination-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
                .pagination-controls span { color: #002B5C; font-weight: 600; }
                
                .modal-overlay { position: fixed; inset: 0; background-color: rgba(0, 43, 92, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
                .modal-content { background: white; padding: 0; border-radius: 0.5rem; max-width: 600px; width: 90%; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
                .modal-close-btn { position: absolute; top: 1rem; right: 1rem; background: #F36F21; color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10; }
                .modal-close-btn:hover { background: #d96419; }
                .modal-title { margin: 0; padding: 1.25rem 1.5rem; background: #002B5C; color: white; font-size: 1.25rem; font-weight: 700; border-radius: 0.5rem 0.5rem 0 0; }
                .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.5rem; }
                .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
                .detail-item strong { color: #002B5C; font-weight: 600; font-size: 0.85rem; }
                .detail-item.full-width { grid-column: 1 / -1; }
                .status-tag { padding: 0.35rem 0.75rem; border-radius: 99px; font-size: 0.85rem; font-weight: 600; text-transform: capitalize; display: inline-block; }
                .status-tag.confirmed { background-color: #002B5C; color: white; }
                .status-tag.inprocess { background-color: #F36F21; color: white; }
                .status-tag.accepted { background-color: #fbbf24; color: #1e293b; }
                .status-tag.completed { background-color: #10b981; color: white; }
                .product-list-title { margin: 0 0 0.75rem 0; padding: 0 1.5rem; font-weight: 700; color: #002B5C; font-size: 1rem; }
                .product-list { list-style-position: inside; padding: 0 1.5rem 1.5rem 1.5rem; margin: 0; }
                .product-list li { padding: 0.5rem; background: #f8fafc; margin-bottom: 0.5rem; border-radius: 0.375rem; border-left: 3px solid #F36F21; }
            `}</style>
        </div>
    );
};

export default Dispatch;
