import React, { Suspense, useMemo, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, ContactShadows, PerspectiveCamera } from '@react-three/drei';

function Model({ url, layers, waxColor, cupColor, flatShading }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();
  
  const activeLayers = useMemo(() => {
    if (!layers) return [];
    return typeof layers === 'string' ? JSON.parse(layers) : layers;
  }, [layers]);

  const primaryColor = waxColor || activeLayers[0] || '#ffffff';

useEffect(() => {
  if (!scene) return;

  // Collect all wax meshes in order (excluding wick)
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

      // Skip wick
      if (name.includes('wick')) return;

      // Glass/Cup detection
      const isGlass = name.includes('glass') || name.includes('cup') || name.includes('jar') || name.includes('cylinder_0');
      if (isGlass) {
        child.material.transparent = true;
        child.material.opacity = 0.45;
        child.material.roughness = 0.05;
        child.material.metalness = 0.1;
        child.material.color.set(cupColor && cupColor !== 'default' ? cupColor : '#ffffff');
      } else if (activeLayers.length > 1) {
        // Multi-layer mold — assign color by position in waxMeshes array
        const index = waxMeshes.indexOf(child);
        const color = activeLayers[index] || activeLayers[0] || primaryColor;
        child.material.transparent = false;
        child.material.opacity = 1.0;
        child.material.color.set(color);
        child.material.roughness = 0.2;
      } else {
        // Single color (cup wax or single-layer mold)
        child.material.transparent = false;
        child.material.opacity = 1.0;
        child.material.color.set(primaryColor);
        child.material.roughness = 0.2;
      }

      child.material.needsUpdate = true;
    }
  });
}, [scene, activeLayers, primaryColor, cupColor, flatShading]);

  // Rotates automatically
  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.003;
    }
  });

  return <primitive ref={modelRef} object={scene} scale={1} position={[0, 0, 0]} />;
}

const MiniCandleViewer = ({ modelUrl, modelUrls, waxColor, layers, cupColor, flatShading }) => {
  const activeUrl = modelUrls ? modelUrls[0] : modelUrl;
  
  if (!activeUrl) return null;

  return (
    <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas shadows gl={{ preserveDrawingBuffer: true, antialias: true }}>
        
        <PerspectiveCamera 
          makeDefault 
          position={[0, 6, 4]} 
          fov={45} 
          onUpdate={c => c.lookAt(0, 1, 0)} 
        />

        <ambientLight color="#fff5e0" intensity={1.5} />
        <directionalLight color="#ffffff" intensity={2} position={[5, 10, 5]} />
        <directionalLight color="#ffeedd" intensity={0.5} position={[-5, 5, -5]} />
        
        <Suspense fallback={null}>
          <Model 
            url={activeUrl} 
            layers={layers} 
            waxColor={waxColor} 
            cupColor={cupColor} 
            flatShading={flatShading}
          />
          <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={10} blur={2.5} far={1.5} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default MiniCandleViewer;