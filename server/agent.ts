import { tool } from '@langchain/core/tools';
import { ChatOpenRouter } from '@langchain/openrouter';
import { createDeepAgent, FilesystemBackend } from 'deepagents';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { type ScenePatch, type SceneState, scenePatchSchema } from '../src/domain/scene.js';

const inspectSceneSchema = z.object({
  reason: z.string().optional(),
});

export type AgentEditRequest = {
  prompt: string;
  scene: SceneState;
  threadId?: string;
};

export type AgentEditResponse = {
  patch: ScenePatch;
  model: string;
  agent: 'deepagentsjs';
};

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || 'z-ai/glm-5.1';
}

export async function runSceneEditAgent(request: AgentEditRequest): Promise<AgentEditResponse> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is required to run the real DeepAgentsJS scene editor.');
  }

  let capturedPatch: ScenePatch | undefined;

  const inspectScene = tool(
    async () => JSON.stringify(request.scene, null, 2),
    {
      name: 'inspect_scene',
      description: 'Inspect the current Three.js scene state before editing it.',
      schema: inspectSceneSchema,
    },
  );

  const applyScenePatchTool = tool(
    async (input) => {
      capturedPatch = scenePatchSchema.parse(input);
      return `Scene patch accepted: ${capturedPatch.title}`;
    },
    {
      name: 'apply_scene_patch',
      description: 'Submit the final scene edit patch. Call exactly once after inspecting the scene.',
      schema: scenePatchSchema,
    },
  );

  const modelName = getOpenRouterModel();
  const model = new ChatOpenRouter({
    model: modelName,
    temperature: 0.2,
    siteName: 'AI Edits 3D Scene',
    siteUrl: 'https://github.com/qingpengchen2011/ai-edits-3d-scene',
  });

  const agent = createDeepAgent({
    name: 'scene-edit-agent',
    model,
    tools: [inspectScene, applyScenePatchTool],
    backend: new FilesystemBackend({ rootDir: process.cwd(), virtualMode: true }),
    skills: ['/agent-skills/'],
    checkpointer: new MemorySaver(),
    systemPrompt: [
      'You are a visual Three.js scene editor.',
      'Your job is to convert a user prompt into a constrained scene patch.',
      'First inspect the scene with inspect_scene.',
      'Then call apply_scene_patch exactly once.',
      'The patch must visibly alter material, lighting, camera, and environment.',
      'Keep values within the provided tool schema.',
      'Prefer a striking, recordable before/after visual over subtle edits.',
    ].join('\n'),
  });

  await agent.invoke(
    {
      messages: [
        {
          role: 'user',
          content: [
            `Prompt: ${request.prompt}`,
            '',
            'Create a strong visual edit for the current scene.',
            'The result must be suitable for an X demo video and must include a concise xHook.',
          ].join('\n'),
        },
      ],
    },
    {
      configurable: {
        thread_id: request.threadId || `scene-edit-${Date.now()}`,
      },
    },
  );

  if (!capturedPatch) {
    throw new Error('The scene edit agent finished without calling apply_scene_patch.');
  }

  return {
    patch: capturedPatch,
    model: modelName,
    agent: 'deepagentsjs',
  };
}
