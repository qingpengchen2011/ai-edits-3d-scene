---
name: scene-editor
description: Use when converting a natural language prompt into a constrained Three.js scene patch with material, lighting, camera, and environment edits.
---

# Scene Editor

## Goal

Turn a short visual prompt into a compact, recordable Three.js edit. The edit must be visible immediately on screen and easy to explain in an X post.

## Rules

- Always inspect the current scene before proposing changes.
- Change material, lighting, camera, environment, and HUD when the prompt asks for a full-scene mood or product-shot transformation.
- When the request includes a focused edit target, keep unrelated values close to the inspected scene and make the focused target visually obvious.
- For focused edits, put the focused target first in the diff and do not claim unchanged targets changed.
- Keep all colors as `#RRGGBB`.
- Keep numeric values within the schema limits.
- Produce 3-6 diff rows that explain exactly what changed.
- Do not invent source credits. The app already credits the upstream inspiration in its README.

## Good Patch Shape

- Material: body color, emissive color, metalness, roughness, opacity.
- Lighting: key color, rim color, key intensity, rim intensity.
- Camera: distance, height, orbit speed.
- Environment: top/bottom background, fog, floor color.
- HUD: telemetry primary/secondary colors, panel color, grid color, density, scan speed.
- Diff: before/after rows written for a technical audience.
