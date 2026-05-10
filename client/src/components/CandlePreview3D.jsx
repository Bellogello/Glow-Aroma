import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { API_BASE_URL } from '../config';

// --- UNIVERSAL COLOR PARSERS ---
// This guarantees Three.js never crashes or ignores a color, whether it's Hex, RGB, RGBA, or an object.
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
  try {
    return new THREE.Color(val);
  } catch(e) {
    return new THREE.Color(fallback);
  }
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

      const photoCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      const dist = isMobile ? 6.2 : 4.6;
      const height = 5.5; 
      photoCamera.position.set(dist, height, dist); 
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
      if (!modelUrl) return;
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
      preserveDrawingBuffer: true,
      alpha: true
    });
    
    renderer.setSize(size, size);
    renderer.setPixelRatio(window.devicePixelRatio);
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
            
            const exactName = obj.name || '';
            const parentName = obj.parent?.name || '';
            
            const lowerName = exactName.toLowerCase();
            const lowerParentName = parentName.toLowerCase();

            let layerIndex = allowedParts.indexOf(exactName);
            if (layerIndex === -1 && parentName) {
              layerIndex = allowedParts.indexOf(parentName);
            }

            // 1. Clone the base material so we don't mutate shared GLTF data
            obj.material = obj.material.clone();
            obj.material.flatShading = !!flatShading;

            // 2. INDEPENDENT CHECK: Is it a Mold Layer?
            if (layerIndex !== -1) {
              console.log('✅ Assigned to MOLD LAYER:', exactName || parentName);
              meshesRef.current.moldLayers[layerIndex] = obj;
              if (layerColors[layerIndex]) {
                 obj.material.color.copy(getThreeColor(layerColors[layerIndex]));
              }
            } 
            
            // 3. INDEPENDENT CHECK: Is it Cup, Wax, or Wick? 
            // (Notice this is an 'if', not an 'else if', so it can't be hijacked by the mold logic!)
            if (
              lowerName.includes('cylinder_0') || lowerName.endsWith('_0') || lowerName.includes('jar') || lowerName.includes('glass') ||
              lowerParentName.includes('cylinder_0') || lowerParentName.endsWith('_0') || lowerParentName.includes('jar') || lowerParentName.includes('glass')
            ) {
              console.log('✅ Assigned to CUP:', exactName || parentName);
              const pColor = getThreeColor(cupColor);
              const op = getOpacity(cupColor);

              // Overwrite with premium glass material
              obj.material = new THREE.MeshPhysicalMaterial({
                color: pColor,
                metalness: 0.1,
                roughness: 0.05,
                transmission: op < 1 ? 1.0 : 0.0, 
                opacity: op,                      
                transparent: true,
                ior: 1.52,
                thickness: 0.5,
                flatShading: !!flatShading, 
                depthWrite: false
              });
              meshesRef.current.cup.push(obj);
            }
            else if (
              lowerName.includes('cylinder001_1') || lowerName.endsWith('_1') || lowerName.includes('sphere') || lowerName.includes('wax') ||
              lowerParentName.includes('cylinder001_1') || lowerParentName.endsWith('_1') || lowerParentName.includes('sphere') || lowerParentName.includes('wax')
            ) {
              console.log('✅ Assigned to WAX:', exactName || parentName);
              obj.material.color.copy(getThreeColor(waxColor, '#fdf6f0'));
              meshesRef.current.wax.push(obj);
            }
            else if (
              lowerName.includes('cylinder002_2') || lowerName.includes('wick') ||
              lowerParentName.includes('cylinder002_2') || lowerParentName.includes('wick')
            ) {
              console.log('✅ Assigned to WICK:', exactName || parentName);
              meshesRef.current.wick.push(obj);
            }

            obj.material.needsUpdate = true;
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

  // --- REACTIVE COLOR UPDATES ---
  useEffect(() => {
    const c = getThreeColor(cupColor);
    const op = getOpacity(cupColor);
    meshesRef.current.cup.forEach(mesh => {
      mesh.material.color.copy(c);
      mesh.material.opacity = op;
      mesh.material.transmission = op < 1 ? 1.0 : 0.0;
      mesh.material.needsUpdate = true;
    });
  }, [cupColor]);

  useEffect(() => {
    const c = getThreeColor(waxColor, '#fdf6f0');
    meshesRef.current.wax.forEach(mesh => {
        mesh.material.color.copy(c);
        mesh.material.needsUpdate = true;
    });
  }, [waxColor]);

  useEffect(() => {
    meshesRef.current.moldLayers.forEach((mesh, index) => {
      if (mesh && layerColors[index]) {
        mesh.material.color.copy(getThreeColor(layerColors[index]));
        mesh.material.needsUpdate = true;
      }
    });
  }, [layerColors]);


if (!modelUrl) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: '16px',
      background: '#fdf6f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: '#a08070',
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