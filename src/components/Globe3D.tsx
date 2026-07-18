import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Earthquake, Disaster, NewsEvent, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { WeatherAlert } from '../lib/weather-alerts';
import { UNDERSEA_CABLES, CHOKEPOINTS, MILITARY_BASES, NUCLEAR_SITES } from '../lib/cable-data';
import { INDIA_OUTER_BOUNDARY, INDIA_NORTHERN_TERRITORY } from '../lib/india-boundary';

interface Globe3DProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
  weatherAlerts: WeatherAlert[];
  onEventSelect: (id: string, type: string) => void;
  layersEnabled: {
    earthquakes: boolean;
    disasters: boolean;
    news: boolean;
    cables: boolean;
    military: boolean;
    nuclear: boolean;
    chokepoints: boolean;
    daynight: boolean;
    volcanoes: boolean;
    geopolitical: boolean;
    curfews: boolean;
    wx: boolean;
  };
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
}

const GLOBE_RADIUS = 100;
// Art-directed sun direction (world space) shared by the surface + atmosphere shaders.
const SUN_DIR = new THREE.Vector3(0.82, 0.30, 0.05).normalize();
// Command hub the live threat arcs radiate from (New Delhi ≈ India centroid).
const HUB_LAT = 28.6;
const HUB_LON = 77.2;

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(r * Math.sin(phi) * Math.cos(theta)),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function buildCountryGeometry(worldData: any): THREE.BufferGeometry[] {
  const arcs = worldData.arcs;
  const scale = worldData.transform.scale;
  const translate = worldData.transform.translate;

  const arcToLonLat = (arcIndex: number): Array<[number, number]> => {
    const reverse = arcIndex < 0;
    const arc = arcs[reverse ? ~arcIndex : arcIndex];
    let x = 0;
    let y = 0;
    const points = arc.map(([dx, dy]: [number, number]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]] as [number, number];
    });
    return reverse ? points.reverse() : points;
  };

  const ringToVec3 = (ring: number[]): THREE.Vector3[] => {
    const lonLats = ring.flatMap((i) => arcToLonLat(i));
    return lonLats.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 0.2));
  };

  const geometries: THREE.BufferGeometry[] = [];
  const countries = worldData.objects.countries.geometries || [];

  countries.forEach((geom: any) => {
    const rings: number[][] = geom.type === 'Polygon' ? geom.arcs : geom.arcs.flat(1);
    rings.forEach((ring: number[]) => {
      const pts = ringToVec3(ring);
      if (pts.length < 2) return;
      const geomBuf = new THREE.BufferGeometry().setFromPoints(pts);
      geometries.push(geomBuf);
    });
  });

  return geometries;
}

// A soft radial sprite texture used for additive marker halos (glows under bloom).
function makeGlowTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Great-circle path between two surface points, lifted into a smooth arc.
function greatCircleArc(a: THREE.Vector3, b: THREE.Vector3, segments = 72): THREE.Vector3[] {
  const va = a.clone().normalize();
  const vb = b.clone().normalize();
  const angle = va.angleTo(vb);
  const sinA = Math.sin(angle);
  const lift = GLOBE_RADIUS * (0.12 + 0.28 * (angle / Math.PI));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let p: THREE.Vector3;
    if (sinA < 1e-4) {
      p = va.clone();
    } else {
      const w1 = Math.sin((1 - t) * angle) / sinA;
      const w2 = Math.sin(t * angle) / sinA;
      p = va.clone().multiplyScalar(w1).add(vb.clone().multiplyScalar(w2)).normalize();
    }
    const h = GLOBE_RADIUS + 1 + lift * Math.sin(Math.PI * t);
    pts.push(p.multiplyScalar(h));
  }
  return pts;
}

const ARC_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ARC_FRAG = `
  uniform float uTime;
  uniform float uOffset;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    // Steady faint line + a bright gaussian "packet" travelling hub -> target.
    float head = fract(vUv.x - (uTime * 0.35 + uOffset));
    float packet = exp(-pow(head / 0.05, 2.0));
    // brighten toward the target end so the flow reads directionally
    float dirFade = 0.25 + 0.35 * vUv.x;
    float intensity = dirFade + packet * 2.2;
    gl_FragColor = vec4(uColor * intensity, min(1.0, dirFade + packet * 1.6));
  }
`;

/** Triangulate a lat/lon boundary polygon and drape it over the sphere as a filled mesh. */
function buildClaimFill(coords: [number, number][], radius: number, color: number, opacity: number): THREE.Mesh | null {
  if (coords.length < 3) return null;
  const contour = coords.map(([lon, lat]) => new THREE.Vector2(lon, lat));
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return null;
  }
  if (!tris.length) return null;
  const positions: number[] = [];
  for (const [a, b, c] of tris) {
    for (const i of [a, b, c]) {
      const v = latLonToVec3(coords[i][1], coords[i][0], radius);
      positions.push(v.x, v.y, v.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

export function Globe3D({
  earthquakes,
  disasters,
  news,
  volcanoes,
  geopolitical,
  weatherAlerts,
  onEventSelect,
  layersEnabled,
  showTooltip,
  hideTooltip,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const glowRef = useRef<THREE.Group | null>(null);
  const arcsRef = useRef<THREE.Group | null>(null);
  const countryLinesRef = useRef<THREE.Group | null>(null);
  const nightOverlayRef = useRef<THREE.Mesh | null>(null);
  const animFrameRef = useRef<number>(0);
  const pulseMeshesRef = useRef<Array<{ mesh: THREE.Mesh; baseScale: number; phase: number }>>([]);
  const glowTexRef = useRef<THREE.Texture | null>(null);
  const surfaceUniformsRef = useRef<{ uTime: { value: number }; uSunDir: { value: THREE.Vector3 } } | null>(null);
  const arcTimeRef = useRef<{ value: number }>({ value: 0 });
  const starUniformsRef = useRef<{ uTime: { value: number } } | null>(null);

  const isDraggingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const autoRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchDistRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const buildScene = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x01060f);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 3000);
    camera.position.z = 280;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Post-processing: subtle bloom so markers, arcs and the limb glow ──
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.45, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composerRef.current = composer;

    // ── Twinkling starfield ──
    const starCount = 2600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starPhase = new Float32Array(starCount);
    const starSize = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 900 + Math.random() * 400;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      starPhase[i] = Math.random() * 6.28;
      starSize[i] = 1.0 + Math.random() * 2.2;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
    const starUniforms = { uTime: { value: 0 } };
    starUniformsRef.current = starUniforms;
    const starMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: starUniforms,
      vertexShader: `
        attribute float aPhase;
        attribute float aSize;
        uniform float uTime;
        varying float vTw;
        void main() {
          vTw = 0.55 + 0.45 * sin(uTime * 1.5 + aPhase);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mv.z) * (0.6 + vTw);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vTw;
        void main() {
          vec2 d = gl_PointCoord - vec2(0.5);
          float a = smoothstep(0.5, 0.0, length(d));
          gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * vTw, a * vTw);
        }
      `,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // ── Shader-driven surface: day/night, terminator glow, fresnel rim, graticule, scan sweep ──
    const surfaceUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIR.clone() },
    };
    surfaceUniformsRef.current = surfaceUniforms;
    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 160, 160);
    const globeMat = new THREE.ShaderMaterial({
      uniforms: surfaceUniforms,
      extensions: { derivatives: true } as any,
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDir;
        varying vec3 vWorldNormal;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        varying vec2 vUv;

        float gridLine(float coord, float count) {
          float c = coord * count;
          float g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
          return 1.0 - min(g, 1.0);
        }

        void main() {
          float lambert = dot(normalize(vWorldNormal), normalize(uSunDir));
          float day = smoothstep(-0.08, 0.30, lambert);

          vec3 nightCol = vec3(0.005, 0.020, 0.036);
          vec3 dayCol   = vec3(0.012, 0.072, 0.130);
          vec3 base = mix(nightCol, dayCol, day);

          // subtle ocean sheen toward the sun
          base += vec3(0.008, 0.04, 0.07) * pow(max(day, 0.0), 2.5);

          // terminator scattering band (warm -> teal at the day/night seam)
          float term = exp(-pow(lambert * 7.0, 2.0));
          vec3 termCol = mix(vec3(0.9, 0.45, 0.15), vec3(0.0, 0.85, 0.65), 0.5);
          base += termCol * term * 0.34;

          // glowing graticule (fine sensor grid)
          float grid = max(gridLine(vUv.x, 24.0), gridLine(vUv.y, 12.0));
          base += vec3(0.0, 0.42, 0.34) * grid * (0.11 + 0.09 * day);

          // slow scan sweep across latitude
          float scan = smoothstep(0.0, 0.015, abs(fract(vUv.y * 2.0 - uTime * 0.04) - 0.5) - 0.485);
          base += vec3(0.0, 0.55, 0.5) * scan * 0.05;

          // fresnel rim (subtle — the atmosphere shell carries most of the limb glow)
          vec3 viewDir = normalize(-vViewPos);
          float fres = pow(1.0 - max(dot(viewDir, normalize(vViewNormal)), 0.0), 3.5);
          base += vec3(0.06, 0.32, 0.6) * fres * 0.35;

          gl_FragColor = vec4(base, 1.0);
        }
      `,
    });
    globeGroup.add(new THREE.Mesh(globeGeo, globeMat));

    // ── Volumetric atmosphere (backside, additive) ──
    const atmGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.10, 96, 96);
    const atmMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uSunDir: { value: SUN_DIR.clone() } },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vWorldNormal;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 viewDir = normalize(-vViewPos);
          float rim = pow(max(0.55 - abs(dot(viewDir, normalize(vViewNormal))), 0.0), 2.6);
          float sun = max(dot(normalize(vWorldNormal), normalize(uSunDir)), 0.0);
          vec3 col = mix(vec3(0.04, 0.28, 0.7), vec3(0.12, 0.6, 0.9), sun);
          gl_FragColor = vec4(col, rim * 2.4);
        }
      `,
    });
    globeGroup.add(new THREE.Mesh(atmGeo, atmMat));

    const countryLines = new THREE.Group();
    globeGroup.add(countryLines);
    countryLinesRef.current = countryLines;

    // Kept for the day/night terminator line (added on toggle); surface handles shading.
    const nightGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.4, 48, 48);
    const nightMat = new THREE.MeshBasicMaterial({ color: 0x000610, transparent: true, opacity: 0, depthWrite: false });
    const nightOverlay = new THREE.Mesh(nightGeo, nightMat);
    globeGroup.add(nightOverlay);
    nightOverlayRef.current = nightOverlay;

    const arcsGroup = new THREE.Group();
    globeGroup.add(arcsGroup);
    arcsRef.current = arcsGroup;

    const glowGroup = new THREE.Group();
    globeGroup.add(glowGroup);
    glowRef.current = glowGroup;
    glowTexRef.current = makeGlowTexture();

    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);
    markersRef.current = markersGroup;

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((r) => r.json())
      .then((worldData) => {
        const geos = buildCountryGeometry(worldData);
        const borderMat = new THREE.LineBasicMaterial({ color: 0x00e6b0, opacity: 0.5, transparent: true });
        geos.forEach((geo) => {
          const line = new THREE.Line(geo, borderMat);
          countryLinesRef.current?.add(line);
        });

        // ── Map of India per the Government of India / Survey of India claim ──
        // The Natural Earth base border draws India along the de-facto LoC.
        // Overlay the full official boundary — the mainland PLUS the northern
        // territory that includes PoK / Gilgit-Baltistan and Aksai Chin — as a
        // brighter closed outline so India reads at its official extent.
        const addIndiaClaim = (coords: [number, number][]) => {
          if (coords.length < 2) return;
          // Subtle India-tinted fill so the claimed territory reads as one region
          // (covers the Natural Earth LoC line beneath), then a bright outline.
          const fill = buildClaimFill(coords, GLOBE_RADIUS + 0.9, 0x1f9c72, 0.22);
          if (fill) { fill.userData = { type: 'india-fill' }; countryLinesRef.current?.add(fill); }
          const pts = coords.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 1.05));
          pts.push(pts[0]); // close the ring
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: 0x2effb4, opacity: 0.95, transparent: true });
          const line = new THREE.Line(geo, mat);
          line.userData = { type: 'india-boundary' };
          countryLinesRef.current?.add(line);
        };
        addIndiaClaim(INDIA_OUTER_BOUNDARY);       // mainland + NE
        addIndiaClaim(INDIA_NORTHERN_TERRITORY);   // PoK/Gilgit-Baltistan + Aksai Chin
      })
      .catch(() => {});

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      composerRef.current?.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let t = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      t += 0.016;

      if (surfaceUniformsRef.current) surfaceUniformsRef.current.uTime.value = t;
      if (starUniformsRef.current) starUniformsRef.current.uTime.value = t;
      arcTimeRef.current.value = t;

      if (autoRotateRef.current && !isDraggingRef.current) {
        globeGroup.rotation.y += 0.0007;
      }

      for (const { mesh, baseScale, phase } of pulseMeshesRef.current) {
        const s = baseScale * (1 + 0.28 * Math.sin(t * 2.5 + phase));
        mesh.scale.setScalar(s);
      }

      composer.render();
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const cleanup = buildScene();
    return cleanup;
  }, [buildScene]);

  useEffect(() => {
    if (!markersRef.current || !globeGroupRef.current || !glowRef.current || !arcsRef.current) return;

    const disposeChildren = (parent: THREE.Object3D) => {
      while (parent.children.length > 0) {
        const child = parent.children[0];
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as any).material) {
          const m = (child as any).material;
          Array.isArray(m) ? m.forEach((x: THREE.Material) => x.dispose()) : (m as THREE.Material).dispose();
        }
        parent.remove(child);
      }
    };

    disposeChildren(markersRef.current);
    disposeChildren(glowRef.current);
    disposeChildren(arcsRef.current);
    pulseMeshesRef.current = [];

    // Additive glow halo behind a marker (blooms into a soft light).
    const addGlow = (pos: THREE.Vector3, color: number, scale: number) => {
      if (!glowTexRef.current) return;
      const mat = new THREE.SpriteMaterial({
        map: glowTexRef.current,
        color,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.scale.setScalar(scale);
      glowRef.current?.add(sprite);
    };

    const addPulse = (pos: THREE.Vector3, color: number, baseScale: number, phase: number, userData: any) => {
      const geo = new THREE.SphereGeometry(1, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(baseScale);
      mesh.userData = userData;
      markersRef.current?.add(mesh);
      pulseMeshesRef.current.push({ mesh, baseScale, phase });
      addGlow(pos, color, baseScale * 3.6);

      const ringGeo = new THREE.RingGeometry(1.2, 2.0, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      markersRef.current?.add(ring);
    };

    // ── Live threat arcs: hub -> most severe events ──
    const hub = latLonToVec3(HUB_LAT, HUB_LON, GLOBE_RADIUS);
    const sevRank: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
    type ArcTarget = { lat: number; lon: number; color: number; weight: number };
    const arcTargets: ArcTarget[] = [];
    earthquakes.forEach((eq) => {
      if (eq.magnitude >= 6) arcTargets.push({ lat: eq.latitude, lon: eq.longitude, color: 0xff1744, weight: eq.magnitude });
    });
    volcanoes.forEach((v) => {
      if (v.status === 'erupting' && v.latitude && v.longitude) arcTargets.push({ lat: v.latitude, lon: v.longitude, color: 0xff4500, weight: 7 });
    });
    geopolitical.forEach((g) => {
      if ((g.severity === 'critical' || g.severity === 'high') && g.latitude && g.longitude) {
        arcTargets.push({ lat: g.latitude, lon: g.longitude, color: g.severity === 'critical' ? 0xff1a44 : 0xff6b00, weight: 5 + (sevRank[g.severity] || 0) });
      }
    });
    weatherAlerts.forEach((w) => {
      if (w.severity === 'red' && w.latitude != null && w.longitude != null) arcTargets.push({ lat: w.latitude, lon: w.longitude, color: 0xff2255, weight: 6 });
    });
    arcTargets.sort((a, b) => b.weight - a.weight);
    arcTargets.slice(0, 16).forEach((tgt, i) => {
      const end = latLonToVec3(tgt.lat, tgt.lon, GLOBE_RADIUS);
      const pts = greatCircleArc(hub, end);
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 72, 0.45, 6, false);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: arcTimeRef.current,
          uOffset: { value: (i * 0.37) % 1 },
          uColor: { value: new THREE.Color(tgt.color) },
        },
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
      });
      const tube = new THREE.Mesh(tubeGeo, mat);
      arcsRef.current?.add(tube);
    });
    // Pulsing command node at the hub.
    if (arcTargets.length > 0) {
      addGlow(hub.clone().multiplyScalar((GLOBE_RADIUS + 1) / GLOBE_RADIUS), 0x00ffcc, 7);
      const hubGeo = new THREE.SphereGeometry(2.2, 20, 20);
      const hubMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 1 });
      const hubMesh = new THREE.Mesh(hubGeo, hubMat);
      hubMesh.position.copy(hub.clone().multiplyScalar((GLOBE_RADIUS + 1.5) / GLOBE_RADIUS));
      hubMesh.userData = { type: 'hub', name: 'DHRUVA COMMAND HUB — New Delhi' };
      markersRef.current?.add(hubMesh);
      pulseMeshesRef.current.push({ mesh: hubMesh, baseScale: 1, phase: 0 });
    }

    if (layersEnabled.cables) {
      UNDERSEA_CABLES.forEach((cable) => {
        const pts = cable.points.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 0.5));
        if (pts.length < 2) return;
        const curve = new THREE.CatmullRomCurve3(pts);
        const curvePts = curve.getPoints(pts.length * 8);
        const geo = new THREE.BufferGeometry().setFromPoints(curvePts);
        const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(cable.color), transparent: true, opacity: 0.6 });
        const line = new THREE.Line(geo, mat);
        line.userData = { type: 'cable', name: cable.name };
        markersRef.current?.add(line);
      });
    }

    if (layersEnabled.chokepoints) {
      CHOKEPOINTS.forEach((cp, i) => {
        const pos = latLonToVec3(cp.lat, cp.lon, GLOBE_RADIUS + 1);
        addPulse(pos, 0xff6b00, 2.2, i * 0.7, { type: 'chokepoint', name: `${cp.name}: ${cp.desc}` });
      });
    }

    if (layersEnabled.military) {
      MILITARY_BASES.forEach((b, i) => {
        const pos = latLonToVec3(b.lat, b.lon, GLOBE_RADIUS + 1);
        const geo = new THREE.BoxGeometry(2, 2, 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'military', name: `${b.name} [${b.type}]` };
        markersRef.current?.add(mesh);
        addGlow(pos, 0x4a9eff, 8);
        pulseMeshesRef.current.push({ mesh, baseScale: 1, phase: i * 0.5 });
      });
    }

    if (layersEnabled.nuclear) {
      NUCLEAR_SITES.forEach((s, i) => {
        const pos = latLonToVec3(s.lat, s.lon, GLOBE_RADIUS + 1);
        const geo = new THREE.ConeGeometry(1.8, 4, 3);
        const col = s.status === 'STRUCK' ? 0xff0040 : s.status === 'SUSPECTED' ? 0xffee00 : 0x39ff88;
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI);
        mesh.userData = { type: 'nuclear', name: `${s.name} [${s.status}]` };
        markersRef.current?.add(mesh);
        addGlow(pos, col, 8);
        pulseMeshesRef.current.push({ mesh, baseScale: 1, phase: i * 0.4 });
      });
    }

    if (layersEnabled.earthquakes) {
      earthquakes.forEach((eq, i) => {
        const pos = latLonToVec3(eq.latitude, eq.longitude, GLOBE_RADIUS + 1);
        const baseScale = Math.max(1.2, eq.magnitude * 0.55);
        const col = eq.magnitude >= 7 ? 0xff1744 : eq.magnitude >= 5 ? 0x4d9fff : 0x00d4a0;
        addPulse(pos, col, baseScale, i * 0.3, {
          type: 'earthquake', id: eq.id,
          name: `M${eq.magnitude.toFixed(1)} — ${eq.location}`,
        });
      });
    }

    if (layersEnabled.volcanoes) {
      volcanoes.forEach((v, i) => {
        if (!v.latitude || !v.longitude) return;
        const pos = latLonToVec3(v.latitude, v.longitude, GLOBE_RADIUS + 1);
        const isErupting = v.status === 'erupting';
        const geo = new THREE.ConeGeometry(isErupting ? 2.8 : 1.8, isErupting ? 6 : 3.5, 4);
        const mat = new THREE.MeshBasicMaterial({ color: isErupting ? 0xff4500 : 0xff8c00, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI);
        mesh.userData = { type: 'volcano', id: v.id, name: `[${v.status?.toUpperCase()}] ${v.name}` };
        markersRef.current?.add(mesh);
        addGlow(pos, isErupting ? 0xff4500 : 0xff8c00, isErupting ? 9 : 6);
        if (isErupting) pulseMeshesRef.current.push({ mesh, baseScale: 1, phase: i * 0.6 });
      });
    }

    if (layersEnabled.geopolitical) {
      geopolitical.filter((g) => g.category !== 'curfew').forEach((g, i) => {
        if (!g.latitude || !g.longitude) return;
        const pos = latLonToVec3(g.latitude, g.longitude, GLOBE_RADIUS + 1);
        const col = g.severity === 'critical' ? 0xff1a44 : g.severity === 'high' ? 0xff6b00 : 0xffb800;
        addPulse(pos, col, 2.0, i * 0.4, {
          type: 'geopolitical', id: g.id,
          name: `[${g.category?.toUpperCase()}] ${g.title} (${g.country || ''})`,
        });
      });
    }

    if (layersEnabled.curfews) {
      geopolitical.filter((g) => g.category === 'curfew').forEach((g) => {
        if (!g.latitude || !g.longitude) return;
        const pos = latLonToVec3(g.latitude, g.longitude, GLOBE_RADIUS + 1);
        const geo = new THREE.RingGeometry(2, 4, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xcc3300, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.userData = { type: 'curfew', id: g.id, name: `[CURFEW] ${g.title} — ${g.country || ''}` };
        markersRef.current?.add(mesh);
      });
    }

    if (layersEnabled.disasters) {
      disasters.slice(0, 40).forEach((d) => {
        if (!d.latitude || !d.longitude) return;
        const pos = latLonToVec3(d.latitude, d.longitude, GLOBE_RADIUS + 1);
        const geo = new THREE.SphereGeometry(1.6, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'disaster', id: d.id, name: d.title };
        markersRef.current?.add(mesh);
        addGlow(pos, 0xff6b00, 5);
      });
    }

    if (layersEnabled.news) {
      news.slice(0, 30).forEach((item) => {
        if (!item.latitude || !item.longitude) return;
        const pos = latLonToVec3(item.latitude, item.longitude, GLOBE_RADIUS + 1);
        const geo = new THREE.SphereGeometry(1.0, 10, 10);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00d4a0, transparent: true, opacity: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'news', id: item.id, name: item.title };
        markersRef.current?.add(mesh);
      });
    }

    if (layersEnabled.wx) {
      weatherAlerts.forEach((w) => {
        if (w.latitude == null || w.longitude == null) return;
        const pos = latLonToVec3(w.latitude, w.longitude, GLOBE_RADIUS + 1);
        const col = w.severity === 'red' ? 0xff0000 : 0xffa500;
        const geo = new THREE.OctahedronGeometry(2.0, 0);
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'wx', id: w.id, name: `WX ${w.severity.toUpperCase()} — ${w.eventLabel}: ${w.title}` };
        markersRef.current?.add(mesh);
        addGlow(pos, col, 6);
      });
    }
  }, [earthquakes, disasters, news, volcanoes, geopolitical, weatherAlerts, layersEnabled]);

  useEffect(() => {
    if (!nightOverlayRef.current || !layersEnabled.daynight) {
      if (nightOverlayRef.current) {
        (nightOverlayRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
      }
      return;
    }

    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const decl = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * (Math.PI / 180);
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    const sunLon = -((utcHour / 24) * 360 - 180);

    const terminatorPts: THREE.Vector3[] = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lonRad = ((lon - sunLon + 540) % 360 - 180) * (Math.PI / 180);
      const lat = Math.atan(-Math.cos(lonRad) / Math.tan(decl === 0 ? 0.001 : decl)) * (180 / Math.PI);
      terminatorPts.push(latLonToVec3(lat, lon, GLOBE_RADIUS + 0.6));
    }
    if (terminatorPts.length > 1) {
      const geo = new THREE.BufferGeometry().setFromPoints(terminatorPts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffd700, opacity: 0.5, transparent: true });
      const terminatorLine = new THREE.Line(geo, lineMat);
      terminatorLine.userData = { type: 'terminator' };
      globeGroupRef.current?.children
        .filter((c) => c.userData?.type === 'terminator')
        .forEach((c) => globeGroupRef.current?.remove(c));
      globeGroupRef.current?.add(terminatorLine);
    }
  }, [layersEnabled.daynight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
    autoRotateRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    if (isDraggingRef.current && globeGroupRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      globeGroupRef.current.rotation.y += dx * 0.005;
      globeGroupRef.current.rotation.x += dy * 0.005;
      globeGroupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, globeGroupRef.current.rotation.x));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!cameraRef.current || !sceneRef.current || !markersRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const hits = raycasterRef.current.intersectObjects(markersRef.current.children, false);
    if (hits.length > 0 && hits[0].object.userData?.name) {
      const name = hits[0].object.userData.name as string;
      setHoveredName(name);
      showTooltip(e.clientX, e.clientY, name);
    } else {
      setHoveredName(null);
      hideTooltip();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    autoRotateTimerRef.current = setTimeout(() => {
      autoRotateRef.current = true;
    }, 3000);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (cameraRef.current) {
      const delta = e.deltaY > 0 ? 1.08 : 0.92;
      cameraRef.current.position.z = Math.max(140, Math.min(500, cameraRef.current.position.z * delta));
    }
  };

  // Raycast a screen point against the markers and open the hit event, if any.
  const pickAt = (clientX: number, clientY: number) => {
    if (!containerRef.current || !cameraRef.current || !markersRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const hits = raycasterRef.current.intersectObjects(markersRef.current.children, false);
    if (hits.length > 0 && hits[0].object.userData?.id) {
      onEventSelect(hits[0].object.userData.id, hits[0].object.userData.type);
    }
  };

  const handleClick = (e: React.MouseEvent) => pickAt(e.clientX, e.clientY);

  // ── Touch: one finger rotates, two fingers pinch-zoom, a tap selects. ──
  // stopPropagation keeps a rotate gesture from triggering the app's edge-swipe
  // drawers (those are still reachable via the header FEED / INTEL buttons).
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (autoRotateTimerRef.current) clearTimeout(autoRotateTimerRef.current);
    autoRotateRef.current = false;
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      touchMovedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1 && isDraggingRef.current && globeGroupRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchMovedRef.current = true;
      globeGroupRef.current.rotation.y += dx * 0.005;
      globeGroupRef.current.rotation.x += dy * 0.005;
      globeGroupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, globeGroupRef.current.rotation.x));
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && cameraRef.current && pinchDistRef.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy) || 1;
      const ratio = pinchDistRef.current / dist; // spread → zoom in, pinch → out
      cameraRef.current.position.z = Math.max(140, Math.min(500, cameraRef.current.position.z * ratio));
      pinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchMovedRef.current && e.changedTouches.length > 0 && pinchDistRef.current == null) {
      pickAt(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    isDraggingRef.current = false;
    if (e.touches.length === 0) pinchDistRef.current = null;
    autoRotateTimerRef.current = setTimeout(() => { autoRotateRef.current = true; }, 3000);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Interactive 3D globe showing global intelligence events. Drag or one-finger swipe to rotate, scroll or pinch to zoom, tap a marker to open it."
        tabIndex={0}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: isDraggingRef.current ? 'grabbing' : (hoveredName ? 'pointer' : 'grab'),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />

      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 16,
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: 10,
        color: 'rgba(0,212,160,0.5)',
        letterSpacing: 2,
        pointerEvents: 'none',
      }}>
        DRAG / SWIPE TO ROTATE • SCROLL / PINCH TO ZOOM • THREAT ARCS ← NEW DELHI HUB
      </div>

      <div style={{
        position: 'absolute',
        top: 12,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        pointerEvents: 'none',
      }}>
        {[
          { col: '#ff1a44', label: 'CRITICAL GEO' },
          { col: '#ff6b00', label: 'HIGH THREAT' },
          { col: '#4d9fff', label: 'EARTHQUAKE' },
          { col: '#ff4500', label: 'VOLCANO' },
          { col: '#00bfff', label: 'VESSEL' },
          { col: '#ff6b00', label: 'CHOKEPOINT' },
          { col: '#4a9eff', label: 'MILITARY BASE' },
          { col: '#39ff88', label: 'NUCLEAR SITE' },
        ].map(({ col, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
            <span style={{ fontFamily: '"Share Tech Mono", monospace', fontSize: 9, color: 'rgba(0,212,160,0.6)', letterSpacing: 1 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
