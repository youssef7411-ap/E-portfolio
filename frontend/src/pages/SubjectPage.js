import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import PostCard from '../components/PostCard';
import '../styles/SubjectPage.css';
import { API_URL } from '../config/api';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

function SubjectPage({ darkMode, setDarkMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ semester: '', grade: '', type: '' });
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [attachmentMode, setAttachmentMode] = useState('any'); // any | with | without
  const [dateRange, setDateRange] = useState('all'); // all | 7d | 30d | 365d
  const reduceMotion = useReducedMotion();

  const fetchAll = useCallback(async () => {
    try {
      const [subjectRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/subjects/${id}`),
        fetch(`${API_URL}/api/posts/subject/${id}`),
      ]);
      setSubject(await subjectRes.json());
      setPosts(await postsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const semesters = useMemo(() => [...new Set(posts.map(p => p.semester).filter(Boolean))].sort(), [posts]);
  const grades    = useMemo(() => [...new Set(posts.map(p => p.grade).filter(Boolean))].sort(), [posts]);

  const typeCounts = useMemo(() => {
    const counts = new Map();
    for (const p of posts) {
      const t = p?.type || '';
      if (!t) continue;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return counts;
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (filters.semester) list = list.filter(p => p.semester === filters.semester);
    if (filters.grade)    list = list.filter(p => p.grade    === filters.grade);
    if (filters.type)     list = list.filter(p => p.type     === filters.type);
    if (attachmentMode !== 'any') {
      list = list.filter((p) => {
        const hasAny = (p?.images?.length || 0) + (p?.videos?.length || 0) + (p?.files?.length || 0) > 0;
        return attachmentMode === 'with' ? hasAny : !hasAny;
      });
    }
    if (dateRange !== 'all') {
      const now = Date.now();
      const ms = dateRange === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : dateRange === '30d'
          ? 30 * 24 * 60 * 60 * 1000
          : 365 * 24 * 60 * 60 * 1000;
      list = list.filter((p) => {
        const t = new Date(p.updatedAt || p.date_created || 0).getTime();
        return Number.isFinite(t) && now - t <= ms;
      });
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s)
      );
    }
    list = [...list].sort((a, b) => {
      const tA = new Date(a.updatedAt || a.date_created).getTime();
      const tB = new Date(b.updatedAt || b.date_created).getTime();
      return sortOrder === 'asc' ? tA - tB : tB - tA;
    });
    return list;
  }, [posts, filters, search, sortOrder, attachmentMode, dateRange]);

  const animateList = !reduceMotion && filtered.length <= 16;

  if (loading) return (
    <div className="sp-page flex-center" style={{ minHeight: '80vh' }}>
      <div className="spinner" />
    </div>
  );
  if (!subject) return (
    <div className="sp-page flex-center">
      <div className="sp-not-found glass">
        <h2>Subject Not Found</h2>
        <p>The class or subject you are looking for does not exist or has been removed.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
      </div>
    </div>
  );

  const types = [
    { id: 'note', label: 'Notes', icon: '📝' },
    { id: 'assignment', label: 'Assignments', icon: '📝' },
    { id: 'project', label: 'Projects', icon: '🚀' },
    { id: 'exam', label: 'Exams', icon: '✍️' },
    { id: 'other', label: 'Other', icon: '📎' },
  ];

  return (
    <div className="sp-page">
      {/* Header */}
      <header className="sp-header">
        <div className="container sp-header-inner">
          <button className="sp-back-btn" onClick={() => navigate('/')} title="Back to home">
            <span className="icon">←</span>
          </button>
          <div className="sp-subject-info">
            <h1 className="sp-subject-name">{subject.name}</h1>
            {subject.description && <p className="sp-subject-desc">{subject.description}</p>}
          </div>
          <div className="sp-header-meta">
            <span className="sp-badge">{posts.length} Posts</span>
            <div className="sp-view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`sp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                ⬚⬚
              </button>
              <button
                type="button"
                className={`sp-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                ≡
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container sp-body">
        <section className="sp-filters glass" aria-label="Subject filters">
          <div className="sp-filters-top">
            <div className="sp-filters-title">
              <h2 className="sp-filters-heading">Filter & Browse</h2>
              <div className="sp-count">
                Showing <strong>{filtered.length}</strong> of <strong>{posts.length}</strong>
              </div>
            </div>

            {(filters.semester || filters.grade || filters.type || search || attachmentMode !== 'any' || dateRange !== 'all') && (
              <button
                type="button"
                className="sp-reset-btn"
                onClick={() => {
                  setFilters({ semester: '', grade: '', type: '' });
                  setSearch('');
                  setAttachmentMode('any');
                  setDateRange('all');
                }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="sp-filters-grid">
            <div className="sp-filter-block sp-filter-block--span2">
              <label className="sp-label" htmlFor="sp-search">Search</label>
              <div className="sp-search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="sp-control sp-control--input"
                  id="sp-search"
                  type="text"
                  placeholder="Search by title or description…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="sp-filter-block">
              <label className="sp-label" htmlFor="sp-category">Category</label>
              <select
                id="sp-category"
                className="sp-control sp-control--select"
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">All ({posts.length})</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({typeCounts.get(t.id) || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="sp-filter-block">
              <label className="sp-label" htmlFor="sp-attachments">Attachments</label>
              <select
                id="sp-attachments"
                className="sp-control sp-control--select"
                value={attachmentMode}
                onChange={e => setAttachmentMode(e.target.value)}
              >
                <option value="any">Any</option>
                <option value="with">Has attachments</option>
                <option value="without">No attachments</option>
              </select>
            </div>

            <div className="sp-filter-block">
              <label className="sp-label" htmlFor="sp-semester">Semester</label>
              <select
                id="sp-semester"
                className="sp-control sp-control--select"
                value={filters.semester}
                onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}
              >
                <option value="">All</option>
                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="sp-filter-block">
              <label className="sp-label" htmlFor="sp-grade">Grade</label>
              <select
                id="sp-grade"
                className="sp-control sp-control--select"
                value={filters.grade}
                onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}
              >
                <option value="">All</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="sp-filter-block">
              <label className="sp-label" htmlFor="sp-date">Date</label>
              <select
                id="sp-date"
                className="sp-control sp-control--select"
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="365d">Last 12 months</option>
              </select>
            </div>

            <div className="sp-filter-block">
              <label className="sp-label">Sort</label>
              <div className="sp-segment" role="group" aria-label="Sort order">
                <button
                  type="button"
                  className={`sp-segment-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                  onClick={() => setSortOrder('desc')}
                >
                  Newest
                </button>
                <button
                  type="button"
                  className={`sp-segment-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                  onClick={() => setSortOrder('asc')}
                >
                  Oldest
                </button>
              </div>
            </div>
          </div>
        </section>

        <main className="sp-posts" aria-label="Posts list">
          {filtered.length === 0 ? (
            <div className="sp-empty glass">
              <div className="empty-icon">📂</div>
              <h3>No posts found</h3>
              <p>Try adjusting your filters or search terms to find what you're looking for.</p>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFilters({ semester: '', grade: '', type: '' });
                  setSearch('');
                  setAttachmentMode('any');
                  setDateRange('all');
                }}
              >
                Clear all filters
              </button>
            </div>
          ) : animateList ? (
            <motion.div
              className={`sp-posts-list ${viewMode === 'list' ? 'sp-posts-list--list' : ''}`}
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {filtered.map(post => (
                <PostCard key={post._id} post={post} variants={itemVariant} />
              ))}
            </motion.div>
          ) : (
            <div className={`sp-posts-list ${viewMode === 'list' ? 'sp-posts-list--list' : ''}`}>
              {filtered.map(post => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default SubjectPage;
