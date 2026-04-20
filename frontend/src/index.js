import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

function Root() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="spinner w-12 h-12" /></div>;
  }

  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);