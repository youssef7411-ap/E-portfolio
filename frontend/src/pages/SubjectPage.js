import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import PostCard from '../components/PostCard';
import '../styles/SubjectPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

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

  const filtered = useMemo(() => {
    let list = posts;
    if (filters.semester) list = list.filter(p => p.semester === filters.semester);
    if (filters.grade)    list = list.filter(p => p.grade    === filters.grade);
    if (filters.type)     list = list.filter(p => p.type     === filters.type);
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
  }, [posts, filters, search, sortOrder]);

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
          </div>
        </div>
      </header>

      <div className="container sp-body">
        {/* Sidebar filters */}
        <aside className="sp-sidebar glass">
          <div className="sp-sidebar-header">
            <h3>Filters</h3>
            {(filters.semester || filters.grade || filters.type || search) && (
              <button
                className="sp-reset-btn"
                onClick={() => { setFilters({ semester: '', grade: '', type: '' }); setSearch(''); }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="sp-filter-group">
            <label htmlFor="sp-search">Search Posts</label>
            <div className="sp-search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="sp-control"
                id="sp-search"
                type="text"
                placeholder="Find a post..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="sp-filter-group">
            <label>Category</label>
            <div className="sp-type-chips">
              <button 
                className={`sp-chip ${!filters.type ? 'active' : ''}`}
                onClick={() => setFilters(f => ({ ...f, type: '' }))}
              >
                All
              </button>
              {types.map(t => (
                <button
                  key={t.id}
                  className={`sp-chip ${filters.type === t.id ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, type: f.type === t.id ? '' : t.id }))}
                >
                  <span className="chip-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-filter-row">
            <div className="sp-filter-group">
              <label>Semester</label>
              <select className="sp-control" value={filters.semester} onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}>
                <option value="">All</option>
                {semesters.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="sp-filter-group">
              <label>Grade</label>
              <select className="sp-control" value={filters.grade} onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}>
                <option value="">All</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="sp-filter-group">
            <label>Sort By</label>
            <div className="sp-sort-toggle">
              <button 
                className={`sp-sort-btn ${sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setSortOrder('desc')}
              >
                Newest
              </button>
              <button 
                className={`sp-sort-btn ${sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => setSortOrder('asc')}
              >
                Oldest
              </button>
            </div>
          </div>

          <div className="sp-sidebar-footer">
            <div className="sp-count">
              Showing <strong>{filtered.length}</strong> of <strong>{posts.length}</strong> posts
            </div>
          </div>
        </aside>

        {/* Posts */}
        <main className="sp-posts">
          {filtered.length === 0 ? (
            <div className="sp-empty glass">
              <div className="empty-icon">📂</div>
              <h3>No posts found</h3>
              <p>Try adjusting your filters or search terms to find what you're looking for.</p>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { setFilters({ semester: '', grade: '', type: '' }); setSearch(''); }}
              >
                Clear all filters
              </button>
            </div>
          ) : animateList ? (
            <motion.div
              className="sp-posts-list"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {filtered.map(post => (
                <PostCard key={post._id} post={post} variants={itemVariant} />
              ))}
            </motion.div>
          ) : (
            <div className="sp-posts-list">
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
