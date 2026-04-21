import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import SubjectCard from '../components/SubjectCard';
import '../styles/Home.css';
import { API_URL } from '../config/api';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

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

function Home() {
  const prefersReducedMotion = useReducedMotion();
  const [subjects, setSubjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const navigate = useNavigate();

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

  const subjectMeta = useMemo(() => {
    const map = new Map();

    for (const post of posts) {
      const subjectId = String(getSubjectId(post) || '');
      if (!subjectId) continue;

      const current = map.get(subjectId) || {
        postCount: 0,
        projectCount: 0,
        lastUpdated: 0,
      };

      current.postCount += 1;
      if (post?.type === 'project') current.projectCount += 1;
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

  useEffect(() => {
    if (!sortedSubjects.length) {
      setSelectedSubjectId('');
      return;
    }
    setSelectedSubjectId((prev) => {
      if (prev && sortedSubjects.some((subject) => String(subject._id) === String(prev))) {
        return prev;
      }
      return String(sortedSubjects[0]._id);
    });
  }, [sortedSubjects]);

  const chartPalette = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        text: '#f8fafc',
        textSoft: '#94a3b8',
        border: 'rgba(148,163,184,0.22)',
        cyan: '#38bdf8',
        green: '#22c55e',
        amber: '#f59e0b',
        violet: '#a78bfa',
      };
    }

    const styles = getComputedStyle(document.documentElement);
    const get = (name, fallback) => String(styles.getPropertyValue(name) || '').trim() || fallback;
    return {
      text: get('--text-main', '#f8fafc'),
      textSoft: get('--text-muted', '#94a3b8'),
      border: get('--border', 'rgba(148,163,184,0.22)'),
      cyan: '#38bdf8',
      green: '#22c55e',
      amber: '#f59e0b',
      violet: '#a78bfa',
    };
  }, []);

  const baseChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: chartPalette.textSoft,
          font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        borderColor: chartPalette.border,
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.textSoft,
        titleFont: { family: 'Inter, system-ui, sans-serif', weight: 700 },
        bodyFont: { family: 'Inter, system-ui, sans-serif', weight: 500 },
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartPalette.textSoft,
          font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 600 },
        },
        grid: { color: 'rgba(148,163,184,0.15)' },
      },
      y: {
        ticks: {
          color: chartPalette.textSoft,
          font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 600 },
          precision: 0,
        },
        grid: { color: 'rgba(148,163,184,0.15)' },
        beginAtZero: true,
      },
    },
  }), [chartPalette]);

  const uploadsBySubjectData = useMemo(() => {
    const sorted = [...sortedSubjects]
      .map((subject) => {
        const meta = subjectMeta.get(String(subject._id)) || { postCount: 0 };
        return { name: subject.name, uploads: Number(meta.postCount || 0) };
      })
      .sort((a, b) => b.uploads - a.uploads)
      .slice(0, 8);

    return {
      labels: sorted.map((item) => item.name),
      datasets: [{
        label: 'Uploads',
        data: sorted.map((item) => item.uploads),
        borderRadius: 10,
        backgroundColor: chartPalette.cyan,
      }],
    };
  }, [sortedSubjects, subjectMeta, chartPalette]);

  const distributionData = useMemo(() => {
    const totals = posts.reduce((acc, post) => {
      acc.images += Array.isArray(post?.images) ? post.images.length : 0;
      acc.videos += Array.isArray(post?.videos) ? post.videos.length : 0;
      acc.files += Array.isArray(post?.files) ? post.files.length : 0;
      acc.links += Array.isArray(post?.links) ? post.links.length : 0;
      return acc;
    }, { images: 0, videos: 0, files: 0, links: 0 });

    return {
      labels: ['Images', 'Videos', 'Files', 'Links'],
      datasets: [{
        data: [totals.images, totals.videos, totals.files, totals.links],
        backgroundColor: [chartPalette.cyan, chartPalette.green, chartPalette.amber, chartPalette.violet],
        borderWidth: 0,
      }],
    };
  }, [posts, chartPalette]);

  const activityData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i -= 1) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const count = posts.filter((post) => {
        const timestamp = getPostTimestamp(post);
        return timestamp >= start.getTime() && timestamp < end.getTime();
      }).length;
      days.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        count,
      });
    }

    return {
      labels: days.map((day) => day.label),
      datasets: [{
        label: 'Activity',
        data: days.map((day) => day.count),
        borderColor: chartPalette.green,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        pointBackgroundColor: chartPalette.green,
        fill: true,
        borderWidth: 2,
        tension: 0.36,
      }],
    };
  }, [posts, chartPalette]);

  const barOptions = useMemo(() => ({
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      legend: { display: false },
    },
  }), [baseChartOptions]);

  const donutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: chartPalette.textSoft,
          font: { family: 'Inter, system-ui, sans-serif', size: 11, weight: 600 },
          padding: 14,
        },
      },
      tooltip: baseChartOptions.plugins.tooltip,
    },
  }), [chartPalette, baseChartOptions]);

  const lineOptions = useMemo(() => ({
    ...baseChartOptions,
    plugins: {
      ...baseChartOptions.plugins,
      legend: { display: false },
    },
    interaction: { intersect: false, mode: 'index' },
  }), [baseChartOptions]);

  const handleExploreSubject = () => {
    if (!selectedSubjectId) return;
    navigate(`/subject/${selectedSubjectId}`);
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
              Youssef's Portfolio
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
            <h2 className="hero-headline">Explore Subject Collections</h2>
            <p className="hero-copy">
              Browse curated assignments, notes, and projects through a modern visualization-first interface.
            </p>

            <div className="explore-cta-shell">
              <label htmlFor="subject-explore-select" className="subject-input-label">
                Choose subject
              </label>
              <div className="explore-cta-controls">
                <select
                  id="subject-explore-select"
                  className="explore-subject-select"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  aria-label="Select subject to explore"
                >
                  {sortedSubjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="explore-cta-btn"
                  onClick={handleExploreSubject}
                  disabled={!selectedSubjectId}
                >
                  Explore Subject
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-shell">
            <div className="dashboard-chart-grid">
              <article className="dashboard-chart-card">
                <div className="dashboard-chart-head">
                  <h3>Total Uploads Per Subject</h3>
                </div>
                <div className="dashboard-chart-body">
                  <Bar data={uploadsBySubjectData} options={barOptions} />
                </div>
              </article>

              <article className="dashboard-chart-card">
                <div className="dashboard-chart-head">
                  <h3>Data Type Distribution</h3>
                </div>
                <div className="dashboard-chart-body">
                  <Doughnut data={distributionData} options={donutOptions} />
                </div>
              </article>

              <article className="dashboard-chart-card">
                <div className="dashboard-chart-head">
                  <h3>Activity Frequency</h3>
                </div>
                <div className="dashboard-chart-body">
                  <Line data={activityData} options={lineOptions} />
                </div>
              </article>
            </div>
          </div>
        </div>
      </motion.section>

      <main className="home-main">
        <div className="container">
          <motion.section
            className="home-panel"
            variants={containerVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <div className="home-section-head">
              <h3>All Subjects</h3>
              <span>{sortedSubjects.length} shown</span>
            </div>

            {loading ? (
              <div className="section-loading">
                <div className="skeleton-grid">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton-card" />
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                className="subjects-grid"
                variants={containerVariants}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? undefined : 'visible'}
              >
                {sortedSubjects.map((subject) => (
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
