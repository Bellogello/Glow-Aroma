import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

const CandlePreview3D = forwardRef(({ cupColor, waxColor, layerColors = [], cupSize, modelUrl, colorableParts }, ref) => {
  const canvasRef = useRef(null);
  const meshesRef = useRef({ cup: [], wax: [], wick: [], moldLayers: [] });
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      if (!canvas || !renderer || !scene) return null;

      const tempCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      tempCamera.position.set(0, 6, 4);
      tempCamera.lookAt(0, 1, 0);

      renderer.render(scene, tempCamera);
      return canvas.toDataURL('image/png');
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const isMobile = window.innerWidth < 768;
    const size = isMobile ? 280 : 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#fdf6f0');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 6, 4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile, // Keeps antialiasing off for mobile (great for performance)
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size);
    
    // --- PERF FIX 1: Cap Pixel Ratio on Mobile ---
    // Phones have massive pixel densities. Rendering 3D at 3x ratio cooks the GPU.
    renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2.5));
    
    renderer.shadowMap.enabled = !isMobile;
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xfff5e0, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(5, 10, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffeedd, 0.5);
    fill.position.set(-5, 5, -5);
    scene.add(fill);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.5;
    controls.target.set(0, 1, 0);
    controls.update();

    let loadedGroup = null; // Keep track of the loaded model for memory cleanup

    const finalModelUrl = modelUrl
      ? (modelUrl.startsWith('http') ? modelUrl : `${API_BASE_URL}${modelUrl}`)
      : '/candle.glb';

    const loader = new GLTFLoader();
    loader.load(
      finalModelUrl,
      (gltf) => {
        scene.children = scene.children.filter(c => c.type !== 'Group');
        
        loadedGroup = gltf.scene;
        scene.add(loadedGroup);

        meshesRef.current = { cup: [], wax: [], wick: [], moldLayers: [] };

        let allowedParts = [];
        try {
          allowedParts = Array.isArray(colorableParts) 
            ? colorableParts 
            : (typeof colorableParts === 'string' ? JSON.parse(colorableParts) : []);
        } catch (e) {
          allowedParts = [];
        }

        loadedGroup.traverse((obj) => {
          if (obj.isMesh) {
            obj.material = obj.material.clone();
            obj.castShadow = !isMobile;
            
            const exactName = obj.name; 
            const lowerName = exactName.toLowerCase();

            const layerIndex = allowedParts.indexOf(exactName);

            if (layerIndex !== -1) {
              meshesRef.current.moldLayers[layerIndex] = obj;
              if (layerColors[layerIndex]) {
                obj.material.color.set(layerColors[layerIndex]);
              }
            } 
            else if (lowerName.includes('cylinder_0') || lowerName.endsWith('_0')) {
              obj.material.transparent = true;
              obj.material.opacity = 0.4;
              meshesRef.current.cup.push(obj);
              if (cupColor) obj.material.color.set(cupColor);
            } 
            else if (lowerName.includes('cylinder001_1') || lowerName.endsWith('_1') || lowerName.includes('sphere') || lowerName.includes('wax')) {
              meshesRef.current.wax.push(obj);
              if (waxColor) obj.material.color.set(waxColor);
            }
            else if (lowerName.includes('cylinder002_2') || lowerName.includes('wick')) {
              meshesRef.current.wick.push(obj);
            }
          }
        });
      },
      undefined,
      (err) => console.error('Failed to load 3D model:', err)
    );

    let frameId;
    let lastTime = 0;
    const animate = (time) => {
      frameId = requestAnimationFrame(animate);
      
      // --- PERF FIX 2: 30FPS Throttle on Mobile ---
      // Halves the CPU/GPU workload so the phone doesn't heat up or lag.
      if (isMobile && time - lastTime < 33) return;
      lastTime = time;
      
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      
      // --- PERF FIX 3: Deep VRAM Memory Cleanup ---
      // Prevents iOS Safari and Android Chrome from crashing after switching models.
      if (loadedGroup) {
        loadedGroup.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
      renderer.dispose();
    };
  }, [modelUrl, colorableParts]); 

  useEffect(() => {
    meshesRef.current.cup.forEach(mesh => {
        if (cupColor) mesh.material.color.set(cupColor);
    });
  }, [cupColor]);

  useEffect(() => {
    meshesRef.current.wax.forEach(mesh => {
        if (waxColor) mesh.material.color.set(waxColor);
    });
  }, [waxColor]);

  useEffect(() => {
    meshesRef.current.moldLayers.forEach((mesh, index) => {
      if (mesh && layerColors[index]) {
        mesh.material.color.set(layerColors[index]);
      }
    });
  }, [layerColors]);

  useEffect(() => {
    const scales = { small: 0.75, medium: 1.0, large: 1.3 };
    const s = scales[cupSize] || 1.0;
    Object.values(meshesRef.current).flat().forEach((node) => {
      if (node) node.scale.set(s, s, s);
    });
  }, [cupSize]);

  const isMobile = window.innerWidth < 768;
  const canvasSize = isMobile ? '280px' : '400px';

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: canvasSize,
        height: canvasSize,
        borderRadius: '16px',
        cursor: 'grab',
      }}
    />
  );
});

export default CandlePreview3D;