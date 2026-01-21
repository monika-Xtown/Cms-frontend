import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../components/Layout.jsx';
import rightSideImage from '../../assets/login_bg.jpg';
import logo from '../../assets/Xtown-dark-logo.png';

const EmployeeLogin = () => {
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { employeeLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await employeeLogin(employeeId, password);

        if (result.success) {
            // For now, redirect to kiosk products. 
            // User didn't specify special employee dashboard, so assuming they are kiosk-level users.
            navigate('/kiosk/products');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <Layout showFooter={false} showThemeToggle={false}>
            <div className="relative w-full h-[100dvh] overflow-hidden flex items-center justify-center lg:justify-start bg-slate-900 animate-page-zoom-out">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={rightSideImage}
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-70 lg:opacity-100"
                    />
                    <div className="absolute inset-0 bg-black/20 lg:bg-black/10"></div>
                </div>

                {/* Top Left Logo */}
                <img
                    src={logo}
                    alt="Logo"
                    className="absolute top-6 left-6 w-24 sm:w-32 z-20 object-contain drop-shadow-md"
                />

                {/* Login Card Container */}
                <div className="relative z-10 w-full max-w-[360px] sm:max-w-[380px] px-6 mx-auto lg:mx-0 lg:ml-24 xl:ml-32">
                    <div className="bg-white/20 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/30 lg:border-white/40 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="mb-8 text-center text-white">
                            <p className="text-[13px] font-black uppercase tracking-[0.3em] mb-1 drop-shadow-sm animate-venum-glow animate-venum-pulse">Welcome to PM2</p>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-none drop-shadow-md">Employee Access</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 text-white px-4 py-3 rounded-2xl text-[11px] font-black animate-shake text-center uppercase tracking-wider">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-4">Employee ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1001"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    className="normal-case w-full px-6 py-3.5 rounded-2xl bg-white/90 border border-white/20 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 text-slate-900 placeholder:text-slate-400 transition-all font-bold text-base outline-none shadow-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-4">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-6 py-3.5 rounded-2xl bg-white/90 border border-white/20 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 text-slate-900 placeholder:text-slate-400 transition-all font-bold text-base outline-none shadow-sm"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black uppercase tracking-widest shadow-xl shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 mt-4 text-sm"
                            >
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-8 flex flex-col gap-4 items-center">
                            <button
                                onClick={() => navigate('/login')}
                                className="text-[10px] font-black text-white hover:text-orange-200 uppercase tracking-widest transition-all drop-shadow-sm"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    <span>Switch to Unified Login</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default EmployeeLogin;
