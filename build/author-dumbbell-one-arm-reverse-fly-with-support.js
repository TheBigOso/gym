// Dumbbell One Arm Reverse Fly (with support) (GymVisual #22127; page not readable here, movement from the name): supported
// on a flat bench like the one-arm row: left knee and left hand on the bench, right foot planted on the floor out to the side,
// back flat about 16 degrees above the floor. The right arm hangs under the shoulder (palm in, thumb toward the head) and sweeps
// out to the side with a soft, fixed elbow bend until the upper arm is about level with the back, palm turning down, the
// shoulder blade drawing in; pause; lower slowly. Trunk, pelvis and supports stay still. Authored right (the player mirrors).
// Support position from b6-04.js kneelBench; arm keys solved on an arc (b6-04.js armAt / b3-back holdArm).
const L = require('./lib');
const { V, r1, clone } = L;
const F6 = require('./families/b6-04');
const B = require('./families/b3-back');
const meta = require('./meta/dumbbell-one-arm-reverse-fly-with-support.json');
const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const S0 = F6.kneelBench(), { contacts, bench, boxes } = S0;
const UAL = V.len(L.rig.byId.elbow_r.offset), FAL = V.len(L.rig.byId.wrist_r.offset);
const TOP = JSON.parse(process.env.TOP || '[0.12, -0.06, 1]'), E0 = 14, E1 = 20;
const down = V.norm([0.04, -1, 0.05]), top = V.norm(TOP);
let guess = null;
function at(f) {
  const q0 = clone(S0.pose);
  q0.ch.sc_r = { protract: r1(6 - 20 * f), elevate: 0 };
  const W = L.fk(q0, contacts), S = W.shoulder_r.p;
  const d = F6.slerp(down, top, f), e = (E0 + (E1 - E0) * f) * L.R.DEG;
  const bv0 = F6.slerp([0, 0, -1], [0, -1, 0], f), bv = V.norm(V.sub(bv0, V.scale(d, V.dot(bv0, d))));
  const fa = V.norm(V.add(V.scale(d, Math.cos(e)), V.scale(bv, Math.sin(e))));
  const E = V.add(S, V.scale(d, UAL - 0.1)), Wt = V.add(E, V.scale(fa, FAL - 0.3));
  const p0 = F6.slerp([0, 0, -1], [0, -1, 0], f), palm = V.norm(V.sub(p0, V.scale(fa, V.dot(p0, fa)))); // palm square to the forearm
  const x0 = [1, 0, 0], thumb = V.norm(V.sub(V.sub(x0, V.scale(fa, V.dot(x0, fa))), V.scale(palm, V.dot(x0, palm))));
  const q = F6.armAt(q0, E, Wt, palm, thumb, guess);
  guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
  const Wq = L.fk(q, contacts); if (process.env.DBG) console.log(f, V.len(V.sub(Wq.wrist_r.p, Wt)).toFixed(2), V.len(V.sub(Wq.elbow_r.p, E)).toFixed(2), V.len(V.sub(L.Q.rot(Wq.wrist_r.q, [1, 0, 0]), palm)).toFixed(3), JSON.stringify(q.ch.wrist_r)); q.__c = Math.max(V.len(V.sub(Wq.wrist_r.p, Wt)), V.len(V.sub(Wq.elbow_r.p, E)), 10 * V.len(V.sub(L.Q.rot(Wq.wrist_r.q, [1, 0, 0]), palm))); delete q.__cost; // worst miss: cm, or palm direction x 10
  return B.wrapPose(q);
}
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], N = FS.length - 1, poses = {}, costs = [];
FS.forEach((f, i) => { const q = at(f); costs.push(+q.__c.toFixed(3)); delete q.__c; poses[`r${i}`] = q; });
{ const q = at(1.03); delete q.__c; poses.squeeze = q; }
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const ease = (u) => u * u * (3 - 2 * u), inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const kf = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => kf.push({ t: ph.raise.start + (ph.raise.end - ph.raise.start) * inv(f), pose: `r${i}` }));
kf.push({ t: (ph.squeeze.start + ph.squeeze.end) / 2, pose: 'squeeze' }, { t: ph.squeeze.end, pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) kf.push({ t: ph.lower.start + (ph.lower.end - ph.lower.start) * inv(1 - FS[i]), pose: `r${i}` });
kf.push({ t: D, pose: 'r0' });
const keyframes = [...new Map(kf.map((k) => [+k.t.toFixed(3), { t: +k.t.toFixed(3), pose: k.pose }])).values()].sort((a, b) => a.t - b.t);
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [bench.prop, B.heldProp('r', 'handle', SIZE)], contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = B.NOTE;
const rep = B.sweep(ex, { held: [{ side: 'r', grip: 'handle', size: DSZ }], fixed: ['knee_l', 'ankle_l', 'pelvis'], boxes, bodySkip: ['hand_l', 'thumb_l', 'forearm_l', 'shank_l', 'calf_l', 'foot_l', 'thigh_l', 'quad_l'] });
const W0 = L.fk(poses.r0, contacts), W1 = L.fk(poses[`r${N}`], contacts);
const fromDown = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal, spine neutral`); set('Trunk angle', 'peak', 'Unchanged (no twist)');
set('Horizontal abduction', 'setup', `Arm hanging (upper arm ≈${Math.round(fromDown(W0))}° from vertical)`); set('Horizontal abduction', 'peak', `Upper arm ≈${Math.round(fromDown(W1))}° from vertical, about level with the back; shoulder blade drawn in (clavicle 6° to -14°)`);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}° (soft, fixed)`);
set('Grip', 'setup', 'Neutral, palm facing in, thumb toward the head'); set('Grip', 'peak', 'Palm down, thumb toward the head');
set('Tempo', 'setup', `Hang ${ph.setup.end} s`); set('Tempo', 'peak', `${r1(ph.raise.end - ph.raise.start)} s up, ${r1(ph.squeeze.end - ph.squeeze.start)} s squeeze, ${r1(ph.lower.end - ph.lower.start)} s down`);
const tl = B.trunkLean(W0); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tl - 3), max: Math.ceil(tl + 3) };
console.log(`Dumbbell One Arm Reverse Fly (with support): wrote ${L.write(ex)}\n  costs ${costs} fromDown ${Math.round(fromDown(W0))}->${Math.round(fromDown(W1))} trunk ${tl.toFixed(1)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.dbBox < 0 || Math.max(...costs) > 1) { console.error('FAIL: dumbbell through the floor, the bench or the body / unsolved key'); process.exitCode = 1; }
