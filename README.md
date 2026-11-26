# gym — RepRig exercise animation pipeline

Data-driven 3D exercise animations for the gym app. One shared rig, one JSON module per exercise, a solver that turns coaching targets into joint angles, a Three.js player, and glTF export so every exercise can live inside a 3D scene (Unity, Unreal, Blender, three.js, model-viewer).

## What's here

| Path | What it is |
|---|---|
| `src/rig.json` | Shared rig `reprig-unisex-172-v1`: unisex adult, 172 cm. Joint hierarchy, segment lengths, body shapes, palette, muscle regions. Bilateral parts are authored once and mirrored. |
| `src/schema.json` | JSON Schema (draft 2020-12) every exercise module must pass. |
| `src/exercises/*.json` | Exercise modules: metadata, cues, mistakes, kinematics, phases, poses (anatomical joint angles), keyframes, IK contacts, muscle activation, guides. |
| `src/engine.js` | Pure-JS rig math: FK, two-bone IK, monotone-cubic timeline, measurements, LM solver. Runs in Node and the browser. |
| `src/player.js`, `src/template.html` | Three.js player: skinned mesh, muscle highlights, motion path, rotation protractor, gaze line, speed, side switch, camera presets, PNG and GLB export. |
| `build/lib.js` | Shared authoring helpers (planted-contact spine solve, arm-to-target, gaze, floor checks). |
| `build/author-*.js` + `build/meta/*.json` | One authoring script and one metadata file per exercise. The script solves the poses and writes the module. |
| `build/validate.js` | Validates every module against the schema. |
| `build/assemble.js` | Builds `player.html` (single file; three.js 0.160.0 from jsDelivr). |
| `build/export-gltf.mjs` | Writes `exports/<id>.glb` via headless Chrome. |
| `exports/*.glb` | Skinned mesh (24 joints) with two clips per exercise: `<id>_right` and `<id>_left`, 8 s at 30 fps. Meters, +Y up, figure faces +Z. |
| `test/verify.mjs` | Checks schema, planted hand/knees/pelvis, floor clearance, joint limits, GLBs, player load, speed, page errors. |
| `docs/research.md` | Studies, clinical articles and video demos for both exercises. |

## Exercises

- **A — Kneeling Back Rotation Stretch**: hands and knees, straight arm sweeps from under the chest up to the ceiling. Peak ≈40° thoracic + ≈5° lumbar rotation. Movement reference: GymVisual #429713.
- **B — Quadruped Thoracic Rotation**: hips sat back toward the heels (lumbar-locked), hand behind the head, elbow down toward the opposite hand, then rotate up. Peak ≈46° thoracic, ≈2° lumbar.

## Run it

```bash
npm install
npx playwright install chromium   # or point test/serve.mjs at an installed Chrome
npm run build                      # author -> validate -> assemble -> export GLB
npm run verify
```

Open `player.html` in a browser (needs internet for three.js and fonts).

## Adding an exercise

1. Copy `build/meta/<existing>.json` and write the new metadata, phases, activation and guides.
2. Copy an author script, set the base pose and the key poses (high-level targets: trunk rotation, wrist targets, gaze), and run it. It writes `src/exercises/<id>.json`.
3. `npm run build && npm run verify`.

For batch generation, give the model `src/schema.json` and ask it to return an exercise module for rig `reprig-unisex-172-v1`; `build/validate.js` gates what comes back.

## Units and conventions

Centimetres and degrees in JSON; meters in glTF. Rig axes: +X forward (head direction on all fours), +Y up, +Z the figure's right. Exercises are authored for the right side; the left side is a mirror. Shoulder angles use the ISB Y-X-Y globe (plane, elevation, axial rotation).

Muscle glow strength follows illustrative activation curves, not EMG data.
