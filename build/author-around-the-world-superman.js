// Around the World Superman (GymVisual 20136, movement reference only; page not readable at authoring time). Prone on a
// mat, arms straight overhead, legs straight. Lift into the superman (arms, chest and legs a few centimetres off the mat;
// the prone base, lift and arm placement are those of author-superman.js), then sweep the straight arms out wide and
// around toward the hips with the hands just off the mat, and back overhead; hold, lower. Bilateral. No planted
// contacts: the pelvis stays where it rests on the mat.
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const meta = require('./meta/around-the-world-superman.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const sym = (p, j, v) => { p.ch[`${j}_r`] = clone(v); p.ch[`${j}_l`] = clone(v); };
const lowest = (W, ids) => Math.min(...ids.map((id) => P.bottomOf(W, id)));
let ANKLE = -62;
const ARM = ['upperarm_r', 'forearm_r', 'hand_r', 'thumb_r'], LEG = ['foot_r', 'shank_r', 'calf_r'], CHEST = ['chest', 'pecs_r', 'ribcage'];

/* ---------- Lying prone: head toward +X, face down, arms overhead, tops of the feet on the mat ---------- */
function prone({ spine = [0, 0, 0], hipExt = 0, neck = -12, armUp = 0, sc = [0, 6] } = {}) {
  const p = { root: { pos: [0, 12, 0], rot: { pitch: -90 } }, ch: {
    spine_l5: { ...z0(), flex: spine[0] }, spine_t12: { ...z0(), flex: spine[1] }, spine_t6: { ...z0(), flex: spine[2] },
    neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 } } };
  sym(p, 'hip', { flex: -hipExt, abd: 3, rot: 0 }); sym(p, 'knee', { flex: 2 }); sym(p, 'ankle', { dorsi: ANKLE });
  sym(p, 'sc', { protract: sc[0], elevate: sc[1] }); sym(p, 'elbow', { flex: 6 });
  P.head(p, neck);
  return p;
}
// Shoulder elevation (arms overhead in the flexion plane, slightly wide) so the hands hang `armUp` cm above the mat;
// palms face down. The root is set first so the pelvis / lower abdomen touch the mat.
// Rest: root height and pitch plus hip angle so the chest, the front of the thighs and the tops of the feet all rest on
// the mat (nothing below it).
const BODY = ['chest', 'pecs_r', 'ribcage', 'abdomen', 'pelvis'], THIGH = ['thigh_r', 'quad_r', 'shank_r'];
// The arms are placed afterwards (finishPose), so they do not hold the body off the mat here.
const NOT_ARMS = L.rig.shapes.map((x) => x.id).filter((id) => !/^(deltoid|upperarm|biceps|forearm|hand|thumb)_/.test(id));
function lie(p) {
  // the knees may soften a little so the plantarflexed feet (ankle range ends at -75) let the chest and pelvis reach the mat
  const s = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.ankle_r.dorsi', 'ch.knee_r.flex'], [
    (W) => [lowest(W, BODY) * 3, lowest(W, THIGH) * 2, lowest(W, ['foot_r']) * 1, Math.min(0, lowest(W, ['foot_r']) + 0.1) * 8, Math.min(0, lowest(W, NOT_ARMS)) * 6],
    (W, q) => [Math.min(0, q.ch.ankle_r.dorsi + 73) * 5, (q.ch.knee_r.flex - 2) * 0.05, Math.min(0, q.ch.knee_r.flex) * 5, Math.max(0, q.ch.hip_r.flex - 3) * 5],
  ]);
  sym(s.pose, 'hip', s.pose.ch.hip_r); sym(s.pose, 'ankle', s.pose.ch.ankle_r); sym(s.pose, 'knee', s.pose.ch.knee_r);
  return s.pose;
}
function finishPose(p, { handsY = 0, ground = true }) {
  if (ground) { const W = L.fk(p); p.root.pos[1] = r3(p.root.pos[1] - Math.min(lowest(W, BODY), lowest(W, THIGH))); }
  const s = L.solvePose(p, ['ch.shoulder_r.elev', 'ch.wrist_r.pron'], [
    (W) => [(P.bottomOf(W, 'hand_r') - handsY) * 3],
    // palm faces the floor: hand-local +X (palm side) points down
    (W) => [(Q.rot(W.wrist_r.q, [1, 0, 0])[1] + 1) * 6],
  ]);
  const q = s.pose; q.ch.shoulder_r = { plane: 80, elev: q.ch.shoulder_r.elev, axial: 0 }; q.ch.wrist_r = { pron: q.ch.wrist_r.pron, flex: 0, dev: 0 };
  sym(q, 'shoulder', q.ch.shoulder_r); sym(q, 'wrist', q.ch.wrist_r);
  return q;
}
const seed = (p) => { p.ch.shoulder_r = { plane: 80, elev: 165, axial: 0 }; p.ch.wrist_r = { pron: 90, flex: 0, dev: 0 }; return p; };
const lying = lie(seed(prone({ neck: -10 })));
const PITCH = lying.root.rot.pitch, HIP0 = -lying.ch.hip_r.flex; ANKLE = lying.ch.ankle_r.dorsi;
const rest = finishPose(lying, { handsY: 0, ground: false });
// Lift: thoracic and lumbar extension raise the chest, hip extension raises the straight legs, the arms lift with the
// chest plus a little more shoulder elevation; the neck stays long (eyes on the mat).
function lifted(f, extra = 0) {
  const p = seed(prone({ spine: [-8 * f - extra, -7 * f - extra, -5 * f], hipExt: HIP0 + 15 * f + extra, neck: -10 + 4 * f, sc: [-4 * f, 6] }));
  p.root = clone(rest.root);   // the pelvis is the pivot: it stays exactly where it rests on the mat
  return finishPose(p, { handsY: 13 * f + extra, ground: false });
}
const poses = { rest, up50: lifted(0.5), peak: lifted(1), reach: lifted(1, 0.6) };

// Arm sweep: the wrist travels on a level arc around the shoulder (angle phi from straight ahead of the head, +X, out to
// the side, +Z, and back toward the feet) at WRIST_Y above the mat; arms straight, palms kept facing the floor. Solved
// with lib armToTarget, each key seeded from the previous one so the shoulder channels stay on one branch.
const WRIST_Y = 14;
const PHIS = [0, 30, 60, 90, 120, 150];
const top = poses.peak, Spk = L.fk(top).shoulder_r.p;
let guess = [top.ch.shoulder_r.plane, top.ch.shoulder_r.elev, 0];
function sweepKey(phi) {
  const dy = WRIST_Y - Spk[1], h = Math.sqrt(L.reach(6) ** 2 - dy * dy), t = phi * R.DEG;
  const tgt = [Spk[0] + h * Math.cos(t), WRIST_Y, Spk[2] + h * Math.sin(t)];
  const q = L.armToTarget(clone(top), tgt, { flex: 6, wrist: clone(top.ch.wrist_r), axial: 0, axialW: 0.01, guess });
  guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial];
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return q;
}
for (const phi of PHIS) poses[`a${phi}`] = sweepKey(phi);
delete poses.reach;
poses.a0 = clone(poses.a0); // same arc start as the peak's arm angle, at WRIST_Y
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.8, pose: 'rest' }, { t: 1.15, pose: 'up50' }, { t: 1.5, pose: 'a0' }];
PHIS.slice(1).forEach((phi, i) => keyframes.push({ t: +(1.5 + 0.3 * (i + 1)).toFixed(2), pose: `a${phi}` }));
PHIS.slice(0, -1).reverse().forEach((phi, i) => keyframes.push({ t: +(3.0 + 0.3 * (i + 1)).toFixed(2), pose: `a${phi}` }));
keyframes.push({ t: 5.0, pose: 'a0' }, { t: 5.35, pose: 'up50' }, { t: 5.7, pose: 'rest' }, { t: 7.0, pose: 'rest' });
delete poses.peak;
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: [],
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = P.NOTE;
const maxHip = Math.max(...Object.values(poses).map((p) => p.ch.hip_r.flex));
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(maxHip - 2), max: Math.ceil(maxHip + 2) };
const sw = P.sweep(ex, [{ joint: 'pelvis', p: L.fk(rest).pelvis.p }]);
// hands off the mat and clear of the body during the sweep
const tl = R.buildTimeline(ex); let handMin = 1e9, hipGap = 1e9;
for (let t = 1.5; t <= 5.0; t += 0.01) { const W = R.evalPose(L.rig, tl.pose(t), []); handMin = Math.min(handMin, P.bottomOf(W, 'hand_r'), P.bottomOf(W, 'forearm_r')); hipGap = Math.min(hipGap, W.wrist_r.p[2] - W.hip_r.p[2]); }
const m0 = { chest: lowest(L.fk(rest), CHEST) }, Wa = L.fk(poses.a0), Ws = L.fk(poses.a90), We = L.fk(poses.a150);
const spineSum = (p) => p.ch.spine_l5.flex + p.ch.spine_t12.flex + p.ch.spine_t6.flex;
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k[f] = v; }, deg = (v) => `≈${Math.round(v)}°`;
set('Chest lift', 'setup', `Chest on the mat (${Math.round(m0.chest)} cm)`); set('Chest lift', 'peak', `${Math.round(lowest(Wa, CHEST))} cm off the mat`);
set('Spine extension', 'setup', '0°'); set('Spine extension', 'peak', `${deg(-spineSum(poses.a0))} (sum of segments)`);
set('Shoulder arc', 'setup', 'Arms overhead resting on the mat'); set('Shoulder arc', 'peak', `Overhead (elev ${deg(poses.a0.ch.shoulder_r.elev)}) to the side (plane ${deg(poses.a90.ch.shoulder_r.plane)}, elev ${deg(poses.a90.ch.shoulder_r.elev)}) to beside the hips (elev ${deg(poses.a150.ch.shoulder_r.elev)}); hands at least ${Math.round(handMin)} cm off the mat`);
set('Hip extension', 'setup', deg(-rest.ch.hip_r.flex)); set('Hip extension', 'peak', deg(-poses.a0.ch.hip_r.flex));
set('Tempo', 'setup', '0.8 s relaxed'); set('Tempo', 'peak', '0.7 s up, 1.5 s to the hips, 1.5 s back overhead, 0.5 s hold, 0.7 s down');
console.log(`Around the World Superman: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} handMin ${handMin.toFixed(1)} wristOutsideHip ${hipGap.toFixed(1)}`);
for (const phi of PHIS) { const p = poses[`a${phi}`]; console.log(`  a${phi} sh ${JSON.stringify(p.ch.shoulder_r)} hand ${P.bottomOf(L.fk(p), 'hand_r').toFixed(1)}`); }
const viol = [];
for (const [n, p] of Object.entries(poses)) for (const j in p.ch) { const lim = L.rig.byId[j] && L.rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
if (sw.floor < -0.5 || handMin < 1 || hipGap < 8 || viol.length) { console.error('FAIL', sw.floor, handMin, hipGap, viol); process.exitCode = 1; }
