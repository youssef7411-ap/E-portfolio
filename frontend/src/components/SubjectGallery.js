import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

const vertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uParallax;
uniform float uUvScale;

vec2 coverUv(vec2 uv, vec2 resolution, vec2 imageResolution) {
  vec2 ratio = vec2(
    min((resolution.x / resolution.y) / (imageResolution.x / imageResolution.y), 1.0),
    min((resolution.y / resolution.x) / (imageResolution.y / imageResolution.x), 1.0)
  );
  return vec2(
    uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    uv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
}

void main() {
  vec2 uv = coverUv(vUv, uResolution, uImageResolution);
  uv.x += uParallax;
  uv -= 0.5;
  uv *= uUvScale;
  uv += 0.5;
  vec3 col = texture2D(uTexture, uv).rgb;
  gl_FragColor = vec4(col, 1.0);
}
`;

const SubjectGallery = ({ subjects, meta }) => {
  const containerRef = useRef();
  const wrapperRef = useRef();
  const canvasRef = useRef();
  const navigate = useNavigate();
  const scrollRef = useRef({ current: 0, target: 0, limit: 0 });

  useEffect(() => {
    if (!subjects.length || !containerRef.current) return;

    // Three.js Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    camera.position.z = 5;

    const meshes = [];
    const textureLoader = new THREE.TextureLoader();

    // Create meshes for each subject
    const createGalleryMeshes = () => {
      const items = containerRef.current.querySelectorAll('.gallery-item');
      items.forEach((item, index) => {
        const img = item.querySelector('.gallery-img-source');
        if (!img) return;

        const bounds = img.getBoundingClientRect();
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uTexture: { value: null },
            uResolution: { value: new THREE.Vector2(bounds.width, bounds.height) },
            uImageResolution: { value: new THREE.Vector2(1, 1) },
            uParallax: { value: 0 },
            uUvScale: { value: 0.85 }
          }
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.index = index;
        
        // Load actual subject image
        const subject = subjects[index];
        if (subject && subject.image) {
          textureLoader.load(subject.image, (tex) => {
            material.uniforms.uTexture.value = tex;
            material.uniforms.uImageResolution.value.set(tex.image.width, tex.image.height);
          });
        }

        scene.add(mesh);
        meshes.push(mesh);
      });
    };

    createGalleryMeshes();

    const updateMeshPositions = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const viewportCenter = vw * 0.5;

      meshes.forEach((mesh) => {
        const item = containerRef.current.querySelectorAll('.gallery-item')[mesh.userData.index];
        const img = item.querySelector('.gallery-img-source');
        const bounds = img.getBoundingClientRect();
        
        // Convert screen coordinates to Three.js coordinates
        const x = (bounds.left + bounds.width / 2) - vw / 2;
        const y = -(bounds.top + bounds.height / 2) + vh / 2;
        
        // Perspective adjustment
        const fov = camera.fov * (Math.PI / 180);
        const height = 2 * Math.tan(fov / 2) * camera.position.z;
        const width = height * camera.aspect;
        
        mesh.position.x = (x / vw) * width;
        mesh.position.y = (y / vh) * height;
        mesh.scale.set((bounds.width / vw) * width, (bounds.height / vh) * height, 1);

        // Enhanced Parallax logic
        const elementCenter = bounds.left + bounds.width * 0.5;
        const distance = (elementCenter - viewportCenter) / vw;
        mesh.material.uniforms.uParallax.value = distance * 0.35;
      });
    };

    const onWheel = (e) => {
      scrollRef.current.target = Math.max(0, Math.min(scrollRef.current.limit, scrollRef.current.target + e.deltaY));
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      if (containerRef.current && wrapperRef.current) {
        const containerWidth = containerRef.current.scrollWidth;
        const wrapperWidth = wrapperRef.current.clientWidth;
        scrollRef.current.limit = Math.max(0, containerWidth - wrapperWidth);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // Initial limit set after layout
    setTimeout(handleResize, 500);

    let animationId;
    const animate = () => {
      // Smooth scroll lerping
      scrollRef.current.current = THREE.MathUtils.lerp(
        scrollRef.current.current, 
        scrollRef.current.target, 
        0.07
      );

      // Update DOM transform directly for performance
      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(${-scrollRef.current.current}px)`;
      }

      updateMeshPositions();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!animationId) animate();
        } else {
          if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
          }
        }
      },
      { threshold: 0.1 }
    );

    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => {
      if (wrapperRef.current) observer.unobserve(wrapperRef.current);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      
      // Proper cleanup
      meshes.forEach(mesh => {
        mesh.geometry.dispose();
        if (mesh.material.uniforms.uTexture.value) {
          mesh.material.uniforms.uTexture.value.dispose();
        }
        mesh.material.dispose();
      });
      
      renderer.dispose();
      scene.clear();
    };
  }, [subjects]);

  return (
    <div className="gallery-wrapper" ref={wrapperRef}>
      <canvas className="gallery-canvas" ref={canvasRef} />
      <div className="gallery-horizontal" ref={containerRef}>
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
                style={{ opacity: 0 }} // Hide actual image, WebGL will render it
              />
              <div className="gallery-overlay">
                <span className="gallery-index">{(index + 1).toString().padStart(2, '0')}</span>
                <h4 className="gallery-title">{subject.name}</h4>
                <p className="gallery-desc">{subject.description?.substring(0, 100)}...</p>
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

export default SubjectGallery;
