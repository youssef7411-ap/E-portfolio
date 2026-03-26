import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SubjectCard from '../components/SubjectCard';
import '../styles/Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const containerVariants = {
  hidden: { },
  visible: { 
    transition: { 
      staggerChildren: 0.12,
      delayChildren: 0.2
    } 
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
      ease: [0.22, 1, 0.36, 1]
    } 
  },
};

function Home({ darkMode, setDarkMode }) {
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

          setSubjects(Array.isArray(subjectsData) ? subjectsData.filter(s => s.visible !== false) : []);
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

  const featuredProjects = [...posts]
    .filter(p => p.title)
    .sort((a, b) => new Date(b.date_created) - new Date(a.date_created))
    .slice(0, 6);

  return (
    <div className="home">
      <div className="home-parallax">
        <div className="parallax-layer-1"></div>
        <div className="parallax-layer-2"></div>
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
              Academic journey & projects showcase
            </motion.p>
          </motion.div>

        </div>
      </header>

      <motion.section
        className="home-hero"
        variants={itemVariants}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate={prefersReducedMotion ? undefined : 'visible'}
      >
        <div className="container">
          <motion.h2 className="hero-headline">
            Browse My Subjects
          </motion.h2>
          <motion.p className="hero-copy">
            Explore detailed posts, assignments, projects, grades and attachments across all academic subjects
          </motion.p>
          <motion.div 
            className="hero-cta"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.16, duration: 0.35 }}
          >
            <motion.button
              className="hero-btn btn btn-primary glass"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              onClick={() => subjectsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Explore Subjects
            </motion.button>
            <motion.button className="hero-btn btn btn-ghost glass" whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }} onClick={() => navigate('/admin/login')}>
              View Admin
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      <main className="home-main">
        <div className="container">
          <motion.section 
            ref={subjectsSectionRef}
            className="home-panel glass"
            variants={containerVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <div className="home-section-head">
              <h3>Featured Projects</h3>
              <span>{featuredProjects.length} highlighted</span>
            </div>

            {loading ? (
              <div className="spinner" />
            ) : featuredProjects.length === 0 ? (
              <p className="empty-state glass p-8 rounded-2xl text-center">No featured projects yet.</p>
            ) : (
              <div className="featured-grid">
                {featuredProjects.map((project, index) => {
                  const subjectId = project.subject_id?._id || project.subject_id;
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
                        <span className="badge badge-gray">
                          {project.subject_id?.name || 'General'}
                        </span>
                        <time className="featured-date">
                          {new Date(project.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </time>
                      </div>
                      <h4 className="featured-title">
                        {project.title}
                      </h4>
                      <p className="featured-desc">
                        {(project.description || '').replace(/<[^>]+>/g, '').slice(0, 140) || 'Open this project to view details, media, and files.'}
                      </p>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </motion.section>

          <motion.section 
            className="home-panel glass"
            variants={containerVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <div className="home-section-head">
              <h3>All Subjects</h3>
              <span>{subjects.length} total</span>
            </div>

            {loading ? (
              <div className="spinner" />
            ) : subjects.length === 0 ? (
              <p className="empty-state">No subjects available yet.</p>
            ) : (
              <motion.div
                className="subjects-grid"
                variants={containerVariants}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? undefined : 'visible'}
              >
                {subjects.map((subject, index) => (
                  <SubjectCard
                    key={subject._id}
                    subject={subject}
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
