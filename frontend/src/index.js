import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

function Root() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(JSON.parse(saved));
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [darkMode]);

  if (!mounted) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="spinner w-12 h-12" /></div>;
  }

  return <App darkMode={darkMode} setDarkMode={setDarkMode} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
