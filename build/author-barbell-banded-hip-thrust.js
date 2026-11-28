// Barbell Banded Hip Thrust (GymVisual #22730, movement reference only): the barbell hip thrust with a mini band just above
// the knees. Shoulder blades on the edge of a 42 cm bench, feet flat about hip width (planted), a loaded barbell across
// the hip crease held in place by both hands just outside the hips. The trunk pivots on the bench edge: hips drop toward
// the floor, then drive up until the trunk is level and the shins vertical while the knees press out against the band;
// squeeze, then lower under control. Bilateral. Built on author-hip-thrusts.js (same bench, pivot, feet); bar and hands
// from build/families/barbell.js (armsOnBar), band from build/families/gear-attach.js (bandLoop around the knees).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const G = require('./families/gear-g3attach');
const GA = require('./families/gear-attach');
const EQ = require('./families/equip');
const BB = require('./families/barbell');
const meta = G.meta({
  id: 'barbell-banded-hip-thrust', name: 'Barbell Banded Hip Thrust', url: 'https://gymvisual.com/videos/22730-barbell-banded-hip-thrust.html',
  aliases: ['Banded barbell hip thrust', 'Hip thrust with a mini band'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Gluteus medius', 'Hamstrings', 'Quadriceps'], equipment: ['Barbell', 'Resistance band (mini loop above the knees)', 'Flat bench'],
  mechanics: 'Compound (hip extension)', plane: 'Sagittal', side: 'bilateral', cam: 'side', difficulty: 'Intermediate',
  muscles: { target: G.both('glute_max'), synergist: [...G.both('glute_med'), ...G.both('hamstrings'), ...G.both('quads')], stabilizer: ['core', ...G.both('spinal_extensors'), ...G.both('adductors'), ...G.both('forearm_flexors')], lengthened: G.both('hip_flexors') },
  notes: { glute_max_r: 'The barbell hip thrust excites the gluteus maximus more than the back squat (Contreras 2015).', glute_max_l: 'The barbell hip thrust excites the gluteus maximus more than the back squat (Contreras 2015).', glute_med_r: 'Pushes the knees out against the band (Macadam 2015).', glute_med_l: 'Pushes the knees out against the band (Macadam 2015).', hamstrings_r: 'Assist hip extension (Contreras 2015).', hamstrings_l: 'Assist hip extension (Contreras 2015).', quads_r: 'Hold the knees at 90 degrees (Contreras 2015).', quads_l: 'Hold the knees at 90 degrees (Contreras 2015).', core: 'Keeps the ribs down at the top (clinical opinion).', spinal_extensors_r: 'Hold the trunk in line (clinical opinion).', spinal_extensors_l: 'Hold the trunk in line (clinical opinion).', adductors_r: 'Balance the band pull (clinical opinion).', adductors_l: 'Balance the band pull (clinical opinion).', forearm_flexors_r: 'Hold the bar on the hips (clinical opinion).', forearm_flexors_l: 'Hold the bar on the hips (clinical opinion).', hip_flexors_r: 'Lengthen at the top (clinical opinion).', hip_flexors_l: 'Lengthen at the top (clinical opinion).' },
  breathing: { pattern: 'Brace and exhale on the way up, inhale on the way down.', cadence: 'About 1.2 s up, 0.8 s squeeze, 2 s down' },
  rx: { sets: '3-4', reps: '8-12', tempo: '1-1-2-0', rest: '90-120 s', progression: 'Add load to the bar; stronger band' },
  phases: [
    { id: 'setup', label: 'Set up on the bench', end: 0.8, cue: 'Shoulder blades on the bench edge, band above the knees, bar across the hip crease, feet flat about hip width.', w: 0.15 },
    { id: 'up', label: 'Drive up', end: 2.0, breath: 'exhale', cue: 'Drive through the heels and push the knees out; hips up until the trunk is level.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.8, breath: 'hold', cue: 'Squeeze the glutes, chin tucked, ribs down.', w: 1 },
    { id: 'down', label: 'Lower', end: 4.8, breath: 'inhale', cue: 'Lower the hips with control, knees still pressing out.', w: 0.25 },
    { id: 'reset', label: 'Reset', end: 6.0, cue: 'Touch the hips down lightly; repeat.', w: 0.15 },
  ],
  mistakes: [['Knees caving in', 'Keep pushing the knees out into the band.'], ['Arching the low back at the top', 'Stop at a level trunk; ribs down, chin tucked.'], ['Feet too far out or too close', 'Shins vertical at the top.'], ['Bar rolling toward the stomach', 'Hold it on the hip crease; use a pad.']],
  kin: [['Bench height', 'About 40-45 cm, edge under the shoulder blades (standard setup)', []], ['Hip flexion', 'From about 70-90 degrees to neutral (Contreras 2015)', ['contreras2015']], ['Knee flexion', 'About 90 degrees at the top, shins vertical (standard setup)', []], ['Trunk inclination', 'Level at the top (standard technique)', []], ['Band', 'Mini loop above the knees; knees pushed out (Macadam 2015)', ['macadam2015']], ['Tempo', 'Controlled, squeeze at the top (clinical opinion)', []]],
  safety: { cautions: ['Use a bar pad and collars; roll the bar into place sitting on the floor.', 'Stop if the low back takes over.'], modify: ['Lighter bar, or dumbbell hip thrust.'], regressions: ['Hip thrust without load.', 'Glute bridge.'], progressions: ['Heavier bar.', 'Pause at the top.'] },
  act: { glute_max_r: [0.12, 0.85], glute_max_l: [0.12, 0.85], glute_med_r: [0.2, 0.5], glute_med_l: [0.2, 0.5], hamstrings_r: [0.1, 0.45], hamstrings_l: [0.1, 0.45], quads_r: [0.15, 0.4], quads_l: [0.15, 0.4], core: [0.12, 0.3], spinal_extensors_r: [0.15, 0.35], spinal_extensors_l: [0.15, 0.35], adductors_r: [0.1, 0.2], adductors_l: [0.1, 0.2], forearm_flexors_r: [0.15, 0.25], forearm_flexors_l: [0.15, 0.25] },
  props: [{ id: 'bench', kind: 'bench', center: [-18, 0, 0], size: [36, 42, 150] }],
  guides: [{ id: 'hipPath', kind: 'path', joint: 'pelvis', from: 0.8, to: 2.0, label: 'Hips drive up' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-5, 5], label: 'Hip extended to neutral' }],
  checks: { stillJoints: ['ankle_r', 'ankle_l'], plantedContacts: ['leg_r', 'leg_l'] },
});

const BENCH_H = 42, BENCH_D = 36;
// Bench edge (front top corner) at x = 0. The upper back pivots on it: a point on the back of the chest at the level of the
// lower shoulder blades (spine_t6 frame) stays on the edge. The skinned mesh is checked against the edge separately.
const EDGE = [0, BENCH_H, 0];
// spine_t6 local: the back surface of the rig chest shape at the level of the lower shoulder blades (rig v2 shapes match the body)
const CHEST = rig.shapes.find((x) => x.id === 'chest');
let BACK_PT = [r1(CHEST.c[0] - CHEST.r[0] * Math.sqrt(1 - ((4 - CHEST.c[1]) / CHEST.r[1]) ** 2)), 4, 0];
// Arms spread along the bench top, palms down, fingers pointing out, elbows soft and above the bench (constant hand targets)
const BACK_DX = +(process.env.BACK_DX || 0);
const STANCE = 13; // ankle centres 26 cm apart, about hip width
const base = (() => { const p = H.lieBase(); p.root.pos = [40, 50, 0]; Object.assign(p.ch, { spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 } }); return p; })();
function trunk(pitch) {
  const p = clone(base); p.root.rot = { pitch: r1(pitch) };
  const pt = [BACK_PT[0] + BACK_DX, BACK_PT[1], BACK_PT[2]];
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, pt)), EDGE).map((v) => v * 3)]).pose;
  // chin tucked: eyes toward the knees at the top, head in line with the trunk lower down
  const tilt = pitch - 90; // 0 when the pelvis is level-ish
  s.ch.neck_c7 = { rot: 0, flex: r1(18 + 0.15 * tilt) }; s.ch.head_c1 = { rot: 0, flex: r1(12 + 0.1 * tilt) };
  return s;
}
const trunkTilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG; // + = hips above shoulders
// top: shoulder-to-hip line level
let lo = 60, hi = 120, P_TOP = 90;
for (let i = 0; i < 40; i++) { P_TOP = (lo + hi) / 2; if (trunkTilt(L.fk(trunk(P_TOP))) < 0) lo = P_TOP; else hi = P_TOP; }
P_TOP = r1(P_TOP);
// feet under the knees at the top (thighs level, shins vertical -> knee 90)
const contacts = [H.legC('r', { pole: [1, 0.3, 0.15] }), H.legC('l', { pole: [1, 0.3, -0.15] })];
const legOnly = contacts.slice(0, 2);
const Wtop = L.fk(trunk(P_TOP));
const FX = (() => { let a = Wtop.hip_r.p[0] + 20, b = Wtop.hip_r.p[0] + 60, x = 0; for (let i = 0; i < 40; i++) { x = (a + b) / 2; const p = trunk(P_TOP); p.ik = { leg_r: { target: [x, L.ANKLE_H, STANCE], weight: 1 } }; if (H.kneeOf(L.fk(p, legOnly), 'r') > 90) a = x; else b = x; } return r1(x); })();
const FOOT = { r: [FX, L.ANKLE_H, STANCE], l: [FX, L.ANKLE_H, -STANCE] };
const legIK = () => ({ leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } });
// bottom: hips drop until the buttocks are about 6 cm above the floor
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
lo = P_TOP - 70; hi = P_TOP;
let P_BOT = P_TOP;
for (let i = 0; i < 40; i++) { P_BOT = (lo + hi) / 2; const p = trunk(P_BOT); p.ik = legIK(); if (buttY(L.fk(p, legOnly)) < 6) lo = P_BOT; else hi = P_BOT; }
P_BOT = r1(P_BOT);

// bar across the hip crease: centre on the midline just above the hips, lowered from above until the bar
// (2.8 cm shaft, as a 2.5 cm-radius pad-and-bar capsule between the hands) clears the body
const GRIP_W = 56, BAR_R = 2.5;
function barCentre(W) {
  const hm = V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5), n = [0, 1, 0], th = V.norm(V.sub(V.scale(V.add(W.knee_r.p, W.knee_l.p), 0.5), hm));
  const base = V.add(hm, V.scale(th, 1));
  let a = 0, b = 40; for (let i = 0; i < 40; i++) { const m = (a + b) / 2, c = V.add(base, V.scale(n, m)); if (EQ.segmentClear(W, V.add(c, [0, 0, 60]), V.sub(c, [0, 0, 60]), BAR_R, { skip: /^(hand|thumb|forearm|upperarm|biceps)_/, n: 12 }).d < 0.2) a = m; else b = m; }
  return V.add(base, V.scale(n, b));
}
let GUESS = [[-30, 25, 45, 50, 90], [-48, 23, 59, 57, 0], [10, 40, 0, 60, 90]];
let worstGrip = 0;
function poseAt(f) { // f: 0 = bottom, 1 = top
  let p = trunk(P_BOT + (P_TOP - P_BOT) * f);
  p.ik = legIK();
  p.ch.sc_r = { protract: 4, elevate: 2 }; p.ch.sc_l = { protract: 4, elevate: 2 };
  p = H.fitLeg(p, 'r', contacts[0], FOOT.r); p = H.fitLeg(p, 'l', contacts[1], FOOT.l);
  const c = barCentre(L.fk(p, contacts));
  p = BB.armsOnBar(p, V.add(c, [0, 0, GRIP_W / 2]), { guesses: GUESS }); delete p.__cost;
  { const a = p.ch.shoulder_r; GUESS = [[a.plane, a.elev, a.axial, p.ch.elbow_r.flex, p.ch.wrist_r.pron, p.ch.wrist_r.flex, p.ch.wrist_r.dev]]; }
  worstGrip = Math.max(worstGrip, BB.gripErr(L.fk(p, contacts), { r: V.add(c, [0, 0, GRIP_W / 2]), l: V.sub(c, [0, 0, GRIP_W / 2]) }));
  return p;
}
poseAt(1); poseAt(0.75); poseAt(0.5); poseAt(0.25);
const poses = { bottom: poseAt(0), u25: poseAt(0.25), u50: poseAt(0.5), u75: poseAt(0.75), top: poseAt(1), squeeze: poseAt(1.015), d75: poseAt(0.75), d50: poseAt(0.5), d25: poseAt(0.25), low: poseAt(0.02) };
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.1, pose: 'u25' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' },
  { t: 3.3, pose: 'd75' }, { t: 3.8, pose: 'd50' }, { t: 4.3, pose: 'd25' }, { t: 4.8, pose: 'low' }, { t: 5.3, pose: 'bottom' }, { t: 6.0, pose: 'bottom' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const bench = ex.props.find((p) => p.id === 'bench'); bench.center = [r1(EDGE[0] - BENCH_D / 2), 0, 0]; bench.size = [BENCH_D, BENCH_H, 150];
const band = GA.bandLoop({ where: 'knees', id: 'miniband' });
ex.props = ex.props.concat([{ id: 'barbell', kind: 'barbell', attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'bar' }, plates: 1, size: [220, 45, 45] }, band]);
let pivot = 0, elbowMin = 1e9, width = [1e9, -1e9], plateLow = 1e9, barBody = { d: 1e9 }; const Wb0 = L.fk(poses.bottom, contacts); const B = G.bandProbe(band);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { B.probe(W); const bar = EQ.barAt(W, 'bar'); width = [Math.min(width[0], bar.width), Math.max(width[1], bar.width)]; plateLow = Math.min(plateLow, EQ.barMinY ? EQ.barMinY(W, { grip: 'bar' }) : bar.c[1] - 22.5); const bc = BB.barBodyClear(W, { skip: /^(hand|thumb|forearm)_/ }); if (bc.d < barBody.d) barBody = bc; elbowMin = Math.min(elbowMin, W.elbow_r.p[1] - 4.8, W.elbow_l.p[1] - 4.8); pivot = Math.max(pivot, V.len(V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, [BACK_PT[0] + BACK_DX, BACK_PT[1], 0])), EDGE))); } });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
set('Bench height', 'setup', `${BENCH_H} cm`); set('Bench height', 'peak', 'Upper back pivots on the bench edge');
set('Hip flexion', 'setup', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° at the bottom`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}°`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wb, 'r'))}° at the bottom`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (shins vertical), feet ${2 * STANCE} cm apart`);
set('Trunk inclination', 'setup', `≈${Math.round(-trunkTilt(Wb))}° (hips below the shoulders)`); set('Trunk inclination', 'peak', `≈${Math.round(Math.abs(trunkTilt(Wt)))}° (level)`);
set('Band', 'setup', `Above both knees (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Hips down 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.8 s squeeze, 2.0 s down, 1.2 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Barbell Banded Hip Thrust: grip ${worstGrip.toFixed(2)} width ${width.map((v) => v.toFixed(2))} plateLow ${plateLow.toFixed(1)} barBody ${JSON.stringify(barBody)} band ${G.fmt(B.gap)} pitch ${P_BOT}..${P_TOP}, feet x ${FX}, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} pivotErr ${pivot.toFixed(2)} elbowBottom ${r1(elbowMin)} butt ${r1(buttY(Wb))} hipY ${r1(Wb.hip_r.p[1])}..${r1(Wt.hip_r.p[1])} travel ${r1(travel)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (width[1] - width[0] > 1.5 || worstGrip > 1) { console.error('FAIL: hands leave the bar'); process.exitCode = 1; }
if (plateLow < -0.5) { console.error('FAIL: plates through the floor'); process.exitCode = 1; }
