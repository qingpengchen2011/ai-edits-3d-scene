import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { SceneState } from '../domain/scene';

type Props = {
  sceneState: SceneState;
};

export default function SceneCanvas({ sceneState }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    bodyMaterial: THREE.MeshPhysicalMaterial;
    accentMaterial: THREE.MeshStandardMaterial;
    floorMaterial: THREE.MeshStandardMaterial;
    keyLight: THREE.DirectionalLight;
    rimLight: THREE.PointLight;
    robot: THREE.Group;
    frameId: number;
    currentState: SceneState;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(sceneState.environment.fogColor, 7, 16);

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, sceneState.camera.height, sceneState.camera.distance);

    const ambient = new THREE.AmbientLight('#ffffff', 0.24);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(sceneState.lighting.keyColor, sceneState.lighting.keyIntensity);
    keyLight.position.set(-4, 6, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(sceneState.lighting.rimColor, sceneState.lighting.rimIntensity, 12);
    rimLight.position.set(3, 2.8, -2.5);
    scene.add(rimLight);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: sceneState.material.bodyColor,
      emissive: sceneState.material.emissiveColor,
      emissiveIntensity: 0.46,
      metalness: sceneState.material.metalness,
      roughness: sceneState.material.roughness,
      opacity: sceneState.material.opacity,
      transparent: sceneState.material.opacity < 1,
      depthWrite: sceneState.material.opacity >= 1,
      transmission: sceneState.material.opacity < 0.7 ? 0.58 : 0,
      thickness: 0.42,
      clearcoat: 0.52,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: sceneState.lighting.rimColor,
      emissive: sceneState.lighting.rimColor,
      emissiveIntensity: 0.8,
      metalness: 0.34,
      roughness: 0.22,
    });
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: sceneState.environment.floorColor,
      metalness: 0.24,
      roughness: 0.44,
    });

    const robot = createRobot(bodyMaterial, accentMaterial);
    robot.position.y = 0.96;
    scene.add(robot);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const target = new THREE.Vector3(0, 1.3, 0);
    const currentState = sceneState;

    runtimeRef.current = {
      renderer,
      camera,
      scene,
      bodyMaterial,
      accentMaterial,
      floorMaterial,
      keyLight,
      rimLight,
      robot,
      frameId: 0,
      currentState,
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }
      const elapsed = performance.now() / 1000;
      const orbit = elapsed * runtime.currentState.camera.orbitSpeed;
      runtime.robot.rotation.y = orbit * 0.8;
      runtime.camera.position.x = Math.sin(orbit) * runtime.currentState.camera.distance * 0.44;
      runtime.camera.position.z = Math.cos(orbit) * runtime.currentState.camera.distance;
      runtime.camera.position.y = runtime.currentState.camera.height;
      runtime.camera.lookAt(target);
      renderer.render(scene, camera);
      runtime.frameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      const runtime = runtimeRef.current;
      if (runtime) {
        cancelAnimationFrame(runtime.frameId);
      }
      window.removeEventListener('resize', resize);
      host.removeChild(renderer.domElement);
      renderer.dispose();
      bodyMaterial.dispose();
      accentMaterial.dispose();
      floorMaterial.dispose();
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.currentState = sceneState;
    runtime.bodyMaterial.color.set(sceneState.material.bodyColor);
    runtime.bodyMaterial.emissive.set(sceneState.material.emissiveColor);
    runtime.bodyMaterial.metalness = sceneState.material.metalness;
    runtime.bodyMaterial.roughness = sceneState.material.roughness;
    runtime.bodyMaterial.opacity = sceneState.material.opacity;
    runtime.bodyMaterial.transparent = sceneState.material.opacity < 1;
    runtime.bodyMaterial.transmission = sceneState.material.opacity < 0.7 ? 0.58 : 0;
    runtime.bodyMaterial.depthWrite = sceneState.material.opacity >= 1;
    runtime.bodyMaterial.needsUpdate = true;
    runtime.accentMaterial.color.set(sceneState.lighting.rimColor);
    runtime.accentMaterial.emissive.set(sceneState.lighting.rimColor);
    runtime.floorMaterial.color.set(sceneState.environment.floorColor);
    runtime.keyLight.color.set(sceneState.lighting.keyColor);
    runtime.keyLight.intensity = sceneState.lighting.keyIntensity;
    runtime.rimLight.color.set(sceneState.lighting.rimColor);
    runtime.rimLight.intensity = sceneState.lighting.rimIntensity;
    if (runtime.scene.fog instanceof THREE.Fog) {
      runtime.scene.fog.color.set(sceneState.environment.fogColor);
    }
  }, [sceneState]);

  return <div ref={hostRef} className="scene-canvas" aria-label="Live Three.js scene preview" />;
}

function createRobot(bodyMaterial: THREE.MeshPhysicalMaterial, accentMaterial: THREE.MeshStandardMaterial) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.55, 0.82), bodyMaterial);
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.58, 0.62), bodyMaterial);
  head.position.y = 1.22;
  head.castShadow = true;
  group.add(head);

  const eyeGeometry = new THREE.SphereGeometry(0.075, 18, 18);
  for (const x of [-0.22, 0.22]) {
    const eye = new THREE.Mesh(eyeGeometry, accentMaterial);
    eye.position.set(x, 1.25, 0.34);
    group.add(eye);
  }

  const limbGeometry = new THREE.CapsuleGeometry(0.08, 0.86, 8, 20);
  const leftArm = new THREE.Mesh(limbGeometry, accentMaterial);
  leftArm.position.set(-0.9, 0.24, 0);
  leftArm.rotation.z = -0.78;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(limbGeometry, accentMaterial);
  rightArm.position.set(0.9, 0.24, 0);
  rightArm.rotation.z = 0.78;
  group.add(rightArm);

  const leftLeg = new THREE.Mesh(limbGeometry, accentMaterial);
  leftLeg.position.set(-0.36, -1.04, 0);
  leftLeg.rotation.z = 0.2;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(limbGeometry, accentMaterial);
  rightLeg.position.set(0.36, -1.04, 0);
  rightLeg.rotation.z = -0.2;
  group.add(rightLeg);

  return group;
}
