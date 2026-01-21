import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';
import rightSideImage from '../assets/login_bg.jpg';
import logo from '../assets/prithvi-logo.jpg';
import xtownDarkLogo from '../assets/Xtown-dark-logo.png';
import { FiEye, FiEyeOff, FiUser, FiRefreshCw } from 'react-icons/fi';

const UnifiedLogin = () => {
    const [role, setRole] = useState('Admin');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, employeeLogin, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && user) {
            const role = user.role?.toLowerCase();
            if (['admin', 'unit_admin'].includes(role)) {
                navigate('/admin/dashboard');
            } else if (role === 'chef') {
                navigate('/kitchen');
            } else {
                navigate('/kiosk/products');
            }
        }
    }, [user, authLoading, navigate]);

    const handleRoleChange = (newRole) => {
        setRole(newRole);
        setIdentifier('');
        setPassword('');
        setError('');
        setShowPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let result;
        if (role === 'Admin' || role === 'Unit Admin' || role === 'Kiosk' || role === 'Chef') {
            result = await login(identifier, password);
            if (result.success && role === 'Kiosk' && !result.user.unit_id) {
                setError("You are not assigned to a unit. Please contact administrator.");
                setLoading(false);
                return;
            }
        } else {
            result = await employeeLogin(identifier, password);
        }

        if (result.success) {
            const userRole = result.user.role?.toLowerCase();
            if (['admin', 'unit_admin'].includes(userRole)) {
                navigate('/admin/dashboard');
            } else if (userRole === 'chef') {
                navigate('/kitchen');
            } else {
                navigate('/kiosk/products');
            }
        } else {
            setError(result.error);
        }
        setLoading(false);
    };

    const getIdentifierLabel = () => {
        switch (role) {
            case 'Admin': return 'Username';
            case 'Unit Admin': return 'Username';
            case 'Kiosk': return 'Username';
            case 'Employee': return 'Employee ID';
            default: return 'Identifier';
        }
    };

    const getIdentifierPlaceholder = () => {
        switch (role) {
            case 'Admin': return 'e.g. admin.user';
            case 'Unit Admin': return 'e.g. unit.admin';
            case 'Kiosk': return 'e.g. kiosk_101';
            case 'Employee': return 'e.g. 100123';
            case 'Chef': return 'e.g. chef_john';
            default: return 'Enter your ID';
        }
    };

    const isFormValid = identifier.trim() !== '' && password.trim() !== '';

    return (
        <Layout showFooter={false} showThemeToggle={false} theme="light">
            <style>{`
                @media (max-width: 768px), (max-height: 600px) and (orientation: landscape) {
                    .unified-input-wrapper {
                        overflow: hidden !important;
                        border-radius: 1rem !important;
                    }
                    .unified-input-wrapper input {
                        overflow: hidden !important;
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                        width: calc(100% - 2px) !important;
                        margin-left: 1px !important;
                        margin-right: 1px !important;
                    }
                    .unified-input-wrapper input::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    .unified-login-btn {
                        padding: 0 !important;
                        min-height: 2.75rem !important;
                        height: 2.75rem !important;
                        max-height: 2.75rem !important;
                        margin-top: 1rem !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: clip !important;
                        transform: none !important;
                        transition: none !important;
                        box-shadow: none !important;
                    }
                }
            `}</style>
            <div className="relative w-full min-h-[100dvh] bg-[#1D265B] selection:bg-orange-500/30 overflow-x-hidden pt-6 pb-12">
                {/* Background Image Layer */}
                <div className="fixed inset-0 z-0">
                    <img
                        src={rightSideImage}
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover object-center animate-page-zoom-out opacity-60 md:opacity-80 lg:opacity-100"
                    />
                    <div className="absolute inset-0 bg-black/40 md:bg-black/20"></div>
                </div>

                {/* Content Area - Support for Portrait & Landscape scrolling */}
                <div className="relative z-10 flex flex-col items-center md:items-start justify-center px-4 md:pl-12 lg:pl-20 xl:pl-32 min-h-[calc(100dvh-4.5rem)]">
                    <div className="w-full sm:max-w-[340px] md:max-w-[360px] lg:max-w-[340px] xl:max-w-[380px] flex flex-col items-start">
                        {/* Login Card */}
                        <div className="w-full bg-white/20 backdrop-blur-3xl lg:bg-white/30 rounded-[2.5rem] p-5 sm:p-6 shadow-2xl border border-white/30 lg:border-white/40 animate-in fade-in slide-in-from-bottom-8 duration-700">

                            <div className="mb-4 md:mb-6 text-center">
                                <div className="flex justify-center mb-4">
                                    <div className="w-20 h-auto rounded-xl overflow-hidden bg-white p-2 shadow-md">
                                        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                                <p className="text-sm md:text-base font-bold text-slate-900 leading-none">
                                    {role === 'Admin' ? 'Admin Access' : role === 'Unit Admin' ? 'Unit Admin Access' : role === 'Kiosk' ? 'Kiosk login' : 'Employee portal'}
                                </p>
                            </div>

                            {/* Role Switcher */}
                            <div className="grid grid-cols-3 gap-1 p-1 bg-black/5 md:bg-black/20 rounded-2xl mb-6 border border-black/15 sticky top-0 z-30">
                                {['Admin', 'Kiosk', 'Employee'].map((r) => {
                                    const isActive = role === r;
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => handleRoleChange(r)}
                                            className={`w-full py-2.5 lg:py-3 px-0 text-[10px] sm:text-[11px] md:text-xs font-bold rounded-xl transition-all duration-300 ${isActive
                                                ? 'bg-white text-orange-600 shadow-md transform scale-[1.02]'
                                                : 'text-slate-900'
                                                } whitespace-nowrap overflow-hidden text-center`}
                                        >
                                            {r}
                                        </button>
                                    );
                                })}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 text-red-700 px-4 py-3 rounded-2xl text-[11px] font-medium animate-shake text-center">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-zinc-900 ml-1 uppercase tracking-wider" style={{ fontWeight: 700, color: '#d45630ff' }}>{getIdentifierLabel()}</label>
                                    <div className="relative unified-input-wrapper">
                                        <input
                                            type="text"
                                            placeholder={getIdentifierPlaceholder()}
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            className="w-full px-6 py-4 rounded-2xl bg-white/80 border border-transparent focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 text-slate-900 placeholder:text-slate-400 transition-all outline-none font-bold text-base pr-14"
                                            required
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-16 h-12 flex items-center justify-center bg-orange-50 rounded-xl text-orange-600/80">
                                            <FiUser size={26} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-zinc-900 ml-1 uppercase tracking-wider" style={{ fontWeight: 700, color: '#d45630ff' }}>Password</label>
                                    <div className="relative unified-input-wrapper">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-6 py-4 rounded-2xl bg-white/80 border border-transparent focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-400/10 text-slate-900 placeholder:text-slate-400 transition-all outline-none font-bold text-base pr-20"
                                            required
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="w-16 h-12 flex items-center justify-center bg-[#FFEDE0] rounded-2xl text-[#F97316] hover:bg-[#FFDCC5] transition-all active:scale-95 shadow-sm"
                                            >
                                                {showPassword ? <FiEyeOff size={28} /> : <FiEye size={28} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !isFormValid}
                                    className="unified-login-btn w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.01] active:scale-95 transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-3 mt-6"
                                >
                                    {loading ? <FiRefreshCw className="animate-spin" size={18} /> : 'Sign in'}
                                </button>

                                <div className="flex justify-center pt-2">
                                    <Link to="/kitchen/login" className="text-orange-600 hover:text-orange-700 transition-all font-semibold text-[15px]">
                                        Kitchen display
                                    </Link>
                                </div>
                            </form>
                        </div>

                        {/* Footer Section - Centered Cleanly under card */}
                        {/* Footer Section - Integrated Compact Pills */}
                        <div className="mt-4 flex flex-col items-center w-full gap-2 px-4">
                            {/* Policies Pill */}
                            <div className="bg-black/25 backdrop-blur-md rounded-xl py-1.5 px-6 border border-white/10 shadow-lg">
                                <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-1 text-[12px] font-black text-white">
                                    <Link to="/policies/shipping" className="hover:text-orange-400 transition-all">Shipping</Link>
                                    <Link to="/policies/terms" className="hover:text-orange-400 transition-all">Terms</Link>
                                    <Link to="/policies/privacy" className="hover:text-orange-400 transition-all">Privacy</Link>
                                    <Link to="/policies/refund" className="hover:text-orange-400 transition-all">Refund</Link>
                                </div>
                            </div>

                            {/* Powered By Pill */}
                            <div className="bg-black/15 backdrop-blur-sm rounded-lg py-2 px-4 border border-white/5">
                                <div className="flex items-center gap-3 opacity-100 transition-opacity">
                                    <span className="text-[11px] font-black text-white tracking-widest">Powered by</span>
                                    <img src={xtownDarkLogo} alt="XTOWN" className="h-4 object-contain filter brightness-0 invert" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UnifiedLogin;
