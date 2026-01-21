import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import api from '../../config/api.js';
import AdminLayout from '../../components/AdminLayout.jsx';
import Loading from '../../components/Loading.jsx';
import { FaEdit, FaPlus, FaKey, FaGlobe, FaChevronDown, FaEllipsisV, FaUserFriends, FaLock, FaDownload } from 'react-icons/fa';
import { FiSearch, FiCheck, FiX, FiFilter, FiChevronLeft, FiChevronRight, FiChevronDown, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const Employee = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('edit');
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Action Menu State
    const [activeMenu, setActiveMenu] = useState(null);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
    const [activeHeaderDropdown, setActiveHeaderDropdown] = useState(null);
    const [showLimitDropdown, setShowLimitDropdown] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [units, setUnits] = useState([]);
    const [bulkErrors, setBulkErrors] = useState([]);
    const { user } = useAuth();

    const canModify = user?.role === 'admin' || user?.role === 'unit_admin';

    const [filters, setFilters] = useState({
        search: '',
        status: '', // '1' or '0'
        page: 1,
        limit: 50
    });

    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        totalPages: 1
    });

    const [addFormData, setAddFormData] = useState({
        emp_code: '',
        first_name: '',

        phone: '',
        password: '123',
        is_active: true,
        address: '',
        address_line_2: '',
        pincode: '',
        city: '',
        perm_state: '',
        perm_country: ''
    });
    const [fetchingAddress, setFetchingAddress] = useState(false);

    const handlePincodeChange = async (pin) => {
        setAddFormData(prev => ({ ...prev, pincode: pin }));

        if (pin.length === 6) {
            setFetchingAddress(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                const data = await response.json();

                if (data[0].Status === "Success") {
                    const postOffices = data[0].PostOffice[0];
                    setAddFormData(prev => ({
                        ...prev,
                        city: postOffices.District,
                        perm_state: postOffices.State,
                        perm_country: "India"
                    }));
                }
            } catch (err) {
                console.error("Error fetching address details:", err);
            } finally {
                setFetchingAddress(false);
            }
        }
    };

    // Bulk Upload Logic
    const handleTemplateDownload = () => {
        const headers = [
            "emp_code", "first_name", "last_name", "email", "mobile", "designation", "title", "gender",
            "company", "division_unit", "business_category", "type_of_sector", "function", "department",
            "sub_department", "zone_name", "line", "cost_center", "country", "zone", "state", "district",
            "base_location", "work_location", "personal_email", "emp_type_text", "confirmation_status_text",
            "address", "address_line_2", "pincode", "city", "perm_state", "perm_country", "password"
        ];
        const sampleData = [
            "EMP001,John,Doe,john@example.com,9876543210,Manager,Mr.,Male,ABC Corp,Unit 1,IT,IT,Dev,IT,DevOps,South,Line 1,CC001,India,South,TN,Chennai,Chennai,Chennai,john.personal@gmail.com,Permanent,Confirmed,123 Main St,,600001,Chennai,TN,India,123"
        ];

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...sampleData].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "employee_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setSubmitting(true);
            setBulkErrors([]);
            await api.post('/employees/bulk-upload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert("Bulk upload successful!");
            setShowBulkModal(false);
            fetchEmployees();
        } catch (err) {
            console.error("Bulk upload failed:", err);
            if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
                setBulkErrors(err.response.data.errors);
            } else if (err.response?.data?.message) {
                alert(err.response.data.message);
            } else {
                alert("Bulk upload failed. Please check the file format.");
            }
        } finally {
            setSubmitting(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleExportPDF = async () => {
        try {
            // Fetch ALL employees for PDF export
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status !== '') {
                params.append('is_active', filters.status === '1' ? 'true' : 'false');
            }
            params.append('limit', '10000'); // Get all records

            const response = await api.get(`/employees/?${params.toString()}`);
            let allEmployees = [];

            if (response.data && Array.isArray(response.data.employees)) {
                allEmployees = response.data.employees;
            } else if (response.data && response.data.data) {
                allEmployees = response.data.data;
            } else if (Array.isArray(response.data)) {
                allEmployees = response.data;
            }

            // Filter for Unit Admin if needed
            if (user?.role === 'unit_admin' && user?.unit_id) {
                allEmployees = allEmployees.filter(emp => (emp.unit_id === user.unit_id || emp.unitId === user.unit_id || emp.division_unit === user.unit_id));
            }

            if (allEmployees.length === 0) {
                alert('No data to export');
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
            pdf.text('EMPLOYEE MANAGEMENT REPORT', leftMargin, y);
            y += 10;
            pdf.setDrawColor(226, 232, 240); // slate-200
            pdf.line(leftMargin, y, pageWidth - 15, y);
            y += 10;

            // Report Info
            pdf.setFontSize(10);
            pdf.setTextColor(30, 41, 59);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);
            pdf.text(`Total Records: ${allEmployees.length}`, pageWidth - 15, y, { align: 'right' });

            y += 12;

            // Table Header
            pdf.setFillColor(250, 198, 57);
            pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');

            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
            pdf.text('S.No', leftMargin + 2, y + 7);
            pdf.text('Code', leftMargin + 12, y + 7);
            pdf.text('Name', leftMargin + 30, y + 7);
            pdf.text('Designation', leftMargin + 70, y + 7);
            pdf.text('Contact', leftMargin + 110, y + 7);
            pdf.text('Unit', leftMargin + 140, y + 7);
            pdf.text('Status', leftMargin + 170, y + 7);

            y += 10;
            pdf.setTextColor(30, 41, 59);
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);

            allEmployees.forEach((emp, index) => {
                if (y > 270) {
                    pdf.addPage();
                    y = 20;
                    // Redraw header
                    pdf.setFillColor(250, 198, 57);
                    pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');
                    pdf.setFont(undefined, 'bold');
                    pdf.setTextColor(0, 0, 0);
                    pdf.text('S.No', leftMargin + 2, y + 7);
                    pdf.text('Code', leftMargin + 12, y + 7);
                    pdf.text('Name', leftMargin + 30, y + 7);
                    pdf.text('Designation', leftMargin + 70, y + 7);
                    pdf.text('Contact', leftMargin + 110, y + 7);
                    pdf.text('Unit', leftMargin + 140, y + 7);
                    pdf.text('Status', leftMargin + 170, y + 7);
                    y += 10;
                    pdf.setTextColor(30, 41, 59);
                    pdf.setFont(undefined, 'normal');
                }

                const sno = String(index + 1);
                const code = emp.emp_code || '-';
                const name = `${[emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.username || '-'}`.substring(0, 20);
                const designation = (emp.designation || '-').substring(0, 20);
                const contact = emp.mobile || emp.phone || '-';
                const unit = (emp.division_unit || '-').substring(0, 15);
                const status = (emp.is_active == 1 || emp.is_active === true) ? 'Active' : 'Inactive';

                pdf.text(sno, leftMargin + 2, y + 7);
                pdf.text(code, leftMargin + 12, y + 7);
                pdf.text(name, leftMargin + 30, y + 7);
                pdf.text(designation, leftMargin + 70, y + 7);
                pdf.text(contact, leftMargin + 110, y + 7);
                pdf.text(unit, leftMargin + 140, y + 7);

                if (!(emp.is_active == 1 || emp.is_active === true)) pdf.setTextColor(225, 29, 72); // rose-600
                else pdf.setTextColor(16, 185, 129); // emerald-500
                pdf.text(status, leftMargin + 170, y + 7);
                pdf.setTextColor(30, 41, 59);

                y += 8;
                pdf.setDrawColor(241, 245, 249);
                pdf.line(leftMargin, y, pageWidth - 15, y);
            });

            pdf.save(`employee-list-${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`);
        } catch (err) {
            console.error("PDF Export failed:", err);
            alert("Failed to export PDF.");
        }
    };



    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status !== '') {
                params.append('is_active', filters.status === '1' ? 'true' : 'false');
            }
            params.append('page', filters.page);
            params.append('limit', filters.limit);

            const response = await api.get(`/employees/?${params.toString()}`);

            // New API Response Structure (Root level pagination)
            if (response.data && Array.isArray(response.data.employees)) {
                let fetchedList = response.data.employees;

                if (user?.role === 'unit_admin' && user?.unit_id) {
                    fetchedList = fetchedList.filter(emp => (emp.unit_id === user.unit_id || emp.unitId === user.unit_id || emp.division_unit === user.unit_id));
                }

                const total = user?.role === 'unit_admin' ? fetchedList.length : (response.data.total !== undefined ? response.data.total : (response.data.pagination?.total || 0));
                const currentPage = response.data.currentPage !== undefined ? response.data.currentPage : (response.data.page !== undefined ? response.data.page : (response.data.pagination?.page || 1));
                const totalPages = user?.role === 'unit_admin' ? Math.ceil(fetchedList.length / filters.limit) : (response.data.totalPages !== undefined ? response.data.totalPages : (response.data.pagination?.totalPages || 1));

                if (filters.status !== '') {
                    fetchedList = fetchedList.filter(emp => {
                        const isActive = emp.is_active == 1 || emp.is_active === true || emp.isActive;
                        return filters.status === '1' ? isActive : !isActive;
                    });
                }

                setEmployees(fetchedList);
                setPagination({
                    total,
                    page: currentPage,
                    totalPages
                });
            } else if (response.data && response.data.pagination) {
                let fetchedEmployees = response.data.employees || [];
                if (user?.role === 'unit_admin' && user?.unit_id) {
                    fetchedEmployees = fetchedEmployees.filter(emp => (emp.unit_id === user.unit_id || emp.unitId === user.unit_id || emp.division_unit === user.unit_id));
                }
                setEmployees(fetchedEmployees);
                setPagination(response.data.pagination);
            } else {
                const allData = response.data.employees || response.data || [];
                let filtered = allData;

                if (user?.role === 'unit_admin' && user?.unit_id) {
                    filtered = filtered.filter(emp => (emp.unit_id === user.unit_id || emp.unitId === user.unit_id || emp.division_unit === user.unit_id));
                }

                filtered = filtered.filter(emp => {
                    if (filters.status === '1') return emp.is_active == 1 || emp.is_active === true;
                    if (filters.status === '0') return !(emp.is_active == 1 || emp.is_active === true);
                    return true;
                });

                const total = filtered.length;
                const totalPages = Math.ceil(total / filters.limit);
                const start = (filters.page - 1) * filters.limit;
                const paginatedData = filtered.slice(start, start + filters.limit);

                setEmployees(paginatedData);
                setPagination({
                    total,
                    page: filters.page,
                    totalPages: Math.max(1, totalPages)
                });
            }
        } catch (error) {
            console.error('Fetch employees error:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const res = await api.get('/units');
                const unitsData = Array.isArray(res.data) ? res.data : (res.data?.units || []);
                setUnits(unitsData);
            } catch (err) {
                console.error("Error fetching units:", err);
            }
        };
        fetchUnits();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployees();
        }, filters.search ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchEmployees]);

    useEffect(() => {
        const handleClickOutside = () => {
            setActiveHeaderDropdown(null);
            setShowLimitDropdown(false);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleToggleStatus = async (employee) => {
        try {
            // Robust check for current status (handles "1", 1, true, etc.)
            const isCurrentlyActive = employee.is_active == 1 || employee.is_active === true || employee.isActive;

            // Use generic PUT endpoint for update
            await api.put(`/employees/${employee.id}/`, {
                is_active: isCurrentlyActive ? 0 : 1
            });
            fetchEmployees();
        } catch (error) {
            console.error('Toggle status error:', error);
            alert('Failed to update status');
        }
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'edit') {
                if (!editingEmployee?.id) {
                    alert('No employee selected for password update.');
                    return;
                }
                await api.put(`/employees/${editingEmployee.id}/`, { password: newPassword });
                alert('Password updated successfully');
            } else if (modalType === 'global') {
                await api.patch('/employees/global-password/', { password: newPassword });
                alert('Global password updated successfully');
            } else if (modalType === 'add') {
                await api.post('/employees/', addFormData);
                alert('Employee added successfully');
            }
            setShowModal(false);
            setNewPassword('');
            setAddFormData({ emp_code: '', first_name: '', phone: '', password: '123', is_active: true, address: '', address_line_2: '', pincode: '', city: '', perm_state: '', perm_country: '' });
            fetchEmployees();
        } catch (error) {
            console.error('Operation error:', error);
            alert(error.response?.data?.error || error.response?.data?.message || 'Operation failed');
        }
    };

    const filteredEmployees = employees; // Already handled in fetchEmployees logic

    if (loading && employees.length === 0) {
        return (
            <AdminLayout>
                <Loading />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6 landscape:gap-2 mb-8 landscape:mb-2 mt-2">
                    {/* Title Row */}
                    <div className="flex items-center gap-4 landscape:gap-2 animate-slide-up opacity-0">
                        <div className="w-2 h-10 landscape:h-6 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl landscape:text-xl font-bold tracking-[0.1em] text-[var(--text-primary)]">
                                {"Employees".split("").map((char, i) => (
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

                    {/* Search & Actions Row */}
                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                        <div className="relative w-full lg:flex-1 lg:max-w-md group">
                            <input
                                type="text"
                                placeholder="Search by Name, Employee Code, or Contact..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                className="w-full !pl-16 pr-12 py-3.5 landscape:py-0.5 landscape:h-7 text-center sm:text-left rounded-2xl border-2 border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-4 focus:ring-[#f97316]/10 focus:border-[#f97316] font-bold text-sm landscape:text-[10px] transition-all shadow-sm hover:border-[#f97316]/30 placeholder:text-[var(--text-secondary)]/30"
                            />
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[#f97316] transition-colors">
                                <FiSearch size={22} className="landscape:size-4" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-row gap-3">
                            {canModify && (
                                <>
                                    <button
                                        onClick={() => navigate('/admin/add-employee')}
                                        className="bg-[var(--brand-primary)] text-white border-2 border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-black px-4 py-3.5 landscape:py-0.5 landscape:h-7 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 text-[10px] sm:text-[11px] landscape:text-[9px] uppercase tracking-wider h-full"
                                    >
                                        <FaPlus className="text-sm landscape:text-xs" />
                                        <span>Add</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setModalType('global');
                                            setShowBulkModal(false);
                                            setShowModal(true);
                                        }}
                                        className="bg-[var(--brand-primary)] text-white border-2 border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-black px-4 py-3.5 landscape:py-0.5 landscape:h-7 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 text-[10px] sm:text-[11px] landscape:text-[9px] uppercase tracking-wider h-full"
                                    >
                                        <FaGlobe className="text-sm landscape:text-xs" />
                                        <span>Global</span>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowBulkModal(true);
                                            setShowModal(true);
                                        }}
                                        className="bg-[var(--brand-primary)] text-white border-2 border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-black px-4 py-3.5 landscape:py-0.5 landscape:h-7 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 text-[10px] sm:text-[11px] landscape:text-[9px] uppercase tracking-wider h-full"
                                    >
                                        <FiRefreshCw className="text-sm landscape:text-xs" />
                                        <span>Bulk</span>
                                    </button>
                                </>
                            )}

                            <button
                                onClick={handleExportPDF}
                                className="bg-[var(--brand-primary)] text-white border-2 border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-black px-4 py-3.5 landscape:py-0.5 landscape:h-7 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.02] active:scale-95 text-[10px] sm:text-[11px] landscape:text-[9px] uppercase tracking-wider h-full"
                            >
                                <FaDownload className="text-sm landscape:text-xs" />
                                <span>PDF</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl overflow-hidden bg-[var(--surface-card)] shadow-2xl border border-[var(--border-default)]/30">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px]">
                            <thead className="bg-[var(--brand-primary)] text-[var(--text-inverse)]">
                                <tr>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5 w-14">S.No</th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5">Emp Code</th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5">Employee</th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5">Unit</th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5">Mobile </th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5">Address</th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5">Pin Code</th>
                                    <th className="px-4 py-4 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-wider border-r border-black/5 relative group">
                                        <div className="flex items-center justify-between gap-2">
                                            <span>Status</span>
                                            <div
                                                className="p-1 hover:bg-black/10 rounded-md transition-all cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (filters.status) setFilters(prev => ({ ...prev, status: '', page: 1 }));
                                                    setActiveHeaderDropdown(activeHeaderDropdown === 'status' ? null : 'status');
                                                }}
                                            >
                                                <FiFilter className={`text-black transition-all ${filters.status ? 'opacity-100 scale-110' : 'opacity-40 group-hover:opacity-100'}`} />
                                            </div>
                                        </div>
                                        {activeHeaderDropdown === 'status' && (
                                            <div className="absolute top-full left-0 mt-1 w-40 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Filter Status</div>
                                                {['All', 'Active', 'Inactive'].map(statusOption => (
                                                    <button
                                                        key={statusOption}
                                                        onClick={() => {
                                                            const val = statusOption === 'All' ? '' : statusOption === 'Active' ? '1' : '0';
                                                            setFilters({ ...filters, status: val, page: 1 });
                                                            setActiveHeaderDropdown(null);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-xs font-semibold hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${(statusOption === 'All' && filters.status === '') || (statusOption === 'Active' && filters.status === '1') || (statusOption === 'Inactive' && filters.status === '0') ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}
                                                    >
                                                        {statusOption}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </th>
                                    <th className="px-4 py-4 landscape:py-2 text-center text-sm landscape:text-xs font-black uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]/20">
                                {filteredEmployees.map((employee, index) => (
                                    <tr
                                        key={employee.id}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                        className="hover:bg-[var(--surface-muted)]/30 transition-colors animate-slide-up opacity-0"
                                    >
                                        <td className="px-4 py-2 landscape:py-1 text-xs landscape:text-[10px] font-medium opacity-40">{(filters.page - 1) * filters.limit + index + 1}</td>
                                        <td className="px-4 py-2 landscape:py-1 text-xs landscape:text-[10px] font-bold text-[var(--text-primary)]">
                                            {employee.emp_code || employee.employeeId || '-'}
                                        </td>
                                        <td className="px-4 py-2 landscape:py-1">
                                            <div className="flex flex-col">
                                                <span className="text-xs landscape:text-[10px] font-bold text-[var(--text-primary)] capitalize">
                                                    {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.username || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Unit Column */}
                                        <td className="px-4 py-2 landscape:py-1 text-xs landscape:text-[10px] font-medium">
                                            <span className="bg-[var(--surface-muted)] px-2 py-0.5 rounded text-[10px] landscape:text-[9px] border border-[var(--border-default)]">
                                                {employee.division_unit || employee.unit || '-'}
                                            </span>
                                        </td>
                                        {/* Mobile Column */}
                                        <td className="px-4 py-2 landscape:py-1 text-xs landscape:text-[10px] font-medium">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{employee.residence_landline || employee.mobile || '-'}</span>
                                                {employee.personal_email && <span className="text-[9px] landscape:text-[8px] text-[var(--text-secondary)]">{employee.personal_email}</span>}
                                            </div>
                                        </td>
                                        {/* Address Column */}
                                        <td className="px-4 py-2 landscape:py-1 text-xs landscape:text-[10px] font-medium">
                                            <div className="flex flex-col max-w-[180px]">
                                                <span className="font-medium truncate capitalize text-[11px] landscape:text-[9px]" title={employee.address || '-'}>
                                                    {employee.address || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Pin Code Column */}
                                        <td className="px-4 py-2 landscape:py-1 text-xs landscape:text-[10px] font-medium">
                                            {employee.pincode || employee.residence_postal_code || '-'}
                                        </td>
                                        {/* Status Column */}
                                        <td className="px-4 py-2 landscape:py-1">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] landscape:text-[8px] font-black uppercase tracking-widest border inline-flex items-center justify-center w-fit ${(employee.is_active == 1 || employee.is_active === true || employee.isActive)
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                {(employee.is_active == 1 || employee.is_active === true || employee.isActive) ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {/* Action Column */}
                                        <td className="px-4 py-2 landscape:py-1 text-center relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setMenuPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
                                                    setActiveMenu(activeMenu === employee.id ? null : employee.id);
                                                }}
                                                className={`p-1.5 rounded-xl transition-all ${activeMenu === employee.id ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'hover:bg-[var(--surface-muted)] opacity-60'}`}
                                            >
                                                <FaEllipsisV size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

                                <div className="flex items-center gap-1 landscape:gap-0.5">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                                        const isSelected = parseInt(pagination.page) === pageNum;
                                        if (pagination.totalPages > 5 && (pageNum > 1 && pageNum < pagination.totalPages && Math.abs(pageNum - parseInt(pagination.page)) > 1)) {
                                            if (pageNum === 2 || pageNum === pagination.totalPages - 1) return <span key={pageNum} className="px-1 text-[var(--text-secondary)] opacity-50 text-[10px]">...</span>;
                                            return null;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setFilters({ ...filters, page: pageNum })}
                                                className={`w-9 h-9 landscape:w-7 landscape:h-7 flex items-center justify-center rounded-xl text-xs landscape:text-[10px] font-semibold transition-all border
                                                ${isSelected
                                                        ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--text-inverse)] shadow-[0_4px_15px_rgba(227,30,36,0.4)] scale-105"
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
                                    className="bg-[var(--surface-main)] border-2 border-[var(--brand-primary)] rounded-xl py-2.5 landscape:py-1 text-[12px] landscape:text-[10px] font-semibold text-[var(--text-primary)] cursor-pointer outline-none transition-all shadow-sm flex items-center justify-center relative w-[130px] landscape:w-[100px]"
                                >
                                    {filters.limit} Pages
                                    <FiChevronDown size={14} className={`absolute right-3 transition-transform duration-300 ${showLimitDropdown ? 'rotate-180' : ''} text-[var(--brand-primary)]`} />
                                </button>

                                {showLimitDropdown && (
                                    <div className="absolute bottom-full left-0 mb-2 w-[130px] bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-2xl shadow-2xl z-[100] py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {[10, 20, 50, 100, 500].map(limit => (
                                            <button
                                                key={limit}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFilters({ ...filters, limit, page: 1 });
                                                    setShowLimitDropdown(false);
                                                }}
                                                className={`w-full py-3.5 text-center text-[12px] font-medium transition-all
                                                ${filters.limit === limit
                                                        ? "bg-[var(--brand-primary)] text-[var(--text-inverse)]"
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
            </div>

            {activeMenu && createPortal(
                <div className="fixed inset-0 z-[9999]" onClick={() => setActiveMenu(null)}>
                    <div
                        className="absolute bg-[var(--surface-card)] border-2 border-[var(--border-default)] rounded-2xl shadow-2xl py-2 w-52 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                        style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
                        onClick={e => e.stopPropagation()}
                    >
                        {canModify && (
                            <>
                                <button
                                    onClick={() => {
                                        const emp = employees.find(e => e.id === activeMenu);
                                        setEditingEmployee(emp);
                                        setModalType('edit');
                                        setShowModal(true);
                                        setActiveMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-xs font-semibold tracking-widest flex items-center gap-3 hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-all"
                                >
                                    <FaEdit size={14} /> Edit Password
                                </button>
                                <div className={`h-px bg-[var(--border-default)] mx-3 my-1 opacity-50`}></div>
                                <button
                                    onClick={() => {
                                        navigate(`/admin/edit-employee/${activeMenu}`);
                                        setActiveMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-xs font-semibold tracking-widest flex items-center gap-3 hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] transition-all"
                                >
                                    <FaEdit size={14} /> Edit Details
                                </button>
                                <div className={`h-px bg-[var(--border-default)] mx-3 my-1 opacity-50`}></div>
                                <button
                                    onClick={() => {
                                        const emp = employees.find(e => e.id === activeMenu);
                                        handleToggleStatus(emp);
                                        setActiveMenu(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest flex items-center gap-3 hover:bg-[var(--surface-muted)] transition-all opacity-70"
                                >
                                    {(employees.find(e => e.id === activeMenu)?.is_active == 1 || employees.find(e => e.id === activeMenu)?.is_active === true || employees.find(e => e.id === activeMenu)?.isActive) ? 'Inactive' : 'Activate'}
                                </button>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] animate-in fade-in duration-300">
                    <div className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-[var(--brand-primary)] p-6 flex justify-between items-center text-[var(--text-inverse)] shrink-0">
                            <div className="flex items-center gap-3">
                                {showBulkModal ? <FiRefreshCw /> : modalType === 'add' ? <FaPlus /> : <FaLock />}
                                <h3 className="text-lg font-black uppercase tracking-tighter">
                                    {showBulkModal ? 'Bulk Upload Employees' : modalType === 'edit' ? 'Update Password' : modalType === 'add' ? 'Add Employee' : 'Global Password Change'}
                                </h3>
                            </div>
                            <button onClick={() => { setShowModal(false); setShowBulkModal(false); }} className="hover:rotate-90 transition-all">
                                <FiX size={24} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body (Scrollable) */}
                        <div className="flex-1 overflow-y-auto">
                            {showBulkModal ? (
                                <div className="p-8 space-y-6">
                                    <div className="text-center space-y-4">
                                        <div className="p-4 bg-[var(--surface-muted)] rounded-2xl border-2 border-dashed border-[var(--border-default)]">
                                            <p className="text-sm text-[var(--text-secondary)] mb-4">
                                                Upload a CSV or Excel file with employee details.
                                                <br />
                                                Download the template to see the required format.
                                            </p>
                                            <button
                                                onClick={handleTemplateDownload}
                                                className="text-[var(--brand-primary)] font-bold text-xs uppercase tracking-widest hover:underline"
                                            >
                                                Download Template
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
                                                Select CSV File
                                            </label>
                                            <input
                                                type="file"
                                                accept=".csv,.xlsx,.xls"
                                                onChange={handleBulkUpload}
                                                disabled={submitting}
                                                className="block w-full text-sm text-[var(--text-secondary)]
                                                file:mr-4 file:py-2.5 file:px-4
                                                file:rounded-xl file:border-0
                                                file:text-xs file:font-bold file:uppercase file:tracking-widest
                                                file:bg-[var(--brand-primary)] file:text-white
                                                hover:file:bg-[var(--brand-primary)]/90
                                                cursor-pointer"
                                            />
                                        </div>
                                        {submitting && <div className="text-xs font-bold text-[var(--brand-primary)] animate-pulse">Uploading...</div>}

                                        <div className="text-left mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mb-1">
                                                Important Note:
                                            </p>
                                            <p className="text-xs text-orange-800">
                                                Excel headers must follow the original template. Frontend labels are for display only.
                                            </p>
                                        </div>

                                        {bulkErrors.length > 0 && (
                                            <div className="text-left mt-4 max-h-60 overflow-y-auto p-4 bg-red-50 rounded-xl border border-red-100">
                                                <p className="text-[10px] text-red-600 font-bold uppercase tracking-wide mb-2 sticky top-0 bg-red-50">
                                                    Upload Errors:
                                                </p>
                                                <div className="space-y-2">
                                                    {bulkErrors.map((err, idx) => {
                                                        const fieldName = err.field === 'mobile' ? 'Mobile No'
                                                            : err.field === 'pincode' ? 'Pin Code'
                                                                : err.field === 'emp_code' ? 'Employee Code'
                                                                    : err.field || 'Unknown Field';

                                                        return (
                                                            <div key={idx} className="text-xs text-red-700 border-b border-red-100 last:border-0 pb-1">
                                                                <span className="font-bold">Row {err.row || '?'}:</span> {fieldName} - {err.error || err.message}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form id="employee-modal-form" onSubmit={handleModalSubmit} className="p-8 space-y-6">
                                    {modalType === 'add' ? (
                                        <>
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Employee Code</label>
                                                    <input
                                                        type="text"
                                                        value={addFormData.emp_code}
                                                        onChange={(e) => setAddFormData({ ...addFormData, emp_code: e.target.value })}
                                                        placeholder="e.g. 34"
                                                        className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Employee Name</label>
                                                    <input
                                                        type="text"
                                                        value={addFormData.first_name}
                                                        onChange={(e) => setAddFormData({ ...addFormData, first_name: e.target.value })}
                                                        placeholder="Full Name"
                                                        className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Mobile No</label>
                                                    <input
                                                        type="text"
                                                        value={addFormData.phone}
                                                        onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                                                        placeholder="Mobile Number"
                                                        className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Address</label>
                                                        <input
                                                            type="text"
                                                            value={addFormData.address}
                                                            onChange={(e) => setAddFormData({ ...addFormData, address: e.target.value })}
                                                            placeholder="Address Line 1"
                                                            className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Address Line 2</label>
                                                        <input
                                                            type="text"
                                                            value={addFormData.address_line_2}
                                                            onChange={(e) => setAddFormData({ ...addFormData, address_line_2: e.target.value })}
                                                            placeholder="Address Line 2"
                                                            className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1 relative">
                                                        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Pin Code</label>
                                                        <input
                                                            type="text"
                                                            value={addFormData.pincode}
                                                            onChange={(e) => handlePincodeChange(e.target.value)}
                                                            placeholder="Pincode"
                                                            maxLength={6}
                                                            className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        />
                                                        {fetchingAddress && (
                                                            <div className="absolute right-3 bottom-3">
                                                                <FiRefreshCw className="animate-spin text-[var(--brand-primary)]" size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">City</label>
                                                        <input
                                                            type="text"
                                                            value={addFormData.city}
                                                            onChange={(e) => setAddFormData({ ...addFormData, city: e.target.value })}
                                                            placeholder="City"
                                                            className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Unit / Division</label>
                                                    <select
                                                        value={addFormData.division_unit}
                                                        onChange={(e) => setAddFormData({ ...addFormData, division_unit: e.target.value })}
                                                        className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none appearance-none"
                                                        required
                                                    >
                                                        <option value="">Select Unit</option>
                                                        {units.map(unit => (
                                                            <option key={unit.id} value={unit.name || unit.code}>
                                                                {unit.name} ({unit.code})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">State</label>
                                                        <input
                                                            type="text"
                                                            value={addFormData.perm_state}
                                                            onChange={(e) => setAddFormData({ ...addFormData, perm_state: e.target.value })}
                                                            placeholder="State"
                                                            className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Country</label>
                                                        <input
                                                            type="text"
                                                            value={addFormData.perm_country}
                                                            onChange={(e) => setAddFormData({ ...addFormData, perm_country: e.target.value })}
                                                            placeholder="Country"
                                                            className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60">Password</label>
                                                    <input
                                                        type="password"
                                                        value={addFormData.password}
                                                        onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                                        placeholder="Default: 123"
                                                        className="w-full px-5 py-3 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-bold text-sm transition-all outline-none"
                                                        required
                                                    />
                                                </div>

                                                <div className="pt-2">
                                                    <label className="text-[10px] font-black uppercase tracking-wider ml-1 opacity-60 block mb-2">Account Status</label>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAddFormData({ ...addFormData, is_active: !addFormData.is_active })}
                                                            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner border-2 ${addFormData.is_active
                                                                ? "bg-emerald-500/10 border-emerald-500/30"
                                                                : "bg-red-500/10 border-red-500/30"
                                                                }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-7 w-7 transform rounded-full transition duration-300 ease-in-out shadow-lg flex items-center justify-center ${addFormData.is_active
                                                                    ? "translate-x-11 bg-emerald-500"
                                                                    : "translate-x-1 bg-red-500"
                                                                    }`}
                                                            >
                                                                <FiCheck className={`text-[10px] text-white transition-opacity duration-300 ${addFormData.is_active ? 'opacity-100' : 'opacity-0'}`} />
                                                                <FiX className={`absolute text-[12px] text-white transition-opacity duration-300 ${addFormData.is_active ? 'opacity-0' : 'opacity-100'}`} />
                                                            </span>
                                                        </button>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${addFormData.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {addFormData.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : modalType === 'edit' ? (
                                        <div className="bg-[var(--brand-primary)]/5 p-4 rounded-2xl border border-[var(--brand-primary)]/10">
                                            <p className="text-[10px] uppercase font-black opacity-60">Employee</p>
                                            <p className="text-sm font-black text-[var(--brand-primary)]">
                                                {editingEmployee?.first_name ? `${editingEmployee?.first_name}` : editingEmployee?.username || editingEmployee?.name} ({editingEmployee?.emp_code || editingEmployee?.employee_code || editingEmployee?.employeeId || editingEmployee?.employee_id})
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                                            <p className="text-[10px] text-rose-500 uppercase font-black">Warning</p>
                                            <p className="text-xs font-bold opacity-80">This will update the password for ALL employees in the system.</p>
                                        </div>
                                    )}

                                    {modalType !== 'add' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-60">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Enter new password..."
                                                    autoFocus
                                                    className="w-full px-5 py-4 rounded-2xl bg-[var(--surface-main)] border-2 border-[var(--border-default)] focus:border-[var(--brand-primary)] text-[var(--text-primary)] font-black text-sm transition-all outline-none pr-12"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all p-1.5 flex items-center justify-center"
                                                >
                                                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>

                        {/* Modal Footer (Sticky) */}
                        <div className="p-6 border-t border-[var(--border-default)] bg-[var(--surface-muted)]/30 flex gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-4 rounded-2xl font-bold uppercase text-xs border-2 border-[var(--border-default)] hover:bg-[var(--surface-muted)] transition-all tracking-widest"
                            >
                                Cancel
                            </button>
                            {!showBulkModal && (
                                <button
                                    type="submit"
                                    form="employee-modal-form"
                                    className="flex-1 py-4 rounded-2xl bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-bold uppercase text-xs shadow-lg shadow-[var(--brand-primary)]/20 hover:scale-[1.02] active:scale-95 transition-all tracking-widest"
                                >
                                    {modalType === 'add' ? 'Create' : 'Update'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default Employee;
