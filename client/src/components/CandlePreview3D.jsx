import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

// ── Color helpers ─────────────────────────────────────────────────────────────
// Converts any color format (hex, rgba string, object) to a THREE.Color safely.
const getThreeColor = (col, fallback = '#ffffff') => {
  if (!col) return new THREE.Color(fallback);
  let val = col;
  if (typeof col === 'object') {
    val = col.hex_code || col.hex || col.rgba || col.value || fallback;
  }
  if (typeof val === 'string' && val.startsWith('rgba')) {
    const parts = val.replace('rgba(', '').replace(')', '').split(',');
    return new THREE.Color(`rgb(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()})`);
  }
  try { return new THREE.Color(val); }
  catch (e) { return new THREE.Color(fallback); }
};

// Extracts opacity from an rgba string. Returns 1.0 for everything else.
const getOpacity = (col) => {
  if (!col) return 1.0;
  let val = col;
  if (typeof col === 'object') {
    val = col.rgba || col.hex_code || col.hex || col.value || '';
  }
  if (typeof val === 'string' && val.startsWith('rgba')) {
    const parts = val.replace('rgba(', '').replace(')', '').split(',');
    return parts[3] ? parseFloat(parts[3]) : 1.0;
  }
  return 1.0;
};

// Returns true when no real color has been chosen yet (default / placeholder values).
const isDefaultColor = (col) =>
  !col ||
  col === 'default' ||
  col === 'rgba(255,255,255,0.45)' ||
  col === 'rgba(255, 255, 255, 0.45)';

// ── Component ─────────────────────────────────────────────────────────────────
const CandlePreview3D = forwardRef(({ cupColor, waxColor, layerColors = [], cupSize, modelUrl, colorableParts, flatShading }, ref) => {
  const canvasRef   = useRef(null);
  const meshesRef   = useRef({ cup: [], wax: [], wick: [], moldLayers: [] });
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);

  // ── Snapshot API ────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      const renderer   = rendererRef.current;
      const scene      = sceneRef.current;
      const canvas     = canvasRef.current;
      const mainCamera = cameraRef.current;
      if (!renderer || !scene || !canvas || !mainCamera) return null;

      const isMobile  = window.innerWidth < 768;
      const photoCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      const dist = isMobile ? 6.2 : 4.6;
      photoCamera.position.set(dist, 5.5, dist);
      photoCamera.lookAt(0, 1.0, 0);

      renderer.setPixelRatio(window.devicePixelRatio > 2 ? window.devicePixelRatio : 2);
      renderer.render(scene, photoCamera);
      const data = canvas.toDataURL('image/png');
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.render(scene, mainCamera);
      return data;
    }
  }));

  // ── Scene setup + model load ────────────────────────────────────────────────
  useEffect(() => {
    if (!modelUrl) return;

    const canvas   = canvasRef.current;
    const isMobile = window.innerWidth < 768;
    const size     = isMobile ? 280 : 400;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#fdf6f0');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 6, 4);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = !isMobile;
    rendererRef.current = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xfff5e0, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2);
    key.position.set(5, 10, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffeedd, 0.5);
    fill.position.set(-5, 5, -5);
    scene.add(fill);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan    = false;
    controls.enableZoom   = false;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.5;
    controls.target.set(0, 1, 0);
    controls.update();

    // Model
    let loadedGroup = null;
    const finalUrl  = modelUrl.startsWith('http') ? modelUrl : `${API_BASE_URL}${modelUrl}`;

    const loader = new GLTFLoader();
    loader.load(finalUrl, (gltf) => {
      scene.children = scene.children.filter(c => c.type !== 'Group');
      loadedGroup = gltf.scene;
      scene.add(loadedGroup);

      meshesRef.current = { cup: [], wax: [], wick: [], moldLayers: [] };

      // Parse colorable parts list
      let allowedParts = [];
      try {
        allowedParts = Array.isArray(colorableParts)
          ? colorableParts
          : (typeof colorableParts === 'string' ? JSON.parse(colorableParts) : []);
      } catch (e) { allowedParts = []; }

      loadedGroup.traverse((obj) => {
        if (!obj.isMesh) return;

        obj.castShadow = !isMobile;

        const exactName  = obj.name || '';
        const parentName = obj.parent?.name || '';
        const lowerName  = exactName.toLowerCase();
        const lowerPName = parentName.toLowerCase();

        // ── Always clone the original material first ────────────────────────
        // This is crucial — it preserves any baked textures from Blender.
        obj.material = obj.material.clone();
        obj.material.flatShading = !!flatShading;
        obj.material.side = THREE.DoubleSide;   // ← fixes transparency
        obj.material.transparent = false;        // ← forces opaque
        obj.material.opacity = 1.0;
        obj.material.depthWrite = true;
        obj.material.needsUpdate = true;

        // ── 1. Mold layer detection (by colorableParts name list) ───────────
        let layerIndex = allowedParts.indexOf(exactName);
        if (layerIndex === -1 && parentName) layerIndex = allowedParts.indexOf(parentName);

        if (layerIndex !== -1) {
          console.log('✅ MOLD LAYER:', exactName || parentName);
          meshesRef.current.moldLayers[layerIndex] = obj;
          if (layerColors[layerIndex]) {
            obj.material.color.copy(getThreeColor(layerColors[layerIndex]));
          }
          obj.material.needsUpdate = true;
          return; // Don't fall through to cup/wax/wick checks
        }

        // ── 2. Cup / glass detection ────────────────────────────────────────
        const isCup =
          lowerName.includes('cylinder_0') || lowerName.endsWith('_0') ||
          lowerName.includes('jar')        || lowerName.includes('glass') ||
          lowerPName.includes('cylinder_0')|| lowerPName.endsWith('_0') ||
          lowerPName.includes('jar')       || lowerPName.includes('glass');

        if (isCup) {
          console.log('✅ CUP:', exactName || parentName);
          meshesRef.current.cup.push(obj);

          if (isDefaultColor(cupColor)) {
            // ── No color chosen → show original baked texture as-is ─────────
            obj.material.transparent = true;
            obj.material.needsUpdate = true;
          } else {
            // ── Color chosen → tint the existing material (texture survives) ─
            const op = getOpacity(cupColor);
            obj.material.color.copy(getThreeColor(cupColor));
            obj.material.transparent = true;
            obj.material.opacity     = op;
            // Only enable transmission if the glass is see-through
            if (obj.material.transmission !== undefined) {
              obj.material.transmission = op < 1 ? 1.0 : 0.0;
            }
            obj.material.needsUpdate = true;
          }
          return;
        }

        // ── 3. Wax detection ────────────────────────────────────────────────
        const isWax =
          lowerName.includes('cylinder001_1') || lowerName.endsWith('_1') ||
          lowerName.includes('sphere')        || lowerName.includes('wax') ||
          lowerPName.includes('cylinder001_1')|| lowerPName.endsWith('_1') ||
          lowerPName.includes('sphere')       || lowerPName.includes('wax');

        if (isWax) {
          console.log('✅ WAX:', exactName || parentName);
          obj.material.color.copy(getThreeColor(waxColor, '#fdf6f0'));
          obj.material.needsUpdate = true;
          meshesRef.current.wax.push(obj);
          return;
        }

        // ── 4. Wick detection ───────────────────────────────────────────────
        const isWick =
          lowerName.includes('cylinder002_2') || lowerName.includes('wick') ||
          lowerPName.includes('cylinder002_2')|| lowerPName.includes('wick');

        if (isWick) {
          console.log('✅ WICK:', exactName || parentName);
          meshesRef.current.wick.push(obj);
          // Wick keeps its original material — no color change
          return;
        }
      });
    });

    // Render loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
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

  // ── Reactive: cup color changes ─────────────────────────────────────────────
  useEffect(() => {
    meshesRef.current.cup.forEach(mesh => {
      if (isDefaultColor(cupColor)) {
        // Reset to white tint (neutral) so the original texture shows through
        mesh.material.color.set(0xffffff);
        mesh.material.opacity     = 1.0;
        mesh.material.transparent = true;
        if (mesh.material.transmission !== undefined) mesh.material.transmission = 0.0;
      } else {
        const op = getOpacity(cupColor);
        mesh.material.color.copy(getThreeColor(cupColor));
        mesh.material.opacity     = op;
        mesh.material.transparent = true;
        if (mesh.material.transmission !== undefined) {
          mesh.material.transmission = op < 1 ? 1.0 : 0.0;
        }
      }
      mesh.material.needsUpdate = true;
    });
  }, [cupColor]);

  // ── Reactive: wax color changes ─────────────────────────────────────────────
  useEffect(() => {
    const c = getThreeColor(waxColor, '#fdf6f0');
    meshesRef.current.wax.forEach(mesh => {
      mesh.material.color.copy(c);
      mesh.material.needsUpdate = true;
    });
  }, [waxColor]);

  // ── Reactive: mold layer color changes ─────────────────────────────────────
  useEffect(() => {
    meshesRef.current.moldLayers.forEach((mesh, index) => {
      if (mesh && layerColors[index]) {
        mesh.material.color.copy(getThreeColor(layerColors[index]));
        mesh.material.needsUpdate = true;
      }
    });
  }, [layerColors]);

  // ── No model selected placeholder ──────────────────────────────────────────
  if (!modelUrl) {
    return (
      <div style={{
        width: '100%', height: '100%', borderRadius: '16px',
        background: '#fdf6f0', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#a08070',
        fontFamily: 'inherit',
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 4L44 36H4L24 4Z" stroke="#c4a882" strokeWidth="2" fill="none"/>
          <circle cx="24" cy="38" r="6" stroke="#c4a882" strokeWidth="2" fill="none"/>
        </svg>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Choose a model to start</p>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.6 }}>Select a cup shape above</p>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', borderRadius: '16px', cursor: 'grab' }}
    />
  );
});

export default CandlePreview3D;