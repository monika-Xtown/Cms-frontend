import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../config/api.js';
import AdminLayout from '../../components/AdminLayout.jsx';
import Loading from '../../components/Loading.jsx';
import jsPDF from 'jspdf';
import { FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaDownload } from 'react-icons/fa';
import { FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiChevronDown, FiMoreVertical } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const Units = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    printer_ip: '',
    printer_port: 9100,
    is_active: true
  });

  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [activeHeaderDropdown, setActiveHeaderDropdown] = useState(null);
  const [showLimitDropdown, setShowLimitDropdown] = useState(false);
  const { isDark } = useTheme();
  const { user } = useAuth();

  const canModify = user?.role === 'admin' || user?.role === 'unit_admin';

  const [filters, setFilters] = useState({
    search: '',
    is_active: '',
    page: 1,
    limit: 50
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1
  });

  const handleExportPDF = async () => {
    try {
      // Fetch ALL units for PDF export
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      params.append('limit', '10000'); // Get all records

      const response = await api.get(`/units?${params.toString()}`);
      const allUnits = response.data?.units || [];

      if (allUnits.length === 0) {
        alert('No data to export');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const leftMargin = 15;
      let y = 20;


      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.setFont(undefined, 'bold');
      pdf.text('UNITS MANAGEMENT REPORT', leftMargin, y);
      y += 10;
      pdf.setDrawColor(226, 232, 240); // slate-200
      pdf.line(leftMargin, y, pageWidth - 15, y);
      y += 10;

      // Report Info
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'bold');
      pdf.text(`Generated On: ${new Date().toLocaleString()}`, leftMargin, y);
      pdf.text(`Total Records: ${allUnits.length}`, pageWidth - 15, y, { align: 'right' });

      y += 12;

      // Table Header
      pdf.setFillColor(250, 198, 57);
      pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');

      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text('S.No', leftMargin + 2, y + 7);
      pdf.text('Unit Name', leftMargin + 15, y + 7);
      pdf.text('Code', leftMargin + 60, y + 7);
      pdf.text('Printer IP', leftMargin + 90, y + 7);
      pdf.text('Port', leftMargin + 130, y + 7);
      pdf.text('Status', leftMargin + 155, y + 7);
      pdf.text('Created', leftMargin + 180, y + 7, { align: 'right' });

      y += 10;
      pdf.setTextColor(30, 41, 59);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);

      allUnits.forEach((unit, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
          // Redraw header
          pdf.setFillColor(250, 198, 57);
          pdf.rect(leftMargin, y, pageWidth - (leftMargin * 2), 10, 'F');
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text('S.No', leftMargin + 2, y + 7);
          pdf.text('Unit Name', leftMargin + 15, y + 7);
          pdf.text('Code', leftMargin + 60, y + 7);
          pdf.text('Printer IP', leftMargin + 90, y + 7);
          pdf.text('Port', leftMargin + 130, y + 7);
          pdf.text('Status', leftMargin + 155, y + 7);
          pdf.text('Created', leftMargin + 180, y + 7, { align: 'right' });
          y += 10;
          pdf.setTextColor(30, 41, 59);
          pdf.setFont(undefined, 'normal');
        }

        const sno = String(index + 1);
        const name = unit.name || 'N/A';
        const code = unit.code || 'N/A';
        const ip = unit.printer_ip || 'N/A';
        const port = String(unit.printer_port || '9100');
        const status = unit.is_active ? 'Active' : 'Inactive';
        const created = new Date(unit.createdAt).toLocaleDateString('en-IN');

        pdf.text(sno, leftMargin + 2, y + 7);
        pdf.text(name, leftMargin + 15, y + 7);
        pdf.text(code, leftMargin + 60, y + 7);
        pdf.text(ip, leftMargin + 90, y + 7);
        pdf.text(port, leftMargin + 130, y + 7);

        if (!unit.is_active) pdf.setTextColor(225, 29, 72); // rose-600
        else pdf.setTextColor(16, 185, 129); // emerald-500
        pdf.text(status, leftMargin + 155, y + 7);
        pdf.setTextColor(30, 41, 59);

        pdf.text(created, leftMargin + 180, y + 7, { align: 'right' });

        y += 8;
        pdf.setDrawColor(241, 245, 249);
        pdf.line(leftMargin, y, pageWidth - 15, y);
      });

      pdf.save(`units-report-${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to export units list. Please try again.');
    }
  };

  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      params.append('page', filters.page);
      params.append('limit', filters.limit);

      const response = await api.get(`/units?${params.toString()}`);

      if (response.data && response.data.units) {
        let fetchedUnits = response.data.units;
        let totalCount = response.data.total || response.data.count || fetchedUnits.length || 0;

        if (user?.role === 'unit_admin' && user?.unit_id) {
          fetchedUnits = fetchedUnits.filter(u => u.id === user.unit_id);
          totalCount = fetchedUnits.length;
        }

        setUnits(fetchedUnits);
        setPagination({
          total: totalCount,
          page: response.data.page,
          totalPages: response.data.totalPages || Math.ceil(totalCount / response.data.limit)
        });
      } else {
        // Fallback for older API
        const fallbackRes = await api.get('/units');
        let allUnits = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data?.units || []);

        if (user?.role === 'unit_admin' && user?.unit_id) {
          allUnits = allUnits.filter(u => u.id === user.unit_id);
        }

        setUnits(allUnits);
        setPagination({
          total: allUnits.length,
          page: 1,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Fetch units error:', error);
      // Final fallback
      try {
        const fallbackRes = await api.get('/units');
        const unitsData = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data?.units || []);
        setUnits(unitsData);
      } catch (e) {
        console.error('Final fallback error:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUnits();
    }, filters.search ? 500 : 0);
    return () => clearTimeout(timer);
  }, [fetchUnits]);

  const handleOpenModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        code: unit.code,
        printer_ip: unit.printer_ip,
        printer_port: unit.printer_port,
        is_active: unit.is_active
      });
    } else {
      setEditingUnit(null);
      setFormData({
        name: '',
        code: '',
        printer_ip: '',
        printer_port: 9100,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUnit(null);
    setFormData({
      name: '',
      code: '',
      printer_ip: '',
      printer_port: 9100,
      is_active: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare payload
      const payload = {
        name: formData.name,
        code: formData.code,
        printer_ip: formData.printer_ip || null, // Send null if empty
        printer_port: parseInt(formData.printer_port) || 9100,
        is_active: formData.is_active
      };

      if (editingUnit) {
        await api.put(`/units/${editingUnit.id}`, payload);
      } else {
        await api.post('/units', payload);
      }
      handleCloseModal();
      fetchUnits();
    } catch (error) {
      console.error('Save unit error:', error);
      alert(error.response?.data?.error || 'Failed to save unit. Missing required fields?');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      await api.delete(`/units/${id}`);
      fetchUnits();
    } catch (error) {
      console.error('Delete unit error:', error);
      alert(error.response?.data?.error || 'Failed to delete unit. Please try again.');
    }
  };


  // Close dropdowns on global click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveHeaderDropdown(null);
      setShowLimitDropdown(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading && units.length === 0) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 mb-4 sm:mb-8 mt-1">
          {/* Title Row */}
          <div className="flex items-center gap-3 landscape:gap-2 animate-slide-up opacity-0">
            <div className="w-1.5 h-8 landscape:h-6 bg-[var(--brand-primary)] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)]"></div>
            <h1 className="text-2xl sm:text-3xl landscape:text-xl font-bold tracking-[0.1em] text-[var(--text-primary)]" style={{ fontFamily: '"Outfit", sans-serif' }}>
              {"Units".split("").map((char, i) => (
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

          {/* Search & Actions Row */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            {/* Search Bar */}
            <div
              style={{ animationDelay: '100ms' }}
              className="relative w-full sm:w-[400px] group animate-slide-up opacity-0"
            >
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full px-12 py-2.5 sm:py-3 landscape:py-0.5 landscape:h-7 text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] focus:outline-none focus:ring-2 sm:focus:ring-4 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] font-bold text-xs sm:text-sm landscape:text-[10px] transition-all shadow-sm hover:border-[var(--brand-primary)]/50"
              />
              <FiSearch
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--brand-primary)] transition-colors landscape:size-3.5"
                size={18}
              />
            </div>

            <div
              style={{ animationDelay: '200ms' }}
              className="flex flex-col sm:flex-row gap-3 animate-slide-up opacity-0"
            >

              {canModify && (
                <button
                  onClick={() => handleOpenModal()}
                  className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-5 sm:px-6 py-2.5 sm:py-3 landscape:py-0.5 landscape:h-7 rounded-xl flex items-center justify-center gap-2 sm:gap-3 landscape:gap-1.5 transition-all shadow-[0_4px_15px_rgba(250,198,57,0.3)] hover:scale-105 active:scale-95 text-sm sm:text-base landscape:text-[10px] whitespace-nowrap"
                >
                  <FaPlus className="text-base sm:text-lg landscape:text-xs" />
                  <span>Add Unit</span>
                </button>
              )}

              <button
                onClick={handleExportPDF}
                className="w-full sm:w-auto bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] font-semibold px-6 py-2.5 sm:py-3 landscape:py-0.5 landscape:h-7 rounded-xl flex items-center justify-center gap-3 landscape:gap-1.5 transition-all shadow-[0_4px_15px_rgba(250,198,57,0.3)] hover:scale-105 active:scale-95 text-xs sm:text-sm landscape:text-[10px] tracking-wider"
              >
                <FaDownload className="text-lg landscape:text-xs" />
                <span>PDF</span>
              </button>

            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-[var(--surface-card)] border border-[var(--border-default)] shadow-lg mb-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-[var(--brand-primary)] text-white">
                <tr>
                  <th className="px-4 py-1 landscape:py-0.5 text-left text-[11px] landscape:text-[9px] font-black uppercase tracking-wider border-r border-black/10">S.No</th>
                  <th className="px-4 py-1 landscape:py-0.5 text-left text-sm sm:text-base landscape:text-xs tracking-wider border-r border-black/10">Name</th>
                  <th className="px-4 py-1 landscape:py-0.5 text-left text-sm sm:text-base landscape:text-xs tracking-wider border-r border-black/10 relative">
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHeaderDropdown(activeHeaderDropdown === 'status' ? null : 'status');
                        }}
                        className="hover:scale-110 transition-transform"
                      >
                        <FiFilter size={14} className={filters.is_active !== '' ? 'text-black' : 'text-black/40'} />
                      </button>
                      {activeHeaderDropdown === 'status' && (
                        <div className="absolute top-full left-0 mt-1 w-32 bg-[var(--surface-card)] text-[var(--text-primary)] rounded-xl shadow-2xl border border-[var(--border-default)] py-2 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                          {[
                            { label: 'All Status', value: '' },
                            { label: 'Active', value: 'true' },
                            { label: 'Inactive', value: 'false' }
                          ].map((opt) => (
                            <button
                              key={opt.label}
                              onClick={() => {
                                setFilters({ ...filters, is_active: opt.value, page: 1 });
                                setActiveHeaderDropdown(null);
                              }}
                              className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-[var(--surface-muted)] transition-colors ${filters.is_active === opt.value ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : ''}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-1 landscape:py-0.5 text-left text-sm sm:text-base landscape:text-xs tracking-wider border-r border-black/10">Printer</th>
                  <th className="px-4 py-1 landscape:py-0.5 text-left text-xs sm:text-sm landscape:text-[10px] tracking-wider border-r border-black/10">Created</th>
                  <th className="px-4 py-1 landscape:py-0.5 text-center text-xs sm:text-sm landscape:text-[10px] tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {Array.isArray(units) && units.map((unit, index) => (
                  <tr
                    key={unit.id}
                    style={{ animationDelay: `${index * 30}ms` }}
                    className="hover:bg-[var(--surface-muted)]/30 transition-colors animate-slide-up opacity-0"
                  >
                    <td className="px-6 py-2.5 text-lg font-medium opacity-60">
                      {(filters.page - 1) * filters.limit + index + 1}
                    </td>
                    <td className="px-6 py-2.5 text-lg font-medium capitalize">{unit.name}</td>
                    <td className="px-6 py-2.5 text-lg">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border inline-flex items-center justify-center w-fit ${unit.is_active
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}>
                        {unit.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-lg text-slate-400">
                      <div>{unit.printer_ip ? `${unit.printer_ip}:${unit.printer_port}` : 'Not configured'}</div>
                    </td>
                    <td className="px-6 py-2.5 text-lg text-slate-400">
                      {new Date(unit.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-2.5 text-lg text-center relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
                          setActiveMenu(activeMenu === unit.id ? null : unit.id);
                        }}
                        className={`p-1.5 rounded-lg hover:bg-[var(--surface-muted)] text-[var(--brand-primary)] transition-colors ${activeMenu === unit.id ? 'bg-[var(--surface-muted)]' : ''}`}
                      >
                        <FiMoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border-default)] bg-[var(--surface-card)] gap-4">
            <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              Showing <span className="text-[var(--text-primary)]">{(filters.page - 1) * filters.limit + 1}–{Math.min(filters.page * filters.limit, pagination.total || 0)}</span> of <span className="text-[var(--brand-primary)] font-semibold">{pagination.total || 0}</span> records
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
                            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[0_4px_15px_rgba(227,30,36,0.4)] scale-105"
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
                  className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] rounded-xl py-2.5 text-[12px] font-medium text-[var(--text-primary)] cursor-pointer outline-none transition-all shadow-sm flex items-center justify-center relative w-[130px]"
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

        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 z-[100] overflow-y-auto transition-all animate-in fade-in duration-300 pt-10 sm:pt-20">
            <div className="bg-[var(--surface-card)] border-2 border-[var(--brand-primary)] text-[var(--text-primary)] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-5 sm:p-8 md:p-10 max-w-2xl w-full mb-10 relative animate-in slide-in-from-top-10 duration-500">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--brand-primary)] mb-6 sm:mb-8 border-b-2 border-[var(--brand-primary)]/10 pb-4">
                {editingUnit ? 'Edit Unit' : 'Add Unit'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-2">Unit Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, name: val.charAt(0).toUpperCase() + val.slice(1) })
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                      required
                    />
                  </div>
                  {/* Unit Code Removed */}
                  <div>
                    <label className="block font-medium mb-2">Printer IP</label>
                    <input
                      type="text"
                      value={formData.printer_ip}
                      onChange={(e) => setFormData({ ...formData, printer_ip: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2">Printer Port</label>
                    <input
                      type="number"
                      value={formData.printer_port}
                      onChange={(e) => setFormData({ ...formData, printer_port: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-main)] text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-all outline-none"
                      placeholder="9100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2">Status</label>
                    <div
                      onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                      className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.is_active ? 'bg-[#4ade80]' : 'bg-gray-300'}`}
                    >
                      <div
                        className={`bg-white w-6 h-6 rounded-full shadow-none transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`}
                      />
                    </div>
                  </div>
                </div>





                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-lg font-bold bg-[var(--brand-primary)] text-white border border-transparent hover:bg-white hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all shadow-lg"
                  >
                    {editingUnit ? 'Update' : 'Create Unit'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 rounded-lg font-bold bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/80 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
        }

        {/* Fixed Menu Portal */}
        {
          activeMenu && createPortal(
            <div
              className="fixed inset-0 z-[9999]"
              onClick={() => setActiveMenu(null)}
            >
              <div
                className="absolute bg-[var(--surface-card)] rounded-xl shadow-2xl border border-[var(--border-default)] py-1 w-44 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                style={{
                  top: `${menuPos.top}px`,
                  right: `${menuPos.right}px`
                }}
                onClick={e => e.stopPropagation()}
              >
                {canModify && (
                  <button
                    onClick={() => { setActiveMenu(null); handleOpenModal(units.find(u => u.id === activeMenu)); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] flex items-center gap-2 transition-colors"
                  >
                    <FaEdit className="text-blue-500" /> Edit
                  </button>
                )}

                {canModify && <div className="h-px bg-[var(--border-default)] my-1" />}
                {canModify && (
                  <button
                    onClick={() => { setActiveMenu(null); handleDelete(activeMenu); }}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition-colors"
                  >
                    <FaTrash /> Delete
                  </button>
                )}
              </div>
            </div>,
            document.body
          )
        }
      </div >
    </AdminLayout >
  );
};

export default Units;
