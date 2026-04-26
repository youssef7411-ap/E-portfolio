import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

const SubjectGallery = ({ subjects, meta, horizontalOffset = 0, wrapperRef, trackRef }) => {
  const navigate = useNavigate();

  return (
    <div className="gallery-wrapper" ref={wrapperRef}>
      <div
        className="gallery-horizontal"
        ref={trackRef}
        style={{ transform: `translate3d(${-horizontalOffset}px, 0, 0)` }}
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
