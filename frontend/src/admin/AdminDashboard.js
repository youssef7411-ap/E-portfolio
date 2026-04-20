import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import SubjectManagement from './pages/SubjectManagement';
import PostManagement from './pages/PostManagement';
import Dashboard from './pages/Dashboard';
import AdminCrashGuard from '../components/AdminCrashGuard';
import '../styles/Admin.css';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const SubjectIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20h-8a2.5 2.5 0 0 1-2.5-2.5v-9a2.5 2.5 0 0 1 2.5-2.5h8z" />
    <path d="M8 7h6" />
    <path d="M8 11h8" />
  </svg>
);

const PostIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h18" />
    <path d="M3 6h18" />
    <path d="M3 18h18" />
  </svg>
);

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, path: '/admin' },
  { id: 'subjects',  label: 'Subjects',  icon: SubjectIcon,   path: '/admin/subjects' },
  { id: 'posts',     label: 'Posts',     icon: PostIcon,      path: '/admin/posts' },
];

function AdminDashboard({ setIsAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdmin(false);
    navigate('/admin/login');
  };

  const activeNav = NAV.find(n =>
    n.id === 'dashboard'
      ? location.pathname === '/admin' || location.pathname === '/admin/'
      : location.pathname.startsWith(n.path)
  )?.id || 'dashboard';

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Admin
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <CloseIcon />
          </button>
        </div>

        <nav className="admin-nav">
          {NAV.map(({ id, label, icon: Icon, path }) => (
            <button
              key={id}
              className={`admin-nav-link ${activeNav === id ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <span className="nav-icon"><Icon /></span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <span className="admin-topbar-title">
            {NAV.find(n => n.id === activeNav)?.label}
          </span>
        </header>

        <main className="admin-content">
          <AdminCrashGuard>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="subjects" element={<SubjectManagement />} />
              <Route path="posts" element={<PostManagement />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminCrashGuard>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;