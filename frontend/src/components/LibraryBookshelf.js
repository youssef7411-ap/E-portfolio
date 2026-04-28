import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/LibraryBookshelf.css';

/**
 * Library Bookshelf Component
 * 
 * Displays subjects as books standing vertically in a library shelf.
 * Books show horizontal spine text with subject color.
 * Click to open/flip the book to view full details.
 */
const LibraryBookshelf = ({ subjects = [] }) => {
  const [selectedBook, setSelectedBook] = useState(null);

  if (!subjects || subjects.length === 0) {
    return (
      <section className="library-section">
        <div className="library-container">
          <h2 className="library-title">Library</h2>
          <div className="bookshelf-empty">
            <p>No subjects yet.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="library-section">
      <div className="library-container">
        <h2 className="library-title">Library</h2>
        
        {/* Main Bookshelf */}
        <div className="bookshelf-wrapper">
          <div className="bookshelf">
            {/* Wooden shelf board back */}
            <div className="shelf-board" />
            
            {/* Books Grid */}
            <div className="books-container">
              {subjects.map((subject, index) => (
                <motion.div
                  key={subject._id || index}
                  className="book-spine-wrapper"
                  initial={{ opacity: 0, rotateZ: -10 }}
                  whileInView={{ opacity: 1, rotateZ: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true, margin: '-100px' }}
                >
                  <motion.button
                    className="book-spine"
                    style={{
                      backgroundColor: subject.bgColor || '#3b82f6',
                      backgroundImage: subject.image
                        ? `linear-gradient(90deg, ${subject.bgColor || '#3b82f6'}ee 0%, ${subject.bgColor || '#3b82f6'}dd 100%), url(${subject.image})`
                        : `linear-gradient(90deg, ${subject.bgColor || '#3b82f6'} 0%, ${subject.bgColor || '#3b82f6'}dd 100%)`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    whileHover={{
                      scale: 1.05,
                      rotateZ: 2,
                      filter: 'brightness(1.2)',
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() => setSelectedBook(subject)}
                    title={`Click to view ${subject.name}`}
                  >
                    {/* Spine text - horizontal */}
                    <div className="spine-text-wrapper">
                      <div className="spine-text">
                        <span className="spine-title">{subject.name}</span>
                      </div>
                    </div>

                    {/* Top edge highlight */}
                    <div className="book-edge-top" />
                    
                    {/* Right edge shadow */}
                    <div className="book-edge-right" />
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Shelf shadow underneath */}
            <div className="shelf-shadow" />
          </div>
        </div>
      </div>

      {/* Book Detail Modal - Opens on Click */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            className="book-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBook(null)}
          >
            <motion.div
              className="book-modal-content"
              initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: '1000px' }}
            >
              {/* Book Front Cover */}
              <div className="book-cover-front">
                {selectedBook.image ? (
                  <img src={selectedBook.image} alt={selectedBook.name} />
                ) : (
                  <div
                    className="book-cover-placeholder"
                    style={{ backgroundColor: selectedBook.bgColor || '#3b82f6' }}
                  />
                )}
                <div className="book-cover-overlay" />
                <div className="book-cover-content">
                  <h2 className="book-title">{selectedBook.name}</h2>
                </div>
              </div>

              {/* Book Inside Pages */}
              <div className="book-pages">
                <div className="book-page-left">
                  <h3>About This Subject</h3>
                  <p className="book-description">
                    {selectedBook.description || 'No description available.'}
                  </p>
                  <div className="book-stats">
                    <div className="stat">
                      <span className="stat-label">Posts</span>
                      <span className="stat-value">View all</span>
                    </div>
                  </div>
                </div>

                <div className="book-page-right">
                  <div className="book-color-info">
                    <h4>Subject Color</h4>
                    <div className="color-display">
                      <div
                        className="color-swatch"
                        style={{ backgroundColor: selectedBook.bgColor || '#3b82f6' }}
                      />
                      <span className="color-hex">{selectedBook.bgColor || '#3b82f6'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <motion.button
                className="book-modal-close"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBook(null)}
                aria-label="Close book"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default LibraryBookshelf;
