import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Layout from "../../components/Layout.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import rightSideImage from '../../assets/login_bg.jpg';
import logo from '../../assets/Xtown-dark-logo.png';

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      if (result.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        if (!result.user.unit_id) {
          setError(
            "You are not assigned to a unit. Please contact administrator."
          );
        } else {
          navigate("/kiosk/products");
        }
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <Layout showFooter={false} showThemeToggle={false}>
      <div className="relative w-full h-[100dvh] overflow-hidden flex items-center justify-center lg:justify-start bg-slate-900 animate-page-zoom-out">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src={rightSideImage}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-70 lg:opacity-100"
          />
          <div className="absolute inset-0 bg-black/30 lg:bg-black/10"></div>
        </div>

        {/* Top Left Logo */}
        <img
          src={logo}
          alt="Logo"
          className="absolute top-6 left-6 w-24 sm:w-32 z-20 object-contain drop-shadow-md"
        />

        {/* Form Container */}
        <div className="relative z-10 w-full max-w-[360px] sm:max-w-[380px] px-6 mx-auto lg:mx-0 lg:ml-24 xl:ml-32">
          <div className="bg-white/20 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/30 animate-in fade-in slide-in-from-bottom-8 duration-700">

            <div className="mb-8 text-center">
              <p className="text-[13px] font-black uppercase tracking-[0.3em] text-white mb-1 animate-venum-glow animate-venum-pulse shadow-orange-500/20">Welcome to PM2</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Kiosk Login</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-white px-4 py-3 rounded-2xl text-[11px] font-black animate-shake text-center uppercase tracking-wider">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-widest ml-4 shadow-sm" style={{ fontWeight: 700 }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="normal-case w-full px-6 py-3.5 rounded-2xl bg-white/90 border border-white/20 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 text-zinc-900 placeholder:text-zinc-600 transition-all text-base outline-none font-bold shadow-sm"
                  required
                  autoFocus
                  placeholder="Enter username"
                  style={{ color: '#18181b' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-900 uppercase tracking-widest ml-4 shadow-sm" style={{ fontWeight: 700 }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-3.5 rounded-2xl bg-white/90 border border-white/20 focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 text-zinc-900 placeholder:text-zinc-600 transition-all text-base outline-none font-bold shadow-sm"
                  required
                  placeholder="••••••••"
                  style={{ color: '#18181b' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50 mt-4 text-sm"
              >
                {loading ? "Authenticating..." : "Login to Kiosk"}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center">
              <button
                onClick={() => navigate("/admin/login")}
                className="text-[10px] font-black text-white/60 hover:text-white uppercase tracking-widest transition-colors"
                style={{ textShadow: '0 1px 0 rgba(0,0,0,0.2)' }}
              >
                Admin Login
              </button>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Login;