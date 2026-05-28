import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #RRGGBB color');

export const scenePatchSchema = z.object({
  title: z.string().min(3),
  rationale: z.string().min(12),
  material: z.object({
    bodyColor: hexColorSchema,
    emissiveColor: hexColorSchema,
    metalness: z.number().min(0).max(1),
    roughness: z.number().min(0).max(1),
    opacity: z.number().min(0.28).max(1).default(1),
  }),
  lighting: z.object({
    keyColor: hexColorSchema,
    rimColor: hexColorSchema,
    keyIntensity: z.number().min(0).max(8),
    rimIntensity: z.number().min(0).max(8),
  }),
  camera: z.object({
    distance: z.number().min(3).max(12),
    height: z.number().min(0.6).max(6),
    orbitSpeed: z.number().min(0).max(1.2),
  }),
  environment: z.object({
    backgroundTop: hexColorSchema,
    backgroundBottom: hexColorSchema,
    fogColor: hexColorSchema,
    floorColor: hexColorSchema,
  }),
  diff: z
    .array(
      z.object({
        target: z.enum(['material', 'lighting', 'camera', 'environment']),
        before: z.string().min(2),
        after: z.string().min(2),
      }),
    )
    .min(3)
    .max(6),
  xHook: z.string().min(20),
});

export type ScenePatch = z.infer<typeof scenePatchSchema>;

export type SceneState = {
  title: string;
  material: ScenePatch['material'];
  lighting: ScenePatch['lighting'];
  camera: ScenePatch['camera'];
  environment: ScenePatch['environment'];
  diff: ScenePatch['diff'];
  rationale: string;
  xHook: string;
};

export function createBaseScene(): SceneState {
  return {
    title: 'Plain studio robot',
    material: {
      bodyColor: '#1f2937',
      emissiveColor: '#000000',
      metalness: 0.22,
      roughness: 0.72,
      opacity: 1,
    },
    lighting: {
      keyColor: '#f5f1e8',
      rimColor: '#9ca3af',
      keyIntensity: 1.8,
      rimIntensity: 0.8,
    },
    camera: {
      distance: 7,
      height: 1.7,
      orbitSpeed: 0.08,
    },
    environment: {
      backgroundTop: '#111827',
      backgroundBottom: '#020617',
      fogColor: '#111827',
      floorColor: '#1f2937',
    },
    diff: [
      { target: 'material', before: 'default matte shell', after: 'unchanged' },
      { target: 'lighting', before: 'soft studio light', after: 'unchanged' },
      { target: 'camera', before: 'slow front orbit', after: 'unchanged' },
    ],
    rationale: 'Base scene before AI editing.',
    xHook: 'I gave an AI a Three.js scene and asked it to edit the scene parameters.',
  };
}

export function applyScenePatch(scene: SceneState, patch: ScenePatch): SceneState {
  return {
    ...scene,
    title: patch.title,
    material: { ...patch.material },
    lighting: { ...patch.lighting },
    camera: { ...patch.camera },
    environment: { ...patch.environment },
    diff: patch.diff.map((item) => ({ ...item })),
    rationale: patch.rationale,
    xHook: patch.xHook,
  };
}

export const presetPatches: Record<string, ScenePatch> = {
  cyberpunk: scenePatchSchema.parse({
    title: 'Cyberpunk product shot',
    rationale: 'Turn the plain robot scene into a high-contrast launch visual with obvious mood, material, and camera changes.',
    material: {
      bodyColor: '#111827',
      emissiveColor: '#ffb000',
      metalness: 0.82,
      roughness: 0.18,
      opacity: 1,
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
      { target: 'lighting', before: 'soft room light', after: 'hard amber and cyan rim light' },
      { target: 'camera', before: 'static front', after: 'orbit reveal shot' },
      { target: 'environment', before: 'plain studio', after: 'dashboard black haze' },
    ],
    xHook: 'I gave an AI a Three.js scene. It edited the lighting, material, camera, and mood in one click.',
  }),
  glass: scenePatchSchema.parse({
    title: 'Glass robot teardown',
    rationale: 'Make the subject feel inspectable by shifting from opaque material to cool translucent glass with strong rim separation.',
    material: {
      bodyColor: '#d8f7ff',
      emissiveColor: '#5de0c5',
      metalness: 0.08,
      roughness: 0.04,
      opacity: 0.48,
    },
    lighting: {
      keyColor: '#f5f1e8',
      rimColor: '#5de0c5',
      keyIntensity: 3.2,
      rimIntensity: 4.6,
    },
    camera: {
      distance: 5.6,
      height: 2.1,
      orbitSpeed: 0.3,
    },
    environment: {
      backgroundTop: '#f5f1e8',
      backgroundBottom: '#9ca3af',
      fogColor: '#d8f7ff',
      floorColor: '#e5edf0',
    },
    diff: [
      { target: 'material', before: 'opaque robot body', after: 'transparent glass body' },
      { target: 'lighting', before: 'single soft light', after: 'cyan rim separation' },
      { target: 'camera', before: 'medium orbit', after: 'closer inspection orbit' },
      { target: 'environment', before: 'dark studio', after: 'bright inspection bay' },
    ],
    xHook: 'I asked an AI to turn a plain Three.js robot into a glass product teardown scene.',
  }),
  trailer: scenePatchSchema.parse({
    title: 'Launch trailer reveal',
    rationale: 'Push the scene toward a launch-trailer moment with a wider camera, dramatic floor, and red accent contrast.',
    material: {
      bodyColor: '#0f172a',
      emissiveColor: '#e94b5f',
      metalness: 0.68,
      roughness: 0.26,
      opacity: 1,
    },
    lighting: {
      keyColor: '#ffb000',
      rimColor: '#e94b5f',
      keyIntensity: 3.9,
      rimIntensity: 4.1,
    },
    camera: {
      distance: 8.2,
      height: 3.1,
      orbitSpeed: 0.52,
    },
    environment: {
      backgroundTop: '#050607',
      backgroundBottom: '#2a1016',
      fogColor: '#18070b',
      floorColor: '#16181d',
    },
    diff: [
      { target: 'camera', before: 'front view', after: 'wide trailer orbit' },
      { target: 'lighting', before: 'neutral studio', after: 'amber/red launch contrast' },
      { target: 'material', before: 'flat shell', after: 'dark metallic hero shell' },
      { target: 'environment', before: 'simple floor', after: 'cinematic reveal stage' },
    ],
    xHook: 'I gave an AI a plain Three.js scene and it turned the camera, lighting, and materials into a launch trailer shot.',
  }),
};
