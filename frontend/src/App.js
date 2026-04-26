import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import PrivateRoute from './components/PrivateRoute';
import Footer from './components/Footer';
import AdminCrashGuard from './components/AdminCrashGuard';
import ScrollToTop from './components/ScrollToTop';
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
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(key, id);
    }
    return id;
  } catch (e) {
    return `fallback-${Date.now()}`;
  }
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

function AppBody({ darkMode, setDarkMode, setIsAdmin }) {
  const location = useLocation();
  const [bootPhase, setBootPhase] = useState('zoom-in');
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
  const preloadPercent = preloadProgress.total > 0
    ? Math.min(100, Math.round((preloadProgress.loaded / preloadProgress.total) * 100))
    : 0;

  useEffect(() => {
    let isActive = true;
    let doneTimer;

    const runBootSequence = async () => {
      console.log("Starting Boot Sequence [Aesthetic V2]...");
      // Small delay to ensure styles are applied
      await wait(100);

      if (!isActive) return;

      setBootPhase('zoom-in');
      console.log("Phase: zoom-in");

      try {
        console.log("Starting asset preloads...");
        await Promise.allSettled([
          wait(800), // Reduced from 2500 to allow IntroAnimation to take over sooner
          warmRouteChunks(),
          preloadPublicGraphics((progress) => {
            if (isActive) {
              setPreloadProgress(progress);
              console.log(`Preload progress: ${progress.loaded}/${progress.total}`);
            }
          }),
        ]);
        console.log("Preloads settled.");
      } catch (err) {
        console.error("Boot sequence error caught:", err);
      }

      if (!isActive) return;

      console.log("Phase: out");
      setBootPhase('out');
      doneTimer = window.setTimeout(() => {
        if (isActive) {
          console.log("Phase: done. Rendering AppBody.");
          setBootPhase('done');
        }
      }, 500);
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
           bootPhase === 'out' ? 'boot-out' : `boot-phase-${bootPhase}`,
         ].filter(Boolean).join(' ')}
         aria-label="Loading"
       >
         <div className="boot-shell">
           <div className="boot-terminal-icon" />
           
           <div className="boot-status-container">
             <div className="boot-status-text">
               <span>Youssef's Portfolio...</span>
               <span>{preloadPercent}%</span>
             </div>
             <div className="boot-status-bar">
               <div 
                 className="boot-status-fill" 
                 style={{ width: `${preloadPercent}%` }} 
               />
             </div>
             <div className="boot-status-text" style={{ fontSize: '9px', opacity: 0.6 }}>
               {preloadProgress.total > 0
                 ? `Fetching assets: ${preloadProgress.loaded}/${preloadProgress.total}`
                 : 'Establishing connection...'}
             </div>
           </div>
         </div>
       </div>
     );
   }

   return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AdminCrashGuard>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/subject/:id" element={
            <Suspense fallback={<div className="spinner" style={{margin: '100px auto'}} />}>
              <SubjectPage />
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
      </AdminCrashGuard>
      {location.pathname !== '/admin/login' && (
         <Footer darkMode={darkMode} isAdminRoute={location.pathname.startsWith('/admin')} />
       )}
       <ScrollToTop />
      </motion.div>
  );
}

function App({ darkMode, setDarkMode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  console.log("App state:", { isAdmin });
  
  return (
    <BrowserRouter>
      <AppBody 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        setIsAdmin={setIsAdmin} 
      />
    </BrowserRouter>
  );
}

export default App;
