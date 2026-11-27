// Superman (GymVisual #343612): prone on a mat, arms straight overhead, legs straight. Lift the arms, chest and legs a
// few centimetres off the mat (spine and hip extension, neck in line), hold about 2 s, lower. Symmetric (bilateral).
// No planted contacts: the pelvis and lower abdomen stay on the mat (root kept on the floor in every key).
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const meta = require('./meta/superman.json');

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
function lie(p) {
  const s = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.ankle_r.dorsi'], [
    (W) => [lowest(W, BODY) * 3, lowest(W, THIGH) * 2, lowest(W, ['foot_r']) * 1, Math.min(0, lowest(W, ['foot_r']) + 0.1) * 8, Math.min(0, L.shapeMinY(W).y) * 6],
    (W, q) => [Math.min(0, q.ch.ankle_r.dorsi + 73) * 5],
  ]);
  sym(s.pose, 'hip', s.pose.ch.hip_r); sym(s.pose, 'ankle', s.pose.ch.ankle_r);
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
const keyframes = [
  { t: 0, pose: 'rest' }, { t: 1.0, pose: 'rest' }, { t: 1.5, pose: 'up50' }, { t: 2.0, pose: 'peak' }, { t: 2.6, pose: 'reach' }, { t: 3.4, pose: 'peak' },
  { t: 4.0, pose: 'peak' }, { t: 4.5, pose: 'up50' }, { t: 5.0, pose: 'rest' }, { t: 6.0, pose: 'rest' },
];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: [],
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };

/* ---------- Measures, kinematics fill ---------- */
const meas = (n) => {
  const p = poses[n], W = L.fk(p);
  return { chest: lowest(W, CHEST), hands: lowest(W, ['hand_r']), feet: lowest(W, LEG), knee: lowest(W, ['thigh_r', 'quad_r']), head: lowest(W, ['head', 'nose', 'jaw']),
    spine: p.ch.spine_l5.flex + p.ch.spine_t12.flex + p.ch.spine_t6.flex, hip: -p.ch.hip_r.flex, elev: p.ch.shoulder_r.elev, min: L.shapeMinY(W) };
};
const m0 = meas('rest'), m1 = meas('peak');
const cm = (v) => `${Math.round(v)} cm`, deg = (v) => `≈${Math.round(v)}°`;
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Chest lift', 'setup', `Chest on the mat (${cm(m0.chest)})`); set('Chest lift', 'peak', `${cm(m1.chest)} off the mat`);
set('Hand and foot lift', 'setup', 'Hands and feet resting on the mat'); set('Hand and foot lift', 'peak', `Hands ${cm(m1.hands)}, feet ${cm(m1.feet)}, knees ${cm(m1.knee)} off the mat`);
set('Spine extension', 'setup', '0°'); set('Spine extension', 'peak', `${deg(-m1.spine)} (lumbar ${Math.round(-poses.peak.ch.spine_l5.flex)}°, thoracic ${Math.round(-poses.peak.ch.spine_t12.flex - poses.peak.ch.spine_t6.flex)}°)`);
set('Hip extension', 'setup', `${deg(m0.hip)}`); set('Hip extension', 'peak', `${deg(m1.hip)}`);
set('Shoulder flexion', 'setup', `${deg(m0.elev)} (arms overhead, hands on the mat)`); set('Shoulder flexion', 'peak', `${deg(m1.elev)}`);
set('Tempo', 'setup', '1 s relaxed'); set('Tempo', 'peak', '1 s up, 2 s hold, 1 s down, 1 s rest');
ex.exercise.reference.note = P.NOTE;
console.log(`Superman: wrote ${L.write(ex)}`);
for (const n of Object.keys(poses)) { const m = meas(n); console.log(`  ${n.padEnd(6)} chest=${m.chest.toFixed(1)} hands=${m.hands.toFixed(1)} feet=${m.feet.toFixed(1)} knee=${m.knee.toFixed(1)} head=${m.head.toFixed(1)} spine=${m.spine.toFixed(1)} hip=${m.hip} elev=${m.elev} pron=${poses[n].ch.wrist_r.pron} min=${m.min.y.toFixed(2)}(${m.min.id}) rootY=${poses[n].root.pos[1]}`); }
const sw = P.sweep(ex, [{ joint: 'pelvis', p: L.fk(rest).pelvis.p }]);
console.log('  sweep', JSON.stringify(sw));
if (sw.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
