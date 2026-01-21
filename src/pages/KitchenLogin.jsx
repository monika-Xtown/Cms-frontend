import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiEye, FiEyeOff, FiChevronRight } from 'react-icons/fi';
import chefKitchenWelcome from '../assets/cb3f7d4d-4200-415d-b74f-4c917bca1a00.jpg';
import prithviLogo from '../assets/prithvi-logo.jpg';
import api from '../config/api';

const KitchenLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', formData);
            if (response.data.success || response.data.token) {
                localStorage.setItem('kitchenToken', response.data.token);
                localStorage.setItem('kitchenUser', JSON.stringify(response.data.user));
                navigate('/kitchen');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full flex flex-col items-center relative overflow-y-auto overflow-x-hidden font-sans selection:bg-orange-500/30 login-bg-container py-6 sm:py-10">
            <style dangerouslySetInnerHTML={{
                __html: `
                .login-bg-container {
                    background-image: url(${chefKitchenWelcome});
                    background-size: cover;
                    background-position: 60% 10%;
                    background-repeat: no-repeat;
                    background-attachment: fixed;
                }
                @media (max-width: 768px), (max-height: 600px) and (orientation: landscape) {
                    .login-bg-container {
                        background-image: none !important;
                        background-color: #0f0f10; 
                        overflow: hidden !important; 
                        justify-content: center !important;
                    }
                    .login-card-wrapper {
                        margin: auto !important; 
                        align-self: center !important; 
                        margin-right: auto !important;
                    }
                    /* Wrapper - hide overflow to clip scrollbars */
                    .login-input-group .relative {
                        overflow: hidden !important;
                        border-radius: 1.5rem !important;
                    }
                    
                    /* Fix input scrollbars - Complete hiding */
                    .login-input-group input {
                        /* Overflow and scrollbar removal - COMPLETE */
                        overflow: hidden !important;
                        overflow-x: hidden !important;
                        overflow-y: hidden !important;
                        scrollbar-width: none !important;
                        -ms-overflow-style: none !important;
                        overscroll-behavior: none !important;
                        
                        /* Box model - REDUCED WIDTH to prevent scrollbar space */
                        box-sizing: border-box !important;
                        width: calc(100% - 2px) !important;
                        margin: 0 1px !important;
                        display: block !important;
                        
                        /* Dimensions - FIXED */
                        padding: 0.55rem 3rem 0.55rem 1rem !important;
                        height: 2.6rem !important;
                        min-height: 2.6rem !important;
                        max-height: 2.6rem !important;
                        
                        /* Clip edges with border radius */
                        border-radius: 1.5rem !important;
                        
                        /* Text handling - PRECISE */
                        font-size: 0.875rem !important;
                        line-height: 1.4 !important;
                        white-space: nowrap !important;
                        text-overflow: clip !important;
                        
                        /* Text color - VISIBLE */
                        color: #18181b !important;
                        font-weight: 600 !important;
                        
                        /* Appearance */
                        resize: none !important;
                        appearance: none !important;
                        -webkit-appearance: none !important;
                        -moz-appearance: none !important;
                        
                        /* Rendering - ISOLATION */
                        vertical-align: middle !important;
                        contain: strict !important;
                        isolation: isolate !important;
                        backface-visibility: hidden !important;
                        transform: translateZ(0) !important;
                        
                        /* Focus handling */
                        outline: none !important;
                        outline-offset: 0 !important;
                    }
                    
                    /* Placeholder text color */
                    .login-input-group input::placeholder {
                        color: #71717a !important;
                        opacity: 1 !important;
                        font-weight: 500 !important;
                    }
                    
                    /* Increase icon size for landscape */
                    .login-input-group .absolute svg,
                    .login-input-group button svg {
                        width: 24px !important;
                        height: 10px !important;
                    }
                    
                    /* Hide native browser icons */
                    .login-input-group input::-ms-reveal,
                    .login-input-group input::-ms-clear {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                    }
                    
                    /* Hide ALL scrollbar pseudo-elements */
                    .login-input-group input::-webkit-scrollbar,
                    .login-input-group input::-webkit-scrollbar-track,
                    .login-input-group input::-webkit-scrollbar-thumb,
                    .login-input-group input::-webkit-scrollbar-corner,
                    .login-input-group input::-webkit-resizer {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        background: transparent !important;
                    }
                    
                    /* Reduce login button height */
                    .login-input-group button[type="submit"] {
                        padding-top: 0.3rem !important;
                        padding-bottom: 0.3rem !important;
                    }
                }
                /* Animation Keyframes */
                @keyframes letter-pop {
                    0% { opacity: 0; transform: translateY(10px) scale(0.5); filter: blur(10px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                .animate-letter-pop {
                    animation: letter-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}} />

            <div className="fixed inset-0 bg-transparent pointer-events-none"></div>
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>

            <div className="relative my-auto sm:my-0 sm:mt-[35vh] sm:mb-auto w-full max-w-[400px] px-4 z-20 animate-in fade-in zoom-in duration-1000 login-card-wrapper sm:self-end sm:mr-[5%]">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-amber-600/20 rounded-[2.5rem] blur-2xl group-hover:blur-3xl transition-all duration-1000 opacity-50"></div>

                    <div className="relative bg-[#080808]/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] border border-white/[0.08] p-6 sm:p-8 overflow-hidden login-card-inner">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        <div className="text-center login-header-group mb-6">
                            <div className="flex justify-center mb-4 login-logo-container">
                                <div className="p-1 rounded-2xl border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] overflow-hidden">
                                    <img src={prithviLogo} alt="Prithvi Logo" className="w-24 h-auto object-contain login-logo-img" />
                                </div>
                            </div>
                            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-[0.15em] mb-1 flex justify-center flex-wrap gap-x-2">
                                {"Welcome To Kitchen".split(" ").map((word, wordIdx, wordsArray) => {
                                    const wordStartIndex = wordsArray.slice(0, wordIdx).join(" ").length + (wordIdx > 0 ? 1 : 0);
                                    return (
                                        <span key={wordIdx} className="inline-block whitespace-nowrap">
                                            {word.split("").map((char, charIdx) => (
                                                <span
                                                    key={charIdx}
                                                    className="inline-block animate-letter-pop opacity-0"
                                                    style={{
                                                        animationDelay: `${(wordStartIndex + charIdx) * 40}ms`,
                                                        animationFillMode: 'forwards'
                                                    }}
                                                >
                                                    {char}
                                                </span>
                                            ))}
                                        </span>
                                    );
                                })}
                            </h1>
                            <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] animate-pulse">
                                Login
                            </p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border-l-4 border-red-500 rounded-lg text-red-500 text-[10px] font-black uppercase tracking-wider animate-in fade-in">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4 login-input-group">
                            <div className="space-y-3">
                                <div className="relative group/input">
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="User Name"
                                        required
                                        className="w-full px-14 py-3.5 rounded-2xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all duration-300 font-sans font-bold text-xs tracking-[0.1em] placeholder:text-zinc-600 placeholder:font-bold text-center shadow-lg shadow-zinc-950/5"
                                    />
                                    <div className="absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center text-zinc-400 group-focus-within/input:text-orange-500 transition-all duration-300 pointer-events-none">
                                        <FiUser size={20} />
                                    </div>
                                </div>

                                <div className="relative group/input">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="..........."
                                        required
                                        className="w-full px-14 py-3.5 rounded-2xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all duration-300 font-sans font-bold text-xs tracking-[0.1em] placeholder:text-zinc-600 placeholder:font-bold text-center shadow-lg shadow-zinc-950/5"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center text-zinc-400 hover:text-orange-500 transition-colors duration-300 focus:outline-none"
                                    >
                                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`group/btn relative w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 active:scale-[0.98] ${loading
                                    ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-white/5'
                                    : 'bg-white text-black hover:bg-orange-500 hover:text-white overflow-hidden'
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover/btn:translate-x-[250%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
                                        <span className="font-black uppercase tracking-[0.3em] text-[12px]">
                                            LOGIN
                                        </span>
                                        <FiChevronRight size={18} className="translate-x-0 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 flex items-center justify-center gap-2 pt-4 border-t border-white/[0.03]">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.4em]">
                                Terminal Active • v2.0
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branding Watermark */}
            <div className="absolute bottom-10 left-10 pointer-events-none opacity-20 hidden sm:block">
                <p className="text-[10px] text-white font-black uppercase tracking-[0.8em] vertical-text">
                    Kitchen Control Unit
                </p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes letter-pop {
                    0% { opacity: 0; transform: translateY(10px) scale(0.5); filter: blur(10px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                .animate-letter-pop {
                    animation: letter-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}} />
        </div>
    );
};

export default KitchenLogin;
