import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './styles/index.css';
import App from './App';

function Root() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    const isDark = saved !== null ? saved === 'true' : true;
    // Set initial theme immediately
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    return isDark;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  if (!mounted) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="spinner w-12 h-12" /></div>;
  }

  return (
    <Provider store={store}>
      <App darkMode={darkMode} setDarkMode={setDarkMode} />
    </Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);