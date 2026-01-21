import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout.jsx";
import Loading from "../../components/Loading.jsx";
import api, { API_BASE_URL } from "../../config/api.js";
import {
    FiPackage, FiCheckCircle, FiClock, FiXCircle,
    FiSearch, FiChevronDown, FiChevronLeft, FiChevronRight,
    FiFilter
} from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext.jsx";

const AdminOrderTracking = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [orderStatusFilter, setOrderStatusFilter] = useState("all");
    const [paymentModeFilter, setPaymentModeFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        totalPages: 1
    });
    const [filters, setFilters] = useState({
        page: 1,
        limit: 50
    });
    const [showLimitDropdown, setShowLimitDropdown] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const [isOrderStatusDropdownOpen, setIsOrderStatusDropdownOpen] = useState(false);
    const [isPaymentModeDropdownOpen, setIsPaymentModeDropdownOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const statusDropdownRef = useRef(null);
    const orderStatusDropdownRef = useRef(null);
    const paymentModeDropdownRef = useRef(null);
    const dateDropdownRef = useRef(null);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('page', filters.page);
            params.append('limit', filters.limit);
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter !== 'all') params.append('payment_status', statusFilter.toUpperCase());
            if (orderStatusFilter !== 'all') params.append('order_status', orderStatusFilter.toUpperCase());
            if (paymentModeFilter !== 'all') params.append('payment_mode', paymentModeFilter.toUpperCase());
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const res = await api.get(`/orders?${params.toString()}`);
            if (res.data?.orders) {
                setOrders(res.data.orders);
                setPagination({
                    total: res.data.total || res.data.orders.length,
                    page: res.data.page || 1,
                    totalPages: res.data.totalPages || 1
                });
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
            setError("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        try {
            setUpdatingStatus(true);
            const res = await api.post(`/orders/${orderId}/status`, { order_status: newStatus });
            if (res.data?.success) {
                // Update local status
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(res.data.order);
                }
            }
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, searchTerm ? 500 : 0);
        return () => clearTimeout(timer);
    }, [filters.page, filters.limit, statusFilter, orderStatusFilter, paymentModeFilter, searchTerm, startDate, endDate]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, page: 1 }));
    }, [searchTerm, statusFilter, orderStatusFilter, paymentModeFilter, startDate, endDate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
                setIsStatusDropdownOpen(false);
            }
            if (orderStatusDropdownRef.current && !orderStatusDropdownRef.current.contains(event.target)) {
                setIsOrderStatusDropdownOpen(false);
            }
            if (paymentModeDropdownRef.current && !paymentModeDropdownRef.current.contains(event.target)) {
                setIsPaymentModeDropdownOpen(false);
            }
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
                setIsDateDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOrders = orders; // Filtering handled by API

    if (loading && orders.length === 0) return <AdminLayout><Loading /></AdminLayout>;

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 mt-4 animate-slide-up opacity-0">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-[var(--brand-primary)] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.1em] text-[var(--text-primary)]">
                            {"Orders".split("").map((char, i) => (
                                <span
                                    key={i}
                                    className="animate-letter-pop"
                                    style={{ animationDelay: `${300 + (char === " " ? 0 : i * 50)}ms` }}
                                >
                                    {char === " " ? "\u00A0" : char}
                                </span>
                            ))}
                        </h1>
                    </div>

                    <div
                        style={{ animationDelay: '100ms' }}
                        className="flex items-center gap-3 w-full sm:w-auto animate-slide-up opacity-0"
                    >
                        <div className="relative flex-grow sm:w-[300px] group">
                            <input
                                type="text"
                                placeholder="Search Code or Address..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-10 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/10 focus:border-[var(--brand-primary)] font-bold text-xs transition-all shadow-sm text-center placeholder:text-center"
                            />
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={14} />
                        </div>

                        {(searchTerm || statusFilter !== 'all' || orderStatusFilter !== 'all' || startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("all");
                                    setOrderStatusFilter("all");
                                    setPaymentModeFilter("all");
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="Clear All Filters"
                            >
                                <FiXCircle size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-8 rounded-2xl bg-[var(--surface-card)] shadow-xl border border-[var(--border-default)] overflow-visible">
                    <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                            <thead className="bg-[var(--brand-primary)] text-white">
                                <tr>
                                    <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5 first:rounded-tl-2xl w-14">S.No</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5 w-32">Emp Code</th>

                                    {/* Timestamp Filter */}
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5 min-w-[170px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <span>Timestamp</span>
                                            <div className="relative flex items-center" ref={dateDropdownRef}>
                                                <div
                                                    className="p-1.5 hover:bg-black/10 rounded-lg transition-all active:scale-95 group cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setIsDateDropdownOpen(!isDateDropdownOpen); }}
                                                >
                                                    <FiFilter
                                                        className={`transition-all drop-shadow-sm ${(startDate || endDate)
                                                            ? 'text-blue-700 scale-125'
                                                            : 'text-black opacity-80 group-hover:opacity-100 scale-110'
                                                            }`}
                                                        style={{ strokeWidth: '4px' }}
                                                    />
                                                </div>
                                                {isDateDropdownOpen && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] p-4">
                                                        <div className="flex flex-col gap-3">
                                                            <div>
                                                                <label className="text-[9px] text-gray-400 font-black mb-1 block">START DATE</label>
                                                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold p-2 outline-none uppercase" />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] text-gray-400 font-black mb-1 block">END DATE</label>
                                                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold p-2 outline-none uppercase" />
                                                            </div>
                                                            <button onClick={() => { setStartDate(""); setEndDate(""); setIsDateDropdownOpen(false); }} className="text-[10px] font-black text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors uppercase">Reset Range</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </th>

                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5">Username</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5 max-w-[200px]">Items</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5">Amount</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span>Payment</span>
                                            <div className="relative flex items-center" ref={paymentModeDropdownRef}>
                                                <div
                                                    className="p-1.5 hover:bg-black/10 rounded-lg transition-all active:scale-95 group cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setIsPaymentModeDropdownOpen(!isPaymentModeDropdownOpen); }}
                                                >
                                                    <FiFilter
                                                        className={`transition-all drop-shadow-sm ${paymentModeFilter !== 'all'
                                                            ? 'text-blue-700 scale-125'
                                                            : 'text-black opacity-80 group-hover:opacity-100 scale-110'
                                                            }`}
                                                        style={{ strokeWidth: '4px' }}
                                                    />
                                                </div>
                                                {isPaymentModeDropdownOpen && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-32 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden py-1">
                                                        {['all', 'cash', 'upi'].map(o => (
                                                            <div key={o} onClick={() => { setPaymentModeFilter(o); setIsPaymentModeDropdownOpen(false); }} className={`px-4 py-2.5 text-[10px] font-bold uppercase hover:bg-gray-50 cursor-pointer ${paymentModeFilter === o ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}>{o}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5">Address</th>

                                    {/* Pay Status Filter */}
                                    <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-[0.12em] border-b border-r border-black/5">
                                        <div className="flex items-center justify-center gap-2">
                                            <span>Payment</span>
                                            <div className="relative flex items-center" ref={statusDropdownRef}>
                                                <div
                                                    className="p-1.5 hover:bg-black/10 rounded-lg transition-all active:scale-95 group cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setIsStatusDropdownOpen(!isStatusDropdownOpen); }}
                                                >
                                                    <FiFilter
                                                        className={`transition-all drop-shadow-sm ${statusFilter !== 'all'
                                                            ? 'text-blue-700 scale-125'
                                                            : 'text-black opacity-80 group-hover:opacity-100 scale-110'
                                                            }`}
                                                        style={{ strokeWidth: '4px' }}
                                                    />
                                                </div>
                                                {isStatusDropdownOpen && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-40 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden py-1">
                                                        {['all', 'paid', 'pending'].map(o => (
                                                            <div key={o} onClick={() => { setStatusFilter(o); setIsStatusDropdownOpen(false); }} className={`px-4 py-2.5 text-[10px] font-bold uppercase hover:bg-gray-50 cursor-pointer ${statusFilter === o ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}>{o}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </th>

                                    {/* Order Status Filter */}
                                    <th className="px-5 py-4 text-center text-[10px] font-black uppercase tracking-[0.12em] border-b last:border-r-0 last:rounded-tr-2xl">
                                        <div className="flex items-center justify-center gap-2">
                                            <span>Status</span>
                                            <div className="relative flex items-center" ref={orderStatusDropdownRef}>
                                                <div
                                                    className="p-1.5 hover:bg-black/10 rounded-lg transition-all active:scale-95 group cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); setIsOrderStatusDropdownOpen(!isOrderStatusDropdownOpen); }}
                                                >
                                                    <FiFilter
                                                        className={`transition-all drop-shadow-sm ${orderStatusFilter !== 'all'
                                                            ? 'text-blue-700 scale-125'
                                                            : 'text-black opacity-80 group-hover:opacity-100 scale-110'
                                                            }`}
                                                        style={{ strokeWidth: '4px' }}
                                                    />
                                                </div>
                                                {isOrderStatusDropdownOpen && (
                                                    <div className="absolute top-full right-0 mt-3 w-44 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden py-1">
                                                        {['all', 'pending', 'processing', 'completed', 'delivered', 'cancelled'].map(o => (
                                                            <div key={o} onClick={() => { setOrderStatusFilter(o); setIsOrderStatusDropdownOpen(false); }} className={`px-4 py-2.5 text-[10px] font-bold uppercase hover:bg-gray-50 cursor-pointer ${orderStatusFilter === o ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}>{o}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]">
                                {filteredOrders.length > 0 ? filteredOrders.map((order, index) => {
                                    const isLastRow = index === filteredOrders.length - 1;
                                    const items = order.dayBills?.flatMap(bill => bill.items || []) || [];
                                    const firstItem = items[0];
                                    const mainItem = firstItem?.product?.name_en || firstItem?.product?.name || "Order";
                                    const mainQty = firstItem?.quantity || 0;
                                    const extraCount = items.length > 1 ? `+${items.length - 1} more items` : "";

                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            style={{ animationDelay: `${index * 30}ms` }}
                                            className="hover:bg-[var(--surface-muted)]/40 transition-all cursor-pointer group animate-slide-up opacity-0"
                                        >
                                            <td className={`px-4 py-4 text-[11px] font-bold opacity-40 ${isLastRow ? 'first:rounded-bl-2xl' : ''}`}>{(filters.page - 1) * filters.limit + index + 1}</td>
                                            <td className="px-5 py-4">
                                                <div className="px-2.5 py-1 bg-amber-500/10 text-[var(--brand-primary)] border border-amber-500/10 rounded-lg text-[10px] font-black w-fit uppercase tracking-wider">
                                                    {order.emp_code || order.user?.emp_code || `#${order.id.toString().slice(-4)}`}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col leading-tight">
                                                    <span className="font-bold text-[var(--text-primary)] text-xs">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase opacity-60">{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500 border border-white shadow-sm uppercase">
                                                        {order.user?.username?.charAt(0) || "U"}
                                                    </div>
                                                    <span className="font-bold text-[var(--text-primary)] text-xs truncate max-w-[80px]">{(order.user?.username || "N/A").split(" ")[0]}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 max-w-[200px]">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[var(--text-primary)] text-xs truncate" title={mainItem}>{mainItem}</span>
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">Qty: {mainQty} {extraCount && <span className="text-[var(--brand-primary)] font-black ml-1.5">{extraCount}</span>}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-xs font-black text-emerald-600">₹{parseFloat(order.total_amount).toFixed(2)}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase">{order.payment_mode || 'CASH'}</span>
                                                    <span className="text-[9px] font-bold opacity-30 truncate max-w-[70px]">#{order.razorpay_payment_id?.slice(-6) || 'LOCAL'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-[11px] font-medium text-[var(--text-secondary)] line-clamp-1 max-w-[120px]" title={order.delivery_address}>{order.delivery_address || "—"}</span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${order.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {order.payment_status || 'PENDING'}
                                                </div>
                                            </td>
                                            <td className={`px-5 py-4 text-center ${isLastRow ? 'last:rounded-br-2xl' : ''}`}>
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${order.order_status === 'DELIVERED' ? 'bg-blue-600 text-white' :
                                                    order.order_status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                                                        order.order_status === 'PROCESSING' ? 'bg-amber-500 text-white' :
                                                            'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    <FiPackage size={10} />
                                                    {order.order_status || 'PENDING'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan="11" className="py-24 text-center opacity-20 font-black italic tracking-widest text-lg">NO ORDERS MATCHED</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border-default)] bg-[var(--surface-card)] gap-4">
                    <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                        Showing <span className="text-[var(--text-primary)]">{(filters.page - 1) * filters.limit + 1}–{Math.min(filters.page * filters.limit, pagination.total)}</span> of <span className="text-[var(--brand-primary)] font-semibold">{pagination.total}</span> records
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilters({ ...filters, page: Math.max(1, parseInt(pagination.page) - 1) })}
                                disabled={parseInt(pagination.page) <= 1}
                                className="px-4 h-9 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-all shadow-sm font-semibold text-[10px] uppercase"
                            >
                                <FiChevronLeft size={16} /> Back
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                                    const isSelected = parseInt(pagination.page) === pageNum;
                                    if (pagination.totalPages > 5 && (pageNum > 1 && pageNum < pagination.totalPages && Math.abs(pageNum - parseInt(pagination.page)) > 1)) {
                                        if (pageNum === 2 || pageNum === pagination.totalPages - 1) return <span key={pageNum} className="px-1 text-[var(--text-secondary)] opacity-50">...</span>;
                                        return null;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setFilters({ ...filters, page: pageNum })}
                                            className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-semibold transition-all border
                                                ${isSelected
                                                    ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[0_4px_15_rgba(227,30,36,0.4)] scale-105"
                                                    : "bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, parseInt(pagination.page) + 1) })}
                                disabled={parseInt(pagination.page) >= pagination.totalPages}
                                className="px-4 h-9 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-all shadow-sm font-semibold text-[10px] uppercase"
                            >
                                Next <FiChevronRight size={16} />
                            </button>
                        </div>

                        <div className="relative shrink-0">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLimitDropdown(!showLimitDropdown);
                                }}
                                className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl py-2.5 text-[12px] font-semibold text-[var(--text-primary)] cursor-pointer outline-none transition-all shadow-sm flex items-center justify-center relative w-[130px]"
                            >
                                {filters.limit} Pages
                                <FiChevronDown size={14} className={`absolute right-3 transition-transform duration-300 ${showLimitDropdown ? 'rotate-180' : ''} text-[var(--brand-primary)]`} />
                            </button>

                            {showLimitDropdown && (
                                <div className="absolute bottom-full left-0 mb-2 w-[130px] bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-2xl shadow-2xl z-[100] py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {[10, 20, 50, 100].map(limit => (
                                        <button
                                            key={limit}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFilters({ ...filters, limit, page: 1 });
                                                setShowLimitDropdown(false);
                                            }}
                                            className={`w-full py-3.5 text-center text-[12px] font-medium transition-all
                                                ${filters.limit === limit
                                                    ? "bg-[var(--brand-primary)] text-white"
                                                    : "text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"}`}
                                        >
                                            {limit} Pages
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Detail View */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all animate-in fade-in duration-300" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-[var(--surface-card)] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200 border border-[var(--border-default)]" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-muted)]/30">
                            <div>
                                <h2 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-3">
                                    <FiPackage className="text-[var(--brand-primary)]" /> Order Details
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-0.5">Order Code: {selectedOrder.emp_code || selectedOrder.user?.emp_code || selectedOrder.code || selectedOrder.id}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-[var(--surface-muted)] rounded-full transition-colors text-[var(--text-secondary)]">
                                <FiXCircle size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            <div className="grid grid-cols-2 gap-8 mb-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-[0.2em] opacity-60">Ordered By</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center text-lg font-black border border-blue-500/20">
                                            {selectedOrder.user?.username?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">{selectedOrder.user?.username || "N/A"}</p>
                                            <p className="text-xs text-[var(--text-secondary)] font-medium">{selectedOrder.unit?.name || "Kiosk"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-[0.2em] opacity-60">Transaction Info</label>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-primary)] uppercase">{selectedOrder.payment_mode}</p>
                                        <p className="text-xs font-medium text-[var(--text-secondary)] opacity-60 truncate max-w-[150px]">{selectedOrder.razorpay_payment_id || 'No Trans ID'}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-4 bg-[var(--surface-muted)]/30 p-4 rounded-2xl border border-[var(--border-default)]">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-[0.2em] block opacity-60">Delivery Address</label>
                                            <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                                                {selectedOrder.delivery_address || <span className="italic opacity-40 text-xs">No delivery address provided for this order.</span>}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-widest block opacity-40 text-right">Payment</label>
                                                <div className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-center ${selectedOrder.payment_status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'}`}>
                                                    {selectedOrder.payment_status || 'PENDING'}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-widest block opacity-40 text-right">Order Status</label>
                                                <select
                                                    value={selectedOrder.order_status || 'PENDING'}
                                                    onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                                                    disabled={updatingStatus}
                                                    className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-center cursor-pointer outline-none border-0 appearance-none bg-transparent hover:bg-black/5 transition-all text-right
                                                    ${selectedOrder.order_status === 'DELIVERED' ? 'text-blue-500' :
                                                            selectedOrder.order_status === 'COMPLETED' ? 'text-emerald-500' :
                                                                selectedOrder.order_status === 'PROCESSING' ? 'text-amber-500' :
                                                                    'text-gray-500'
                                                        }`}
                                                >
                                                    <option value="PENDING" className="text-gray-500">PENDING</option>
                                                    <option value="PROCESSING" className="text-amber-500">PROCESSING</option>
                                                    <option value="COMPLETED" className="text-emerald-500">COMPLETED</option>
                                                    <option value="DELIVERED" className="text-blue-500">DELIVERED</option>
                                                    <option value="CANCELLED" className="text-red-500">CANCELLED</option>
                                                </select>
                                                <div className="text-[8px] text-right opacity-30 italic mt-0.5">Click to change</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <label className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-[0.2em] block mb-4 opacity-60">Order Items</label>
                            <div className="space-y-3">
                                {selectedOrder.dayBills?.flatMap(b => b.items || []).map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)]/20">
                                        <div className="w-14 h-14 rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] p-1 overflow-hidden">
                                            {(() => {
                                                const img = item.product?.image || item.product?.image_path;
                                                if (img) {
                                                    const finalUrl = (img.startsWith('http') || img.startsWith('blob:'))
                                                        ? img
                                                        : `${API_BASE_URL}${img.startsWith('/') ? '' : '/'}${img}`;
                                                    return <img src={finalUrl} className="w-full h-full object-contain rounded-lg" />;
                                                }
                                                return <div className="w-full h-full bg-[var(--surface-muted)] rounded-lg flex items-center justify-center text-[10px] font-black italic text-[var(--text-secondary)] opacity-30">Img</div>;
                                            })()}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{item.product?.name_en || item.product?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-[var(--text-secondary)] font-bold opacity-60">Qty: {item.quantity}</p>
                                            <p className="text-sm font-black text-[var(--text-primary)]">₹{parseFloat(item.total_price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-[var(--border-default)] bg-[var(--surface-muted)]/30 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-tight">Net Total</p>
                                <p className="text-2xl font-black text-[var(--brand-primary)] tracking-tighter">₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/admin/logs')}
                                    className="px-6 py-3 bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold rounded-2xl active:scale-95 transition-all text-sm border border-[var(--border-default)] hover:bg-[var(--brand-primary)]/10"
                                >
                                    View Logs
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminOrderTracking;
