import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

// 1. ADDED: layerColors and colorableParts to props
const CandlePreview3D = forwardRef(({ cupColor, waxColor, layerColors = [], cupSize, modelUrl, colorableParts }, ref) => {
  const canvasRef = useRef(null);
  
  // 2. ADDED: moldLayers to store the specific mapped parts
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
      antialias: !isMobile,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
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

    const finalModelUrl = modelUrl
      ? (modelUrl.startsWith('http') ? modelUrl : `${API_BASE_URL}${modelUrl}`)
      : '/candle.glb';

    const loader = new GLTFLoader();
    loader.load(
      finalModelUrl,
      (gltf) => {
        // Clear old models if switching
        scene.children = scene.children.filter(c => c.type !== 'Group');
        scene.add(gltf.scene);

        // Reset references
        meshesRef.current = { cup: [], wax: [], wick: [], moldLayers: [] };

        // 3. Parse the colorableParts list from the database
        let allowedParts = [];
        try {
          allowedParts = Array.isArray(colorableParts) 
            ? colorableParts 
            : (typeof colorableParts === 'string' ? JSON.parse(colorableParts) : []);
        } catch (e) {
          allowedParts = [];
        }
        // DEBUGGING: Check what the 3D file actually contains
        console.log("--- 3D MODEL DATA ---", {
          allowedPartsFromDB: allowedParts,
          receivedLayerColors: layerColors
        });
        
        console.log("--- MESHES INSIDE GLB FILE ---");
        gltf.scene.traverse((obj) => {
          if (obj.isMesh) {
            console.log(`Mesh Name: "${obj.name}"`);
          }
        });
        gltf.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.material = obj.material.clone();
            obj.castShadow = !isMobile;
            
            const exactName = obj.name; // Keep exact case for array matching
            const lowerName = exactName.toLowerCase();

            // 4. MULTI-LAYER MOLD LOGIC
            const layerIndex = allowedParts.indexOf(exactName);

            if (layerIndex !== -1) {
              // It's a mapped layer! Save it exactly at the index it matches
              meshesRef.current.moldLayers[layerIndex] = obj;
              if (layerColors[layerIndex]) {
                obj.material.color.set(layerColors[layerIndex]);
              }
            } 
            // 5. REGULAR CUP LOGIC (Your exact fallbacks)
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
      if (time - lastTime < 32) return;
      lastTime = time;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  // Add colorableParts to dependency array so it re-renders if the map changes
  }, [modelUrl, colorableParts]); 

  // COLOR UPDATES FOR CUP
  useEffect(() => {
    meshesRef.current.cup.forEach(mesh => {
        if (cupColor) mesh.material.color.set(cupColor);
    });
  }, [cupColor]);

  // COLOR UPDATES FOR WAX 
  useEffect(() => {
    meshesRef.current.wax.forEach(mesh => {
        if (waxColor) mesh.material.color.set(waxColor);
    });
  }, [waxColor]);

  // 6. ADDED: LIVE COLOR UPDATES FOR MOLD LAYERS
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
    // Object.values().flat() automatically handles the new moldLayers array too!
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