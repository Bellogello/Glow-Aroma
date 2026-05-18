import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

// ── Color helpers ─────────────────────────────────────────────────────────────
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

const isDefaultColor = (col) =>
  !col || col === 'default' || col === 'rgba(255,255,255,0.45)' || col === 'rgba(255, 255, 255, 0.45)';

// ── Apply cup color to a mesh ─────────────────────────────────────────────────
const applyCupColor = (mesh, cupColor) => {
  if (isDefaultColor(cupColor)) {
    mesh.material.color.set(0xffffff);
    mesh.material.opacity = 1.0;
    mesh.material.transparent = false;
    mesh.material.depthWrite = true;
    if (mesh.material.transmission !== undefined) mesh.material.transmission = 0.0;
  } else {
    const op = getOpacity(cupColor);
    mesh.material.color.copy(getThreeColor(cupColor));
    mesh.material.opacity = op;
    const isTransparent = op < 0.99;
    mesh.material.transparent = isTransparent;
    mesh.material.depthWrite = !isTransparent;
    if (mesh.material.transmission !== undefined) {
      mesh.material.transmission = isTransparent ? 1.0 : 0.0;
    }
  }
  mesh.material.needsUpdate = true;
};

// ── Flat shading helper ───────────────────────────────────────────────────────
const applyFlatShading = (mesh, enabled) => {
  if (enabled) {
    mesh.geometry = mesh.geometry.toNonIndexed();
    const pos = mesh.geometry.attributes.position;
    const normals = new Float32Array(pos.count * 3);
    const vA = new THREE.Vector3(); const vB = new THREE.Vector3(); const vC = new THREE.Vector3();
    const cb = new THREE.Vector3(); const ab = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      vA.fromBufferAttribute(pos, i); vB.fromBufferAttribute(pos, i + 1); vC.fromBufferAttribute(pos, i + 2);
      cb.subVectors(vC, vB); ab.subVectors(vA, vB); cb.cross(ab).normalize();
      normals.set([cb.x, cb.y, cb.z], i * 3); normals.set([cb.x, cb.y, cb.z], (i + 1) * 3); normals.set([cb.x, cb.y, cb.z], (i + 2) * 3);
    }
    mesh.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  }
  mesh.material.flatShading = !!enabled;
  mesh.material.needsUpdate = true;
};

const disposeGroup = (group) => {
  if (!group) return;
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
    else child.material?.dispose();
  });
};

// ── Component ─────────────────────────────────────────────────────────────────
const CandlePreview3D = forwardRef(({ 
  candleType = 'cup', // 👈 Receives the isolation mode from Create.jsx
  cupColor, 
  waxColor, 
  layerColors = [], 
  cupSize, 
  modelUrl, 
  colorableParts, 
  flatShading 
}, ref) => {
  const canvasRef    = useRef(null);
  const meshesRef    = useRef({ cup: [], wax: [], wick: [], moldLayers: [] });
  const rendererRef  = useRef(null);
  const sceneRef     = useRef(null);
  const cameraRef    = useRef(null);
  const controlsRef  = useRef(null);
  const frameRef     = useRef(null);
  const loadedGroupRef = useRef(null);

  const propsRef = useRef({ candleType, cupColor, waxColor, layerColors, flatShading });
  useEffect(() => { propsRef.current = { candleType, cupColor, waxColor, layerColors, flatShading }; });

  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      const renderer = rendererRef.current; const scene = sceneRef.current; const canvas = canvasRef.current; const mainCamera = cameraRef.current;
      if (!renderer || !scene || !canvas || !mainCamera) return null;
      const isMobile = window.innerWidth < 768;
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

  useEffect(() => {
    const canvas = canvasRef.current; const isMobile = window.innerWidth < 768; const size = isMobile ? 280 : 400;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#fdf6f0'); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(0, 6, 4); cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(size, size); renderer.setPixelRatio(window.devicePixelRatio); renderer.shadowMap.enabled = !isMobile; rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xfff5e0, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(5, 10, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffeedd, 0.5); fill.position.set(-5, 5, -5); scene.add(fill);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.enablePan = false; controls.enableZoom = false; controls.minPolarAngle = Math.PI / 6; controls.maxPolarAngle = Math.PI / 2.5; controls.target.set(0, 1, 0); controls.update(); controlsRef.current = controls;

    const animate = () => { frameRef.current = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    return () => { cancelAnimationFrame(frameRef.current); disposeGroup(loadedGroupRef.current); renderer.dispose(); };
  }, []); 

  // ── Model load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelUrl || !sceneRef.current) return;
    const scene = sceneRef.current; const isMobile = window.innerWidth < 768;

    if (loadedGroupRef.current) {
      scene.remove(loadedGroupRef.current); disposeGroup(loadedGroupRef.current); loadedGroupRef.current = null;
    }

    meshesRef.current = { cup: [], wax: [], wick: [], moldLayers: [] };
    const finalUrl = modelUrl.startsWith('http') ? modelUrl : `${API_BASE_URL}${modelUrl}`;
    let cancelled = false;

    const loader = new GLTFLoader();
    loader.load(finalUrl, (gltf) => {
      if (cancelled) return; 

      const group = gltf.scene;
      loadedGroupRef.current = group;
      scene.add(group);

      const { candleType: ct, cupColor: cc, waxColor: wc, layerColors: lc, flatShading: fs } = propsRef.current;
      const meshes = { cup: [], wax: [], wick: [], moldLayers: [] };

      let allowedParts = [];
      try {
        allowedParts = Array.isArray(colorableParts) ? colorableParts : (typeof colorableParts === 'string' ? JSON.parse(colorableParts) : []);
      } catch (e) { allowedParts = []; }

      group.traverse((obj) => {
        if (!obj.isMesh) return;

        obj.castShadow = !isMobile;
        obj.material = obj.material.clone();
        applyFlatShading(obj, !!fs);

        const exactName  = obj.name || '';
        const parentName = obj.parent?.name || '';
        const lowerName  = exactName.toLowerCase();
        const lowerPName = parentName.toLowerCase();

        // 🟥 IF BUILDING A MOLD CANDLE (Strict Mold Logic)
        if (ct === 'mold') {
          let layerIndex = allowedParts.indexOf(exactName);
          if (layerIndex === -1 && parentName) layerIndex = allowedParts.indexOf(parentName);

          if (layerIndex !== -1) {
            console.log('✅ MOLD LAYER:', exactName || parentName);
            if (!meshes.moldLayers[layerIndex]) meshes.moldLayers[layerIndex] = [];
            meshes.moldLayers[layerIndex].push(obj);

            if (lc[layerIndex]) {
              obj.material.color.copy(getThreeColor(lc[layerIndex]));
              obj.material.needsUpdate = true;
            }
          } else {
             // DB Failsafe: If a mold part is missing from the DB layers, group it to Layer 1 so it isn't uncolorable
             if (!meshes.moldLayers[0]) meshes.moldLayers[0] = [];
             meshes.moldLayers[0].push(obj);
          }
          return; // STOP! Never run cup logic on a mold candle.
        }

        // 🟦 IF BUILDING A CUP CANDLE (Strict Cup Logic)
        // (This completely bypasses the DB error because it ignores colorableParts!)
        const isWax = lowerName.includes('cylinder001_1') || lowerName.includes('sphere') || lowerName.includes('wax') ||
                      lowerPName.includes('cylinder001_1') || lowerPName.includes('sphere') || lowerPName.includes('wax');

        if (isWax) {
          console.log('✅ WAX:', exactName || parentName);
          obj.material.color.copy(getThreeColor(wc, '#fdf6f0'));
          obj.material.needsUpdate = true;
          meshes.wax.push(obj);
          return;
        }

        const isWick = lowerName.includes('cylinder002_2') || lowerName.includes('wick') ||
                       lowerPName.includes('cylinder002_2')|| lowerPName.includes('wick');

        if (isWick) {
          console.log('✅ WICK:', exactName || parentName);
          meshes.wick.push(obj);
          return;
        }

        // IF IT ISN'T WAX AND ISN'T WICK, IT MUST BE THE CUP! 
        console.log('✅ CUP (Caught by Fallback):', exactName || parentName);
        meshes.cup.push(obj);
        applyCupColor(obj, cc);
      });

      meshesRef.current = meshes;

      if (ct === 'cup') {
        meshes.cup.forEach(mesh => applyCupColor(mesh, cc));
        meshes.wax.forEach(mesh => { mesh.material.color.copy(getThreeColor(wc, '#fdf6f0')); mesh.material.needsUpdate = true; });
      } else {
        meshes.moldLayers.forEach((layerGroup, index) => {
          if (layerGroup && lc[index]) { layerGroup.forEach(mesh => { mesh.material.color.copy(getThreeColor(lc[index])); mesh.material.needsUpdate = true; }); }
        });
      }
    });

    return () => { cancelled = true; };
  }, [modelUrl, colorableParts, flatShading, candleType]); // 👈 Now re-runs if you toggle the type!

  // ── Reactive Color Updates ────────────────────────────────────────────────────
  useEffect(() => {
    if (candleType === 'mold') return; // Ignore if in Mold Mode
    meshesRef.current.cup.forEach(mesh => applyCupColor(mesh, cupColor));
  }, [cupColor, candleType]);

  useEffect(() => {
    if (candleType === 'mold') return; // Ignore if in Mold Mode
    const c = getThreeColor(waxColor, '#fdf6f0');
    meshesRef.current.wax.forEach(mesh => {
      mesh.material.color.copy(c);
      mesh.material.needsUpdate = true;
    });
  }, [waxColor, candleType]);

  useEffect(() => {
    if (candleType === 'cup') return; // Ignore if in Cup Mode
    meshesRef.current.moldLayers.forEach((layerGroup, index) => {
      if (layerGroup && layerColors[index]) {
        layerGroup.forEach(mesh => {
          mesh.material.color.copy(getThreeColor(layerColors[index]));
          mesh.material.needsUpdate = true;
        });
      }
    });
  }, [layerColors, candleType]);

  useEffect(() => {
    const allMoldMeshes = meshesRef.current.moldLayers.reduce((acc, curr) => acc.concat(curr || []), []);
    const allMeshes = [...meshesRef.current.cup, ...meshesRef.current.wax, ...meshesRef.current.wick, ...allMoldMeshes];
    allMeshes.forEach(mesh => applyFlatShading(mesh, !!flatShading));
  }, [flatShading]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', borderRadius: '16px', cursor: 'grab', display: 'block' }} />
      {!modelUrl && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', background: '#fdf6f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#a08070', fontFamily: 'inherit' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 4L44 36H4L24 4Z" stroke="#c4a882" strokeWidth="2" fill="none"/>
            <circle cx="24" cy="38" r="6" stroke="#c4a882" strokeWidth="2" fill="none"/>
          </svg>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Choose a model to start</p>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.6 }}>Select a {candleType === 'cup' ? 'cup' : 'mold'} shape above</p>
        </div>
      )}
    </div>
  );
});

export default CandlePreview3D;