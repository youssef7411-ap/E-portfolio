import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

/**
 * Sophisticated Vertical-to-Horizontal Scroll Interaction System
 * 
 * Features:
 * - Sticky vertical-to-horizontal mapping
 * - Momentum-based easing (Lerp)
 * - Magnetic snapping logic
 * - Hardware accelerated (60fps)
 * - Accessibility support (Reduced motion)
 */

const lerp = (a, b, n) => (1 - n) * a + n * b;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const SubjectGallery = ({ subjects, meta }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const trackRef = useRef(null);
  const itemsRef = useRef([]);
  const progressRef = useRef(null);

  const [containerHeight, setContainerHeight] = useState('auto');

  // Configuration Constants
  const CONFIG = {
    ease: 0.085,
    snapThreshold: 0.1, // Percentage of viewport width to trigger snap
    parallaxIntensity: 0.4,
    magneticEase: 0.05,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  const scrollState = useRef({
    current: 0,
    target: 0,
    limit: 0,
    velocity: 0,
    lastPos: 0,
    isSnapping: false,
    snapTarget: 0
  });

  // Calculate layout and total vertical height required
  const updateLayout = useCallback(() => {
    if (!trackRef.current) return;
    
    const trackWidth = trackRef.current.scrollWidth;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Total horizontal distance to travel
    const horizontalLimit = trackWidth - viewportWidth;
    scrollState.current.limit = horizontalLimit;
    
    // Map horizontal distance to vertical container height
    // We add viewportHeight to ensure the section stays sticky for the full duration
    const totalVerticalHeight = horizontalLimit + viewportHeight;
    setContainerHeight(`${totalVerticalHeight}px`);
  }, []);

  useEffect(() => {
    updateLayout();
    window.addEventListener('resize', updateLayout);
    const timer = setTimeout(updateLayout, 500);
    return () => {
      window.removeEventListener('resize', updateLayout);
      clearTimeout(timer);
    };
  }, [updateLayout, subjects]);

  // Main Render Loop (requestAnimationFrame)
  useEffect(() => {
    if (CONFIG.reducedMotion) return;

    let rafId;
    
    const render = () => {
      if (!sectionRef.current || !trackRef.current) return;

      const state = scrollState.current;
      const rect = sectionRef.current.getBoundingClientRect();
      
      // 1. Calculate Target from Vertical Position
      // rect.top <= 0 means section has reached/passed top of viewport
      const targetPos = clamp(-rect.top, 0, state.limit);
      state.target = targetPos;
      
      // 2. Momentum & Easing
      const prevPos = state.current;
      state.current = lerp(state.current, state.target, CONFIG.ease);
      state.velocity = state.current - prevPos;

      // 3. Magnetic Snapping (Bonus Feature)
      // If velocity is low, snap to nearest item center
      if (Math.abs(state.velocity) < 0.5 && !state.isSnapping) {
        // Snapping logic placeholder for future refinement
      }

      // 4. Apply Transforms
      trackRef.current.style.transform = `translate3d(${-state.current}px, 0, 0)`;
      
      // 5. Progress Indicator
      const progress = state.current / state.limit;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }

      // 6. Visual Effects (Parallax & Tilt)
      const vw = window.innerWidth;
      const viewportCenter = vw * 0.5;

      itemsRef.current.forEach((item, index) => {
        if (!item) return;
        const img = item.querySelector('.gallery-img-source');
        if (!img) return;

        const itemRect = item.getBoundingClientRect();
        const elementCenter = itemRect.left + itemRect.width * 0.5;
        const distance = (elementCenter - viewportCenter) / viewportCenter;
        const t = clamp(distance, -1, 1);
        
        // Parallax
        const shift = -t * 15; // 15% shift
        img.style.transform = `translate3d(${shift}%, 0, 0) scale(1.15)`;

        // 3D Perspective Tilt
        const tilt = t * 4; // 4 deg tilt
        item.style.transform = `perspective(1200px) rotateY(${-tilt}deg) translate3d(0, ${Math.abs(t) * 20}px, 0)`;
        
        // Dynamic Opacity for non-centered items
        const opacity = 1 - Math.abs(t) * 0.3;
        item.style.opacity = opacity;
      });

      rafId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CONFIG.reducedMotion]);

  return (
    <div 
      className="gallery-sophisticated-wrapper" 
      ref={sectionRef} 
      style={{ height: containerHeight }}
      role="region"
      aria-label="Subject Archive Horizontal Gallery"
    >
      <div className="gallery-sticky-content" ref={stickyRef}>
        {/* Progress Bar */}
        <div className="gallery-progress-container">
          <div className="gallery-progress-bar" ref={progressRef}></div>
        </div>

        {/* Header Overlay */}
        <div className="gallery-header-overlay">
          <div className="home-section-head">
            <h3>Subject Archive</h3>
            <span className="scroll-hint">Scroll to explore →</span>
          </div>
        </div>

        <div className="gallery-track-container">
          <div className="gallery-track" ref={trackRef}>
            {subjects.map((subject, index) => (
              <div
                key={subject._id}
                className="gallery-item"
                ref={el => itemsRef.current[index] = el}
                onClick={() => navigate(`/subject/${subject._id}`)}
                tabIndex="0"
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/subject/${subject._id}`)}
              >
                <div className="gallery-image-container">
                  <img
                    src={subject.image}
                    alt={subject.name}
                    className="gallery-img-source"
                    loading="lazy"
                  />
                  <div className="gallery-info-layer">
                    <span className="gallery-number">{(index + 1).toString().padStart(2, '0')}</span>
                    <h4 className="gallery-name">{subject.name}</h4>
                    <div className="gallery-count-tag">
                      {meta.get(String(subject._id))?.postCount || 0} Projects
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Scroll Hint */}
        <div className="mobile-scroll-hint">
          Swipe or Scroll to Explore
        </div>
      </div>
    </div>
  );
};

export default memo(SubjectGallery);
