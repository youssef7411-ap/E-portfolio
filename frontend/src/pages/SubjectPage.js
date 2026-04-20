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
  const [filterOptions, setFilterOptions] = useState({ grades: [], semesters: [], types: [] });
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const reduceMotion = useReducedMotion();

  const semesterLabel = (value) => {
    if (value === 'first') return 'First Semester';
    if (value === 'second') return 'Second Semester';
    if (value === 'third') return 'Third Semester';
    return String(value || '');
  };

  const normalizeSemester = (value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return '';
    const token = raw.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    if (token === 'first' || token === '1' || token === '1st') return 'first';
    if (token === 'second' || token === '2' || token === '2nd') return 'second';
    if (token === 'third' || token === '3' || token === '3rd') return 'third';
    return '';
  };

  const normalizeGrade = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const match = raw.match(/\d{1,2}/);
    if (!match) return '';
    const n = Number(match[0]);
    if (!Number.isInteger(n) || n < 1 || n > 12) return '';
    return String(n);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [subjectRes, postsRes, filtersRes] = await Promise.all([
        fetch(`${API_URL}/api/subjects/${id}`),
        fetch(`${API_URL}/api/posts/subject/${id}`),
        fetch(`${API_URL}/api/posts/subject/${id}/filters`),
      ]);

      const subjectData = await subjectRes.json().catch(() => null);
      const postsData = await postsRes.json().catch(() => []);
      const filtersData = filtersRes.ok ? await filtersRes.json().catch(() => null) : null;

      setSubject(subjectData);
      setPosts(Array.isArray(postsData) ? postsData : []);

      const fallbackGrades = [...new Set((Array.isArray(postsData) ? postsData : []).map(p => normalizeGrade(p?.grade)).filter(Boolean))]
        .sort((a, b) => Number(a) - Number(b));
      const fallbackSemesters = [...new Set((Array.isArray(postsData) ? postsData : []).map(p => normalizeSemester(p?.semester)).filter(Boolean))]
        .sort((a, b) => (a === 'first' ? 1 : a === 'second' ? 2 : 3) - (b === 'first' ? 1 : b === 'second' ? 2 : 3));
      const fallbackTypes = [...new Set((Array.isArray(postsData) ? postsData : []).map(p => String(p?.type || '').trim().toLowerCase()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

      const grades = Array.isArray(filtersData?.grades) ? filtersData.grades : fallbackGrades;
      const semesters = Array.isArray(filtersData?.semesters) ? filtersData.semesters : fallbackSemesters;
      const types = Array.isArray(filtersData?.types) ? filtersData.types : fallbackTypes;

      setFilterOptions({
        grades: grades.map(v => String(v)).filter(Boolean),
        semesters: semesters.map(v => String(v)).filter(Boolean),
        types: types.map(v => String(v)).filter(Boolean),
      });

      setFilterGrade((prev) => (grades.includes(prev) ? prev : ''));
      setFilterSemester((prev) => (semesters.includes(prev) ? prev : ''));
      setFilterType((prev) => (types.includes(prev) ? prev : ''));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    let list = [...posts];
    if (filterGrade) {
      list = list.filter(p => normalizeGrade(p?.grade) === filterGrade);
    }
    if (filterSemester) {
      list = list.filter(p => normalizeSemester(p?.semester) === filterSemester);
    }
    if (filterType) {
      list = list.filter(p => String(p?.type || '').trim().toLowerCase() === filterType);
    }
    list.sort((a, b) => {
      // Sort by publish date (date_created) descending. Editing does not affect order.
      const tA = new Date(a.date_created).getTime();
      const tB = new Date(b.date_created).getTime();
      return tB - tA;
    });
    return list;
  }, [posts, filterGrade, filterSemester, filterType]);

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

  return (
    <div className="sp-page">
      {/* Hero Banner */}
      {subject?.image && (
        <div className="subject-hero-banner">
          <img src={subject.image} alt={subject.name} />
          <div className="subject-hero-overlay" />
          <div className="subject-hero-content">
            <h1>{subject.name}</h1>
            {subject.description && <p>{subject.description}</p>}
          </div>
        </div>
      )}

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
        {(filterOptions.grades.length > 0 || filterOptions.semesters.length > 0 || filterOptions.types.length > 0) && (
          <aside className="sp-filters glass">
            <div className="sp-filters-top">
              <div className="sp-filters-title">
                <div className="sp-filters-heading">Filters</div>
              </div>
              <button
                type="button"
                className="sp-reset-btn"
                onClick={() => {
                  setFilterGrade('');
                  setFilterSemester('');
                  setFilterType('');
                }}
              >
                Reset
              </button>
            </div>

            <div className="sp-filters-grid">
              {filterOptions.grades.length > 0 && (
                <div className="sp-filter-block">
                  <label className="sp-label">Grade</label>
                  <select className="sp-control" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                    <option value="">All Grades</option>
                    {filterOptions.grades.map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.semesters.length > 0 && (
                <div className="sp-filter-block">
                  <label className="sp-label">Semester</label>
                  <select className="sp-control" value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                    <option value="">All Semesters</option>
                    {filterOptions.semesters.map(s => (
                      <option key={s} value={s}>{semesterLabel(s)}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.types.length > 0 && (
                <div className="sp-filter-block">
                  <label className="sp-label">Type</label>
                  <select className="sp-control" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {filterOptions.types.map(t => (
                      <option key={t} value={t}>{t ? t[0].toUpperCase() + t.slice(1) : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sp-filter-block">
                <label className="sp-label">Results</label>
                <div className="sp-count sp-control" style={{ display: 'flex', alignItems: 'center' }}>
                  <strong>{filtered.length}</strong>&nbsp;posts
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="sp-posts" aria-label="Posts list">
          {filtered.length === 0 ? (
            <div className="sp-empty glass">
              <div className="empty-icon">📂</div>
              <h3>No posts found</h3>
              <p>No posts are published under this subject yet.</p>
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
