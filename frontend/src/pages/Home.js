import React, { useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
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
import LibraryBookshelf from '../components/LibraryBookshelf';
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
  const { subjects, posts } = useSelector((state) => state.portfolio);

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

  const chartPalette = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        text: '#1e293b',
        textSoft: '#64748b',
        border: '#e2e8f0',
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        cyan: '#06b6d4',
        green: '#10b981',
        amber: '#f59e0b',
        violet: '#8b5cf6',
        rose: '#f43f5e',
        indigo: '#6366f1',
        teal: '#14b8a6',
        orange: '#f97316',
        pink: '#ec4899',
        lime: '#84cc16',
      };
    }

    const styles = getComputedStyle(document.documentElement);
    const get = (name, fallback) => String(styles.getPropertyValue(name) || '').trim() || fallback;
    return {
      text: get('--text-primary', '#1e293b'),
      textSoft: get('--text-muted', '#64748b'),
      border: get('--border-medium', '#e2e8f0'),
      primary: get('--accent-color', '#3b82f6'),
      secondary: get('--text-secondary', '#64748b'),
      accent: get('--warning', '#f59e0b'),
      cyan: '#06b6d4',
      green: '#10b981',
      amber: '#f59e0b',
      violet: '#8b5cf6',
      rose: '#f43f5e',
      indigo: '#6366f1',
      teal: '#14b8a6',
      orange: '#f97316',
      pink: '#ec4899',
      lime: '#84cc16',
    };
  }, []);

  const baseChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false, // Hide legends for cleaner look
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: chartPalette.border,
        borderWidth: 1,
        titleColor: chartPalette.text,
        bodyColor: chartPalette.textSoft,
        titleFont: {
          family: 'var(--font-family-base)',
          size: 14,
          weight: 700
        },
        bodyFont: {
          family: 'var(--font-family-base)',
          size: 13,
          weight: 500
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y || context.parsed}`;
          }
        }
      },
    },
    scales: {
      x: {
        ticks: {
          color: chartPalette.textSoft,
          font: {
            family: 'var(--font-family-base)',
            size: 12,
            weight: 500
          },
          padding: 8,
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.3)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
      y: {
        ticks: {
          color: chartPalette.textSoft,
          font: {
            family: 'var(--font-family-base)',
            size: 12,
            weight: 500
          },
          padding: 8,
          precision: 0,
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.3)',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        beginAtZero: true,
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
      },
      line: {
        borderWidth: 3,
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
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
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, chartPalette.primary);
          gradient.addColorStop(1, `${chartPalette.primary}80`);
          return gradient;
        },
        borderColor: chartPalette.primary,
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 40,
        hoverBackgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, chartPalette.indigo);
          gradient.addColorStop(1, `${chartPalette.indigo}80`);
          return gradient;
        },
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

    // Professional color palette with gradients
    const colorPalette = [
      { primary: chartPalette.primary, secondary: `${chartPalette.primary}40` },
      { primary: chartPalette.cyan, secondary: `${chartPalette.cyan}40` },
      { primary: chartPalette.green, secondary: `${chartPalette.green}40` },
      { primary: chartPalette.amber, secondary: `${chartPalette.amber}40` },
      { primary: chartPalette.violet, secondary: `${chartPalette.violet}40` },
      { primary: chartPalette.rose, secondary: `${chartPalette.rose}40` },
      { primary: chartPalette.teal, secondary: `${chartPalette.teal}40` },
      { primary: chartPalette.orange, secondary: `${chartPalette.orange}40` },
    ];

    const backgroundColors = labels.map((_, index) => {
      const colorSet = colorPalette[index % colorPalette.length];
      return `linear-gradient(135deg, ${colorSet.primary}, ${colorSet.secondary})`;
    });

    return {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: chartPalette.border,
        borderWidth: 2,
        hoverBorderColor: chartPalette.text,
        hoverBorderWidth: 3,
        hoverOffset: 8,
        spacing: 2,
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
        backgroundColor: (context) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, `${chartPalette.primary}60`);
          gradient.addColorStop(0.5, `${chartPalette.primary}30`);
          gradient.addColorStop(1, `${chartPalette.primary}10`);
          return gradient;
        },
        pointBackgroundColor: chartPalette.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: chartPalette.indigo,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
        fill: true,
        borderWidth: 3,
        tension: 0.4,
      }],
    };
  }, [posts, chartPalette]);

  return (
    <div className="home">
      <div className="main-layout is-visible">
        <motion.header 
            className="portfolio-header"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
          <div className="container">
            <h1 className="hero-headline">Youssef’s Portfolio</h1>
          </div>
        </motion.header>

        <main>
          <motion.section
            className="dashboard-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
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

          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <LibraryBookshelf subjects={sortedSubjects} />
          </motion.section>

          <motion.footer
            className="portfolio-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
          >
            <div className="container">
              <p>Youssef's Portfolio</p>
            </div>
          </motion.footer>
        </main>
      </div>
    </div>
  );
}

export default Home;
