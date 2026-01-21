import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import api from '../../config/api.js';
import AdminLayout from '../../components/AdminLayout.jsx';
import Loading from '../../components/Loading.jsx';
import jsPDF from 'jspdf';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const Dashboard = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    monthlyOrders: 0,
    totalRevenue: 0,
    upiCount: 0,
    freeCount: 0,
    guestCount: 0,
    allOrdersCount: 0,
    todayOrders: 0
  });
  const [products, setProducts] = useState([]);
  const [upiData, setUpiData] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const ordersPerPage = 6;

  const toLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [filters, setFilters] = useState({
    start_date: toLocalDateString(new Date()),
    end_date: toLocalDateString(new Date()),
    unit_id: '',
    payment_mode: ''
  });


  const resetFilters = () => {
    setFilters({
      start_date: toLocalDateString(new Date()),
      end_date: toLocalDateString(new Date()),
      unit_id: '',
      payment_mode: ''
    });
  };

  const [units, setUnits] = useState([]);

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

  const [graphData, setGraphData] = useState([]);

  useEffect(() => {
    if (user?.role === 'unit_admin' && user?.unit_id) {
      setFilters(prev => ({ ...prev, unit_id: user.unit_id }));
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
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
      if (filters.unit_id) {
        params.append('unit_id', filters.unit_id);
        params.append('unitId', filters.unit_id);
      }
      if (filters.payment_mode) {
        params.append('payment_mode', filters.payment_mode);
        params.append('paymentMode', filters.payment_mode);
      }

      // Fetch summary stats
      const summaryResp = await api.get(`/dashboard/summary?${params.toString()}`);
      const { modes = {}, overall = {}, products: productSummary = [], billsCount = 0, today = {}, upiDailySeries = [] } = summaryResp.data || {};

      setStats(prev => ({
        ...prev,
        totalBills: billsCount || 0,
        totalRevenue: Number(overall?.total || 0),
        upiCount: modes?.UPI?.count || 0,
        freeCount: modes?.FREE?.count || 0,
        guestCount: modes?.GUEST?.count || 0,
        allOrdersCount: overall?.count || billsCount || 0,
        todayOrders: today?.totalOrders || 0
      }));
      setUpiData(upiDailySeries);

      // setProducts(productSummary || []); // Moved to client-side aggregation below

      // Fetch logs for graph (un-paged or high limit for aggregation)
      const logsParams = new URLSearchParams();
      if (filters.start_date) {
        logsParams.append('start_date', filters.start_date);
        logsParams.append('startDate', filters.start_date);
      }
      if (filters.end_date) {
        logsParams.append('end_date', filters.end_date);
        logsParams.append('endDate', filters.end_date);
      }
      if (filters.unit_id) {
        logsParams.append('unit_id', filters.unit_id);
        logsParams.append('unitId', filters.unit_id);
      }
      if (filters.payment_mode) {
        logsParams.append('payment_mode', filters.payment_mode);
        logsParams.append('paymentMode', filters.payment_mode);
      }
      logsParams.append('limit', '10000'); // Higher limit for better graph accuracy

      const logsResp = await api.get(`/logs?${logsParams.toString()}`);
      const logs = logsResp.data?.logs || logsResp.data || [];

      // Aggregate products from filtered logs
      const productMap = {};
      (Array.isArray(logs) ? logs : []).forEach(log => {
        const key = log.ref_item_id || log.item_name_en || log.item_name || 'unknown';
        if (!productMap[key]) {
          productMap[key] = {
            product_id: log.ref_item_id,
            name_en: log.item_name_en || log.item_name || log.product_name,
            name_ta: log.item_name_ta,
            totalQty: 0,
            totalAmount: 0
          };
        }
        productMap[key].totalQty += Number(log.quantity || 0);
        productMap[key].totalAmount += Number(log.amount || 0);
      });
      const computedProducts = Object.values(productMap).sort((a, b) => b.totalAmount - a.totalAmount);
      setProducts(computedProducts);

      // Aggregate by date (ISO format for sorting)
      const aggregated = (Array.isArray(logs) ? logs : []).reduce((acc, log) => {
        if (!log || !log.bill_date) return acc;
        try {
          const dateKey = new Date(log.bill_date).toISOString().split('T')[0];
          acc[dateKey] = (acc[dateKey] || 0) + parseFloat(log.amount || 0);
        } catch (e) {
          console.warn("Invalid date in log:", log.bill_date);
        }
        return acc;
      }, {});

      // Sort by date key and format for display
      const formattedGraphData = Object.entries(aggregated)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, value]) => ({
          name: new Date(dateKey).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          value
        }));

      setGraphData(formattedGraphData);

    } catch (error) {
      console.error('Fetch stats error:', error);

      // Extract error message
      let errorMessage = 'Failed to load dashboard data';

      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;

        if (status === 403) {
          errorMessage = data?.error || 'Forbidden: Insufficient permissions to view dashboard';

        } else if (status === 401) {
          errorMessage = 'Unauthorized: Please log in again';

        } else if (status === 404) {
          errorMessage = 'Dashboard endpoint not found';
        } else if (data?.error) {
          errorMessage = data.error;
        } else if (data?.message) {
          errorMessage = data.message;
        } else {
          errorMessage = `Error ${status}: ${error.message}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Network error: Unable to reach server';
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred';
      }


    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', ordersPerPage);

      if (filters.unit_id) {
        params.append('unit_id', filters.unit_id);
        params.append('unitId', filters.unit_id);
      }
      if (filters.payment_mode) {
        params.append('payment_mode', filters.payment_mode);
        params.append('paymentMode', filters.payment_mode);
      }

      const ordersResp = await api.get(`/orders?${params.toString()}`);
      const ordersList = ordersResp.data.orders || [];
      const totalPages = ordersResp.data.totalPages || 1;

      setOrders(ordersList);
      setOrdersTotalPages(totalPages);
    } catch (err) {
      console.warn('/orders GET failed:', err.message);
    }
  }, [ordersPerPage, filters.unit_id, filters.payment_mode]);

  useEffect(() => {
    fetchOrders(ordersPage);
  }, [fetchOrders, ordersPage]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExportPdf = () => {
    try {
      if (!products || products.length === 0) {
        alert('No Item data to export for the selected filters.');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const leftMargin = 15;
      let y = 20;

      // Title
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text('DASHBOARD ITEMS SUMMARY', leftMargin, y);
      y += 10;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(leftMargin, y, pageWidth - 15, y);
      y += 10;

      // Filter info
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);

      y += 6;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Date Range: ${filters.start_date} to ${filters.end_date}`, leftMargin, y);

      if (filters.unit_id && Array.isArray(units)) {
        const unit = units.find((u) => String(u.id) === String(filters.unit_id));
        if (unit) {
          y += 6;
          pdf.text(`Unit: ${unit.name}`, leftMargin, y);
        }
      }

      y += 10;

      // Table Header Function
      const drawTableHeader = (posY) => {
        const headerHeight = 10;
        pdf.setFillColor(250, 198, 57); // Yellow #FAC639
        pdf.rect(leftMargin, posY, pageWidth - (leftMargin * 2), headerHeight, 'F');

        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(10);

        // Header Columns
        pdf.text('S.No', leftMargin + 3, posY + 7);
        pdf.text('Item Name', leftMargin + 18, posY + 7);
        pdf.text('Qty', leftMargin + 130, posY + 7, { align: 'right' });
        pdf.text('Amount', leftMargin + 170, posY + 7, { align: 'right' });

        return posY + headerHeight + 2;
      };

      y = drawTableHeader(y);

      // Rows
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(9);

      let grandTotal = 0;
      let totalQty = 0;

      products.forEach((p, index) => {
        const name = p.name_en || p.name || 'Unknown';
        const qty = Number(p.totalQty ?? 0);
        const amount = Number(p.totalAmount ?? 0);

        grandTotal += amount;
        totalQty += qty;

        // Handle text wrap for name
        const maxNameWidth = 90;
        const nameLines = pdf.splitTextToSize(name, maxNameWidth);
        const rowHeight = Math.max(8, nameLines.length * 5) + 4;

        // Pagination Check
        if (y + rowHeight > 280) {
          pdf.addPage();
          y = 20;
          y = drawTableHeader(y);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(30, 41, 59);
          pdf.setFontSize(9);
        }

        // Draw Row
        pdf.text(String(index + 1), leftMargin + 3, y + 5);
        pdf.text(nameLines, leftMargin + 18, y + 5);
        pdf.text(String(qty), leftMargin + 130, y + 5, { align: 'right' });
        pdf.text(`INR ${amount.toFixed(2)}`, leftMargin + 170, y + 5, { align: 'right' });

        // Row Separator Line
        pdf.setDrawColor(241, 245, 249);
        pdf.line(leftMargin, y + rowHeight - 2, pageWidth - 15, y + rowHeight - 2);

        y += rowHeight;
      });

      // Grand Total Footer
      y += 5;
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Grand Total:', leftMargin + 100, y);
      pdf.text(String(totalQty), leftMargin + 130, y, { align: 'right' });
      pdf.setTextColor(22, 163, 74); // Green
      pdf.text(`INR ${grandTotal.toFixed(2)}`, leftMargin + 170, y, { align: 'right' });


      pdf.save(`dashboard-summary-${filters.start_date}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportUpiPdf = () => {
    try {
      if (!upiData || upiData.length === 0) {
        alert('No UPI data to export.');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const leftMargin = 15;
      let y = 20;

      // Title
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text('UPI TRANSACTIONS REPORT', leftMargin, y);
      y += 10;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(leftMargin, y, pageWidth - 15, y);
      y += 10;

      // Filter info
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);
      y += 6;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Date Range: ${filters.start_date} to ${filters.end_date}`, leftMargin, y);
      y += 10;

      // Headers
      const headerHeight = 10;
      pdf.setFillColor(250, 198, 57);
      pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), headerHeight, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Date', leftMargin + 3, y + 7);
      pdf.text('Count', leftMargin + 80, y + 7, { align: 'center' });
      pdf.text('Amount', leftMargin + 160, y + 7, { align: 'right' });
      y += headerHeight + 2;

      // Rows
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(30, 41, 59);

      let totalCount = 0;
      let totalAmount = 0;

      upiData.forEach((day, index) => {
        totalCount += day.count;
        totalAmount += day.amount;

        pdf.text(new Date(day.date).toLocaleDateString(), leftMargin + 3, y + 5);
        pdf.text(String(day.count), leftMargin + 80, y + 5, { align: 'center' });
        pdf.text(`INR ${day.amount.toFixed(2)}`, leftMargin + 160, y + 5, { align: 'right' });

        pdf.setDrawColor(241, 245, 249);
        pdf.line(leftMargin, y + 8, pageWidth - 15, y + 8);
        y += 10;
      });

      // Total
      y += 5;
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Total:', leftMargin + 50, y);
      pdf.text(String(totalCount), leftMargin + 80, y, { align: 'center' });
      pdf.setTextColor(22, 163, 74);
      pdf.text(`INR ${totalAmount.toFixed(2)}`, leftMargin + 160, y, { align: 'right' });

      pdf.save(`upi-report-${filters.start_date}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF.');
    }
  };

  const barData = useMemo(() => {
    if (!products.length) return { max: 1, columns: [] };
    const sorted = [...products].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    const max = Math.max(...sorted.map((p) => p.totalAmount || 0), 1);
    // Always spread across 2–3 columns to avoid a long single stack
    const columnCount = sorted.length > 9 ? 3 : 2;
    const columns = Array.from({ length: columnCount }, () => []);
    sorted.forEach((item, idx) => {
      columns[idx % columnCount].push(item);
    });
    return { max, columns };
  }, [products]);

  if (loading) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }

  const Card = ({ children }) => (
    <div
      className="rounded-2xl border p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-1 bg-[var(--surface-card)] border-[var(--border-default)] hover:border-[var(--brand-primary)] hover:shadow-xl hover:shadow-[var(--brand-primary)]/10"
    >
      {children}
    </div>
  );

  return (
    <AdminLayout>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10 animate-slide-up opacity-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
            <h1 className="text-xl sm:text-2xl font-medium tracking-[0.1em] text-[var(--text-primary)]">
              {"Dashboard".split("").map((char, i) => (
                <span
                  key={i}
                  className="animate-letter-pop"
                  style={{ animationDelay: `${300 + (i * 50)}ms` }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </h1>
          </div>
        </div>

        <div id="dashboard-print-area" className="space-y-6 sm:space-y-8">
          {/* 1. Filters Section */}
          <div className="bg-[var(--surface-card)] p-6 rounded-2xl border border-[var(--border-default)] shadow-sm mb-8">
            <div className="flex flex-row justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Filters</h3>
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] flex items-center gap-1 transition-colors uppercase"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Reset Filters
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group">
                <label className="block text-xs font-bold text-[var(--text-primary)] opacity-60 mb-2 ml-1 uppercase tracking-widest">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    className="w-full bg-[var(--surface-main)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--brand-primary)] outline-none shadow-sm transition-all appearance-none cursor-pointer pr-10"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-[var(--text-primary)] opacity-60 mb-2 ml-1 uppercase tracking-widest">End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    className="w-full bg-[var(--surface-main)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--brand-primary)] outline-none shadow-sm transition-all appearance-none cursor-pointer pr-10"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-[var(--text-primary)] opacity-60 mb-2 ml-1 uppercase tracking-widest">Select Unit</label>
                <div className="relative">
                  <select
                    value={filters.unit_id}
                    onChange={(e) => setFilters({ ...filters, unit_id: e.target.value })}
                    disabled={user?.role === 'unit_admin'}
                    className="w-full bg-[var(--surface-main)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--brand-primary)] outline-none shadow-sm transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                  >
                    <option value="">All Units</option>
                    {Array.isArray(units) && units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="group">
                <label className="block text-xs font-bold text-[var(--text-primary)] opacity-60 mb-2 ml-1 uppercase tracking-widest">Mode</label>
                <div className="relative">
                  <select
                    value={filters.payment_mode}
                    onChange={(e) => setFilters({ ...filters, payment_mode: e.target.value })}
                    className="w-full bg-[var(--surface-main)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:border-[var(--brand-primary)] outline-none shadow-sm transition-all appearance-none cursor-pointer pr-10"
                  >
                    <option value="">All Modes</option>
                    <option value="UPI">UPI</option>
                    <option value="FREE">Free</option>
                    <option value="GUEST">Guest</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] opacity-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-6">
            {[
              { label: 'Today Orders', value: stats.todayOrders },
              { label: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}` },
              { label: 'Total Bills', value: stats.allOrdersCount },
              { label: 'UPI', value: stats.upiCount, onClick: () => setShowUpiModal(true) },
              { label: 'FREE', value: stats.freeCount },
              { label: 'GUEST', value: stats.guestCount },
            ].map((item, index) => (
              <div
                key={item.label}
                onClick={() => document.getElementById('upi-report-section')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ animationDelay: `${index * 100}ms` }}
                className={`relative rounded-xl p-4 sm:p-6 min-h-[100px] sm:min-h-[140px] flex flex-col justify-center items-center transition-all duration-300 hover:-translate-y-1 overflow-hidden bg-[var(--surface-card)] border border-[var(--border-default)] border-l-4 border-l-[var(--brand-primary)] shadow-sm hover:shadow-md group animate-slide-up opacity-0 ${item.label === 'UPI' ? 'cursor-pointer hover:ring-2 hover:ring-[var(--brand-primary)]' : ''}`}
              >
                <div className="relative z-10 text-[10px] sm:text-xs tracking-[0.2em] font-bold mb-1 sm:mb-2 font-sans text-[var(--text-secondary)] text-center uppercase">{item.label}</div>
                <div className="relative z-10 text-xl sm:text-3xl font-bold font-sans text-[var(--text-primary)] drop-shadow-sm text-center">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Order Cards Section */}
          <div className="flex flex-col gap-6">
            {/* Recent Orders Section Commented Out
            <div className="flex justify-between items-center px-1">
              <h2
                style={{ animationDelay: '100ms' }}
                className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] animate-slide-up opacity-0"
              >Recent Orders (Today)</h2>
              <button
                onClick={() => navigate('/admin/logs')}
                className="text-xs font-bold text-[#facc15] hover:text-white flex items-center gap-1 transition-colors uppercase italic"
              >
                VIEW ALL ORDERS <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orders.filter(order => {
                const todayStr = toLocalDateString(new Date());
                const orderDate = order.created_at || order.order_date || (order.dayBills && order.dayBills[0]?.bill_date);
                return orderDate && toLocalDateString(new Date(orderDate)) === todayStr;
              }).slice(0, 8).map((order, index) => {
                // Flatten items from dayBills -> v2Items
                const items = order.dayBills?.flatMap(bill => bill.v2Items || []) || order.order_items || order.variants || [];

                // Determine display name
                let displayTitle = "Order Item";
                if (items.length > 0) {
                  const firstItem = items[0];
                  displayTitle = firstItem.variant?.product?.name ||
                    firstItem.product?.name ||
                    firstItem.name ||
                    "Unknown Product";
                } else {
                  displayTitle = `Order #${order.id}`;
                }

                const itemCount = items.length;
                const extraCount = itemCount > 1 ? `+${itemCount - 1} more` : "";

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate("/admin/logs")}
                    style={{ animationDelay: `${(index + 5) * 50}ms` }}
                    className="group cursor-pointer bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 hover:shadow-lg hover:border-[var(--brand-primary)]/50 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden animate-scale-in opacity-0"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-muted)] px-2 py-1 rounded">
                        {order.code || `#${order.id}`}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${String(order.status).toLowerCase() === 'paid' ? 'bg-green-100 text-green-700' :
                        String(order.status).toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {order.status || 'Pending'}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[var(--text-primary)] truncate pr-2 mb-1">
                      {displayTitle}
                    </h3>

                    {extraCount && (
                      <p className="text-xs text-[var(--text-secondary)] font-medium mb-3">
                        {extraCount}
                      </p>
                    )}

                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-[var(--border-default)]">
                      <div>
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Total</p>
                        <p className="text-sm font-bold text-[var(--brand-primary)]">₹{Number(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] group-hover:bg-[var(--brand-primary)] group-hover:text-white flex items-center justify-center transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                      </div>
                    </div>
                  </div>
                );
              })}

              {orders.filter(order => {
                const todayStr = toLocalDateString(new Date());
                const orderDate = order.created_at || order.order_date || (order.dayBills && order.dayBills[0]?.bill_date);
                return orderDate && toLocalDateString(new Date(orderDate)) === todayStr;
              }).length === 0 && (
                  <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed border-[var(--border-default)] rounded-xl">
                    No orders found for today.
                  </div>
                )}
            </div>
            */}

            {/* 4. Top Products Section */}
            <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1 h-6 bg-[#facc15] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.4)]"></div>
                    <h2 className="text-[26px] font-bold tracking-[0.2em] text-[#facc15] ">Items</h2>
                  </div>
                  <p className="text-base font-bold text-white ml-4">Top Items</p>
                </div>
                <button
                  onClick={handleExportPdf}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold px-6 py-2.5 rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  Download PDF
                </button>
              </div>



              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest border-b border-[var(--border-default)] font-sans">
                      <th className="pb-4 px-2 text-left">ITEMS</th>
                      <th className="pb-4 px-2 text-center">QUANTITY</th>
                      <th className="pb-4 px-2 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {Array.isArray(products) && products.map((product) => (
                      <tr key={product.product_id} className="group hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="py-4 px-2 text-[var(--text-primary)] font-medium text-sm">
                          {product.name_en || product.name || 'Unknown'}
                          {product.name_ta && <span className="block text-xs opacity-60 font-sans">{product.name_ta}</span>}
                        </td>
                        <td className="py-4 px-2 text-center text-[var(--text-primary)] text-sm">{product.totalQty}</td>
                        <td className="py-4 px-2 text-right text-[var(--brand-primary)] font-bold text-sm">₹{product.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {products.length === 0 && (
                <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-2xl bg-black/10 mt-4">
                  <p className="text-lg font-medium opacity-50">No Item sales data found.</p>
                </div>
              )}
            </div>

            {/* 5. Products Performance Section (Progress Bars) */}
            <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] shadow-sm mb-6">
              <div className="mb-8">
                <h2 className="text-[26px] font-bold tracking-[0.2em] text-[#facc15] uppercase mb-1">Items</h2>
                <p className="text-base font-bold text-[var(--text-primary)] mb-0.5">Item amount</p>
                <p className="text-sm text-[var(--text-secondary)]">All Item shown; split across columns</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                {barData.columns.map((column, colIdx) => (
                  <div key={colIdx} className="space-y-6">
                    {column.map((product) => {
                      const percentage = (product.totalAmount / (stats.totalRevenue || 1)) * 100;
                      return (
                        <div key={product.product_id} className="group">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[15px] font-medium text-[var(--text-primary)] truncate pr-4">
                              {product.name_en}
                            </span>
                            <span className="text-[15px] font-bold text-[var(--brand-primary)]">
                              ₹{product.totalAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                              style={{ width: `${Math.min(percentage * 4, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {products.length === 0 && (
                <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-2xl bg-black/10">
                  <p className="text-lg font-medium opacity-50">No Items sales data found.</p>
                </div>
              )}
            </div>

          </div>

          {/* 
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-medium tracking-tight mb-3">Overall Report</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium text-slate-400 tracking-[0.2em]">Summary</span>
                  <select className={`text-xs p-1.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-gray-50 border-gray-300'} focus:border-[#f97316] outline-none`}>
                    <option>Yearly Summary</option>
                    <option>Monthly Summary</option>
                    <option>Last 6 Months</option>
                    <option>Last 3 Months</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 text-xs font-bold mt-4 sm:mt-0">
                <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)] shadow-[0_0_8px_rgba(0,0,0,0.2)]"></span> Revenue
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--text-secondary)]"></span> Goal
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `₹ ${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '8px',
                      color: isDark ? '#f1f5f9' : '#0f172a'
                    }}
                    itemStyle={{ color: 'var(--brand-primary)' }}
                    formatter={(value) => [`₹ ${parseFloat(value).toFixed(2)}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--brand-primary)"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
          */}
        </div>

        {/* UPI Transactions Card */}
        <div id="upi-report-section" className="mt-8 space-y-6">
          <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-1 h-6 bg-[var(--brand-primary)] rounded-full shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.4)]"></div>
                  <h2 className="text-[26px] font-bold tracking-[0.2em] text-[var(--brand-primary)] ">UPI Report</h2>
                </div>
                {/* <p className="text-base font-bold text-[var(--text-primary)] ml-4">Daily Breakdown</p> */}
              </div>
              <button
                onClick={handleExportUpiPdf}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold px-6 py-2.5 rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                Download PDF
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest border-b border-[var(--border-default)]">
                    <th className="pb-4 px-2">DATE</th>
                    <th className="pb-4 px-2 text-center">TRANSACTIONS</th>
                    <th className="pb-4 px-2 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {upiData.map((day, idx) => (
                    <tr key={idx} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="py-4 px-2 text-[var(--text-primary)] font-medium text-sm">
                        {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-2 text-center text-[var(--text-primary)] text-sm">{day.count}</td>
                      <td className="py-4 px-2 text-right text-[var(--brand-primary)] font-bold text-sm">₹{Number(day.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  {upiData.length === 0 && (
                    <tr>
                      <td colSpan="3" className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-2xl bg-black/10">
                        <p className="text-lg font-medium opacity-50">No UPI transaction data found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 border-t border-[var(--border-default)] bg-[var(--surface-muted)]/30 rounded-2xl flex justify-between items-center text-sm">
              <span className="font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">Total UPI Business</span>
              <div className="flex gap-8">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold">COUNT</span>
                  <span className="font-bold text-[var(--text-primary)] text-lg">{upiData.reduce((sum, d) => sum + d.count, 0)} </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold">REVENUE</span>
                  <span className="font-black text-[var(--brand-primary)] text-xl">₹{upiData.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
};

export default Dashboard;
