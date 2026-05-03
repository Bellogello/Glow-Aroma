import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls, PerspectiveCamera } from '@react-three/drei';

function Model({ url, waxColor }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.005;
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          // If the mesh name includes 'wax' or 'liquid', apply your color
          if (child.name.toLowerCase().includes('wax')) {
             child.material.color.set(waxColor);
          }
        }
      });
    }
  });

  return <primitive ref={modelRef} object={scene} scale={1.5} />;
}

const MiniCandleViewer = ({ modelUrls, brandColors }) => {
  const [index, setIndex] = useState(0);
  const [currentColor, setCurrentColor] = useState('#4a3728');

  useEffect(() => {
    if (modelUrls.length === 0) return;

    // Longer duration: 10 seconds per model
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % modelUrls.length);
      
      if (brandColors?.length > 0) {
        const randomColor = brandColors[Math.floor(Math.random() * brandColors.length)].hex_code;
        setCurrentColor(randomColor);
      }
    }, 10000); 

    return () => clearInterval(interval);
  }, [modelUrls, brandColors]);

  return (
    <div style={{ width: '100%', height: '260px' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1, 5], fov: 35 }}>
        {/* Fixed Studio Lighting & Camera */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        <Suspense fallback={null}>
          <PresentationControls
            global
            config={{ mass: 1, tension: 200 }}
            rotation={[0, 0.2, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
          >
            <Stage environment="city" intensity={0.5} contactShadow={false}>
              {/* Using the URL as a key forces a clean fade-in on swap */}
              <Model 
                key={modelUrls[index]} 
                url={modelUrls[index]} 
                color={currentColor} 
              />
            </Stage>
          </PresentationControls>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default MiniCandleViewer;