import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../styles/SubjectCard.css';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function SubjectCard({ subject, onClick, meta, variant = 'grid' }) {
  const prefersReducedMotion = useReducedMotion();
  const initials = subject?.name?.slice(0, 2).toUpperCase() || '??';

  return (
    <motion.div
      className={`subject-card ${variant === 'list' ? 'subject-card--list' : ''}`}
      variants={cardVariants}
      whileHover={prefersReducedMotion ? undefined : { y: -8, boxShadow: 'var(--shadow-lg)' }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
    >
      <div className="sc-header">
        {subject.image ? (
          <img src={subject.image} alt="" className="sc-cover" loading="lazy" />
        ) : (
          <div className="sc-cover-placeholder" style={{ backgroundColor: subject.bgColor || 'var(--accent)' }} />
        )}
        <div className="sc-overlay" />
        <div
          className="sc-icon-wrapper"
          style={{ backgroundColor: subject.bgColor || 'var(--accent)' }}
        >
          {subject.buttonImage ? (
            <img src={subject.buttonImage} alt="" className="sc-icon" />
          ) : (
            <span className="sc-initials">{initials}</span>
          )}
        </div>
      </div>

      <div className="sc-body">
        <h3 className="sc-title">{subject.name}</h3>
        <div className="sc-meta">
          <span className="sc-stat">
            <strong>{meta?.postCount || 0}</strong> posts
          </span>
        </div>
        <div className="sc-footer">
          <span className="sc-link">View Subject →</span>
        </div>
      </div>
    </motion.div>
  );
}

export default SubjectCard;
