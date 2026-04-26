import React, { memo, useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

const lerp = (a, b, n) => (1 - n) * a + n * b;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const SubjectGallery = ({ subjects, meta }) => {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);

  const scrollState = useRef({
    current: 0,
    target: 0,
    ease: 0.08,
    limit: 0,
  });

  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
  });

  const [isDragging, setIsDragging] = useState(false);

  // Set limits on resize and mount
  const updateLimit = useCallback(() => {
    if (!containerRef.current || !scrollerRef.current) return;
    scrollState.current.limit = containerRef.current.scrollWidth - scrollerRef.current.clientWidth;
  }, []);

  useEffect(() => {
    updateLimit();
    window.addEventListener('resize', updateLimit);
    return () => window.removeEventListener('resize', updateLimit);
  }, [updateLimit, subjects]);

  // Smooth Render Loop
  useEffect(() => {
    let rafId;
    
    const render = () => {
      const state = scrollState.current;
      
      // Keep target within bounds
      state.target = clamp(state.target, 0, state.limit);
      
      // Interpolate current position
      state.current = lerp(state.current, state.target, state.ease);
      
      // Apply main transform
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${-state.current}px, 0, 0)`;
      }

      // Parallax Effect on Images
      const vw = window.innerWidth;
      const viewportCenter = vw * 0.5;

      itemsRef.current.forEach((item) => {
        if (!item) return;
        const img = item.querySelector('.gallery-img-source');
        if (!img) return;

        const rect = item.getBoundingClientRect();
        const elementCenter = rect.left + rect.width * 0.5;

        // Calculate offset from center (-1 to 1)
        const t = clamp((elementCenter - viewportCenter) / viewportCenter, -1, 1);
        
        // Counter-shift the image
        const maxShift = 10; // % shift relative to image width
        const shift = -t * maxShift;
        img.style.transform = `translate3d(${shift}%, 0, 0)`;
      });

      rafId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Handlers
  const handleWheel = useCallback((e) => {
    // Only hijack if we're not at limits or scrolling horizontally
    const state = scrollState.current;
    const isAtStart = state.target <= 0 && e.deltaY < 0;
    const isAtEnd = state.target >= state.limit && e.deltaY > 0;
    
    // If we're not at boundaries, hijack the wheel for smooth horizontal scroll
    if (!isAtStart && !isAtEnd) {
      e.preventDefault();
      state.target += e.deltaY;
    }
  }, []);

  const handlePointerDown = useCallback((e) => {
    const state = scrollState.current;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: state.target,
    };
    setIsDragging(true);
    if (scrollerRef.current) scrollerRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!dragStateRef.current.active) return;
    const delta = e.clientX - dragStateRef.current.startX;
    scrollState.current.target = dragStateRef.current.startScroll - delta * 1.5;
  }, []);

  const handlePointerUp = useCallback((e) => {
    dragStateRef.current.active = false;
    setIsDragging(false);
    if (scrollerRef.current) scrollerRef.current.releasePointerCapture(e.pointerId);
  }, []);

  const scrollByStep = (direction) => {
    const vw = window.innerWidth;
    scrollState.current.target += direction * (vw * 0.6);
  };

  return (
    <div className="gallery-wrapper" ref={scrollerRef} onWheel={handleWheel}>
      <div className="gallery-toolbar">
        <button className="gallery-nav-btn" onClick={() => scrollByStep(-1)} type="button">
          Prev
        </button>
        <button className="gallery-nav-btn" onClick={() => scrollByStep(1)} type="button">
          Next
        </button>
      </div>

      <div 
        className={`gallery-horizontal-container ${isDragging ? 'is-dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="gallery-track" ref={containerRef}>
          {subjects.map((subject, index) => (
            <div
              key={subject._id}
              className="gallery-item"
              ref={el => itemsRef.current[index] = el}
              onClick={() => !isDragging && navigate(`/subject/${subject._id}`)}
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
  );
};

export default memo(SubjectGallery);
