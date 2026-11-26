# RepRig exercise pipeline (test exercise: Kneeling Back Rotation Stretch)

src/rig.json          Shared rig (female, 165 cm): joints, segment lengths, body shapes, muscle regions
src/schema.json       JSON Schema (draft 2020-12) every exercise module must validate against
src/exercise.json     Exercise module: metadata, phases, poses (anatomical joint angles), keyframes, IK contacts, activation, guides
src/engine.js         Pure-JS rig engine: FK, two-bone IK, monotone-cubic timeline, orthographic 2.5D projection, LM solver
src/app.js, template.html  Canvas player UI
build/author.js       Authoring + solve: high-level targets -> constrained joint angles -> exercise.json
build/assemble.js     Inlines everything into one self-contained HTML (player.html)
verify.mjs            Playwright checks: contact slide, floor clearance, joint limits, gaze, speed, console errors

Run: node build/author.js && node build/assemble.js
New exercise: write a new author script (or have the batch prompt return an exercise.json), validate with ajv against schema.json, assemble.
