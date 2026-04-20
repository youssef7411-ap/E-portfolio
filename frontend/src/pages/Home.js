import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SubjectCard from '../components/SubjectCard';
import '../styles/Home.css';
import { API_URL } from '../config/api';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const formatMetric = (value) => new Intl.NumberFormat('en-US', {
  notation: value >= 1000 ? 'compact' : 'standard',
  maximumFractionDigits: value >= 1000 ? 1 : 0,
}).format(value);

const formatDate = (value, options) => {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Not available';
  return new Date(timestamp).toLocaleDateString('en-US', options);
};

const stripHtml = (value = '') => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

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
  const navigate = useNavigate();
  const subjectsSectionRef = useRef(null);

  useEffect(() => {
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

    fetchData();
  }, []);

  const subjectLookup = useMemo(() => new Map(
    subjects.map((subject) => [String(subject?._id || ''), subject]),
  ), [subjects]);

  const postsByRecency = useMemo(() => (
    [...posts].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))
  ), [posts]);

  const featuredProjects = useMemo(() => (
    postsByRecency
      .filter((post) => post?.title && post?.type === 'project')
      .slice(0, 3)
  ), [postsByRecency]);

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

  const totalProjects = useMemo(() => posts.filter((post) => post?.type === 'project').length, [posts]);
  const totalAssets = useMemo(() => posts.reduce((sum, post) => sum + getAssetCount(post), 0), [posts]);
  const postsWithMedia = useMemo(() => posts.filter((post) => getAssetCount(post) > 0).length, [posts]);

  const uploadsThisMonth = useMemo(() => {
    const now = new Date();
    return posts.filter((post) => {
      const timestamp = getPostTimestamp(post);
      if (!timestamp) return false;
      const date = new Date(timestamp);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
  }, [posts]);

  const recentUploads = useMemo(() => postsByRecency.slice(0, 5).map((post) => {
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

  const latestRefreshLabel = recentUploads[0]?.timestamp
    ? formatDate(recentUploads[0].timestamp, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Syncing';

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatter.format(date),
        count: 0,
      };
    });

    const lookup = new Map(months.map((month) => [month.key, month]));

    posts.forEach((post) => {
      const timestamp = getPostTimestamp(post);
      if (!timestamp) return;
      const date = new Date(timestamp);
      const month = lookup.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (month) {
        month.count += 1;
      }
    });

    const maxCount = Math.max(1, ...months.map((month) => month.count));
    return months.map((month) => ({
      ...month,
      height: `${Math.max(14, (month.count / maxCount) * 100)}%`,
    }));
  }, [posts]);

  const topSubjects = useMemo(() => {
    const items = sortedSubjects
      .map((subject) => {
        const meta = subjectMeta.get(String(subject?._id || '')) || {
          postCount: 0,
          projectCount: 0,
          attachmentCount: 0,
          lastUpdated: 0,
        };

        return {
          id: subject?._id,
          name: subject?.name || 'Untitled subject',
          postCount: meta.postCount,
          projectCount: meta.projectCount,
          lastUpdated: meta.lastUpdated,
        };
      })
      .filter((subject) => subject.postCount > 0)
      .sort((a, b) => b.postCount - a.postCount || b.projectCount - a.projectCount)
      .slice(0, 5);

    const maxPosts = Math.max(1, ...items.map((item) => item.postCount));
    return items.map((item) => ({
      ...item,
      fill: `${Math.max(18, (item.postCount / maxPosts) * 100)}%`,
    }));
  }, [sortedSubjects, subjectMeta]);

  const typeBreakdown = useMemo(() => {
    const palette = ['var(--chart-lime)', 'var(--chart-orange)', 'var(--chart-sky)', 'rgba(255, 255, 255, 0.8)'];
    const counts = posts.reduce((acc, post) => {
      const type = String(post?.type || 'other');
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 4)
      .map(([type, count], index) => ({
        type,
        label: formatTypeLabel(type),
        count,
        share: posts.length ? Math.round((count / posts.length) * 100) : 0,
        color: palette[index] || 'rgba(255, 255, 255, 0.7)',
      }));
  }, [posts]);

  const overviewStats = [
    {
      label: 'Total Posts',
      value: loading ? '--' : formatMetric(posts.length),
      detail: 'Published entries',
      tone: 'lime',
    },
    {
      label: 'Subjects',
      value: loading ? '--' : formatMetric(sortedSubjects.length),
      detail: 'Visible sections',
      tone: 'orange',
    },
    {
      label: 'Projects',
      value: loading ? '--' : formatMetric(totalProjects),
      detail: 'Hands-on work',
      tone: 'sky',
    },
    {
      label: 'Media Assets',
      value: loading ? '--' : formatMetric(totalAssets),
      detail: 'Files, images, videos',
      tone: 'neutral',
    },
  ];

  return (
    <div className="home">
      <div className="bg-shapes">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <header className="home-header glass">
        <div className="container home-header-inner">
          <motion.div variants={itemVariants}>
            <motion.h1
              className="home-title"
              initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.45, delay: 0.08 }}
            >
              My E-Portfolio
            </motion.h1>
            <motion.p
              className="home-subtitle"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.35, delay: 0.12 }}
            >
              Live dashboard for uploads, posts, and portfolio activity
            </motion.p>
          </motion.div>

          <div className="header-status-pill">
            <span className="header-status-dot" />
            {loading ? 'Syncing data' : `${uploadsThisMonth} uploads this month`}
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
          <div className="dashboard-shell">
            <div className="dashboard-intro">
              <span className="dashboard-kicker">Portfolio Command Center</span>
              <motion.h2 className="hero-headline">
                Open the site and understand the work in seconds.
              </motion.h2>
              <motion.p className="hero-copy">
                Recent uploads, total posts, subject activity, and content mix now appear instantly on the main page so the portfolio feels more professional, data-driven, and polished from the first click.
              </motion.p>

              <div className="dashboard-pill-row">
                <div className="dashboard-pill">
                  <span className="pill-label">Latest refresh</span>
                  <strong>{latestRefreshLabel}</strong>
                </div>
                <div className="dashboard-pill">
                  <span className="pill-label">Posts with media</span>
                  <strong>{loading ? '--' : `${formatMetric(postsWithMedia)} enriched posts`}</strong>
                </div>
              </div>

              <motion.div
                className="hero-cta"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? undefined : { delay: 0.16, duration: 0.35 }}
              >
                <motion.button
                  className="hero-btn btn btn-primary"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  onClick={() => subjectsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  Explore Subjects
                </motion.button>
                <motion.button
                  className="hero-btn btn btn-ghost dashboard-ghost"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                  onClick={() => navigate('/admin/login')}
                >
                  View Admin
                </motion.button>
              </motion.div>
            </div>

            <div className="dashboard-board">
              <div className="dashboard-stat-grid">
                {overviewStats.map((stat) => (
                  <article
                    key={stat.label}
                    className={`dashboard-stat-card dashboard-stat-card--${stat.tone}`}
                  >
                    <span className="dashboard-stat-label">{stat.label}</span>
                    <strong className="dashboard-stat-value">{stat.value}</strong>
                    <span className="dashboard-stat-detail">{stat.detail}</span>
                  </article>
                ))}
              </div>

              <div className="dashboard-grid">
                <article className="dashboard-card dashboard-card--activity">
                  <div className="dashboard-card-head">
                    <div>
                      <span className="dashboard-card-kicker">Posting Trend</span>
                      <h3>Recent activity</h3>
                    </div>
                    <span className="dashboard-card-meta">{loading ? 'Syncing' : `${posts.length} total`}</span>
                  </div>

                  <div className="activity-chart">
                    {monthlyActivity.map((month) => (
                      <div key={month.key} className="activity-bar-group">
                        <span className="activity-bar-count">{month.count}</span>
                        <div className="activity-bar-track">
                          <div className="activity-bar-fill" style={{ height: month.height }} />
                        </div>
                        <span className="activity-bar-label">{month.label}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="dashboard-card dashboard-card--recent">
                  <div className="dashboard-card-head">
                    <div>
                      <span className="dashboard-card-kicker">Latest Uploads</span>
                      <h3>Fresh content</h3>
                    </div>
                    <span className="dashboard-card-meta">{loading ? 'Loading' : `${recentUploads.length} items`}</span>
                  </div>

                  {recentUploads.length === 0 ? (
                    <p className="dashboard-empty">Uploads will appear here as soon as new posts are added.</p>
                  ) : (
                    <div className="recent-upload-list">
                      {recentUploads.map((post, index) => (
                        <button
                          key={post.id}
                          type="button"
                          className="recent-upload-row"
                          onClick={() => post.subjectId && navigate(`/subject/${post.subjectId}`)}
                        >
                          <span className="recent-upload-index">{String(index + 1).padStart(2, '0')}</span>
                          <span className="recent-upload-copy">
                            <strong>{post.title}</strong>
                            <span>{post.subject} • {post.type}</span>
                          </span>
                          <span className="recent-upload-meta">
                            <span>{formatDate(post.timestamp, { month: 'short', day: 'numeric' })}</span>
                            <strong>{post.assetCount > 0 ? `${post.assetCount} assets` : 'Text post'}</strong>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </article>

                <article className="dashboard-card dashboard-card--subjects">
                  <div className="dashboard-card-head">
                    <div>
                      <span className="dashboard-card-kicker">Top Subjects</span>
                      <h3>Most active areas</h3>
                    </div>
                    <span className="dashboard-card-meta">{loading ? 'Loading' : `${topSubjects.length} tracked`}</span>
                  </div>

                  {topSubjects.length === 0 ? (
                    <p className="dashboard-empty">Subject activity will show here after posts are published.</p>
                  ) : (
                    <div className="subject-activity-list">
                      {topSubjects.map((subject) => (
                        <button
                          key={subject.id}
                          type="button"
                          className="subject-activity-row"
                          onClick={() => subject.id && navigate(`/subject/${subject.id}`)}
                        >
                          <span className="subject-activity-copy">
                            <strong>{subject.name}</strong>
                            <span>{subject.projectCount} projects • Updated {formatDate(subject.lastUpdated, { month: 'short', day: 'numeric' })}</span>
                          </span>
                          <span className="subject-activity-track">
                            <span className="subject-activity-fill" style={{ width: subject.fill }} />
                          </span>
                          <span className="subject-activity-value">{subject.postCount}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </article>

                <article className="dashboard-card dashboard-card--types">
                  <div className="dashboard-card-head">
                    <div>
                      <span className="dashboard-card-kicker">Content Mix</span>
                      <h3>Post categories</h3>
                    </div>
                    <span className="dashboard-card-meta">{loading ? 'Loading' : `${typeBreakdown.length} visible types`}</span>
                  </div>

                  {typeBreakdown.length === 0 ? (
                    <p className="dashboard-empty">Category insights will appear once content is available.</p>
                  ) : (
                    <div className="type-breakdown-list">
                      {typeBreakdown.map((item) => (
                        <div key={item.type} className="type-breakdown-row">
                          <div className="type-breakdown-copy">
                            <span className="type-breakdown-dot" style={{ backgroundColor: item.color }} />
                            <strong>{item.label}</strong>
                          </div>
                          <div className="type-breakdown-track">
                            <span className="type-breakdown-fill" style={{ width: `${item.share}%`, backgroundColor: item.color }} />
                          </div>
                          <span className="type-breakdown-meta">{item.count} • {item.share}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <main className="home-main">
        <div className="container">
          <motion.section
            className="home-panel glass"
            variants={containerVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <div className="home-section-head">
              <h3>Highlighted Projects</h3>
              <span>{featuredProjects.length} highlighted</span>
            </div>

            {loading ? (
              <div className="section-loading">
                <div className="spinner" />
              </div>
            ) : featuredProjects.length === 0 ? (
              <p className="empty-state">No featured projects yet.</p>
            ) : (
              <div className="featured-grid">
                {featuredProjects.map((project, index) => {
                  const subjectId = getSubjectId(project);
                  const subjectName = project?.subject_id?.name || subjectLookup.get(String(subjectId || ''))?.name || 'General';

                  return (
                    <motion.article
                      key={project._id}
                      className="featured-card glass"
                      variants={itemVariants}
                      custom={index}
                      initial={prefersReducedMotion ? false : 'hidden'}
                      animate={prefersReducedMotion ? undefined : 'visible'}
                      whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01, transition: { duration: 0.18 } }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                      onClick={() => subjectId && navigate(`/subject/${subjectId}`)}
                    >
                      <div className="featured-top">
                        <span className="badge badge-gray">{subjectName}</span>
                        <time className="featured-date">
                          {formatDate(project.date_created, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                      </div>
                      <h4 className="featured-title">{project.title}</h4>
                      <p className="featured-desc">
                        {stripHtml(project.description).slice(0, 140) || 'Open this project to view details, media, and files.'}
                      </p>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </motion.section>

          <motion.section
            ref={subjectsSectionRef}
            className="home-panel glass"
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
                <div className="spinner" />
              </div>
            ) : sortedSubjects.length === 0 ? (
              <p className="empty-state">No subjects available yet.</p>
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
