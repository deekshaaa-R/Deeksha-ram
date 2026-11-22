import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Expand, RotateCcw } from 'lucide-react';
import {
  buildHardwareModel,
  FINISH_PRESETS,
  type FinishId,
} from './hardwareModels';

export type CameraPreset = 'hero' | 'front' | 'top' | 'detail';

interface HardwareViewer3DProps {
  productId: string;
  productName: string;
  heightClass?: string;
}

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const probe = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!probe) return false;
    const ext = probe.getExtension('WEBGL_debug_renderer_info');
    const rendererName = ext
      ? String(probe.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : '';
    const software = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
      rendererName
    );
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    return software;
  } catch {
    return false;
  }
}

function makeShadowDiscTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function HardwareViewer3D({
  productId,
  productName,
  heightClass = 'h-[400px] sm:h-[460px]',
}: HardwareViewer3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [finishId, setFinishId] = useState<FinishId>('slate');
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [preset, setPreset] = useState<CameraPreset>('hero');
  const [dockOpen, setDockOpen] = useState(true);
  const [isSoftwareGl] = useState(() => detectSoftwareGl());

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    modelGroup: THREE.Group | null;
    requestRender: () => void;
    disposeModel: () => void;
    swapModel: (id: string, finish: FinishId) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 260);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('data-testid', 'hardware-3d-canvas');
    renderer.domElement.setAttribute('data-software-gl', String(isSoftwareGl));
    renderer.domElement.setAttribute('data-model-id', productId);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070e20);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.85;

    // 3-Point Studio Lighting (retained in both paths)
    const hemi = new THREE.HemisphereLight(0xcbe8ff, 0x0a1128, 0.7);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(3.5, 4.8, 3.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.15);
    rimLight.position.set(-3.4, 2.2, -3.2);
    scene.add(rimLight);

    // Ground Contact Shadow Disc & Subtle Studio Ring
    const shadowDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({
        map: makeShadowDiscTexture(),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.002;
    scene.add(shadowDisc);

    const studioRing = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.58, 64),
      new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      })
    );
    studioRing.rotation.x = -Math.PI / 2;
    studioRing.position.y = 0.004;
    scene.add(studioRing);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(2.9, 2.1, 3.1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.6;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 0.45, 0);

    let disposed = false;
    let rafId = 0;
    let needsRender = false;
    let fenceTimer = 0;

    const afterDraw = (done: () => void) => {
      if (!isSoftwareGl) {
        rafId = window.requestAnimationFrame(done);
        return;
      }
      const gl = renderer.getContext();
      if (gl instanceof WebGL2RenderingContext) {
        const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (fence) {
          const check = () => {
            if (disposed) return;
            const status = gl.clientWaitSync(fence, 0, 0);
            if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
              gl.deleteSync(fence);
              done();
            } else {
              fenceTimer = window.setTimeout(check, 4);
            }
          };
          check();
          return;
        }
      }
      rafId = window.requestAnimationFrame(done);
    };

    const drawOnce = () => {
      if (disposed) return;
      needsRender = false;
      const moved = controls.update();
      renderer.render(scene, camera);
      if (moved) {
        afterDraw(() => {
          if (!disposed) requestRender();
        });
      }
    };

    const requestRender = () => {
      if (disposed || needsRender) return;
      needsRender = true;
      rafId = window.requestAnimationFrame(drawOnce);
    };

    const disposeModelGroup = (grp: THREE.Group | null) => {
      if (!grp) return;
      scene.remove(grp);
      grp.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m && typeof m === 'object' && 'map' in m && m.map) {
              (m.map as THREE.Texture).dispose();
            }
            m?.dispose();
          });
        }
      });
    };

    let currentGroup: THREE.Group | null = null;
    const swapModel = (id: string, fId: FinishId) => {
      disposeModelGroup(currentGroup);
      const presetObj = FINISH_PRESETS.find((f) => f.id === fId) ?? FINISH_PRESETS[0];
      currentGroup = buildHardwareModel(id, presetObj);
      scene.add(currentGroup);
      if (sceneRefs.current) {
        sceneRefs.current.modelGroup = currentGroup;
      }
      renderer.domElement.setAttribute('data-model-id', id);
      requestRender();
    };

    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 280);
        const h = Math.max(entry.contentRect.height, 240);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    sceneRefs.current = {
      scene,
      camera,
      controls,
      modelGroup: null,
      requestRender,
      disposeModel: () => disposeModelGroup(currentGroup),
      swapModel,
    };

    swapModel(productId, finishId);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(fenceTimer);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposeModelGroup(currentGroup);
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      sceneRefs.current = null;
    };
    // Initialize WebGL context once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap 3D model when productId or finish changes
  useEffect(() => {
    sceneRefs.current?.swapModel(productId, finishId);
    setExplodeFactor(0);
  }, [productId, finishId]);

  // Apply exploded-view offset
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs?.modelGroup) return;
    refs.modelGroup.children.forEach((child) => {
      const base = child.userData.basePosition as THREE.Vector3 | undefined;
      const offset = child.userData.explodeOffset as THREE.Vector3 | undefined;
      if (base && offset) {
        child.position.copy(base).addScaledVector(offset, explodeFactor);
      }
    });
    refs.requestRender();
  }, [explodeFactor]);

  // Apply camera presets
  const applyPreset = (next: CameraPreset) => {
    setPreset(next);
    const refs = sceneRefs.current;
    if (!refs) return;
    if (next === 'hero') {
      refs.camera.position.set(2.9, 2.1, 3.1);
      refs.controls.target.set(0, 0.45, 0);
    } else if (next === 'front') {
      refs.camera.position.set(0, 0.85, 3.6);
      refs.controls.target.set(0, 0.45, 0);
    } else if (next === 'top') {
      refs.camera.position.set(0.01, 4.1, 0.01);
      refs.controls.target.set(0, 0.35, 0);
    } else if (next === 'detail') {
      refs.camera.position.set(1.75, 1.05, 1.85);
      refs.controls.target.set(0, 0.45, 0);
    }
    refs.controls.update();
    refs.requestRender();
  };

  const resetView = () => {
    setExplodeFactor(0);
    setFinishId('slate');
    applyPreset('hero');
  };

  return (
    <div
      className={`relative ${heightClass} w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#070E20] select-none`}
      aria-label={`Interactive 3D CAD viewer for ${productName}`}
    >
      {/* WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Subtle Label (Non-blocking, zero backdrop-filter) */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-lg bg-[#0A1128]/90 border border-white/15 text-[11px] font-mono font-semibold text-[#00D4FF]">
          3D CAD INSPECTOR · DRAG TO ORBIT
        </span>
      </div>

      <button
        type="button"
        onClick={resetView}
        aria-label="Reset 3D camera and view"
        className="absolute top-3 right-3 p-2 rounded-lg bg-[#0A1128]/90 border border-white/15 text-white hover:border-[#00D4FF] transition-colors cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
      </button>

      {/* Collapsible Compact Control Dock (<= 15% viewport, zero backdrop-filter) */}
      <div className="absolute inset-x-3 bottom-3">
        <div className="rounded-xl bg-[#0A1128]/95 border border-white/15 px-3 py-2 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  ['hero', 'Hero'],
                  ['front', 'Front'],
                  ['top', 'Top'],
                  ['detail', 'Detail'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    preset === id
                      ? 'bg-[#00D4FF] text-[#0A1128] font-semibold'
                      : 'bg-[#111B3A] text-[#A9B4D0] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDockOpen((v) => !v)}
              aria-label={dockOpen ? 'Collapse 3D controls' : 'Expand 3D controls'}
              className="p-1 rounded-md bg-[#111B3A] text-[#A9B4D0] hover:text-white cursor-pointer shrink-0"
            >
              {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {dockOpen && (
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              {/* Explode Slider */}
              <div className="flex items-center gap-2 min-w-[155px] flex-1">
                <Expand className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" aria-hidden="true" />
                <label
                  htmlFor="explode-range"
                  className="text-[11px] text-[#A9B4D0] whitespace-nowrap"
                >
                  Explode
                </label>
                <input
                  id="explode-range"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodeFactor}
                  onChange={(e) => setExplodeFactor(Number(e.target.value))}
                  className="w-full accent-[#00D4FF] cursor-pointer"
                />
              </div>

              {/* Material Finish Swatches */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#A9B4D0] mr-1">Finish:</span>
                {FINISH_PRESETS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFinishId(f.id)}
                    title={f.label}
                    aria-label={`Select ${f.label} finish`}
                    style={{ backgroundColor: f.swatch }}
                    className={`w-5 h-5 rounded-full border-2 cursor-pointer ${
                      finishId === f.id ? 'border-[#00D4FF] scale-110' : 'border-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
