import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingModel, RoomModel } from '@buildplanner/building-model';
import { formatLength } from '@buildplanner/units';
import { Sun, Eye, RotateCcw, Compass, Tag, Home, Layers } from 'lucide-react';

interface Editor3DViewportProps {
  model: BuildingModel;
  activeLevelIndex?: number;
}

/**
 * Creates a high-resolution, crisp canvas texture sprite for 3D world labels.
 */
function createTextSprite(
  text: string,
  options?: {
    fontSize?: number;
    textColor?: string;
    bgColor?: string;
    borderColor?: string;
    scaleWidth?: number;
    scaleHeight?: number;
  }
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    if (options?.bgColor) {
      ctx.fillStyle = options.bgColor;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(8, 8, 496, 112, 16);
      } else {
        ctx.rect(8, 8, 496, 112);
      }
      ctx.fill();
      if (options?.borderColor) {
        ctx.strokeStyle = options.borderColor;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    }

    ctx.font = `bold ${options?.fontSize || 36}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = options?.textColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(options?.scaleWidth || 2800, options?.scaleHeight || 700, 1);
  return sprite;
}

export const Editor3DViewport: React.FC<Editor3DViewportProps> = ({
  model,
  activeLevelIndex = 0
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [isolatedFloor, setIsolatedFloor] = useState<number | 'ALL'>('ALL');
  const [sunlightTime, setSunlightTime] = useState<number>(14); // 2 PM default
  const [xRayMode, setXRayMode] = useState<boolean>(false);
  const [showRoomLabels, setShowRoomLabels] = useState<boolean>(true);
  const [showRoof, setShowRoof] = useState<boolean>(false); // default false so top floor view is completely visible from above!

  const plotW = model.site.dimensionsMm.width;
  const plotL = model.site.dimensionsMm.length;

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 600;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.00002);

    const camera = new THREE.PerspectiveCamera(45, width / height, 100, 120000);
    cameraRef.current = camera;

    // Target center of plot
    const targetX = plotW / 2;
    const targetY = 2500;
    const targetZ = plotL / 2;

    // Position camera diagonally overlooking the plot
    camera.position.set(plotW * 1.9, 16000, plotL * 2.3);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clean previous canvases
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    // 3. OrbitControls Integration
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 3000;
    controls.maxDistance = 100000;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below ground
    controls.target.set(targetX, targetY, targetZ);
    controls.update();

    // 4. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    const angleRad = ((sunlightTime - 6) / 12) * Math.PI;
    dirLight.position.set(
      plotW / 2 + Math.cos(angleRad) * 30000,
      Math.sin(angleRad) * 35000 + 5000,
      plotL / 2 + 15000
    );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1000;
    dirLight.shadow.camera.far = 80000;
    const d = 35000;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 5. Ground Baseplate & Site Envelope
    const groundGeo = new THREE.PlaneGeometry(plotW * 4.5, plotL * 4.5);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.95,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(plotW / 2, -15, plotL / 2);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Plot Base Slab
    const siteBoundsGeo = new THREE.BoxGeometry(plotW, 40, plotL);
    const siteBoundsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const siteMesh = new THREE.Mesh(siteBoundsGeo, siteBoundsMat);
    siteMesh.position.set(plotW / 2, 20, plotL / 2);
    siteMesh.receiveShadow = true;
    scene.add(siteMesh);

    // Setback Lawn (Green Grass Area)
    const sb = model.site.setbacksMm || { front: 1500, rear: 1000, side1: 1000, side2: 1000 };
    const buildW = plotW - sb.side1 - sb.side2;
    const buildL = plotL - sb.front - sb.rear;

    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
    const lawnGeo = new THREE.PlaneGeometry(plotW - 200, plotL - 200);
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMat);
    lawnMesh.rotation.x = -Math.PI / 2;
    lawnMesh.position.set(plotW / 2, 42, plotL / 2);
    lawnMesh.receiveShadow = true;
    scene.add(lawnMesh);

    // Driveway Pavers (from Main Gate to Parking Space)
    const parkPos = model.parkingSpaces.length > 0 ? model.parkingSpaces[0].positionMm : { x: sb.side1, y: sb.front };
    const drivewayGeo = new THREE.PlaneGeometry(3200, sb.front + 800);
    const drivewayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const drivewayMesh = new THREE.Mesh(drivewayGeo, drivewayMat);
    drivewayMesh.rotation.x = -Math.PI / 2;
    drivewayMesh.position.set(parkPos.x + 1600, 45, sb.front / 2);
    drivewayMesh.receiveShadow = true;
    scene.add(drivewayMesh);

    // 6. 3D ABUTTING ROADS & ROAD NAME BADGES
    const roadsGroup = new THREE.Group();
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x475569 });

    // NORTH ROAD
    if (model.site.roads.NORTH.enabled) {
      const rw = model.site.roads.NORTH.widthMm || 9144;
      const roadGeo = new THREE.PlaneGeometry(plotW + 10000, rw);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(plotW / 2, 2, -rw / 2 - 200);
      roadMesh.receiveShadow = true;
      roadsGroup.add(roadMesh);

      // Yellow Center Line
      const centerLine = new THREE.Mesh(new THREE.BoxGeometry(plotW + 10000, 4, 160), lineMat);
      centerLine.position.set(plotW / 2, 5, -rw / 2 - 200);
      roadsGroup.add(centerLine);

      // Concrete Curb
      const curb = new THREE.Mesh(new THREE.BoxGeometry(plotW + 10000, 80, 200), curbMat);
      curb.position.set(plotW / 2, 40, -100);
      curb.castShadow = true;
      roadsGroup.add(curb);

      // 3D Road Label Sprite
      const labelText = `NORTH ROAD (${formatLength(rw)} WIDE)`;
      const sprite = createTextSprite(labelText, {
        fontSize: 34,
        textColor: '#e2e8f0',
        bgColor: '#0f172a',
        borderColor: '#38bdf8',
        scaleWidth: 4500,
        scaleHeight: 1100
      });
      sprite.position.set(plotW / 2, 800, -rw / 2 - 200);
      roadsGroup.add(sprite);
    }

    // WEST ROAD
    if (model.site.roads.WEST.enabled) {
      const rw = model.site.roads.WEST.widthMm || 12192;
      const roadGeo = new THREE.PlaneGeometry(rw, plotL + 10000);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(-rw / 2 - 200, 2, plotL / 2);
      roadMesh.receiveShadow = true;
      roadsGroup.add(roadMesh);

      // Yellow Center Line
      const centerLine = new THREE.Mesh(new THREE.BoxGeometry(160, 4, plotL + 10000), lineMat);
      centerLine.position.set(-rw / 2 - 200, 5, plotL / 2);
      roadsGroup.add(centerLine);

      // Concrete Curb
      const curb = new THREE.Mesh(new THREE.BoxGeometry(200, 80, plotL + 10000), curbMat);
      curb.position.set(-100, 40, plotL / 2);
      curb.castShadow = true;
      roadsGroup.add(curb);

      // 3D Road Label Sprite
      const labelText = `WEST ROAD (${formatLength(rw)} WIDE)`;
      const sprite = createTextSprite(labelText, {
        fontSize: 34,
        textColor: '#e2e8f0',
        bgColor: '#0f172a',
        borderColor: '#38bdf8',
        scaleWidth: 4500,
        scaleHeight: 1100
      });
      sprite.position.set(-rw / 2 - 200, 800, plotL / 2);
      roadsGroup.add(sprite);
    }

    // SOUTH ROAD
    if (model.site.roads.SOUTH.enabled) {
      const rw = model.site.roads.SOUTH.widthMm || 9144;
      const roadGeo = new THREE.PlaneGeometry(plotW + 10000, rw);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(plotW / 2, 2, plotL + rw / 2 + 200);
      roadMesh.receiveShadow = true;
      roadsGroup.add(roadMesh);

      const labelText = `SOUTH ROAD (${formatLength(rw)} WIDE)`;
      const sprite = createTextSprite(labelText, {
        fontSize: 34,
        textColor: '#e2e8f0',
        bgColor: '#0f172a',
        borderColor: '#38bdf8',
        scaleWidth: 4500,
        scaleHeight: 1100
      });
      sprite.position.set(plotW / 2, 800, plotL + rw / 2 + 200);
      roadsGroup.add(sprite);
    }

    // EAST ROAD
    if (model.site.roads.EAST.enabled) {
      const rw = model.site.roads.EAST.widthMm || 9144;
      const roadGeo = new THREE.PlaneGeometry(rw, plotL + 10000);
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(plotW + rw / 2 + 200, 2, plotL / 2);
      roadMesh.receiveShadow = true;
      roadsGroup.add(roadMesh);

      const labelText = `EAST ROAD (${formatLength(rw)} WIDE)`;
      const sprite = createTextSprite(labelText, {
        fontSize: 34,
        textColor: '#e2e8f0',
        bgColor: '#0f172a',
        borderColor: '#38bdf8',
        scaleWidth: 4500,
        scaleHeight: 1100
      });
      sprite.position.set(plotW + rw / 2 + 200, 800, plotL / 2);
      roadsGroup.add(sprite);
    }

    scene.add(roadsGroup);

    // 7. 3D PERIMETER BOUNDARY WALL & MAIN GATE PILLARS
    const perimeterGroup = new THREE.Group();
    const boundaryWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
    const capLightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xeab308, emissiveIntensity: 0.6 });
    const gateLeafMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7 });

    const wallHeight = 1200;
    const wallThick = 180;

    // Main Gate Opening along Front (North) Wall
    const gateStartX = parkPos.x;
    const gateWidth = 3200;
    const gateEndX = gateStartX + gateWidth;

    // Front Boundary Wall (left of gate)
    if (gateStartX > 200) {
      const wallGeo = new THREE.BoxGeometry(gateStartX, wallHeight, wallThick);
      const wallMesh = new THREE.Mesh(wallGeo, boundaryWallMat);
      wallMesh.position.set(gateStartX / 2, wallHeight / 2 + 40, wallThick / 2);
      wallMesh.castShadow = true;
      perimeterGroup.add(wallMesh);
    }

    // Front Boundary Wall (right of gate)
    if (plotW - gateEndX > 200) {
      const wallGeo = new THREE.BoxGeometry(plotW - gateEndX, wallHeight, wallThick);
      const wallMesh = new THREE.Mesh(wallGeo, boundaryWallMat);
      wallMesh.position.set(gateEndX + (plotW - gateEndX) / 2, wallHeight / 2 + 40, wallThick / 2);
      wallMesh.castShadow = true;
      perimeterGroup.add(wallMesh);
    }

    // Rear Wall (South)
    const rearWallGeo = new THREE.BoxGeometry(plotW, wallHeight, wallThick);
    const rearWallMesh = new THREE.Mesh(rearWallGeo, boundaryWallMat);
    rearWallMesh.position.set(plotW / 2, wallHeight / 2 + 40, plotL - wallThick / 2);
    rearWallMesh.castShadow = true;
    perimeterGroup.add(rearWallMesh);

    // Left Wall (West)
    const leftWallGeo = new THREE.BoxGeometry(wallThick, wallHeight, plotL);
    const leftWallMesh = new THREE.Mesh(leftWallGeo, boundaryWallMat);
    leftWallMesh.position.set(wallThick / 2, wallHeight / 2 + 40, plotL / 2);
    leftWallMesh.castShadow = true;
    perimeterGroup.add(leftWallMesh);

    // Right Wall (East)
    const rightWallGeo = new THREE.BoxGeometry(wallThick, wallHeight, plotL);
    const rightWallMesh = new THREE.Mesh(rightWallGeo, boundaryWallMat);
    rightWallMesh.position.set(plotW - wallThick / 2, wallHeight / 2 + 40, plotL / 2);
    rightWallMesh.castShadow = true;
    perimeterGroup.add(rightWallMesh);

    // MAIN GATE PILLARS & OPEN LEAVES
    [gateStartX, gateEndX].forEach((px, i) => {
      // Grand Pillar
      const pillarGeo = new THREE.BoxGeometry(450, 2200, 450);
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.set(px, 1100, 225);
      pillarMesh.castShadow = true;
      perimeterGroup.add(pillarMesh);

      // Light Cap
      const capGeo = new THREE.BoxGeometry(520, 150, 520);
      const capMesh = new THREE.Mesh(capGeo, capLightMat);
      capMesh.position.set(px, 2275, 225);
      perimeterGroup.add(capMesh);

      // Open Gate Leaf
      const leafGeo = new THREE.BoxGeometry(1500, 1600, 60);
      const leafMesh = new THREE.Mesh(leafGeo, gateLeafMat);
      // Pivot angled open into setback
      const angle = i === 0 ? Math.PI / 3 : -Math.PI / 3;
      leafMesh.position.set(
        px + (i === 0 ? 750 * Math.cos(angle) : -750 * Math.cos(angle)),
        800,
        225 + 750 * Math.sin(Math.abs(angle))
      );
      leafMesh.rotation.y = angle;
      leafMesh.castShadow = true;
      perimeterGroup.add(leafMesh);
    });

    // Main Gate Badge Sprite
    const gateSprite = createTextSprite('🚪 MAIN ENTRANCE GATE', {
      fontSize: 34,
      textColor: '#38bdf8',
      bgColor: '#0f172a',
      borderColor: '#38bdf8',
      scaleWidth: 3800,
      scaleHeight: 950
    });
    gateSprite.position.set(gateStartX + gateWidth / 2, 2800, 225);
    perimeterGroup.add(gateSprite);

    scene.add(perimeterGroup);

    // 8. 3D CARDINAL COMPASS ROSE & NORTH INDICATOR
    const compassGroup = new THREE.Group();
    const compassX = plotW + 2800;
    const compassZ = -1200;

    // Outer Ring
    const ringGeo = new THREE.TorusGeometry(1200, 50, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(compassX, 40, compassZ);
    compassGroup.add(ringMesh);

    // Base Disc
    const discGeo = new THREE.CylinderGeometry(1200, 1200, 20, 32);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    discMesh.position.set(compassX, 20, compassZ);
    compassGroup.add(discMesh);

    // North Cone Needle (Red)
    const northConeGeo = new THREE.ConeGeometry(320, 1100, 4);
    const northConeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.5, roughness: 0.3 });
    const northConeMesh = new THREE.Mesh(northConeGeo, northConeMat);
    northConeMesh.rotation.x = Math.PI / 2;
    northConeMesh.rotation.z = Math.PI;
    northConeMesh.position.set(compassX, 40, compassZ - 550);
    compassGroup.add(northConeMesh);

    // South Cone Needle (Silver)
    const southConeGeo = new THREE.ConeGeometry(240, 850, 4);
    const southConeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.3 });
    const southConeMesh = new THREE.Mesh(southConeGeo, southConeMat);
    southConeMesh.rotation.x = Math.PI / 2;
    southConeMesh.position.set(compassX, 40, compassZ + 425);
    compassGroup.add(southConeMesh);

    // Direction Letter Badges (N, S, E, W)
    const nBadge = createTextSprite('N', { fontSize: 50, textColor: '#ef4444', bgColor: '#0f172a', scaleWidth: 1200, scaleHeight: 1200 });
    nBadge.position.set(compassX, 500, compassZ - 1500);
    compassGroup.add(nBadge);

    const sBadge = createTextSprite('S', { fontSize: 50, textColor: '#94a3b8', bgColor: '#0f172a', scaleWidth: 1200, scaleHeight: 1200 });
    sBadge.position.set(compassX, 500, compassZ + 1500);
    compassGroup.add(sBadge);

    const eBadge = createTextSprite('E', { fontSize: 50, textColor: '#cbd5e1', bgColor: '#0f172a', scaleWidth: 1200, scaleHeight: 1200 });
    eBadge.position.set(compassX + 1500, 500, compassZ);
    compassGroup.add(eBadge);

    const wBadge = createTextSprite('W', { fontSize: 50, textColor: '#cbd5e1', bgColor: '#0f172a', scaleWidth: 1200, scaleHeight: 1200 });
    wBadge.position.set(compassX - 1500, 500, compassZ);
    compassGroup.add(wBadge);

    // Rotate compass based on model.site.orientationNorthDegrees
    const orientRad = ((model.site.orientationNorthDegrees || 0) * Math.PI) / 180;
    compassGroup.rotation.y = -orientRad;

    scene.add(compassGroup);

    // 9. Materials for Building
    const wallOpacity = xRayMode ? 0.4 : 1.0;
    const exteriorWallMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.7,
      metalness: 0.05,
      transparent: xRayMode,
      opacity: wallOpacity
    });
    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.8,
      metalness: 0.05,
      transparent: xRayMode,
      opacity: wallOpacity
    });
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.85,
      opacity: 0.7,
      transparent: true,
      roughness: 0.1,
      ior: 1.5
    });

    // 10. Build 3D Building Group (Floors, Walls, Windows, Room Badges)
    const buildingGroup = new THREE.Group();

    model.levels.forEach((lvl) => {
      if (isolatedFloor !== 'ALL' && lvl.levelIndex !== isolatedFloor) return;

      const levelElevation = lvl.elevationMm;

      // Floor Slab
      const slabGeo = new THREE.BoxGeometry(buildW + 200, 150, buildL + 200);
      const slabMesh = new THREE.Mesh(slabGeo, slabMat);
      slabMesh.position.set(
        sb.side1 + buildW / 2,
        levelElevation + 75,
        sb.front + buildL / 2
      );
      slabMesh.receiveShadow = true;
      slabMesh.castShadow = true;
      buildingGroup.add(slabMesh);

      // Walls
      lvl.walls.forEach((wall) => {
        const dx = wall.endPoint.x - wall.startPoint.x;
        const dz = wall.endPoint.y - wall.startPoint.y;
        const length = Math.hypot(dx, dz);
        const angle = Math.atan2(dz, dx);

        const wallGeo = new THREE.BoxGeometry(length, wall.heightMm, wall.thicknessMm);
        const mat = wall.isExterior ? exteriorWallMat : interiorWallMat;
        const wallMesh = new THREE.Mesh(wallGeo, mat);

        wallMesh.position.set(
          wall.startPoint.x + dx / 2,
          levelElevation + wall.heightMm / 2 + 150,
          wall.startPoint.y + dz / 2
        );
        wallMesh.rotation.y = -angle;
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;
        buildingGroup.add(wallMesh);
      });

      // Windows (3D Glass Panes)
      lvl.windows.forEach((win) => {
        const winGeo = new THREE.BoxGeometry(win.widthMm, win.heightMm, 60);
        const winMesh = new THREE.Mesh(winGeo, glassMat);
        winMesh.position.set(
          win.positionMm.x + win.widthMm / 2,
          levelElevation + win.sillHeightMm + win.heightMm / 2 + 150,
          win.positionMm.y
        );
        buildingGroup.add(winMesh);
      });

      // 3D Room Name & Vastu Badges (when toggled ON)
      if (showRoomLabels) {
        lvl.rooms.forEach((room: RoomModel) => {
          const cx = room.bounds.minX + room.bounds.widthMm / 2;
          const cz = room.bounds.minY + room.bounds.lengthMm / 2;
          const vastuTag = room.vastuZone ? ` (${room.vastuZone})` : '';
          const labelStr = `${room.name.toUpperCase()}${vastuTag}`;

          const roomBadge = createTextSprite(labelStr, {
            fontSize: 32,
            textColor: '#ffffff',
            bgColor: 'rgba(15, 23, 42, 0.85)',
            borderColor: '#38bdf8',
            scaleWidth: 2600,
            scaleHeight: 650
          });
          roomBadge.position.set(cx, levelElevation + 1400, cz);
          buildingGroup.add(roomBadge);
        });
      }
    });

    // 11. Roof Slab (ONLY when showRoof is true AND isolatedFloor === 'ALL')
    // When isolatedFloor is ANY specific floor, or when showRoof is false, the roof is open so top floor rooms are visible from above!
    if (showRoof && isolatedFloor === 'ALL') {
      const roofElevation = model.levels.length * 3000 + 150;
      const roofSlabGeo = new THREE.BoxGeometry(buildW, 150, buildL);
      const roofMesh = new THREE.Mesh(roofSlabGeo, slabMat);
      roofMesh.position.set(
        sb.side1 + buildW / 2,
        roofElevation,
        sb.front + buildL / 2
      );
      roofMesh.castShadow = true;
      buildingGroup.add(roofMesh);
    }

    // 12. 3D Staircase Steps & Core Railings (Supports U-Shape, Straight & L-Shaped)
    model.staircases.forEach((stair) => {
      const sx = stair.startPoint.x;
      const sy = stair.startPoint.y;
      const sw = stair.dimensionsMm.width;
      const sl = stair.dimensionsMm.length;
      const type = stair.type || 'DOG_LEGGED_U';
      const numSteps = stair.stepCount || 18;

      model.levels.forEach((lvl) => {
        if (isolatedFloor !== 'ALL' && lvl.levelIndex !== isolatedFloor) return;
        const baseElev = lvl.elevationMm + 150;
        const stepH = lvl.heightMm / numSteps;

        if (type === 'DOG_LEGGED_U') {
          const stepL = (sl - stair.landingWidthMm) / (numSteps / 2);
          for (let i = 0; i < numSteps / 2; i++) {
            // Flight 1 (Ascending)
            const step1 = new THREE.Mesh(new THREE.BoxGeometry(sw / 2 - 40, stepH, stepL), slabMat);
            step1.position.set(sx + sw / 4, baseElev + i * stepH + stepH / 2, sy + i * stepL + stepL / 2);
            step1.castShadow = true;
            buildingGroup.add(step1);

            // Flight 2 (Return)
            const step2 = new THREE.Mesh(new THREE.BoxGeometry(sw / 2 - 40, stepH, stepL), slabMat);
            step2.position.set(sx + (sw * 3) / 4, baseElev + (numSteps / 2 + i) * stepH + stepH / 2, sy + sl - stair.landingWidthMm - i * stepL - stepL / 2);
            step2.castShadow = true;
            buildingGroup.add(step2);
          }
        } else if (type === 'STRAIGHT') {
          const stepL = sl / numSteps;
          for (let i = 0; i < numSteps; i++) {
            const step = new THREE.Mesh(new THREE.BoxGeometry(sw - 40, stepH, stepL), slabMat);
            step.position.set(sx + sw / 2, baseElev + i * stepH + stepH / 2, sy + i * stepL + stepL / 2);
            step.castShadow = true;
            buildingGroup.add(step);
          }
        } else if (type === 'L_SHAPED') {
          const stepL = (sl - stair.landingWidthMm) / (numSteps / 2);
          for (let i = 0; i < numSteps / 2; i++) {
            const step = new THREE.Mesh(new THREE.BoxGeometry(sw - 40, stepH, stepL), slabMat);
            step.position.set(sx + sw / 2, baseElev + i * stepH + stepH / 2, sy + i * stepL + stepL / 2);
            step.castShadow = true;
            buildingGroup.add(step);
          }
        }
      });
    });

    // 13. 3D Car Models for ALL Allocated Parking Bays
    const carColors = [0x0284c7, 0xeab308, 0x10b981, 0xec4899];
    model.parkingSpaces.forEach((park, idx) => {
      if (isolatedFloor !== 'ALL') {
        const isBasement = park.location === 'BASEMENT_UNDERGROUND';
        const targetLvl = isBasement ? -1 : 0;
        if (isolatedFloor !== targetLvl) return;
      }

      const carGroup = new THREE.Group();
      const carColor = carColors[idx % carColors.length];

      const carBody = new THREE.Mesh(
        new THREE.BoxGeometry(2000, 800, 4200),
        new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.3, metalness: 0.6 })
      );
      carBody.position.y = 500;
      carBody.castShadow = true;
      carGroup.add(carBody);

      const carCabin = new THREE.Mesh(
        new THREE.BoxGeometry(1700, 600, 2200),
        glassMat
      );
      carCabin.position.set(0, 1100, -200);
      carCabin.castShadow = true;
      carGroup.add(carCabin);

      const elevY = park.location === 'BASEMENT_UNDERGROUND' ? -2960 : 40;
      carGroup.position.set(
        park.positionMm.x + park.dimensionsMm.width / 2,
        elevY,
        park.positionMm.y + park.dimensionsMm.length / 2
      );
      buildingGroup.add(carGroup);
    });

    scene.add(buildingGroup);

    // 14. Animation Render Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [model, isolatedFloor, sunlightTime, xRayMode, showRoomLabels, showRoof]);

  const handleResetCamera = () => {
    if (controlsRef.current && cameraRef.current) {
      const targetX = plotW / 2;
      const targetY = 2500;
      const targetZ = plotL / 2;
      cameraRef.current.position.set(plotW * 1.9, 16000, plotL * 2.3);
      controlsRef.current.target.set(targetX, targetY, targetZ);
      controlsRef.current.update();
    }
  };

  const handleTopView = () => {
    if (controlsRef.current && cameraRef.current) {
      const targetX = plotW / 2;
      const targetY = 0;
      const targetZ = plotL / 2;
      cameraRef.current.position.set(plotW / 2, 28000, plotL / 2 + 100);
      controlsRef.current.target.set(targetX, targetY, targetZ);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Controls Overlay (Top-Left) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl">
        {/* Floor Isolation */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[340px]">
          <button
            onClick={() => setIsolatedFloor('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
              isolatedFloor === 'ALL'
                ? 'bg-sky-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All Floors
          </button>
          {model.levels.map((lvl) => (
            <button
              key={lvl.levelIndex}
              onClick={() => setIsolatedFloor(lvl.levelIndex)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                isolatedFloor === lvl.levelIndex
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {lvl.name}
            </button>
          ))}
        </div>

        <div className="w-[1px] h-5 bg-slate-800" />

        {/* Roof Slab Toggle (Open-Top View vs Closed Roof) */}
        <button
          onClick={() => setShowRoof(!showRoof)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            showRoof ? 'bg-sky-950/60 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Roof Slab (Open-Top Dollhouse View vs Closed Roof)"
        >
          <Home className="h-3.5 w-3.5" />
          <span>{showRoof ? 'Roof: ON' : 'Roof: OFF'}</span>
        </button>

        {/* Room Labels Toggle */}
        <button
          onClick={() => setShowRoomLabels(!showRoomLabels)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            showRoomLabels ? 'bg-sky-950/60 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle 3D Room Badges"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Labels</span>
        </button>

        {/* X-Ray Mode Toggle */}
        <button
          onClick={() => setXRayMode(!xRayMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
            xRayMode ? 'bg-sky-950/60 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle X-Ray Transparency"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>X-Ray</span>
        </button>

        {/* Top-Down Plan View Angle */}
        <button
          onClick={handleTopView}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Top-Down View (Look directly down into rooms from above)"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Top View</span>
        </button>

        {/* Reset Camera Angle */}
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset Camera View Angle"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Camera</span>
        </button>
      </div>

      {/* Sunlight & Orientation HUD (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {/* Orientation Badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs font-mono text-slate-300">
          <Compass className="h-4 w-4 text-sky-400 animate-pulse" />
          <span>North:</span>
          <span className="font-bold text-sky-400">
            {model.site.orientationNorthDegrees === 0 ? '0° (NORTH)' : `${model.site.orientationNorthDegrees}°`}
          </span>
        </div>

        {/* Sunlight Slider */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl text-xs font-mono text-slate-300">
          <Sun className="h-4 w-4 text-amber-400" />
          <span>Sunlight:</span>
          <input
            type="range"
            min="8"
            max="18"
            value={sunlightTime}
            onChange={(e) => setSunlightTime(Number(e.target.value))}
            className="w-20 accent-amber-400 cursor-pointer"
          />
          <span className="font-bold text-amber-300 min-w-[45px]">
            {sunlightTime > 12 ? `${sunlightTime - 12} PM` : `${sunlightTime} AM`}
          </span>
        </div>
      </div>

      {/* Camera Guidance & Interaction Instructions (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 px-3.5 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300 shadow-xl flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sky-400 font-bold">🖱️ Left-Click + Drag:</span>
          <span>Rotate 3D View</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">🖱️ Right-Click + Drag:</span>
          <span>Pan / Move</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold">📜 Scroll Wheel:</span>
          <span>Zoom In / Out</span>
        </div>
      </div>
    </div>
  );
};

