import React, { memo, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

const SubjectGallery = ({ subjects, meta }) => {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);
  const dragStateRef = useRef({ active: false, startX: 0, startLeft: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const scrollByPage = useCallback((direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85 * direction;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  const handleWheel = useCallback((event) => {
    const el = scrollerRef.current;
    if (!el) return;
    const canScrollX = el.scrollWidth > el.clientWidth + 1;
    if (!canScrollX || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }, []);

  const handlePointerDown = useCallback((event) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startLeft: el.scrollLeft,
    };
    setIsDragging(true);
    el.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    const el = scrollerRef.current;
    const dragState = dragStateRef.current;
    if (!el || !dragState.active) return;
    const delta = event.clientX - dragState.startX;
    el.scrollLeft = dragState.startLeft - delta;
  }, []);

  const handlePointerUp = useCallback((event) => {
    const el = scrollerRef.current;
    if (el) {
      el.releasePointerCapture?.(event.pointerId);
    }
    dragStateRef.current.active = false;
    setIsDragging(false);
  }, []);

  return (
    <div className="gallery-wrapper">
      <div className="gallery-toolbar">
        <button className="gallery-nav-btn" onClick={() => scrollByPage(-1)} type="button" aria-label="Scroll left">
          Prev
        </button>
        <button className="gallery-nav-btn" onClick={() => scrollByPage(1)} type="button" aria-label="Scroll right">
          Next
        </button>
      </div>

      <div
        className={`gallery-horizontal ${isDragging ? 'is-dragging' : ''}`}
        ref={scrollerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {subjects.map((subject, index) => (
          <div
            key={subject._id}
            className="gallery-item"
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
  );
};

export default memo(SubjectGallery);
