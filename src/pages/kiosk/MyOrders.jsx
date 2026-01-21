import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../../config/api.js";
import Loading from "../../components/Loading.jsx";
import {
    FiPackage, FiCheckCircle, FiClock, FiXCircle,
    FiSearch, FiRefreshCw, FiArrowLeft, FiShoppingCart, FiPrinter
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";

const VoucherItem = ({ item, order, isDark, fetchedData }) => {
    const [qrCode, setQrCode] = useState(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [isInvalid, setIsInvalid] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchItemQR = async () => {
            if (!order?.id) return;
            if (isMounted) setLoadingQr(true);
            try {
                // Try to get bill-specific QR if it's a day-bill, otherwise order-level QR
                // Many backends support /bills/:id/qr or similar, falling back to order QR
                const billId = item.bill_id || item.id;
                let endpoint = `/orders/${order.id}/qr`;
                if (item.bill_id) {
                    endpoint = `/orders/${order.id}/qr?bill_id=${item.bill_id}`;
                }

                const res = await api.get(endpoint, {
                    validateStatus: (status) => status < 500
                });

                if (res.status === 200) {
                    const data = res.data || {};
                    let rawCode = data.qrImage || data.qr_code || data.qr || (typeof data === 'string' ? data : null);

                    // Check if the data contains an array of item QRs and find ours
                    if (data.items && Array.isArray(data.items)) {
                        const itemData = data.items.find(i => i.id === item.id || i.bill_id === item.bill_id);
                        if (itemData) rawCode = itemData.qrImage || itemData.qr_code || itemData.qr;
                    }

                    if (rawCode && typeof rawCode === 'string' && !rawCode.startsWith('data:') && !rawCode.startsWith('http')) {
                        rawCode = `${API_BASE_URL}${rawCode.startsWith('/') ? '' : '/'}${rawCode}`;
                    }
                    if (isMounted) setQrCode(rawCode);
                }
            } catch (err) {
                console.warn("Individual QR fetch failed, using order fallback", err);
                // Fallback to order-level QR from fetchedData if available
                const fallback = fetchedData?.qrImage || fetchedData?.qr_code || fetchedData?.qr;
                if (fallback && isMounted) {
                    let raw = fallback;
                    if (!raw.startsWith('data:') && !raw.startsWith('http')) {
                        raw = `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
                    }
                    setQrCode(raw);
                }
            } finally {
                if (isMounted) setLoadingQr(false);
            }
        };

        fetchItemQR();
        return () => { isMounted = false; };
    }, [order.id, item.id, item.bill_id, fetchedData]);

    const quantity = item.quantity || item.qty || 1;
    const isBill = !!item.bill_date;
    const name = item.name || item.product_name || item.product?.name_en || item.product?.name || (isBill ? `Voucher ${item.id}` : 'Product');
    const price = item.price || item.amount || item.unit_price || item.product?.price || 0;
    const totalPrice = item.total_price || item.amount || (parseFloat(price) * quantity);

    if (!loadingQr && !qrCode) {
        return (
            <div className="flex justify-between items-center px-4 py-2 border-b border-dashed border-[var(--border-default)] last:border-0">
                <div className="flex flex-col">
                    <span className="font-bold text-[var(--text-primary)] text-xs uppercase leading-tight truncate">
                        {name}
                    </span>
                    <span className="text-[10px] opacity-40 font-bold uppercase">Qty: {quantity}</span>
                </div>
                <span className="font-black text-[var(--text-primary)] text-xs">
                    ₹{parseFloat(totalPrice).toFixed(2)}
                </span>
            </div>
        );
    }

    return (
        <div className="p-4 rounded-3xl bg-[var(--surface-muted)]/40 border border-[var(--border-default)] flex flex-col items-center gap-3 transition-all hover:scale-[1.01] hover:bg-[var(--surface-muted)]/60">
            <div className="w-full flex justify-between items-start">
                <div className="flex flex-col min-w-0">
                    <span className="font-black text-[var(--text-primary)] text-sm uppercase leading-tight truncate">
                        {name}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60">
                        Qty: {quantity} × ₹{parseFloat(price).toFixed(2)}
                    </span>
                    {item.bill_date && (
                        <span className="text-[9px] font-black text-[var(--brand-primary)] uppercase tracking-widest mt-1">
                            {item.bill_date}
                        </span>
                    )}
                </div>
                <span className="font-black text-[var(--text-primary)] text-sm shrink-0">
                    ₹{parseFloat(totalPrice).toFixed(2)}
                </span>
            </div>

            {/* Item Specific QR - Only show if loading or available */}
            {(loadingQr || qrCode) && (
                <div className="flex flex-col items-center gap-2 mt-1 w-full animate-in fade-in duration-300">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                        {loadingQr ? (
                            <div className="w-24 h-24 flex items-center justify-center">
                                <FiRefreshCw className="animate-spin text-[var(--brand-primary)]" size={20} />
                            </div>
                        ) : (
                            <img src={qrCode} alt="Item QR" className="w-24 h-24 object-contain" />
                        )}
                    </div>
                    {!loadingQr && qrCode && (
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Scan to Pick Up</p>
                    )}
                </div>
            )}
        </div>
    );
};

const OrderCard = ({ order, isDark, onRemove }) => {
    const [fetchedData, setFetchedData] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchOrderData = async () => {
            const status = String(order.status || '').toUpperCase();
            if (['DELIVERED', 'COMPLETED', 'PICKED_UP'].includes(status)) {
                if (isMounted) onRemove(order.id);
                return;
            }
            if (isMounted) setLoadingOrder(true);
            try {
                const res = await api.get(`/orders/${order.id}/qr`);
                if (isMounted) setFetchedData(res.data);

                if (res.data?.isUsed || res.data?.is_used || res.data?.status === 'DELIVERED') {
                    if (isMounted) onRemove(order.id);
                }
            } catch (err) {
                console.warn("Order data fetch failed", err);
            } finally {
                if (isMounted) setLoadingOrder(false);
            }
        };

        fetchOrderData();
        const poll = setInterval(fetchOrderData, 10000);
        return () => { isMounted = false; clearInterval(poll); };
    }, [order.id]);

    const getStatusStyles = (status) => {
        switch (String(status).toLowerCase()) {
            case 'paid': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'pending': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'failed':
            case 'unpaid': return 'bg-rose-50 text-rose-600 border-rose-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const items = (order.dayBills && order.dayBills.length > 0) ? order.dayBills :
        (fetchedData?.ordered_items && fetchedData.ordered_items.length > 0) ? fetchedData.ordered_items :
            (fetchedData?.items && fetchedData.items.length > 0) ? fetchedData.items :
                (order.ordered_items && order.ordered_items.length > 0) ? order.ordered_items :
                    (order.Items && order.Items.length > 0) ? order.Items :
                        [];

    return (
        <div className="p-6 rounded-[2.5rem] border-2 transition-all bg-[var(--surface-card)] border-[var(--border-default)] shadow-xl flex flex-col gap-4">
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-[0.2em] mb-1">Order ID</p>
                        <p className="font-black text-[var(--brand-primary)] text-lg uppercase leading-none">
                            #{fetchedData?.order_id || order.id}
                        </p>
                        <p className="text-[9px] font-medium opacity-40 mt-1 uppercase tracking-tighter">
                            {new Date(order.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(order.payment_status)}`}>
                        {order.payment_status || 'PENDING'}
                    </div>
                </div>

                {/* Individual Item QR Tickets (No scroll) */}
                <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 text-center">Items & Vouchers</p>
                    <div className="space-y-4">
                        {items.length > 0 ? (
                            items.map((item, idx) => (
                                <VoucherItem key={idx} item={item} order={order} isDark={isDark} fetchedData={fetchedData} />
                            ))
                        ) : (
                            <div className="text-center py-6 text-[10px] font-bold uppercase opacity-20 italic bg-[var(--surface-muted)]/20 rounded-3xl border border-dashed border-[var(--border-default)]">
                                Fetching vouchers...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-dashed border-[var(--border-default)] flex justify-between items-center">
                <span className="font-black uppercase tracking-[0.2em] text-[11px] text-[var(--text-secondary)]">Price Amount:</span>
                <span className="text-2xl font-black text-[var(--text-primary)]">₹{parseFloat(order.total_amount || 0).toFixed(2)}</span>
            </div>
        </div>
    );
};

const MyOrders = ({ layout: LayoutComponent }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/orders`);
            if (res.data?.orders) {

                setOrders(res.data.orders);
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
            setError("Failed to load your orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleRemoveOrder = (orderId) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
    };



    const filteredOrders = orders.filter(order => {
        // Strict user check: Only show orders belonging to the logged-in user
        if (user?.id && order.user_id && String(order.user_id) !== String(user.id)) {
            return false;
        }

        // Filter status
        const status = String(order.status || '').toUpperCase();
        const delStatus = String(order.delivery_status || '').toUpperCase();
        const payStatus = String(order.payment_status || '').toUpperCase();

        // 1. Only show orders that are PAID
        if (payStatus !== 'PAID' && payStatus !== 'SUCCESS') {
            return false;
        }

        // 2. Filter out already delivered/completed orders
        if (['DELIVERED', 'COMPLETED', 'PICKED_UP'].includes(status) || ['DELIVERED', 'COMPLETED'].includes(delStatus)) {
            return false;
        }

        const search = searchTerm.toLowerCase();
        return String(order.code || "").toLowerCase().includes(search) || String(order.id).includes(search);
    });



    const content = (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl transition-all bg-[var(--surface-muted)] hover:bg-[var(--surface-card)] text-[var(--text-primary)]"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-[var(--text-primary)]">
                        <FiPackage className="text-[var(--brand-primary)]" /> My Orders
                    </h1>
                </div>
                <button
                    onClick={fetchOrders}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-xl font-black text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                {/* Search Bar - Style matched to Units page */}
                <div className="relative w-full md:max-w-md group mx-auto md:mx-0">
                    <input
                        type="text"
                        placeholder="Search by Order Code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-10 sm:px-12 py-2.5 sm:py-3 text-center rounded-xl border transition-all outline-none font-bold text-xs sm:text-sm shadow-sm
                            bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] hover:border-[var(--brand-primary)]/50"
                    />
                    <FiSearch
                        className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)]"
                        size={18}
                    />
                </div>
            </div>

            {loading && orders.length === 0 ? (
                <Loading />
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 opacity-30">
                    <FiShoppingCart size={64} className="mx-auto mb-4" />
                    <p className="text-xl font-bold uppercase tracking-widest">No matching orders found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {filteredOrders.map((order) => (
                        <OrderCard key={order.id} order={order} isDark={isDark} onRemove={handleRemoveOrder} />
                    ))}
                </div>
            )}
        </div>
    );

    if (LayoutComponent) {
        return (
            <LayoutComponent>
                <div className="min-h-screen transition-colors duration-300 bg-[var(--surface-main)] text-[var(--text-primary)] no-scrollbar">
                    {content}
                </div>
            </LayoutComponent>
        );
    }

    return (
        <div className="min-h-screen transition-colors duration-300 bg-[var(--surface-main)] text-[var(--text-primary)] no-scrollbar">
            {content}
        </div>
    );
};

export default MyOrders;
