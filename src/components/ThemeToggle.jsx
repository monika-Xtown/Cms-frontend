import { FiMoon, FiSun, FiAward, FiZap, FiBriefcase, FiStar } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext.jsx';

const baseBtn =
  'flex items-center gap-2 rounded-full px-3 py-2 landscape:h-5 landscape:py-0 landscape:px-2 landscape:gap-1.5 landscape:scale-[0.85] shadow-lg transition-all duration-200 border';

const ThemeToggle = ({ variant = 'floating' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const getThemeData = () => {
    switch (theme) {
      case 'light':
        return {
          icon: <FiSun />,
          label: 'Light',
          classes: 'bg-white/90 border-gray-200 text-gray-700 hover:border-slate-400 hover:text-slate-900'
        };
      case 'professional':
        return {
          icon: <FiAward />,
          label: 'Pro',
          classes: 'bg-black/90 border-amber-500/30 text-amber-500 hover:border-amber-500 hover:shadow-[0_0_15px_rgba(250,198,57,0.3)]'
        };
      case 'modern':
        return {
          icon: <FiZap />,
          label: 'Modern',
          classes: 'bg-indigo-950/90 border-indigo-500/30 text-indigo-400 hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:text-indigo-300'
        };
      case 'executive':
        return {
          icon: <FiBriefcase />,
          label: 'Executive',
          classes: 'bg-blue-50/90 border-blue-500/30 text-blue-700 hover:border-blue-600 hover:shadow-[0_0_15px_rgba(40,116,240,0.2)] hover:text-blue-800'
        };
      case 'sunset':
        return {
          icon: <FiStar />,
          label: 'Nature',
          classes: 'bg-amber-50/90 border-amber-500/30 text-amber-800 hover:border-amber-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:text-amber-900'
        };
      default: // dark
        return {
          icon: <FiMoon />,
          label: 'Dark',
          classes: 'bg-slate-800/80 border-slate-700 text-amber-200 hover:border-amber-300 hover:text-white'
        };
    }
  };

  const { icon, label, classes } = getThemeData();

  if (variant === 'inline') {
    return (
      <button onClick={toggleTheme} className={`${baseBtn} ${classes} min-w-[90px] landscape:min-w-[65px] justify-center`}>
        <div className="scale-90 landscape:scale-75 flex items-center">{icon}</div>
        <span className="text-[10px] landscape:text-[7px] font-black uppercase tracking-wider">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`${baseBtn} ${classes} fixed bottom-28 md:bottom-5 right-5 z-40 backdrop-blur-sm min-w-[100px] justify-center active:scale-95 active:shadow-[0_0_20px_rgba(253,184,19,0.5)] active:text-white active:bg-[var(--brand-primary)] transition-all`}
      aria-label="Toggle theme"
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
};

export default ThemeToggle;

