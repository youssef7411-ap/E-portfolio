import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminLogin.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';const MAX_PARTICLES = 40; // Reduced from 96
  const MOUSE_SPAWN_INTERVAL_MS = 150; // Increased from 5028;

function nearestBorderPoint(x, y, rect) {
  const distances = {
    left: Math.abs(x - rect.left),
    right: Math.abs(x - rect.right),
    top: Math.abs(y - rect.top),
    bottom: Math.abs(y - rect.bottom)
  };

  const edge = Object.keys(distances).reduce((a, b) =>
    distances[a] < distances[b] ? a : b
  );

  if (edge === 'left') return { x: rect.left, y: Math.min(Math.max(y, rect.top), rect.bottom) };
  if (edge === 'right') return { x: rect.right, y: Math.min(Math.max(y, rect.top), rect.bottom) };
  if (edge === 'top') return { x: Math.min(Math.max(x, rect.left), rect.right), y: rect.top };

  return { x: Math.min(Math.max(x, rect.left), rect.right), y: rect.bottom };
}

function CrystalLampLogin({ setIsAdmin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [usernamePulse, setUsernamePulse] = useState(false);
  const [passwordPulse, setPasswordPulse] = useState(false);
  const [attractToBorder, setAttractToBorder] = useState(false);
  const [activeField, setActiveField] = useState('username');
  const [scanActive, setScanActive] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();
  const formRef = useRef(null);
  const pageRef = useRef(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const attractRef = useRef(false);
  const spawnTickRef = useRef(0);
  const attractTimerRef = useRef(null);
  const pulseTimersRef = useRef([]);
  const scanTimerRef = useRef(null);

  const typedCount = username.length + password.length;
  const typedIntensity = Math.min(1, typedCount / 16);

  // Sound effects
  const playSound = (type = 'click') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        oscillator.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(110, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const spawnParticle = (x, y, burst = false) => {
    const count = burst ? 14 : 3;

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = burst ? 1.8 + Math.random() * 2.6 : 0.8 + Math.random() * 1.6;

      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: burst ? 0.014 + Math.random() * 0.01 : 0.02 + Math.random() * 0.012,
        size: burst ? 2.8 + Math.random() * 3.8 : 1.8 + Math.random() * 2.8,
        hue: 44 + Math.random() * 8
      });
    }

    if (particlesRef.current.length > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    }
  };

  useEffect(() => {
    attractRef.current = attractToBorder;
  }, [attractToBorder]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return undefined;
    }

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const rect = formRef.current?.getBoundingClientRect();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current = particlesRef.current
        .map((p) => {
          let { vx, vy } = p;

          if (attractRef.current && rect) {
            const target = nearestBorderPoint(p.x, p.y, rect);
            vx += (target.x - p.x) * 0.02;
            vy += (target.y - p.y) * 0.02;
          }

          vx *= 0.93;
          vy *= 0.93;

          return {
            ...p,
            x: p.x + vx,
            y: p.y + vy,
            vx,
            vy,
            life: p.life - p.decay
          };
        })
        .filter((p) => p.life > 0.02);

      ctx.globalCompositeOperation = 'lighter';
      for (const particle of particlesRef.current) {
        ctx.fillStyle = `hsla(${particle.hue}, 95%, 66%, ${Math.max(0, particle.life)})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const pulseTimers = pulseTimersRef.current;

    return () => {
      if (attractTimerRef.current) {
        window.clearTimeout(attractTimerRef.current);
      }

      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }

      pulseTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const triggerAttract = () => {
    setAttractToBorder(true);

    if (attractTimerRef.current) {
      window.clearTimeout(attractTimerRef.current);
    }

    attractTimerRef.current = window.setTimeout(() => {
      setAttractToBorder(false);
    }, 900);
  };

  const pulseInput = (setter) => {
    setter(true);
    const timer = window.setTimeout(() => setter(false), 220);
    pulseTimersRef.current.push(timer);
  };

  const triggerScan = () => {
    setScanActive(false);

    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
    }

    window.requestAnimationFrame(() => {
      setScanActive(true);
      scanTimerRef.current = window.setTimeout(() => {
        setScanActive(false);
      }, 900);
    });
  };

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const now = performance.now();

    // Parallax update
    const moveX = (clientX - window.innerWidth / 2) / 30;
    const moveY = (clientY - window.innerHeight / 2) / 30;
    setParallax({ x: moveX, y: moveY });

    if (now - spawnTickRef.current < MOUSE_SPAWN_INTERVAL_MS) {
      return;
    }
    spawnTickRef.current = now;
    spawnParticle(clientX, clientY, false);
  };

  const handleInputFocus = (fieldName) => (e) => {
    setActiveField(fieldName);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnParticle(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    triggerAttract();
    triggerScan();
    playSound('click');
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    pulseInput(setUsernamePulse);
    setActiveField('username');
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    pulseInput(setPasswordPulse);
    setActiveField('password');

    // Simple strength calculation
    let strength = 0;
    if (value.length > 0) strength += 1;
    if (value.length >= 8) strength += 1;
    if (/[A-Z]/.test(value)) strength += 1;
    if (/[0-9]/.test(value)) strength += 1;
    if (/[^A-Za-z0-9]/.test(value)) strength += 1;
    setPasswordStrength(strength);

    // Easter egg: "magic" password
    if (value.toLowerCase() === 'magic') {
      spawnParticle(window.innerWidth / 2, window.innerHeight / 2, true);
      spawnParticle(window.innerWidth / 2, window.innerHeight / 2, true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsShaking(false);
    playSound('click');

    // Ripple effect on button
    const btn = e.target.querySelector('.gold-btn');
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // Mobile vibration
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setLoginSuccess(true);
        playSound('success');
        localStorage.setItem('adminToken', data.token);
        setIsAdmin(true);
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      } else {
        setError(data.message || 'Login failed');
        setIsShaking(true);
        playSound('error');
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch (err) {
      setError('Connection error');
      setIsShaking(true);
      playSound('error');
      setTimeout(() => setIsShaking(false), 600);
    }

    setLoading(false);
  };

  return (
    <div className="crystal-lamp-page" ref={pageRef} onMouseMove={handleMouseMove}>
      <canvas ref={canvasRef} className="particle-layer" aria-hidden="true" />

      {/* Parallax background layers */}
      <div className="parallax-layer bg-gradient" style={{ transform: `translate(${parallax.x * 0.2}px, ${parallax.y * 0.2}px)` }} />
      <div className="parallax-layer bg-dots" style={{ transform: `translate(${parallax.x * 0.5}px, ${parallax.y * 0.5}px)` }} />

      <div
        className={`prism-field ${typedCount > 0 ? 'active' : ''}`}
        style={{
          '--prism-shift': `${Math.min(typedCount * 4, 56)}px`,
          transform: `translate(${parallax.x * 0.8}px, ${parallax.y * 0.8}px)`
        }}
        aria-hidden="true"
      >
        <div className="prism-crystal" />
        <div className="prism-ray prism-ray-a" />
        <div className="prism-ray prism-ray-b" />
      </div>

      <div className={`floating-orb orb-${activeField} ${typedCount > 0 ? 'charged' : ''}`} style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }} aria-hidden="true">
        <div className="orb-core" />
        <div className="orb-ring" />
        <div className="orb-trail" />
      </div>

      <div className="main-container" style={{ '--typed-intensity': typedIntensity }}>
        <div className={`glass-box ${isShaking ? 'shaking' : ''}`} id="loginForm" ref={formRef}>
          <div className={`scan-light ${scanActive ? 'active' : ''}`} aria-hidden="true">
            <span className="scan-beam" />
            <span className="scan-dust dust-a" />
            <span className="scan-dust dust-b" />
            <span className="scan-dust dust-c" />
          </div>

          <form className="form-content" onSubmit={handleSubmit} noValidate>
            <div className={`input-group staggered-1 ${usernamePulse ? 'refract' : ''} ${activeField === 'username' ? 'focused' : ''} ${username ? 'filled' : ''}`}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                autoComplete="username"
                placeholder=" "
                value={username}
                onChange={handleUsernameChange}
                onFocus={handleInputFocus('username')}
                disabled={loading}
                required
                aria-required="true"
              />
            </div>

            <div className={`input-group staggered-2 ${passwordPulse ? 'refract' : ''} ${activeField === 'password' ? 'focused' : ''} ${password ? 'filled' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder=" "
                  value={password}
                  onChange={handlePasswordChange}
                  onFocus={handleInputFocus('password')}
                  disabled={loading}
                  required
                  aria-required="true"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => { setShowPassword(!showPassword); playSound('click'); }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>

              {password.length > 0 && (
                <div className="strength-container" aria-live="polite">
                  <div className={`strength-bar strength-${passwordStrength}`} />
                  <span className="strength-label">
                    {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 4 ? 'Moderate' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            <div className="form-options staggered-3">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => { setRememberMe(e.target.checked); playSound('click'); }}
                />
                <span className="checkmark"></span>
                Remember Me
              </label>
            </div>

            {error && <div className="error" role="alert">{error}</div>}

            <button className={`gold-btn staggered-4 ${loading ? 'btn-loading' : ''}`} type="submit" disabled={loading}>
              <span className="btn-glow" />
              <div className="btn-progress" style={{ width: loading ? '100%' : '0%' }} />
              <div className="btn-content">
                {loading ? (
                  <div className="loading-content">
                    <div className="spinner" />
                  </div>
                ) : 'SIGN IN'}
              </div>
            </button>
          </form>

          {loginSuccess && (
            <div className="success-overlay" role="status">
              <div className="success-checkmark">
                <svg viewBox="0 0 52 52">
                  <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                  <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>
              <p>Welcome back</p>
            </div>
          )}
        </div>
      </div>

      <footer className="admin-login-footer">
        <span className="admin-footer-label">CURATED BY</span>
        <span className="admin-footer-signature">Youssef</span>
      </footer>
    </div>
  );
}

export default CrystalLampLogin;
