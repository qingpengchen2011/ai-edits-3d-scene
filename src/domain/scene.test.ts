import { describe, expect, it } from 'vitest';
import { applyScenePatch, createBaseScene, scenePatchSchema } from './scene';

describe('scene patch model', () => {
  it('applies material, lighting, camera, and environment changes', () => {
    const scene = createBaseScene();
    const patch = scenePatchSchema.parse({
      title: 'Cyberpunk product shot',
      rationale: 'Turn the plain robot scene into a high-contrast launch visual.',
      material: {
        bodyColor: '#111827',
        emissiveColor: '#ffb000',
        metalness: 0.82,
        roughness: 0.18,
        opacity: 0.68,
      },
      lighting: {
        keyColor: '#ffb000',
        rimColor: '#5de0c5',
        keyIntensity: 4.8,
        rimIntensity: 3.4,
      },
      camera: {
        distance: 6,
        height: 2.4,
        orbitSpeed: 0.42,
      },
      environment: {
        backgroundTop: '#060708',
        backgroundBottom: '#101826',
        fogColor: '#0b1419',
        floorColor: '#121820',
      },
      diff: [
        { target: 'material', before: 'matte shell', after: 'emissive amber glass' },
        { target: 'lighting', before: 'soft room light', after: 'hard rim light' },
        { target: 'camera', before: 'static front', after: 'orbit reveal shot' },
      ],
      xHook: 'I gave an AI a Three.js scene. It edited the lighting, material, camera, and mood.',
    });

    const edited = applyScenePatch(scene, patch);

    expect(edited.title).toBe('Cyberpunk product shot');
    expect(edited.material.bodyColor).toBe('#111827');
    expect(edited.material.opacity).toBe(0.68);
    expect(edited.lighting.keyIntensity).toBe(4.8);
    expect(edited.camera.orbitSpeed).toBe(0.42);
    expect(edited.environment.fogColor).toBe('#0b1419');
    expect(edited.diff).toHaveLength(3);
    expect(scene.material.bodyColor).not.toBe(edited.material.bodyColor);
  });
});
