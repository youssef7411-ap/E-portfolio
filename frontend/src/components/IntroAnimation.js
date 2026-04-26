import React, { useEffect, useRef } from 'react';
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
uniform float uScrollY;
uniform float uSpeedY;

varying vec4 vTextureCoords;
varying float vIndex;
varying float vRotationProgress;

mat3 getYrotationMatrix(float angle) {
    return mat3(
        cos(angle), 0.0, sin(angle),
        0.0, 1.0, 0.0,
        -sin(angle), 0.0, cos(angle)
    );
}

mat3 getXrotationMatrix(float angle) {
    return mat3(
        1.0, 0.0, 0.0,
        0.0, cos(angle), -sin(angle),
        0.0, sin(angle), cos(angle)
    );
}

float remap(float value, float originMin, float originMax) {
    return clamp((value - originMin) / (originMax - originMin), 0.0, 1.0);
}

float getXwave(float x) {
    return sin(x * 2.0) * 0.4;
}

void main() {
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
    yAngle -= uSplitProgress * PI * 0.4;
    
    translatedPosition.z += uSplitProgress * uPageSpacing * (-(aIndex - (uMeshCount - 1.0) * 0.5));

    float boxCenterZ = uPageSpacing * (-(aIndex - (uMeshCount - 1.0) * 0.5));
    float maxZ = uMeshCount * (uPageSpacing + uPageThickness) * 0.5;
    float centerZProgress = boxCenterZ - uScrollY;
    float wrappedCenterZ = mod(centerZProgress + maxZ, 2.0 * maxZ) - maxZ - getXwave((position.y + uPageHeight * 0.5) / uPageHeight) * clamp(uSpeedY * 2.0, -2.0, 2.0);
    
    float zOffset = wrappedCenterZ - boxCenterZ;
    translatedPosition.z += zOffset;
    
    vec3 rotatedPosition = getYrotationMatrix(yAngle) * translatedPosition;
    rotatedPosition.z -= uSplitProgress;

    float initialRotationProgress = remap(uProgress, 0.0, 0.15);
    rotatedPosition += rotationCenter;
    rotatedPosition.x += initialRotationProgress * uPageWidth * 0.5;

    float xAngle = -PI * 0.2 * initialRotationProgress;
    xAngle += uSplitProgress * PI * 0.2;

    vec3 newPosition = getXrotationMatrix(xAngle) * rotatedPosition;
    vec4 modelPosition = modelMatrix * instanceMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    vUv = uv;
    vTextureCoords = aTextureCoords;
    vIndex = aIndex;
    vRotationProgress = localRotAccelerationProgress;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec4 vTextureCoords;
uniform sampler2D uAtlas;
varying float vIndex;
varying float vRotationProgress;

void main() {
    float xStart = vTextureCoords.x;
    float xEnd = vTextureCoords.y;
    float yStart = vTextureCoords.z;
    float yEnd = vTextureCoords.w;

    vec2 atlasUV = vec2(
        mix(xStart, xEnd, vUv.x),
        mix(yStart, yEnd, 1.0 - vUv.y)
    );

    if(vRotationProgress == 0.0 && vIndex != 0.0) {
        discard;
    }
    
    gl_FragColor = texture2D(uAtlas, atlasUV);
}
`;

const IntroAnimation = ({ onIntroComplete, enableScrollInteraction = false }) => {
  const containerRef = useRef();
  const canvasRef = useRef();
  const interactionRef = useRef();
  const introOverlayRef = useRef();
  const uniformRefs = useRef(null);
  const hoverRef = useRef(false);
  const canInteractRef = useRef(enableScrollInteraction);

  useEffect(() => {
    canInteractRef.current = enableScrollInteraction;
  }, [enableScrollInteraction]);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const meshCount = 30;
    const pageDimensions = { width: 2, height: 3 };
    const pageThickness = 0.01;
    const pageSpacing = 1;

    const geometry = new THREE.BoxGeometry(
      pageDimensions.width,
      pageDimensions.height,
      pageThickness,
      50,
      50,
      1
    );

    const imagePaths = Array.from({ length: 13 }, (_, i) => `/intro-images/p${i + 1}.jpg`);
    
    const loadTextureAtlas = async () => {
      const images = await Promise.all(
        imagePaths.map((path) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = path;
          });
        })
      );

      const validImages = images.filter(img => img !== null);
      
      const atlasWidth = Math.max(...validImages.map((img) => img.width));
      let totalHeight = 0;
      validImages.forEach((img) => {
        totalHeight += img.height;
      });

      const canvas = document.createElement('canvas');
      canvas.width = atlasWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      const imageInfos = [];
      let currentY = 0;

      validImages.forEach((img) => {
        ctx.drawImage(img, 0, currentY);
        
        imageInfos.push({
          uvs: {
            xStart: 0,
            xEnd: img.width / atlasWidth,
            yStart: 1 - currentY / totalHeight,
            yEnd: 1 - (currentY + img.height) / totalHeight,
          }
        });

        currentY += img.height;
      });

      const atlasTexture = new THREE.CanvasTexture(canvas);
      atlasTexture.needsUpdate = true;
      return { atlasTexture, imageInfos };
    };

    let animationId;
    let material;
    let atlasTexture;
    let instancedMesh;

    loadTextureAtlas().then((res) => {
      atlasTexture = res.atlasTexture;
      const imageInfos = res.imageInfos;

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uAtlas: { value: atlasTexture },
          uProgress: { value: 0 },
          uSplitProgress: { value: 0 },
          uPageWidth: { value: pageDimensions.width },
          uPageHeight: { value: pageDimensions.height },
          uPageThickness: { value: pageThickness },
          uPageSpacing: { value: pageSpacing },
          uMeshCount: { value: meshCount },
          uScrollY: { value: 0 },
          uSpeedY: { value: 0 },
          uTime: { value: 0 },
        },
        transparent: true,
      });

      instancedMesh = new THREE.InstancedMesh(geometry, material, meshCount);
      
      const textureCoords = new Float32Array(meshCount * 4);
      const indices = new Float32Array(meshCount);

      for (let i = 0; i < meshCount; i++) {
        const info = imageInfos[i % imageInfos.length];
        textureCoords[i * 4 + 0] = info.uvs.xStart;
        textureCoords[i * 4 + 1] = info.uvs.xEnd;
        textureCoords[i * 4 + 2] = info.uvs.yStart;
        textureCoords[i * 4 + 3] = info.uvs.yEnd;
        indices[i] = i;

        const matrix = new THREE.Matrix4();
        instancedMesh.setMatrixAt(i, matrix);
      }
      
      geometry.setAttribute('aTextureCoords', new THREE.InstancedBufferAttribute(textureCoords, 4));
      geometry.setAttribute('aIndex', new THREE.InstancedBufferAttribute(indices, 1));

      scene.add(instancedMesh);
      uniformRefs.current = material.uniforms;

      const anim = gsap.timeline({
        onComplete: () => {
          gsap.to(introOverlayRef.current, {
            opacity: 0,
            duration: 1.2,
            ease: 'power2.inOut',
            onComplete: () => {
              if (onIntroComplete) onIntroComplete();
            },
          });
        },
      });

      anim.fromTo(
        material.uniforms.uProgress,
        { value: 0 },
        { value: 1, duration: 4, ease: 'power2.inOut' }
      );
      anim.fromTo(
        material.uniforms.uSplitProgress,
        { value: 0 },
        { value: 1, duration: 1.2, ease: 'power2.inOut' },
        '-=0.8'
      );

      const animate = (time) => {
        material.uniforms.uTime.value = time * 0.001;
        material.uniforms.uSpeedY.value *= 0.85;
        material.uniforms.uScrollY.value = THREE.MathUtils.lerp(
          material.uniforms.uScrollY.value,
          material.uniforms.uScrollY.value + material.uniforms.uSpeedY.value * 0.08,
          0.2
        );
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      };
      animate(0);
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleWheel = (event) => {
      if (!canInteractRef.current || !hoverRef.current || !uniformRefs.current) return;
      const scaledDelta = (event.deltaY * 2.4 * window.innerHeight) / Math.max(window.innerHeight, 1);
      uniformRefs.current.uSpeedY.value += scaledDelta * 0.01;
    };

    const handleMouseEnter = () => {
      hoverRef.current = true;
    };

    const handleMouseLeave = () => {
      hoverRef.current = false;
    };

    const interactionEl = interactionRef.current;
    window.addEventListener('resize', handleResize);
    window.addEventListener('wheel', handleWheel, { passive: true });
    interactionEl?.addEventListener('mouseenter', handleMouseEnter);
    interactionEl?.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      interactionEl?.removeEventListener('mouseenter', handleMouseEnter);
      interactionEl?.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      geometry.dispose();
      if (material) material.dispose();
      if (atlasTexture) atlasTexture.dispose();
      scene.clear();
    };
  }, [onIntroComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        background: '#020617',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div
        ref={interactionRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
      />
      <div
        ref={introOverlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: '#020617',
          opacity: 1,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default IntroAnimation;
