import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminLogin.css';
import { API_URL } from '../config/api';

function CrystalLampLogin({ setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const navigate = useNavigate();
  const formRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsShaking(false);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setLoginSuccess(true);
        localStorage.setItem('adminToken', data.token);
        setIsAdmin(true);
        setTimeout(() => {
          navigate('/admin');
        }, 1200);
      } else {
        setError(data.message || 'Invalid credentials');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch (err) {
      setError('Connection error');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }

    setLoading(false);
  };

  return (
    <div className="crystal-lamp-page">
      <div className="main-container">
        <div className="login-header">
          <div className="login-brand">
            <div className="login-icon">Y</div>
            <span className="login-title">Admin</span>
          </div>
          <p className="login-subtitle">Sign in to continue</p>
        </div>

        <div className={`glass-box ${isShaking ? 'shaking' : ''}`} id="loginForm" ref={formRef}>
          {loginSuccess && (
            <div className="success-overlay">
              <div className="success-content">
                <div className="success-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <p className="success-text">Welcome back</p>
              </div>
            </div>
          )}

          <form className="form-content" onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>
                Remember me
              </label>
              <a href="javascript:void(0)" className="forgot-link" onClick={(e) => { e.preventDefault(); alert('Forgot password feature coming soon.'); }}>
                Forgot password?
              </a>
            </div>

            {error && <div className="error" role="alert">{error}</div>}

            <button className="gold-btn" type="submit" disabled={loading}>
              <span className="btn-content">
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    Signing in...
                  </>
                ) : 'Sign In'}
              </span>
            </button>
          </form>
        </div>
      </div>

      <footer className="admin-login-footer">
        <span className="admin-footer-label">Curated by</span>
        <span className="admin-footer-signature">Youssef</span>
      </footer>
    </div>
  );
}

export default CrystalLampLogin;