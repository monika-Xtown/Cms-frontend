import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout.jsx';
import api, { API_BASE_URL } from '../../config/api.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import Loading from '../../components/Loading.jsx';
import { FiChevronLeft, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import noImage from '../../assets/No_image.png';

const VoucherItemDetail = ({ item, order, fetchedQrData }) => {
    const [qrCode, setQrCode] = useState(null);
    const [loadingQr, setLoadingQr] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchItemQR = async () => {
            if (!order?.id) return;
            if (isMounted) setLoadingQr(true);
            try {
                // Support both bill_id and item ID
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

                    // Check if the data contains an array of item QRs
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
                console.warn("Individual item QR fetch failed", err);
                // Fallback to order-level QR
                const fallback = fetchedQrData?.qrImage || fetchedQrData?.qr_code || fetchedQrData?.qr;
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
    }, [order.id, item.id, item.bill_id, fetchedQrData]);

    const quantity = item.quantity || item.qty || 1;
    const isBill = !!item.bill_date;
    const name = item.name || item.product_name || item.product?.name_en || item.product?.name || (isBill ? `Voucher ${item.id}` : 'Product');
    const price = item.price || item.amount || item.unit_price || item.product?.price || 0;
    const totalPrice = item.total_price || item.amount || (parseFloat(price) * quantity);

    const imgUrl = item.product_image || item.image || item.Product?.image || item.product?.image || item.product?.image_path;
    const validUrl = imgUrl
        ? (imgUrl.startsWith('http') || imgUrl.startsWith('blob:') ? imgUrl : `${API_BASE_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`)
        : noImage;

    return (
        <div className="p-4 rounded-3xl bg-[var(--surface-muted)]/40 border border-[var(--border-default)] flex flex-col items-center gap-4">
            <div className="w-full flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl border bg-white overflow-hidden relative shadow-sm">
                    <img src={validUrl} alt={name} className="w-full h-full object-cover" onError={(e) => e.target.src = noImage} />
                    <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] font-black px-1 py-0.5 rounded-tl-md">x{quantity}</div>
                </div>
                <div className="flex-1">
                    <div className="font-black text-sm uppercase leading-tight">{name}</div>
                    <div className="text-[10px] font-bold opacity-40">ITEM VOUCHER</div>
                </div>
                <div className="text-right">
                    <div className="font-black text-[var(--brand-primary)]">₹{parseFloat(totalPrice).toFixed(2)}</div>
                </div>
            </div>

            {/* Item Specific QR - Only show if loading or available */}
            {(loadingQr || qrCode) && (
                <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 flex flex-col items-center gap-2 mt-2 w-full animate-in zoom-in duration-300">
                    {loadingQr ? (
                        <div className="w-32 h-32 flex items-center justify-center">
                            <FiRefreshCw className="animate-spin text-[var(--brand-primary)]" size={24} />
                        </div>
                    ) : (
                        <img src={qrCode} alt="Item QR" className="w-32 h-32 object-contain" />
                    )}
                    {!loadingQr && qrCode && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-30">Voucher QR</p>
                    )}
                </div>
            )}
        </div>
    );
};

const OrderDetails = ({ layout: LayoutComponent }) => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const [order, setOrder] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [fetchedQrData, setFetchedQrData] = useState(null);
    const [qrUnavailable, setQrUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollingRef = useRef(null);

    const fetchOrderDetails = async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);

            const response = await api.get(`/orders/${orderId}`);
            const orderData = response.data.order || response.data;
            setOrder(orderData);

            // Check delivery status
            const isDelivered = ['DELIVERED', 'COMPLETED', 'PICKED_UP'].includes(String(orderData.status).toUpperCase()) ||
                (orderData.delivery_status && ['DELIVERED', 'COMPLETED'].includes(String(orderData.delivery_status).toUpperCase()));

            // ALWAYS fetch QR code on mount/referes regardless of delivery status initially, 
            // because the requirement says "The QR code must persist... fetched ... every time".
            // We will handle the UI visibility logic based on isDelivered status in the render method.
            if (!qrCode && !qrUnavailable) {
                fetchQrCode();
            }

        } catch (err) {
            console.error('Error fetching order:', err);
            if (!isPolling) setError('Failed to load order details.');
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    const fetchQrCode = async () => {
        try {
            // QR Code Fetching Strategy:
            // 1. Try new endpoint first (/orders/:id/qr)
            // 2. If V2 returns 404, silently fall back to V1 (/orders/:id/qr)
            // 3. If both return 404, mark as unavailable and stop retrying
            // 
            // NOTE: You may see ONE red "404 Not Found" line in the browser console
            // when a QR is missing. This is EXPECTED and NORMAL - it's the browser's
            // native network log, not an error in our code.
            let res;
            try {
                res = await api.get(`/orders/${orderId}/qr`);
            } catch (v2Error) {
                if (v2Error.response && v2Error.response.status === 404) {
                    // Silent fallback to v1 using validateStatus
                    res = await api.get(`/orders/${orderId}/qr`, {
                        validateStatus: (status) => status < 500
                    });
                    if (res.status === 404) {
                        setQrCode(null);
                        setQrUnavailable(true);
                        return;
                    }
                    if (res.status !== 200) {
                        throw new Error(`Request failed with status ${res.status}`);
                    }
                } else {
                    throw v2Error;
                }
            }

            const data = res.data || {};
            setFetchedQrData(data);
            let code = data.qrImage || data.qr_code || data.qr || (typeof data === 'string' ? data : null);

            // Handle relative paths
            if (code && typeof code === 'string' && !code.startsWith('data:') && !code.startsWith('http')) {
                code = `${API_BASE_URL}${code.startsWith('/') ? '' : '/'}${code}`;
            }

            setQrCode(code);
        } catch (err) {
            console.error('Error fetching QR:', err);
        }
    };

    const str = (s) => String(s || '');

    useEffect(() => {
        fetchOrderDetails();

        // Poll for status updates (to detect delivery scan)
        pollingRef.current = setInterval(() => {
            fetchOrderDetails(true);
        }, 5000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [orderId]);

    const isDelivered = order && (
        ['DELIVERED', 'COMPLETED', 'PICKED_UP'].includes(str(order.status).toUpperCase()) ||
        (order.delivery_status && ['DELIVERED', 'COMPLETED'].includes(str(order.delivery_status).toUpperCase()))
    );

    const ActualLayout = LayoutComponent || Layout;

    if (loading && !order) return <ActualLayout><Loading /></ActualLayout>;

    if (error) {
        return (
            <ActualLayout>
                <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--surface-main)] text-[var(--text-primary)]">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-4">{error}</h2>
                        <button onClick={() => navigate('/kiosk/my-orders')} className="px-6 py-2 bg-[var(--brand-primary)] text-[var(--text-inverse)] rounded-lg font-bold">Go Back</button>
                    </div>
                </div>
            </ActualLayout>
        );
    }

    if (!order) return null;

    return (
        <ActualLayout>
            <div className="min-h-screen transition-colors duration-300 bg-[var(--surface-main)] text-[var(--text-primary)] no-scrollbar">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

                    {/* Nav */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate('/kiosk/my-orders')}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-muted)]"
                        >
                            <FiChevronLeft size={20} />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">Order #{fetchedQrData?.order_id || order.id}</h1>
                            <p className="text-xs opacity-60 font-medium uppercase tracking-widest">
                                {new Date(order.created_at || order.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border
                    ${isDelivered
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                            {isDelivered ? 'Delivered' : order.status}
                        </div>
                    </div>

                    {/* Content Card */}
                    <div className="rounded-[2rem] overflow-hidden border shadow-xl bg-[var(--surface-card)] border-[var(--border-default)]">

                        {/* QR Section */}
                        <div className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] p-8 sm:p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10"></div>

                            <div className="relative z-10 flex flex-col items-center gap-6">
                                {isDelivered ? (
                                    <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl animate-in zoom-in duration-500">
                                        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white text-4xl mb-4 mx-auto shadow-lg shadow-emerald-500/30">
                                            <FiCheckCircle />
                                        </div>
                                        <h2 className="text-xl font-black uppercase tracking-tight text-emerald-600">Order Delivered!</h2>
                                        <p className="text-sm font-medium text-slate-600 mt-1">Thank you for shopping with us.</p>
                                    </div>
                                ) : qrCode && typeof qrCode === 'string' ? (
                                    <div className="bg-white p-4 rounded-3xl shadow-2xl animate-in zoom-in duration-300">
                                        {/* Heuristic to display QR: can be base64 img or SVG html */}
                                        {qrCode.startsWith('data:image') || qrCode.startsWith('http') ? (
                                            <img src={qrCode} alt="Order QR" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" />
                                        ) : (
                                            <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden" dangerouslySetInnerHTML={{ __html: qrCode }} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-48 h-48 sm:w-64 sm:h-64 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center animate-pulse">
                                        <FaQrcode className="text-white/40 text-6xl" />
                                    </div>
                                )}

                                {!isDelivered && (
                                    <p className="text-black/70 font-bold uppercase tracking-widest text-sm bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
                                        Show this QR to collect order
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="p-6 sm:p-8 space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Order Summary</h3>

                            <div className="space-y-4">
                                {(() => {
                                    const items = (order.items && order.items.length > 0) ? order.items :
                                        (fetchedQrData?.ordered_items && fetchedQrData.ordered_items.length > 0) ? fetchedQrData.ordered_items :
                                            (fetchedQrData?.items && fetchedQrData.items.length > 0) ? fetchedQrData.items :
                                                (order.ordered_items && order.ordered_items.length > 0) ? order.ordered_items :
                                                    (order.dayBills && order.dayBills.length > 0) ? order.dayBills.flatMap(b => b.items || []) :
                                                        (order.Items && order.Items.length > 0) ? order.Items :
                                                            [];

                                    return items.map((item, idx) => (
                                        <VoucherItemDetail key={idx} item={item} order={order} fetchedQrData={fetchedQrData} />
                                    ));
                                })()}
                            </div>

                            <div className="h-px bg-current opacity-10 my-4"></div>

                            <div className="flex justify-between items-center text-lg font-black uppercase tracking-tight">
                                <span>Total Paid</span>
                                <span className="text-[var(--brand-primary)]">₹{parseFloat(order.total_amount || order.amount || 0).toFixed(2)}</span>
                            </div>

                            {order.delivery_address && (
                                <div className="mt-8 pt-6 border-t border-dashed border-[var(--border-default)]">
                                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-3">Delivery Address</h3>
                                    <div className="p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border-default)]">
                                        <p className="text-sm font-medium leading-relaxed">{order.delivery_address}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </ActualLayout>
    );
};

export default OrderDetails;