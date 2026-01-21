// export default AdminReports;
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import api from "../../config/api.js";
import AdminLayout from "../../components/AdminLayout.jsx";
import Loading from "../../components/Loading.jsx";
import jsPDF from "jspdf";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    FiBarChart2, FiBox, FiShoppingCart, FiUsers, FiSettings,
    FiArrowUpRight, FiArrowDownRight, FiChevronDown, FiFilter,
    FiActivity, FiGrid, FiClock, FiCamera, FiTrash2, FiRefreshCcw,
    FiChevronLeft, FiChevronRight, FiUpload, FiSmartphone, FiUser, FiGift, FiPieChart, FiUserCheck
} from "react-icons/fi";
import { FaCalendarAlt, FaDownload } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { Fragment } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

const AdminReports = () => {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Parse tab from URL if present
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || "reconciliation";

    const [activeTab, setActiveTab] = useState(initialTab);
    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState([]);
    const [filters, setFilters] = useState({
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        unit_id: "",
        role: "all",
        search: "",
    });
    const [localSearch, setLocalSearch] = useState("");

    // Data states
    const [overallStats, setOverallStats] = useState(null);
    const [productStats, setProductStats] = useState([]);
    const [orderStats, setOrderStats] = useState([]);
    const [userStats, setUserStats] = useState({
        total: 0,
        active: 0,
        roles: [],
    });
    const [unitStats, setUnitStats] = useState([]);
    const [unitOverall, setUnitOverall] = useState(null);
    const [employeePerformance, setEmployeePerformance] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [empPage, setEmpPage] = useState(1);
    const [productEmployeeMap, setProductEmployeeMap] = useState({});
    const [expandedProduct, setExpandedProduct] = useState(null);
    const [ordersList, setOrdersList] = useState([]);
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersPageSize, setOrdersPageSize] = useState(6);
    const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
    const [showRoleFilter, setShowRoleFilter] = useState(false);
    const EMP_PAGE_SIZE = 10;

    const handleExportPdf = () => {
        try {
            if (!productStats || productStats.length === 0) {
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
            pdf.text('ITEM SUMMARY', leftMargin, y);
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

            productStats.forEach((p, index) => {
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


            pdf.save(`reconciliation-products-${filters.start_date}.pdf`);
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Failed to export PDF. Please try again.');
        }
    };
    const fetchUnits = useCallback(async () => {
        try {
            const resp = await api.get("/units");
            let fetchedUnits = Array.isArray(resp.data) ? resp.data : resp.data?.units || [];

            if (user?.role === 'unit_admin' && user?.unit_id) {
                fetchedUnits = fetchedUnits.filter(u => u.id === user.unit_id);
            }

            setUnits(fetchedUnits);
        } catch (err) {
            console.error("Fetch units failed", err);
        }
    }, [user]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: filters.start_date,
                end_date: filters.end_date,
                unit_id: filters.unit_id,
            });

            // 1. Fetch Summary
            const summaryResp = await api.get(`/dashboard/summary?${params.toString()}`);
            const summaryData = summaryResp.data;
            setOverallStats(summaryData);

            const summaryProducts = summaryData.products || [];
            const validProducts = summaryProducts
                .filter(p => Number(p.totalQty || 0) > 0)
                .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));

            // Map payment mode quantities from orders and unit-wise items
            const modeMaps = { CASH: {}, UPI: {}, GUEST: {}, FREE: {} };

            // 1. Process Order Data (Most Accurate Mapping)
            (summaryData.orders || []).forEach(o => {
                const mode = (o.payment_mode || o.paymentMode || "").toUpperCase();
                if (mode && modeMaps[mode]) {
                    const orderItems = [];
                    if (o.items) orderItems.push(...o.items);
                    if (o.dayBills) o.dayBills.forEach(b => orderItems.push(...(b.items || [])));

                    orderItems.forEach(i => {
                        const pid = i.product_id || i.id;
                        if (pid) {
                            modeMaps[mode][pid] = (modeMaps[mode][pid] || 0) + (i.quantity || 1);
                        }
                    });
                }
            });

            // 2. Fallback: Unit Stat Distribution
            // If order items were empty, attribute unit items to their dominant/only mode
            (summaryData.unitStats || []).forEach(u => {
                const uItems = u.items || u.itemsList || [];
                const modes = u.modes || {};
                const activeModes = Object.keys(modes).filter(m => (modes[m]?.total || modes[m] || 0) > 0);

                if (activeModes.length === 1) {
                    const m = activeModes[0].toUpperCase();
                    if (modeMaps[m]) {
                        uItems.forEach(i => {
                            const pid = i.product_id || i.id;
                            if (pid && !modeMaps[m][pid]) { // Only if not found in orders
                                modeMaps[m][pid] = (modeMaps[m][pid] || 0) + (i.quantity || 1);
                            }
                        });
                    }
                }
            });

            const enrichedProducts = validProducts.map(p => ({
                ...p,
                cashQty: modeMaps.CASH[p.product_id] || 0,
                upiQty: modeMaps.UPI[p.product_id] || 0,
                guestQty: modeMaps.GUEST[p.product_id] || 0,
                freeQty: modeMaps.FREE[p.product_id] || 0
            }));

            setProductStats(enrichedProducts);

            // Populate Employee Performance and Orders from Summary
            setEmployeePerformance(summaryData.employees || []);
            setOrdersList(summaryData.orders || []);


            // 2. Fetch Unit Stats
            let rawUnitStats = summaryData.unitStats || [];
            if (!rawUnitStats.length) {
                try {
                    const unitStatsResp = await api.get(`/dashboard/unit-stats?${params.toString()}`);
                    setUnitOverall(unitStatsResp.data.overall || null);
                    rawUnitStats = unitStatsResp.data.unitStats || unitStatsResp.data.unit_stats || [];
                } catch (e) {
                    console.warn("Unit Stats fetch specific failed", e);
                }
            }

            const unitPerformance = rawUnitStats.map((u) => {
                const modes = u.modes || u.payment_modes || {};
                const getModeVal = (key) => {
                    const val = modes[key];
                    if (typeof val === 'object' && val !== null) return parseFloat(val.total || 0);
                    return parseFloat(val || 0);
                };

                return {
                    unit_id: u.unit_id,
                    name: u.name || u.unit_name,
                    revenue: parseFloat(u.revenue || 0),
                    orders: parseInt(u.count || u.order_count || 0),
                    items: parseInt(u.itemCount || u.item_count || 0),
                    itemsList: u.items || [],
                    cashTotal: getModeVal('CASH'),
                    cashCount: parseInt(modes.CASH?.count || 0),
                    upiTotal: getModeVal('UPI'),
                    upiCount: parseInt(modes.UPI?.count || 0),
                    guestTotal: getModeVal('GUEST'),
                    guestCount: parseInt(modes.GUEST?.count || 0),
                    freeTotal: getModeVal('FREE'),
                    freeCount: parseInt(modes.FREE?.count || 0),
                };
            })
                .sort((a, b) => b.revenue - a.revenue);
            setUnitStats(unitPerformance);

        } catch (err) {
            console.error("Fetch data failed", err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (user?.role === 'unit_admin' && user?.unit_id) {
            setFilters(prev => ({ ...prev, unit_id: user.unit_id }));
        }
    }, [user]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset pagination when searching
    useEffect(() => {
        setEmpPage(1);
    }, [filters.search, localSearch]);

    // Filtered Data Calculations
    const filteredProductStats = useMemo(() => {
        let data = productStats || [];
        if (localSearch) {
            const lowerSearch = localSearch.toLowerCase();
            data = data.filter(p =>
                (p.name || "").toLowerCase().includes(lowerSearch) ||
                (p.product_id || "").toString().toLowerCase().includes(lowerSearch)
            );
        }
        return data;
    }, [productStats, localSearch]);

    const filteredEmployeePerformance = useMemo(() => {
        let data = employeePerformance || [];
        if (localSearch) {
            const lowerSearch = localSearch.toLowerCase();
            data = data.filter(e =>
                (e.name || "").toLowerCase().includes(lowerSearch) ||
                (e.empCode || "").toLowerCase().includes(lowerSearch)
            );
        }
        return data;
    }, [employeePerformance, localSearch]);

    const filteredUnitStats = useMemo(() => {
        let data = unitStats || [];
        if (localSearch) {
            const lowerSearch = localSearch.toLowerCase();
            data = data.filter(u =>
                (u.name || "").toLowerCase().includes(lowerSearch)
            );
        }
        return data;
    }, [unitStats, localSearch]);

    const exportPDF = (title, data, columns) => {
        const doc = new jsPDF("l", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. Header Styling
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text(title.toUpperCase() + " REPORT", 14, 22);

        // Line below title
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 28, pageWidth - 14, 28);

        // 2. Sub-header info
        const now = new Date();
        const generatedOn = now.toLocaleString("en-IN", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: true
        });

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text(`Generated On: ${generatedOn}`, 14, 38);
        doc.text(`Total Records: ${data.length}`, pageWidth - 50, 38);

        let y = 48;
        const headerHeight = 12;

        const drawTableHeader = () => {
            doc.setFillColor(250, 198, 57); // #fac639
            doc.rect(14, y, pageWidth - 28, headerHeight, "F");

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");

            // Draw Headers
            doc.text("S.No", 17, y + 7.5);
            columns.forEach((col) => {
                doc.text(col.header, col.x, y + 7.5);
            });
        };

        drawTableHeader();
        y += headerHeight;

        // 3. Table Body
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        data.forEach((row, index) => {
            if (y > 180) {
                doc.addPage();
                y = 20;
                drawTableHeader();
                y += headerHeight;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(51, 65, 85);
            }

            // Row Content
            doc.text((index + 1).toString(), 17, y + 7);

            columns.forEach((col) => {
                let val = row[col.key];

                // Format numbers/currency
                if (col.key.toLowerCase().includes('amount') || col.key.toLowerCase().includes('revenue') || col.key.toLowerCase().includes('_amt')) {
                    const num = parseFloat(val);
                    val = isNaN(num) ? val : "₹" + num.toLocaleString("en-IN");
                }

                doc.text(String(val || "-"), col.x, y + 7);
            });

            // Row divider
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.1);
            doc.line(14, y + 10, pageWidth - 14, y + 10);

            y += 10;
        });

        doc.save(`${title.toLowerCase().replace(/\s+/g, "_")}_report.pdf`);
    };

    const tabs = [
        { id: "overall", label: "Overall", icon: FiPieChart },
        // { id: "items", label: "Items", icon: FiBox },
        // { id: "orders", label: "Orders", icon: FiShoppingCart },
        // { id: "users", label: "Users", icon: FiUserCheck },
        // { id: "employees", label: "Employees", icon: FiUsers },
        { id: "reconciliation", label: "Summary Hub", icon: FiActivity },
    ];

    const Card = ({ title, children, extra, noPadding }) => (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[2.5rem] shadow-2xl shadow-black/5 dark:shadow-none overflow-hidden relative transition-all duration-500 group/card">
            <div className={`p-6 sm:p-10 ${noPadding ? 'pb-0' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-2.5 h-10 bg-[var(--brand-primary)] rounded-full" />
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)] uppercase">{title}</h3>
                    </div>
                    {extra && <div className="w-full sm:w-auto">{extra}</div>}
                </div>
                <div className="relative z-10">{children}</div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover/card:bg-[var(--brand-primary)]/10 transition-colors" />
        </div>
    );

    const StatCard = ({ label, value, trend, icon: Icon, gradient }) => (
        <div
            className={`p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group shadow-2xl transition-all duration-500 md:hover:-translate-y-2 md:hover:shadow-3xl active:scale-95 ${gradient}`}
        >
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-white/80 mb-3">
                        {label}
                    </p>
                    <h4 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{value}</h4>
                    {trend !== undefined && (
                        <div
                            className={`flex items-center gap-1.5 mt-5 text-[10px] font-black px-3 py-1.5 rounded-xl bg-white/20 text-white backdrop-blur-md w-fit`}
                        >
                            {trend > 0 ? <FiArrowUpRight /> : <FiArrowDownRight />}
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 text-white backdrop-blur-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Icon size={24} />
                </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
        </div>
    );

    if (loading && !overallStats)
        return (
            <AdminLayout>
                <div className="h-[60vh] flex items-center justify-center">
                    <Loading />
                </div>
            </AdminLayout>
        );

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8 mt-1 animate-slide-up opacity-0">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-[var(--brand-primary)] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.1em] text-[var(--text-primary)]">
                            {"Overall Report".split("").map((char, i) => (
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
                </div>

                {/* Filters Section (Logs Style) */}
                <div
                    style={{ animationDelay: '100ms' }}
                    className="mb-8 p-4 sm:p-8 rounded-3xl bg-[var(--surface-card)] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-[var(--border-default)] animate-slide-up opacity-0"
                >
                    <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-end">
                        {/* Date Range Filter Box */}
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-white mb-2 ml-1 tracking-wider">
                                Start Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) =>
                                        setFilters({ ...filters, start_date: e.target.value })
                                    }
                                    className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-main)] text-[var(--text-primary)] focus:bg-[var(--surface-card)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 border border-[var(--border-default)]/50 appearance-none transition-all font-bold text-xs cursor-pointer shadow-inner pr-10"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] opacity-50">
                                    <FaCalendarAlt />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-bold text-white mb-2 ml-1 tracking-wider">
                                End Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) =>
                                        setFilters({ ...filters, end_date: e.target.value })
                                    }
                                    className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-main)] text-[var(--text-primary)] focus:bg-[var(--surface-card)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 border border-[var(--border-default)]/50 appearance-none transition-all font-bold text-xs cursor-pointer shadow-inner pr-10"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)] opacity-50">
                                    <FaCalendarAlt />
                                </div>
                            </div>
                        </div>

                        {/* Unit Filter */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-[var(--brand-primary)] mb-3 ml-1 uppercase tracking-[0.2em] opacity-70">
                                Select Unit
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.unit_id}
                                    onChange={(e) => setFilters({ ...filters, unit_id: e.target.value })}
                                    disabled={user?.role === 'unit_admin'}
                                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[var(--surface-main)] text-[var(--text-primary)] focus:bg-[var(--surface-card)] focus:ring-4 focus:ring-[var(--brand-primary)]/10 border border-[var(--border-default)]/50 appearance-none transition-all font-bold text-xs cursor-pointer shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">All Units</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--brand-primary)] pointer-events-none opacity-60" />
                            </div>
                        </div>
                        {/* Search Filter - Show for all tabs except maybe overall, users, and reconciliation */}
                        {activeTab !== "overall" && activeTab !== "users" && activeTab !== "reconciliation" && (
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-[var(--brand-primary)] mb-3 ml-1 uppercase tracking-[0.2em] opacity-70">
                                    Search {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                                </label>
                                <div className="flex items-center p-2 rounded-2xl bg-[var(--surface-main)] focus-within:bg-[var(--surface-card)] focus-within:ring-4 focus-within:ring-[var(--brand-primary)]/10 transition-all shadow-inner border border-[var(--border-default)]/50 overflow-hidden w-full">
                                    <input
                                        type="text"
                                        placeholder={`Search by ${activeTab === 'products' ? 'name or ID' : activeTab === 'employees' ? 'name or ID' : 'name'}...`}
                                        value={activeTab === 'orders' ? filters.search : localSearch}
                                        onChange={(e) => {
                                            if (activeTab === 'orders') {
                                                setFilters({ ...filters, search: e.target.value });
                                            } else {
                                                setLocalSearch(e.target.value);
                                            }
                                        }}
                                        className="w-full bg-transparent border-none text-[var(--text-primary)] text-xs font-bold focus:ring-0 outline-none placeholder:font-normal placeholder:opacity-50"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Tabs - Only show if more than 1 tab */}
                {tabs.length > 1 && (
                    <div
                        style={{ animationDelay: '200ms' }}
                        className="bg-[var(--surface-card)] border border-[var(--border-default)] p-1 sm:p-1.5 rounded-3xl flex gap-0.5 sm:gap-1 mb-8 sm:mb-12 overflow-x-auto no-scrollbar shadow-inner animate-slide-up opacity-0"
                    >
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setLocalSearch("");
                                    if (tab.id !== 'orders' && filters.search) {
                                        setFilters(prev => ({ ...prev, search: "" }));
                                    }
                                }}
                                className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-xs lg:text-xs uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0 sm:flex-1 ${activeTab === tab.id
                                    ? "bg-gradient-to-r from-[var(--brand-primary)] to-amber-500 text-white shadow-lg shadow-[var(--brand-primary)]/20 scale-100 sm:scale-[1.02]"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                <tab.icon
                                    size={16}
                                    className={`${activeTab === tab.id ? "animate-pulse" : ""
                                        } hidden sm:block`}
                                />
                                <span className="block">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
                    {activeTab === "overall" && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                <StatCard
                                    label="Total Revenue"
                                    value={`₹${overallStats?.overall?.total?.toLocaleString() || 0}`}
                                    trend={12}
                                    icon={FiBarChart2}
                                    gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
                                />
                                <StatCard
                                    label="Total Bills"
                                    value={overallStats?.billsCount || 0}
                                    trend={8}
                                    icon={FiShoppingCart}
                                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                                />
                                <StatCard
                                    label="Item Sales"
                                    value={productStats.reduce((sum, p) => sum + (p.totalQty || 0), 0)}
                                    trend={5}
                                    icon={FiBox}
                                    gradient="bg-gradient-to-br from-purple-600 to-fuchsia-700"
                                />
                                <StatCard
                                    label="Active Staff"
                                    value={employeePerformance.length}
                                    trend={4}
                                    icon={FiUsers}
                                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2">
                                    <Card title="Revenue Distribution">
                                        <div className="h-[300px] md:h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart
                                                    data={orderStats}
                                                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                                >
                                                    <defs>
                                                        <linearGradient
                                                            id="colorRev"
                                                            x1="0"
                                                            y1="0"
                                                            x2="0"
                                                            y2="1"
                                                        >
                                                            <stop
                                                                offset="5%"
                                                                stopColor="var(--brand-primary)"
                                                                stopOpacity={0.8}
                                                            />
                                                            <stop
                                                                offset="95%"
                                                                stopColor="var(--brand-primary)"
                                                                stopOpacity={0}
                                                            />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid
                                                        strokeDasharray="3 3"
                                                        vertical={false}
                                                        stroke={isDark ? "#334155" : "#e2e8f0"}
                                                    />
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{
                                                            fill: "#94a3b8",
                                                            fontSize: 11,
                                                            fontWeight: "bold",
                                                        }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                                                        tickFormatter={(v) => `₹${v}`}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            borderRadius: "16px",
                                                            border: "none",
                                                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                                                            backgroundColor: isDark ? "#1e293b" : "#fff",
                                                        }}
                                                        itemStyle={{
                                                            fontWeight: "bold",
                                                            color: "var(--brand-primary)",
                                                        }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="revenue"
                                                        stroke="var(--brand-primary)"
                                                        strokeWidth={4}
                                                        fill="url(#colorRev)"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                </div>

                                <Card title="Payment Split">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        {
                                                            name: "UPI",
                                                            value: overallStats?.modes?.UPI?.total || 0,
                                                            color: "#3b82f6"
                                                        },
                                                        {
                                                            name: "GUEST",
                                                            value: overallStats?.modes?.GUEST?.total || 0,
                                                            color: "#f59e0b"
                                                        },
                                                        {
                                                            name: "FREE",
                                                            value: overallStats?.modes?.FREE?.total || 0,
                                                            color: "#8b5cf6"
                                                        },
                                                    ].filter((m) => m.value > 0)}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {[
                                                        { name: "UPI", value: overallStats?.modes?.UPI?.total || 0, color: "#3b82f6" },
                                                        { name: "GUEST", value: overallStats?.modes?.GUEST?.total || 0, color: "#f59e0b" },
                                                        { name: "FREE", value: overallStats?.modes?.FREE?.total || 0, color: "#8b5cf6" },
                                                    ].filter((m) => m.value > 0).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => `₹${value.toLocaleString()}`}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mt-4 space-y-4 border-t border-[var(--border-default)] pt-4">
                                        <div
                                            style={{ animationDelay: '200ms' }}
                                            className="flex justify-between items-center bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 animate-slide-up opacity-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                                                    UPI Payment
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm text-blue-500">
                                                    ₹
                                                    {overallStats?.modes?.UPI?.total?.toLocaleString() ||
                                                        0}
                                                </p>
                                                <p className="text-[10px] font-bold opacity-40">
                                                    {overallStats?.modes?.UPI?.count || 0} Bills
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            style={{ animationDelay: '300ms' }}
                                            className="flex justify-between items-center bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 animate-slide-up opacity-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                                                    Guest Payment
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm text-amber-500">
                                                    ₹
                                                    {overallStats?.modes?.GUEST?.total?.toLocaleString() ||
                                                        0}
                                                </p>
                                                <p className="text-[10px] font-bold opacity-40">
                                                    {overallStats?.modes?.GUEST?.count || 0} Bills
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            style={{ animationDelay: '400ms' }}
                                            className="flex justify-between items-center bg-purple-500/5 p-3 rounded-xl border border-purple-500/10 animate-slide-up opacity-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                                <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                                                    Free Meal
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm text-purple-500">
                                                    ₹
                                                    {overallStats?.modes?.FREE?.total?.toLocaleString() ||
                                                        0}
                                                </p>
                                                <p className="text-[10px] font-bold opacity-40">
                                                    {overallStats?.modes?.FREE?.count || 0} Bills
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </>
                    )}

                    {activeTab === "items" && (
                        <Card
                            title="Items"
                            extra={
                                <button
                                    onClick={() =>
                                        exportPDF("Item Performance", filteredProductStats, [
                                            { header: "Item", key: "name_en", x: 35 },
                                            { header: "Unit", key: "unit_name", x: 100 },
                                            { header: "UPI (Qty/Amt)", key: "upiSummary", x: 130 },
                                            { header: "Guest (Qty/Amt)", key: "guestSummary", x: 180 },
                                            { header: "Free (Qty/Amt)", key: "freeSummary", x: 230 },
                                            { header: "Revenue", key: "totalAmount", x: 280 },
                                        ])
                                    }
                                    className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-6 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 text-xs sm:text-sm tracking-wider"
                                >
                                    <FaDownload className="text-lg" />
                                    <span>PDF</span>
                                </button>
                            }
                        >
                            {/* Table View */}
                            <div className="overflow-x-auto border border-[var(--border-default)] rounded-3xl overflow-hidden mb-2">
                                <table className="w-full border-separate border-spacing-0 min-w-[1000px]">
                                    <thead className="bg-[var(--brand-primary)] text-[var(--text-inverse)] text-xs sm:text-sm uppercase tracking-wider font-bold">
                                        <tr className="text-[var(--text-inverse)]">
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center border-r border-black/10 w-10 sm:w-14">
                                                #
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-left border-r border-black/10">
                                                Item
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center border-r border-black/10">
                                                UPI
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center border-r border-black/10">
                                                GUEST
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center border-r border-black/10">
                                                FREE
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-center border-r border-black/10">
                                                UNIT
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right border-r border-black/10">
                                                Revenue
                                            </th>
                                            <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                                                Performance
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-default)]">
                                        {filteredProductStats.map((p, index) => {
                                            const isExpanded = expandedProduct === p.product_id;
                                            const staffStats = Object.values(
                                                productEmployeeMap[p.product_id] || {}
                                            ).sort((a, b) => b.totalAmt - a.totalAmt);

                                            return (
                                                <Fragment key={p.product_id}>
                                                    <tr
                                                        onClick={() =>
                                                            setExpandedProduct(
                                                                isExpanded ? null : p.product_id
                                                            )
                                                        }
                                                        style={{ animationDelay: `${index * 30}ms` }}
                                                        className={`group cursor-pointer transition-all animate-slide-up opacity-0 ${isExpanded
                                                            ? "bg-[var(--surface-muted)]"
                                                            : "hover:bg-[var(--surface-muted)]/30"
                                                            }`}
                                                    >
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                                            {isExpanded ? (
                                                                <FiChevronDown className="text-black" />
                                                            ) : (
                                                                <FiChevronRight className="opacity-40" />
                                                            )}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                            <div>
                                                                <p className="font-bold text-xs sm:text-base tracking-tight text-[var(--text-primary)]">
                                                                    {p.name || p.name_en}
                                                                </p>
                                                                {p.name_ta && (
                                                                    <p className="text-xs font-medium text-[var(--text-secondary)] opacity-70">
                                                                        {p.name_ta}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs sm:text-base font-bold text-blue-500">
                                                                    ₹{(p.upiAmt || 0).toLocaleString()}
                                                                </span>
                                                                <span className="text-[10px] sm:text-xs font-medium opacity-60">
                                                                    {p.upiQty}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs sm:text-base font-bold text-amber-500">
                                                                    ₹{(p.guestAmt || 0).toLocaleString()}
                                                                </span>
                                                                <span className="text-[10px] sm:text-xs font-medium opacity-60">
                                                                    {p.guestQty}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-xs sm:text-base font-bold text-purple-500">
                                                                    ₹{(p.freeAmt || 0).toLocaleString()}
                                                                </span>
                                                                <span className="text-[10px] sm:text-xs font-medium opacity-60">
                                                                    {p.freeQty}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                                            <span className="inline-block px-2 sm:px-3 py-1 bg-[var(--surface-muted)] rounded-lg text-[10px] sm:text-sm font-bold text-[var(--text-primary)]">
                                                                {p.unit_name}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-bold text-xs sm:text-base text-emerald-500">
                                                            ₹{(p.totalAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 sm:gap-3">
                                                                <span className="text-[10px] font-bold opacity-40">
                                                                    {Math.round(
                                                                        (p.totalAmount /
                                                                            (Math.max(
                                                                                ...productStats.map(
                                                                                    (ps) => ps.totalAmount
                                                                                )
                                                                            ) || 1)) *
                                                                        100
                                                                    )}
                                                                    %
                                                                </span>
                                                                <div className="w-16 sm:w-24 bg-[var(--surface-muted)] h-2 rounded-full overflow-hidden shadow-inner">
                                                                    <div
                                                                        className="bg-gradient-to-r from-[var(--brand-primary)] to-amber-500 h-full rounded-full"
                                                                        style={{
                                                                            width: `${Math.min(
                                                                                (p.totalAmount /
                                                                                    (Math.max(
                                                                                        ...productStats.map(
                                                                                            (ps) => ps.totalAmount
                                                                                        )
                                                                                    ) || 1)) *
                                                                                100,
                                                                                100
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr className="bg-[var(--surface-muted)]/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <td colSpan="8" className="p-0">
                                                                <div className="px-6 sm:px-10 lg:px-20 py-8 border-l-4 border-[var(--brand-primary)] bg-[var(--surface-card)] shadow-inner">
                                                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border-default)]">
                                                                        <div>
                                                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-1">
                                                                                Staff Performance Breakdown
                                                                            </h3>
                                                                            <p className="text-xs text-[var(--text-secondary)] opacity-60">
                                                                                Sales distribution across all active payment modes for this item
                                                                            </p>
                                                                        </div>
                                                                        <div className="bg-[var(--brand-primary)]/5 px-4 py-2 rounded-2xl border border-[var(--brand-primary)]/10">
                                                                            <span className="text-[10px] font-bold uppercase opacity-40 mr-2">Total Sales:</span>
                                                                            <span className="text-sm font-black text-[var(--brand-primary)]">₹{p.totalAmount.toLocaleString()}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                                        {staffStats.length > 0 ? staffStats.map((staff) => (
                                                                            <div key={staff.id} className="bg-[var(--surface-muted)]/30 rounded-3xl p-5 border border-[var(--border-default)]/50 hover:border-[var(--brand-primary)]/30 transition-all group/staff">
                                                                                <div className="flex justify-between items-start mb-6">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-lg group-hover/staff:scale-110 transition-transform">
                                                                                            {staff.name.charAt(0)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)]">
                                                                                                {staff.empCode}
                                                                                            </p>
                                                                                            <p className="font-bold text-sm text-[var(--text-primary)]">
                                                                                                {staff.name}
                                                                                            </p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Items Sold</p>
                                                                                        <p className="text-sm font-black text-[var(--brand-primary)]">{staff.totalQty}</p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                                    <div className="bg-blue-500/5 p-3 rounded-2xl border border-blue-500/10">
                                                                                        <p className="text-[9px] font-black text-blue-600 uppercase mb-1">UPI</p>
                                                                                        <p className="text-xs font-black text-blue-500">₹{staff.upiAmt.toLocaleString()}</p>
                                                                                        <p className="text-[9px] font-bold opacity-40 mt-1">{staff.upiQty} Qty</p>
                                                                                    </div>
                                                                                    <div className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                                                                                        <p className="text-[9px] font-black text-amber-600 uppercase mb-1">GUEST</p>
                                                                                        <p className="text-xs font-black text-amber-500">₹{staff.guestAmt.toLocaleString()}</p>
                                                                                        <p className="text-[9px] font-bold opacity-40 mt-1">{staff.guestQty} Qty</p>
                                                                                    </div>
                                                                                    <div className="bg-purple-500/5 p-3 rounded-2xl border border-purple-500/10">
                                                                                        <p className="text-[9px] font-black text-purple-600 uppercase mb-1">FREE</p>
                                                                                        <p className="text-xs font-black text-purple-500">₹{staff.freeAmt.toLocaleString()}</p>
                                                                                        <p className="text-[9px] font-bold opacity-40 mt-1">{staff.freeQty} Qty</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )) : (
                                                                            <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-40">
                                                                                <FiUsers size={40} className="mb-4" />
                                                                                <p className="text-sm font-bold uppercase tracking-widest">No detailed breakdowns available</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>


                        </Card>
                    )
                    }

                    {
                        activeTab === "orders" && (
                            <>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-10">
                                    <div className="lg:col-span-2">
                                        <Card title="Order Trends">
                                            <div className="h-[300px] md:h-[450px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={orderStats}
                                                        margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            vertical={false}
                                                            stroke={isDark ? "#334155" : "#e2e8f0"}
                                                        />
                                                        <XAxis
                                                            dataKey="date"
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{
                                                                fill: "#94a3b8",
                                                                fontSize: 10,
                                                                fontWeight: "bold",
                                                            }}
                                                            dy={10}
                                                        />
                                                        <YAxis
                                                            axisLine={false}
                                                            tickLine={false}
                                                            tick={{ fill: "#94a3b8", fontSize: 10 }}
                                                        />
                                                        <Tooltip
                                                            cursor={{
                                                                fill: "var(--brand-primary)",
                                                                opacity: 0.1,
                                                            }}
                                                            contentStyle={{
                                                                borderRadius: "16px",
                                                                border: "none",
                                                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                                                                backgroundColor: isDark ? "#1e293b" : "#fff",
                                                            }}
                                                        />
                                                        <Bar
                                                            dataKey="revenue"
                                                            fill="var(--brand-primary)"
                                                            radius={[6, 6, 6, 6]}
                                                            barSize={30}
                                                        />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-blue-800 text-white shadow-2xl relative overflow-hidden group">
                                            <FiShoppingCart className="absolute -right-8 -bottom-8 text-white/5 size-40 group-hover:scale-110 transition-transform duration-700" />
                                            <div className="relative z-10">
                                                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-8 border-b border-white/10 pb-4">
                                                    Order Analytics
                                                </p>
                                                <div className="space-y-8">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 opacity-50">
                                                            Avg Order Value
                                                        </p>
                                                        <p className="text-4xl font-black">
                                                            ₹
                                                            {(
                                                                (overallStats?.overall?.total || 0) /
                                                                (overallStats?.billsCount || 1)
                                                            ).toFixed(0)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 opacity-50">
                                                            Peak Performance
                                                        </p>
                                                        <p className="text-2xl font-black">
                                                            {orderStats.length > 0
                                                                ? [...orderStats].sort(
                                                                    (a, b) => b.revenue - a.revenue
                                                                )[0].date
                                                                : "N/A"}
                                                        </p>
                                                    </div>
                                                    <div className="pt-4 border-t border-white/10">
                                                        <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                                                            <FiArrowUpRight size={20} />
                                                            <span>Growing 14% vs Prev Period</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Card title="All Orders">
                                    {/* Table View */}
                                    <div className="overflow-x-auto border border-[var(--border-default)] rounded-3xl overflow-hidden mb-10">
                                        <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                                            <thead className="bg-[var(--brand-primary)] text-[var(--text-inverse)] sticky top-0 z-10 w-full table-header-group">
                                                <tr className="text-[var(--text-inverse)]">
                                                    <th className="px-6 py-4 text-left text-base font-bold tracking-wider border-r border-black/10">
                                                        Order Code
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10 relative group">
                                                        <div className="flex items-center justify-center gap-2 cursor-pointer" onClick={() => setShowRoleFilter(!showRoleFilter)}>
                                                            <span>Customer</span>
                                                            <FiFilter className={`w-4 h-4 ${filters.role !== 'all' ? 'text-black fill-black' : 'text-black/50'}`} strokeWidth={3} />
                                                        </div>

                                                        {/* Role Filter Dropdown */}
                                                        {showRoleFilter && (
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-[var(--border-default)] overflow-hidden z-20 animate-in slide-in-from-top-2 fade-in duration-200">
                                                                <div className="py-1">
                                                                    {['all', 'user', 'employee', 'admin'].map((role) => (
                                                                        <button
                                                                            key={role}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setFilters({ ...filters, role });
                                                                                setShowRoleFilter(false);
                                                                            }}
                                                                            className={`w-full px-4 py-2 text-left text-xs font-bold uppercase tracking-wider hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-colors flex items-center justify-between
                                       ${filters.role === role ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/5' : 'text-[var(--text-primary)]'}
                                     `}
                                                                        >
                                                                            {role === 'all' ? 'All Roles' : role}
                                                                            {filters.role === role && <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Overlay to close when clicking outside - simplified inline or could rely on parent click handler if needed, but simple toggle for now */}
                                                        {showRoleFilter && (
                                                            <div className="fixed inset-0 z-10 cursor-default" onClick={() => setShowRoleFilter(false)} />
                                                        )}
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10">
                                                        Date
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10">
                                                        Unit
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10">
                                                        UPI
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10">
                                                        Guest
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10">
                                                        Free
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base font-bold tracking-wider border-r border-black/10">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-base font-bold tracking-wider">
                                                        Total Amount
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-default)]">
                                                {ordersList.slice((ordersPage - 1) * ordersPageSize, ordersPage * ordersPageSize).map((order, idx) => {
                                                    const totalItems = (order.dayBills || []).reduce((sum, bill) => sum + (bill.items || []).length, 0);

                                                    // Resolve Name: User Username -> Employee Username -> Emp Code -> Walk-in
                                                    let customerName = order.user?.username;
                                                    if (!customerName) {
                                                        const linkedEmp = allEmployees.find(e => e.id === order.employee_id || e.emp_code === order.emp_code);
                                                        customerName = linkedEmp?.username || order.emp_code || "Walk-in";
                                                    }

                                                    const amount = parseFloat(order.total_amount || 0);

                                                    return (
                                                        <tr
                                                            key={order.id || idx}
                                                            style={{ animationDelay: `${idx * 30}ms` }}
                                                            className="hover:bg-[var(--surface-muted)]/30 transition-all animate-slide-up opacity-0"
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-base text-[var(--text-primary)]">
                                                                        {order.code || `#${order.id}`}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="text-sm font-medium text-[var(--text-secondary)]">
                                                                    {customerName}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="text-sm font-medium text-[var(--text-secondary)]">
                                                                    {new Date(order.createdAt).toLocaleDateString("en-IN")}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="inline-block px-2 py-0.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded text-[10px] font-bold uppercase">
                                                                    {order.unit?.name || order.unit?.code || "-"}
                                                                </span>
                                                            </td>

                                                            {/* UPI Column */}
                                                            <td className="px-6 py-4 text-center">
                                                                {order.payment_mode === "UPI" ? (
                                                                    <span className="font-bold text-base text-blue-500">
                                                                        ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-sm font-medium opacity-30">-</span>
                                                                )}
                                                            </td>
                                                            {/* Guest Column */}
                                                            <td className="px-6 py-4 text-center">
                                                                {order.payment_mode === "GUEST" ? (
                                                                    <span className="font-bold text-base text-amber-500">
                                                                        ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-sm font-medium opacity-30">-</span>
                                                                )}
                                                            </td>
                                                            {/* Free Column */}
                                                            <td className="px-6 py-4 text-center">
                                                                {order.payment_mode === "FREE" ? (
                                                                    <span className="font-bold text-base text-purple-500">
                                                                        ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-sm font-medium opacity-30">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span
                                                                    className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${order.payment_status === "PAID"
                                                                        ? "bg-emerald-500/20 text-emerald-500"
                                                                        : "bg-yellow-500/20 text-yellow-500"
                                                                        }`}
                                                                >
                                                                    {order.payment_status || "PENDING"}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <p className="font-bold text-base text-[var(--text-primary)]">
                                                                    ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                                </p>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {ordersList.length === 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan="6"
                                                            className="px-6 py-10 text-center opacity-40 font-bold text-sm italic"
                                                        >
                                                            No orders found for this period.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>



                                    {/* Pagination */}
                                    {ordersList.length > 0 && (
                                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-default)] pt-6">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)]">
                                                    Orders Report
                                                </p>
                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                                                    Showing {(ordersPage - 1) * ordersPageSize + 1} to{" "}
                                                    {Math.min(
                                                        ordersPage * ordersPageSize,
                                                        ordersList.length
                                                    )}{" "}
                                                    of {ordersList.length} orders
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {/* Page Size Selector */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setIsPageSizeOpen(!isPageSizeOpen)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)] text-[var(--brand-primary)] rounded-xl text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <span>{ordersPageSize} Pages</span>
                                                        <FiChevronDown className={`transition-transform duration-300 ${isPageSizeOpen ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {isPageSizeOpen && (
                                                        <div className="absolute bottom-full mb-2 left-0 w-full min-w-[120px] bg-white dark:bg-slate-800 border border-[var(--border-default)] rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                                            {[10, 20, 50, 100].map(size => (
                                                                <button
                                                                    key={size}
                                                                    onClick={() => {
                                                                        setOrdersPageSize(size);
                                                                        setOrdersPage(1); // Reset to page 1
                                                                        setIsPageSizeOpen(false);
                                                                    }}
                                                                    className={`w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--brand-primary)] hover:text-[var(--text-inverse)] transition-colors flex items-center justify-between ${ordersPageSize === size ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}
                                                                >
                                                                    {size} Pages
                                                                    {ordersPageSize === size && <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            setOrdersPage((prev) => Math.max(1, prev - 1))
                                                        }
                                                        disabled={ordersPage === 1}
                                                        className="px-5 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                                    >
                                                        Prev
                                                    </button>

                                                    {[
                                                        ...Array(
                                                            Math.ceil(ordersList.length / ordersPageSize)
                                                        ),
                                                    ].slice(Math.max(0, ordersPage - 3), Math.min(Math.ceil(ordersList.length / ordersPageSize), ordersPage + 2)).map((_, i, arr) => {
                                                        const pageNum = Math.max(0, ordersPage - 3) + i + 1;
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setOrdersPage(pageNum)}
                                                                className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${ordersPage === pageNum
                                                                    ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20 scale-110"
                                                                    : "bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)]/10 opacity-60 hover:opacity-100"
                                                                    }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        );
                                                    })}

                                                    <button
                                                        onClick={() =>
                                                            setOrdersPage((prev) =>
                                                                Math.min(
                                                                    Math.ceil(ordersList.length / ordersPageSize),
                                                                    prev + 1
                                                                )
                                                            )
                                                        }
                                                        disabled={
                                                            ordersPage ===
                                                            Math.ceil(ordersList.length / ordersPageSize)
                                                        }
                                                        className="px-5 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </>
                        )
                    }

                    {
                        activeTab === "users" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <Card title="User Demographics">
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={userStats?.roles || []}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={110}
                                                    paddingAngle={10}
                                                    dataKey="value"
                                                    label={({ name, percent }) =>
                                                        `${name} ${(percent * 100).toFixed(0)}%`
                                                    }
                                                    stroke="none"
                                                >
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#f97316" />
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>
                                <div className="space-y-10">
                                    <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-[#FFF9C4] to-[#FDB813] text-black shadow-2xl relative overflow-hidden group border-4 border-white/20">
                                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:rotate-12 transition-transform duration-500">
                                            <FiUsers size={120} />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-xs font-black uppercase tracking-[0.3em] mb-4 opacity-60">
                                                System Users
                                            </p>
                                            <h4 className="text-7xl font-black mb-10 tracking-tighter">
                                                {userStats?.total || 0}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="px-6 py-2.5 bg-black/10 rounded-2xl text-xs font-black uppercase tracking-widest backdrop-blur-md">
                                                    {userStats?.active || 0} Active
                                                </div>
                                                <div className="px-6 py-2.5 bg-black/5 rounded-2xl text-xs font-black uppercase tracking-widest backdrop-blur-md opacity-60">
                                                    {(userStats?.total || 0) - (userStats?.active || 0)}{" "}
                                                    Inactive
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    {
                        activeTab === "employees" && (
                            <Card
                                title="Employee"
                                extra={
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() =>
                                                exportPDF("Employee Performance", filteredEmployeePerformance, [
                                                    { header: "Emp ID", key: "employeeId", x: 35 },
                                                    { header: "Name", key: "name", x: 75 },
                                                    { header: "Orders", key: "ordersCount", x: 130 },
                                                    { header: "UPI", key: "upiAmount", x: 165 },
                                                    { header: "Guest", key: "guestAmount", x: 210 },
                                                    { header: "Free", key: "freeAmount", x: 255 },
                                                    { header: "Total Revenue", key: "revenue", x: 285 },
                                                ])
                                            }
                                            className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-6 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 text-xs sm:text-sm tracking-wider"
                                        >
                                            <FaDownload className="text-lg" />
                                            <span>PDF</span>
                                        </button>
                                    </div>
                                }
                            >
                                {/* Table View */}
                                <div className="overflow-x-auto border border-[var(--border-default)] rounded-3xl overflow-hidden mb-6">
                                    <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                                        <thead className="bg-[var(--brand-primary)] text-[var(--text-inverse)] sticky top-0 z-10">
                                            <tr className="text-[var(--text-inverse)]">
                                                <th className="px-6 py-4 text-left text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                    Employee
                                                </th>
                                                <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                    Unit
                                                </th>
                                                <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                    UPI Collection
                                                </th>
                                                <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                    GUEST Collection
                                                </th>
                                                <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                    FREE Collection
                                                </th>
                                                <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                    Orders
                                                </th>
                                                <th className="px-6 py-4 text-right text-base sm:text-lg font-bold tracking-wider">
                                                    Total Revenue
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-default)]">
                                            {filteredEmployeePerformance
                                                .slice(
                                                    (empPage - 1) * EMP_PAGE_SIZE,
                                                    empPage * EMP_PAGE_SIZE
                                                )
                                                .map((e, index) => (
                                                    <tr
                                                        key={e.id}
                                                        style={{ animationDelay: `${index * 30}ms` }}
                                                        className="hover:bg-[var(--surface-muted)]/30 transition-all animate-slide-up opacity-0"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                                                    {e.employeeId}
                                                                </span>
                                                                <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">
                                                                    {e.name}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-block px-2 py-0.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded text-[10px] font-bold uppercase">
                                                                {e.unit_name || e.unit?.name || "-"}
                                                            </span>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-blue-500">
                                                                    ₹{e.upiAmount.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {e.upiCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-amber-500">
                                                                    ₹{e.guestAmount.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {e.guestCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-purple-500">
                                                                    ₹{e.freeAmount.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {e.freeCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-block px-3 py-1 bg-[var(--surface-muted)] rounded-lg text-sm font-bold text-[var(--text-primary)]">
                                                                {e.ordersCount}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className="font-bold text-base text-emerald-500">
                                                                ₹{e.revenue.toLocaleString()}
                                                            </p>
                                                            <div className="flex items-center justify-end gap-2 mt-1">
                                                                <div className="w-16 bg-[var(--surface-muted)] h-1 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="bg-gradient-to-r from-[var(--brand-primary)] to-amber-500 h-full"
                                                                        style={{
                                                                            width: `${Math.min(
                                                                                (e.revenue /
                                                                                    (Math.max(
                                                                                        ...employeePerformance.map(
                                                                                            (ex) => ex.revenue
                                                                                        )
                                                                                    ) || 1)) *
                                                                                100,
                                                                                100
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            {employeePerformance.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan="5"
                                                        className="px-6 py-10 text-center opacity-40 font-bold text-sm italic"
                                                    >
                                                        No employee data found for this period.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>












                                {/* Pagination controls */}
                                {employeePerformance.length > EMP_PAGE_SIZE && (
                                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-default)] pt-6">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)]">
                                                Staff Performance Report
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                                                Showing {(empPage - 1) * EMP_PAGE_SIZE + 1} to{" "}
                                                {Math.min(
                                                    empPage * EMP_PAGE_SIZE,
                                                    filteredEmployeePerformance.length
                                                )}{" "}
                                                of {filteredEmployeePerformance.length} employees
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    setEmpPage((prev) => Math.max(1, prev - 1))
                                                }
                                                disabled={empPage === 1}
                                                className="px-5 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                            >
                                                Prev
                                            </button>

                                            {[
                                                ...Array(
                                                    Math.ceil(filteredEmployeePerformance.length / EMP_PAGE_SIZE)
                                                ),
                                            ].map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setEmpPage(i + 1)}
                                                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${empPage === i + 1
                                                        ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20 scale-110"
                                                        : "bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)]/10 opacity-60 hover:opacity-100"
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}

                                            <button
                                                onClick={() =>
                                                    setEmpPage((prev) =>
                                                        Math.min(
                                                            Math.ceil(
                                                                filteredEmployeePerformance.length / EMP_PAGE_SIZE
                                                            ),
                                                            prev + 1
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    empPage ===
                                                    Math.ceil(filteredEmployeePerformance.length / EMP_PAGE_SIZE)
                                                }
                                                className="px-5 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--brand-primary)] hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )
                    }

                    {
                        activeTab === "reconciliation" && (
                            <div className="space-y-10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[
                                        { id: 'UPI', label: 'UPI', color: 'bg-blue-600', icon: FiSmartphone },
                                        { id: 'GUEST', label: 'Guest', color: 'bg-amber-600', icon: FiUser },
                                        { id: 'FREE', label: 'Free', color: 'bg-purple-600', icon: FiGift }
                                    ].map((mode, i) => {
                                        const data = overallStats?.modes?.[mode.id] || { total: 0, count: 0, totalQty: 0 };
                                        return (
                                            <div
                                                key={mode.id}
                                                style={{ animationDelay: `${i * 100}ms` }}
                                                className="bg-[var(--surface-card)] border border-[var(--border-default)] p-8 rounded-[2.5rem] flex flex-col items-center justify-center group animate-slide-up opacity-0 shadow-2xl relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 ${mode.color}`}>
                                                    <mode.icon size={28} />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">{mode.label} Collection</p>
                                                <h4 className="text-4xl font-black text-[var(--text-primary)] mb-3 tracking-tighter">₹{data.total.toLocaleString()}</h4>
                                                <div className="flex flex-col gap-2 w-full">
                                                    <div className="px-6 py-2 rounded-xl bg-[var(--surface-main)] text-[10px] font-black  tracking-widest text-[var(--brand-primary)] border border-[var(--border-default)]/50 text-center">
                                                        {data.count || 0} Bills Issued
                                                    </div>
                                                    <div className="px-6 py-2 rounded-xl bg-[var(--brand-primary)]/10 text-[10px] font-black tracking-widest text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 text-center font-bold">
                                                        {data.totalQty || 0} Items Sold
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Card
                                    title="Overall Payment Summary"
                                    extra={
                                        <button
                                            onClick={() => {
                                                const doc = new jsPDF("l", "mm", "a4");
                                                const pageWidth = doc.internal.pageSize.getWidth();
                                                const pageHeight = doc.internal.pageSize.getHeight();
                                                const margin = 14;
                                                const availableWidth = pageWidth - (margin * 2);

                                                // 1. Header
                                                doc.setFont("helvetica", "bold");
                                                doc.setFontSize(22);
                                                doc.setTextColor(30, 41, 59);
                                                doc.text("PAYMENT SUMMARY REPORT", margin, 22);

                                                doc.setDrawColor(226, 232, 240);
                                                doc.line(margin, 28, pageWidth - margin, 28);

                                                doc.setFontSize(10);
                                                doc.setTextColor(71, 85, 105);
                                                doc.text(`Generated On: ${new Date().toLocaleString()}`, margin, 38);
                                                doc.text(`Period: ${filters.start_date} to ${filters.end_date}`, margin, 43);

                                                // 2. Summary Section
                                                doc.setFontSize(14);
                                                doc.setTextColor(0, 0, 0);
                                                doc.text("OVERALL SUMMARY", margin, 55);

                                                let sy = 62;

                                                // Column calculations
                                                const modeColWidth = 30;
                                                const totalColWidth = 35;
                                                const itemsColWidth = 60; // Added space for items
                                                const remainingWidth = availableWidth - modeColWidth - totalColWidth - itemsColWidth;
                                                const unitColWidth = units.length > 0 ? remainingWidth / units.length : remainingWidth;

                                                // Header Background
                                                doc.setFillColor(241, 245, 249);
                                                doc.rect(margin, sy, availableWidth, 10, "F");

                                                // Table Header Text
                                                doc.setFontSize(8);
                                                doc.setFont("helvetica", "bold");
                                                doc.setTextColor(30, 41, 59);

                                                let currentX = margin + 2;
                                                doc.text("Mode", currentX, sy + 7);
                                                currentX += modeColWidth;

                                                units.forEach(u => {
                                                    doc.text(u.name.substring(0, 15), currentX + (unitColWidth / 2), sy + 7, { align: "center" });
                                                    currentX += unitColWidth;
                                                });

                                                doc.text("Items Sold", currentX + (itemsColWidth / 2), sy + 7, { align: "center" });
                                                doc.text("Total Amount", pageWidth - margin - 2, sy + 7, { align: "right" });

                                                sy += 10;

                                                // Rows
                                                ['UPI', 'GUEST', 'FREE'].forEach(mode => {
                                                    const modeTotal = overallStats?.modes?.[mode]?.total || 0;
                                                    const modeQty = overallStats?.modes?.[mode]?.totalQty || 0;

                                                    // Get items for this mode
                                                    const modeItems = productStats
                                                        .filter(p => (p[`${mode.toLowerCase()}Qty`] || 0) > 0)
                                                        .map(p => `${p.name_en || p.name} (${p[`${mode.toLowerCase()}Qty`]})`)
                                                        .join(", ");

                                                    doc.setFont("helvetica", "normal");
                                                    doc.setTextColor(0, 0, 0);
                                                    doc.setFontSize(8);

                                                    currentX = margin + 2;
                                                    doc.text(mode, currentX, sy + 7);
                                                    currentX += modeColWidth;

                                                    units.forEach(u => {
                                                        const uStat = unitStats.find(s => s.unit_id === u.id);
                                                        const amount = uStat ? (uStat[`${mode.toLowerCase()}Total`] || 0) : 0;
                                                        const displayAmount = amount > 0 ? amount.toLocaleString() : '-';

                                                        doc.text(displayAmount, currentX + (unitColWidth / 2), sy + 7, { align: "center" });
                                                        currentX += unitColWidth;
                                                    });

                                                    // Items column in PDF
                                                    const itemsLines = doc.splitTextToSize(modeItems || "-", itemsColWidth - 4);
                                                    doc.text(itemsLines, currentX + 2, sy + 7);

                                                    doc.text("INR " + modeTotal.toLocaleString(), pageWidth - margin - 2, sy + 7, { align: "right" });

                                                    const rowHeight = Math.max(10, itemsLines.length * 4 + 2);
                                                    doc.setDrawColor(241, 245, 249);
                                                    doc.line(margin, sy + rowHeight, pageWidth - margin, sy + rowHeight);
                                                    sy += rowHeight + 2;
                                                });

                                                // Footer Row (Grand Total)
                                                doc.setFont("helvetica", "bold");
                                                doc.setFillColor(248, 250, 252);
                                                doc.rect(margin, sy, availableWidth, 12, "F");

                                                currentX = margin + 2;
                                                doc.text("GRAND TOTAL", currentX, sy + 8);
                                                currentX += modeColWidth;

                                                units.forEach(u => {
                                                    const uStat = unitStats.find(s => s.unit_id === u.id);
                                                    const total = uStat?.revenue || 0;
                                                    doc.text(total > 0 ? total.toLocaleString() : '-', currentX + (unitColWidth / 2), sy + 8, { align: "center" });
                                                    currentX += unitColWidth;
                                                });

                                                // Empty space for items in footer
                                                currentX += itemsColWidth;

                                                doc.setTextColor(22, 163, 74); // Green
                                                doc.text("INR " + (overallStats?.overall?.total || 0).toLocaleString(), pageWidth - margin - 2, sy + 8, { align: "right" });

                                                doc.save(`reconciliation_report_${filters.start_date}.pdf`);
                                            }}

                                            className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-black px-8 py-3 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_25px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 text-[10px] uppercase tracking-[0.2em]"
                                        >
                                            <FaDownload className="text-base" />
                                            <span>Export PDF</span>
                                        </button>
                                    }
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-[var(--surface-main)]">
                                                <tr className="border-b border-[var(--border-default)]">
                                                    <th className="py-4 px-4 sm:px-8 text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-primary)] opacity-80">Payment Mode</th>
                                                    {units.map(u => (
                                                        <th key={u.id} className="py-4 px-4 text-center text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-primary)] opacity-80 whitespace-nowrap">
                                                            {u.name}
                                                        </th>
                                                    ))}
                                                    <th className="py-4 px-4 text-center text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-primary)] opacity-80">Items Sold</th>
                                                    <th className="py-4 px-4 sm:px-8 text-right text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--text-primary)] opacity-80">Total Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-default)]">
                                                {['UPI', 'GUEST', 'FREE'].map(mode => {
                                                    const colors = {
                                                        UPI: 'text-blue-500',
                                                        FREE: 'text-purple-500',
                                                        GUEST: 'text-amber-500'
                                                    };

                                                    // Get total for this mode from overall stats
                                                    const modeTotal = overallStats?.modes?.[mode]?.total || 0;
                                                    const modeQty = overallStats?.modes?.[mode]?.totalQty || 0;

                                                    // Filter productStats for this mode
                                                    const modeItems = productStats.filter(p => (p[`${mode.toLowerCase()}Qty`] || 0) > 0);

                                                    return (
                                                        <tr key={mode} className="group hover:bg-[var(--surface-main)] transition-colors">
                                                            <td className="py-4 px-4 sm:px-8 font-black uppercase tracking-tight text-sm sm:text-base">
                                                                <span className={colors[mode]}>{mode}</span>
                                                            </td>
                                                            {units.map(u => {
                                                                // Find stats for this unit
                                                                const uStat = unitStats.find(s => s.unit_id === u.id);
                                                                const amount = uStat ? (uStat[`${mode.toLowerCase()}Total`] || 0) : 0;

                                                                return (
                                                                    <td key={u.id} className="py-4 px-4 text-center font-bold text-sm sm:text-base text-[var(--text-primary)]">
                                                                        {amount > 0 ? `₹${amount.toLocaleString()}` : '-'}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="py-6 px-4 max-w-[300px]">
                                                                <div className="flex flex-wrap gap-1.5 justify-center">
                                                                    {modeItems.length > 0 ? modeItems.map(item => (
                                                                        <div key={item.product_id} className="flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded-lg border border-white/10 group-hover:border-[var(--brand-primary)]/20 transition-all">
                                                                            <span className="text-[10px] font-bold text-[var(--text-primary)] whitespace-nowrap">
                                                                                {item.name_en || item.name}
                                                                            </span>
                                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${colors[mode]} bg-black/20`}>
                                                                                {item[`${mode.toLowerCase()}Qty`]}
                                                                            </span>
                                                                        </div>
                                                                    )) : (
                                                                        <span className="text-[10px] italic opacity-30">No items</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4 sm:px-8 text-right font-black text-lg sm:text-xl">
                                                                <div className="flex flex-col items-end">
                                                                    <span>₹{modeTotal.toLocaleString()}</span>
                                                                    <span className="text-[10px] opacity-40 uppercase tracking-widest">{modeQty} items</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-[var(--surface-muted)]/50 border-t-2 border-[var(--border-default)]">
                                                <tr>
                                                    <td className="py-5 px-4 sm:px-8 font-black uppercase tracking-widest text-sm sm:text-base text-[var(--text-primary)]">GRAND TOTAL</td>
                                                    {units.map(u => {
                                                        const uStat = unitStats.find(s => s.unit_id === u.id);
                                                        return (
                                                            <td key={u.id} className="py-5 px-4 text-center align-top">
                                                                <div className="flex flex-col gap-2">
                                                                    <span className="font-black text-lg sm:text-xl text-[var(--text-primary)]">₹{(uStat?.revenue || 0).toLocaleString()}</span>
                                                                    <div className="flex flex-col gap-0.5 items-center">
                                                                        {uStat?.itemsList?.slice(0, 3).map((item, idx) => (
                                                                            <span key={idx} className="text-[9px] font-bold opacity-30 whitespace-nowrap uppercase tracking-tighter">
                                                                                {item.name} ({item.quantity})
                                                                            </span>
                                                                        ))}
                                                                        {uStat?.itemsList?.length > 3 && (
                                                                            <span className="text-[8px] font-black opacity-20 uppercase">+{uStat.itemsList.length - 3} more</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="py-5 px-4 text-center align-top">
                                                        <div className="flex flex-wrap gap-1 justify-center max-w-[200px] mx-auto opacity-40">
                                                            {productStats.map(item => (
                                                                <span key={item.product_id} className="text-[8px] font-bold border border-white/10 px-1.5 rounded bg-black/5 whitespace-nowrap">
                                                                    {item.name_en || item.name} {item.totalQty}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-4 sm:px-8 text-right align-top">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-black text-2xl sm:text-3xl text-[var(--brand-primary)]">₹{(overallStats?.overall?.total || 0).toLocaleString()}</span>
                                                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-2">{overallStats?.overall?.totalQty || 0} ITEMS TOTAL</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </Card>



                                {/* Added Products Table below Reconciliation */}
                                <div className="bg-[var(--surface-card)] p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] shadow-sm mb-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <div className="w-1 h-6 bg-[#facc15] rounded-full shadow-[0_0_10px_rgba(250,204,21,0.4)]"></div>
                                                <h2 className="text-[26px] font-bold tracking-[0.2em] text-[#facc15] uppercase">ITEMS</h2>
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

                                    <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-t-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left min-w-[800px]">
                                            <thead>
                                                <tr className="bg-[#facc15] text-black text-sm font-bold tracking-wide">
                                                    <th className="py-4 px-6 text-left w-20">S.No</th>
                                                    <th className="py-4 px-6 text-left">Item Name</th>
                                                    <th className="py-4 px-6 text-center">Qty</th>
                                                    <th className="py-4 px-6 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-default)] bg-[var(--surface-card)]">
                                                {Array.isArray(productStats) && productStats.map((product, idx) => (
                                                    <tr key={product.product_id} className="group hover:bg-[var(--surface-muted)] transition-colors text-sm">
                                                        <td className="py-4 px-6 text-[var(--text-primary)] opacity-70">{idx + 1}</td>
                                                        <td className="py-4 px-6 text-[var(--text-primary)] font-medium">
                                                            {product.name_en || product.name || 'Unknown'}
                                                        </td>
                                                        <td className="py-4 px-6 text-center text-[var(--text-primary)]">{product.totalQty}</td>
                                                        <td className="py-4 px-6 text-right text-[var(--text-primary)]">INR {(product.totalAmount || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-[var(--surface-main)]">
                                                <tr>
                                                    <td className="py-5 px-6"></td>
                                                    <td className="py-5 px-6 text-right font-black text-lg text-[var(--text-primary)] uppercase tracking-tight">Grand Total:</td>
                                                    <td className="py-5 px-6 text-center font-black text-lg text-[var(--text-primary)]">
                                                        {productStats.reduce((sum, p) => sum + (p.totalQty || 0), 0)}
                                                    </td>
                                                    <td className="py-5 px-6 text-right font-black text-lg text-emerald-500">
                                                        INR {productStats.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {productStats.length === 0 && (
                                        <div className="py-20 text-center text-slate-500 border-2 border-dashed border-slate-800/50 rounded-2xl bg-black/10 mt-4">
                                            <p className="text-lg font-medium opacity-50">No item sales data found.</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )
                    }




                    {
                        activeTab === "units" && (
                            <>
                                {unitOverall && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-6 rounded-3xl shadow-sm transition-all duration-300 md:hover:-translate-y-1.5 md:hover:shadow-xl group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 relative z-10">
                                                Unit Revenue
                                            </p>
                                            <h4 className="text-2xl font-bold text-[var(--brand-primary)] relative z-10">
                                                ₹{unitOverall.total_revenue?.toLocaleString() || 0}
                                            </h4>
                                        </div>
                                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-6 rounded-3xl shadow-sm transition-all duration-300 md:hover:-translate-y-1.5 md:hover:shadow-xl group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 relative z-10">
                                                Unit Orders
                                            </p>
                                            <h4 className="text-2xl font-bold relative z-10">
                                                {unitOverall.total_orders || 0}
                                            </h4>
                                        </div>
                                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-6 rounded-3xl shadow-sm transition-all duration-300 md:hover:-translate-y-1.5 md:hover:shadow-xl group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 relative z-10">
                                                Unit Items
                                            </p>
                                            <h4 className="text-2xl font-bold relative z-10">
                                                {unitOverall.total_items || 0}
                                            </h4>
                                        </div>
                                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-6 rounded-3xl shadow-sm transition-all duration-300 md:hover:-translate-y-1.5 md:hover:shadow-xl group relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 relative z-10">
                                                Units Active
                                            </p>
                                            <h4 className="text-2xl font-bold relative z-10">
                                                {unitOverall.units_reporting || 0}
                                            </h4>
                                        </div>
                                    </div>
                                )}

                                <Card
                                    title="Unit-wise"
                                    extra={
                                        <button
                                            onClick={() =>
                                                exportPDF("Unit Performance", filteredUnitStats, [
                                                    { header: "Unit Name", key: "name", x: 35 },
                                                    { header: "Orders", key: "orders", x: 130 },
                                                    { header: "Revenue", key: "revenue", x: 220 },
                                                ])
                                            }
                                            className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-6 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 text-xs sm:text-sm tracking-wider"
                                        >
                                            <FaDownload className="text-lg" />
                                            <span>PDF</span>
                                        </button>
                                    }
                                >
                                    <div className="overflow-x-auto border border-[var(--border-default)] rounded-3xl overflow-hidden mb-6">
                                        <table className="w-full border-separate border-spacing-0 min-w-[1200px]">
                                            <thead className="bg-[var(--brand-primary)] text-[var(--text-inverse)] sticky top-0 z-10">
                                                <tr className="text-[var(--text-inverse)]">
                                                    <th className="px-6 py-4 text-left text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                        Unit Name
                                                    </th>

                                                    <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                        UPI (Amt/Bills)
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                        GUEST (Amt/Bills)
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                        FREE (Amt/Bills)
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                        Bills Done
                                                    </th>
                                                    <th className="px-6 py-4 text-center text-base sm:text-lg font-bold tracking-wider border-r border-black/10">
                                                        Items Sold
                                                    </th>
                                                    <th className="px-6 py-4 text-right text-base sm:text-lg font-bold tracking-wider">
                                                        Revenue
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-default)]">
                                                {filteredUnitStats.map((u, index) => (
                                                    <tr
                                                        key={u.unit_id}
                                                        style={{ animationDelay: `${index * 30}ms` }}
                                                        className="hover:bg-[var(--surface-muted)]/30 transition-all animate-slide-up opacity-0"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="font-bold text-base tracking-tight text-[var(--text-primary)] uppercase">
                                                                    {u.name}
                                                                </p>
                                                                <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                                                                    Terminal Active
                                                                </p>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-emerald-500">
                                                                    ₹{u.cashTotal?.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {u.cashCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-blue-500">
                                                                    ₹{u.upiTotal?.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {u.upiCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-amber-500">
                                                                    ₹{u.guestTotal?.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {u.guestCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-purple-500">
                                                                    ₹{u.freeTotal?.toLocaleString()}
                                                                </span>
                                                                <span className="text-xs font-medium opacity-60">
                                                                    {u.freeCount} Bills
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold">
                                                                    {u.orders}
                                                                </span>
                                                                <span className="text-[10px] font-bold uppercase opacity-40">
                                                                    Orders
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-base font-bold text-blue-500">
                                                                    {u.items}
                                                                </span>
                                                                <span className="text-[10px] font-bold uppercase opacity-40">
                                                                    Items
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <p className="font-bold text-base text-emerald-500">
                                                                ₹{u.revenue.toLocaleString()}
                                                            </p>
                                                            <p className="text-xs font-medium opacity-60">
                                                                Avg: ₹{(u.revenue / (u.orders || 1)).toFixed(0)}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )
                    }
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminReports;
