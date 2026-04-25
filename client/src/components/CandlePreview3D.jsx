import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

const CandlePreview3D = forwardRef(({ cupColor, waxColor, layerColors = [], cupSize, modelUrl, colorableParts, flatShading }, ref) => {
  const canvasRef = useRef(null);
  const meshesRef = useRef({ cup: [], wax: [], wick: [], moldLayers: [] });
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null); 

useImperativeHandle(ref, () => ({
  getSnapshot: () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    const mainCamera = cameraRef.current;

    if (!renderer || !scene || !canvas || !mainCamera) return null;

    const isMobile = window.innerWidth < 768;

    // 1. High-Res Camera (Square Aspect Ratio)
    const photoCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const dist = isMobile ? 6.2 : 4.6;
    const height = 5.5; 
    photoCamera.position.set(dist, height, dist); 
    photoCamera.lookAt(0, 1.0, 0); 

    // 2. THE SECRET FOR HIGH-RES:
    // We manually trigger a high-resolution render before capturing.
    // This forces Three.js to use every single pixel available on the GPU.
    renderer.setPixelRatio(window.devicePixelRatio > 2 ? window.devicePixelRatio : 2);
    renderer.render(scene, photoCamera);
    
    // 3. CAPTURE AT 100% QUALITY (1.0)
    // Using PNG provides lossless quality, but if the file is too big for your DB,
    // use 'image/jpeg' with 1.0 quality instead.
    const data = canvas.toDataURL('image/png'); 

    // 4. RESET: Put the renderer back to normal for the UI
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.render(scene, mainCamera);
    
    return data;
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
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Needed for snapshots
      alpha: true
    });
    
    renderer.setSize(size, size);
    // Keep high resolution: Set pixel ratio to device (2x or 3x)
    renderer.setPixelRatio(window.devicePixelRatio);
    
    renderer.shadowMap.enabled = !isMobile;
    rendererRef.current = renderer;

    // Premium Lighting Setup
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

    let loadedGroup = null; 

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
        } catch (e) { allowedParts = []; }

        loadedGroup.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = !isMobile;
            const exactName = obj.name; 
            const lowerName = exactName.toLowerCase();
            const layerIndex = allowedParts.indexOf(exactName);

            if (layerIndex !== -1) {
              obj.material = obj.material.clone();
              obj.material.flatShading = !!flatShading;
              obj.material.needsUpdate = true;
              meshesRef.current.moldLayers[layerIndex] = obj;
              if (layerColors[layerIndex]) obj.material.color.set(layerColors[layerIndex]);
            } 
            else if (lowerName.includes('cylinder_0') || lowerName.endsWith('_0')) {
              const parsedColor = new THREE.Color(cupColor); 
              const opacity = cupColor.includes('rgba') ? parseFloat(cupColor.split(',')[3]) : 1.0;

              obj.material = new THREE.MeshPhysicalMaterial({
                color: parsedColor,
                metalness: 0.1,
                roughness: 0.05,
                transmission: opacity < 1 ? 1.0 : 0.0, 
                opacity: opacity,                      
                transparent: true,
                ior: 1.52,
                thickness: 0.5,
                flatShading: !!flatShading, 
                depthWrite: false
              });
              meshesRef.current.cup.push(obj);
            }
            else if (lowerName.includes('cylinder001_1') || lowerName.endsWith('_1') || lowerName.includes('sphere') || lowerName.includes('wax')) {
              obj.material = obj.material.clone();
              obj.material.flatShading = !!flatShading;
              meshesRef.current.wax.push(obj);
              if (waxColor) obj.material.color.set(waxColor);
            }
            else if (lowerName.includes('cylinder002_2') || lowerName.includes('wick')) {
              obj.material = obj.material.clone();
              meshesRef.current.wick.push(obj);
            }
          }
        });
      }
    );

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (loadedGroup) {
        loadedGroup.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          }
        });
      }
      renderer.dispose();
    };
  }, [modelUrl, colorableParts, flatShading]);

  useEffect(() => {
    meshesRef.current.cup.forEach(mesh => {
      if (cupColor) {
        mesh.material.color.set(new THREE.Color(cupColor));
        const opacity = cupColor.includes('rgba') ? parseFloat(cupColor.split(',')[3]) : 1.0;
        mesh.material.opacity = opacity;
        mesh.material.transmission = opacity < 1 ? 1.0 : 0.0;
        mesh.material.transparent = true;
        mesh.material.needsUpdate = true;
      }
    });
  }, [cupColor]);

  useEffect(() => {
    meshesRef.current.wax.forEach(mesh => {
        if (waxColor) mesh.material.color.set(waxColor);
    });
  }, [waxColor]);

  useEffect(() => {
    meshesRef.current.moldLayers.forEach((mesh, index) => {
      if (mesh && layerColors[index]) mesh.material.color.set(layerColors[index]);
    });
  }, [layerColors]);

  useEffect(() => {
    const scales = { small: 0.75, medium: 1.0, large: 1.3 };
    const s = scales[cupSize] || 1.0;
    Object.values(meshesRef.current).flat().forEach((node) => {
      if (node) node.scale.set(s, s, s);
    });
  }, [cupSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        cursor: 'grab',
      }}
    />
  );
});

export default CandlePreview3D;