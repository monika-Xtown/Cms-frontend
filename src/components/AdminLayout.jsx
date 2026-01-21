// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import Sidebar from './Sidebar.jsx';

// import { useAuth } from '../context/AuthContext.jsx';
// import { useTheme } from '../context/ThemeContext.jsx';
// import { FiMenu, FiUser, FiLogOut, FiArrowLeft } from 'react-icons/fi';
// import xtownDarkLogo from '../assets/Xtown-dark-logo.png';
// import xtownWhiteLogo from '../assets/X-white-logo.png';

// const AdminLayout = ({ children }) => {
//     const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 1280);
//     const [isProfileOpen, setIsProfileOpen] = useState(false);
//     const { theme, isDark } = useTheme();
//     const { user, logout } = useAuth();
//     const navigate = useNavigate();

//     const handleLogout = async () => {
//         await logout();
//         navigate('/login');
//     };

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { FiMenu, FiUser, FiLogOut, FiArrowLeft } from 'react-icons/fi';
import xtownDarkLogo from '../assets/Xtown-dark-logo.png';
import xtownWhiteLogo from '../assets/X-white-logo.png';
import logo from '../assets/prithvi-logo.jpg';

const AdminLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { theme, isDark } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="h-[100dvh] w-full overflow-hidden no-scrollbar transition-colors duration-300 bg-[var(--surface-main)] text-[var(--text-primary)] flex flex-col lg:flex-row">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden transition-all duration-300`}>
                {/* Header */}
                <header className={`h-16 lg:h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 backdrop-blur-md border-b shadow-lg transition-all duration-300 ${theme === 'dark'
                    ? 'bg-gradient-to-r from-[#1D265B] via-[#1D265B] to-[#FDB813] border-white/5'
                    : theme === 'modern'
                        ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-indigo-500/10'
                        : theme === 'executive'
                            ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200'
                            : theme === 'sunset'
                                ? 'bg-gradient-to-r from-amber-50 to-white border-amber-200'
                                : theme === 'swiggy'
                                    ? 'bg-gradient-to-r from-orange-50 to-white border-orange-200'
                                    : 'bg-[var(--surface-card)] border-[var(--border-default)]'
                    }`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-[var(--surface-muted)] text-[var(--text-primary)]'}`}
                            aria-label="Toggle sidebar"
                        >
                            <FiMenu size={24} />
                        </button>
                    </div>

                    {/* Centered Logo for Mobile removed as requested */}


                    {/* Right Side Actions */}
                    <div className="flex items-center gap-3 ml-auto">
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`flex items-center p-0.5 px-2 lg:p-1 lg:px-3 rounded-full transition-all focus:outline-none lg:scale-100 origin-right transition-all flex-nowrap ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                            >
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all overflow-hidden ${isDark ? 'bg-white/20 text-white' : 'bg-[#FDB813]/25 text-[#FDB813]'}`}>
                                    <FiUser size={22} />
                                </div>
                                <span className={`hidden sm:block ml-3 text-lg sm:text-xl font-black uppercase tracking-widest leading-none ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
                                    {user?.username || 'PRITHVI'}
                                </span>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg border border-[var(--border-default)] bg-[var(--surface-card)] py-1 z-20 animate-fade-in-down origin-top-right">
                                        <div className="px-4 py-3 border-b border-[var(--border-default)]">
                                            <p className="text-sm font-semibold text-[var(--text-primary)] uppercase">{user?.username || 'Admin'}</p>
                                            <p className="text-xs text-[var(--text-secondary)] capitalize">{user?.role || 'user'}</p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/5 flex items-center gap-2 transition-colors"
                                        >
                                            <FiLogOut size={16} />
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in no-scrollbar">
                    {children}
                </main>

                {/* Footer */}
                <footer className="shrink-0 border-t py-4 landscape:py-2 lg:py-4 px-4 sm:px-6 border-[var(--border-default)] bg-[var(--surface-card)] shadow-[0_-4px_6_px_-1px_rgba(0,0,0,0.1)]">
                    <div className="relative flex items-center justify-center min-h-[1.5rem] lg:min-h-[2rem]">
                        {/* Powered by content - Centered */}
                        <div className="flex items-center gap-3 transition-all duration-300 group cursor-default">
                            <span className="text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] opacity-50 group-hover:opacity-80 transition-opacity whitespace-nowrap">Powered by</span>
                            <img
                                src={isDark ? xtownWhiteLogo : xtownDarkLogo}
                                alt="XTOWN"
                                className={`h-6 md:h-8 lg:h-9 object-contain drop-shadow-sm transition-all duration-300 ${isDark ? 'brightness-125' : 'brightness-100'}`}
                            />
                        </div>

                        {/* Right links - Positioned to the right */}
                        <div className="absolute right-0 hidden sm:flex items-center flex-wrap gap-x-4 gap-y-1 landscape:scale-75 lg:scale-100">
                            {[
                                { to: '/policies/terms', label: 'Terms' },
                                { to: '/policies/privacy', label: 'Privacy' },
                                { to: '/policies/refund', label: 'Refund' },
                                { to: '/policies/shipping', label: 'Shipping' }
                            ].map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="text-[10px] sm:text-xs transition-colors hover:underline hover:text-[var(--brand-primary)] opacity-60 hover:opacity-100 whitespace-nowrap"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </footer>
            </div >

        </div >
    );
};

export default AdminLayout;