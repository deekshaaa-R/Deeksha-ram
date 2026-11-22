import * as THREE from 'three';

export type FinishId = 'slate' | 'alloy' | 'obsidian';

export interface FinishPreset {
  id: FinishId;
  label: string;
  swatch: string;
  color: number;
  metalness: number;
  roughness: number;
}

export const FINISH_PRESETS: FinishPreset[] = [
  {
    id: 'slate',
    label: 'Matte Slate',
    swatch: '#1E293B',
    color: 0x1e293b,
    metalness: 0.25,
    roughness: 0.65,
  },
  {
    id: 'alloy',
    label: 'Brushed Alloy',
    swatch: '#64748B',
    color: 0x64748b,
    metalness: 0.85,
    roughness: 0.28,
  },
  {
    id: 'obsidian',
    label: 'Obsidian Titanium',
    swatch: '#0F172A',
    color: 0x0f172a,
    metalness: 0.55,
    roughness: 0.38,
  },
];

function makeDecalTexture(title: string, subtitle: string, accent = '#00D4FF'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#091124';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  ctx.fillStyle = accent;
  ctx.font = 'bold 42px Poppins, sans-serif';
  ctx.fillText('VS TECHNOLOGY', 36, 76);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 32px Inter, sans-serif';
  ctx.fillText(title, 36, 134);

  ctx.fillStyle = '#A9B4D0';
  ctx.font = '500 22px monospace';
  ctx.fillText(subtitle, 36, 182);

  ctx.fillStyle = '#7CFF6B';
  ctx.beginPath();
  ctx.arc(442, 64, 12, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeLensTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, '#040814');
  grad.addColorStop(0.32, '#0B3554');
  grad.addColorStop(0.55, '#071426');
  grad.addColorStop(0.8, '#00D4FF');
  grad.addColorStop(1, '#04070F');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function tagPart(
  mesh: THREE.Object3D,
  explodeOffset: [number, number, number],
  isPrimaryShell = false
) {
  mesh.userData.basePosition = mesh.position.clone();
  mesh.userData.explodeOffset = new THREE.Vector3(...explodeOffset);
  mesh.userData.primaryShell = isPrimaryShell;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createMaterials(finish: FinishPreset) {
  const shellMat = new THREE.MeshStandardMaterial({
    color: finish.color,
    metalness: finish.metalness,
    roughness: finish.roughness,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x0b132b,
    metalness: 0.35,
    roughness: 0.52,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.24,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a345,
    metalness: 0.88,
    roughness: 0.25,
  });
  const cyanLedMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const limeLedMat = new THREE.MeshStandardMaterial({
    color: 0x7cff6b,
    emissive: 0x7cff6b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const irMat = new THREE.MeshStandardMaterial({
    color: 0x8b1e24,
    emissive: 0x5f0f17,
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });
  return { shellMat, trimMat, alloyMat, brassMat, cyanLedMat, limeLedMat, irMat };
}

function groundGroup(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const offsetY = -box.min.y;
  group.children.forEach((child) => {
    child.position.y += offsetY;
    if (child.userData.basePosition instanceof THREE.Vector3) {
      child.userData.basePosition.y += offsetY;
    }
  });
}

export function buildHardwareModel(productId: string, finish: FinishPreset): THREE.Group {
  const group = new THREE.Group();
  const mats = createMaterials(finish);

  if (productId.includes('dashcam')) {
    const isAi = productId === 'vs-ai-4g-dashcam';
    const is4k = productId === 'vs-4k-dual-dashcam';

    // 1. Main Barrel Housing
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 1.85, 32),
      mats.shellMat
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0, 0.55, 0);
    tagPart(barrel, [0, 0.15, 0], true);
    group.add(barrel);

    // 2. Windshield Wedge Bracket
    const mount = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.28, 0.65),
      mats.trimMat
    );
    mount.position.set(0, 1.08, -0.08);
    mount.rotation.x = -0.25;
    tagPart(mount, [0, 0.72, -0.25]);
    group.add(mount);

    // 3. Front Optics Ring & Glass Lens
    const lensRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.34, 0.35, 32),
      mats.alloyMat
    );
    lensRing.rotation.x = Math.PI / 2;
    lensRing.position.set(0, 0.55, 0.52);
    tagPart(lensRing, [0, 0, 0.65]);
    group.add(lensRing);

    const lensGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.26, 32),
      new THREE.MeshStandardMaterial({
        map: makeLensTexture(),
        metalness: 0.4,
        roughness: 0.1,
      })
    );
    lensGlass.position.set(0, 0.55, 0.7);
    tagPart(lensGlass, [0, 0, 0.85]);
    group.add(lensGlass);

    // 4. Cabin IR Sub-Camera (for AI & Dual models)
    const cabinPod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.42, 24),
      mats.trimMat
    );
    cabinPod.rotation.x = Math.PI / 2;
    cabinPod.position.set(0.55, 0.58, -0.45);
    tagPart(cabinPod, [0.45, 0.25, -0.5]);
    group.add(cabinPod);

    // 5. IR LED Indicators (for AI DMS) or Status Strip
    const ledMat = isAi ? mats.irMat : mats.cyanLedMat;
    const ledRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.025, 12, 24),
      ledMat
    );
    ledRing.position.set(0.55, 0.58, -0.66);
    tagPart(ledRing, [0.45, 0.25, -0.65]);
    group.add(ledRing);

    // 6. Top Spec Badge Plate
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.52),
      new THREE.MeshStandardMaterial({
        map: makeDecalTexture(
          isAi ? '4G AI ADAS + DMS' : is4k ? '4K UHD DUAL CAM' : '2K QHD WIFI CAM',
          isAi ? 'LTE CAT-4 · NPU VISION' : 'STARVIS · SUPERCAPACITOR'
        ),
        roughness: 0.35,
      })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 1.02, 0.12);
    tagPart(decal, [0, 0.45, 0.2]);
    group.add(decal);

    // 7. MicroSD / SIM Side Cap + Optional Blade Antenna
    const sideCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.38, 0.34),
      mats.cyanLedMat
    );
    sideCap.position.set(-0.96, 0.55, 0);
    tagPart(sideCap, [-0.6, 0, 0]);
    group.add(sideCap);

    if (isAi) {
      const antenna = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.72, 0.22),
        mats.trimMat
      );
      antenna.position.set(-0.72, 1.15, -0.15);
      tagPart(antenna, [-0.45, 0.65, -0.15]);
      group.add(antenna);
    }
  } else if (productId === 'vs-ultra-wireless') {
    // Magnetic 10,000 mAh IP67 Chassis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.62, 1.15),
      mats.shellMat
    );
    chassis.position.set(0, 0.42, 0);
    tagPart(chassis, [0, 0.25, 0], true);
    group.add(chassis);

    const topPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.62, 0.88),
      new THREE.MeshStandardMaterial({
        map: makeDecalTexture('VS ULTRA 4G', '10,000 mAh · IP67 MAGNETIC'),
        roughness: 0.35,
      })
    );
    topPlate.rotation.x = -Math.PI / 2;
    topPlate.position.set(0, 0.74, 0);
    tagPart(topPlate, [0, 0.75, 0]);
    group.add(topPlate);

    // Rubberized End Bumpers
    [-0.98, 0.98].forEach((x) => {
      const bumper = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.68, 1.22),
        mats.trimMat
      );
      bumper.position.set(x, 0.42, 0);
      tagPart(bumper, [x * 0.55, 0.25, 0]);
      group.add(bumper);
    });

    // 4 Visible Neodymium Magnets Under Base
    [
      [-0.58, -0.34],
      [0.58, -0.34],
      [-0.58, 0.34],
      [0.58, 0.34],
    ].forEach(([x, z]) => {
      const mag = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
        mats.alloyMat
      );
      mag.position.set(x, 0.06, z);
      tagPart(mag, [x * 0.35, -0.22, z * 0.35]);
      group.add(mag);
    });

    // Optical Light Drop Sensor
    const sensorWindow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.1, 20),
      mats.cyanLedMat
    );
    sensorWindow.position.set(0, 0.05, 0);
    tagPart(sensorWindow, [0, -0.3, 0]);
    group.add(sensorWindow);
  } else if (productId === 'vs-harvester-tractor') {
    // Rugged IP68 Agri Enclosure
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.58, 1.25),
      mats.shellMat
    );
    body.position.set(0, 0.38, 0);
    tagPart(body, [0, 0.2, 0], true);
    group.add(body);

    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.48, 0.94),
      new THREE.MeshStandardMaterial({
        map: makeDecalTexture('VS HARVESTER', 'IP68 · RTK ACREAGE + PTO', '#7CFF6B'),
        roughness: 0.35,
      })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(0, 0.68, 0);
    tagPart(decal, [0, 0.7, 0]);
    group.add(decal);

    // Vibration Damper Flanges
    [-0.95, 0.95].forEach((x) => {
      const flange = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.14, 1.05),
        mats.alloyMat
      );
      flange.position.set(x, 0.12, 0);
      tagPart(flange, [x * 0.45, -0.08, 0]);
      group.add(flange);
    });

    // Brass Deutsch Agri Connector
    const plug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.44, 24),
      mats.brassMat
    );
    plug.rotation.z = Math.PI / 2;
    plug.position.set(1.06, 0.38, 0);
    tagPart(plug, [0.55, 0.2, 0]);
    group.add(plug);

    // High-Gain Dome NavIC/RTK Puck
    const dome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.44, 0.24, 28),
      mats.trimMat
    );
    dome.position.set(-0.32, 0.82, 0);
    tagPart(dome, [-0.2, 0.65, 0]);
    group.add(dome);

    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.06, 0.08),
      mats.limeLedMat
    );
    led.position.set(0.35, 0.56, 0.63);
    tagPart(led, [0, 0.2, 0.42]);
    group.add(led);
  } else if (productId === 'vs-obd-4g') {
    // OBD-II Plug-and-Play Dongle
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 1.15, 0.56),
      mats.shellMat
    );
    body.position.set(0, 0.72, 0);
    tagPart(body, [0, 0.25, 0], true);
    group.add(body);

    const obdHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.34, 0.46),
      mats.brassMat
    );
    obdHeader.position.set(0, 0.12, 0);
    tagPart(obdHeader, [0, -0.35, 0]);
    group.add(obdHeader);

    const faceDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.85),
      new THREE.MeshStandardMaterial({
        map: makeDecalTexture('VS OBD 4G', 'J1962 CAN · DTC DIAG'),
        roughness: 0.35,
      })
    );
    faceDecal.position.set(0, 0.72, 0.29);
    tagPart(faceDecal, [0, 0.25, 0.45]);
    group.add(faceDecal);

    const statusBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.07, 0.08),
      mats.cyanLedMat
    );
    statusBar.position.set(0, 1.32, 0);
    tagPart(statusBar, [0, 0.65, 0]);
    group.add(statusBar);
  } else if (productId === 'vs-tag-bluetooth') {
    // Rugged Circular BLE 5.2 Beacon
    const puck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.82, 0.28, 36),
      mats.shellMat
    );
    puck.position.set(0, 0.16, 0);
    tagPart(puck, [0, 0.12, 0], true);
    group.add(puck);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.74, 0.05, 16, 48),
      mats.alloyMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.26, 0);
    tagPart(ring, [0, 0.45, 0]);
    group.add(ring);

    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.64, 36),
      new THREE.MeshStandardMaterial({
        map: makeDecalTexture('VS TAG BLE 5.2', '3-YR CR2477 · TEMP'),
        roughness: 0.3,
      })
    );
    face.rotation.x = -Math.PI / 2;
    face.position.set(0, 0.31, 0);
    tagPart(face, [0, 0.68, 0]);
    group.add(face);

    const beaconLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      mats.limeLedMat
    );
    beaconLed.position.set(0.45, 0.31, 0);
    tagPart(beaconLed, [0.2, 0.68, 0]);
    group.add(beaconLed);
  } else {
    // Wired GPS Trackers (vs-pro-4g-wired & vs-lite-wired)
    const isPro = productId === 'vs-pro-4g-wired';

    const mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(isPro ? 1.85 : 1.48, 0.44, isPro ? 1.24 : 0.96),
      mats.shellMat
    );
    mainBody.position.set(0, 0.28, 0);
    tagPart(mainBody, [0, 0.18, 0], true);
    group.add(mainBody);

    const topLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(isPro ? 1.55 : 1.24, isPro ? 0.96 : 0.72),
      new THREE.MeshStandardMaterial({
        map: makeDecalTexture(
          isPro ? 'VS PRO 4G' : 'VS LITE GPS',
          isPro ? 'CAT-1 + RS485 FUEL + SOS' : '9-90V · RELAY IMMOBILIZER'
        ),
        roughness: 0.32,
      })
    );
    topLabel.rotation.x = -Math.PI / 2;
    topLabel.position.set(0, 0.51, 0);
    tagPart(topLabel, [0, 0.62, 0]);
    group.add(topLabel);

    // 12-Pin / 4-Pin Wiring Harness Plug
    const harness = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.26, isPro ? 0.68 : 0.44),
      mats.alloyMat
    );
    harness.position.set(isPro ? 1.06 : 0.86, 0.28, 0);
    tagPart(harness, [0.55, 0.18, 0]);
    group.add(harness);

    // LED Status Bars
    const gnssLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 0.08),
      mats.cyanLedMat
    );
    gnssLed.position.set(-0.25, 0.44, isPro ? 0.63 : 0.49);
    tagPart(gnssLed, [-0.1, 0.2, 0.4]);
    group.add(gnssLed);

    const cellLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 0.08),
      mats.limeLedMat
    );
    cellLed.position.set(0.22, 0.44, isPro ? 0.63 : 0.49);
    tagPart(cellLed, [0.1, 0.2, 0.4]);
    group.add(cellLed);

    if (isPro) {
      // Dual SMA LTE/GNSS Antennas for VS Pro 4G
      [-0.36, 0.36].forEach((z, idx) => {
        const sma = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.22, 16),
          mats.brassMat
        );
        sma.rotation.z = Math.PI / 2;
        sma.position.set(-1.02, 0.28, z);
        tagPart(sma, [-0.5, 0.18, z * 0.25]);
        group.add(sma);

        const whip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.07, 1.05, 16),
          mats.trimMat
        );
        whip.position.set(-1.14, 0.72, z);
        tagPart(whip, [-0.75 - idx * 0.12, 0.42, z * 0.25]);
        group.add(whip);
      });
    }
  }

  groundGroup(group);
  return group;
}
