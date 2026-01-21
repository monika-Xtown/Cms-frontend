import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../config/api.js';
import AdminLayout from '../../components/AdminLayout.jsx';
import Loading from '../../components/Loading.jsx';
import { FaEye, FaPrint, FaCalendarAlt, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { FiSearch, FiMoreVertical, FiChevronDown, FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [activeHeaderDropdown, setActiveHeaderDropdown] = useState(null);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const { user } = useAuth();
  const [sortConfig, setSortConfig] = useState({ key: 'bill_date', direction: 'desc' });
  // Helper to format a JS Date as YYYY-MM-DD using local time (no UTC shift)
  const toLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Default date filter: current month start to 30 days in the future (to include scheduled bills)
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 30);

  const [filters, setFilters] = useState({
    start_date: toLocalDateString(new Date(new Date().setDate(1))),
    end_date: toLocalDateString(defaultEndDate),
    search: '',
    unit_id: '',
    payment_mode: '',
    payment_status: '',
    // order_status: '',
    page: 1,
    limit: 50,
    printer_status: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1
  });
  const { isDark } = useTheme();

  const fetchUnits = useCallback(async () => {
    try {
      const response = await api.get('/units');
      let fetchedUnits = Array.isArray(response.data) ? response.data : (response.data?.units || []);

      if (user?.role === 'unit_admin' && user?.unit_id) {
        fetchedUnits = fetchedUnits.filter(u => u.id === user.unit_id);
      }

      setUnits(fetchedUnits);
    } catch (error) {
      console.error('Fetch units error:', error);
    }
  }, [user]);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
        params.append('startDate', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
        params.append('endDate', filters.end_date);
      }
      if (filters.search && filters.search.trim() !== '') {
        params.append('search', filters.search);
      }
      if (filters.unit_id && filters.unit_id.trim() !== '') {
        params.append('unit_id', filters.unit_id);
        params.append('unitId', filters.unit_id);
      }
      if (filters.payment_mode && filters.payment_mode.trim() !== '') {
        params.append('payment_mode', filters.payment_mode);
        params.append('paymentMode', filters.payment_mode);
      }
      if (filters.payment_status && filters.payment_status.trim() !== '') {
        params.append('payment_status', filters.payment_status);
        params.append('paymentStatus', filters.payment_status);
      }
      /*
      if (filters.order_status && filters.order_status.trim() !== '') {
        params.append('order_status', filters.order_status);
      }
      */
      if (filters.printer_status && filters.printer_status.trim() !== '') {
        params.append('is_printed', filters.printer_status === 'Printed' ? 'true' : 'false');
      }
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      console.log('[Logs Frontend] Fetching bills with filters:', {
        start_date: filters.start_date,
        end_date: filters.end_date,
        unit_id: filters.unit_id,
        payment_mode: filters.payment_mode,
        page: filters.page,
        limit: filters.limit
      });
      console.log('[Logs Frontend] API URL:', `/logs?${params.toString()}`);

      const response = await api.get(`/logs?${params.toString()}`);
      console.log('[Logs Frontend] Response:', {
        logsCount: response.data.logs?.length || 0,
        total: response.data.total,
        page: response.data.page,
        totalPages: response.data.totalPages
      });

      const serverLogs = response.data.logs || response.data.data || [];
      let fetchedLogs = Array.isArray(serverLogs) ? serverLogs : [];

      if (user?.role === 'unit_admin' && user?.unit_id) {
        fetchedLogs = fetchedLogs.filter(log => (log.unit?.id === user.unit_id || log.unit_id === user.unit_id));
      }

      const limitedLogs = fetchedLogs.slice(0, filters.limit);
      setLogs(limitedLogs);

      const serverPage = response.data.page;
      const serverTotal = user?.role === 'unit_admin' ? fetchedLogs.length : (response.data.total || fetchedLogs.length || 0);
      // Safeguard: If server says total is less than what we got, or if it's 101 when we have more, trust the data length for current page context if needed,
      // but usually we trust the server total for global pagination. However, for "Showing X-Y of Z", consistency is key.
      const actualTotal = Math.max(serverTotal, limitedLogs.length + (serverPage - 1) * filters.limit);

      setPagination({
        total: actualTotal,
        page: serverPage,
        totalPages: user?.role === 'unit_admin' ? Math.ceil(actualTotal / filters.limit) : (response.data.totalPages || Math.ceil(actualTotal / filters.limit))
      });
      // Sync filters.page with server response (in case server adjusted the page number)
      if (filters.page !== serverPage) {
        setFilters(prev => ({ ...prev, page: serverPage }));
      }
    } catch (error) {
      console.error('Fetch bills error:', error);
      console.error('Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Immediate fetch for dropdowns/pagination, debounced for search
  useEffect(() => {
    const isSearchChanging = filters.search !== ''; // Simple heuristic
    const delay = isSearchChanging ? 300 : 0;

    const timer = setTimeout(() => {
      fetchBills();
    }, delay);
    return () => clearTimeout(timer);
  }, [
    filters.start_date,
    filters.end_date,
    filters.search,
    filters.unit_id,
    filters.payment_mode,
    filters.payment_status,
    filters.printer_status,
    filters.page,
    filters.limit,
    fetchBills
  ]);

  // Close dropdowns on global click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveHeaderDropdown(null);
      setShowLimitDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleViewBill = async (billId) => {
    if (!billId) {
      console.error('View Bill: No ID provided');
      return;
    }
    try {
      setDetailsLoading(true);
      const response = await api.get(`/logs/${billId}`);
      // Handle potential nested response structures
      const billData = response.data?.bill || response.data?.data || response.data;
      setSelectedBill(billData);
    } catch (error) {
      console.error('Fetch bill details error:', error);
      alert('Failed to load bill details. Please try again.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRetryPrint = async (orderId, billId) => {
    // Removed confirm as per user preference for direct printing
    try {
      await api.post(`/orders/${orderId}/bills/${billId}/print`);
      // Silent success for direct printing flow
      fetchBills();
    } catch (error) {
      console.error('Retry print error:', error);
      alert(error.response?.data?.error || 'Print failed. Please check printer connection.');
    }
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  useEffect(() => {
    if (shouldPrint && selectedBill && !detailsLoading) {
      const timer = setTimeout(() => {
        window.print();
        setShouldPrint(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint, selectedBill, detailsLoading]);

  const handleDownloadOverallPdf = async () => {
    try {
      const params = new URLSearchParams();
      // Apply all current filters to the export
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
        params.append('startDate', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
        params.append('endDate', filters.end_date);
      }
      if (filters.search && filters.search.trim() !== '') params.append('search', filters.search);
      if (filters.unit_id && filters.unit_id.trim() !== '') {
        params.append('unit_id', filters.unit_id);
        params.append('unitId', filters.unit_id);
      }
      if (filters.payment_mode && filters.payment_mode.trim() !== '') {
        params.append('payment_mode', filters.payment_mode);
        params.append('paymentMode', filters.payment_mode);
      }
      if (filters.payment_status && filters.payment_status.trim() !== '') {
        params.append('payment_status', filters.payment_status);
        params.append('paymentStatus', filters.payment_status);
      }
      if (filters.printer_status && filters.printer_status.trim() !== '') {
        params.append('is_printed', filters.printer_status === 'Printed' ? 'true' : 'false');
      }
      // Request all records
      params.append('limit', '10000');
      params.append('page', '1');

      const response = await api.get(`/logs?${params.toString()}`);
      const serverLogs = response.data.logs || response.data.data || [];
      let allLogs = Array.isArray(serverLogs) ? serverLogs : [];

      // Filter for Unit Admin if needed
      if (user?.role === 'unit_admin' && user?.unit_id) {
        allLogs = allLogs.filter(log => (log.unit?.id === user.unit_id || log.unit_id === user.unit_id));
      }

      if (allLogs.length === 0) {
        alert('No logs available to export.');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const leftMargin = 15;
      let y = 20;

      // Report Header
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.setFont(undefined, 'bold');
      pdf.text('SALES / LOGS REPORT', leftMargin, y);
      y += 10;
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.line(leftMargin, y, pageWidth - 15, y);
      y += 10;

      // Report Info
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);
      pdf.text(`Records: ${allLogs.length}`, pageWidth - 15, y, { align: 'right' });

      y += 6;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Filters: ${filters.start_date} to ${filters.end_date}`, leftMargin, y);

      y += 12;

      // Table Header
      pdf.setFillColor(250, 198, 57);
      pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');

      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('S.No', leftMargin + 2, y + 7);
      pdf.text('Date', leftMargin + 15, y + 7);
      pdf.text('Unit', leftMargin + 40, y + 7);
      pdf.text('Menus', leftMargin + 80, y + 7);
      pdf.text('Mode', leftMargin + 120, y + 7);
      pdf.text('Status', leftMargin + 142, y + 7);
      pdf.text('Amount', leftMargin + 180, y + 7, { align: 'right' });

      y += 10;
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      let grandTotal = 0;

      allLogs.forEach((log, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
          // Redraw header
          pdf.setFillColor(250, 198, 57);
          pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text('S.No', leftMargin + 2, y + 7);
          pdf.text('Date', leftMargin + 15, y + 7);
          pdf.text('Unit', leftMargin + 40, y + 7);
          pdf.text('Menus', leftMargin + 80, y + 7);
          pdf.text('Mode', leftMargin + 120, y + 7);
          pdf.text('Status', leftMargin + 142, y + 7);
          pdf.text('Amount', leftMargin + 180, y + 7, { align: 'right' });
          y += 10;
          pdf.setTextColor(30, 41, 59);
          pdf.setFont(undefined, 'normal');
        }

        const sno = String(index + 1);
        const date = formatDate(log.bill_date);
        const unit = log.unit?.name || 'N/A';
        const product = log.product_name || log.product_name_en || log.product?.name_en || 'N/A';
        const mode = log.payment_mode || 'N/A';
        const status = log.payment_status || 'N/A';
        const amount = `INR ${parseFloat(log.amount || 0).toFixed(2)}`;
        grandTotal += parseFloat(log.amount || 0);

        pdf.text(sno, leftMargin + 2, y + 7);
        pdf.text(date, leftMargin + 15, y + 7);
        pdf.text(unit, leftMargin + 40, y + 7);
        pdf.text(product, leftMargin + 80, y + 7);
        pdf.text(mode, leftMargin + 120, y + 7);
        pdf.text(status, leftMargin + 142, y + 7);
        pdf.text(amount, leftMargin + 180, y + 7, { align: 'right' });

        y += 8;
        pdf.setDrawColor(241, 245, 249);
        pdf.line(leftMargin, y, pageWidth - 15, y);
      });

      y += 10;
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('Grand Total:', pageWidth - 60, y);
      pdf.setTextColor(16, 185, 129);
      pdf.text(`INR ${grandTotal.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });

      pdf.save(`logs-report-${filters.start_date}-to-${filters.end_date}.pdf`);
    } catch (error) {
      console.error('Overall PDF Download Error:', error);
      alert('Failed to download overall PDF.');
    }
  };

  const handleResetFilters = () => {
    setFilters({
      start_date: toLocalDateString(new Date(new Date().setDate(1))),
      end_date: toLocalDateString(defaultEndDate),
      search: '',
      unit_id: '',
      payment_mode: '',
      payment_status: '',
      // order_status: '',
      printer_status: '',
      page: 1,
      limit: 50
    });
    setActiveHeaderDropdown(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not printed';
    return new Date(dateString).toLocaleString('en-IN');
  };

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    return logs.filter(log => {
      // Comparison values (handling potential string/number or case mismatches)
      const unitId = String(log.unit?.id || log.unit_id || '');
      const payMode = String(log.payment_mode || '').toUpperCase();
      const payStatus = String(log.payment_status || '').toUpperCase();

      if (filters.unit_id && unitId !== String(filters.unit_id)) return false;
      if (filters.payment_mode && payMode !== String(filters.payment_mode).toUpperCase()) return false;
      if (filters.payment_status && payStatus !== String(filters.payment_status).toUpperCase()) return false;
      // if (filters.order_status && String(log.order_status || '').toUpperCase() !== String(filters.order_status).toUpperCase()) return false;
      if (filters.printer_status) {
        const isPrinted = log.is_printed === true || log.is_printed === 'true' || log.is_printed === 1;
        const filterIsPrinted = filters.printer_status === 'Printed';
        if (isPrinted !== filterIsPrinted) return false;
      }
      return true;
    });
  }, [logs, filters.unit_id, filters.payment_mode, filters.payment_status, filters.order_status, filters.printer_status]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction;
      let valA = a[key];
      let valB = b[key];

      if (key === 'unit') {
        valA = a.unit?.name || '';
        valB = b.unit?.name || '';
      }

      if (key === 'product') {
        valA = a.product_name || a.product_name_en || a.product?.name_en || '';
        valB = b.product_name || b.product_name_en || b.product?.name_en || '';
      }

      /*
      if (key === 'order_status') {
        valA = a.order_status || '';
        valB = b.order_status || '';
      }
      */

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLogs, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading && logs.length === 0) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8 mt-1 landscape:mb-2 animate-slide-up opacity-0">
          <div className="flex items-center gap-3 landscape:gap-2">
            <div className="w-1.5 h-8 landscape:h-6 bg-[var(--brand-primary)] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
            <h1 className="text-2xl sm:text-3xl landscape:text-xl font-bold tracking-[0.1em] text-[var(--text-primary)]">
              {"Logs".split("").map((char, i) => (
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
          <button
            onClick={handleDownloadOverallPdf}
            className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-bold px-6 py-2.5 sm:py-3 landscape:py-0.5 landscape:h-7 rounded-xl flex items-center justify-center gap-3 landscape:gap-1.5 transition-all shadow-lg hover:scale-105 active:scale-95 text-xs sm:text-sm landscape:text-[10px] tracking-wider"
          >
            <FaDownload className="text-lg landscape:text-xs" />
            <span> PDF</span>
          </button>
        </div>

        {/* Global Click-away for Header Dropdowns */}
        {activeHeaderDropdown && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setActiveHeaderDropdown(null)}
          ></div>
        )}

        {/* Filters Section (Under Heading) - Removed outer border */}
        <div
          style={{ animationDelay: '100ms' }}
          className="mb-8 landscape:mb-2 p-4 sm:p-6 landscape:p-2 rounded-2xl bg-[var(--surface-card)] shadow-lg transition-all duration-300 animate-slide-up opacity-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 items-end">

            {/* Date Range Filter Box - Moved to Left */}
            <div className="sm:col-span-2 lg:col-span-5">
              <label className="block text-xs font-medium text-[var(--brand-primary)] mb-2 ml-1 tracking-wider">Date range filter</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 landscape:gap-1 p-2 sm:p-1.5 landscape:p-0.5 rounded-xl bg-[var(--surface-main)] focus-within:bg-[var(--surface-card)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10 transition-all shadow-inner border border-[var(--border-default)]/50 overflow-hidden">
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value, page: 1 })}
                  className="w-full sm:w-auto flex-1 min-w-0 sm:min-w-[110px] bg-transparent border-none text-[var(--text-primary)] text-xs font-medium focus:ring-0 outline-none cursor-pointer px-1 sm:px-2 accent-[var(--brand-primary)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-70 transition-all opacity-80 hover:opacity-100 h-10 sm:h-auto landscape:h-6"
                />
                <span className="text-[var(--brand-primary)] text-[10px] font-medium opacity-60 shrink-0 text-center sm:text-left py-1 sm:py-0">To</span>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value, page: 1 })}
                  className="w-full sm:w-auto flex-1 min-w-0 sm:min-w-[110px] bg-transparent border-none text-[var(--text-primary)] text-xs font-medium focus:ring-0 outline-none cursor-pointer px-1 sm:px-2 accent-[var(--brand-primary)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:hover:opacity-70 transition-all opacity-80 hover:opacity-100 h-10 sm:h-auto landscape:h-6"
                />
                <FaCalendarAlt className="hidden sm:block w-4 h-4 text-[var(--brand-primary)] mr-2 shrink-0 opacity-80" />
              </div>
            </div>

            {/* Compact Reset Button in Corner */}
            <div className="lg:col-span-2 lg:col-start-11 flex justify-end">
              <div className="w-full sm:w-auto">
                <label className="hidden lg:block text-xs font-medium text-transparent mb-2 ml-1 tracking-wider">.</label>
                <button
                  onClick={handleResetFilters}
                  className="w-full px-6 py-3 landscape:py-0.5 landscape:h-7 rounded-xl bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all font-semibold text-xs shadow-lg h-[48px] flex items-center justify-center tracking-widest active:scale-95 whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Units & Modes */}
            {/* <div className="lg:col-span-3 grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-semibold uppercase text-[var(--brand-primary)] mb-2 ml-1 tracking-wider">Unit</label>
                <div className="relative">
                  <select
                    value={filters.unit_id}
                    onChange={(e) => setFilters({ ...filters, unit_id: e.target.value, page: 1 })}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:bg-[var(--surface-card)] focus:ring-4 focus:ring-[var(--brand-primary)]/15 outline-none appearance-none transition-all font-bold text-xs cursor-pointer shadow-inner"
                  >
                    <option value="">All Units</option>
                    {Array.isArray(units) && units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-primary)] pointer-events-none" />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold uppercase text-[var(--brand-primary)] mb-2 ml-1 tracking-wider">Mode</label>
                <div className="relative">
                  <select
                    value={filters.payment_mode}
                    onChange={(e) => setFilters({ ...filters, payment_mode: e.target.value, page: 1 })}
                    className="w-full pl-4 pr-10 py-3 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:bg-[var(--surface-card)] focus:ring-4 focus:ring-[var(--brand-primary)]/15 outline-none appearance-none transition-all font-bold text-xs cursor-pointer shadow-inner"
                  >
                    <option value="">All Modes</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                  <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-primary)] pointer-events-none" />
                </div>
              </div>
            </div> */}


          </div>
        </div>
        <div className={`rounded-xl overflow-hidden bg-[var(--surface-card)] shadow-lg`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-[var(--brand-primary)] text-white">
                <tr className="text-white">
                  <th className="px-4 py-3 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)] w-20">S.No</th>
                  <th className="px-4 py-3 landscape:py-2 text-center text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)]">
                    <div className="flex items-center justify-center gap-2">
                      <span>Bill Date <span className="text-sm landscape:text-[10px] opacity-70">/ ID</span></span>
                    </div>
                  </th>

                  {/* Unit Column with Dropdown */}
                  <th className="px-4 py-3 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)] relative group">
                    <div className="flex items-center justify-between gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => handleSort('unit')}>
                      <span>Unit</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.unit_id) setFilters(prev => ({ ...prev, unit_id: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'unit' ? null : 'unit');
                        }}
                      >
                        <FiFilter className={`text-white transition-all scale-110 drop-shadow-sm ${filters.unit_id ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'unit' && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-medium text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Select Unit</div>
                        <button onClick={() => { setFilters({ ...filters, unit_id: '', page: 1 }); setActiveHeaderDropdown(null); }} className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${!filters.unit_id ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}>All Units</button>
                        {units.map(unit => (
                          <button key={unit.id} onClick={() => { setFilters({ ...filters, unit_id: filters.unit_id === unit.id ? '' : unit.id, page: 1 }); setActiveHeaderDropdown(null); }} className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.unit_id === unit.id ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}>{unit.name}</button>
                        ))}
                      </div>
                    )}
                  </th>

                  <th className="px-4 py-3 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Menus</span>
                    </div>
                  </th>

                  <th className="px-4 py-3 landscape:py-2 text-center text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)]">
                    <div className="flex items-center justify-center gap-2">
                      <span>Qty</span>
                    </div>
                  </th>

                  <th className="px-4 py-3 landscape:py-2 text-right text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)]">
                    <div className="flex items-center justify-end gap-2">
                      <span>Amount</span>
                    </div>
                  </th>

                  {/* Payment Mode Column with Dropdown */}
                  <th className="px-4 py-3 landscape:py-2 text-center text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)] relative group">
                    <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => handleSort('payment_mode')}>
                      <span>Payment Mode</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.payment_mode) setFilters(prev => ({ ...prev, payment_mode: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'mode' ? null : 'mode');
                        }}
                      >
                        <FiFilter className={`text-white transition-all scale-110 drop-shadow-sm ${filters.payment_mode ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'mode' && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Select Mode</div>
                        {['All Modes', 'UPI', 'GUEST', 'FREE'].map(mode => (
                          <button key={mode} onClick={() => {
                            const val = mode === 'All Modes' ? '' : mode;
                            setFilters({ ...filters, payment_mode: filters.payment_mode === val ? '' : val, page: 1 });
                            setActiveHeaderDropdown(null);
                          }} className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.payment_mode === mode || (mode === 'All Modes' && !filters.payment_mode) ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}>{mode}</button>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* Status Column with Dropdown */}
                  <th className="px-4 py-3 landscape:py-2 text-center text-lg sm:text-xl landscape:text-sm tracking-wider border-r border-[var(--border-default)] relative group">
                    <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => handleSort('payment_status')}>
                      <span>Status</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.payment_status) setFilters(prev => ({ ...prev, payment_status: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'status' ? null : 'status');
                        }}
                      >
                        <FiFilter className={`text-white transition-all scale-110 drop-shadow-sm ${filters.payment_status ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'status' && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Select Status</div>
                        {['All Status', 'PAID', 'PENDING', 'FAILED'].map(status => (
                          <button key={status} onClick={() => {
                            const val = status === 'All Status' ? '' : status;
                            setFilters({ ...filters, payment_status: filters.payment_status === val ? '' : val, page: 1 });
                            setActiveHeaderDropdown(null);
                          }} className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.payment_status === status || (status === 'All Status' && !filters.payment_status) ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}>{status}</button>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* 
                  <th className="px-4 py-2 text-center text-sm sm:text-base tracking-wider border-r border-[var(--border-default)] relative group">
                    <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => handleSort('order_status')}>
                      <span>Order Status</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.order_status) setFilters(prev => ({ ...prev, order_status: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'order_status' ? null : 'order_status');
                        }}
                      >
                        <FiFilter className={`text-white transition-all scale-110 drop-shadow-sm ${filters.order_status ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'order_status' && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Select Order Status</div>
                        {['All Status', 'PENDING', 'COMPLETED', 'CANCELLED'].map(status => (
                          <button key={status} onClick={() => {
                            const val = status === 'All Status' ? '' : status;
                            setFilters({ ...filters, order_status: filters.order_status === val ? '' : val, page: 1 });
                            setActiveHeaderDropdown(null);
                          }} className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.order_status === status || (status === 'All Status' && !filters.order_status) ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}>{status}</button>
                        ))}
                      </div>
                    )}
                  </th>
                  */}

                  <th className="px-4 py-3 landscape:py-2 text-center text-base sm:text-lg landscape:text-sm tracking-wider border-r border-[var(--border-default)] relative group">
                    <div className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-70 transition-colors" onClick={() => handleSort('is_printed')}>
                      <span>Printer Status</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.printer_status) setFilters(prev => ({ ...prev, printer_status: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'printer_status' ? null : 'printer_status');
                        }}
                      >
                        <FiFilter className={`text-white transition-all scale-110 drop-shadow-sm ${filters.printer_status ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'printer_status' && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Select Status</div>
                        {['All Status', 'Printed', 'Not Printed'].map(status => (
                          <button key={status} onClick={() => {
                            const val = status === 'All Status' ? '' : status;
                            setFilters({ ...filters, printer_status: filters.printer_status === val ? '' : val, page: 1 });
                            setActiveHeaderDropdown(null);
                          }} className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.printer_status === status || (status === 'All Status' && !filters.printer_status) ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}>{status}</button>
                        ))}
                      </div>
                    )}
                  </th>

                  <th className="px-4 py-3 landscape:py-2 text-center text-lg sm:text-xl landscape:text-sm tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {Array.isArray(sortedLogs) && sortedLogs.map((log, index) => (
                  <tr
                    key={`${log.id}-${log.item_id || 'noitem'}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className="hover:bg-[var(--surface-muted)]/30 transition-colors animate-slide-up opacity-0"
                  >
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs font-medium opacity-60">
                      {(filters.page - 1) * filters.limit + index + 1}
                    </td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs font-medium text-center whitespace-nowrap">
                      <div>{formatDate(log.bill_date)}</div>
                      <div className="text-[10px] landscape:text-[8px] opacity-60 font-mono tracking-wider">#{log.bill_id || log.order_id || log.id}</div>
                    </td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs">{log.unit?.name || 'N/A'}</td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs font-bold text-[var(--text-primary)]">
                      {log.item_name_en || log.product_name || log.product_name_en || log.product?.name_en || 'N/A'}
                    </td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs text-center font-medium">
                      {log.quantity || 1}
                    </td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs text-right font-bold text-emerald-500">₹{parseFloat(log.line_total ?? log.amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-tight ${log.payment_mode === 'CASH' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        log.payment_mode === 'UPI' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20' :
                          log.payment_mode === 'GUEST' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            log.payment_mode === 'FREE' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                              'bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                        }`}>
                        {log.payment_mode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${log.payment_status === 'PAID'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : log.payment_status === 'PENDING'
                            ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                      >
                        {log.payment_status || 'N/A'}
                      </span>
                    </td>
                    {/* 
                    <td className="px-4 py-2 text-sm text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${log.order_status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : log.order_status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20'
                          }`}
                      >
                        {log.order_status || 'N/A'}
                      </span>
                    </td>
                    */}
                    <td className="px-4 py-2 landscape:py-1 text-base landscape:text-xs font-medium text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${log.is_printed
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'}`}>
                        {log.is_printed ? 'Printed' : 'Not Printed'}
                      </span>
                    </td>
                    <td className="px-4 py-2 landscape:py-1 text-center flex justify-center items-center w-20">
                      <div className="flex items-center justify-center gap-2">
                        {/* Direct Print Action - Simplified UI */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryPrint(log.order_id || log.id, log.id);
                          }}
                          className="p-2 landscape:p-1 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all active:scale-90 hover:shadow-md group shadow-sm border border-[var(--brand-primary)]/20"
                          title="Direct Print Bill"
                        >
                          <FaPrint size={16} className="landscape:size-3.5 transition-transform group-hover:scale-110" />
                        </button>

                        {/* View Details and 3-dots Menu Hidden - Simplified Admin Flow */}
                        {/* 
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => { e.stopPropagation(); ... }}
                            ...
                          >
                            <FiMoreVertical size={18} />
                          </button>
                        </div>
                        */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Final Pagination Implementation */}
          <div className="px-6 py-5 landscape:py-2 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border-default)] bg-[var(--surface-card)] gap-4">
            <div className="text-xs sm:text-sm landscape:text-[10px] text-[var(--text-secondary)] font-medium">
              Showing <span className="text-[var(--text-primary)]">{(filters.page - 1) * filters.limit + 1}–{Math.min(filters.page * filters.limit, pagination.total)}</span> of <span className="text-[var(--brand-primary)] font-semibold">{pagination.total}</span> records
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 landscape:gap-2 justify-center">
              <div className="flex items-center gap-2 landscape:gap-1">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, parseInt(pagination.page) - 1) })}
                  disabled={parseInt(pagination.page) <= 1}
                  className="px-4 h-9 landscape:h-7 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-all shadow-sm font-semibold text-[10px] uppercase"
                >
                  <FiChevronLeft size={16} className="landscape:size-3.5" /> Back
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isSelected = parseInt(pagination.page) === pageNum;
                    // Compact display logic for many pages
                    if (pagination.totalPages > 5 && (pageNum > 1 && pageNum < pagination.totalPages && Math.abs(pageNum - parseInt(pagination.page)) > 1)) {
                      if (pageNum === 2 || pageNum === pagination.totalPages - 1) return <span key={pageNum} className="px-1 text-[var(--text-secondary)] opacity-50">...</span>;
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setFilters({ ...filters, page: pageNum })}
                        className={`w-9 h-9 landscape:w-7 landscape:h-7 flex items-center justify-center rounded-xl text-xs landscape:text-[10px] font-semibold transition-all border
                          ${isSelected
                            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-lg scale-105"
                            : "bg-[var(--surface-main)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, parseInt(pagination.page) + 1) })}
                  disabled={parseInt(pagination.page) >= pagination.totalPages}
                  className="px-4 h-9 landscape:h-7 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-all shadow-sm font-semibold text-[10px] uppercase"
                >
                  Next <FiChevronRight size={16} className="landscape:size-3.5" />
                </button>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLimitDropdown(!showLimitDropdown);
                  }}
                  className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl py-2.5 landscape:py-1 text-[12px] landscape:text-[10px] font-semibold text-[var(--text-primary)] cursor-pointer outline-none transition-all shadow-sm flex items-center justify-center relative w-[130px] landscape:w-[100px]"
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

        {/* Bill Details Modal Hidden per user request */}
        {/*
        {selectedBill && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 z-[100] overflow-y-auto transition-all animate-in fade-in duration-300 pt-10 sm:pt-20">
            ... modal content ...
          </div>
        )}
        */}
      </div>

      {/* 
      {activeMenu && createPortal(
        <div className="fixed inset-0 z-[9999]" onClick={() => setActiveMenu(null)}>
          <div
            className="absolute bg-[var(--surface-card)] rounded-xl shadow-2xl border border-[var(--border-default)] py-1 w-44 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
            style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
            onClick={e => e.stopPropagation()}
          >
            ... Action Menu Contents ...
          </div>
        </div>,
        document.body
      )}
      */}
    </AdminLayout>
  );
};

export default Logs;
