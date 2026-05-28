---
name: scene-editor
description: Use when converting a natural language prompt into a constrained Three.js scene patch with material, lighting, camera, and environment edits.
---

# Scene Editor

## Goal

Turn a short visual prompt into a compact, recordable Three.js edit. The edit must be visible immediately on screen and easy to explain in an X post.

## Rules

- Always inspect the current scene before proposing changes.
- Change material, lighting, camera, and environment when the prompt asks for a mood or product-shot transformation.
- Keep all colors as `#RRGGBB`.
- Keep numeric values within the schema limits.
- Produce 3-6 diff rows that explain exactly what changed.
- Do not invent source credits. The app already credits the upstream inspiration in its README.

## Good Patch Shape

- Material: body color, emissive color, metalness, roughness, opacity.
- Lighting: key color, rim color, key intensity, rim intensity.
- Camera: distance, height, orbit speed.
- Environment: top/bottom background, fog, floor color.
- Diff: before/after rows written for a technical audience.
