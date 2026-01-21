import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';

import api from '../../config/api.js';
import AdminLayout from '../../components/AdminLayout.jsx';
import Loading from '../../components/Loading.jsx';
import { FaEdit, FaTrash, FaPlus, FaUserShield, FaUser, FaCheck, FaTimes, FaPrint, FaEllipsisV, FaDownload, FaUserTie } from 'react-icons/fa';
import { FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeHeaderDropdown, setActiveHeaderDropdown] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    unit_id: '',
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);

  const [showLimitDropdown, setShowLimitDropdown] = useState(false);

  // Action Menu State
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const { user } = useAuth();

  const canModify = user?.role === 'admin' || user?.role === 'unit_admin';

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    unit_id: '',
    is_active: '',
    page: 1,
    limit: 50
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.unit_id) params.append('unit_id', filters.unit_id);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await api.get(`/users?${params.toString()}`);
      if (response.data && response.data.users) {
        let fetchedUsers = response.data.users;
        let totalCount = response.data.total || response.data.count || fetchedUsers.length || 0;

        if (user?.role === 'unit_admin' && user?.unit_id) {
          fetchedUsers = fetchedUsers.filter(u => u.unit_id === user.unit_id);
          totalCount = fetchedUsers.length;
        }

        setUsers(fetchedUsers);
        setPagination({
          total: totalCount,
          page: response.data.page,
          totalPages: response.data.totalPages || Math.ceil(totalCount / response.data.limit)
        });
      } else {
        // Fallback for older API
        const fallbackRes = await api.get('/users');
        let fallbackUsers = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data?.users || []);

        if (user?.role === 'unit_admin' && user?.unit_id) {
          fallbackUsers = fallbackUsers.filter(u => u.unit_id === user.unit_id);
        }

        setUsers(fallbackUsers);
        setPagination({
          total: fallbackUsers.length,
          page: 1,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      // Fallback on error
      try {
        const fallbackRes = await api.get('/users');
        const fallbackUsers = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data?.users || []);
        setUsers(fallbackUsers);
        setPagination({
          total: fallbackUsers.length,
          page: 1,
          totalPages: 1
        });
      } catch (e) {
        console.error('Final fallback error:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchUnits = useCallback(async () => {
    try {
      const response = await api.get('/units');
      setUnits(Array.isArray(response.data) ? response.data : (response.data?.units || []));
    } catch (error) {
      console.error('Fetch units error:', error);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, filters.search ? 500 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, filters]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Close dropdowns on global click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveHeaderDropdown(null);
      setShowLimitDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '', // Don't show password
        role: user.role,
        unit_id: user.unit_id || (user.unit?.id) || '',
        is_active: user.is_active ?? true
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role: 'user',
        unit_id: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      unit_id: '',
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Only send fields that are provided
        const updateData = {
          username: formData.username,
          role: formData.role,
          is_active: formData.is_active
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        if (['user', 'chef'].includes(formData.role)) {
          updateData.unit_id = formData.unit_id;
        }
        await api.put(`/users/${editingUser.id}`, updateData);
      } else {
        if (!formData.password) {
          alert('Password is required for new users');
          return;
        }
        if (['user', 'chef'].includes(formData.role) && !formData.unit_id) {
          alert('Unit assignment is required for this role');
          return;
        }
        await api.post('/users', formData);
      }
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error('Save user error:', error);
      alert(error.response?.data?.error || 'Failed to save user. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
      alert(error.response?.data?.error || 'Failed to delete user. Please try again.');
    }
  };


  const handleExportPDF = async () => {
    try {
      // Fetch ALL users for PDF export (no pagination)
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.unit_id) params.append('unit_id', filters.unit_id);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      params.append('limit', '10000'); // Get all records

      const response = await api.get(`/users?${params.toString()}`);
      const allUsers = response.data?.users || [];

      if (allUsers.length === 0) {
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
      pdf.text('USER MANAGEMENT REPORT', leftMargin, y);
      y += 10;
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.line(leftMargin, y, pageWidth - 15, y);
      y += 10;

      // Report Info
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);
      pdf.text(`Total Records: ${allUsers.length}`, pageWidth - 15, y, { align: 'right' });

      y += 12;

      // Table Header
      pdf.setFillColor(250, 198, 57);
      pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');

      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text('S.No', leftMargin + 2, y + 7);
      pdf.text('Username', leftMargin + 15, y + 7);
      pdf.text('Role', leftMargin + 60, y + 7);
      pdf.text('Unit Assignment', leftMargin + 90, y + 7);
      pdf.text('Status', leftMargin + 145, y + 7);
      pdf.text('Created', leftMargin + 180, y + 7, { align: 'right' });

      y += 10;
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      allUsers.forEach((user, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
          // Redraw header
          pdf.setFillColor(250, 198, 57);
          pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text('S.No', leftMargin + 2, y + 7);
          pdf.text('Username', leftMargin + 15, y + 7);
          pdf.text('Role', leftMargin + 60, y + 7);
          pdf.text('Unit', leftMargin + 95, y + 7);
          pdf.text('Status', leftMargin + 145, y + 7);
          pdf.text('Created', leftMargin + 180, y + 7, { align: 'right' });
          y += 10;
          pdf.setTextColor(30, 41, 59);
          pdf.setFont(undefined, 'normal');
        }

        const sno = String(index + 1);
        const rawUsername = user.username || '-';
        const username = rawUsername.charAt(0).toUpperCase() + rawUsername.slice(1);
        const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '-';
        const unit = user.unit?.name || (user.role === 'admin' ? 'All Access' : '-');
        const status = user.is_active ? 'Active' : 'Inactive';
        const created = new Date(user.createdAt).toLocaleDateString('en-IN');

        pdf.text(sno, leftMargin + 2, y + 7);
        pdf.text(username, leftMargin + 15, y + 7);
        pdf.text(role, leftMargin + 60, y + 7);
        pdf.text(unit, leftMargin + 95, y + 7);

        if (!user.is_active) pdf.setTextColor(225, 29, 72); // rose-600
        else pdf.setTextColor(16, 185, 129); // emerald-500
        pdf.text(status, leftMargin + 145, y + 7);
        pdf.setTextColor(30, 41, 59);

        pdf.text(created, leftMargin + 180, y + 7, { align: 'right' });

        y += 8;
        pdf.setDrawColor(241, 245, 249);
        pdf.line(leftMargin, y, pageWidth - 15, y);
      });

      pdf.save(`users-report-${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  if (loading && users.length === 0) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 landscape:gap-2 mb-6 sm:mb-10 landscape:mb-2 mt-2">
          {/* Left: Title & Search */}
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-3 landscape:gap-2 animate-slide-up opacity-0">
              <div className="w-1.5 h-10 landscape:h-6 bg-[var(--brand-primary)] rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"></div>
              <h1 className="text-xl sm:text-2xl landscape:text-lg font-medium tracking-[0.1em] text-[var(--text-primary)]">
                {"Users".split("").map((char, i) => (
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

            {/* Search Bar */}
            <div
              style={{ animationDelay: '100ms' }}
              className="relative w-full sm:w-[400px] group animate-slide-up opacity-0"
            >
              <input
                type="text"
                placeholder="Search by username..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full px-10 sm:px-12 py-3 sm:py-3.5 landscape:py-1.5 text-center rounded-xl sm:rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] font-medium text-xs sm:text-sm landscape:text-[11px] transition-all shadow-sm hover:border-[var(--brand-primary)]/50"
              />
              <FiSearch
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors"
                size={18}
              />
            </div>
          </div>

          {/* Right: Actions Stack (Add, Export) */}
          <div
            style={{ animationDelay: '200ms' }}
            className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-auto lg:mt-0 animate-slide-up opacity-0"
          >
            {canModify && (
              <button
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-5 sm:px-6 py-2.5 sm:py-3 landscape:py-1 landscape:h-8 rounded-xl flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-[0_4px_15px_rgba(250,198,57,0.3)] hover:scale-105 active:scale-95 text-xs sm:text-sm landscape:text-[10px]"
              >
                <FaPlus className="text-sm sm:text-base landscape:text-xs" />
                <span>Add User</span>
              </button>
            )}

            <button
              onClick={handleExportPDF}
              className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-5 sm:px-6 py-2.5 sm:py-3 landscape:py-1 landscape:h-8 rounded-xl flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-[0_4px_15px_rgba(250,198,57,0.3)] hover:scale-105 active:scale-95 text-xs sm:text-sm landscape:text-[10px] tracking-wider"
            >
              <FaDownload className="text-lg landscape:text-sm" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        <div id="users-table-container" className="rounded-xl overflow-hidden bg-[var(--surface-card)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[var(--border-default)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-separate border-spacing-0">
              <thead className="bg-[var(--brand-primary)] text-white">
                <tr>
                  <th className="px-4 py-5 landscape:py-2 text-left text-sm landscape:text-xs font-black uppercase tracking-[0.12em] border-b border-r border-black/5 first:rounded-tl-xl w-14">S.No</th>
                  <th className="px-6 py-5 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-b border-r border-black/5">Username</th>

                  {/* Role Column with Dropdown */}
                  {/* Role Column with Dropdown */}
                  <th className="px-6 py-5 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-b border-r border-black/5 relative group">
                    <div className="flex items-center justify-between gap-2 cursor-pointer hover:text-black/70 transition-colors">
                      <span>Role</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.role) setFilters(prev => ({ ...prev, role: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'role' ? null : 'role');
                        }}
                      >
                        <FiFilter className={`text-black transition-all scale-110 drop-shadow-sm ${filters.role ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'role' && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Filter Role</div>
                        {['All', 'admin', 'chef', 'user'].map(role => (
                          <button
                            key={role}
                            onClick={() => {
                              setFilters({ ...filters, role: role === 'All' ? '' : role, page: 1 });
                              setActiveHeaderDropdown(null);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.role === role || (role === 'All' && !filters.role) ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}
                          >
                            {role === 'All' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* Unit Column with Dropdown */}
                  <th className="px-6 py-5 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-b border-r border-black/5 relative group">
                    <div className="flex items-center justify-between gap-2 cursor-pointer hover:text-black/70 transition-colors">
                      <span>Unit</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.unit_id) setFilters(prev => ({ ...prev, unit_id: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'unit' ? null : 'unit');
                        }}
                      >
                        <FiFilter className={`text-black transition-all scale-110 drop-shadow-sm ${filters.unit_id ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'unit' && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Filter Unit</div>
                        <button
                          onClick={() => { setFilters({ ...filters, unit_id: '', page: 1 }); setActiveHeaderDropdown(null); }}
                          className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${!filters.unit_id ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}
                        >
                          All Units
                        </button>
                        {units.map(unit => (
                          <button
                            key={unit.id}
                            onClick={() => { setFilters({ ...filters, unit_id: unit.id, page: 1 }); setActiveHeaderDropdown(null); }}
                            className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${filters.unit_id === unit.id ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}
                          >
                            {unit.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  {/* Status Column with Dropdown */}
                  <th className="px-6 py-5 landscape:py-2 text-left text-lg sm:text-xl landscape:text-sm tracking-wider border-b border-r border-black/5 relative group">
                    <div className="flex items-center justify-between gap-2 cursor-pointer hover:text-black/70 transition-colors">
                      <span>Status</span>
                      <div
                        className="p-1 hover:bg-black/10 rounded-md transition-all active:scale-90"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (filters.is_active !== '') setFilters(prev => ({ ...prev, is_active: '', page: 1 }));
                          setActiveHeaderDropdown(activeHeaderDropdown === 'status' ? null : 'status');
                        }}
                      >
                        <FiFilter className={`text-black transition-all scale-110 drop-shadow-sm ${filters.is_active !== '' ? 'opacity-100 scale-125' : 'opacity-80 group-hover:opacity-100'}`} style={{ strokeWidth: '3px' }} />
                      </div>
                    </div>
                    {activeHeaderDropdown === 'status' && (
                      <div className="absolute top-full left-0 mt-1 w-40 bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--brand-primary)] border-b border-[var(--border-default)] mb-1">Filter Status</div>
                        {['All', 'Active', 'Inactive'].map(status => (
                          <button
                            key={status}
                            onClick={() => {
                              const val = status === 'All' ? '' : status === 'Active' ? '1' : '0';
                              setFilters({ ...filters, is_active: val, page: 1 });
                              setActiveHeaderDropdown(null);
                            }}
                            className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-[var(--surface-muted)] text-[var(--text-primary)] ${(status === 'All' && filters.is_active === '') ||
                              (status === 'Active' && filters.is_active === '1') ||
                              (status === 'Inactive' && filters.is_active === '0')
                              ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                              : ''
                              }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>

                  <th className="px-6 py-5 landscape:py-2 text-left text-sm sm:text-base landscape:text-xs uppercase tracking-wider border-b border-r border-black/5">Created</th>
                  <th className="px-6 py-5 landscape:py-2 text-center text-sm sm:text-base landscape:text-xs uppercase tracking-wider border-b border-r border-black/5 last:rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {Array.isArray(users) && users.map((user, index) => (
                  <tr
                    key={user.id}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className="hover:bg-[var(--surface-muted)]/30 transition-colors animate-slide-up opacity-0"
                  >
                    <td className="px-6 py-4 text-base font-medium opacity-60">
                      {(filters.page - 1) * filters.limit + index + 1}
                    </td>
                    <td className="px-6 py-4 text-base font-medium text-[var(--text-primary)] capitalize">{user.username}</td>
                    <td className="px-6 py-4 text-base">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight flex items-center gap-1.5 w-fit border ${user.role === 'admin'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : user.role === 'unit_admin'
                          ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                          : user.role === 'chef'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : user.role === 'employee'
                              ? 'bg-teal-500/10 text-teal-500 border-teal-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                        {user.role === 'admin' ? <FaUserShield size={10} /> : user.role === 'chef' ? <FaUserTie size={10} /> : <FaUser size={10} />}
                        <span>{user.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-base text-[var(--text-secondary)] font-medium">
                      {user.unit ? (
                        <div className="flex flex-col">
                          <span className="text-[var(--text-primary)] font-medium">{user.unit.name}</span>
                          <span className="text-xs font-black text-[var(--text-secondary)]">{user.unit.code}</span>
                        </div>
                      ) : (
                        <span className="opacity-40 italic">{user.role === 'admin' ? 'All Access' : 'No Unit'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-base">
                      <div className="flex items-center gap-2">
                        {user.is_active ? (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-base text-[var(--text-secondary)] font-medium">
                      {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-base text-center relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
                          setActiveMenu(activeMenu === user.id ? null : user.id);
                        }}
                        className={`p-2 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--brand-primary)] transition-colors ${activeMenu === user.id ? 'bg-[var(--surface-muted)]' : ''}`}
                      >
                        <FaEllipsisV className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination UI */}
          <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border-default)] bg-[var(--surface-card)] gap-4">
            <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              Showing <span className="text-[var(--text-primary)]">
                {(pagination.total || 0) === 0 ? "0-0" : `${(filters.page - 1) * filters.limit + 1}–${Math.min(filters.page * filters.limit, pagination.total || 0)}`}
              </span> of <span className="text-[var(--brand-primary)]">{pagination.total || 0}</span> users
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page <= 1}
                  className="px-4 landscape:px-3 h-9 landscape:h-7 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-all shadow-sm font-semibold text-[10px] landscape:text-[9px] uppercase"
                >
                  <FiChevronLeft size={16} className="landscape:size-3" /> BACK
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isSelected = pagination.page === pageNum;
                    if (pagination.totalPages > 5 && (pageNum > 1 && pageNum < pagination.totalPages && Math.abs(pageNum - pagination.page) > 1)) {
                      if (pageNum === 2 || pageNum === pagination.totalPages - 1) return <span key={pageNum} className="px-1 text-[var(--text-secondary)] opacity-50">...</span>;
                      return null;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setFilters({ ...filters, page: pageNum })}
                        className={`w-9 h-9 landscape:w-7 landscape:h-7 flex items-center justify-center rounded-xl text-xs landscape:text-[9px] font-semibold transition-all border
                          ${isSelected
                            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[0_4px_15px_var(--brand-primary)]/40 scale-105"
                            : "bg-[var(--surface-main)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 landscape:px-3 h-9 landscape:h-7 flex items-center justify-center gap-2 rounded-xl bg-[var(--surface-main)] border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--brand-primary)]/10 hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)] transition-all shadow-sm font-semibold text-[10px] landscape:text-[9px] uppercase"
                >
                  NEXT <FiChevronRight size={16} className="landscape:size-3" />
                </button>
              </div>

              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLimitDropdown(!showLimitDropdown);
                  }}
                  className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl py-2.5 landscape:py-1 text-[12px] landscape:text-[10px] font-medium text-[var(--text-primary)] cursor-pointer outline-none transition-all shadow-sm flex items-center justify-center relative w-[130px] landscape:w-[110px]"
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
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 z-[100] overflow-y-auto transition-all animate-in fade-in duration-300 pt-10 sm:pt-20">
            <div className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] text-[var(--text-primary)] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-5 sm:p-8 md:p-10 max-w-2xl w-full mb-10 relative animate-in slide-in-from-top-10 duration-500">

              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--brand-primary)] mb-6 sm:mb-8 border-b-2 border-[var(--brand-primary)]/10 pb-4">
                {editingUser ? 'Edit User' : 'Add User'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-2 pl-1">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, username: val.charAt(0).toUpperCase() + val.slice(1) })
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none font-medium"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2 pl-1">
                      Password {editingUser && <span className="text-[10px] font-normal text-[var(--text-secondary)] uppercase tracking-wider ml-1">(Optional)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none font-medium pr-12"
                        placeholder="••••••••"
                        required={!editingUser}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all p-1.5 flex items-center justify-center"
                      >
                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium mb-2 pl-1">User Role</label>
                    <div className="relative group">
                      <select
                        value={formData.role}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          setFormData({
                            ...formData,
                            role: newRole,
                            // Admin doesn't need unit, others do
                            unit_id: newRole === 'admin' ? '' : formData.unit_id
                          });
                        }}
                        className="w-full appearance-none px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none cursor-pointer font-medium"
                        required
                      >
                        <option value="user">User</option>
                        <option value="chef">Chef</option>
                        <option value="admin">Admin</option>
                      </select>
                      <FiChevronDown size={16} className="absolute inset-y-0 right-4 my-auto pointer-events-none text-[var(--text-secondary)] opacity-50" />
                    </div>
                  </div>

                  {['user', 'chef'].includes(formData.role) ? (
                    <div>
                      <label className="block font-medium mb-2 pl-1">Assigned Unit <span className="text-rose-500">*</span></label>
                      <div className="relative group">
                        <select
                          value={formData.unit_id}
                          onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                          className="w-full appearance-none px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none cursor-pointer font-medium"
                          required
                        >
                          <option value="">Select a unit...</option>
                          {Array.isArray(units) && units.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}{unit.code ? ` (${unit.code})` : ''}</option>
                          ))}
                        </select>
                        <FiChevronDown size={16} className="absolute inset-y-0 right-4 my-auto pointer-events-none text-[var(--text-secondary)] opacity-50" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-medium mb-2 pl-1">Status</label>
                      <div
                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.is_active ? 'bg-[#4ade80]' : 'bg-gray-300'}`}
                      >
                        <div
                          className={`bg-white w-6 h-6 rounded-full shadow-none transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </div>
                    </div>
                  )}

                  {formData.role === 'user' && (
                    <div>
                      <label className="block font-medium mb-2 pl-1">Status</label>
                      <div
                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.is_active ? 'bg-[#4ade80]' : 'bg-gray-300'}`}
                      >
                        <div
                          className={`bg-white w-6 h-6 rounded-full shadow-none transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 mt-4 border-t border-[var(--border-default)]/10">
                  <button
                    type="submit"
                    className="flex-1 px-8 py-3.5 rounded-xl font-bold bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all shadow-lg active:scale-[0.98]"
                  >
                    {editingUser ? 'Update Profile' : 'Create User'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-8 py-3.5 rounded-xl font-bold bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/80 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      {/* Fixed Menu Portal */}
      {
        activeMenu && createPortal(
          <div
            className="fixed inset-0 z-[9999]"
            onClick={() => setActiveMenu(null)}
          >
            <div
              className="absolute bg-[var(--surface-card)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-[var(--border-default)] p-2 w-52 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col gap-1"
              style={{
                top: `${menuPos.top}px`,
                right: `${menuPos.right}px`
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setActiveMenu(null); handleOpenModal(users.find(u => u.id === activeMenu)); }}
                className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] rounded-xl flex items-center gap-3 transition-all active:scale-95"
              >
                <FaEdit size={14} className="text-[var(--brand-primary)]" />
                <span>Edit</span>
              </button>

              {canModify && (
                <>
                  <div className="h-px bg-[var(--border-default)] mx-2 my-1 opacity-50" />
                  <button
                    onClick={() => { setActiveMenu(null); handleDelete(activeMenu); }}
                    className="w-full text-left px-4 py-3 text-xs font-bold tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-xl flex items-center gap-3 transition-all active:scale-95"
                  >
                    <FaTrash size={14} />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )
      }
    </AdminLayout>
  );
};

export default Users;