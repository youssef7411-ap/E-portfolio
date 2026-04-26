import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

const lerp = (a, b, n) => (1 - n) * a + n * b;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const SubjectGallery = ({ subjects, meta }) => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const trackRef = useRef(null);
  const itemsRef = useRef([]);

  const [containerHeight, setContainerHeight] = useState('auto');

  const scrollState = useRef({
    current: 0,
    target: 0,
    ease: 0.08, // Extra smooth easing matching Codrops feel
    limit: 0,
  });

  // Calculate the total scrollable height needed for the horizontal track
  const updateLayout = useCallback(() => {
    if (!trackRef.current || !stickyRef.current) return;
    
    const trackWidth = trackRef.current.scrollWidth;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // The "limit" is how much horizontal scroll we need
    scrollState.current.limit = trackWidth - viewportWidth;
    
    // The "containerHeight" is how much vertical scroll we want to dedicate to this section
    // We add viewportHeight so the sticky content stays in view for the duration
    const totalVerticalScroll = scrollState.current.limit + viewportHeight;
    setContainerHeight(`${totalVerticalScroll}px`);
  }, []);

  useEffect(() => {
    updateLayout();
    window.addEventListener('resize', updateLayout);
    // Extra update after a small delay to ensure all images/layout are settled
    const timer = setTimeout(updateLayout, 500);
    return () => {
      window.removeEventListener('resize', updateLayout);
      clearTimeout(timer);
    };
  }, [updateLayout, subjects]);

  // Smooth Render Loop tied to Page Scroll
  useEffect(() => {
    let rafId;
    
    const render = () => {
      if (!sectionRef.current || !trackRef.current) return;

      const state = scrollState.current;
      const rect = sectionRef.current.getBoundingClientRect();

      // Calculate progress based on vertical position of the section
      // 0 = section top at viewport top
      // limit = section bottom at viewport bottom
      const progress = clamp(-rect.top, 0, state.limit);
      state.target = progress;
      
      // Smoothly interpolate current position
      state.current = lerp(state.current, state.target, state.ease);
      
      // Apply main horizontal transform
      trackRef.current.style.transform = `translate3d(${-state.current}px, 0, 0)`;

      // Parallax + Tilt Effect (Exactly matching Codrops feel)
      const vw = window.innerWidth;
      const viewportCenter = vw * 0.5;

      itemsRef.current.forEach((item) => {
        if (!item) return;
        const img = item.querySelector('.gallery-img-source');
        const overlay = item.querySelector('.gallery-overlay');
        if (!img) return;

        const itemRect = item.getBoundingClientRect();
        const elementCenter = itemRect.left + itemRect.width * 0.5;
        const t = clamp((elementCenter - viewportCenter) / viewportCenter, -1, 1);
        
        // Parallax shift (intensity: 0.4 like Codrops GLMedia)
        const maxShift = 12; // % shift
        const shift = -t * maxShift;
        img.style.transform = `translate3d(${shift}%, 0, 0) scale(1.1)`;

        // Dynamic Tilt (Adding that "exactly" premium feel)
        const tilt = t * 3; // 3 degrees max tilt
        item.style.transform = `perspective(1000px) rotateY(${-tilt}deg)`;
        
        // Fade overlay based on distance from center
        if (overlay) {
          overlay.style.opacity = 1 - Math.abs(t) * 0.5;
        }
      });

      rafId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div 
      className="gallery-sticky-wrapper" 
      ref={sectionRef} 
      style={{ height: containerHeight }}
    >
      <div className="gallery-sticky-content" ref={stickyRef}>
        <div className="home-section-head" style={{ position: 'absolute', top: '5vh', left: '10vw', margin: 0, zIndex: 10 }}>
          <h3>Subject Archive</h3>
          <span>Explore the work</span>
        </div>
        <div className="gallery-track-container">
          <div className="gallery-track" ref={trackRef}>
            {subjects.map((subject, index) => (
              <div
                key={subject._id}
                className="gallery-item"
                ref={el => itemsRef.current[index] = el}
                onClick={() => navigate(`/subject/${subject._id}`)}
              >
                <div className="gallery-image-container">
                  <img
                    src={subject.image}
                    alt={subject.name}
                    className="gallery-img-source"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="gallery-overlay">
                    <span className="gallery-index">{(index + 1).toString().padStart(2, '0')}</span>
                    <h4 className="gallery-title">{subject.name}</h4>
                    <div className="gallery-meta">
                      <span>{meta.get(String(subject._id))?.postCount || 0} Uploads</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(SubjectGallery);
