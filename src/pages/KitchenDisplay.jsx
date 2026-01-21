import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import xtownDarkLogo from '../assets/Xtown-dark-logo.png';
import xtownWhiteLogo from '../assets/X-white-logo.png';
import api from '../config/api';
import {
    FiCheckCircle, FiClock, FiPlay, FiCheck,
    FiAlertCircle, FiUser, FiPackage, FiHash,
    FiLogOut, FiRefreshCw, FiCalendar
} from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import Loading from '../components/Loading';

const KitchenDisplay = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [productionData, setProductionData] = useState({ items: [], stats: { total_orders: 0, total_items: 0 } });
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [kitchenUser, setKitchenUser] = useState(null);
    const lastFetchTime = useRef(new Date());

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('kitchenToken');
            localStorage.removeItem('kitchenUser');
            navigate('/kitchen/login');
        }
    };

    const fetchOrders = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const userStr = localStorage.getItem('kitchenUser');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user) {
                navigate('/kitchen/login');
                return;
            }
            setKitchenUser(user);

            const params = new URLSearchParams();
            params.append('limit', '500');

            const response = await api.get(`/kitchen/today?${params.toString()}`);

            if (response.data) {
                setProductionData({
                    items: response.data.items || [],
                    stats: {
                        total_orders: response.data.total_orders || 0,
                        total_items: response.data.total_items || 0,
                        last_updated: response.data.last_updated
                    }
                });
                lastFetchTime.current = new Date();
            }
        } catch (error) {
            console.error('Failed to fetch kitchen data:', error);
            if (error.response?.status === 401) {
                navigate('/kitchen/login');
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem('kitchenToken');
        if (!token) {
            navigate('/kitchen/login');
            return;
        }

        fetchOrders(true);
        const interval = setInterval(() => fetchOrders(false), 10000);
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, [fetchOrders, navigate]);

    if (loading) return (
        <div className="min-h-screen bg-[var(--surface-main)] flex items-center justify-center">
            <Loading />
        </div>
    );

    return (
        <div className="kitchen-wrapper min-h-screen bg-[var(--surface-main)] text-[var(--text-primary)] p-4 sm:p-6 lg:p-8">
            <style>{`
                @media (max-height: 600px) and (orientation: landscape) {
                    .kitchen-wrapper {
                        padding: 0.75rem !important;
                    }
                    .kitchen-header {
                        margin-bottom: 1rem !important;
                        padding: 1rem !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        gap: 1rem !important;
                    }
                    .kitchen-title {
                        font-size: 1.25rem !important;
                    }
                    .kitchen-clock {
                        font-size: 1.5rem !important;
                    }
                    .kitchen-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                        gap: 0.75rem !important;
                    }
                    .kitchen-footer {
                        position: relative !important;
                        padding-top: 0.5rem !important;
                        padding-bottom: 0.5rem !important;
                        backdrop-filter: none !important;
                        background: transparent !important;
                        border-top: 1px solid var(--border-default) !important;
                        margin-top: 2rem !important;
                    }
                    .kitchen-footer-spacer {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="kitchen-header flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 bg-[var(--surface-card)] p-6 rounded-[2.5rem] border border-[var(--border-default)] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)]/5 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <FiPackage size={32} />
                        </div>
                        <div>
                            <h1 className="kitchen-title text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                                Kitchen Monitor
                            </h1>
                            <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] opacity-60">
                                {kitchenUser?.unit?.name || 'Unit Access'} • {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 relative z-10">
                        {/* Status Stats */}
                        <div className="hidden md:flex items-center gap-8 px-8 border-r border-[var(--border-default)]">
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] opacity-40 mb-1">Total Orders</p>
                                <p className="text-3xl font-black text-[var(--text-primary)]">{productionData.stats.total_orders}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase text-[var(--text-secondary)] opacity-40 mb-1">Total Items</p>
                                <p className="text-3xl font-black text-[var(--brand-primary)]">{productionData.stats.total_items}</p>
                            </div>
                        </div>

                        {/* Clock */}
                        <div className="flex flex-col items-end">
                            <div className="kitchen-clock text-3xl font-black text-[var(--brand-primary)] tabular-nums leading-none tracking-tighter">
                                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40">Live Sync Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Grid */}
                <div className="space-y-4">
                    {productionData.items.length === 0 ? (
                        <div className="bg-[var(--surface-card)] rounded-[2.5rem] border-2 border-dashed border-[var(--border-default)] p-24 text-center">
                            <div className="w-20 h-20 bg-[var(--surface-muted)] rounded-3xl flex items-center justify-center mx-auto mb-8">
                                <FiRefreshCw size={40} className="text-[var(--text-secondary)] opacity-20 animate-spin-slow" />
                            </div>
                            <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight mb-2">No Active Items</h3>
                            <p className="text-[var(--text-secondary)] font-medium max-w-sm mx-auto uppercase text-xs tracking-widest opacity-60">All items have been processed for today or no orders have been placed yet.</p>
                        </div>
                    ) : (
                        <div className="kitchen-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {productionData.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="group relative bg-[var(--surface-card)] rounded-[2rem] border border-[var(--border-default)] p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--brand-primary)]/5 rounded-full blur-2xl -mr-8 -mt-8 transition-opacity group-hover:opacity-100" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="inline-block px-3 py-1 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-default)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                                                {item.category || 'Food'}
                                            </span>
                                        </div>

                                        <h3 className="text-2xl font-black text-[var(--text-primary)] mb-1 leading-tight line-clamp-2">
                                            {item.name}
                                        </h3>
                                    </div>

                                    <div className="mt-6 flex items-end justify-between relative z-10 border-t border-[var(--border-default)] pt-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">
                                            Prepare
                                        </div>
                                        <div className="text-4xl font-black text-[var(--brand-primary)] tabular-nums leading-none">
                                            {item.quantity}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                <div className="kitchen-footer fixed bottom-0 left-0 right-0 bg-[var(--surface-card)]/95 backdrop-blur-xl border-t border-[var(--border-default)] px-6 py-4 z-50 transition-all duration-300">
                    <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

                        {/* Left: Logout */}
                        <div className="flex items-center w-full md:w-auto justify-center md:justify-start order-2 md:order-1">
                            <button
                                onClick={handleLogout}
                                className="group flex items-center gap-2 text-rose-500 hover:text-rose-600 transition-colors"
                            >
                                <div className="p-2 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                                    <FiLogOut size={20} />
                                </div>
                                <span className="font-bold text-xs uppercase tracking-widest hidden sm:block">Logout</span>
                            </button>
                        </div>

                        {/* Center: Branding */}
                        <div className="flex items-center gap-3 order-3 md:order-2 opacity-80 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Powered by</span>
                            <img
                                src={isDark ? xtownWhiteLogo : xtownDarkLogo}
                                alt="XTOWN"
                                className="h-5 object-contain"
                            />
                        </div>

                        {/* Right: Actions & Links */}
                        <div className="flex items-center gap-6 w-full md:w-auto justify-center md:justify-end order-1 md:order-3">
                            <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                <Link to="/policies/terms" className="hover:text-[var(--brand-primary)] transition-colors">Terms</Link>
                                <Link to="/policies/privacy" className="hover:text-[var(--brand-primary)] transition-colors">Privacy</Link>
                                <Link to="/policies/refund" className="hover:text-[var(--brand-primary)] transition-colors">Refund</Link>
                                <Link to="/policies/shipping" className="hover:text-[var(--brand-primary)] transition-colors">Shipping</Link>
                            </div>

                            <div className="h-8 w-px bg-[var(--border-default)] hidden sm:block"></div>

                            <ThemeToggle variant="inline" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for fixed footer */}
            <div className="kitchen-footer-spacer h-24"></div>
        </div>
    );
};

export default KitchenDisplay;
