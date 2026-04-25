import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

const CandlePreview3D = forwardRef(({ cupColor, waxColor, cupSize, modelUrl }, ref) => {
  const canvasRef = useRef(null);
  // Changed to store arrays to support models with multiple parts like your 3x3
  const meshesRef = useRef({ cup: [], wax: [], wick: [] });
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
        meshesRef.current = { cup: [], wax: [], wick: [] };

        gltf.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.material = obj.material.clone();
            obj.castShadow = !isMobile;
            
            const name = obj.name.toLowerCase();

            // --- COLOR PART LOGIC START ---
            // Identify Cup/Glass
            if (name.includes('cylinder_0') || name.endsWith('_0')) {
              obj.material.transparent = true;
              obj.material.opacity = 0.4;
              meshesRef.current.cup.push(obj);
              if (cupColor) obj.material.color.set(cupColor);
            } 
            // Identify Wax (Supports Cylinder001_1 and Sphere.001)
            else if (name.includes('cylinder001_1') || name.endsWith('_1') || name.includes('sphere')) {
              meshesRef.current.wax.push(obj);
              if (waxColor) obj.material.color.set(waxColor);
            }
            // Identify Wick
            else if (name.includes('cylinder002_2') || name.includes('wick')) {
              meshesRef.current.wick.push(obj);
            }
            // --- COLOR PART LOGIC END ---
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
  }, [modelUrl]);

  // COLOR UPDATES FOR CUP
  useEffect(() => {
    meshesRef.current.cup.forEach(mesh => {
        if (cupColor) mesh.material.color.set(cupColor);
    });
  }, [cupColor]);

  // COLOR UPDATES FOR WAX (Handles all spheres or cylinders)
  useEffect(() => {
    meshesRef.current.wax.forEach(mesh => {
        if (waxColor) mesh.material.color.set(waxColor);
    });
  }, [waxColor]);

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