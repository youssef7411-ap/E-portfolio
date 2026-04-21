import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './styles/index.css';
import App from './App';

function Root() {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      const isDark = saved !== null ? saved === 'true' : true;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      return isDark;
    } catch (e) {
      console.warn("LocalStorage access failed:", e);
      return true; // Default to dark
    }
  });

  useEffect(() => {
    const init = async () => {
      try {
        console.log("React Initializing...");
        // Remove pre-loader if it exists
        const preLoader = document.getElementById('pre-loader');
        if (preLoader) {
          preLoader.style.opacity = '0';
          setTimeout(() => preLoader.remove(), 500);
        }
        setMounted(true);
      } catch (err) {
        console.error("Mounting error:", err);
        setError(err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('darkMode', darkMode);
    } catch (e) {
      // Ignore storage errors
    }
  }, [darkMode]);

  if (error) {
    return (
      <div style={{ 
        background: '#000000', 
        color: '#FFFFFF', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'monospace',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>BOOT_ERROR</h1>
        <p>System failed to initialize. Please reload.</p>
        <button onClick={() => window.location.reload()} style={{
          background: '#FFFFFF',
          color: '#000000',
          border: 'none',
          padding: '10px 20px',
          cursor: 'pointer',
          marginTop: '20px'
        }}>RETRY_REBOOT</button>
      </div>
    );
  }

  if (!mounted) {
    return <div style={{ background: '#000000', position: 'fixed', inset: 0 }} />;
  }

  return (
    <Provider store={store}>
      <App darkMode={darkMode} setDarkMode={setDarkMode} />
    </Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);