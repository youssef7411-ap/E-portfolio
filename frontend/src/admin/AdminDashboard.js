import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import SubjectManagement from './pages/SubjectManagement';
import PostManagement from './pages/PostManagement';
import Dashboard from './pages/Dashboard';
import Emailing from './pages/Emailing';
import AdminCrashGuard from '../components/AdminCrashGuard';
import '../styles/Admin.css';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin' },
  { id: 'subjects', label: 'Subjects', icon: '📂', path: '/admin/subjects' },
  { id: 'posts', label: 'Posts', icon: '📝', path: '/admin/posts' },
  { id: 'emailing', label: 'Emailing', icon: '✉️', path: '/admin/emailing' },
];

function AdminDashboard({ setIsAdmin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editMode, setEditMode] = useState(() => {
    return localStorage.getItem('editMode') === 'true';
  });

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Save edit mode preference
  useEffect(() => {
    localStorage.setItem('editMode', editMode);
  }, [editMode]);

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
          <span className="admin-logo">⚡ Admin</span>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="admin-nav">
          {NAV.map(({ id, label, icon, path }) => (
            <button
              key={id}
              className={`admin-nav-link ${activeNav === id ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-section">
          <div className="edit-mode-toggle">
            <span className="edit-mode-label">Edit Mode</span>
            <button 
              className={`toggle-switch ${editMode ? 'on' : ''}`}
              onClick={() => setEditMode(!editMode)}
              aria-pressed={editMode}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>

        <div className="admin-sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            ↩ Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <span className="admin-topbar-title">
            {NAV.find(n => n.id === activeNav)?.label}
          </span>
          <div className="edit-mode-indicator" data-active={editMode}>
            {editMode ? 'Editing' : 'Viewing'}
          </div>
        </header>

        <main className="admin-content">
          <AdminCrashGuard>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="subjects" element={<SubjectManagement />} />
              <Route path="posts" element={<PostManagement />} />
              <Route path="emailing" element={<Emailing />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminCrashGuard>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;