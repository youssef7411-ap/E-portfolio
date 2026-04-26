import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useNavigate } from 'react-router-dom';
import '../styles/SubjectGallery.css';

gsap.registerPlugin(ScrollTrigger);

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
  const galleryRef = useRef();
  const canvasRef = useRef();
  const navigate = useNavigate();

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

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

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
        scene.add(mesh);

        const texture = textureLoader.load(img.src, (tex) => {
          material.uniforms.uTexture.value = tex;
          material.uniforms.uImageResolution.value.set(tex.image.width, tex.image.height);
        });

        meshes.push({
          mesh,
          element: img,
          material,
          index
        });
      });
    };

    // GSAP Horizontal Scroll
    const sections = gsap.utils.toArray('.gallery-item');
    const totalWidth = sections.length * 85; // 85vw per item

    const scrollTween = gsap.to(sections, {
      xPercent: -100 * (sections.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: galleryRef.current,
        pin: true,
        scrub: 1,
        snap: 1 / (sections.length - 1),
        end: () => `+=${galleryRef.current.offsetWidth * sections.length * 0.5}`,
        invalidateOnRefresh: true
      }
    });

    // Update Mesh Positions
    const updateMeshes = () => {
      meshes.forEach(({ mesh, element, material }) => {
        const bounds = element.getBoundingClientRect();
        
        // Convert screen coordinates to Three.js coordinates
        const x = (bounds.left + bounds.width / 2 - viewport.width / 2) * (5 / (viewport.height / 2 * Math.tan(THREE.MathUtils.degToRad(22.5))));
        const y = -(bounds.top + bounds.height / 2 - viewport.height / 2) * (5 / (viewport.height / 2 * Math.tan(THREE.MathUtils.degToRad(22.5))));
        
        mesh.position.set(x, y, 0);
        mesh.scale.set(
            bounds.width * (5 / (viewport.height / 2 * Math.tan(THREE.MathUtils.degToRad(22.5)))), 
            bounds.height * (5 / (viewport.height / 2 * Math.tan(THREE.MathUtils.degToRad(22.5)))), 
            1
        );

        // Parallax effect based on horizontal position
        const centerX = bounds.left + bounds.width / 2;
        const distFromCenter = (centerX - viewport.width / 2) / viewport.width;
        material.uniforms.uParallax.value = distFromCenter * 0.4;
      });
    };

    createGalleryMeshes();

    gsap.ticker.add(() => {
      updateMeshes();
      renderer.render(scene, camera);
    });

    const handleResize = () => {
      viewport.width = window.innerWidth;
      viewport.height = window.innerHeight;
      camera.aspect = viewport.width / viewport.height;
      camera.updateProjectionMatrix();
      renderer.setSize(viewport.width, viewport.height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scrollTween.kill();
      gsap.ticker.remove(updateMeshes);
      renderer.dispose();
      meshes.forEach(m => {
        m.geometry?.dispose();
        m.material?.dispose();
      });
    };
  }, [subjects]);

  return (
    <div className="gallery-wrapper" ref={containerRef}>
      <canvas className="gallery-canvas" ref={canvasRef} />
      <div className="gallery-horizontal" ref={galleryRef}>
        {subjects.map((subject, index) => (
          <div 
            key={subject._id} 
            className="gallery-item"
            onClick={() => navigate(`/subject/${subject._id}`)}
          >
            <div className="gallery-image-container">
              <img 
                src={subject.image || '/placeholder.webp'} 
                alt={subject.name} 
                className="gallery-img-source"
                style={{ opacity: 0 }} // Hidden because Three.js renders it
              />
              <div className="gallery-overlay">
                <span className="gallery-index">0{index + 1}</span>
                <h2 className="gallery-title">{subject.name}</h2>
                <div className="gallery-meta">
                  <span>{meta.get(String(subject._id))?.postCount || 0} Posts</span>
                  <span className="gallery-explore">Explore →</span>
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
