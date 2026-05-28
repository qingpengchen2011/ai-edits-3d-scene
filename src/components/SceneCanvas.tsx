import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SceneState } from '../domain/scene';

export type ViewMode = 'before' | 'after' | 'split' | 'diff';

type Props = {
  sceneState: SceneState;
  beforeState: SceneState;
  viewMode: ViewMode;
};

type RigRuntime = {
  root: THREE.Group;
  state: SceneState;
  scanRing: THREE.Mesh;
  orbitBias: number;
};

export default function SceneCanvas({ sceneState, beforeState, viewMode }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const displayState = viewMode === 'before' ? beforeState : sceneState;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(displayState.environment.fogColor, 8, viewMode === 'split' ? 24 : 18);

    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 100);
    const cameraDistance = displayState.camera.distance + (viewMode === 'split' ? 3.2 : 1.8);
    camera.position.set(0, displayState.camera.height, cameraDistance);

    const ambient = new THREE.AmbientLight('#ffffff', 0.22);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(displayState.lighting.keyColor, displayState.lighting.keyIntensity);
    keyLight.position.set(-4.5, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(displayState.lighting.rimColor, displayState.lighting.rimIntensity, 14);
    rimLight.position.set(4.2, 3.8, -3.4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({
        color: displayState.environment.floorColor,
        metalness: 0.22,
        roughness: 0.5,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(12, 24, displayState.hud.gridColor, displayState.environment.floorColor);
    grid.position.y = 0.015;
    scene.add(grid);

    const rigs: RigRuntime[] = [];
    if (viewMode === 'split') {
      rigs.push(createCopilotRig(beforeState, -1.22, true, 0.62));
      rigs.push(createCopilotRig(sceneState, 1.22, false, 0.7));
    } else if (viewMode === 'before') {
      rigs.push(createCopilotRig(beforeState, 0, false, 1));
    } else if (viewMode === 'diff') {
      rigs.push(createCopilotRig(beforeState, -1.08, true, 0.6));
      rigs.push(createCopilotRig(sceneState, 1.08, false, 0.7));
      addDiffMarkers(scene, sceneState);
    } else {
      rigs.push(createCopilotRig(sceneState, 0, false, 1));
    }

    for (const rig of rigs) {
      scene.add(rig.root);
    }

    if (viewMode === 'split') {
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 3.2, 0.026),
        new THREE.MeshStandardMaterial({
          color: sceneState.hud.secondaryColor,
          emissive: sceneState.hud.secondaryColor,
          emissiveIntensity: 0.55,
        }),
      );
      divider.position.set(0, 1.8, 0);
      scene.add(divider);
    }

    const target = new THREE.Vector3(0, 1.45, 0);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    let frameId = 0;
    const animate = () => {
      const elapsed = performance.now() / 1000;
      const orbit = elapsed * displayState.camera.orbitSpeed;
      camera.position.x = viewMode === 'split' || viewMode === 'diff' ? 0 : Math.sin(orbit) * cameraDistance * 0.34;
      camera.position.z = viewMode === 'split' || viewMode === 'diff' ? cameraDistance : Math.cos(orbit) * cameraDistance;
      camera.position.y = displayState.camera.height;
      camera.lookAt(target);

      for (const rig of rigs) {
        rig.root.rotation.y = Math.sin(elapsed * 0.38 + rig.orbitBias) * 0.08;
        rig.scanRing.rotation.z = elapsed * (0.6 + rig.state.hud.scanSpeed);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      host.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [beforeState, sceneState, viewMode]);

  return <div ref={hostRef} className="scene-canvas" aria-label="Live Three.js scene preview" />;
}

function createCopilotRig(state: SceneState, xOffset: number, dimmed: boolean, scale: number): RigRuntime {
  const root = new THREE.Group();
  root.position.x = xOffset;
  root.scale.setScalar(scale);

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: state.material.bodyColor,
    emissive: state.material.emissiveColor,
    emissiveIntensity: dimmed ? 0.18 : 0.55,
    metalness: state.material.metalness,
    roughness: state.material.roughness,
    opacity: dimmed ? Math.min(state.material.opacity, 0.42) : state.material.opacity,
    transparent: dimmed || state.material.opacity < 1,
    depthWrite: !dimmed && state.material.opacity >= 1,
    transmission: state.material.opacity < 0.8 ? 0.5 : 0,
    thickness: 0.42,
    clearcoat: 0.56,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: state.hud.primaryColor,
    emissive: state.hud.primaryColor,
    emissiveIntensity: dimmed ? 0.22 : 0.9,
    metalness: 0.28,
    roughness: 0.18,
    opacity: dimmed ? 0.42 : 1,
    transparent: dimmed,
  });

  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: state.hud.secondaryColor,
    emissive: state.hud.secondaryColor,
    emissiveIntensity: dimmed ? 0.16 : 0.62,
    metalness: 0.18,
    roughness: 0.24,
    opacity: dimmed ? 0.34 : 0.82,
    transparent: true,
  });

  const panelMaterial = new THREE.MeshPhysicalMaterial({
    color: state.hud.panelColor,
    emissive: state.hud.primaryColor,
    emissiveIntensity: dimmed ? 0.05 : 0.22,
    metalness: 0.14,
    roughness: 0.18,
    opacity: dimmed ? 0.2 : 0.34,
    transparent: true,
    transmission: 0.18,
    side: THREE.DoubleSide,
  });

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: state.environment.floorColor,
    metalness: 0.42,
    roughness: 0.34,
    opacity: dimmed ? 0.46 : 1,
    transparent: dimmed,
  });

  addMesh(root, new THREE.CylinderGeometry(2.0, 2.35, 0.22, 8), baseMaterial, [0, 0.12, 0], [0, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(3.4, 0.18, 1.35), baseMaterial, [0, 0.34, -0.82], [-0.15, 0, 0]);
  addMesh(root, new THREE.BoxGeometry(2.1, 0.12, 0.52), secondaryMaterial, [0, 0.52, -1.32], [-0.18, 0, 0]);

  const robot = new THREE.Group();
  robot.position.y = 1.24;
  root.add(robot);

  addMesh(robot, new THREE.BoxGeometry(1.15, 1.46, 0.78), bodyMaterial, [0, 0, 0], [0, 0, 0]);
  addMesh(robot, new THREE.BoxGeometry(0.88, 0.48, 0.56), bodyMaterial, [0, 1.08, 0.02], [0, 0, 0]);
  addMesh(robot, new THREE.SphereGeometry(0.24, 28, 28), accentMaterial, [0, 0.22, 0.43], [0, 0, 0]);
  addMesh(robot, new THREE.CapsuleGeometry(0.07, 0.64, 8, 18), secondaryMaterial, [-0.58, 0.15, 0], [0, 0, -0.72]);
  addMesh(robot, new THREE.CapsuleGeometry(0.07, 0.64, 8, 18), secondaryMaterial, [0.58, 0.15, 0], [0, 0, 0.72]);
  addMesh(robot, new THREE.CapsuleGeometry(0.08, 0.62, 8, 18), accentMaterial, [-0.28, -0.96, 0], [0, 0, 0.12]);
  addMesh(robot, new THREE.CapsuleGeometry(0.08, 0.62, 8, 18), accentMaterial, [0.28, -0.96, 0], [0, 0, -0.12]);

  for (const x of [-0.18, 0.18]) {
    addMesh(robot, new THREE.SphereGeometry(0.065, 18, 18), accentMaterial, [x, 1.1, 0.32], [0, 0, 0]);
  }

  const screenCount = Math.max(4, Math.round(4 + state.hud.density * 5));
  for (let index = 0; index < screenCount; index += 1) {
    const angle = -0.9 + (index / Math.max(1, screenCount - 1)) * 1.8;
    const radius = 1.72 + (index % 2) * 0.18;
    const x = Math.sin(angle) * radius;
    const z = -1.2 - Math.cos(angle) * 0.38;
    const y = 1.5 + (index % 3) * 0.24;
    const panel = addMesh(root, new THREE.BoxGeometry(0.46, 0.92, 0.035), panelMaterial, [x, y, z], [0.02, -angle * 0.6, 0]);
    panel.userData.kind = 'hud-panel';
  }

  const barCount = Math.max(6, Math.round(7 + state.hud.density * 9));
  for (let index = 0; index < barCount; index += 1) {
    const height = 0.2 + ((index * 7) % 9) * 0.055 + state.hud.density * 0.24;
    const x = -1.52 + index * (3.04 / Math.max(1, barCount - 1));
    addMesh(root, new THREE.BoxGeometry(0.08, height, 0.08), index % 2 ? secondaryMaterial : accentMaterial, [x, 0.58 + height / 2, -1.52], [0, 0, 0]);
  }

  const scanRing = addMesh(root, new THREE.TorusGeometry(1.45, 0.024, 12, 96), accentMaterial, [0, 1.54, 0], [Math.PI / 2, 0, 0]);
  addMesh(root, new THREE.TorusGeometry(1.1, 0.018, 12, 96), secondaryMaterial, [0, 1.04, 0], [0, Math.PI / 2, 0]);
  addMesh(root, new THREE.BoxGeometry(3.55, 0.025, 0.025), accentMaterial, [0, 0.74, -1.66], [0, 0, 0]);

  return {
    root,
    state,
    scanRing,
    orbitBias: xOffset,
  };
}

function addDiffMarkers(scene: THREE.Scene, state: SceneState) {
  const positions: Record<SceneState['diff'][number]['target'], [number, number, number]> = {
    material: [0.95, 2.0, 0.55],
    lighting: [2.2, 3.1, -0.9],
    camera: [-2.25, 2.5, 1.1],
    environment: [0, 0.25, -2.1],
    hud: [-0.9, 2.25, -1.45],
  };
  const colors: Record<SceneState['diff'][number]['target'], string> = {
    material: state.material.emissiveColor,
    lighting: state.lighting.keyColor,
    camera: '#e94b5f',
    environment: state.environment.fogColor,
    hud: state.hud.primaryColor,
  };

  for (const item of state.diff) {
    const material = new THREE.MeshStandardMaterial({
      color: colors[item.target],
      emissive: colors[item.target],
      emissiveIntensity: 0.9,
    });
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 18), material);
    marker.position.set(...positions[item.target]);
    scene.add(marker);
  }
}

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
