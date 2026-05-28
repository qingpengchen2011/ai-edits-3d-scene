import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ExternalLink, Github, GitCompare, Loader2, Play, SlidersHorizontal, Sparkles } from 'lucide-react';
import SceneCanvas, { type ViewMode } from './components/SceneCanvas';
import {
  applyScenePatch,
  actualSceneDiff,
  comparisonReplayModes,
  createBaseScene,
  presetPatches,
  type EditTarget,
  type ScenePatch,
  type SceneState,
} from './domain/scene';

type ApiStatus = {
  hasOpenRouterKey: boolean;
  model: string;
  agent: string;
};

const presetButtons = [
  { id: 'cyberpunk', label: 'Cyberpunk product shot', prompt: 'Make it a cyberpunk product shot' },
  { id: 'glass', label: 'Glass teardown', prompt: 'Turn the robot into glass' },
  { id: 'trailer', label: 'Launch trailer', prompt: 'Move camera into trailer mode' },
] as const;

const editTargets: Array<{ id: EditTarget; label: string }> = [
  { id: 'full-scene', label: 'Full scene' },
  { id: 'material', label: 'Material' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'camera', label: 'Camera' },
  { id: 'environment', label: 'Environment' },
  { id: 'hud', label: 'HUD accents' },
];

const viewModes: Array<{ id: ViewMode; label: string }> = [
  { id: 'before', label: 'Before' },
  { id: 'after', label: 'AI edit' },
  { id: 'split', label: 'Split' },
  { id: 'diff', label: 'Diff' },
];

export default function App() {
  const [baseScene] = useState(() => createBaseScene());
  const [beforeScene, setBeforeScene] = useState<SceneState>(() => createBaseScene());
  const [sceneState, setSceneState] = useState<SceneState>(() => applyScenePatch(createBaseScene(), presetPatches.cyberpunk));
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof presetPatches | null>('cyberpunk');
  const [viewMode, setViewMode] = useState<ViewMode>('after');
  const [editTarget, setEditTarget] = useState<EditTarget>('full-scene');
  const [changeSource, setChangeSource] = useState('Preset: Cyberpunk product shot');
  const [prompt, setPrompt] = useState('Make it a cyberpunk product shot');
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [agentError, setAgentError] = useState('');
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayTimers = useRef<number[]>([]);
  const patchPreview = useMemo(() => buildPatchPreview(sceneState), [sceneState]);

  useEffect(() => {
    fetch('/api/status')
      .then((response) => response.json())
      .then((data: ApiStatus) => setStatus(data))
      .catch(() => setStatus({ hasOpenRouterKey: false, model: 'z-ai/glm-5.1', agent: 'deepagentsjs' }));
  }, []);

  useEffect(() => () => clearReplayTimers(), []);

  function clearReplayTimers() {
    for (const timer of replayTimers.current) {
      window.clearTimeout(timer);
    }
    replayTimers.current = [];
  }

  function replayComparison() {
    clearReplayTimers();
    setIsReplaying(true);
    comparisonReplayModes.forEach((mode, index) => {
      replayTimers.current.push(
        window.setTimeout(() => {
          setViewMode(mode);
        }, index * 850),
      );
    });
    replayTimers.current.push(
      window.setTimeout(() => {
        setIsReplaying(false);
      }, comparisonReplayModes.length * 850),
    );
  }

  function applyPreset(id: keyof typeof presetPatches) {
    const patch = presetPatches[id];
    setPrompt(presetButtons.find((item) => item.id === id)?.prompt ?? prompt);
    setSelectedPreset(id);
    setBeforeScene(baseScene);
    setSceneState(applyScenePatch(baseScene, patch));
    setChangeSource(`Preset: ${patch.title}`);
    setViewMode('after');
    setIsReplaying(false);
    clearReplayTimers();
    setAgentError('');
  }

  async function runAgent() {
    setIsRunningAgent(true);
    setAgentError('');
    const previousScene = sceneState;
    try {
      const response = await fetch('/api/edit-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, scene: sceneState, editTarget, threadId: 'demo-thread' }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Agent request failed');
      }
      const editedScene = applyScenePatch(previousScene, data.patch as ScenePatch);
      setBeforeScene(previousScene);
      setSceneState({ ...editedScene, diff: actualSceneDiff(previousScene, editedScene) });
      setSelectedPreset(null);
      setChangeSource(`GLM generated: ${editTargets.find((item) => item.id === editTarget)?.label ?? editTarget}`);
      setViewMode('split');
      setIsReplaying(false);
      clearReplayTimers();
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
            <p>Preset buttons are deterministic for recording. The target switch lets GLM focus the edit.</p>
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

          <div className="target-switcher">
            <span>
              <SlidersHorizontal size={15} />
              Edit target
            </span>
            <div>
              {editTargets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={editTarget === item.id ? 'active' : ''}
                  onClick={() => setEditTarget(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label className="prompt-input">
            Custom prompt
            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setSelectedPreset(null);
              }}
            />
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
            background: `linear-gradient(180deg, ${displayedScene(viewMode, beforeScene, sceneState).environment.backgroundTop}, ${
              displayedScene(viewMode, beforeScene, sceneState).environment.backgroundBottom
            })`,
          }}
        >
          <div className="viewport-heading">
            <div>
              <span>Live scene</span>
              <h2>{displayTitle(viewMode, beforeScene, sceneState)}</h2>
              <small>{changeSource}</small>
            </div>
            <div className="view-switcher" aria-label="Scene comparison mode">
              <GitCompare size={16} />
              {viewModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={viewMode === item.id ? 'active' : ''}
                  onClick={() => setViewMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <SceneCanvas sceneState={sceneState} beforeState={beforeScene} viewMode={viewMode} />
          <div className="viewport-footer">
            <div>
              <span />
              {footerText(viewMode, sceneState)}
            </div>
            <button type="button" onClick={replayComparison} disabled={isReplaying}>
              <Play size={17} />
              {isReplaying ? 'Replaying...' : 'Replay compare'}
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
    `hud.primary = ${sceneState.hud.primaryColor}`,
    `hud.density = ${sceneState.hud.density}`,
  ].join('\n');
}

function displayedScene(viewMode: ViewMode, beforeScene: SceneState, sceneState: SceneState): SceneState {
  return viewMode === 'before' ? beforeScene : sceneState;
}

function displayTitle(viewMode: ViewMode, beforeScene: SceneState, sceneState: SceneState): string {
  if (viewMode === 'before') {
    return beforeScene.title;
  }
  if (viewMode === 'split') {
    return 'Before / AI Edit';
  }
  if (viewMode === 'diff') {
    return 'Changed Scene Diff';
  }
  return sceneState.title;
}

function footerText(viewMode: ViewMode, sceneState: SceneState): string {
  if (viewMode === 'before') {
    return 'Showing the scene before the last AI or preset edit.';
  }
  if (viewMode === 'split') {
    return `Split compare: left is before, right is the AI edit across ${sceneState.diff.length} changed targets.`;
  }
  if (viewMode === 'diff') {
    return `Diff mode highlights changed targets: ${sceneState.diff.map((item) => item.target).join(', ')}.`;
  }
  return `AI changed ${sceneState.diff.length} scene properties: ${sceneState.diff.map((item) => item.target).join(', ')}.`;
}
