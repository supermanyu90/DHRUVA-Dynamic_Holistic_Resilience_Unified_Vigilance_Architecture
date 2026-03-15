import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Earthquake, Disaster, NewsEvent } from '../lib/intelligence-api';
import { UNDERSEA_CABLES } from '../lib/cable-data';

interface Globe3DProps {
  earthquakes: Earthquake[];
  disasters: Disaster[];
  news: NewsEvent[];
  onEventSelect: (id: string, type: string) => void;
  layersEnabled: {
    earthquakes: boolean;
    disasters: boolean;
    news: boolean;
    cables: boolean;
    military: boolean;
    nuclear: boolean;
    chokepoints: boolean;
  };
  showTooltip: (x: number, y: number, content: string) => void;
  hideTooltip: () => void;
}

export function Globe3D({
  earthquakes,
  disasters,
  news,
  onEventSelect,
  layersEnabled,
  showTooltip,
  hideTooltip,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeRef = useRef<THREE.Mesh | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const autoRotateSpeedRef = useRef(0.001);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const chokepoints = [
    { name: 'Strait of Hormuz', lat: 26.5, lon: 56.25 },
    { name: 'Suez Canal', lat: 30.5, lon: 32.35 },
    { name: 'Strait of Malacca', lat: 2.5, lon: 101.25 },
    { name: 'Bab el-Mandeb', lat: 12.5, lon: 43.3 },
    { name: 'Panama Canal', lat: 9, lon: -79.5 },
  ];

  const militaryBases = [
    { name: 'Diego Garcia', lat: -7.3, lon: 72.4 },
    { name: 'Guam', lat: 13.4, lon: 144.8 },
    { name: 'Djibouti', lat: 11.6, lon: 43.1 },
  ];

  const nuclearSites = [
    { name: 'Pokhran', lat: 27.1, lon: 71.7 },
    { name: 'Los Alamos', lat: 35.9, lon: -106.3 },
  ];

  const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1c30);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 300;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const globeGeometry = new THREE.SphereGeometry(100, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x0d2a45,
      emissive: 0x001a2e,
      shininess: 10,
      transparent: true,
      opacity: 0.95,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    globeRef.current = globe;

    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x00d4a0, opacity: 0.15, transparent: true });

    for (let lat = -80; lat <= 80; lat += 20) {
      const curve = new THREE.EllipseCurve(0, 0, 100, 100, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(64);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const ellipse = new THREE.Line(geometry, gridMaterial);
      ellipse.rotation.x = Math.PI / 2;
      ellipse.position.y = Math.sin((lat * Math.PI) / 180) * 100;
      ellipse.scale.set(Math.cos((lat * Math.PI) / 180), Math.cos((lat * Math.PI) / 180), 1);
      globe.add(ellipse);
    }

    for (let lon = 0; lon < 360; lon += 30) {
      const curve = new THREE.EllipseCurve(0, 0, 100, 100, 0, 2 * Math.PI, false, 0);
      const points = curve.getPoints(64);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const meridian = new THREE.Line(geometry, gridMaterial);
      meridian.rotation.y = (lon * Math.PI) / 180;
      globe.add(meridian);
    }

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersRef.current = markersGroup;

    const animate = () => {
      requestAnimationFrame(animate);

      if (isAutoRotating && !isDragging) {
        globe.rotation.y += autoRotateSpeedRef.current;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!markersRef.current) return;

    while (markersRef.current.children.length > 0) {
      markersRef.current.remove(markersRef.current.children[0]);
    }

    if (layersEnabled.chokepoints) {
      chokepoints.forEach((point) => {
        const pos = latLonToVector3(point.lat, point.lon, 101);
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0.9 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        marker.userData = { type: 'chokepoint', name: point.name };
        markersRef.current?.add(marker);
      });
    }

    if (layersEnabled.military) {
      militaryBases.forEach((base) => {
        const pos = latLonToVector3(base.lat, base.lon, 101);
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.9 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        marker.userData = { type: 'military', name: base.name };
        markersRef.current?.add(marker);
      });
    }

    if (layersEnabled.nuclear) {
      nuclearSites.forEach((site) => {
        const pos = latLonToVector3(site.lat, site.lon, 101);
        const geometry = new THREE.ConeGeometry(1.5, 3, 3);
        const material = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.9 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        marker.userData = { type: 'nuclear', name: site.name };
        markersRef.current?.add(marker);
      });
    }

    if (layersEnabled.cables) {
      UNDERSEA_CABLES.forEach((cable) => {
        const cablePoints = cable.points.map(([lon, lat]) => latLonToVector3(lat, lon, 100.5));
        const curve = new THREE.CatmullRomCurve3(cablePoints);
        const points = curve.getPoints(cable.points.length * 10);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(cable.color),
          transparent: true,
          opacity: 0.55,
          linewidth: 1,
        });
        const cableLine = new THREE.Line(geometry, material);
        cableLine.userData = { type: 'cable', name: cable.name };
        markersRef.current?.add(cableLine);
      });
    }

    if (layersEnabled.earthquakes) {
      earthquakes.forEach((eq) => {
        const pos = latLonToVector3(eq.latitude, eq.longitude, 101);
        const radius = Math.max(1, eq.magnitude * 0.6);
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
          color: 0x4d9fff,
          transparent: true,
          opacity: 0.6 + eq.magnitude / 20,
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        marker.userData = { type: 'earthquake', id: eq.id, name: `M${eq.magnitude.toFixed(1)} - ${eq.location}` };
        markersRef.current?.add(marker);
      });
    }

    if (layersEnabled.disasters) {
      disasters.slice(0, 30).forEach((disaster) => {
        const randomLat = Math.random() * 140 - 70;
        const randomLon = Math.random() * 300 - 150;
        const pos = latLonToVector3(randomLat, randomLon, 101);
        const geometry = new THREE.SphereGeometry(1.5, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0.7 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        marker.userData = { type: 'disaster', id: disaster.id, name: disaster.title };
        markersRef.current?.add(marker);
      });
    }

    if (layersEnabled.news) {
      news.slice(0, 20).forEach((item) => {
        const randomLat = Math.random() * 140 - 70;
        const randomLon = Math.random() * 300 - 150;
        const pos = latLonToVector3(randomLat, randomLon, 101);
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0x00d4a0, transparent: true, opacity: 0.6 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(pos);
        marker.userData = { type: 'news', id: item.id, name: item.title };
        markersRef.current?.add(marker);
      });
    }
  }, [earthquakes, disasters, news, layersEnabled]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && globeRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      globeRef.current.rotation.y += deltaX * 0.005;
      globeRef.current.rotation.x += deltaY * 0.005;

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => setIsAutoRotating(true), 3000);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (cameraRef.current) {
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      cameraRef.current.position.z = Math.max(150, Math.min(500, cameraRef.current.position.z * delta));
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current || !markersRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(markersRef.current.children);

    if (intersects.length > 0) {
      const marker = intersects[0].object;
      const userData = marker.userData;
      if (userData.id) {
        onEventSelect(userData.id, userData.type);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
    />
  );
}
