import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/SubjectGallery.css';

gsap.registerPlugin(ScrollTrigger);

const SubjectGallery = ({ subjects, meta }) => {
  const galleryRef = useRef();
  const containerRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (!subjects.length || !galleryRef.current) return;

    const sections = gsap.utils.toArray('.gallery-item');
    
    // Horizontal scroll
    let scrollTween = gsap.to(sections, {
      xPercent: -100 * (sections.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: galleryRef.current,
        pin: true,
        scrub: 1,
        snap: 1 / (sections.length - 1),
        end: () => `+=${galleryRef.current.offsetWidth * 3}`,
        invalidateOnRefresh: true,
      }
    });

    // Parallax effect for each item's content
    sections.forEach((section) => {
      const img = section.querySelector('.gallery-image');
      const title = section.querySelector('.gallery-title');
      const index = section.querySelector('.gallery-index');

      gsap.to(img, {
        x: 150,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          containerAnimation: scrollTween,
          start: "left right",
          end: "right left",
          scrub: true
        }
      });

      gsap.to(title, {
        x: -50,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          containerAnimation: scrollTween,
          start: "left right",
          end: "right left",
          scrub: true
        }
      });

      gsap.to(index, {
        x: 30,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          containerAnimation: scrollTween,
          start: "left right",
          end: "right left",
          scrub: true
        }
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [subjects]);

  return (
    <div className="gallery-section" ref={galleryRef}>
      <div className="gallery-container" ref={containerRef}>
        {subjects.map((subject, i) => {
          const subjectMeta = meta.get(String(subject._id)) || { postCount: 0 };
          return (
            <div 
              key={subject._id} 
              className="gallery-item"
              onClick={() => navigate(`/subject/${subject._id}`)}
            >
              <div className="gallery-inner">
                <div className="gallery-image-wrapper">
                  <img 
                    src={subject.icon_url || 'https://via.placeholder.com/800x600'} 
                    alt={subject.name} 
                    className="gallery-image"
                  />
                </div>
                <div className="gallery-content">
                  <span className="gallery-index">{(i + 1).toString().padStart(2, '0')}</span>
                  <h2 className="gallery-title">{subject.name}</h2>
                  <div className="gallery-footer">
                    <span className="gallery-projects">{subjectMeta.postCount} Projects</span>
                    <span className="gallery-explore">Explore →</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectGallery;
