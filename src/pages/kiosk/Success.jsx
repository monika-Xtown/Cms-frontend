import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext.jsx';
import successGif from '../../assets/success.gif';
import { useTheme } from '../../context/ThemeContext.jsx';
import api, { API_BASE_URL } from '../../config/api.js';
import { FiPrinter, FiHome, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

const VoucherBill = ({ bill, order, initialQr }) => {
  const [qrCode, setQrCode] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchBillQR = async () => {
      if (!order?.id || !bill?.id) return;
      if (isMounted) setLoadingQr(true);
      try {
        // Try bill-specific endpoint
        const res = await api.get(`/orders/${order.id}/qr?bill_id=${bill.id}`, {
          validateStatus: (status) => status < 500
        });

        if (res.status === 200) {
          const data = res.data || {};
          let rawCode = data.qrImage || data.qr_code || data.qr || (typeof data === 'string' ? data : null);

          // Find specific bill in array if it was returned
          if (data.items && Array.isArray(data.items)) {
            const billData = data.items.find(i => i.bill_id === bill.id);
            if (billData) rawCode = billData.qrImage || billData.qr_code || billData.qr;
          }

          if (rawCode && typeof rawCode === 'string' && !rawCode.startsWith('data:') && !rawCode.startsWith('http')) {
            rawCode = `${API_BASE_URL}${rawCode.startsWith('/') ? '' : '/'}${rawCode}`;
          }
          if (isMounted) setQrCode(rawCode);
        }
      } catch (err) {
        // Fallback to initial order QR
        if (initialQr && isMounted) {
          let raw = initialQr;
          if (!raw.startsWith('data:') && !raw.startsWith('http')) {
            raw = `${API_BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
          }
          setQrCode(raw);
        }
      } finally {
        if (isMounted) setLoadingQr(false);
      }
    };

    fetchBillQR();
    return () => { isMounted = false; };
  }, [order.id, bill.id, initialQr]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)]">
      <div className="flex justify-between items-center text-xs">
        <div>
          <span className="font-bold opacity-80">Bill #{bill.id}</span>
          <span className="text-[10px] opacity-60 ml-2">{bill.bill_date}</span>
        </div>
        <span className="font-mono font-bold">₹{parseFloat(bill.amount || 0).toFixed(2)}</span>
      </div>
      {(loadingQr || qrCode) && (
        <div className="bg-white p-2 rounded-xl self-center shadow-sm border border-slate-50 animate-in zoom-in duration-300">
          {loadingQr ? (
            <div className="w-20 h-20 flex items-center justify-center">
              <FiRefreshCw className="animate-spin text-amber-500" size={16} />
            </div>
          ) : (
            <img src={qrCode} alt="Bill QR" className="w-20 h-20 object-contain" />
          )}
        </div>
      )}
    </div>
  );
};

const Success = ({ layout: LayoutComponent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetOrder } = useOrder();
  const {
    order,
    qrImage: initialQrImage,
    printResults: initialPrintResults,
    printWarning: initialPrintWarning,
    paymentDetails
  } = location.state || {};
  const { isDark } = useTheme();
  const [countDown, setCountDown] = useState(30); // Use 30s to allow for automatic printing
  const [printing, setPrinting] = useState(false);
  const [printResults, setPrintResults] = useState(initialPrintResults || []);
  const [printWarning, setPrintWarning] = useState(initialPrintWarning || false);
  // Helper to sanitize and prefix QR image paths
  const sanitizeQr = (code) => {
    if (!code || typeof code !== 'string') return code;
    if (code.startsWith('data:') || code.startsWith('http')) return code;
    return `${API_BASE_URL}${code.startsWith('/') ? '' : '/'}${code}`;
  };

  const [qrCode, setQrCode] = useState(() => sanitizeQr(initialQrImage || paymentDetails?.qrImage || null));
  const [fetchingQR, setFetchingQR] = useState(false);
  const [qrUsed, setQrUsed] = useState(false);
  const [dayBills, setDayBills] = useState(order?.dayBills || paymentDetails?.dayBills || []);

  // Debug: Log payment response data
  useEffect(() => {
    console.log("✅ Payment Success Page Loaded");
    console.log("📦 Order Data:", order);
    console.log("📄 Day Bills:", dayBills);
    console.log("🔲 QR Image Available:", !!qrCode);
    console.log("💳 Payment Details:", paymentDetails);
  }, []);

  const fetchQRCode = async (specifiedId) => {
    const targetId = specifiedId || order?.id;
    if (!targetId) return;

    // If already marked used, don't keep fetching
    if (qrUsed) return;

    setFetchingQR(true);
    try {
      const res = await api.get(`/orders/${targetId}/qr`);

      // Detection of usage
      if (res.data?.is_used) {
        setQrUsed(true);
        setQrCode(null); // Clear QR if used
      } else if (res.data?.qrImage || res.data?.qr || res.data?.qr_code) {
        setQrCode(sanitizeQr(res.data.qrImage || res.data.qr || res.data.qr_code));
      }
    } catch (err) {
      console.error("Error fetching QR Code:", err);
    } finally {
      setFetchingQR(false);
    }
  };

  const handleReturn = () => {
    resetOrder();
    navigate('/kiosk/products');
  };

  const handlePrintBills = async () => {
    if (!order || printing) return;

    setPrinting(true);
    setPrintResults([]);
    setPrintWarning(false);

    try {
      const bills = dayBills || [];
      const orderId = order.id;

      if (bills.length === 0) {
        console.warn("No dayBills found in order for auto-printing:", order);
        setPrinting(false);
        return;
      }

      const results = [];
      for (const bill of bills) {
        if (!bill || !bill.id) {
          console.warn("Skipping bill with missing identity:", bill);
          continue;
        }
        let success = false;
        let errorMsg = "";

        // Try standard print endpoint first
        try {
          await api.post(`/orders/${orderId}/bills/${bill.id}/print`);
          success = true;
        } catch (err) {
          console.warn(`Standard print failed for bill ${bill.id}, trying V2...`, err.response?.data);
          // Try V2 fallback as a speculative fix for "Unauthorized"
          try {
            await api.post(`/orders/${orderId}/bills/${bill.id}/print`);
            success = true;
          } catch (v2Err) {
            console.error(`V2 print also failed for bill ${bill.id}:`, v2Err.response?.data);
            errorMsg = v2Err.response?.data?.error || v2Err.message;
          }
        }

        results.push({ billId: bill.id, success, error: errorMsg });
      }

      setPrintResults(results);
      if (results.some(r => !r.success)) {
        setPrintWarning(true);
      }
    } catch (err) {
      console.error("Print process failed:", err);
    } finally {
      setPrinting(false);
    }
  };

  // Automatic printing and QR polling
  useEffect(() => {
    if (order && order.id) {
      handlePrintBills();
      fetchQRCode(order.id);

      // Polling for QR usage status every 4 seconds
      const pollInterval = setInterval(() => {
        if (!qrUsed) {
          fetchQRCode(order.id);
        }
      }, 4000);

      return () => clearInterval(pollInterval);
    }
  }, [order?.id, qrUsed]);

  useEffect(() => {
    // Clear cart immediately on success page entry if we have an order
    if (order && order.id) {
      resetOrder();
    }

    const timer = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleReturn();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Layout>
      <div className="min-h-screen flex items-start sm:items-center justify-center overflow-y-auto p-4 sm:p-6 md:p-8 bg-[var(--surface-main)] text-[var(--text-primary)] no-scrollbar">
        <div className="animate-scale-in rounded-2xl shadow-2xl p-6 sm:p-8 md:p-12 max-w-2xl w-full text-center border bg-[var(--surface-card)] border-[var(--border-default)]">
          <img src={successGif} alt="Success" className="h-24 sm:h-32 mx-auto mb-4 sm:mb-6 animate-scale-in" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 tracking-tight text-[var(--brand-primary)] animate-fade-in">
            Payment Successful!
          </h1>

          <div className="mb-8 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 flex items-center justify-center gap-2 mx-auto w-fit animate-slide-up stagger-1 opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <FiCheckCircle className="text-xl" />
            <span className="font-semibold uppercase tracking-wider text-sm">Order Confirmed</span>
          </div>

          {printWarning && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-400/40 text-red-600 animate-slide-up">
              <p className="text-sm font-semibold">
                ⚠️ Printing failed for some bills.
              </p>
              <p className="text-xs mt-1 opacity-80">
                The order is saved. Please contact the counter for manual bill.
              </p>
            </div>
          )}

          {order && (
            <div className="mb-8 p-6 rounded-2xl bg-[var(--surface-muted)]/30 border border-[var(--border-default)] space-y-4 text-left animate-slide-up stagger-2 opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="flex justify-between items-center text-sm">
                <span className="opacity-60 font-medium tracking-tight text-[var(--text-secondary)]">Order ID:</span>
                <span className="font-black text-lg text-[var(--brand-primary)] uppercase font-mono tracking-widest">{order.id || order.code || 'N/A'}</span>
              </div>

              {/* Day Bills Information */}
              {dayBills && dayBills.length > 0 && (
                <div className="border-t border-b border-[var(--border-default)] py-4 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Individual Day Vouchers ({dayBills.length})</p>
                  {dayBills.map((bill, idx) => (
                    <VoucherBill key={bill.id || idx} bill={bill} order={order} initialQr={qrCode} />
                  ))}
                </div>
              )}

              {/* Added: Order Items Listing */}
              <div className="border-t border-b border-[var(--border-default)] py-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Items Purchased</p>
                {(order.v2Items || dayBills?.flatMap(b => b.v2Items || []) || []).map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-bold opacity-80">{item.product_name || item.name || 'Item'} x {item.quantity || 1}</span>
                    <span className="font-mono">₹{parseFloat(item.price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm pt-2">
                <span className="opacity-60 font-medium tracking-tight text-[var(--text-secondary)]">Total Amount:</span>
                <span className="font-black text-xl text-[var(--text-primary)]">₹{order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          )}

          {/* QR Code Section */}
          <div className="mb-8 flex flex-col items-center animate-slide-up stagger-3 opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <div className="bg-white p-4 sm:p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col items-center group relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--brand-primary)]/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>

              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] mb-4 relative">Digital Pick-up Receipt</p>

              {fetchingQR && !qrCode ? (
                <div className="w-48 h-48 sm:w-60 sm:h-60 bg-slate-50 rounded-3xl flex flex-col items-center justify-center animate-pulse gap-3 border-2 border-dashed border-slate-100">
                  <FiRefreshCw className="animate-spin text-amber-500" size={32} />
                  <p className="text-[9px] font-black text-slate-400 uppercase">Checking QR...</p>
                </div>
              ) : qrUsed ? (
                <div className="w-48 h-48 sm:w-60 sm:h-60 bg-rose-50 rounded-3xl flex flex-col items-center justify-center border-2 border-rose-100 p-6 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3 text-rose-500">
                    <FiCheckCircle size={24} />
                  </div>
                  <p className="text-xs font-black text-rose-600 uppercase tracking-widest">QR already used</p>
                  <p className="text-[9px] font-bold text-rose-400 mt-1">Verified at counter</p>
                </div>
              ) : qrCode ? (
                <div className="relative p-2 bg-white rounded-2xl border-2 border-slate-50 group-hover:border-amber-100 transition-all group-hover:scale-[1.02]">
                  <img src={qrCode} alt="Order QR" className="w-48 h-48 sm:w-60 sm:h-60 object-contain rounded-xl" />
                </div>
              ) : (
                <div className="w-48 h-48 sm:w-60 sm:h-60 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 text-center p-6">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">QR Preview Unavailable</p>
                </div>
              )}

              <div className="mt-5 text-center">
                <p className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest">Show this at the counter</p>
                <div className="h-1.5 w-12 bg-[var(--brand-primary)]/20 rounded-full mx-auto mt-2"></div>
              </div>
            </div>
          </div>

          {printResults.length > 0 && (
            <div className="mb-10 p-5 rounded-2xl border border-[var(--border-default)] text-left bg-[var(--surface-muted)] animate-slide-up">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 pl-1">Print Status Report</p>
              <div className="space-y-3">
                {printResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <FiPrinter className={result.success ? "text-emerald-500" : "text-gray-400"} />
                      <span className="font-medium opacity-80 uppercase tracking-tight">Bill #{result.billId || 'N/A'}</span>
                    </div>
                    <span className={`font-black tracking-tighter ${result.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {result.success ? '✓ SUCCESS' : '✕ FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up stagger-4 opacity-0" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <button
              onClick={handlePrintBills}
              disabled={printing || !order}
              className={`flex-1 px-8 py-5 text-lg font-bold rounded-2xl transition-all flex items-center justify-center gap-3 ${printing
                ? "bg-[var(--surface-muted)] text-[var(--text-secondary)] cursor-not-allowed"
                : "bg-[var(--text-primary)] text-[var(--surface-main)] hover:scale-[1.02] shadow-2xl active:scale-95"
                }`}
            >
              {printing ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FiPrinter />
                  Retry Print
                </>
              )}
            </button>

            <button
              onClick={handleReturn}
              className="px-8 py-5 text-lg font-bold rounded-2xl transition-all border-2 border-[var(--border-default)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center gap-3 active:scale-95 group"
            >
              <FiHome className="group-hover:rotate-12 transition-transform" />
              Done ({countDown}s)
            </button>
          </div>
        </div>
      </div>
    </Layout >
  );
};

export default Success;

