import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const CandlePreview3D = forwardRef(({ cupColor, waxColor, cupSize, modelUrl }, ref) => {
  const canvasRef = useRef(null);
  const meshesRef = useRef({});
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
      ? (modelUrl.startsWith('http') ? modelUrl : `http://localhost:5000${modelUrl}`)
      : '/candle.glb';

    const loader = new GLTFLoader();
    loader.load(
      finalModelUrl,
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

  useEffect(() => {
    const node = meshesRef.current['cup'];
    if (node && cupColor) {
      node.traverse((child) => {
        if (child.isMesh) child.material.color.set(cupColor);
      });
    }
  }, [cupColor]);

  useEffect(() => {
    const node = meshesRef.current['wax'];
    if (node && waxColor) {
      node.traverse((child) => {
        if (child.isMesh) child.material.color.set(waxColor);
      });
    }
  }, [waxColor]);

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
});

export default CandlePreview3D;