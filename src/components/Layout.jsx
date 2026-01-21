import { Link, useNavigate } from 'react-router-dom';
import xtownDarkLogo from '../assets/Xtown-dark-logo.png';
import xtownWhiteLogo from '../assets/X-white-logo.png';
import ThemeToggle from './ThemeToggle.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { FiLogOut } from 'react-icons/fi';

const Layout = ({ children, showFooter = true, showThemeToggle = true, showLogout = true, theme }) => {
  const { isDark: contextIsDark } = useTheme();
  const isDark = theme ? theme === 'dark' : contextIsDark;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-[var(--surface-main)] text-[var(--text-primary)]">
      <main className="flex-1 w-full">{children}</main>

      {showFooter && (
        <footer className="border-t py-6 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-opacity-80 transition-colors duration-300 bg-[var(--surface-card)]/90 border-[var(--border-default)]">
          <div className="max-w-7xl mx-auto w-full">
            {/* 
              Responsive Layout:
              - Mobile (< md): Flex Column (Links top, Logout middle, Powered bottom)
              - Tablet (md < lg): Flex Wrap Row (Links Top Full, Logout Left, Powered Right) -> Ensures space
              - Desktop (lg+): 3-Column Grid (Logout left, Powered center, Links right)
            */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 items-center gap-6 lg:gap-4 min-h-[60px] py-2 lg:py-0">

              {/* LOGOUT BUTTON (Mobile: Order 2, Tablet: Order 2, Desktop: Order 1) */}
              <div className="flex justify-center md:justify-start lg:justify-start w-full md:w-auto lg:w-full order-2 md:order-2 lg:order-1">
                {user && showLogout ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-red-500 hover:opacity-80 transition-all duration-300 active:scale-95"
                    title="Logout"
                  >
                    <FiLogOut size={28} />
                  </button>
                ) : (
                  <div className="hidden lg:block"></div>
                )}
              </div>

              {/* POWERED BY (Mobile: Order 3, Tablet: Order 3, Desktop: Order 2) */}
              <div className="flex justify-center md:justify-end lg:justify-center w-full md:w-auto lg:w-full order-3 md:order-3 lg:order-2">
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]"
                  >
                    Powered by
                  </span>
                  <img
                    src={isDark ? xtownWhiteLogo : xtownDarkLogo}
                    alt="XTOWN"
                    className={`h-6 md:h-8 object-contain drop-shadow-md transition-all duration-300 hover:scale-110 ${isDark ? 'brightness-125' : 'brightness-100'}`}
                  />
                </div>
              </div>


              {/* LINKS (Mobile: Order 1, Tablet: Order 1/Full Width, Desktop: Order 3) */}
              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-x-6 gap-y-2 text-sm font-medium w-full lg:w-full order-1 md:order-1 lg:order-3 md:basis-full lg:basis-auto md:mb-4 lg:mb-0">
                {[
                  { to: '/policies/terms', label: 'Terms' },
                  { to: '/policies/privacy', label: 'Privacy' },
                  { to: '/policies/refund', label: 'Refund' },
                  { to: '/policies/shipping', label: 'Shipping' }
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="transition-colors duration-200 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      )}

      {showThemeToggle && <ThemeToggle />}
    </div>
  );
};

export default Layout;
