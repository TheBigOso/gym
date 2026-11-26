// Authoring + kinematic solve for "Kneeling Back Rotation Stretch" (right side authored; left = mirror).
// Produces src/exercise.json with explicit anatomical joint angles per pose.
const fs = require('fs');
const path = require('path');
require('../src/engine.js');
const R = globalThis.RepRig;
const { V, Q } = R;
const rigDef = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/rig.json'), 'utf8'));
const rig = R.buildRig(rigDef);

const KNEE_H = 6, HIP_H = KNEE_H + 40.5, WRIST_H = 2.6;
const UA = 29, FA = 24;
const reach = (flex) => Math.sqrt(UA * UA + FA * FA + 2 * UA * FA * Math.cos(flex * R.DEG));
const flexFor = (d) => Math.acos(Math.max(-1, Math.min(1, (d * d - UA * UA - FA * FA) / (2 * UA * FA)))) / R.DEG;
const r1 = (v) => Math.round(v * 10) / 10;
const handRotL = Q.fromBasis([0, -1, 0], [-1, 0, 0], [0, 0, -1]); // palm down, fingers toward head
const handRotR = Q.mirrorZ(handRotL);
let PLANTED_WRIST = null;
const contacts = [{ id: 'arm_l', label: 'Support hand (left)', chain: ['shoulder_l', 'elbow_l', 'wrist_l', 'handtip_l'], pole: [-1, 0.1, -0.35], handRot: handRotL.map((v) => +v.toFixed(6)) }];

function basePose(pitch) {
  return {
    root: { pos: [0, HIP_H, 0], rot: { pitch } },
    ch: {
      hip_r: { flex: -pitch }, hip_l: { flex: -pitch }, knee_r: { flex: 90 }, knee_l: { flex: 90 },
      ankle_r: { dorsi: -72 }, ankle_l: { dorsi: -72 },
      spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 },
      neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 },
      sc_r: { protract: 5, elevate: 0 }, sc_l: { protract: 5, elevate: 0 },
      shoulder_l: { plane: 90, elev: 76, axial: 0 }, elbow_l: { flex: 10 }, wrist_l: { pron: 80, flex: -80, dev: 0 },
    },
  };
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const fk = (pose, withIK = true) => R.evalPose(rig, pose, withIK ? contacts : null);

// 1) Trunk pitch so the support shoulder sits over a flat hand with a soft (10 deg) elbow.
let lo = -89, hi = -55, pitch = -76;
for (let i = 0; i < 60; i++) {
  pitch = (lo + hi) / 2;
  const W = fk(basePose(pitch), false);
  const f = W.shoulder_l.p[1] - WRIST_H - reach(10);
  if (f > 0) hi = pitch; else lo = pitch;
}
pitch = r1(pitch);
const base = basePose(pitch);
const W0 = fk(base, false);
const SL0 = W0.shoulder_l.p.slice();
const tL = [r1(SL0[0]), WRIST_H, r1(SL0[2])];
const tR = [tL[0], WRIST_H, -tL[2]];
base.ik = { arm_l: { target: tL, weight: 1 } };

// 2) Spine solve: distribute axial rotation (L5-S1 12%, T12 44%, T6 44%), then find the small coupled
//    lateral flexion/flexion + support-side scapular protraction that keep the planted shoulder over its hand.
const SPLIT = { spine_l5: 0.12, spine_t12: 0.44, spine_t6: 0.44 };
function solveSpine(pose, theta) {
  const set = (x) => {
    const p = clone(pose);
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: theta * SPLIT[j], latFlex: x[i * 2], flex: x[i * 2 + 1] }; });
    p.ch.sc_l = { protract: x[6], elevate: x[7] };
    return p;
  };
  const res = (x) => {
    const W = fk(set(x), false);
    const e = V.sub(W.shoulder_l.p, SL0);
    return [e[0] * 4, e[1] * 4, e[2] * 4, x[0] * 0.14, x[1] * 0.1, x[2] * 0.12, x[3] * 0.1, x[4] * 0.12, x[5] * 0.1, (x[6] - 5) * 0.045, x[7] * 0.06];
  };
  const sol = R.solveLM([0, 0, 0, 0, 0, 0, 5, 0], res, { iters: 200 });
  const p = set(sol.x.map(r1));
  const err = V.len(V.sub(fk(p, false).shoulder_l.p, SL0));
  return { pose: p, err };
}

// 3) Right (working) arm: solve ISB shoulder angles to hit a wrist target.
function solveArm(pose, spec) {
  const p = clone(pose);
  const Wb = fk(p, false);
  const S = Wb.shoulder_r.p;
  if (spec.planted) {
    // Step A: arm geometry from analytic two-bone IK (mirror of the support arm), then match it with FK channels.
    const Wi = R.evalPose(rig, Object.assign(clone(p), { ik: { arm_r: { target: tR, weight: 1 } } }), [{ id: 'arm_r', chain: ['shoulder_r', 'elbow_r', 'wrist_r', 'handtip_r'], pole: [-1, 0.1, 0.35], handRot: handRotR }]);
    const Eg = Wi.elbow_r.p, Wg = Wi.wrist_r.p;
    const setA = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; q.ch.elbow_r = { flex: x[3] }; return q; };
    const resA = (x) => { const W = fk(setA(x), false); const e1 = V.sub(W.elbow_r.p, Eg), e2 = V.sub(W.wrist_r.p, Wg); return [...e1, ...e2].map((v) => v * 3).concat([x[2] * 0.02]); };
    const a = R.solveLM([88, 76, 0, 10], resA, { iters: 300 }).x.map(r1);
    const pa = setA(a);
    const setB = (x) => { const q = clone(pa); q.ch.wrist_r = { pron: x[0], flex: x[1], dev: x[2] }; return q; };
    const resB = (x) => { const hq = fk(setB(x), false).wrist_r.q; const ax = V.sub(Q.rot(hq, [1, 0, 0]), Q.rot(handRotR, [1, 0, 0])), ay = V.sub(Q.rot(hq, [0, 1, 0]), Q.rot(handRotR, [0, 1, 0])); return [...ax, ...ay].map((v) => v * 20).concat([(x[0] - 85) * 0.01]); };
    let best = null;
    for (const g of [[85, -80, 0], [60, -80, 0], [110, -80, 0]]) { const s2 = R.solveLM(g, resB, { iters: 300 }); if (!best || s2.cost < best.cost) best = s2; }
    const wrap = (a) => ((a + 540) % 360) - 180;
    best.x = best.x.map(wrap);
    PLANTED_WRIST = { pron: r1(best.x[0]), flex: r1(best.x[1]), dev: r1(best.x[2]) };
    return setB(best.x.map(r1));
  }
  let target, flex;
  if (spec.wrist) { target = spec.wrist; flex = flexFor(V.len(V.sub(target, S))); }
  else { flex = spec.flex; target = V.add(S, V.scale(V.norm(spec.dir), reach(flex))); }
  flex = r1(flex);
  p.ch.elbow_r = { flex };
  p.ch.wrist_r = spec.droop != null ? { pron: PLANTED_WRIST.pron, flex: r1(PLANTED_WRIST.flex + spec.droop), dev: PLANTED_WRIST.dev } : { pron: spec.pron ?? 0, flex: spec.wflex ?? 0, dev: 0 };
  const set = (x) => { const q = clone(p); q.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return q; };
  const res = (x) => { const e = V.sub(fk(set(x), false).wrist_r.p, target); return [e[0] * 3, e[1] * 3, e[2] * 3, (x[2] - (spec.axial ?? 0)) * 0.02]; };
  const sol = R.solveLM(spec.guess || [40, 90, 0], res, { iters: 300 });
  return set(sol.x.map(r1));
}

// 4) Key poses (right side working).
const KEYS = [
  { name: 'tabletop', theta: 0, scR: [5, 0], head: [0, 0], arm: { planted: true } },
  { name: 'unload', theta: -2, scR: [6, 8], head: [-3, 3], arm: { wrist: V.add(tR, [-1.5, 4, -2.5]), droop: 15, axial: -65, guess: [88, 76, -65] } },
  { name: 'windup', gaze: 35, theta: -9, scR: [14, 2], head: [-8, 8], arm: { wristRel: [-3, null, -13], wristY: 7.5, droop: 12, axial: -55, guess: [95, 76, -55] } },
  { name: 'clear', gaze: 35, theta: 3, scR: [8, 3], head: [0, 5], arm: { dir: [0.0, -0.7, 0.71], flex: 30, pron: 160, wflex: -45, axial: -40, guess: [60, 90, -40] } },
  { name: 'sweep', gaze: 30, theta: 14, scR: [4, 2], head: [6, 1], arm: { dir: [0.02, -0.55, 0.83], flex: 12, pron: 120, wflex: -10, axial: -25, guess: [20, 120, -25] } },
  { name: 'rise', gaze: 38, theta: 32, scR: [-4, 3], head: [18, -4], arm: { dir: [0.05, 0.45, 0.89], flex: 8, pron: 80, wflex: 0, axial: 0, guess: [0, 150, 0] } },
  { name: 'peak', gaze: 38, theta: 45, scR: [-10, 5], head: [32, -8], arm: { dir: [0.06, 1, 0.05], flex: 5, pron: 60, wflex: 0, axial: 0, guess: [-30, 160, 0] } },
  { name: 'peakBreath', gaze: 38, theta: 47.5, scR: [-11, 5], head: [33, -9], arm: { dir: [0.06, 1, 0.03], flex: 5, pron: 60, wflex: 0, axial: 0, guess: [-30, 160, 0] } },
  { name: 'descend', gaze: 30, theta: 24, scR: [-2, 2], head: [14, -2], arm: { dir: [0.02, 0.15, 0.99], flex: 8, pron: 110, wflex: -5, axial: 0, guess: [0, 120, 0] } },
  { name: 'touchdown', theta: 3, scR: [5, 6], head: [3, 2], arm: { wrist: V.add(tR, [-1, 3.5, 0.5]), droop: 12, axial: -65, guess: [88, 76, -65] } },
];
const poses = {}; const report = [];
for (const k of KEYS) {
  const p0 = clone(base);
  const { pose, err } = solveSpine(p0, k.theta);
  pose.ch.sc_r = { protract: k.scR[0], elevate: k.scR[1] };
  // cervical: 40% at C7, 60% at C1
  pose.ch.neck_c7 = { rot: r1(k.head[0] * 0.4), flex: r1(k.head[1] * 0.4) };
  pose.ch.head_c1 = { rot: r1(k.head[0] * 0.6), flex: r1(k.head[1] * 0.6) };
  let spec = k.arm;
  if (spec.wristRel) { const S = fk(pose, false).shoulder_r.p; spec = Object.assign({}, spec, { wrist: [S[0] + spec.wristRel[0], spec.wristY, S[2] + spec.wristRel[2]] }); }
  const solved = solveArm(pose, spec);
  if (k.gaze) {
    const setH = (x) => { const q = clone(solved); q.ch.neck_c7 = { rot: r1(x[0] * 0.4), flex: r1(x[1] * 0.4) }; q.ch.head_c1 = { rot: r1(x[0] * 0.6), flex: r1(x[1] * 0.6) }; return q; };
    const resH = (x) => { const q = clone(solved); q.ch.neck_c7 = { rot: x[0] * 0.4, flex: x[1] * 0.4 }; q.ch.head_c1 = { rot: x[0] * 0.6, flex: x[1] * 0.6 }; const W = fk(q, false), H = W.head_c1, eye = V.add(H.p, Q.rot(H.q, [11, 8, 0]));
      const err = V.angle(Q.rot(H.q, [1, 0, 0]), V.sub(W.handtip_r.p, eye));
      return [Math.max(0, err - k.gaze) * 1, (x[0] - k.head[0]) * 0.12, (x[1] - k.head[1]) * 0.12, Math.max(0, Math.abs(x[0]) - 55) * 4, Math.max(0, -x[1] - 20) * 4]; };
    const hs = R.solveLM(k.head.slice(), resH, { iters: 200 });
    Object.assign(solved.ch, setH(hs.x).ch);
  }
  poses[k.name] = solved;
  report.push({ name: k.name, theta: k.theta, supportShoulderErr: +err.toFixed(2), spine: ['spine_l5', 'spine_t12', 'spine_t6'].map((j) => solved.ch[j]), scL: solved.ch.sc_l, armR: [solved.ch.shoulder_r, solved.ch.elbow_r] });
}

// 5) Timeline (8 s at 1.0x).
const keyframes = [
  { t: 0.0, pose: 'tabletop' }, { t: 0.6, pose: 'tabletop' }, { t: 1.0, pose: 'unload' }, { t: 1.7, pose: 'windup' },
  { t: 2.15, pose: 'clear' }, { t: 2.65, pose: 'sweep' }, { t: 3.3, pose: 'rise' }, { t: 4.0, pose: 'peak' }, { t: 4.8, pose: 'peakBreath' },
  { t: 5.6, pose: 'peak' }, { t: 6.3, pose: 'descend' }, { t: 7.0, pose: 'touchdown' }, { t: 7.4, pose: 'tabletop' }, { t: 8.0, pose: 'tabletop' },
];
const phases = [
  { id: 'setup', label: 'Set up', start: 0, end: 0.6, breath: 'natural', cue: 'c1' },
  { id: 'windup', label: 'Wind up', start: 0.6, end: 1.7, breath: 'inhale', cue: 'c2' },
  { id: 'rotate', label: 'Rotate open', start: 1.7, end: 4.0, breath: 'exhale', cue: 'c3' },
  { id: 'hold', label: 'Hold', start: 4.0, end: 5.6, breath: 'exhale', cue: 'c4' },
  { id: 'return', label: 'Return', start: 5.6, end: 7.4, breath: 'inhale', cue: 'c5' },
  { id: 'reset', label: 'Reset', start: 7.4, end: 8.0, breath: 'natural', cue: 'c6' },
];
const A = (pts) => pts.map(([t, v]) => [t, v]);
const activation = {
  obliques_r: A([[0, 0.15], [1.7, 0.3], [3.3, 0.9], [4.0, 0.85], [5.6, 0.8], [6.6, 0.5], [7.4, 0.15], [8, 0.15]]),
  obliques_l: A([[0, 0.15], [1.7, 0.25], [3.3, 0.8], [4.0, 0.8], [5.6, 0.75], [6.6, 0.45], [7.4, 0.15], [8, 0.15]]),
  spinal_extensors_r: A([[0, 0.2], [1.7, 0.25], [3.6, 0.75], [5.6, 0.7], [7.4, 0.2], [8, 0.2]]),
  spinal_extensors_l: A([[0, 0.2], [1.7, 0.3], [3.6, 0.8], [5.6, 0.75], [7.4, 0.2], [8, 0.2]]),
  rhomboids_midtrap_r: A([[0, 0.1], [1.7, 0.1], [3.6, 0.9], [5.6, 0.85], [7.0, 0.2], [8, 0.1]]),
  post_deltoid_r: A([[0, 0.1], [1.7, 0.15], [3.6, 0.85], [5.6, 0.8], [7.0, 0.2], [8, 0.1]]),
  infraspinatus_r: A([[0, 0.1], [2.6, 0.3], [3.8, 0.65], [5.6, 0.6], [7.0, 0.2], [8, 0.1]]),
  serratus_l: A([[0, 0.5], [1.0, 0.7], [4.0, 0.8], [7.0, 0.7], [7.4, 0.5], [8, 0.5]]),
  triceps_l: A([[0, 0.45], [1.0, 0.65], [4.0, 0.7], [7.0, 0.65], [7.4, 0.45], [8, 0.45]]),
  core: A([[0, 0.4], [2.0, 0.55], [4.0, 0.6], [7.4, 0.45], [8, 0.4]]),
  glute_med_r: A([[0, 0.3], [4.0, 0.45], [8, 0.3]]),
  glute_med_l: A([[0, 0.3], [4.0, 0.5], [8, 0.3]]),
  pec_r: A([[0, 0], [2.6, 0.1], [3.6, 0.7], [4.4, 1], [5.6, 0.95], [6.6, 0.3], [7.4, 0], [8, 0]]),
  ant_deltoid_r: A([[0, 0], [2.6, 0.1], [3.6, 0.6], [4.4, 0.85], [5.6, 0.8], [6.6, 0.25], [7.4, 0], [8, 0]]),
};

const exercise = {
  schemaVersion: '1.0.0',
  rig: { ref: rigDef.rigId },
  exercise: {
    id: 'kneeling-back-rotation-stretch',
    name: 'Kneeling Back Rotation Stretch',
    aliases: ['Quadruped thoracic rotation (reach)', 'Quadruped T-spine rotation', 'Open-book reach from all fours'],
    reference: { source: 'GymVisual', productRef: '429713', title: 'Kneeling Back Rotation Stretch (female)', url: 'https://gymvisual.com/animated-gifs/12089--kneeling-back-rotation-stretch-female.html', listing: 'First item on https://gymvisual.com/13-media-content (sorted A to Z), viewed 2026-11-26', note: 'Used only to identify the movement. This rig, artwork and animation are original.' },
    type: 'Stretching / dynamic mobility',
    bodyPart: 'Back (thoracic spine)',
    secondaryBodyParts: ['Shoulders', 'Chest', 'Core'],
    equipment: ['Body weight', 'Exercise mat (optional)'],
    difficulty: 'Beginner',
    mechanics: 'Isolation (spinal mobility)',
    plane: 'Transverse',
    laterality: 'Unilateral (alternate sides)',
    authoredSide: 'right',
    muscles: {
      target: ['obliques_r', 'obliques_l', 'spinal_extensors_r', 'spinal_extensors_l'],
      synergist: ['rhomboids_midtrap_r', 'post_deltoid_r', 'infraspinatus_r'],
      stabilizer: ['serratus_l', 'triceps_l', 'core', 'glute_med_r', 'glute_med_l'],
      lengthened: ['pec_r', 'ant_deltoid_r'],
    },
    muscleNotes: {
      obliques_r: 'Internal oblique on the turning side helps drive rotation toward it.',
      obliques_l: 'External oblique on the opposite side pairs with it to turn the rib cage.',
      spinal_extensors_l: 'Deep rotators (multifidus/rotatores) turn the spine toward the opposite side, so the left side works on a right turn.',
      spinal_extensors_r: 'Keeps the upper back long so the turn is rotation, not rounding.',
      rhomboids_midtrap_r: 'Draws the shoulder blade back as the arm opens.',
      post_deltoid_r: 'Carries the arm up and back toward the ceiling.',
      infraspinatus_r: 'Turns the upper arm outward so the palm can face forward at the top.',
      serratus_l: 'Pushes the floor away and holds the shoulder blade flat on the rib cage.',
      triceps_l: 'Keeps the support elbow long without locking it.',
      core: 'Light brace keeps the lower back and pelvis quiet.',
      glute_med_r: 'Holds the hips level over the knees.',
      glute_med_l: 'Holds the hips level over the knees.',
      pec_r: 'Lengthens across the front of the chest at end range.',
      ant_deltoid_r: 'Lengthens at the front of the shoulder at end range.',
    },
    breathing: {
      pattern: 'Inhale as the hand lifts and winds under the chest; exhale slowly as you rotate open toward the ceiling; keep breathing slowly in the hold, letting each exhale add a little range; inhale on the way back down.',
      cadence: 'About 2 s wind-up, 2 s rotate, 2–3 s hold, 2 s return',
    },
    prescription: { sets: '1–3', reps: '8–12 per side', endRangeHold: '2–3 s per rep', staticOption: '20–30 s hold, 2–3 times per side', frequency: 'Daily or as a warm-up', tempo: '2–2–2 (rotate–hold–return)' },
    cues: [
      { id: 'c1', phase: 'setup', text: 'Hands under shoulders, knees under hips, tops of the feet on the mat. Spine long, gaze at the floor.' },
      { id: 'c2', phase: 'windup', text: 'Push the floor away with the left hand. Lift the right hand and let it drift a little under your chest as you breathe in.' },
      { id: 'c3', phase: 'rotate', text: 'Lead with the chest: sweep the right arm up and open the rib cage toward the ceiling. Eyes follow the hand.' },
      { id: 'c4', phase: 'hold', text: 'Pause at end range. Hips stay square over the knees; exhale and let the upper back turn a touch further.' },
      { id: 'c5', phase: 'return', text: 'Rotate back down under control, chest first, arm following.' },
      { id: 'c6', phase: 'reset', text: 'Place the hand back under the shoulder, reset a neutral spine, then repeat or switch sides.' },
    ],
    mistakes: [
      { id: 'm1', mistake: 'Hips sway or rotate with the chest', fix: 'Keep hips stacked over knees; imagine a glass of water on your low back. Turn only as far as the pelvis can stay still.' },
      { id: 'm2', mistake: 'Sinking into the support shoulder', fix: 'Press the floor away so the shoulder blade stays flat and the support arm stays long.' },
      { id: 'm3', mistake: 'Moving the arm without turning the spine', fix: 'Lead with the sternum; keep the arm in line with the chest, so the hand only goes as high as the rib cage turns.' },
      { id: 'm4', mistake: 'Side-bending instead of rotating', fix: 'Keep the spine long from tailbone to head and turn around that line.' },
      { id: 'm5', mistake: 'Holding the breath or rushing', fix: 'Move on a slow exhale and pause at end range; bouncing reduces the range you get.' },
      { id: 'm6', mistake: 'Cranking the neck', fix: 'Let the head follow the rib cage; the eyes track the hand without forcing the neck.' },
      { id: 'm7', mistake: 'Locking the support elbow', fix: 'Keep a soft bend (about 5–15°) and weight spread through the whole palm.' },
    ],
    kinematics: [
      { measure: 'Thoracic rotation (T12–T1)', setup: '0°', peak: '≈40°', norm: '30–35° per side estimated anatomically; lumbar-locked test mean ≈41° (SD ≈11°); ≥50° counted as unrestricted', sources: ['nasm', 'johnson2012', 'whetstone2024'] },
      { measure: 'Lumbar rotation (L5–S1 to T12)', setup: '0°', peak: '≈5°', norm: '≈10° per side available; keep it small', sources: ['nasm'] },
      { measure: 'Total trunk rotation', setup: '0°', peak: '≈45°', norm: '≈45° thoracolumbar per side', sources: ['nasm'] },
      { measure: 'Cervical rotation toward reaching hand', setup: '0°', peak: '≈32°', norm: 'Head follows the rib cage; eyes track the hand', sources: ['physitrack'] },
      { measure: 'Hips', setup: `≈${-pitch}° flexion (thighs vertical)`, peak: 'Unchanged; pelvis still', norm: 'Hips over knees', sources: ['physitrack'] },
      { measure: 'Knees', setup: '90° flexion, shins on mat', peak: 'Unchanged', norm: 'Knees under hips', sources: ['physitrack'] },
      { measure: 'Support elbow', setup: '≈10° (soft)', peak: '≈10–15°', norm: 'Long arm, not locked', sources: [] },
      { measure: 'Reaching arm', setup: 'Hand flat under shoulder', peak: 'Abducted ≈90° to the chest, opened past the frontal plane until vertical', norm: 'Arm stays in line with the chest', sources: ['physitrack'] },
    ],
    sources: [
      { id: 'gymvisual', title: 'GymVisual — Kneeling Back Rotation Stretch (female), ref. 429713', url: 'https://gymvisual.com/animated-gifs/12089--kneeling-back-rotation-stretch-female.html' },
      { id: 'physitrack', title: 'Physitrack — Quadruped Thoracic Rotation / Extension-Rotation', url: 'https://ie.physitrack.com/home-exercise-video/quadruped-thoracic-rotation' },
      { id: 'johnson2012', title: 'Johnson et al. 2012, Reliability of thoracic spine rotation ROM measurements in healthy adults (J Athl Train)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3418115' },
      { id: 'whetstone2024', title: 'Whetstone & Matsel 2024, Visual estimation of thorax rotation in the quadruped lumbar-locked position (IJSPT)', url: 'https://ijspt.scholasticahq.com/article/116154' },
      { id: 'nasm', title: 'NASM — Optimizing thoracic spine mobility with corrective exercise (citing Neumann 2010)', url: 'https://blog.nasm.org/ces/optimizing-thoracic-spine-mobility-with-corrective-exercise' },
      { id: 'motra', title: 'Motra — Quadruped T-Spine Rotation (breathing, beginner rating)', url: 'https://motra.com/exercises/quadrupedTSpineRotation' },
      { id: 'fitcraft', title: 'FitCraft — Quadruped thread-the-needle (hip drop and breath-holding errors)', url: 'https://getfitcraft.com/exercises/quadruped-thread-the-needle' },
      { id: 'prehab', title: 'The Prehab Guys — Quadruped thoracic spine rotation (avoid side bending; opens the pecs)', url: 'https://library.theprehabguys.com/vimeo-video/thoracic-spine-rotation/' },
      { id: 'ace', title: 'ACE — Top exercises to gain thoracic mobility (10–12 reps or 20–30 s per side)', url: 'https://www.acefitness.org/resources/pros/expert-articles/5203/top-exercises-to-gain-thoracic-mobility/' },
      { id: 'kenhub', title: 'Kenhub — Rotatores muscles', url: 'https://kenhub.com/en/library/anatomy/rotatores-muscles' },
    ],
  },
  camera: { default: 'threeQuarter', presets: { threeQuarter: { yaw: 38, pitch: 20, label: '3/4' }, side: { yaw: 0, pitch: 6, label: 'Side' }, front: { yaw: 88, pitch: 12, label: 'Front' }, back: { yaw: -48, pitch: 34, label: 'Back' }, top: { yaw: 25, pitch: 72, label: 'Top' } } },
  props: [{ id: 'mat', kind: 'mat', center: [8, 0, 0], size: [180, 0.6, 62] }],
  contacts,
  timeline: { duration: 8, fps: 60, loop: true, interpolation: 'monotoneCubic', phases },
  poses,
  keyframes,
  activation,
  guides: [
    { id: 'handPath', kind: 'path', joint: 'handtip_r', from: 0.6, to: 7.4, label: 'Hand path' },
    { id: 'rotationArc', kind: 'rotationArc', joint: 'spine_t6', radius: 30, normBand: [40, 50], label: 'Thoracic rotation' },
    { id: 'gaze', kind: 'gaze', joint: 'head_c1', target: 'handtip_r', label: 'Eyes follow hand' },
  ],
};
{ const pk = poses.peak.ch, kin = exercise.exercise.kinematics;
  const fmtd = (v) => `≈${Math.round(v)}°`;
  kin[0].peak = fmtd(pk.spine_t12.rot + pk.spine_t6.rot); kin[1].peak = fmtd(pk.spine_l5.rot);
  kin[2].peak = fmtd(pk.spine_l5.rot + pk.spine_t12.rot + pk.spine_t6.rot);
  kin[3].peak = `${fmtd(pk.neck_c7.rot + pk.head_c1.rot)} plus ${Math.round(-(pk.neck_c7.flex + pk.head_c1.flex))}° extension`; }
fs.writeFileSync(path.join(__dirname, '../src/exercise.json'), JSON.stringify(exercise, null, 2));

// ---- Report
console.log('trunk pitch', pitch, 'left wrist target', tL);
for (const r of report) console.log(JSON.stringify(r));
const tl = R.buildTimeline(exercise);
let worst = { slide: 0, floor: 0, elbowMin: 99, elbowMax: 0 };
for (let i = 0; i <= 480; i++) {
  const t = (i / 480) * 8, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
  const m = R.measures(W);
  worst.elbowMin = Math.min(worst.elbowMin, m.elbowL); worst.elbowMax = Math.max(worst.elbowMax, m.elbowL);
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s);
    const minY = g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]);
    if (minY < worst.floor) worst.floor = minY, worst.floorAt = [s.id, +t.toFixed(2)];
  }
  const sl = V.len(V.sub(W.shoulder_l.p, SL0)); if (sl > worst.slide) worst.slide = sl, worst.slideAt = t;
}
console.log('timeline check', JSON.stringify(worst));
