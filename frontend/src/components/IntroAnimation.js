import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

const vertexShader = `
varying vec2 vUv;
attribute vec3 aPosition;
attribute float aIndex;
attribute vec4 aTextureCoords;

uniform float uCurrentPage;
uniform float uPageThickness;
uniform float uPageWidth;
uniform float uPageHeight;
uniform float uMeshCount;
uniform float uTime;
uniform float uProgress;
uniform float uSplitProgress;
uniform float uPageSpacing;

varying vec4 vTextureCoords;
varying float vIndex;
varying vec3 vPosition;

mat3 getYrotationMatrix(float angle) {
    return mat3(
        cos(angle), 0.0, sin(angle),
        0.0, 1.0, 0.0,
        -sin(angle), 0.0, cos(angle)
    );
}

float remap(float value, float originMin, float originMax) {
    return clamp((value - originMin) / (originMax - originMin), 0.0, 1.0);
}

void main() {
    vUv = uv;
    vIndex = aIndex;
    vTextureCoords = aTextureCoords;
    
    float PI = 3.14159265359;
    vec3 rotationCenter = vec3(-uPageWidth * 0.5, 0.0, 0.0);
    vec3 translatedPosition = position - rotationCenter;
    
    float rotationAcclerationProgress = remap(uProgress, 0.0, 0.3);
    float delayBeforeStart = (aIndex / uMeshCount);
    float localRotAccelerationProgress = clamp((rotationAcclerationProgress - delayBeforeStart), 0.0, 1.0);

    float yAngle = -(position.x * 0.2 * smoothstep(0.0, 0.3, rotationAcclerationProgress) - rotationAcclerationProgress * 2.0 * PI - localRotAccelerationProgress * 2.0 * PI);
    
    float fullSpeedRotationAngle = remap(uProgress, 0.3, 0.7);
    yAngle += fullSpeedRotationAngle * 4.2 * PI;

    float stackingAngle = remap(uProgress, 0.7, 1.0);
    yAngle += position.x * 0.2 * stackingAngle + (1.0 - localRotAccelerationProgress) * 2.0 * PI * stackingAngle + PI * 1.7 * stackingAngle;

    float pageCrumple = (aIndex - (uMeshCount - 1.0) * 0.5) * smoothstep(0.8, 1.0, stackingAngle) * ((uPageWidth - translatedPosition.x - 1.0) * 0.01);
    translatedPosition.z += pageCrumple * (1.0 - uSplitProgress);
    
    float pageCrumpleAngle = (aIndex - (uMeshCount - 1.0) * 0.5) * smoothstep(0.8, 1.0, stackingAngle) * ((-pow(translatedPosition.x, 2.0)) * 0.002);
    yAngle += pageCrumpleAngle;

    float stackingPages = (uMeshCount - aIndex) * uPageThickness * smoothstep(0.8, 1.0, stackingAngle);
    translatedPosition.z += stackingPages * (1.0 - uSplitProgress);
    yAngle -= pageCrumpleAngle * uSplitProgress;

    mat3 rotationMatrix = getYrotationMatrix(yAngle);
    vec3 rotatedPosition = rotationMatrix * translatedPosition;
    vec3 finalPosition = rotatedPosition + rotationCenter;

    // Zoom out effect at the end
    finalPosition.z += uSplitProgress * 15.0;
    finalPosition.x += uSplitProgress * (aIndex - uMeshCount * 0.5) * 5.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
    vPosition = finalPosition;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec4 vTextureCoords;
varying float vIndex;
varying vec3 vPosition;

uniform sampler2D uAtlas;
uniform float uTime;
uniform float uOpacity;

void main() {
    vec2 atlasUv = vec2(
        mix(vTextureCoords.x, vTextureCoords.y, vUv.x),
        mix(vTextureCoords.z, vTextureCoords.w, vUv.y)
    );
    
    vec4 color = texture2D(uAtlas, atlasUv);
    
    // Add some shading based on position and normal (fake)
    float shading = mix(0.7, 1.0, vUv.x);
    color.rgb *= shading;
    
    gl_FragColor = vec4(color.rgb, uOpacity);
}
`;

const IntroAnimation = ({ onComplete }) => {
  const containerRef = useRef();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    camera.position.z = 5;

    const meshCount = 13;
    const pageWidth = 2.5;
    const pageHeight = 3.5;
    const pageThickness = 0.02;

    const geometry = new THREE.BoxGeometry(pageWidth, pageHeight, pageThickness, 32, 32, 1);
    
    const aIndex = new Float32Array(meshCount);
    const aTextureCoords = new Float32Array(meshCount * 4);

    const imagePaths = Array.from({ length: 13 }, (_, i) => `/intro-images/p${i + 1}.jpg`);
    
    const loadAtlas = async () => {
      const images = await Promise.all(imagePaths.map(path => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = path;
        });
      }));

      const atlasWidth = Math.max(...images.map(img => img.width));
      const totalHeight = images.reduce((sum, img) => sum + img.height, 0);

      const canvas = document.createElement('canvas');
      canvas.width = atlasWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      let currentY = 0;
      images.forEach((img, i) => {
        ctx.drawImage(img, 0, currentY);
        const xStart = 0;
        const xEnd = img.width / atlasWidth;
        const yStart = 1 - currentY / totalHeight;
        const yEnd = 1 - (currentY + img.height) / totalHeight;
        
        aTextureCoords[i * 4 + 0] = xStart;
        aTextureCoords[i * 4 + 1] = xEnd;
        aTextureCoords[i * 4 + 2] = yStart;
        aTextureCoords[i * 4 + 3] = yEnd;
        
        currentY += img.height;
      });

      const atlasTexture = new THREE.Texture(canvas);
      atlasTexture.needsUpdate = true;

      for (let i = 0; i < meshCount; i++) aIndex[i] = i;

      const instancedMesh = new THREE.InstancedMesh(geometry, null, meshCount);
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uAtlas: { value: atlasTexture },
          uProgress: { value: 0 },
          uSplitProgress: { value: 0 },
          uMeshCount: { value: meshCount },
          uPageWidth: { value: pageWidth },
          uPageHeight: { value: pageHeight },
          uPageThickness: { value: pageThickness },
          uTime: { value: 0 },
          uOpacity: { value: 1 }
        },
        transparent: true,
        side: THREE.DoubleSide
      });

      instancedMesh.material = material;
      
      // Set initial matrices
      const dummy = new THREE.Object3D();
      for (let i = 0; i < meshCount; i++) {
        dummy.position.set(0, 0, 0);
        dummy.updateMatrix();
        instancedMesh.setMatrix(i, dummy.matrix);
      }

      // Add attributes for indexing and texture coords
      geometry.setAttribute('aIndex', new THREE.InstancedBufferAttribute(aIndex, 1));
      geometry.setAttribute('aTextureCoords', new THREE.InstancedBufferAttribute(aTextureCoords, 4));

      scene.add(instancedMesh);

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(material.uniforms.uOpacity, {
            value: 0,
            duration: 1,
            onComplete: () => {
              setIsVisible(false);
              if (onComplete) onComplete();
            }
          });
        }
      });

      tl.to(material.uniforms.uProgress, {
        value: 1,
        duration: 4,
        ease: "power2.inOut"
      });

      tl.to(material.uniforms.uSplitProgress, {
        value: 1,
        duration: 1.5,
        ease: "power2.inOut"
      }, "-=0.5");

      const animate = (time) => {
        material.uniforms.uTime.value = time * 0.001;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      };
      animate(0);
    };

    loadAtlas();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#020617',
        pointerEvents: 'none'
      }}
    />
  );
};

export default IntroAnimation;
