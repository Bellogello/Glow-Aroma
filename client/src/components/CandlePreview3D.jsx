import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const CandlePreview3D = ({ cupColor, waxColor, cupSize }) => {
  const canvasRef = useRef(null);
  const meshesRef = useRef({});
  const rendererRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const isMobile = window.innerWidth < 768;
    const size = isMobile ? 280 : 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#fdf6f0');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 6, 4);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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

    const loader = new GLTFLoader();
    loader.load(
      '/candle.glb',
      (gltf) => {
        scene.add(gltf.scene);

        gltf.scene.traverse((obj) => {
          if (obj.isMesh) {
            obj.material = obj.material.clone();
            obj.castShadow = !isMobile;
          }
        });

        const cup  = gltf.scene.getObjectByName('Cylinder_0');
        const wax  = gltf.scene.getObjectByName('Cylinder001_1');
        const wick = gltf.scene.getObjectByName('Cylinder002_2');

        if (cup)  meshesRef.current['cup']  = cup;
        if (wax)  meshesRef.current['wax']  = wax;
        if (wick) meshesRef.current['wick'] = wick;

        if (cup) {
          cup.traverse((child) => {
            if (child.isMesh) {
              child.material.transparent = true;
              child.material.opacity = 0.4;
            }
          });
        }

        // Apply colors if already selected before model loaded
        if (cupColor && meshesRef.current['cup']) {
          meshesRef.current['cup'].traverse((child) => {
            if (child.isMesh) child.material.color.set(cupColor);
          });
        }
        if (waxColor && meshesRef.current['wax']) {
          meshesRef.current['wax'].traverse((child) => {
            if (child.isMesh) child.material.color.set(waxColor);
          });
        }
      },
      undefined,
      (err) => console.error('Failed to load model:', err)
    );

    let frameId;
    let lastTime = 0;
    const animate = (time) => {
      frameId = requestAnimationFrame(animate);
      if (time - lastTime < 32) return; // cap at ~30fps
      lastTime = time;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, []);

  // Cup color changes
  useEffect(() => {
    const node = meshesRef.current['cup'];
    if (node && cupColor) {
      node.traverse((child) => {
        if (child.isMesh) child.material.color.set(cupColor);
      });
    }
  }, [cupColor]);

  // Wax color changes
  useEffect(() => {
    const node = meshesRef.current['wax'];
    if (node && waxColor) {
      node.traverse((child) => {
        if (child.isMesh) child.material.color.set(waxColor);
      });
    }
  }, [waxColor]);

  // Cup size changes
  useEffect(() => {
    const scales = { small: 0.75, medium: 1.0, large: 1.3 };
    const s = scales[cupSize] || 1.0;
    ['cup', 'wax', 'wick'].forEach((key) => {
      const node = meshesRef.current[key];
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
};

export default CandlePreview3D;