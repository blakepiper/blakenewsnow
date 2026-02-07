import { Component, useRef, useMemo, useState, useEffect } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { ANIMATION_INTERVALS } from '../config';

// Cities to rotate through
const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'Washington DC', lat: 38.9, lon: -77.0 },
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Beijing', lat: 39.9, lon: 116.4 },
  { name: 'Moscow', lat: 55.8, lon: 37.6 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7 },
  { name: 'Jerusalem', lat: 31.8, lon: 35.2 },
  { name: 'Sydney', lat: -33.9, lon: 151.2 },
  { name: 'São Paulo', lat: -23.5, lon: -46.6 },
  { name: 'Lagos', lat: 6.5, lon: 3.4 },
  { name: 'New Delhi', lat: 28.6, lon: 77.2 },
];

// Convert lat/lon to spherical rotation (looking at that point)
function latLonToRotation(lat: number, lon: number): [number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [phi - Math.PI / 2, -theta];
}

// Calculate sun direction from current UTC time
function getSunDirection(): THREE.Vector3 {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = declination * (Math.PI / 180);
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const hourAngle = ((hours - 12) / 24) * 2 * Math.PI;

  return new THREE.Vector3(
    Math.cos(decRad) * Math.sin(hourAngle),
    Math.sin(decRad),
    Math.cos(decRad) * Math.cos(hourAngle)
  ).normalize();
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec4 dayColor = texture2D(dayMap, vUv);
    vec4 nightColor = texture2D(nightMap, vUv);
    float sunDot = dot(vNormal, sunDir);
    float blend = smoothstep(-0.15, 0.15, sunDot);
    nightColor.rgb *= 1.5;
    vec4 color = mix(nightColor, dayColor, blend);
    color.rgb += 0.02;
    gl_FragColor = color;
  }
`;

function Earth({ cityIndex }: { cityIndex: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetRotation = useRef<[number, number]>(latLonToRotation(CITIES[0].lat, CITIES[0].lon));
  const currentRotation = useRef<[number, number]>(targetRotation.current);
  const tempSunDir = useRef(new THREE.Vector3());

  const dayTexture = useLoader(THREE.TextureLoader, '/textures/earth-day.jpg');
  const nightTexture = useLoader(THREE.TextureLoader, '/textures/earth-night.jpg');

  const sunDirection = useRef(getSunDirection());

  useEffect(() => {
    const interval = setInterval(() => {
      sunDirection.current = getSunDirection();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const city = CITIES[cityIndex];
    targetRotation.current = latLonToRotation(city.lat, city.lon);
  }, [cityIndex]);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayTexture },
      nightMap: { value: nightTexture },
      sunDir: { value: sunDirection.current },
    }),
    [dayTexture, nightTexture]
  );

  useFrame(() => {
    if (!meshRef.current) return;

    const lerpFactor = 0.02;
    const [tx, ty] = targetRotation.current;
    const [cx, cy] = currentRotation.current;

    let dy = ty - cy;
    if (dy > Math.PI) dy -= 2 * Math.PI;
    if (dy < -Math.PI) dy += 2 * Math.PI;

    const nx = cx + (tx - cx) * lerpFactor;
    const ny = cy + dy * lerpFactor;
    currentRotation.current = [nx, ny];

    meshRef.current.rotation.x = nx;
    meshRef.current.rotation.y = ny;

    // Transform sun direction from world space to object space so the
    // terminator stays at the correct geographic position as the globe rotates
    meshRef.current.updateMatrixWorld();
    tempSunDir.current.copy(sunDirection.current)
      .applyQuaternion(meshRef.current.quaternion.clone().invert());
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.sunDir.value.copy(tempSunDir.current);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[1.02, 48, 48]} />
      <meshBasicMaterial
        color="#4488ff"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// Error boundary to catch WebGL failures gracefully
class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Globe WebGL error:', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// Check if WebGL is available before attempting to render
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function GlobeFallback({ cityName }: { cityName: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0f1a] rounded overflow-hidden relative">
      {/* Simple CSS globe fallback */}
      <div className="w-24 h-24 rounded-full border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-green-900/30 to-blue-950/60 relative overflow-hidden">
        <div className="absolute inset-0 rounded-full border border-white/5" />
        {/* Terminator line */}
        <div className="absolute top-0 bottom-0 right-0 w-1/2 bg-black/40 rounded-r-full" />
      </div>
      <span className="text-[9px] text-white/50 mt-2">{cityName}</span>
    </div>
  );
}

export function Globe() {
  const [cityIndex, setCityIndex] = useState(0);
  const [webglSupported] = useState(() => isWebGLAvailable());

  useEffect(() => {
    const interval = setInterval(() => {
      setCityIndex(prev => (prev + 1) % CITIES.length);
    }, ANIMATION_INTERVALS.globeRotation);
    return () => clearInterval(interval);
  }, []);

  if (!webglSupported) {
    return <GlobeFallback cityName={CITIES[cityIndex].name} />;
  }

  return (
    <GlobeErrorBoundary fallback={<GlobeFallback cityName={CITIES[cityIndex].name} />}>
      <div className="w-full h-full relative">
        <Canvas
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          camera={{ position: [0, 0, 2.4], fov: 40 }}
          style={{ background: 'transparent' }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Earth cityIndex={cityIndex} />
          <Atmosphere />
        </Canvas>
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-[9px] text-white/50 bg-black/40 px-1.5 py-0.5 rounded">
            {CITIES[cityIndex].name}
          </span>
        </div>
      </div>
    </GlobeErrorBoundary>
  );
}
