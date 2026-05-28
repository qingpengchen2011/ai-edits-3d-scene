import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a #RRGGBB color');

export const editTargetSchema = z.enum(['full-scene', 'material', 'lighting', 'camera', 'environment', 'hud']);
export type EditTarget = z.infer<typeof editTargetSchema>;
export const comparisonReplayModes = ['before', 'after', 'split'] as const;

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
  hud: z.object({
    primaryColor: hexColorSchema,
    secondaryColor: hexColorSchema,
    panelColor: hexColorSchema,
    gridColor: hexColorSchema,
    density: z.number().min(0).max(1),
    scanSpeed: z.number().min(0).max(1.2),
  }),
  diff: z
    .array(
      z.object({
        target: z.enum(['material', 'lighting', 'camera', 'environment', 'hud']),
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
  hud: ScenePatch['hud'];
  diff: ScenePatch['diff'];
  rationale: string;
  xHook: string;
};

export type SceneDiffTarget = SceneState['diff'][number]['target'];

export function editTargetInstruction(target: EditTarget): string {
  const instructions: Record<EditTarget, string> = {
    'full-scene': 'Change the whole scene: material, lighting, camera, environment, and HUD accents.',
    material: 'Focus on material: body color, emissive color, metalness, roughness, and opacity should carry the edit.',
    lighting: 'Focus on lighting: key and rim colors plus intensity should make the change obvious.',
    camera: 'Focus on camera: distance, height, and orbit speed should create a new shot language.',
    environment: 'Focus on environment: background, fog, and floor should make the world feel different.',
    hud: 'Focus on HUD accents: telemetry colors, panels, grid, density, and scan speed should visibly change.',
  };

  return instructions[target];
}

export function createBaseScene(): SceneState {
  return {
    title: 'Trading-desk copilot console',
    material: {
      bodyColor: '#273241',
      emissiveColor: '#253041',
      metalness: 0.36,
      roughness: 0.54,
      opacity: 1,
    },
    lighting: {
      keyColor: '#f5f1e8',
      rimColor: '#5de0c5',
      keyIntensity: 2.3,
      rimIntensity: 1.5,
    },
    camera: {
      distance: 8.4,
      height: 2.5,
      orbitSpeed: 0.12,
    },
    environment: {
      backgroundTop: '#111827',
      backgroundBottom: '#060708',
      fogColor: '#111827',
      floorColor: '#161b22',
    },
    hud: {
      primaryColor: '#5de0c5',
      secondaryColor: '#ffb000',
      panelColor: '#17202a',
      gridColor: '#263341',
      density: 0.48,
      scanSpeed: 0.18,
    },
    diff: [
      { target: 'material', before: 'slate copilot shell', after: 'unchanged' },
      { target: 'lighting', before: 'quiet desk lighting', after: 'unchanged' },
      { target: 'camera', before: 'wide console orbit', after: 'unchanged' },
      { target: 'hud', before: 'soft telemetry panels', after: 'unchanged' },
    ],
    rationale: 'Base scene: a complex trading-desk AI copilot console before AI editing.',
    xHook: 'I gave an AI a complete Three.js control-room scene and asked it to edit the scene parameters.',
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
    hud: { ...patch.hud },
    diff: patch.diff.map((item) => ({ ...item })),
    rationale: patch.rationale,
    xHook: patch.xHook,
  };
}

export function changedTargets(before: SceneState, after: SceneState): SceneDiffTarget[] {
  const checks: Array<[SceneDiffTarget, unknown, unknown]> = [
    ['material', before.material, after.material],
    ['lighting', before.lighting, after.lighting],
    ['camera', before.camera, after.camera],
    ['environment', before.environment, after.environment],
    ['hud', before.hud, after.hud],
  ];

  return checks.filter(([, previous, next]) => JSON.stringify(previous) !== JSON.stringify(next)).map(([target]) => target);
}

export function actualSceneDiff(before: SceneState, after: SceneState): SceneState['diff'] {
  const targets = changedTargets(before, after);
  const agentRows = after.diff.filter((item) => targets.includes(item.target));
  if (agentRows.length > 0) {
    return agentRows;
  }

  return targets.map((target) => ({
    target,
    before: `previous ${target}`,
    after: `updated ${target}`,
  }));
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
    hud: {
      primaryColor: '#ffb000',
      secondaryColor: '#5de0c5',
      panelColor: '#101826',
      gridColor: '#ffb000',
      density: 0.82,
      scanSpeed: 0.46,
    },
    diff: [
      { target: 'material', before: 'matte shell', after: 'emissive amber glass' },
      { target: 'lighting', before: 'soft room light', after: 'hard amber and cyan rim light' },
      { target: 'camera', before: 'static front', after: 'orbit reveal shot' },
      { target: 'environment', before: 'plain studio', after: 'dashboard black haze' },
      { target: 'hud', before: 'soft telemetry', after: 'amber/cyan launch overlay' },
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
    hud: {
      primaryColor: '#5de0c5',
      secondaryColor: '#d8f7ff',
      panelColor: '#e5edf0',
      gridColor: '#5de0c5',
      density: 0.64,
      scanSpeed: 0.28,
    },
    diff: [
      { target: 'material', before: 'opaque robot body', after: 'transparent glass body' },
      { target: 'lighting', before: 'single soft light', after: 'cyan rim separation' },
      { target: 'camera', before: 'medium orbit', after: 'closer inspection orbit' },
      { target: 'environment', before: 'dark studio', after: 'bright inspection bay' },
      { target: 'hud', before: 'console overlay', after: 'inspection telemetry grid' },
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
    hud: {
      primaryColor: '#e94b5f',
      secondaryColor: '#ffb000',
      panelColor: '#1c1016',
      gridColor: '#e94b5f',
      density: 0.78,
      scanSpeed: 0.66,
    },
    diff: [
      { target: 'camera', before: 'front view', after: 'wide trailer orbit' },
      { target: 'lighting', before: 'neutral studio', after: 'amber/red launch contrast' },
      { target: 'material', before: 'flat shell', after: 'dark metallic hero shell' },
      { target: 'environment', before: 'simple floor', after: 'cinematic reveal stage' },
      { target: 'hud', before: 'quiet panels', after: 'red trailer telemetry' },
    ],
    xHook: 'I gave an AI a plain Three.js scene and it turned the camera, lighting, and materials into a launch trailer shot.',
  }),
};
