import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Earthquake, Disaster, NewsEvent, Vessel, VolcanoEvent, GeopoliticalEvent } from '../lib/intelligence-api';
import { UNDERSEA_CABLES, CHOKEPOINTS, MILITARY_BASES, NUCLEAR_SITES } from '../lib/cable-data';
import { INDIA_OUTER_BOUNDARY, LINE_OF_CONTROL, LINE_OF_ACTUAL_CONTROL } from '../lib/india-boundary';

interface Globe3DProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  vessels: Vessel[];
  volcanoes: VolcanoEvent[];
  geopolitical: GeopoliticalEvent[];
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
    vessels: boolean;
    volcanoes: boolean;
    geopolitical: boolean;
    curfews: boolean;
  };
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
}

const GLOBE_RADIUS = 100;

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

export function Globe3D({
  earthquakes,
  disasters,
  news,
  vessels,
  volcanoes,
  geopolitical,
  onEventSelect,
  layersEnabled,
  showTooltip,
  hideTooltip,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const countryLinesRef = useRef<THREE.Group | null>(null);
  const nightOverlayRef = useRef<THREE.Mesh | null>(null);
  const animFrameRef = useRef<number>(0);
  const pulseMeshesRef = useRef<Array<{ mesh: THREE.Mesh; baseScale: number; phase: number }>>([]);

  const isDraggingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const autoRotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const buildScene = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020c18);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2000);
    camera.position.z = 280;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const starCount = 2000;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 800 + Math.random() * 200;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.7, transparent: true, opacity: 0.7 });
    scene.add(new THREE.Points(starGeo, starMat));

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
    sunLight.position.set(300, 100, 200);
    scene.add(sunLight);
    const ambLight = new THREE.AmbientLight(0x112244, 0.8);
    scene.add(ambLight);

    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x0a2240,
      emissive: 0x03101e,
      shininess: 25,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globeMesh);

    const atmGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 3.5, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      uniforms: { sunDir: { value: new THREE.Vector3(300, 100, 200).normalize() } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vPos));
          rim = pow(rim, 2.5);
          gl_FragColor = vec4(0.1, 0.55, 1.0, rim * 0.55);
        }
      `,
    });
    globeGroup.add(new THREE.Mesh(atmGeo, atmMat));

    const gridMat = new THREE.LineBasicMaterial({ color: 0x00d4a0, opacity: 0.08, transparent: true });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts: THREE.Vector3[] = [];
      for (let lon = -180; lon <= 180; lon += 3) pts.push(latLonToVec3(lat, lon, GLOBE_RADIUS + 0.3));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 3) pts.push(latLonToVec3(lat, lon, GLOBE_RADIUS + 0.3));
      globeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
    }

    const countryLines = new THREE.Group();
    globeGroup.add(countryLines);
    countryLinesRef.current = countryLines;

    const nightGeo = new THREE.SphereGeometry(GLOBE_RADIUS + 0.4, 64, 64);
    const nightMat = new THREE.MeshBasicMaterial({
      color: 0x000610,
      transparent: true,
      opacity: 0.0,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const nightOverlay = new THREE.Mesh(nightGeo, nightMat);
    globeGroup.add(nightOverlay);
    nightOverlayRef.current = nightOverlay;

    const markersGroup = new THREE.Group();
    globeGroup.add(markersGroup);
    markersRef.current = markersGroup;

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then((r) => r.json())
      .then((worldData) => {
        const geos = buildCountryGeometry(worldData);
        const borderMat = new THREE.LineBasicMaterial({ color: 0x00d4a0, opacity: 0.4, transparent: true });
        geos.forEach((geo) => {
          const line = new THREE.Line(geo, borderMat);
          countryLinesRef.current?.add(line);
        });

        const indiaOuterPts = INDIA_OUTER_BOUNDARY.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 0.35));
        if (indiaOuterPts.length > 1) {
          indiaOuterPts.push(indiaOuterPts[0]);
          const indiaGeo = new THREE.BufferGeometry().setFromPoints(indiaOuterPts);
          const indiaMat = new THREE.LineBasicMaterial({ color: 0x2a7a5a, opacity: 0.85, transparent: true });
          const indiaLine = new THREE.Line(indiaGeo, indiaMat);
          indiaLine.userData = { type: 'india-boundary' };
          countryLinesRef.current?.add(indiaLine);
        }

        const locPts = LINE_OF_CONTROL.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 0.4));
        if (locPts.length > 1) {
          const locGeo = new THREE.BufferGeometry().setFromPoints(locPts);
          const locMat = new THREE.LineDashedMaterial({ color: 0x6fa8dc, dashSize: 1.5, gapSize: 1.0, opacity: 0.8, transparent: true });
          const locLine = new THREE.Line(locGeo, locMat);
          locLine.computeLineDistances();
          locLine.userData = { type: 'india-loc' };
          countryLinesRef.current?.add(locLine);
        }

        const lacPts = LINE_OF_ACTUAL_CONTROL.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 0.4));
        if (lacPts.length > 1) {
          const lacGeo = new THREE.BufferGeometry().setFromPoints(lacPts);
          const lacMat = new THREE.LineDashedMaterial({ color: 0xa4c2f4, dashSize: 1.5, gapSize: 1.0, opacity: 0.8, transparent: true });
          const lacLine = new THREE.Line(lacGeo, lacMat);
          lacLine.computeLineDistances();
          lacLine.userData = { type: 'india-lac' };
          countryLinesRef.current?.add(lacLine);
        }
      })
      .catch(() => {});

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let t = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      t += 0.016;

      if (autoRotateRef.current && !isDraggingRef.current) {
        globeGroup.rotation.y += 0.0008;
      }

      if (markersRef.current) {
        for (const { mesh, baseScale, phase } of pulseMeshesRef.current) {
          const s = baseScale * (1 + 0.25 * Math.sin(t * 2.5 + phase));
          mesh.scale.setScalar(s);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const cleanup = buildScene();
    return cleanup;
  }, [buildScene]);

  useEffect(() => {
    if (!markersRef.current || !globeGroupRef.current) return;

    const disposeChildren = (parent: THREE.Object3D) => {
      while (parent.children.length > 0) {
        const child = parent.children[0];
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        if ((child as THREE.Mesh).material) {
          const m = (child as THREE.Mesh).material;
          Array.isArray(m) ? m.forEach(x => x.dispose()) : (m as THREE.Material).dispose();
        }
        parent.remove(child);
      }
    };

    disposeChildren(markersRef.current);
    pulseMeshesRef.current = [];

    const addPulse = (pos: THREE.Vector3, color: number, baseScale: number, phase: number, userData: any) => {
      const geo = new THREE.SphereGeometry(1, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.scale.setScalar(baseScale);
      mesh.userData = userData;
      markersRef.current?.add(mesh);
      pulseMeshesRef.current.push({ mesh, baseScale, phase: phase });

      const ringGeo = new THREE.RingGeometry(1.2, 2.0, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      markersRef.current?.add(ring);
    };

    if (layersEnabled.cables) {
      UNDERSEA_CABLES.forEach((cable) => {
        const pts = cable.points.map(([lon, lat]) => latLonToVec3(lat, lon, GLOBE_RADIUS + 0.5));
        if (pts.length < 2) return;
        const curve = new THREE.CatmullRomCurve3(pts);
        const curvePts = curve.getPoints(pts.length * 8);
        const geo = new THREE.BufferGeometry().setFromPoints(curvePts);
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color(cable.color),
          transparent: true,
          opacity: 0.6,
        });
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
        const mat = new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'military', name: `${b.name} [${b.type}]` };
        markersRef.current?.add(mesh);
        pulseMeshesRef.current.push({ mesh, baseScale: 1, phase: i * 0.5 });
      });
    }

    if (layersEnabled.nuclear) {
      NUCLEAR_SITES.forEach((s, i) => {
        const pos = latLonToVec3(s.lat, s.lon, GLOBE_RADIUS + 1);
        const geo = new THREE.ConeGeometry(1.8, 4, 3);
        const col = s.status === 'STRUCK' ? 0xff0040 : s.status === 'SUSPECTED' ? 0xffee00 : 0x39ff88;
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI);
        mesh.userData = { type: 'nuclear', name: `${s.name} [${s.status}]` };
        markersRef.current?.add(mesh);
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
        const mat = new THREE.MeshBasicMaterial({ color: isErupting ? 0xff4500 : 0xff8c00, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI);
        mesh.userData = { type: 'volcano', id: v.id, name: `[${v.status?.toUpperCase()}] ${v.name}` };
        markersRef.current?.add(mesh);
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

    if (layersEnabled.vessels) {
      vessels.forEach((v) => {
        if (!v.latitude || !v.longitude) return;
        const pos = latLonToVec3(v.latitude, v.longitude, GLOBE_RADIUS + 1);
        const col = v.type === 'Military' ? 0xff2255 : v.type === 'Tanker' ? 0xffb800 : 0x00bfff;
        const geo = new THREE.ConeGeometry(0.9, 2.8, 3);
        const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI);
        mesh.userData = { type: 'vessel', id: v.id, name: `${v.name} [${v.type}] → ${v.destination || '?'}` };
        markersRef.current?.add(mesh);
      });
    }

    if (layersEnabled.disasters) {
      disasters.slice(0, 40).forEach((d) => {
        if (!d.latitude || !d.longitude) return;
        const pos = latLonToVec3(d.latitude, d.longitude, GLOBE_RADIUS + 1);
        const geo = new THREE.SphereGeometry(1.6, 12, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0.75 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'disaster', id: d.id, name: d.title };
        markersRef.current?.add(mesh);
      });
    }

    if (layersEnabled.news) {
      news.slice(0, 30).forEach((item) => {
        if (!item.latitude || !item.longitude) return;
        const pos = latLonToVec3(item.latitude, item.longitude, GLOBE_RADIUS + 1);
        const geo = new THREE.SphereGeometry(1.0, 10, 10);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00d4a0, transparent: true, opacity: 0.65 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { type: 'news', id: item.id, name: item.title };
        markersRef.current?.add(mesh);
      });
    }
  }, [earthquakes, disasters, news, vessels, volcanoes, geopolitical, layersEnabled]);

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

    const mat = nightOverlayRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.0;

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

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !markersRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const hits = raycasterRef.current.intersectObjects(markersRef.current.children, false);
    if (hits.length > 0 && hits[0].object.userData?.id) {
      onEventSelect(hits[0].object.userData.id, hits[0].object.userData.type);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Interactive 3D globe showing global intelligence events. Use mouse to rotate and zoom."
        tabIndex={0}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDraggingRef.current ? 'grabbing' : (hoveredName ? 'pointer' : 'grab'),
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
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
        DRAG TO ROTATE • SCROLL TO ZOOM
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
