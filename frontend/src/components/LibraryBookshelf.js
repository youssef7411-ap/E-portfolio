import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/LibraryBookshelf.css';

/**
 * Library Bookshelf Component
 * 
 * Realistic library shelf where books are viewed from spine.
 * Multi-step animation: hover → pull out → expand → open
 * 
 * Features:
 * - Books shown as thin spines standing vertically
 * - Vertical spine text (top to bottom)
 * - 3D depth and realistic shadows
 * - Pull-out animation on click
 * - Full-screen book view with left/right pages
 * - Smooth transition back to shelf
 */
const LibraryBookshelf = ({ subjects = [] }) => {
  const [selectedBook, setSelectedBook] = useState(null);
  const [animationStage, setAnimationStage] = useState('shelf'); // 'shelf' → 'pulled' → 'opened'

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

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setAnimationStage('shelf');
    // Trigger pull-out animation
    setTimeout(() => setAnimationStage('pulled'), 50);
    setTimeout(() => setAnimationStage('opened'), 600);
  };

  const handleCloseBook = () => {
    setAnimationStage('pulled');
    setTimeout(() => setAnimationStage('shelf'), 300);
    setTimeout(() => setSelectedBook(null), 600);
  };

  return (
    <section className="library-section">
      <div className="library-container">
        <h2 className="library-title">Library</h2>
        
        {/* Main Bookshelf */}
        <div className={`bookshelf-wrapper ${selectedBook ? 'book-open' : ''}`}>
          <div className="bookshelf">
            {/* Shelf background gradient */}
            <div className="shelf-background" />
            
            {/* Books Container */}
            <div className="books-container">
              {subjects.map((subject, index) => {
                const isSelected = selectedBook && selectedBook._id === subject._id;
                
                return (
                  <motion.div
                    key={subject._id || index}
                    className={`book-spine-wrapper ${isSelected ? 'is-selected' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.03 }}
                    viewport={{ once: true, margin: '-50px' }}
                  >
                    <motion.button
                      className="book-spine"
                      style={{
                        backgroundColor: subject.bgColor || '#3b82f6',
                      }}
                      animate={isSelected ? { x: 120, rotateY: 15, zIndex: 100 } : { x: 0, rotateY: 0, zIndex: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      whileHover={!isSelected ? {
                        x: 8,
                        boxShadow: `0 12px 32px rgba(96, 165, 250, 0.3), -8px 0 24px rgba(0, 0, 0, 0.4)`,
                        filter: 'brightness(1.15)',
                      } : {}}
                      onClick={() => !isSelected && handleBookClick(subject)}
                      disabled={isSelected}
                      title={`${subject.name}`}
                    >
                      {/* Spine text - vertical */}
                      <div className="spine-text-container">
                        <div className="spine-text">
                          {subject.name}
                        </div>
                      </div>

                      {/* 3D depth edges */}
                      <div className="spine-edge-top" />
                      <div className="spine-edge-right" />
                      <div className="spine-edge-bottom" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {/* Shelf board */}
            <div className="shelf-board" />
          </div>
        </div>
      </div>

      {/* Backdrop overlay when book is open */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            className="book-overlay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleCloseBook}
          />
        )}
      </AnimatePresence>

      {/* Open Book View */}
      <AnimatePresence>
        {selectedBook && animationStage === 'opened' && (
          <motion.div
            className="book-open-container"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="book-opened">
              {/* Left page */}
              <motion.div
                className="book-page book-page-left"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <div className="page-content">
                  <div 
                    className="page-accent-bar"
                    style={{ backgroundColor: selectedBook.bgColor || '#3b82f6' }}
                  />
                  <h2 className="page-title">{selectedBook.name}</h2>
                  <p className="page-description">
                    {selectedBook.description || 'No description available.'}
                  </p>
                </div>
              </motion.div>

              {/* Book spine divider (middle fold) */}
              <div className="book-spine-divider" />

              {/* Right page */}
              <motion.div
                className="book-page book-page-right"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <div className="page-content">
                  <h3 className="page-section-title">Color Information</h3>
                  <div className="color-showcase">
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: selectedBook.bgColor || '#3b82f6' }}
                    />
                    <div className="color-details">
                      <span className="color-hex">{selectedBook.bgColor || '#3b82f6'}</span>
                      <span className="color-label">Primary Subject Color</span>
                    </div>
                  </div>
                  {selectedBook.image && (
                    <div className="page-image-section">
                      <h4>Subject Image</h4>
                      <img src={selectedBook.image} alt={selectedBook.name} className="page-image" />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Close button */}
            <motion.button
              className="book-close-btn"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCloseBook}
              aria-label="Close book"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default LibraryBookshelf;
