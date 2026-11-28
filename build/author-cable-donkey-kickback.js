// Cable Donkey Kickback (GymVisual #15173, movement reference only): on all fours on a mat (hands under the shoulders,
// knees under the hips), an ankle strap on the right ankle clipped to a low pulley behind the athlete. Keeping the right knee
// bent about 90 degrees, the hip extends against the cable until the thigh is level with the floor (sole toward the
// ceiling); short squeeze, controlled return until the knee hovers just over the mat. Pelvis and trunk stay still.
// Authored on the right. Built on the bird-dog all-fours base (build/families/prone.js) and the donkey kick.
// Gear: GA.ankleStrap (src/gear/attach.js) on a low pulley (EQ.cableTower). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const EQ = require('./families/equip');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'cable-donkey-kickback', name: 'Cable Donkey Kickback', url: 'https://gymvisual.com/videos/15173-cable-donkey-kickback-male.html',
  aliases: ['Quadruped cable kickback', 'Ankle-strap donkey kick', 'Kneeling cable glute kickback'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Hamstrings', 'Core'], equipment: ['Cable machine (low pulley)', 'Ankle strap', 'Mat'],
  mechanics: 'Isolation (hip extension)', plane: 'Sagittal', side: 'right', cam: 'side',
  muscles: { target: ['glute_max_r'], synergist: ['hamstrings_r'], stabilizer: ['core', 'obliques_r', 'obliques_l', 'glute_med_l', 'serratus_r', 'serratus_l', 'triceps_r', 'triceps_l'], lengthened: ['hip_flexors_r'] },
  notes: { glute_max_r: 'Quadruped hip extension with the knee bent biases the gluteus maximus; the cable keeps tension through the whole arc (Macadam 2019; Neto 2020).', hamstrings_r: 'Assist, less with the knee bent (clinical opinion).', core: 'Holds the spine neutral (clinical opinion).', obliques_r: 'Stop the pelvis rotating up toward the kicking side (clinical opinion).', obliques_l: 'Stop the pelvis rotating (clinical opinion).', glute_med_l: 'Steadies the support hip (clinical opinion).', serratus_r: 'Holds the shoulder blades on the ribs (clinical opinion).', serratus_l: 'Holds the shoulder blades on the ribs (clinical opinion).', triceps_r: 'Keep the support arm straight (clinical opinion).', triceps_l: 'Keep the support arm straight (clinical opinion).', hip_flexors_r: 'Lengthen at the top (clinical opinion).' },
  breathing: { pattern: 'Exhale as the foot presses up, inhale as it lowers.', cadence: 'About 1.2 s up, 0.6 s squeeze, 1.6 s down' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Add a plate on the stack once 15 controlled reps are easy' },
  phases: [
    { id: 'setup', label: 'All fours, strap on', end: 0.8, cue: 'Strap the right ankle to the low pulley behind you; hands under the shoulders, knees under the hips, back flat.', w: 0.1 },
    { id: 'up', label: 'Press the sole up', end: 2.0, breath: 'exhale', cue: 'Breathe out and press the right sole toward the ceiling, knee bent at 90 degrees.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.6, cue: 'Thigh level with the floor; squeeze the glute without arching.', w: 1 },
    { id: 'down', label: 'Lower with control', end: 4.2, breath: 'inhale', cue: 'Breathe in and let the cable bring the knee back under the hip slowly.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Hover the knee just over the mat; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Arching the low back', 'Stop when the thigh is level; brace the abs.'], ['Rotating the hip open', 'Keep both hip bones facing the floor.'], ['Letting the knee straighten', 'Keep the knee bent so the glute does the work.'], ['Rushing the return', 'Lower in about 1.5 s; the cable should not yank the leg down.']],
  kin: [['Hands and knees', 'Hands under the shoulders, knees under the hips (clinical opinion)', []], ['Hip extension', 'From about 90 degrees of flexion to the thigh level with the floor (clinical opinion); quadruped hip extension excites the gluteus maximus (Macadam 2019; Neto 2020)', ['macadam2019', 'neto2020']], ['Knee flexion', 'About 90 degrees throughout (clinical opinion)', []], ['Cable line', 'Low pulley behind and in line with the strapped ankle (standard setup)', []], ['Tempo', 'Controlled, squeeze at the top (clinical opinion)', []]],
  safety: { cautions: ['Check the strap is snug and the clip is closed before each set.', 'Wrist discomfort: use fists or forearms.'], modify: ['Knee discomfort: fold the mat under the support knee.'], regressions: ['Donkey kick without load.'], progressions: ['Heavier stack.', 'Longer squeeze.'] },
  act: { glute_max_r: [0.1, 0.75], hamstrings_r: [0.08, 0.38], core: [0.15, 0.32], obliques_r: [0.1, 0.28], obliques_l: [0.1, 0.24], glute_med_l: [0.15, 0.28], serratus_r: [0.15, 0.22], serratus_l: [0.15, 0.22], triceps_r: [0.12, 0.18], triceps_l: [0.12, 0.18] },
  props: [{ id: 'mat', kind: 'mat', center: [-5, 0, 0], size: [180, 0.6, 62] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Sole presses up' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-20, 5], label: 'Thigh level with the floor' }],
  checks: { stillJoints: ['pelvis'], plantedContacts: ['arm_r', 'arm_l', 'leg_l'] },
});

const A = P.allFours(), { fours, contacts, Wf } = A;
const THIGH_LEVEL = (() => { const q = clone(fours); q.ik.leg_r.weight = 0; let a = -40, b = 40; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; q.ch.hip_r = { flex: m, abd: 0, rot: 0 }; if (L.fk(q).knee_r.p[1] > L.fk(q).hip_r.p[1]) a = m; else b = m; } return r1((a + b) / 2); })();
const HIP_TOP = Math.max(-19, THIGH_LEVEL - 1);
const h0 = fours.ch.hip_r, k0 = fours.ch.knee_r.flex, a0 = fours.ch.ankle_r.dorsi;
// f: 0 = knee hovering just off the mat, 1 = thigh level. Knee about 90, foot flexed so the sole faces the ceiling.
const HOVER = 0.13;
function kick(f) {
  const e = HOVER + (1 - HOVER) * f, q = clone(fours);
  q.ch.hip_r = { flex: r1(h0.flex + (HIP_TOP - h0.flex) * e), abd: r1(h0.abd * (1 - e)), rot: r1(h0.rot * (1 - e)) };
  q.ch.knee_r = { flex: r1(k0 + 8 * Math.sin(Math.PI * Math.min(1, e)) + 2 * e) };
  q.ch.ankle_r = { dorsi: r1(a0 + (-5 - a0) * Math.min(1, e / 0.7)) };
  q.ik.leg_r.weight = 0;
  return q;
}
const { poses, keyframes } = G.rep(kick, { back: 4.2, hold: 2.6, holdF: 1.03 });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wr = L.fk(poses.rest, contacts);
const PULLEY = [r1(Wr.ankle_r.p[0] - 75), 10, r1(Wr.ankle_r.p[2])];
const strap = GA.ankleStrap(PULLEY, { side: 'r', ring: [-1, 0, 0], id: 'strap', schemaAttachment: 'ankle_strap' });
ex.props = ex.props.concat([EQ.cableTower(PULLEY, { offset: [-12, 0], id: 'tower' }), strap]);
const sw = P.sweep(ex, [{ joint: 'knee_l', p: Wf.knee_l.p }]);
const C = G.strapProbe(strap); let footMin = 1e9;
H.loopReport(ex, { probe: (W) => { C.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'shank_r'), H.bottomOf(W, 'thigh_r')); } });
const Wt = L.fk(poses.top, contacts);
const thighAng = (W) => Math.atan2(W.knee_r.p[1] - W.hip_r.p[1], W.hip_r.p[0] - W.knee_r.p[0]) / R.DEG;
const set = H.setKin(ex);
set('Hands and knees', 'setup', `Hands under the shoulders, knees under the hips (hip ${Math.round(h0.flex)}°)`); set('Hands and knees', 'peak', 'Hands and the left knee stay planted');
set('Hip extension', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}° flexion (knee just off the mat)`); set('Hip extension', 'peak', `Hip ≈${Math.round(poses.top.ch.hip_r.flex)}° (thigh ${Math.round(thighAng(Wt))}° from level)`);
set('Knee flexion', 'setup', `≈${Math.round(P.kneeAngle(Wr, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(P.kneeAngle(Wt, 'r'))}°`);
set('Cable line', 'setup', `Pulley behind at floor level; cable ${Math.round(C.cable[0])} cm`); set('Cable line', 'peak', `Cable ${Math.round(C.cable[1])} cm; clears the body by ${C.line.d.toFixed(1)} cm or more`);
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '1.2 s up, 0.6 s squeeze, 1.6 s down');
ex.checks.measure = { name: 'hipFlexion', min: 60, max: 95 };
console.log(`Cable Donkey Kickback: wrote ${L.write(ex)} hipTop ${HIP_TOP}\n  sweep ${JSON.stringify(sw)} liftedMin ${footMin.toFixed(2)} line ${JSON.stringify(C.line)} cable ${G.fmt(C.cable)}`);
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: lifted leg touches the mat'); process.exitCode = 1; }
if (C.line.d < 0.5) { console.error('FAIL: cable passes through the body'); process.exitCode = 1; }
