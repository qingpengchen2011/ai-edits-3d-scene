import express from 'express';
import { createServer as createViteServer, loadEnv } from 'vite';
import { z } from 'zod';
import { hasOpenRouterKey, getOpenRouterModel, runSceneEditAgent } from './agent.js';
import { createBaseScene, editTargetSchema } from '../src/domain/scene.js';

const localEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
for (const [key, value] of Object.entries(localEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

const editRequestSchema = z.object({
  prompt: z.string().min(3),
  editTarget: editTargetSchema.optional(),
  scene: z.unknown().optional(),
  threadId: z.string().optional(),
});

const app = express();
const port = Number(process.env.PORT || 5174);

app.use(express.json({ limit: '1mb' }));

app.get('/api/status', (_request, response) => {
  response.json({
    hasOpenRouterKey: hasOpenRouterKey(),
    model: getOpenRouterModel(),
    agent: 'deepagentsjs',
  });
});

app.post('/api/edit-scene', async (request, response) => {
  const parsed = editRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!hasOpenRouterKey()) {
    response.status(428).json({
      error: 'OPENROUTER_API_KEY is not set. Presets still work locally; set the key to run the real DeepAgentsJS agent.',
      model: getOpenRouterModel(),
    });
    return;
  }

  try {
    const result = await runSceneEditAgent({
      prompt: parsed.data.prompt,
      scene: (parsed.data.scene as ReturnType<typeof createBaseScene> | undefined) || createBaseScene(),
      editTarget: parsed.data.editTarget,
      threadId: parsed.data.threadId,
    });
    response.json(result);
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown scene edit agent error',
      model: getOpenRouterModel(),
    });
  }
});

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

app.use(vite.middlewares);

app.listen(port, '127.0.0.1', () => {
  console.log(`AI Edits 3D Scene running at http://127.0.0.1:${port}`);
});
