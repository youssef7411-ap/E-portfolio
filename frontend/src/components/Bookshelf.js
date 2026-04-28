import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/Bookshelf.css';

/**
 * Bookshelf Component
 * 
 * Displays subjects as an interactive grid of "books" with:
 * - Color-coded spines from subject.bgColor
 * - Smooth hover animations (lift + glow)
 * - Click to open subject detail page
 * - Optional search/filter capability
 */
const Bookshelf = ({ subjects = [], title = 'Subjects' }) => {
  const navigate = useNavigate();

  const handleBookClick = (subject) => {
    navigate(`/subject/${subject._id}`, { state: { subject } });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const bookVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  if (!subjects || subjects.length === 0) {
    return (
      <section className="bookshelf-section">
        <div className="bookshelf-container">
          <h2 className="bookshelf-title">{title}</h2>
          <div className="bookshelf-empty">
            <p>No subjects yet.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bookshelf-section">
      <div className="bookshelf-container">
        <h2 className="bookshelf-title">{title}</h2>
        
        <motion.div
          className="bookshelf-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {subjects.map((subject, index) => (
            <motion.div
              key={subject._id || index}
              className="bookshelf-book-wrapper"
              variants={bookVariants}
              onClick={() => handleBookClick(subject)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleBookClick(subject);
                }
              }}
            >
              <div
                className="bookshelf-book"
                style={{
                  backgroundColor: subject.bgColor || '#3b82f6',
                  backgroundImage: subject.image 
                    ? `linear-gradient(135deg, ${subject.bgColor || '#3b82f6'}dd 0%, ${subject.bgColor || '#3b82f6'}aa 100%), url(${subject.image})`
                    : `linear-gradient(135deg, ${subject.bgColor || '#3b82f6'} 0%, ${subject.bgColor || '#3b82f6'}dd 100%)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Book Spine Content */}
                <div className="bookshelf-spine">
                  <div className="spine-content">
                    <h3 className="spine-title">{subject.name}</h3>
                    {subject.description && (
                      <p className="spine-desc">{subject.description}</p>
                    )}
                  </div>
                </div>

                {/* Hover Overlay with Action */}
                <div className="bookshelf-overlay">
                  <div className="overlay-content">
                    <h3 className="overlay-title">{subject.name}</h3>
                    {subject.description && (
                      <p className="overlay-desc">{subject.description}</p>
                    )}
                    <div className="overlay-cta">
                      <span className="overlay-cta-text">View Subject</span>
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Glow Effect */}
                <div className="bookshelf-glow" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Bookshelf;
