import { motion } from 'framer-motion';

function ThemeToggle({ darkMode, setDarkMode }) {
  return (
    <motion.button
      type="button"
      className="theme-toggle"
      aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setDarkMode(!darkMode)}
      whileTap={{ scale: 0.97 }}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-icon">{darkMode ? '☾' : '☀'}</span>
        <span className={`theme-toggle-thumb ${darkMode ? 'dark' : 'light'}`} />
      </span>
    </motion.button>
  );
}

export default ThemeToggle;
