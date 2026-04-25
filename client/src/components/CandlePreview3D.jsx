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
      antialias: true, // Smooth edges
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(size, size);
    
    // High-res rendering capped at 2x for safety
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
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
        } catch (e) {
          allowedParts = [];
        }

        loadedGroup.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = !isMobile;
            
            const exactName = obj.name; 
            const lowerName = exactName.toLowerCase();
            const layerIndex = allowedParts.indexOf(exactName);

            // 1. MOLD LAYERS
            if (layerIndex !== -1) {
              obj.material = obj.material.clone();
              obj.material.flatShading = !!flatShading;
              obj.material.needsUpdate = true;
              
              meshesRef.current.moldLayers[layerIndex] = obj;
              if (layerColors[layerIndex]) {
                obj.material.color.set(layerColors[layerIndex]);
              }
            } 
            // 2. CUP GLASS (Premium Crystal Refraction)
            else if (lowerName.includes('cylinder_0') || lowerName.endsWith('_0')) {
              const crystalMaterial = new THREE.MeshPhysicalMaterial({
                color: cupColor ? new THREE.Color(cupColor) : new THREE.Color(0xffffff),
                metalness: 0.1,
                roughness: 0.05,       
                transmission: 1.0,     // True light bending
                ior: 1.52,             // Glass refraction index
                thickness: 0.3,        // Simulates glass chunkiness
                transparent: true,
                flatShading: !!flatShading, // Makes facets pop sharply
                depthWrite: false      // Fixes wireframe glitches
              });

              obj.material = crystalMaterial;
              meshesRef.current.cup.push(obj);
            } 
            // 3. WAX
            else if (lowerName.includes('cylinder001_1') || lowerName.endsWith('_1') || lowerName.includes('sphere') || lowerName.includes('wax')) {
              obj.material = obj.material.clone();
              obj.material.flatShading = !!flatShading;
              obj.material.needsUpdate = true;
              
              meshesRef.current.wax.push(obj);
              if (waxColor) obj.material.color.set(waxColor);
            }
            // 4. WICK
            else if (lowerName.includes('cylinder002_2') || lowerName.includes('wick')) {
              obj.material = obj.material.clone();
              meshesRef.current.wick.push(obj);
            }
          }
        });
      },
      undefined,
      (err) => console.error('Failed to load 3D model:', err)
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
      
      // Deep VRAM Memory Cleanup
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
  }, [modelUrl, colorableParts, flatShading]); // Re-run if flat shading toggles

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