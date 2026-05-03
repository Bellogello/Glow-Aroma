import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, ContactShadows, PerspectiveCamera } from '@react-three/drei';

// 1. Add 'scale' as a prop to the Model function
function Model({ url, layers, waxColor, cupColor, flatShading, scale }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();
  
  const activeLayers = useMemo(() => {
    if (!layers) return [];
    return typeof layers === 'string' ? JSON.parse(layers) : layers;
  }, [layers]);

  const primaryColor = waxColor || activeLayers[0] || '#ffffff';

  useEffect(() => {
    if (!scene) return;

    const waxMeshes = [];
    scene.traverse((child) => {
      if (child.isMesh && !child.name.toLowerCase().includes('wick')) {
        waxMeshes.push(child);
      }
    });

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.flatShading = !!flatShading;

        const name = child.name.toLowerCase();
        if (name.includes('wick')) return;

        const isGlass = name.includes('glass') || name.includes('cup') || name.includes('jar') || name.includes('cylinder_0');
        if (isGlass) {
          child.material.transparent = true;
          child.material.opacity = 0.45;
          child.material.roughness = 0.05;
          child.material.metalness = 0.1;
          child.material.color.set(cupColor && cupColor !== 'default' ? cupColor : '#ffffff');
        } else if (activeLayers.length > 1) {
          const index = waxMeshes.indexOf(child);
          const color = activeLayers[index] || activeLayers[0] || primaryColor;
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.color.set(color);
          child.material.roughness = 0.2;
        } else {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.color.set(primaryColor);
          child.material.roughness = 0.2;
        }
        child.material.needsUpdate = true;
      }
    });
  }, [scene, activeLayers, primaryColor, cupColor, flatShading]);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.003;
    }
  });

  // 2. Apply the dynamic scale here, and shift it slightly down (y: -0.5) to center it better
  return <primitive ref={modelRef} object={scene} scale={scale} position={[0, -0.5, 0]} />;
}

const MiniCandleViewer = ({ modelUrl, modelUrls, waxColor, layers, cupColor, flatShading }) => {
  const activeUrl = modelUrls ? modelUrls[0] : modelUrl;
  
  // 3. Create a state to detect mobile screens
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  if (!activeUrl) return null;

  return (
    <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }}>
        
        {/* 4. Pulled the camera back slightly (z: 5 instead of 4) for extra breathing room */}
        <PerspectiveCamera 
          makeDefault 
          position={[0, 6, 5]} 
          fov={45} 
          onUpdate={c => c.lookAt(0, 1, 0)} 
        />

        <ambientLight color="#fff5e0" intensity={0.4} />
        <directionalLight color="#ffffff" intensity={1.5} position={[5, 10, 5]} />
        <directionalLight color="#ffeedd" intensity={0.5} position={[-5, 5, -5]} />
        
        <Suspense fallback={null}>
          <Model 
            url={activeUrl} 
            layers={layers} 
            waxColor={waxColor} 
            cupColor={cupColor} 
            flatShading={flatShading}
            scale={isMobile ? 0.55 : 0.9} /* 5. Shrink it aggressively on mobile! */
          />
          {/* Shrunk the shadow scale to match the smaller candle */}
          <ContactShadows position={[0, -0.5, 0]} opacity={0.3} scale={isMobile ? 6 : 10} blur={2.5} far={1.5} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default MiniCandleViewer;