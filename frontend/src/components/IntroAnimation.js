import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const IntroAnimation = ({ onComplete }) => {
  const containerRef = useRef();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const currentContainer = containerRef.current;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentContainer.appendChild(renderer.domElement);

    camera.position.z = 5;

    // Create a group for the "magazine"
    const magazine = new THREE.Group();
    scene.add(magazine);

    // Create pages
    const pageGeometry = new THREE.PlaneGeometry(2.5, 3.5);
    const pages = [];
    // More "premium" magazine colors
    const colors = [
      0x0f172a, // Cover (Dark Slate)
      0x1e293b, // Page 1
      0x334155, // Page 2
      0x475569, // Page 3
      0x64748b, // Page 4
      0x0f172a  // Back Cover
    ];

    for (let i = 0; i < 6; i++) {
      const isCover = i === 0;
      const material = new THREE.MeshPhongMaterial({
        color: colors[i % colors.length],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        shininess: isCover ? 100 : 10,
      });
      const page = new THREE.Mesh(pageGeometry, material);
      
      // Pivot point for opening pages
      const pivot = new THREE.Group();
      pivot.add(page);
      
      // Offset the page so it pivots from the edge
      page.position.x = 1.25; 
      
      // Add a tiny bit of thickness to prevent z-fighting
      pivot.position.z = i * 0.01;
      pivot.position.x = -1.25; 
      pivot.rotation.y = 0;
      
      magazine.add(pivot);
      pages.push({ pivot, material });
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, 2);
    scene.add(fillLight);

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(currentContainer, {
          opacity: 0,
          duration: 1.5,
          ease: "power2.inOut",
          onComplete: () => {
            setIsVisible(false);
            if (onComplete) onComplete();
          }
        });
      }
    });

    // Initial appearance - Fade in magazine
    tl.to(pages.map(p => p.material), {
      opacity: 1,
      duration: 1.2,
      stagger: 0.05,
      ease: "power2.out"
    });

    // Initial rotation to show depth
    tl.to(magazine.rotation, {
      y: Math.PI * 0.1,
      x: Math.PI * 0.05,
      duration: 1,
      ease: "power2.out"
    }, 0.5);

    // Flip pages one by one
    pages.forEach((page, i) => {
      if (i < 5) { // Don't flip the back cover
        tl.to(page.pivot.rotation, {
          y: -Math.PI * 0.9 + (i * 0.02), // Fan out
          duration: 1.8,
          ease: "power3.inOut"
        }, 1.5 + i * 0.2);
      }
    });

    // Final zoom and burst
    tl.to(magazine.position, {
      z: 10,
      duration: 1.5,
      ease: "power4.in"
    }, "+=0.2");

    tl.to(pages.map(p => p.material), {
      opacity: 0,
      duration: 0.8,
      stagger: 0.02,
      ease: "power2.in"
    }, "-=1");

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      magazine.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentContainer && renderer.domElement) {
        currentContainer.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef} 
      className="intro-animation-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000,
        background: '#020617',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
  );
};

export default IntroAnimation;
