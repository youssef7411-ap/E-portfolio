import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '../styles/SubjectCard.css';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function SubjectCard({ subject, onClick, meta, variant = 'grid' }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`subject-card card ${variant === 'list' ? 'subject-card--list' : ''}`}
      variants={cardVariants}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.015, y: -2, boxShadow: '0 12px 24px rgba(0,0,0,0.10)' }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
      transition={prefersReducedMotion ? { duration: 0.18 } : { type: 'spring', stiffness: 260, damping: 28 }}
      onClick={onClick}
    >
      {subject.image && (
        <div className="sc-image-wrapper">
          <img
            src={subject.image}
            alt={subject.name}
            className="sc-image"
            loading="lazy"
          />
          <div className="sc-image-overlay">
            <h3 className="sc-overlay-title">{subject.name}</h3>
          </div>
        </div>
      )}
      <div className="sc-body">
        {!subject.image && <h3 className="sc-title">{subject.name}</h3>}
        {subject.description && (
          <p className="sc-desc">{subject.description}</p>
        )}
        {meta && (
          <div className="sc-meta">
            {typeof meta.postCount === 'number' && (
              <span className="sc-meta-pill">{meta.postCount} posts</span>
            )}
            {typeof meta.projectCount === 'number' && meta.projectCount > 0 && (
              <span className="sc-meta-pill">{meta.projectCount} projects</span>
            )}
          </div>
        )}
        <span className="sc-cta">View posts →</span>
      </div>
    </motion.div>
  );
}

export default SubjectCard;
