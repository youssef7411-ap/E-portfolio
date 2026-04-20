import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SubjectCard from '../components/SubjectCard';
import '../styles/Home.css';
import { API_URL } from '../config/api';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const useCountUp = (end, duration = 1500, shouldAnimate = true) => {
  const [count, setCount] = useState(shouldAnimate ? 0 : end);
  
  useEffect(() => {
    if (!shouldAnimate || end === 0) {
      setCount(end);
      return;
    }
    
    let startTime = null;
    let animationFrame;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, shouldAnimate]);
  
  return count;
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const formatDate = (value, options) => {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Not available';
  return new Date(timestamp).toLocaleDateString('en-US', options);
};

const getSubjectId = (post) => post?.subject_id?._id || post?.subject_id || null;

const getPostTimestamp = (post) => {
  const candidates = [post?.updatedAt, post?.date_created, post?.createdAt];
  let latest = 0;

  for (const candidate of candidates) {
    const timestamp = new Date(candidate || 0).getTime();
    if (Number.isFinite(timestamp)) {
      latest = Math.max(latest, timestamp);
    }
  }

  return latest;
};

const getAssetCount = (post) => {
  const images = Array.isArray(post?.images) ? post.images.length : 0;
  const videos = Array.isArray(post?.videos) ? post.videos.length : 0;
  const files = Array.isArray(post?.files) ? post.files.length : 0;
  return images + videos + files;
};

const formatTypeLabel = (type = 'other') => (
  String(type).charAt(0).toUpperCase() + String(type).slice(1)
);

function Home() {
  const prefersReducedMotion = useReducedMotion();
  const [subjects, setSubjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [isValid, setIsValid] = useState(null);
  const navigate = useNavigate();
  const subjectsSectionRef = useRef(null);
  const inputRef = useRef(null);

  const fetchData = async () => {
    let attempts = 0;
    while (attempts < 4) {
      attempts += 1;
      try {
        const [subjectsRes, postsRes] = await Promise.all([
          fetch(`${API_URL}/api/subjects`),
          fetch(`${API_URL}/api/posts`),
        ]);

        if (!subjectsRes.ok || !postsRes.ok) {
          throw new Error(`Fetch failed (${subjectsRes.status}/${postsRes.status})`);
        }

        const [subjectsData, postsData] = await Promise.all([
          subjectsRes.json().catch(() => []),
          postsRes.json().catch(() => []),
        ]);

        setSubjects(Array.isArray(subjectsData) ? subjectsData.filter((subject) => subject.visible !== false) : []);
        setPosts(Array.isArray(postsData) ? postsData : []);
        setLoading(false);
        return;
      } catch {
        if (attempts >= 4) {
          setSubjects([]);
          setPosts([]);
          setLoading(false);
          return;
        }
        await wait(800);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (subjectQuery.trim().length === 0) {
      setIsValid(null);
    } else {
      setIsValid(subjectQuery.trim().length >= 2);
    }
  }, [subjectQuery]);

  // eslint-disable-next-line no-use-before-define
  const subjectsCount = useCountUp(sortedSubjects.length, 1000);
  // eslint-disable-next-line no-use-before-define
  const projectsCount = useCountUp(totalProjects, 1100);
  // eslint-disable-next-line no-use-before-define
  const mediaCount = useCountUp(totalAssets, 1300);

  const subjectLookup = useMemo(() => new Map(
    subjects.map((subject) => [String(subject?._id || ''), subject]),
  ), [subjects]);

  const postsByRecency = useMemo(() => (
    [...posts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
  ), [posts]);

  const subjectMeta = useMemo(() => {
    const map = new Map();

    for (const post of posts) {
      const subjectId = String(getSubjectId(post) || '');
      if (!subjectId) continue;

      const current = map.get(subjectId) || {
        postCount: 0,
        projectCount: 0,
        attachmentCount: 0,
        lastUpdated: 0,
      };

      current.postCount += 1;
      if (post?.type === 'project') current.projectCount += 1;
      if (getAssetCount(post) > 0) current.attachmentCount += 1;
      current.lastUpdated = Math.max(current.lastUpdated, getPostTimestamp(post));
      map.set(subjectId, current);
    }

    return map;
  }, [posts]);

  const sortedSubjects = useMemo(() => (
    [...subjects].sort((a, b) => {
      const orderA = Number(a?.order || 0);
      const orderB = Number(b?.order || 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' });
    })
  ), [subjects]);

  const filteredSubjects = useMemo(() => {
    if (!subjectQuery.trim()) return sortedSubjects;
    return sortedSubjects.filter(s => 
      s.name.toLowerCase().includes(subjectQuery.toLowerCase())
    );
  }, [sortedSubjects, subjectQuery]);

  const totalProjects = useMemo(() => posts.filter((post) => post?.type === 'project').length, [posts]);
  const totalAssets = useMemo(() => posts.reduce((sum, post) => sum + getAssetCount(post), 0), [posts]);

  const recentUploads = useMemo(() => postsByRecency.slice(0, 3).map((post) => {
    const subjectId = String(getSubjectId(post) || '');
    const subject = post?.subject_id?.name || subjectLookup.get(subjectId)?.name || 'General';

    return {
      id: post?._id || `${subjectId}-${post?.title || 'post'}`,
      title: post?.title || 'Untitled post',
      subject,
      subjectId,
      type: formatTypeLabel(post?.type),
      assetCount: getAssetCount(post),
      timestamp: getPostTimestamp(post),
    };
  }), [postsByRecency, subjectLookup]);

  const overviewStats = [
    {
      label: 'Subjects',
      value: loading ? '--' : sortedSubjects.length,
      detail: 'Visible sections',
      tone: 'lime',
    },
    {
      label: 'Projects',
      value: loading ? '--' : totalProjects,
      detail: 'Hands-on work',
      tone: 'orange',
    },
    {
      label: 'Media',
      value: loading ? '--' : totalAssets,
      detail: 'Files, images, videos',
      tone: 'sky',
    },
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredSubjects.length > 0 && isValid) {
      navigate(`/subject/${filteredSubjects[0]._id}`);
    }
  };

  return (
    <div className="home">
      <header className="home-header glass">
        <div className="container home-header-inner">
          <motion.div variants={itemVariants}>
            <motion.h1
              className="home-title"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.45, delay: 0.08 }}
            >
              Hi, I'm Youssef
            </motion.h1>
            <motion.p
              className="home-subtitle"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.35, delay: 0.12 }}
            >
              Grade 9 student · Academic Portfolio
            </motion.p>
          </motion.div>

          <div className="header-right">
            <button className="btn btn-ghost" onClick={() => navigate('/admin/login')}>
              Admin
            </button>
            <div className="header-status-pill">
              <span className="header-status-dot" />
              {loading ? 'Syncing' : `${posts.length} posts`}
            </div>
          </div>
        </div>
      </header>

      <motion.section
        className="home-hero"
        variants={itemVariants}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate={prefersReducedMotion ? undefined : 'visible'}
      >
        <div className="container">
          <div className="hero-content">
            <span className="hero-kicker">Academic Excellence</span>
            <h2 className="hero-headline">Explore my educational journey</h2>
            <p className="hero-copy">
              A curated collection of my projects, assignments, and academic achievements. Search for a subject below to get started.
            </p>

            <div className="subject-search-container">
              <label htmlFor="subject-input" className="subject-input-label">
                Find a subject
              </label>
              <div className="subject-input-wrapper">
                <input
                  ref={inputRef}
                  id="subject-input"
                  type="text"
                  className={`subject-input ${isValid === true ? 'is-valid' : isValid === false ? 'is-invalid' : ''}`}
                  placeholder="Enter subject name"
                  value={subjectQuery}
                  onChange={(e) => setSubjectQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-invalid={isValid === false}
                />
                <div className="input-feedback">
                  {isValid === true && (
                    <span className="feedback-icon valid">✓</span>
                  )}
                  {isValid === false && (
                    <span className="feedback-icon invalid">!</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-shell">
            <div className="dashboard-stat-grid">
              {overviewStats.map((stat) => (
                <article
                  key={stat.label}
                  className={`dashboard-stat-card dashboard-stat-card--${stat.tone}`}
                >
                  <span className="dashboard-stat-label">{stat.label}</span>
                  <strong className="dashboard-stat-value">
                    {loading ? '--' : (stat.label === 'Subjects' ? subjectsCount : stat.label === 'Projects' ? projectsCount : stat.label === 'Media' ? mediaCount : stat.value)}
                  </strong>
                  <span className="dashboard-stat-detail">{stat.detail}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <main className="home-main">
        <div className="container">
          <motion.section
            ref={subjectsSectionRef}
            className="home-panel"
            variants={containerVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <div className="home-section-head">
              <h3>All Subjects</h3>
              <span>{filteredSubjects.length} shown</span>
            </div>

            {loading ? (
              <div className="section-loading">
                <div className="skeleton-grid">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton-card" />
                  ))}
                </div>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="empty-state">
                <p>No subjects match "{subjectQuery}"</p>
                <button className="btn btn-secondary" onClick={() => setSubjectQuery('')}>Clear search</button>
              </div>
            ) : (
              <motion.div
                className="subjects-grid"
                variants={containerVariants}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? undefined : 'visible'}
              >
                {filteredSubjects.map((subject) => (
                  <SubjectCard
                    key={subject._id}
                    subject={subject}
                    variant="grid"
                    meta={subjectMeta.get(String(subject._id)) || { postCount: 0, projectCount: 0 }}
                    onClick={() => navigate(`/subject/${subject._id}`)}
                  />
                ))}
              </motion.div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}

export default Home;
