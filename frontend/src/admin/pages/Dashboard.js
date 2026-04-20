import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../styles/Dashboard.css';
import { API_URL } from '../../config/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#71717a' },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.08)' },
      ticks: { color: '#71717a' },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#d4d4d8', padding: 16 },
    },
  },
  cutout: '70%',
};

function Dashboard() {
  const [stats, setStats] = useState({ subjects: 0, posts: 0, recentUploads: 0, visitors: 0, visitorsToday: 0, withLocation: 0 });
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState([]);
  const [subjects, setSubjects] = useState([]);

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

      setAllPosts(posts);
      setSubjects(subjects);

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

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const months = [];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = allPosts.filter(post => {
        const t = new Date(post.updatedAt || post.date_created || 0).getTime();
        return t >= d.getTime() && t < new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      }).length;
      months.push({ label: monthLabels[d.getMonth()], count, key: i });
    }
    
    const max = Math.max(1, ...months.map(m => m.count));
    return months.map(m => ({
      ...m,
      height: max > 0 ? Math.max(20, (m.count / max) * 100) : 20,
    }));
  }, [allPosts]);

  const activityChartData = useMemo(() => ({
    labels: monthlyActivity.map(m => m.label),
    datasets: [{
      data: monthlyActivity.map(m => m.count),
      backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'],
      borderRadius: 6,
    }],
  }), [monthlyActivity]);

  const subjectChartData = useMemo(() => {
    const topSubjects = subjects.slice(0, 3);
    const postCounts = topSubjects.map(s => 
      allPosts.filter(p => String(p.subject?._id || p.subject) === String(s._id)).length
    );
    return {
      labels: topSubjects.map(s => s.name),
      datasets: [{
        data: postCounts,
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6'],
        borderWidth: 0,
      }],
    };
  }, [subjects, allPosts]);

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

      {!loading && allPosts.length > 0 && (
        <>
          <div className="db-section-title" style={{ marginTop: 8 }}>Analytics</div>
          <div className="db-chart-grid">
            <div className="db-chart-card">
              <div className="db-chart-title">Posting Activity (Last 6 Months)</div>
              <div className="chart-container" style={{ height: '180px' }}>
                <Bar data={activityChartData} options={chartOptions} />
              </div>
            </div>

            <div className="db-chart-card">
              <div className="db-chart-title">Top 3 Subjects by Posts</div>
              <div className="chart-container" style={{ height: '180px' }}>
                <Doughnut data={subjectChartData} options={doughnutOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="db-section-title" style={{ marginTop: 8 }}>Quick Actions</div>
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
