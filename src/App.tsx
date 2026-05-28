import { useEffect, useMemo, useState } from 'react';
import { Box, ExternalLink, Github, Loader2, Play, Sparkles } from 'lucide-react';
import SceneCanvas from './components/SceneCanvas';
import { applyScenePatch, createBaseScene, presetPatches, type ScenePatch, type SceneState } from './domain/scene';

type ApiStatus = {
  hasOpenRouterKey: boolean;
  model: string;
  agent: string;
};

const presetButtons = [
  { id: 'cyberpunk', label: 'Cyberpunk product shot', prompt: 'Make it a cyberpunk product shot' },
  { id: 'glass', label: 'Glass teardown', prompt: 'Turn the robot into glass' },
  { id: 'trailer', label: 'Launch trailer', prompt: 'Move camera into trailer mode' },
];

export default function App() {
  const [baseScene] = useState(() => createBaseScene());
  const [sceneState, setSceneState] = useState<SceneState>(() => applyScenePatch(createBaseScene(), presetPatches.cyberpunk));
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof presetPatches>('cyberpunk');
  const [prompt, setPrompt] = useState('Make it a cyberpunk product shot');
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [agentError, setAgentError] = useState('');
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const patchPreview = useMemo(() => buildPatchPreview(sceneState), [sceneState]);

  useEffect(() => {
    fetch('/api/status')
      .then((response) => response.json())
      .then((data: ApiStatus) => setStatus(data))
      .catch(() => setStatus({ hasOpenRouterKey: false, model: 'z-ai/glm-5.1', agent: 'deepagentsjs' }));
  }, []);

  function applyPreset(id: keyof typeof presetPatches) {
    const patch = presetPatches[id];
    setPrompt(presetButtons.find((item) => item.id === id)?.prompt ?? prompt);
    setSelectedPreset(id);
    setSceneState(applyScenePatch(baseScene, patch));
    setAgentError('');
  }

  async function runAgent() {
    setIsRunningAgent(true);
    setAgentError('');
    try {
      const response = await fetch('/api/edit-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, scene: sceneState, threadId: 'demo-thread' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Agent request failed');
      }
      setSceneState(applyScenePatch(baseScene, data.patch as ScenePatch));
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Unknown agent error');
    } finally {
      setIsRunningAgent(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Box size={25} />
          </div>
          <div>
            <p>AI Edits 3D Scene</p>
            <h1>Prompt an agent. Watch the Three.js scene actually change.</h1>
          </div>
        </div>
        <div className="source-links">
          <span>{status?.agent ?? 'deepagentsjs'} · {status?.model ?? 'z-ai/glm-5.1'}</span>
          <a href="https://github.com/qingpengchen2011/ai-edits-3d-scene" target="_blank" rel="noreferrer">
            <Github size={17} />
            source
          </a>
          <a href="https://github.com/DmitriyGolub/threejs-devtools-mcp" target="_blank" rel="noreferrer">
            <Github size={17} />
            upstream
          </a>
        </div>
      </header>

      <section className="workspace">
        <aside className="prompt-panel">
          <div className="panel-intro">
            <span>Prompt presets</span>
            <h2>Tell the agent what mood to build.</h2>
            <p>Preset buttons are deterministic for recording. The agent button calls DeepAgentsJS and OpenRouter when your key is set.</p>
          </div>

          <div className="preset-list">
            {presetButtons.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedPreset === item.id ? 'active' : ''}
                onClick={() => applyPreset(item.id as keyof typeof presetPatches)}
              >
                <span>{selectedPreset === item.id ? 'active prompt' : 'prompt'}</span>
                {item.label}
              </button>
            ))}
          </div>

          <label className="prompt-input">
            Custom prompt
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>

          <button className="agent-button" type="button" onClick={runAgent} disabled={isRunningAgent}>
            {isRunningAgent ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            Run GLM agent
          </button>

          {agentError ? <p className="agent-error">{agentError}</p> : null}

          <div className="x-hook">
            <span>X hook</span>
            <p>{sceneState.xHook}</p>
            <small>中文：这不是生成图片，是 AI 真的在改 3D 场景参数。</small>
          </div>
        </aside>

        <section
          className="viewport-panel"
          style={{
            background: `linear-gradient(180deg, ${sceneState.environment.backgroundTop}, ${sceneState.environment.backgroundBottom})`,
          }}
        >
          <div className="viewport-heading">
            <div>
              <span>Live scene</span>
              <h2>{sceneState.title}</h2>
              <small>Before -&gt; AI edited</small>
            </div>
            <div className="diff-pill">diff mode on</div>
          </div>
          <SceneCanvas sceneState={sceneState} />
          <div className="viewport-footer">
            <div>
              <span />
              AI changed {sceneState.diff.length} scene properties: {sceneState.diff.map((item) => item.target).join(', ')}.
            </div>
            <button type="button" onClick={() => setSceneState({ ...sceneState })}>
              <Play size={17} />
              Replay edit
            </button>
          </div>
        </section>

        <aside className="diff-panel">
          <div className="panel-intro compact">
            <span>AI edit diff</span>
            <h2>What changed?</h2>
          </div>

          <div className="diff-list">
            {sceneState.diff.map((item) => (
              <div className="diff-row" key={`${item.target}-${item.after}`}>
                <span className={`diff-dot ${item.target}`} />
                <div>
                  <strong>{item.target}</strong>
                  <p>{item.before} -&gt; {item.after}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="patch-box">
            <span>Generated patch</span>
            <pre>{patchPreview}</pre>
          </div>

          <div className="publish-gate">
            <span>Publish gate</span>
            <p>Public demo repo</p>
            <p>Upstream source link</p>
            <p>MIT license credit</p>
          </div>

          <a className="repo-link" href="https://github.com/langchain-ai/deepagentsjs" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Built with DeepAgentsJS
          </a>
        </aside>
      </section>
    </main>
  );
}

function buildPatchPreview(sceneState: SceneState): string {
  return [
    `material.emissive = ${sceneState.material.emissiveColor}`,
    `material.opacity = ${sceneState.material.opacity}`,
    `light.intensity = ${sceneState.lighting.keyIntensity}`,
    `camera.orbitSpeed = ${sceneState.camera.orbitSpeed}`,
    `fog.color = ${sceneState.environment.fogColor}`,
  ].join('\n');
}
