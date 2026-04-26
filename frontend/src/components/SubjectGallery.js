import React, { memo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

/**
 * Full-Screen Vertical Pager System for Subjects
 * 
 * Behavior:
 * - Locks scroll when section is active.
 * - Transitions subjects vertically as full-screen slides.
 * - Snap-like mapping between scroll position and active slide.
 * - Smooth entry/exit at section boundaries.
 */

const lerp = (a, b, n) => (1 - n) * a + n * b;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const SubjectGallery = ({ subjects, meta }) => {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState('auto');
  
  // Ref to track scroll state for smooth interpolation
  const scrollState = useRef({
    current: 0,
    target: 0,
    ease: 0.1,
    progress: 0
  });

  // Calculate total height based on number of subjects
  // Each subject gets 100vh of scroll distance
  useEffect(() => {
    if (subjects.length > 0) {
      setContainerHeight(`${subjects.length * 100}vh`);
    }
  }, [subjects.length]);

  useEffect(() => {
    let rafId;

    const handleScroll = () => {
      if (!wrapperRef.current) return;

      const rect = wrapperRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate how far we've scrolled into the section (0 to limit)
      const totalScrollDistance = (subjects.length - 1) * viewportHeight;
      const currentScrollIntoSection = clamp(-rect.top, 0, totalScrollDistance);
      
      scrollState.current.target = currentScrollIntoSection;
    };

    const render = () => {
      const state = scrollState.current;
      state.current = lerp(state.current, state.target, state.ease);
      
      const viewportHeight = window.innerHeight;
      const progress = state.current / viewportHeight; // index with fractional part
      const newIndex = Math.round(progress);

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
      }

      // We use the raw progress for fine-grained animations (like parallax)
      state.progress = progress;

      rafId = requestAnimationFrame(render);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    render();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, [subjects.length, activeIndex]);

  return (
    <div 
      className="gallery-vertical-wrapper" 
      ref={wrapperRef} 
      style={{ height: containerHeight }}
    >
      <div className="gallery-sticky-viewer">
        {subjects.map((subject, index) => {
          // Calculate individual slide offset based on progress
          const offset = index - activeIndex;
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          const isFuture = index > activeIndex;

          return (
            <div
              key={subject._id}
              className={`gallery-slide ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
              style={{
                zIndex: subjects.length - index,
                opacity: isActive ? 1 : 0,
                transform: `translate3d(0, ${isActive ? 0 : offset * 20}%, 0)`
              }}
              onClick={() => navigate(`/subject/${subject._id}`)}
            >
              <div className="slide-background">
                <img
                  src={subject.image}
                  alt={subject.name}
                  className="slide-img"
                  loading="lazy"
                />
                <div className="slide-overlay" />
              </div>

              <div className="slide-content">
                <div className="slide-info-header">
                  <span className="slide-index">{(index + 1).toString().padStart(2, '0')} / {subjects.length.toString().padStart(2, '0')}</span>
                  <div className="slide-line" />
                </div>
                
                <h2 className="slide-title">
                  {subject.name.split(' ').map((word, i) => (
                    <span key={i} className="title-word">{word}</span>
                  ))}
                </h2>

                <div className="slide-meta">
                  <div className="meta-item">
                    <span className="meta-label">Total Posts</span>
                    <span className="meta-value">{meta.get(String(subject._id))?.postCount || 0}</span>
                  </div>
                  <button 
                    className="slide-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/subject/${subject._id}`);
                    }}
                  >
                    View Subject Details
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Vertical Pagination Dots */}
        <div className="gallery-pagination">
          {subjects.map((_, i) => (
            <div 
              key={i} 
              className={`pagination-dot ${i === activeIndex ? 'active' : ''}`}
              onClick={() => {
                const targetY = wrapperRef.current.offsetTop + (i * window.innerHeight);
                window.scrollTo({ top: targetY, behavior: 'smooth' });
              }}
            />
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="gallery-scroll-prompt">
          <div className="mouse">
            <div className="wheel" />
          </div>
          <span>Scroll to explore</span>
        </div>
      </div>
    </div>
  );
};

export default memo(SubjectGallery);
