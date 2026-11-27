// Dumbbell Hip Thrust (GymVisual #474212): upper back across the edge of a flat 45 cm bench, both feet flat about hip width
// (planted leg contacts), one dumbbell across the hip crease held at both ends (the right hand carries it on the right
// plate, the left hand presses the left plate). The trunk pivots on the bench edge: hips drop toward the floor, then drive
// up until the trunk is level and the shins vertical; 0.8 s squeeze, 2 s down. Bilateral. Built on the single-leg hip thrust.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-hip-thrust.json');

const benchProp = clone(meta.props.find((p) => p.kind === 'bench'));     // flat adjustable bench turned across the athlete
const BENCH_H = benchProp.size[1], EDGE_X = benchProp.center[0] + benchProp.size[2] / 2; // rotY 90: the pad width runs along X
// Bench edge (front top corner) at x = EDGE_X. A point on the back of the chest at the level of the lower shoulder blades
// (spine_t6 frame) stays on the edge; BACK_PT is set from the skinned mesh (b2/scratch/legs/benchmesh.mjs).
const EDGE = [EDGE_X, BENCH_H, 0];
const BACK_PT = [+(process.env.BACK_X || -3.6), +(process.env.BACK_Y || 4), 0];
const STANCE = 13; // ankle centres 26 cm apart, about hip width
const base = (() => { const p = H.lieBase(); p.root.pos = [40, 50, 0]; Object.assign(p.ch, { spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 } }); return p; })();
function trunk(pitch) {
  const p = clone(base); p.root.rot = { pitch: r1(pitch) };
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE).map((v) => v * 3)]).pose;
  const tilt = pitch - 90; // chin tucked: eyes toward the knees at the top, head in line with the trunk lower down
  s.ch.neck_c7 = { rot: 0, flex: r1(18 + 0.15 * tilt) }; s.ch.head_c1 = { rot: 0, flex: r1(12 + 0.1 * tilt) };
  return s;
}
const trunkTilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG; // + = hips above shoulders
let lo = 60, hi = 120, P_TOP = 90;
for (let i = 0; i < 40; i++) { P_TOP = (lo + hi) / 2; if (trunkTilt(L.fk(trunk(P_TOP))) < 0) lo = P_TOP; else hi = P_TOP; }
P_TOP = r1(P_TOP);
// feet under the knees at the top (thighs level, shins vertical: knee 90)
const contacts = [H.legC('r', { pole: [1, 0.3, 0.15] }), H.legC('l', { pole: [1, 0.3, -0.15] })];
const Wtop = L.fk(trunk(P_TOP));
const FX = (() => { let a = Wtop.hip_r.p[0] + 20, b = Wtop.hip_r.p[0] + 60, x = 0; for (let i = 0; i < 40; i++) { x = (a + b) / 2; const p = trunk(P_TOP); p.ik = { leg_r: { target: [x, L.ANKLE_H, STANCE], weight: 1 } }; if (H.kneeOf(L.fk(p, contacts), 'r') > 90) a = x; else b = x; } return r1(x); })();
const FOOT = { r: [FX, L.ANKLE_H, STANCE], l: [FX, L.ANKLE_H, -STANCE] };
// bottom: hips drop until the buttocks are about 7 cm above the floor
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
lo = P_TOP - 70; hi = P_TOP;
let P_BOT = P_TOP;
for (let i = 0; i < 40; i++) { P_BOT = (lo + hi) / 2; const p = trunk(P_BOT); p.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } }; if (buttY(L.fk(p, contacts)) < 7) lo = P_BOT; else hi = P_BOT; }
P_BOT = r1(P_BOT);

const OFF = B.HIP_OFFSET;
// Dumbbell centre in the pelvis frame [toward the front of the pelvis, toward the head, side] per key fraction (0 = bottom,
// 1 = top): on the hip crease, lifted where the skinned thighs rise as the hips flex. Chosen by a grid search on the skinned
// mesh (b2/scratch/legs/htgrid.mjs) so the plates rest on the body (clearance about 0-1 cm) at every key.
const DBT = JSON.parse(process.env.DBT || '{"0":[27,15.5],"0.25":[24,7.5],"0.375":[23,4.5],"0.5":[21.5,1.5],"0.75":[16.5,-2],"1":[16,2]}');
const dbAt = (f) => { const ks = Object.keys(DBT).map(Number).sort((a, b) => a - b), c = Math.max(ks[0], Math.min(ks[ks.length - 1], f));
  for (let i = 1; i < ks.length; i++) if (c <= ks[i]) { const a = DBT[ks[i - 1]], b = DBT[ks[i]], u = (c - ks[i - 1]) / (ks[i] - ks[i - 1]); return [r1(a[0] + (b[0] - a[0]) * u), r1(a[1] + (b[1] - a[1]) * u), 0]; }
  const z = DBT[ks[ks.length - 1]]; return [z[0], z[1], 0]; };
const ELBOW = [6, 24, 17]; // elbows bent and out to the sides (pelvis frame)
function poseAt(f, opt = {}) { // f: 0 = bottom, 1 = top
  let p = trunk(P_BOT + (P_TOP - P_BOT) * f);
  p.ik = { leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } };
  p = B.hipHoldArms(p, { at: opt.at || dbAt(f), offset: OFF, elbow: ELBOW, debug: !!process.env.DEBUG }); if (process.env.DEBUG) console.log('arm', f, p.__armCost.toFixed(3), JSON.stringify(p.__armRes), JSON.stringify(p.ch.shoulder_r), JSON.stringify(p.ch.elbow_r), JSON.stringify(p.ch.wrist_r)); delete p.__armCost; delete p.__armRes;
  p = H.fitLeg(p, 'r', contacts[0], FOOT.r); p = H.fitLeg(p, 'l', contacts[1], FOOT.l);
  return p;
}
if (process.env.HT_GRID) { // candidates for the mesh grid search: { f: { "x,y": pose } }
  const [dxs, dys] = JSON.parse(process.env.HT_GRID), out = {};
  for (const f of Object.keys(DBT)) { out[f] = {}; const c = DBT[f]; for (const dx of dxs) for (const dy of dys) { const at = [r1(c[0] + dx), r1(c[1] + dy), 0]; out[f][`${at[0]},${at[1]}`] = poseAt(+f, { at }); } }
  require('fs').writeFileSync('/tmp/htgrid.json', JSON.stringify(out)); console.log('grid written'); process.exit(0);
}
const poses = { bottom: poseAt(0), u25: poseAt(0.25), u37: poseAt(0.375), u50: poseAt(0.5), u75: poseAt(0.75), top: poseAt(1), squeeze: poseAt(1.015), d75: poseAt(0.75), d50: poseAt(0.5), d37: poseAt(0.375), d25: poseAt(0.25), low: poseAt(0.02) };
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.1, pose: 'u25' }, { t: 1.25, pose: 'u37' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' },
  { t: 3.3, pose: 'd75' }, { t: 3.8, pose: 'd50' }, { t: 4.05, pose: 'd37' }, { t: 4.3, pose: 'd25' }, { t: 4.8, pose: 'low' }, { t: 5.3, pose: 'bottom' }, { t: 6.0, pose: 'bottom' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// the athlete's hand frame puts the fists about 3 cm wider than the rig hands for this grip (measured with
// b2/scratch/legs/dbmesh.mjs), so the drawn dumbbell reaches 14.7 cm from the right fist to its centre (centred between the hands)
const OFF_MESH = [OFF[0], OFF[1], -14.7];
ex.props = [benchProp, B.heldProp('r', 'handle', OFF_MESH)];
// the dumbbell stays on the hip crease: drift of its centre in the pelvis frame over the loop
let pivot = 0, drift = 0;
const tl0 = R.buildTimeline(ex), spec = B.gripSpec('handle', OFF), D = require('./families/dumbbell');
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => {
  pivot = Math.max(pivot, V.len(V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE)));
  const c = D.dumbbellAt(W, 'r', spec, { length: 32, diameter: 12 }).c, loc = Q.rot(Q.conj(W.pelvis.q), V.sub(c, W.pelvis.p));
  drift = Math.max(drift, Math.abs(loc[2]));
} });
const db = B.dbLoop(ex, [{ side: 'r', grip: 'handle', offset: OFF }], ['thigh', 'quad', 'pelvis', 'abdomen', 'ribcage', 'buttock']);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
set('Bench height', 'setup', `${BENCH_H} cm flat bench across the upper back`); set('Bench height', 'peak', 'Upper back pivots on the bench edge');
set('Hip flexion', 'setup', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° at the bottom`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}°`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wb, 'r'))}° at the bottom`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° (shins vertical), feet ${2 * STANCE} cm apart`);
set('Trunk inclination', 'setup', `≈${Math.round(-trunkTilt(Wb))}° (hips below the shoulders)`); set('Trunk inclination', 'peak', `≈${Math.round(Math.abs(trunkTilt(Wt)))}° (level)`);
set('Dumbbell', 'setup', 'Across the hip crease, both hands on the plates'); set('Dumbbell', 'peak', `Rides on the hip crease (centred, ≤${r1(drift)} cm off the midline)`);
set('Tempo', 'setup', 'Hips down 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.8 s squeeze, 2.0 s down, 1.2 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Dumbbell Hip Thrust: pitch ${P_BOT}..${P_TOP}, feet x ${FX}, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(db)} pivotErr ${pivot.toFixed(2)} dbDrift ${r1(drift)} butt ${r1(buttY(Wb))} hipY ${r1(Wb.hip_r.p[1])}..${r1(Wt.hip_r.p[1])} travel ${r1(travel)} arms ${JSON.stringify(poses.top.ch.shoulder_r)} ${JSON.stringify(poses.top.ch.elbow_r)} ${JSON.stringify(poses.top.ch.wrist_r)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (db.dbFloor < 0) { console.error('FAIL: dumbbell through the floor'); process.exitCode = 1; }
