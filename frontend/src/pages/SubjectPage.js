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
  const [viewMode, setViewMode] = useState('grid');
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

  const filtered = useMemo(() => {
    const list = [...posts].sort((a, b) => {
      const tA = new Date(a.updatedAt || a.date_created).getTime();
      const tB = new Date(b.updatedAt || b.date_created).getTime();
      return tB - tA;
    });
    return list;
  }, [posts]);

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
