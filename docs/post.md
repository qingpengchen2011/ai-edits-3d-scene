# Launch Post Draft

English:

I gave an AI agent a plain Three.js scene.

It inspected the scene, generated a structured patch, then changed material, lighting, camera, environment, and HUD telemetry in the browser.

Built with DeepAgentsJS + LangChain OpenRouter + `z-ai/glm-5.1`.

Open source:
https://github.com/qingpengchen2011/ai-edits-3d-scene

Chinese:

我给 AI agent 一个普通 Three.js 场景。

它先检查当前场景，再生成结构化 patch，最后在浏览器里真实修改材质、灯光、相机、环境和 HUD。

不是生成图片，是 AI 在改 3D 场景参数。

开源链接：
https://github.com/qingpengchen2011/ai-edits-3d-scene

## Recording Beats

1. Start from `Cyberpunk product shot`.
2. Click `Glass teardown` to show obvious material and lighting change.
3. Click `Launch trailer` to show camera and environment change.
4. Switch `Before`, `AI edit`, `Split`, and `Diff` to show what changed.
5. If `OPENROUTER_API_KEY` is set, choose an edit target and click `Run GLM agent`.
