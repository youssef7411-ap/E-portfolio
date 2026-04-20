import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PrivateRoute from './components/PrivateRoute';
import Footer from './components/Footer';
import { motion } from 'framer-motion';
import './styles/App.css';
import { API_URL } from './config/api';

const SubjectPage = lazy(() => import('./pages/SubjectPage'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminLogin = lazy(() => import('./components/AdminLogin'));

const wait = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

const loadImage = async (src) => {
  if (!src) return;
  try {
    // fetch() writes to the HTTP disk cache — persists across page refreshes
    await fetch(src, { cache: 'default' });
  } catch {
    // Fallback to Image() for any opaque/CORS-restricted resource
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = src;
    });
  }
};

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i;

const isLikelyImageFile = (file) => {
  const mime = String(file?.mimetype || '').toLowerCase();
  const url = String(file?.url || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  return mime.startsWith('image/') || IMAGE_EXT_RE.test(url) || IMAGE_EXT_RE.test(name);
};

const warmRouteChunks = () => Promise.allSettled([
  import('./pages/SubjectPage'),
  import('./components/AdminLogin'),
  import('./admin/AdminDashboard'),
]);

const preloadPublicGraphics = async (onProgress) => {
  const [subjects, publicPosts] = await Promise.all([
    fetchJsonWithTimeout(`${API_URL}/api/subjects`, 2800),
    fetchJsonWithTimeout(`${API_URL}/api/posts`, 2800),
  ]);

  const token = localStorage.getItem('adminToken');
  const adminPosts = token
    ? await fetchJsonWithTimeout(`${API_URL}/api/posts/admin/all`, 3600, {
        Authorization: `Bearer ${token}`,
      })
    : [];

  const allPosts = [...publicPosts, ...adminPosts];

  const subjectImages = subjects
    .map((subject) => subject?.image)
    .filter(Boolean);

  const postImages = allPosts.flatMap((post) => {
    const images = Array.isArray(post?.images) ? post.images : [];
    const fileImages = Array.isArray(post?.files)
      ? post.files
          .filter((file) => file?.url && isLikelyImageFile(file))
          .map((file) => file.url)
      : [];

    return [...images, ...fileImages];
  });

  const uniqueImages = [...new Set([...subjectImages, ...postImages])];
  const MAX_PRELOAD_IMAGES = 18;
  const preloadImages = uniqueImages.slice(0, MAX_PRELOAD_IMAGES);
  const total = preloadImages.length;
  let loaded = 0;

  if (onProgress) {
    onProgress({ loaded, total });
  }

  const CONCURRENCY = 6;
  for (let i = 0; i < preloadImages.length; i += CONCURRENCY) {
    const batch = preloadImages.slice(i, i + CONCURRENCY);
    await Promise.allSettled(batch.map((url) => loadImage(url)));
    loaded += batch.length;
    if (onProgress) {
      onProgress({ loaded, total });
    }
  }
};

const getVisitorId = () => {
  const key = 'visitorId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(key, id);
  }
  return id;
};

const fetchJsonWithTimeout = async (url, timeoutMs = 3000, extraHeaders = {}) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: extraHeaders,
    });
    if (!response.ok) {
      return [];
    }
    const data = await response.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  } finally {
    window.clearTimeout(timer);
  }
};

function App({ darkMode, setDarkMode }) {
  const [, setIsAdmin] = useState(!!localStorage.getItem('adminToken'));
  const [bootPhase, setBootPhase] = useState('zoom-in');
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    let isActive = true;
    let doneTimer;

    const runBootSequence = async () => {
      await wait(50);

      if (!isActive) {
        return;
      }

      setBootPhase('zoom-in');

      await Promise.allSettled([
        wait(2200),
        warmRouteChunks(),
        preloadPublicGraphics((progress) => {
          if (isActive) {
            setPreloadProgress(progress);
          }
        }),
      ]);

      if (!isActive) {
        return;
      }

      setBootPhase('out');
      doneTimer = window.setTimeout(() => {
        if (isActive) {
          setBootPhase('done');
        }
      }, 420);
    };

    runBootSequence();

    return () => {
      isActive = false;
      if (doneTimer) {
        window.clearTimeout(doneTimer);
      }
    };
  }, []);

  useEffect(() => {
    const visitorId = getVisitorId();

    const sendVisit = async (payload = {}) => {
      try {
        await fetch(`${API_URL}/api/visitors/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitorId,
            path: window.location.pathname,
            ...payload,
          }),
        });
      } catch (err) {
        // Non-blocking analytics call.
      }
    };

    const askedLocation = localStorage.getItem('locationPrompted') === 'true';
    const savedLocationRaw = localStorage.getItem('lastKnownLocation');
    const savedLocation = savedLocationRaw ? JSON.parse(savedLocationRaw) : null;

    if (!navigator.geolocation) {
      sendVisit({ permission: 'unsupported' });
      return;
    }

    const sendCurrentLocation = () => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const location = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          localStorage.setItem('locationPrompted', 'true');
          localStorage.setItem('lastKnownLocation', JSON.stringify(location));
          sendVisit({ permission: 'granted', location });
        },
        err => {
          localStorage.setItem('locationPrompted', 'true');
          if (err?.code === 1) {
            localStorage.removeItem('lastKnownLocation');
            sendVisit({ permission: 'denied' });
          } else {
            sendVisit({
              permission: savedLocation ? 'granted' : 'prompt',
              location: savedLocation || undefined,
            });
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    };

    const runLocationFlow = async () => {
      let permissionState = 'unknown';
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          permissionState = status.state;
        }
      } catch {
        permissionState = 'unknown';
      }

      if (permissionState === 'granted') {
        sendCurrentLocation();
        return;
      }

      if (permissionState === 'denied') {
        localStorage.setItem('locationPrompted', 'true');
        localStorage.removeItem('lastKnownLocation');
        sendVisit({ permission: 'denied' });
        return;
      }

      if (!askedLocation) {
        sendCurrentLocation();
        return;
      }

      sendVisit({
        permission: savedLocation ? 'granted' : 'prompt',
        location: savedLocation || undefined,
      });
    };

    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => { runLocationFlow(); }, { timeout: 2500 })
      : window.setTimeout(() => { runLocationFlow(); }, 1200);

    return () => {
      if (window.cancelIdleCallback && typeof schedule === 'number') {
        window.cancelIdleCallback(schedule);
      } else {
        window.clearTimeout(schedule);
      }
    };
  }, []);

  if (bootPhase !== 'done') {
    return (
      <div
        className={[
          'app-boot',
          bootPhase === 'out' ? 'boot-out' : bootPhase,
          darkMode ? 'dark-mode' : '',
        ].filter(Boolean).join(' ')}
        aria-label="Loading"
      >
        <div className="boot-content">
          <motion.div 
            className="boot-signature-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <motion.h1 
              className="boot-signature-gold"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 15 }}
            >
              YOUSSEF
            </motion.h1>
            <motion.div 
              className="portfolio-shimmer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
            >
              PORTFOLIO
            </motion.div>
            <motion.div
              className="boot-curated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.25 }}
            >
              Curated by Youssef
            </motion.div>
            <motion.div
              className="boot-preload-status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.2 }}
            >
              {preloadProgress.total > 0
                ? `Loading graphics ${preloadProgress.loaded}/${preloadProgress.total}`
                : 'Loading graphics...'}
            </motion.div>
            <div className="boot-spinner" />
          </motion.div>
        </div>
        <div className="boot-progress" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Router>
      <motion.div 
        className={darkMode ? 'dark-mode' : ''} 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Routes>
          <Route path="/" element={<Home darkMode={darkMode} setDarkMode={setDarkMode} />} />
          <Route path="/subject/:id" element={
            <Suspense fallback={<div className="spinner" style={{margin: '100px auto'}} />}>
              <SubjectPage darkMode={darkMode} setDarkMode={setDarkMode} />
            </Suspense>
          } />
          <Route path="/admin/login" element={
            <Suspense fallback={<div className="spinner" style={{margin: '100px auto'}} />}>
              <AdminLogin setIsAdmin={setIsAdmin} />
            </Suspense>
          } />
          <Route
            path="/admin/*"
            element={
              <PrivateRoute>
                <Suspense fallback={<div className="spinner" style={{margin: '100px auto'}} />}>
                  <AdminDashboard setIsAdmin={setIsAdmin} />
                </Suspense>
              </PrivateRoute>
            }
          />
        </Routes>
        {window.location.pathname !== '/admin/login' && <Footer darkMode={darkMode} />}
      </motion.div>
    </Router>
  );
}

export default App;
