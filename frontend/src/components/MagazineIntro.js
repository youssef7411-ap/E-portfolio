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

uniform float uScrollY;
uniform float uMaxX;
uniform float uSpeedY;

varying vec4 vTextureCoords;
varying float vIndex;
varying float vRotationProgress;
varying vec3 vPosition;

mat3 getYrotationMatrix(float angle)
{
    return mat3(
        cos(angle), 0.0, sin(angle),
        0.0, 1.0, 0.0,
        -sin(angle), 0.0, cos(angle)
    );
}

mat3 getXrotationMatrix(float angle)
{
    return mat3(
        1.0, 0.0, 0.0,
        0.0, cos(angle), -sin(angle),
        0.0, sin(angle), cos(angle)
    );
}

float remap(float value, float originMin, float originMax)
{
    return clamp((value - originMin) / (originMax - originMin),0.,1.);
}

float getXwave(float x)
{
    return sin(x*2.) * 0.4;
}

void main()
{     
    float PI = 3.14159265359;
    vec3 rotationCenter = vec3(-uPageWidth*0.5, 0.0, 0.0);
    vec3 translatedPosition = position - rotationCenter;    
    
    float rotationAcclerationProgress = remap(uProgress,0.,0.3);
    float delayBeforeStart = (aIndex / uMeshCount);
    float localRotAccelerationProgress = clamp((rotationAcclerationProgress - delayBeforeStart), 0.0, 1.0);

    float yAngle = -(position.x*0.2*smoothstep(0.,0.3,rotationAcclerationProgress) - rotationAcclerationProgress*2.*PI - localRotAccelerationProgress*2.*PI);

    float fullSpeedRotationAngle = remap(uProgress,0.3,0.7);
    yAngle += fullSpeedRotationAngle*4.2*PI;    

    float stackingAngle = remap(uProgress,0.7,1.);
    yAngle += position.x*0.2*stackingAngle + (1.-localRotAccelerationProgress)*2.*PI*stackingAngle + PI*1.7*stackingAngle;

    float pageCrumple = (aIndex - (uMeshCount-1.)*0.5)*smoothstep(0.8,1.,stackingAngle)*((uPageWidth-translatedPosition.x-1.)*0.01);
    translatedPosition.z+= pageCrumple*(1.-uSplitProgress);
    
    float pageCrumpleAngle = (aIndex - (uMeshCount-1.)*0.5)*smoothstep(0.8,1.,stackingAngle)*((-pow(translatedPosition.x,2.))*0.002);
    yAngle+= pageCrumpleAngle;

    float stackingPages = (uMeshCount-aIndex) * uPageThickness*smoothstep(0.8,1.,stackingAngle);
    translatedPosition.z += stackingPages*(1.-uSplitProgress);

    yAngle-= pageCrumpleAngle*uSplitProgress;
    yAngle-=uSplitProgress*PI*0.4;
    translatedPosition.z += uSplitProgress*uPageSpacing*( - (aIndex - (uMeshCount-1.)*0.5));        

    float boxCenterZ = uPageSpacing*( - (aIndex - (uMeshCount-1.)*0.5));        
    float maxZ = uMeshCount * (uPageSpacing + uPageThickness) * 0.5;
    float centerZProgress = boxCenterZ - uScrollY;
    float wrappedCenterZ = mod(centerZProgress + maxZ, 2.0 * maxZ) - maxZ - getXwave((position.y+uPageHeight*0.5)/uPageHeight)*clamp(uSpeedY*2.,-2.,2.    ); 
    
    float zOffset = wrappedCenterZ - boxCenterZ;
    translatedPosition.z += zOffset;

    vec3 rotatedPosition = getYrotationMatrix(yAngle) * translatedPosition;        
    rotatedPosition.z-=uSplitProgress;

    float initialRotationProgress = remap(uProgress,0.,0.15);
    rotatedPosition += rotationCenter;
    rotatedPosition.x += initialRotationProgress*uPageWidth*0.5;

    float xAngle = -PI*0.2*initialRotationProgress;
    xAngle+=uSplitProgress*PI*0.2;
    
    vec3 newPosition = getXrotationMatrix(xAngle) * rotatedPosition;
    vec4 modelPosition = modelMatrix * instanceMatrix * vec4(newPosition, 1.0);        
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;    

    vUv = uv;    
    vTextureCoords=aTextureCoords;
    vIndex=aIndex;
    vRotationProgress=localRotAccelerationProgress;
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec4 vTextureCoords;
uniform sampler2D uAtlas;

varying float vIndex;
varying float vRotationProgress;

void main()
{            
    float xStart = vTextureCoords.x;
    float xEnd = vTextureCoords.y;
    float yStart = vTextureCoords.z;
    float yEnd = vTextureCoords.w;

    vec2 atlasUV = vec2(
        mix(xStart, xEnd, vUv.x),
        mix(yStart, yEnd, 1.-vUv.y)
    );

    if(vRotationProgress==0. && vIndex!=0.)
    {
        discard;
    }
    
    vec4 color = texture2D(uAtlas, atlasUV);
    gl_FragColor = color;
}
`;

const MagazineIntro = ({ onComplete }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const magazineRef = useRef(null);
  const scrollRef = useRef({ target: 0, current: 0, direction: -1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- SETUP ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = 6;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // --- MAGAZINE LOGIC ---
    const meshCount = 30;
    const pageThickness = 0.01;
    const pageSpacing = 1;
    const pageDimensions = { width: 2, height: 3 };

    const loadTextureAtlas = async () => {
      const imagePaths = Array.from({ length: 13 }, (_, i) => `/intro-magazine/p${i + 1}.jpg`);
      const images = await Promise.all(
        imagePaths.map((path) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
              console.warn(`Failed to load image: ${path}`);
              resolve(null);
            };
            img.src = path;
          });
        })
      );

      const validImages = images.filter(img => img !== null);
      if (validImages.length === 0) return null;

      const atlasWidth = Math.max(...validImages.map((img) => img.width));
      const totalHeight = validImages.reduce((sum, img) => sum + img.height, 0);

      const canvas = document.createElement('canvas');
      canvas.width = atlasWidth;
      canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');

      let currentY = 0;
      const imageInfos = validImages.map((img) => {
        ctx.drawImage(img, 0, currentY);
        const info = {
          uvs: {
            xStart: 0,
            xEnd: img.width / atlasWidth,
            yStart: 1 - currentY / totalHeight,
            yEnd: 1 - (currentY + img.height) / totalHeight,
          },
        };
        currentY += img.height;
        return info;
      });

      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      return { texture, imageInfos };
    };

    const initMagazine = async () => {
      const atlas = await loadTextureAtlas();
      if (!atlas) {
        setLoading(false);
        onComplete();
        return;
      }

      const geometry = new THREE.BoxGeometry(
        pageDimensions.width,
        pageDimensions.height,
        pageThickness
      );

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uAtlas: { value: atlas.texture },
          uMeshCount: { value: meshCount },
          uPageThickness: { value: pageThickness },
          uPageWidth: { value: pageDimensions.width },
          uPageHeight: { value: pageDimensions.height },
          uProgress: { value: 0 },
          uSplitProgress: { value: 0 },
          uPageSpacing: { value: pageSpacing },
          uScrollY: { value: 0 },
          uSpeedY: { value: 0 },
        },
        side: THREE.DoubleSide,
        transparent: true,
      });

      const instancedMesh = new THREE.InstancedMesh(geometry, material, meshCount);
      
      const textureCoords = new Float32Array(meshCount * 4);
      const indices = new Float32Array(meshCount);

      for (let i = 0; i < meshCount; i++) {
        const info = atlas.imageInfos[i % atlas.imageInfos.length];
        textureCoords[i * 4 + 0] = info.uvs.xStart;
        textureCoords[i * 4 + 1] = info.uvs.xEnd;
        textureCoords[i * 4 + 2] = info.uvs.yStart;
        textureCoords[i * 4 + 3] = info.uvs.yEnd;
        indices[i] = i;
      }

      geometry.setAttribute('aTextureCoords', new THREE.InstancedBufferAttribute(textureCoords, 4));
      geometry.setAttribute('aIndex', new THREE.InstancedBufferAttribute(indices, 1));

      scene.add(instancedMesh);
      magazineRef.current = { instancedMesh, material };

      setLoading(false);

      // --- ANIMATION ---
      const tl = gsap.timeline();
      tl.to(material.uniforms.uProgress, {
        value: 1,
        duration: 4,
        ease: 'power2.inOut',
      });
      tl.to(material.uniforms.uSplitProgress, {
        value: 1,
        duration: 1,
        ease: 'power2.inOut',
      }, '-=0.6');
      
      // Auto-exit after animation or on click
      tl.add(() => {
        // Optional: wait a bit before finishing
        setTimeout(() => {
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 1,
            onComplete: onComplete
          });
        }, 1500);
      });
    };

    initMagazine();

    // --- RENDER LOOP ---
    let rafId;
    const render = () => {
      if (magazineRef.current) {
        const { material } = magazineRef.current;
        // Basic scroll simulation if needed
        material.uniforms.uScrollY.value += (scrollRef.current.target - material.uniforms.uScrollY.value) * 0.1;
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(render);
    };
    render();

    // --- RESIZE ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [onComplete]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#020617',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
      onClick={() => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.8,
          onComplete: onComplete
        });
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      {loading && (
        <div style={{ position: 'absolute', color: 'white', fontFamily: 'monospace', fontSize: '14px' }}>
          Loading Portfolio...
        </div>
      )}
    </div>
  );
};

export default MagazineIntro;
