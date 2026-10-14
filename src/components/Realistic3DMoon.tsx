/**
 * Realistic 3D Moon Component
 * Cinematic, physically lit Three.js lunar visualization with procedural high-relief
 * craters, basaltic maria, radial ejecta rays, atmospheric rim lighting, floating lunar dust
 * particles, and deep space starfield.
 *
 * Implements smooth cinematic rotation, inertia damping, and celestial telemetry overlays.
 */

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Compass, RotateCw, Sparkles, Sun, Eye, Crosshair } from 'lucide-react';

interface Realistic3DMoonProps {
  size?: 'hero' | 'full' | 'compact' | 'large';
  sunAzimuth?: number; // 0°–360°
  sunElevation?: number; // 0°–90°
  interactive?: boolean;
  autoRotate?: boolean;
  showOverlayTelemetry?: boolean;
  showDustParticles?: boolean;
  className?: string;
  targetOrientation?: { yaw: number; pitch: number; label?: string } | null;
  textureMode?: 'photometric' | 'hypsometric' | 'shadows';
  onTextureModeChange?: (mode: 'photometric' | 'hypsometric' | 'shadows') => void;
  onCoordinatesChange?: (lat: number, lon: number) => void;
}

export const Realistic3DMoon: React.FC<Realistic3DMoonProps> = ({
  size = 'hero',
  sunAzimuth = 55,
  sunElevation = 22,
  interactive = true,
  autoRotate: initialAutoRotate = true,
  showOverlayTelemetry = true,
  showDustParticles = true,
  className = '',
  targetOrientation = null,
  textureMode: propTextureMode,
  onTextureModeChange,
  onCoordinatesChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  const [isHovered, setIsHovered] = useState(false);
  const [internalTextureMode, setInternalTextureMode] = useState<'photometric' | 'hypsometric' | 'shadows'>('photometric');
  const textureMode = propTextureMode || internalTextureMode;

  const setTextureMode = (mode: 'photometric' | 'hypsometric' | 'shadows') => {
    setInternalTextureMode(mode);
    if (onTextureModeChange) onTextureModeChange(mode);
  };

  const [currentRot, setCurrentRot] = useState({ yaw: 24, pitch: 12 });
  const targetRotRef = useRef<{ yaw: number; pitch: number; label?: string } | null>(targetOrientation);

  useEffect(() => {
    if (targetOrientation) {
      targetRotRef.current = targetOrientation;
      setAutoRotate(false);
    }
  }, [targetOrientation]);

  // Refs for Three.js instance cleanup and animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rotVelocityRef = useRef({ x: 0, y: 0.0018 });
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });

  // Generate high-resolution procedural lunar texture on canvas
  const generateLunarTextureCanvas = (mode: 'photometric' | 'hypsometric' | 'shadows') => {
    const w = 1024;
    const h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Base background: lunar highlands (anorthosite light gray)
    ctx.fillStyle = '#9aa1a9';
    ctx.fillRect(0, 0, w, h);

    // Procedural noise for regolith granularity
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Key Lunar Maria (Dark Basalt Plains) coordinates in UV space (center x, center y, rx, ry, opacity)
    const maria = [
      { x: 0.42, y: 0.45, rx: 0.09, ry: 0.08, name: 'Mare Tranquillitatis' },
      { x: 0.35, y: 0.38, rx: 0.12, ry: 0.10, name: 'Mare Serenitatis' },
      { x: 0.28, y: 0.30, rx: 0.14, ry: 0.12, name: 'Mare Imbrium' },
      { x: 0.22, y: 0.48, rx: 0.18, ry: 0.18, name: 'Oceanus Procellarum' },
      { x: 0.52, y: 0.42, rx: 0.07, ry: 0.07, name: 'Mare Crisium' },
      { x: 0.38, y: 0.58, rx: 0.08, ry: 0.07, name: 'Mare Nectaris' },
      { x: 0.30, y: 0.62, rx: 0.10, ry: 0.08, name: 'Mare Nubium' },
      { x: 0.18, y: 0.60, rx: 0.09, ry: 0.08, name: 'Mare Humorum' },
    ];

    // Major impact craters with bright ray systems (Copernicus, Tycho, Kepler, Shackleton)
    const craters = [
      { x: 0.25, y: 0.40, r: 0.022, rays: true, name: 'Copernicus' },
      { x: 0.32, y: 0.72, r: 0.028, rays: true, name: 'Tycho' },
      { x: 0.18, y: 0.42, r: 0.015, rays: true, name: 'Kepler' },
      { x: 0.48, y: 0.92, r: 0.018, rays: false, name: 'Shackleton (South Pole)' },
      { x: 0.36, y: 0.52, r: 0.019, rays: false, name: 'Ptolemaeus' },
      { x: 0.38, y: 0.32, r: 0.020, rays: false, name: 'Aristoteles' },
      { x: 0.40, y: 0.22, r: 0.018, rays: false, name: 'Plato' },
    ];

    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;

        // Micro-roughness noise
        const n1 = Math.sin(u * 80) * Math.cos(v * 80) * 12;
        const n2 = Math.sin(u * 220 + v * 140) * 8;
        let brightness = 145 + n1 + n2;

        // Check distance to maria
        for (const m of maria) {
          const dx = (u - m.x) / m.rx;
          const dy = (v - m.y) / m.ry;
          const d = dx * dx + dy * dy;
          if (d < 1.0) {
            const factor = Math.exp(-d * 2.2);
            brightness -= factor * 65; // Maria are significantly darker basalt
          }
        }

        // Check distance to major craters
        for (const c of craters) {
          const dx = u - c.x;
          const dy = v - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Crater rim & floor
          if (dist < c.r) {
            const rimDist = Math.abs(dist - c.r * 0.85);
            if (rimDist < 0.005) {
              brightness += 60; // Bright sunlit crater rim
            } else if (dist < c.r * 0.6) {
              brightness -= 40; // Deep shadow crater floor
            }
          }

          // Radial bright ejecta rays (Tycho / Copernicus)
          if (c.rays && dist < 0.25 && dist > c.r) {
            const angle = Math.atan2(dy, dx);
            const rayNoise = Math.sin(angle * 16) ** 4;
            if (rayNoise > 0.6) {
              brightness += ((0.25 - dist) / 0.25) * 45 * rayNoise;
            }
          }
        }

        brightness = Math.max(18, Math.min(245, brightness));

        if (mode === 'hypsometric') {
          // False-color topographic elevation map
          data[idx] = Math.floor(brightness * 0.8);
          data[idx + 1] = Math.floor(Math.sin(v * Math.PI) * 180 + brightness * 0.2);
          data[idx + 2] = Math.floor(220 - brightness * 0.4);
        } else if (mode === 'shadows') {
          // High contrast shadow delineation
          const val = brightness > 120 ? 210 : 25;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = Math.floor(val * 1.05);
        } else {
          // Photometric silver-gray lunar regolith
          data[idx] = Math.floor(brightness * 0.94);
          data[idx + 1] = Math.floor(brightness * 0.96);
          data[idx + 2] = Math.floor(brightness * 1.0);
        }
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.z = 2.7;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Create procedural textures
    const textureCanvas = generateLunarTextureCanvas(textureMode);
    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Bump map for 3D physical surface relief
    const bumpCanvas = generateLunarTextureCanvas('shadows');
    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 5. Lunar Sphere Mesh
    const geometry = new THREE.SphereGeometry(1.0, 96, 96);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: bumpTexture,
      bumpScale: 0.045,
      roughness: 0.88,
      metalness: 0.04,
    });

    const moonMesh = new THREE.Mesh(geometry, material);
    moonMesh.rotation.y = THREE.MathUtils.degToRad(currentRot.yaw);
    moonMesh.rotation.x = THREE.MathUtils.degToRad(currentRot.pitch);
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    // 6. Atmospheric Rim / Limb Halo (Moonlit night silver rim glow)
    const rimGeometry = new THREE.SphereGeometry(1.025, 64, 64);
    const rimMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
          rim = pow(rim, 3.2);
          // Moon silver with subtle antique gold tint
          vec3 rimColor = vec3(0.88, 0.92, 0.98);
          gl_FragColor = vec4(rimColor, rim * 0.45);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    scene.add(rimMesh);

    // 7. Lighting
    // Directional Sunlight
    const radAz = THREE.MathUtils.degToRad(sunAzimuth);
    const radEl = THREE.MathUtils.degToRad(sunElevation);
    const lightDist = 6.0;
    const lightX = lightDist * Math.cos(radEl) * Math.sin(radAz);
    const lightY = lightDist * Math.sin(radEl);
    const lightZ = lightDist * Math.cos(radEl) * Math.cos(radAz);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    dirLight.position.set(lightX, lightY, lightZ);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Ambient light: deep black space with faint earthshine reflection
    const ambientLight = new THREE.AmbientLight(0x181e28, 0.35);
    scene.add(ambientLight);

    // Subtle opposite rim bounce light (soft cold moon reflection)
    const bounceLight = new THREE.DirectionalLight(0x7085a0, 0.4);
    bounceLight.position.set(-lightX * 0.8, -lightY * 0.5, -lightZ * 0.8);
    scene.add(bounceLight);

    // 8. Floating Lunar Dust Particles
    if (showDustParticles) {
      const particleCount = 180;
      const particleGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      const scaleArray = new Float32Array(particleCount);

      for (let i = 0; i < particleCount * 3; i += 3) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const dist = 1.08 + Math.random() * 0.45;

        posArray[i] = dist * Math.sin(phi) * Math.cos(theta);
        posArray[i + 1] = dist * Math.sin(phi) * Math.sin(theta);
        posArray[i + 2] = dist * Math.cos(phi);
        scaleArray[i / 3] = Math.random() * 0.012 + 0.005;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      const particleMat = new THREE.PointsMaterial({
        color: 0xe2e8f0,
        size: 0.018,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      });

      const particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);
    }

    // 9. Background Distant Starfield
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 0.06,
      transparent: true,
      opacity: 0.65,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 10. Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (moonMeshRef.current) {
        if (targetRotRef.current && !isDraggingRef.current) {
          const targetYawRad = THREE.MathUtils.degToRad(targetRotRef.current.yaw);
          const targetPitchRad = THREE.MathUtils.degToRad(targetRotRef.current.pitch);
          moonMeshRef.current.rotation.y = THREE.MathUtils.lerp(moonMeshRef.current.rotation.y, targetYawRad, 0.06);
          moonMeshRef.current.rotation.x = THREE.MathUtils.lerp(moonMeshRef.current.rotation.x, targetPitchRad, 0.06);
          if (
            Math.abs(moonMeshRef.current.rotation.y - targetYawRad) < 0.005 &&
            Math.abs(moonMeshRef.current.rotation.x - targetPitchRad) < 0.005
          ) {
            targetRotRef.current = null;
          }
        } else if (autoRotate && !isDraggingRef.current) {
          moonMeshRef.current.rotation.y += 0.0012;
        } else {
          // Apply residual inertia
          moonMeshRef.current.rotation.y += rotVelocityRef.current.y;
          moonMeshRef.current.rotation.x += rotVelocityRef.current.x;
          rotVelocityRef.current.y *= 0.94;
          rotVelocityRef.current.x *= 0.94;
        }

        const curYaw = THREE.MathUtils.radToDeg(moonMeshRef.current.rotation.y) % 360;
        const curPitch = THREE.MathUtils.radToDeg(moonMeshRef.current.rotation.x) % 360;
        setCurrentRot({ yaw: Math.round(curYaw), pitch: Math.round(curPitch) });
      }

      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      rimGeometry.dispose();
      rimMaterial.dispose();
      texture.dispose();
      bumpTexture.dispose();
    };
  }, [sunAzimuth, sunElevation, autoRotate, showDustParticles, textureMode]);

  // Pointer drag handlers for smooth tactile rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    targetRotRef.current = null;
    isDraggingRef.current = true;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    rotVelocityRef.current = { x: 0, y: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !moonMeshRef.current) return;
    const dx = e.clientX - prevPointerRef.current.x;
    const dy = e.clientY - prevPointerRef.current.y;

    const velY = dx * 0.0045;
    const velX = dy * 0.0045;

    moonMeshRef.current.rotation.y += velY;
    moonMeshRef.current.rotation.x += velX;

    rotVelocityRef.current = { x: velX, y: velY };
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Three.js canvas container */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full cursor-grab active:cursor-grabbing ${
          interactive ? 'touch-none' : 'pointer-events-none'
        }`}
        style={{ minHeight: size === 'hero' ? '320px' : size === 'full' || size === 'large' ? '460px' : '220px' }}
      />

      {/* Subtle Volumetric Rim Vignette / Moonlit Atmosphere */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

      {/* Ancient/Celestial Geometric Reticle Corner Accents */}
      <div className="absolute top-2 left-2 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/20">
          <path d="M 0 8 L 0 0 L 8 0" stroke="currentColor" strokeWidth="1" />
          <circle cx="2" cy="2" r="1" fill="#c5a059" />
        </svg>
      </div>
      <div className="absolute top-2 right-2 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/20">
          <path d="M 16 0 L 24 0 L 24 8" stroke="currentColor" strokeWidth="1" />
          <circle cx="22" cy="2" r="1" fill="#c5a059" />
        </svg>
      </div>
      <div className="absolute bottom-2 left-2 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/20">
          <path d="M 0 16 L 0 24 L 8 24" stroke="currentColor" strokeWidth="1" />
          <circle cx="2" cy="22" r="1" fill="#c5a059" />
        </svg>
      </div>
      <div className="absolute bottom-2 right-2 pointer-events-none">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/20">
          <path d="M 16 24 L 24 24 L 24 16" stroke="currentColor" strokeWidth="1" />
          <circle cx="22" cy="22" r="1" fill="#c5a059" />
        </svg>
      </div>

      {/* Overlay Scientific Telemetry */}
      {showOverlayTelemetry && (
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#06080c]/85 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse" />
            <span className="font-celestial text-[10px] text-slate-200 tracking-widest uppercase">
              LUNAR DIGITAL TWIN
            </span>
            <span className="text-[9px] font-mono text-slate-400">1:1 PHOTOGRAMMETRY</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 pl-1 flex items-center gap-2">
            <span>LAT: {currentRot.pitch > 0 ? `${currentRot.pitch}°N` : `${Math.abs(currentRot.pitch)}°S`}</span>
            <span className="text-white/20">•</span>
            <span>LON: {currentRot.yaw}°E</span>
          </div>
        </div>
      )}

      {/* Floating Control HUD */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-1 bg-[#06080c]/85 border border-white/10 p-1 rounded-lg backdrop-blur-md">
          <button
            onClick={() => setTextureMode('photometric')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
              textureMode === 'photometric'
                ? 'bg-white/15 text-white font-semibold border border-white/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Albedo
          </button>
          <button
            onClick={() => setTextureMode('hypsometric')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
              textureMode === 'hypsometric'
                ? 'bg-[#c5a059]/20 text-[#c5a059] font-semibold border border-[#c5a059]/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Relief
          </button>
          <button
            onClick={() => setTextureMode('shadows')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
              textureMode === 'shadows'
                ? 'bg-slate-700/50 text-slate-100 font-semibold border border-white/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shadows
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-[#06080c]/85 border border-white/10 px-2 py-1 rounded-lg backdrop-blur-md text-[10px] font-mono text-slate-300">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 transition ${
              autoRotate ? 'text-slate-200' : 'text-slate-500'
            }`}
            title="Toggle cinematic slow rotation"
          >
            <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin-slow' : ''}`} />
            <span className="hidden sm:inline">{autoRotate ? 'Orbit On' : 'Paused'}</span>
          </button>
          <span className="text-white/20">•</span>
          <span className="text-[#c5a059]">☀ {sunAzimuth}°</span>
        </div>
      </div>
    </div>
  );
};
