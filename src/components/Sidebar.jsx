import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/prithvi-logo.jpg';
import { useTheme } from '../context/ThemeContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import {
  FiHome,
  FiBox,
  FiUsers,
  FiShoppingCart,
  FiSettings,
  FiActivity,
  FiX,
  FiTruck,
  FiPackage,
  FiCalendar,
  FiUserCheck,
  FiGrid,
  FiList,
  FiPieChart
} from 'react-icons/fi';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { pathname } = useLocation();
  const { theme, isDark } = useTheme();

  const navItems = [
    { path: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
    // { path: '/admin/track-order', icon: FiTruck, label: 'Track Order' },
    { path: '/admin/products', icon: FiPackage, label: 'Items' },
    { path: '/admin/AdminCheckout', icon: FiShoppingCart, label: 'Orders' },
    { path: '/admin/meal-scheduler', icon: FiCalendar, label: 'Meal Plan' },
    { path: '/admin/users', icon: FiUserCheck, label: 'Users' },
    { path: '/admin/employees', icon: FiUsers, label: 'Employees' },
    { path: '/admin/units', icon: FiGrid, label: 'Units' },
    { path: '/admin/logs', icon: FiList, label: 'Logs' },
    { path: '/admin/reports', icon: FiPieChart, label: 'Reports' },
    // { path: '/admin/categories', icon: FiBox, label: 'Categories' },
    // { path: '/admin/colors', icon: FiActivity, label: 'Colors' },
    // { path: '/admin/sizes', icon: FiActivity, label: 'Sizes' },

  ];

  const isActive = (path) => pathname === path;

  const handleNavItemClick = () => {
    // Mobile/Tablet check: Close sidebar on screens < 1024px
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay - Visible backdrop for drawer on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar / Dropdown */}
      <aside
        className={`
          fixed z-50 transition-all duration-300 ease-in-out border-[var(--border-default)]
          flex flex-col shrink-0
          ${theme === 'dark'
            ? 'bg-gradient-to-b from-[#1D265B] via-[#1D265B] to-[#FDB813]'
            : theme === 'professional'
              ? 'bg-[var(--surface-card)]'
              : theme === 'modern'
                ? 'bg-gradient-to-b from-[#0f172a] to-[#1e293b] border-r border-indigo-500/10'
                : theme === 'executive'
                  ? 'bg-gradient-to-b from-blue-50 to-white border-r border-blue-200'
                  : theme === 'sunset'
                    ? 'bg-gradient-to-b from-amber-50 to-white border-r border-amber-200'
                    : theme === 'swiggy'
                      ? 'bg-gradient-to-b from-orange-50 to-white border-orange-200'
                      : 'bg-[var(--surface-card)]'
          }
          
          /* Mobile: Dropdown Styling - responsive width and centering */
          top-[4.5rem] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] rounded-3xl shadow-2xl border
          max-h-[calc(100dvh-6rem)] lg:max-h-none overflow-hidden flex flex-col
          ${isOpen ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-4 invisible pointer-events-none'}
          
          /* Desktop/Tablet: Sidebar Styling (Overrides Mobile) */
          lg:visible lg:opacity-100 lg:scale-100 lg:translate-y-0 lg:translate-x-0 lg:pointer-events-auto
          lg:static lg:h-screen lg:rounded-none lg:shadow-none lg:left-0 lg:top-0
          lg:border-r ${isDark ? 'lg:border-white/10' : 'lg:border-[var(--border-default)]'}
          lg:min-w-0 lg:flex lg:flex-col
          ${isOpen ? 'lg:w-64' : 'lg:w-20'}
        `}
      >
        {/* Mobile Title & Close */}
        <div className="lg:hidden flex items-center justify-center p-4 border-b border-white/10 bg-white/5 relative min-h-[72px]">
          <div className="flex items-center justify-center">
            <div className="w-28 h-10 rounded-xl overflow-hidden">
              <img src={logo} alt="Prithvi Logo" className="w-full h-full object-contain object-center scale-110" />
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
        {/* Desktop Logo */}
        <div className={`hidden lg:flex items-center justify-center transition-all duration-300 ${isOpen ? 'px-4 pt-8 pb-2' : 'px-4 py-8'}`}>
          <div className={`shrink-0 transition-all duration-500 hover:scale-105 active:scale-95 ${isOpen ? 'w-full max-w-[110px] flex justify-center' : 'w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-2xl'}`}>
            <img
              src={logo}
              alt="Prithvi Logo"
              className={`w-[110px] h-auto ${isOpen ? 'object-contain' : 'object-cover'}`}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 pt-2 lg:max-h-full grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-1 lg:space-y-1 transition-all duration-300 ${isOpen ? 'px-3' : 'lg:px-0 px-3'}`}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavItemClick}
                className={`flex items-center ${isOpen ? 'justify-start gap-4 px-4' : 'lg:justify-center gap-2 px-3'} py-3 rounded-xl transition-all overflow-hidden ${active
                  ? 'bg-[var(--brand-primary)] text-black shadow-lg scale-[1.02]'
                  : theme === 'dark'
                    ? 'text-white hover:bg-white/10'
                    : theme === 'professional'
                      ? 'text-slate-300 hover:bg-white/5'
                      : theme === 'modern'
                        ? 'text-indigo-100 hover:bg-indigo-500/10'
                        : theme === 'executive'
                          ? 'text-blue-900 hover:bg-blue-50'
                          : theme === 'sunset'
                            ? 'text-amber-950 hover:bg-amber-100'
                            : theme === 'swiggy'
                              ? 'text-orange-950 hover:bg-orange-50'
                              : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                  }`}
              >
                <div className={`shrink-0 flex items-center justify-center ${!isOpen ? 'w-10' : ''}`}>
                  <item.icon size={22} className={active ? 'text-black' : 'opacity-100'} />
                </div>
                <span
                  className={`text-left tracking-wide font-bold text-lg transition-all duration-300 truncate whitespace-nowrap ${!isOpen ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100 w-full block'}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t transition-all duration-300 ${isDark ? 'border-white/10' : 'border-[var(--border-default)]'} ${!isOpen && 'lg:hidden'}`}>
          <div className="flex items-center justify-between px-2">
            <span
              className={`text-[10px] font-semibold tracking-widest transition-opacity duration-300 ${isDark ? 'text-white/40' : 'text-[var(--text-secondary)]'} ${!isOpen && 'lg:opacity-0'}`}
            >
              Theme
            </span>
            <ThemeToggle variant="inline" />
          </div>
        </div>
      </aside >
    </>
  );
};

export default Sidebar;
