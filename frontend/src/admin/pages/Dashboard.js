import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function Dashboard() {
  const [stats, setStats] = useState({ subjects: 0, posts: 0, recentUploads: 0, visitors: 0, visitorsToday: 0, withLocation: 0 });
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        window.location.href = '/admin/login';
        return;
      }

      const [subjectsRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/subjects`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/posts/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const visitorsRes = await fetch(`${API_URL}/api/visitors/stats`, { headers: { 'Authorization': `Bearer ${token}` } });

      if ([subjectsRes, postsRes, visitorsRes].some(r => r.status === 401 || r.status === 403)) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return;
      }

      const subjects = subjectsRes.ok ? await subjectsRes.json() : [];
      const posts    = postsRes.ok ? await postsRes.json() : [];
      const visitorsData = visitorsRes.ok ? await visitorsRes.json() : { totalVisitors: 0, activeToday: 0, withLocation: 0, recentVisitors: [] };

      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentUploads = Array.isArray(posts)
        ? posts.filter(p => {
            const hasAttachment = (p.images?.length || 0) + (p.videos?.length || 0) + (p.files?.length || 0) > 0;
            const postTime = new Date(p.updatedAt || p.date_created || 0).getTime();
            return hasAttachment && postTime >= weekAgo;
          }).length
        : 0;

      setStats({
        subjects:  Array.isArray(subjects) ? subjects.length : 0,
        posts:     Array.isArray(posts) ? posts.length : 0,
        recentUploads,
        visitors: Number(visitorsData.totalVisitors || 0),
        visitorsToday: Number(visitorsData.activeToday || 0),
        withLocation: Number(visitorsData.withLocation || 0),
      });
      setRecentVisitors(Array.isArray(visitorsData.recentVisitors) ? visitorsData.recentVisitors : []);
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  const CARDS = [
    { icon: '📂', label: 'Total Subjects', value: stats.subjects,      color: 'blue' },
    { icon: '📝', label: 'Total Posts',    value: stats.posts,         color: 'gold' },
    { icon: '📤', label: 'Recent uploads', value: stats.recentUploads, color: 'green' },
    { icon: '👥', label: 'Total visitors', value: stats.visitors,      color: 'yellow' },
  ];

  if (loading) return <div className="management-loading"><span className="spinner" /></div>;

  return (
    <div className="db">
      <div className="db-section-title">Overview</div>

      <div className="db-stat-grid">
        {CARDS.map(card => (
          <div key={card.label} className={`db-stat-card db-stat-${card.color}`}>
            <span className="db-stat-icon">{card.icon}</span>
            <div>
              <div className="db-stat-value">{card.value}</div>
              <div className="db-stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="db-section-title" style={{ marginTop: 32 }}>Quick Actions</div>
      <div className="db-actions">
        <Link to="/admin/subjects" className="btn btn-primary btn-sm">➕ New Subject</Link>
        <Link to="/admin/posts"    className="btn btn-primary btn-sm">➕ New Post</Link>
        <Link to="/"               className="btn btn-secondary btn-sm" target="_blank" rel="noopener noreferrer">↗ View Site</Link>
      </div>

      <div className="db-section-title" style={{ marginTop: 32 }}>Visitors & Locations</div>
      <div className="db-visitor-meta">
        <span>Today: <strong>{stats.visitorsToday}</strong></span>
        <span>Shared location: <strong>{stats.withLocation}</strong></span>
      </div>
      <div className="db-visitor-list">
        {recentVisitors.length === 0 ? (
          <div className="db-visitor-empty">No visitor data yet.</div>
        ) : recentVisitors.map(v => (
          <div key={v.visitorId} className="db-visitor-item">
            <div className="db-visitor-line">
              <strong>{v.visitorId.slice(0, 8)}...</strong>
              <span>{new Date(v.lastSeenAt).toLocaleString()}</span>
            </div>
            <div className="db-visitor-line db-visitor-sub">
              <span>Path: {v.lastPath || '/'}</span>
              <span>Permission: {v.locationPermission || 'unknown'}</span>
            </div>
            <div className="db-visitor-line db-visitor-sub">
              {v.location?.latitude != null && v.location?.longitude != null ? (
                <span>
                  Lat/Lng: {v.location.latitude.toFixed(5)}, {v.location.longitude.toFixed(5)}
                  {' '}
                  <a
                    className="db-location-btn"
                    href={`https://www.google.com/maps?q=${v.location.latitude},${v.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    See location
                  </a>
                </span>
              ) : (
                <span>Location not shared</span>
              )}
              <span>Visits: {v.visits || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
