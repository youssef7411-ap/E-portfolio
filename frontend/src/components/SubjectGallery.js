import React, { memo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

/**
 * Window-based Vertical Pager System
 * 
 * Features:
 * - 100vh "Window" that captures scroll.
 * - Internal slide transitions using wheel/touch.
 * - Release mechanism to continue page scrolling.
 */

const SubjectGallery = ({ subjects, meta }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [canExitUpward, setCanExitUpward] = useState(false); // Track if user can scroll out upward
  
  const lastWheelTime = useRef(0);
  const scrollCooldown = 800; // Smoother, faster cooldown for fluid transitions
  const touchStart = useRef(0);
  const wheelThreshold = 30; // More responsive scroll detection
  const scrollDirection = useRef('none'); // Track scroll direction

  // Intersection Observer to detect when the Subjects section is active
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.intersectionRatio >= 0.25);
      },
      { threshold: [0.1, 0.25, 0.5, 0.75, 1] }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handle Wheel Events with Smooth Transitions and Exit Logic
  useEffect(() => {
    const atFirstSlide = () => activeIndex === 0;
    const atLastSlide = () => activeIndex === subjects.length - 1;

    const handleWheel = (e) => {
      if (!isIntersecting) return;

      const now = Date.now();
      const delta = e.deltaY;
      const goingDown = delta > 0;
      const goingUp = delta < 0;

      if (Math.abs(delta) < wheelThreshold) return;

      const withinCooldown = now - lastWheelTime.current < scrollCooldown;

      // Scrolling Down - Navigate through subjects forward
      if (goingDown) {
        scrollDirection.current = 'down';
        setCanExitUpward(false); // Reset exit flag when going back into subjects
        
        if (atLastSlide()) {
          // At last subject, allow page scroll
          return;
        }
        
        if (withinCooldown) return;
        if (e.cancelable) e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, subjects.length - 1));
        lastWheelTime.current = now;
        return;
      }

      // Scrolling Up - Navigate backward or exit
      if (goingUp) {
        scrollDirection.current = 'up';

        if (atFirstSlide() && canExitUpward) {
          // At first subject and user has scrolled through all backward - allow page scroll
          return;
        }

        if (atLastSlide() && !canExitUpward) {
          // Starting reverse journey from last subject
          setCanExitUpward(true);
          if (e.cancelable) e.preventDefault();
          return;
        }

        if (!atFirstSlide()) {
          // Navigate up through subjects
          if (withinCooldown) {
            if (e.cancelable) e.preventDefault();
            return;
          }
          if (e.cancelable) e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          lastWheelTime.current = now;
        } else if (atFirstSlide() && canExitUpward) {
          // Allow natural page scroll
          return;
        } else {
          // At first slide but haven't enabled exit - block scroll
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    const handleTouchStart = (e) => {
      touchStart.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!isIntersecting) return;

      const touchEnd = e.touches[0].clientY;
      const deltaY = touchStart.current - touchEnd;
      const goingDown = deltaY > 0;
      const goingUp = deltaY < 0;

      if (Math.abs(deltaY) < 40) return; // Touch threshold

      const now = Date.now();
      const withinCooldown = now - lastWheelTime.current < scrollCooldown;

      // Scrolling Down - Navigate through subjects forward
      if (goingDown) {
        scrollDirection.current = 'down';
        setCanExitUpward(false);

        if (atLastSlide()) {
          return;
        }

        if (withinCooldown) return;
        if (e.cancelable) e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, subjects.length - 1));
        lastWheelTime.current = now;
        return;
      }

      // Scrolling Up - Navigate backward or exit
      if (goingUp) {
        scrollDirection.current = 'up';

        if (atFirstSlide() && canExitUpward) {
          return;
        }

        if (atLastSlide() && !canExitUpward) {
          setCanExitUpward(true);
          if (e.cancelable) e.preventDefault();
          return;
        }

        if (!atFirstSlide()) {
          if (withinCooldown) {
            if (e.cancelable) e.preventDefault();
            return;
          }
          if (e.cancelable) e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          lastWheelTime.current = now;
        } else if (atFirstSlide() && canExitUpward) {
          return;
        } else {
          if (e.cancelable) e.preventDefault();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });

    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
    };
  }, [isIntersecting, activeIndex, subjects.length, canExitUpward]);

  return (
    <div 
      className="gallery-window-container" 
      ref={sectionRef}
    >
      <div className="gallery-viewer">
        {subjects.map((subject, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          const isFuture = index > activeIndex;

          return (
            <div
              key={subject._id}
              className={`gallery-slide ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
              style={{
                zIndex: subjects.length - index,
                transform: `translate3d(0, ${isActive ? 0 : (isPast ? -100 : 100)}%, 0)`,
                visibility: (isActive || isPast || isFuture) ? 'visible' : 'hidden',
                opacity: isActive ? 1 : 0
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
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>

        {/* Compact Floating Footer */}
        <div className="gallery-compact-footer">
          <div className="compact-footer-actions">
            <select 
              className="compact-subject-select"
              value={subjects[activeIndex]?._id || ''}
              onChange={(e) => {
                const targetId = e.target.value;
                const targetIndex = subjects.findIndex(s => s._id === targetId);
                if (targetIndex !== -1) setActiveIndex(targetIndex);
              }}
            >
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
            <button 
              className="compact-cta-btn"
              onClick={() => navigate(`/subject/${subjects[activeIndex]._id}`)}
            >
              View Details
            </button>
            <button 
              className="compact-cta-btn secondary"
              onClick={() => navigate('/all-posts')}
            >
              All Posts
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="gallery-scroll-prompt">
          <div className="mouse">
            <div className="wheel" />
          </div>
          <span>{activeIndex === subjects.length - 1 ? 'End of section' : 'Scroll to explore'}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(SubjectGallery);
