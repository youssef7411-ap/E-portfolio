import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
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
import SubjectGallery from '../components/SubjectGallery';
import IntroAnimation from '../components/IntroAnimation';
import { fetchPortfolioData } from '../store/slices/portfolioSlice';
import '../styles/Home.css';

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
  const dispatch = useDispatch();
  const { subjects, posts, loading } = useSelector((state) => state.portfolio);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [introFinished, setIntroFinished] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchPortfolioData());
  }, [dispatch]);

  const subjectMeta = useMemo(() => {
    const map = new Map();

    for (const post of posts) {
      const subjectId = String(getSubjectId(post) || '');
      if (!subjectId) continue;

      const current = map.get(subjectId) || { postCount: 0 };
      current.postCount += 1;
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
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
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
      primary: get('--primary-color', '#3b82f6'),
      secondary: get('--secondary-color', '#64748b'),
      accent: get('--accent-color', '#f59e0b'),
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
          font: { family: 'var(--font-family-base)', size: 11, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        borderColor: chartPalette.border,
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.textSoft,
        titleFont: { family: 'var(--font-family-base)', weight: 700 },
        bodyFont: { family: 'var(--font-family-base)', weight: 500 },
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartPalette.textSoft,
          font: { family: 'var(--font-family-base)', size: 11, weight: 600 },
        },
        grid: { color: 'rgba(148,163,184,0.15)' },
      },
      y: {
        ticks: {
          color: chartPalette.textSoft,
          font: { family: 'var(--font-family-base)', size: 11, weight: 600 },
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
        backgroundColor: chartPalette.primary,
        maxBarThickness: 60,
      }],
    };
  }, [sortedSubjects, subjectMeta, chartPalette]);

  const distributionData = useMemo(() => {
    const typeCounts = posts.reduce((acc, post) => {
      const type = String(post?.type || 'Other').trim();
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);

    // Generate a consistent color palette for content types
    const colors = labels.map((_, index) => {
      const colorIndex = index % 6; // Use 6 distinct colors, cycle if more types
      switch (colorIndex) {
        case 0: return chartPalette.cyan;
        case 1: return chartPalette.green;
        case 2: return chartPalette.amber;
        case 3: return chartPalette.violet;
        case 4: return chartPalette.primary;
        case 5: return chartPalette.secondary;
        default: return '#CCCCCC'; // Fallback
      }
    });

    return {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
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
        borderColor: chartPalette.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        pointBackgroundColor: chartPalette.primary,
        fill: true,
        borderWidth: 2,
        tension: 0.4,
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
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: chartPalette.textSoft,
          font: { family: 'var(--font-family-base)', size: 11, weight: 600 },
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
      <AnimatePresence>
        {!introFinished && (
          <IntroAnimation key="intro" onComplete={() => setIntroFinished(true)} />
        )}
      </AnimatePresence>

      <div className={`main-layout ${introFinished ? 'is-visible' : 'is-hidden'}`}>
        <motion.header 
          className="portfolio-header"
          initial={{ opacity: 0, y: -50 }}
          animate={introFinished ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="container">
            <h1 className="hero-headline">Youssef’s Portfolio</h1>
          </div>
        </motion.header>

        <main>
          <motion.section 
            className="gallery-section"
            initial={{ opacity: 0 }}
            animate={introFinished ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1.5, delay: 1 }}
          >
            <div className="home-section-head">
              <h3>Subject Archive</h3>
              <span>Explore the work</span>
            </div>
            <SubjectGallery subjects={sortedSubjects} meta={subjectMeta} />
          </motion.section>

          <motion.section 
            className="dashboard-section"
            initial={{ opacity: 0, y: 100 }}
            animate={introFinished ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
            transition={{ duration: 1.2, delay: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="container">
              <div className="dashboard-stats-ribbon">
                <div className="stat-card">
                  <span className="stat-label">Total Subjects</span>
                  <span className="stat-value">{subjects.length}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-card">
                  <span className="stat-label">Total Uploads</span>
                  <span className="stat-value">{posts.length}</span>
                </div>
                <div className="stat-divider" />
                <div className="stat-card">
                  <span className="stat-label">Last Update</span>
                  <span className="stat-value">
                    {posts.length > 0 
                      ? new Date(getPostTimestamp(posts[0])).toLocaleDateString() 
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="dashboard-chart-grid">
                <div className="dashboard-chart-card">
                  <div className="dashboard-chart-head">
                    <h3>Upload Distribution</h3>
                  </div>
                  <div className="dashboard-chart-body">
                    <Bar data={uploadsBySubjectData} options={baseChartOptions} />
                  </div>
                </div>

                <div className="dashboard-chart-card">
                  <div className="dashboard-chart-head">
                    <h3>Content Breakdown</h3>
                  </div>
                  <div className="dashboard-chart-body">
                    <Doughnut 
                      data={distributionData} 
                      options={{
                        ...baseChartOptions,
                        scales: undefined,
                        cutout: '70%',
                      }} 
                    />
                  </div>
                </div>

                <div className="dashboard-chart-card wide">
                  <div className="dashboard-chart-head">
                    <h3>Recent Activity</h3>
                  </div>
                  <div className="dashboard-chart-body">
                    <Line data={activityData} options={baseChartOptions} />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </main>

        <motion.footer 
          className="portfolio-footer-nav"
          initial={{ opacity: 0 }}
          animate={introFinished ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 2 }}
        >
          <div className="container">
            <div className="footer-actions">
              <select 
                className="explore-subject-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="" disabled>Select a Subject</option>
                {sortedSubjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
              <button 
                className="explore-cta-btn"
                onClick={() => selectedSubjectId && navigate(`/subject/${selectedSubjectId}`)}
              >
                View Subject Details
              </button>
              <button 
                className="explore-cta-btn secondary"
                onClick={() => navigate('/all-posts')}
              >
                Browse All Posts
              </button>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );

}

export default Home;
