import { Component, Suspense, useRef, useEffect, useCallback } from 'react';
import type { ReactNode, ErrorInfo, MutableRefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ANIMATION_INTERVALS } from '../config';

// City data with UTC offsets for local time display
const CITIES = [
  { name: 'Washington DC', lat: 38.9, lon: -77.0, tz: -5 },
  { name: 'London', lat: 51.5, lon: -0.1, tz: 0 },
  { name: 'Beijing', lat: 39.9, lon: 116.4, tz: 8 },
  { name: 'Moscow', lat: 55.8, lon: 37.6, tz: 3 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7, tz: 9 },
  { name: 'Jerusalem', lat: 31.8, lon: 35.2, tz: 2 },
  { name: 'Sydney', lat: -33.9, lon: 151.2, tz: 11 },
  { name: 'São Paulo', lat: -23.5, lon: -46.6, tz: -3 },
  { name: 'Lagos', lat: 6.5, lon: 3.4, tz: 1 },
  { name: 'New Delhi', lat: 28.6, lon: 77.2, tz: 5.5 },
] as const;

// THREE.js SphereGeometry vertex formula (default params):
//   x = -cos(u·2π) · sin(v·π)
//   y =  cos(v·π)
//   z =  sin(u·2π) · sin(v·π)
// where u = (lon+180)/360, v = (90-lat)/180
function cityToSpherePoint(lat: number, lon: number): THREE.Vector3 {
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  const phi = u * 2 * Math.PI;
  const theta = v * Math.PI;
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta)
  );
}

// Precompute city positions on the unit sphere
const CITY_POSITIONS = CITIES.map(c => cityToSpherePoint(c.lat, c.lon));

// Quaternion that rotates the city's sphere point to face the camera (+Z).
// setFromUnitVectors gives the exact shortest rotation — no Euler order issues,
// no offset calculation, no ambiguity.
const _target = new THREE.Vector3(0, 0, 1);
function cityToQuaternion(lat: number, lon: number): THREE.Quaternion {
  const point = cityToSpherePoint(lat, lon);
  return new THREE.Quaternion().setFromUnitVectors(point, _target);
}

function getLocalTime(tzOffset: number): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const local = new Date(utc + tzOffset * 3600000);
  return local.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Data written by useFrame, read by the HTML overlay RAF loop
interface CityDot {
  x: number;
  y: number;
  visible: boolean;
  isCurrent: boolean;
  name: string;
  localTime: string;
}

// Earth reads cityIndex via a ref — zero React re-renders inside the Canvas.
function Earth({
  cityIndexRef,
  dotsRef,
}: {
  cityIndexRef: MutableRefObject<number>;
  dotsRef: MutableRefObject<CityDot[]>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lastCityIndex = useRef(-1);
  const targetQuat = useRef(cityToQuaternion(CITIES[0].lat, CITIES[0].lon));
  const currentQuat = useRef(targetQuat.current.clone());
  const tmpVec = useRef(new THREE.Vector3());

  const dayTexture = useLoader(THREE.TextureLoader, '/textures/earth-day.jpg');

  useEffect(() => {
    return () => { dayTexture.dispose(); };
  }, [dayTexture]);

  useFrame(({ camera }) => {
    if (!meshRef.current) return;

    // Detect city change from the ref
    const idx = cityIndexRef.current;
    if (idx !== lastCityIndex.current) {
      lastCityIndex.current = idx;
      const city = CITIES[idx];
      const newTarget = cityToQuaternion(city.lat, city.lon);
      if (currentQuat.current.dot(newTarget) < 0) {
        newTarget.set(-newTarget.x, -newTarget.y, -newTarget.z, -newTarget.w);
      }
      targetQuat.current = newTarget;
    }

    // Quaternion SLERP
    currentQuat.current.slerp(targetQuat.current, 0.025);
    meshRef.current.quaternion.copy(currentQuat.current);

    // Project all city dots to screen coordinates
    const dots: CityDot[] = [];
    for (let i = 0; i < CITIES.length; i++) {
      const city = CITIES[i];
      // Transform city position by mesh rotation
      tmpVec.current.copy(CITY_POSITIONS[i]).applyQuaternion(currentQuat.current);

      // Visible if facing the camera (z > threshold to hide dots near the limb)
      const visible = tmpVec.current.z > 0.15;

      // Project to normalized device coords
      const projected = tmpVec.current.clone().project(camera);
      dots.push({
        x: projected.x * 0.5 + 0.5,
        y: 1 - (projected.y * 0.5 + 0.5),
        visible,
        isCurrent: i === idx,
        name: city.name,
        localTime: getLocalTime(city.tz),
      });
    }
    dotsRef.current = dots;
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <mesh ref={meshRef} quaternion={currentQuat.current}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial map={dayTexture} roughness={1} metalness={0} />
      </mesh>
    </>
  );
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.015, 48, 48]} />
      <meshBasicMaterial color="#4488ff" transparent opacity={0.06} side={THREE.BackSide} />
    </mesh>
  );
}

function ResourceDisposer() {
  const { gl, scene } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
      });
      gl.dispose();
    };
  }, [gl, scene]);
  return null;
}

function CanvasLoader() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.5;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#112233" wireframe />
    </mesh>
  );
}

// Overlay that imperatively positions city dot DOM elements (zero re-renders)
function CityDotsOverlay({ dotsRef }: { dotsRef: MutableRefObject<CityDot[]> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef<HTMLDivElement[]>([]);
  const dotRefs = useRef<HTMLDivElement[]>([]);
  const labelRefs = useRef<HTMLDivElement[]>([]);

  // Create dot DOM elements once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    elRefs.current = [];
    dotRefs.current = [];
    labelRefs.current = [];

    for (let i = 0; i < CITIES.length; i++) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);transition:opacity 0.3s;pointer-events:none;';

      const dot = document.createElement('div');
      dot.style.cssText = 'border-radius:50%;margin:0 auto;';

      const label = document.createElement('div');
      label.style.cssText =
        'position:absolute;top:100%;left:50%;transform:translateX(-50%);white-space:nowrap;' +
        'font-size:7px;line-height:1.2;text-align:center;padding:1px 3px;border-radius:2px;margin-top:2px;';

      el.appendChild(dot);
      el.appendChild(label);
      container.appendChild(el);

      elRefs.current.push(el);
      dotRefs.current.push(dot);
      labelRefs.current.push(label);
    }

    return () => {
      elRefs.current.forEach(el => el.remove());
    };
  }, []);

  // RAF loop — reads dotsRef, imperatively positions elements
  useEffect(() => {
    let frameId: number;

    function update() {
      const dots = dotsRef.current;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        const el = elRefs.current[i];
        const dot = dotRefs.current[i];
        const label = labelRefs.current[i];
        if (!el || !dot || !label) continue;

        if (d.visible) {
          el.style.opacity = '1';
          el.style.left = `${d.x * 100}%`;
          el.style.top = `${d.y * 100}%`;
          el.style.zIndex = d.isCurrent ? '10' : '1';

          if (d.isCurrent) {
            dot.style.width = '6px';
            dot.style.height = '6px';
            dot.style.background = '#f87171';
            dot.style.boxShadow = '0 0 4px rgba(248,113,113,0.6)';
            label.style.display = '';
            label.style.background = 'rgba(0,0,0,0.7)';
            label.style.color = 'rgba(255,255,255,0.9)';
            label.style.fontSize = '8px';
            label.textContent = `${d.name} ${d.localTime}`;
          } else {
            dot.style.width = '3px';
            dot.style.height = '3px';
            dot.style.background = 'rgba(255,255,255,0.5)';
            dot.style.boxShadow = 'none';
            label.style.display = '';
            label.style.background = 'none';
            label.style.color = 'rgba(255,255,255,0.4)';
            label.style.fontSize = '7px';
            label.textContent = d.localTime;
          }
        } else {
          el.style.opacity = '0';
        }
      }

      frameId = requestAnimationFrame(update);
    }

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [dotsRef]);

  return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />;
}

class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Globe WebGL error:', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch { return false; }
}

function GlobeFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0f1a] rounded overflow-hidden">
      <div className="w-24 h-24 rounded-full border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-green-900/30 to-blue-950/60 relative overflow-hidden">
        <div className="absolute inset-0 rounded-full border border-white/5" />
      </div>
    </div>
  );
}

// Stable config objects — never recreated, never trigger reconciliation
const GL_PROPS = { alpha: true, antialias: true, powerPreference: 'low-power' as const };
const CAMERA_PROPS = { position: [0, 0, 2.4] as [number, number, number], fov: 40 };
const CANVAS_STYLE: React.CSSProperties = { background: 'transparent' };

export function Globe() {
  // Refs only — no useState. Globe never re-renders after mount.
  const cityIndexRef = useRef(0);
  const dotsRef = useRef<CityDot[]>([]);
  const webglSupported = useRef(isWebGLAvailable());
  const contextLostRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cycle cities — pure ref mutation, no state update, no re-render
  useEffect(() => {
    const interval = setInterval(() => {
      cityIndexRef.current = (cityIndexRef.current + 1) % CITIES.length;
    }, ANIMATION_INTERVALS.globeRotation);
    return () => clearInterval(interval);
  }, []);

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.setClearColor(0x000000, 0);
    gl.domElement.addEventListener('webglcontextlost', () => {
      console.warn('Globe: WebGL context lost');
      contextLostRef.current = true;
      // Show fallback by swapping DOM content
      if (containerRef.current) {
        containerRef.current.innerHTML =
          '<div class="w-full h-full flex items-center justify-center text-white/30 text-xs">Globe unavailable</div>';
      }
    });
  }, []);

  if (!webglSupported.current) {
    return <GlobeFallback />;
  }

  return (
    <GlobeErrorBoundary fallback={<GlobeFallback />}>
      <div ref={containerRef} className="w-full h-full relative">
        <Canvas gl={GL_PROPS} camera={CAMERA_PROPS} style={CANVAS_STYLE} onCreated={handleCreated}>
          <ResourceDisposer />
          <Suspense fallback={<CanvasLoader />}>
            <Earth cityIndexRef={cityIndexRef} dotsRef={dotsRef} />
          </Suspense>
          <Atmosphere />
        </Canvas>
        <CityDotsOverlay dotsRef={dotsRef} />
      </div>
    </GlobeErrorBoundary>
  );
}
