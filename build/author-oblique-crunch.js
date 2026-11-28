// Oblique Crunch (Version 2) (GymVisual #5291, movement reference only; page not readable here). Crossed-leg oblique
// crunch, authored on the right: supine on a mat, right knee bent about 90 degrees with the right foot flat (planted), the
// left ankle crossed over the right knee (left knee open to the side), right fingertips behind the head with the elbow
// wide, left arm out to the side on the mat (planted hand) for balance. Curl up and rotate so the right elbow and shoulder
// travel toward the left knee, squeeze, lower. Pelvis and legs stay still; the rotation comes from the thoracic spine.
// The player mirrors it for the other side. Built on core-a / core-b / b4-core2 (as twisting-crunch) and b6-17.
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const F6 = require('./families/b6-17');
const meta = require('./meta/oblique-crunch.json');

const lie0 = M.lie({ kneeFlex: 90, headRest: 'hands' });
const PF = CA.plantFeet(lie0, 90);
// right foot planted only
const FOOT = PF.contacts.find((c) => c.id === 'leg_r');
let base = clone(PF.pose); base.ik = { leg_r: PF.pose.ik.leg_r };
// left leg crossed: ankle resting on top of the right thigh just above the knee, left knee open to the side and lower
const W0 = L.fk(base, [FOOT]);
const kr = W0.knee_r.p, hr = W0.hip_r.p, ax = V.norm(V.sub(kr, hr)), nUp = V.norm(V.sub([0, 1, 0], V.scale(ax, ax[1])));
const tBase = V.add(hr, V.scale(V.sub(kr, hr), +(process.env.U || 0.86)));
const ANK = V.add(V.add(tBase, V.scale(nUp, F6.surfaceUp(W0, tBase, nUp, ['thigh_r', 'quad_r'], 0.5) + 4.2)), [0, 0, -(+(process.env.DZ || 9))]);
// left knee open to the side: out to the left of the hip, a little forward and up (thigh about 40 degrees off the mat)
const HL0 = W0.hip_l.p, THL = V.len(L.rig.byId.knee_l.offset);
const KNEE_L = V.add(HL0, V.scale(V.norm([0.45, 0.65, -0.62]), THL));
{
  const paths = ['ch.hip_l.flex', 'ch.hip_l.abd', 'ch.hip_l.rot', 'ch.knee_l.flex', 'ch.ankle_l.dorsi'];
  let best = null;
  for (const g of [[70, 30, 40, 100], [80, 40, 60, 90], [60, 20, 30, 110]]) {
    const q = clone(base); q.ch.hip_l = { flex: g[0], abd: g[1], rot: g[2] }; q.ch.knee_l = { flex: g[3] }; q.ch.ankle_l = { dorsi: 0 };
    const r = L.solvePose(q, paths, [L.obj.at('ankle_l', ANK, 3), L.obj.at('knee_l', KNEE_L, +(process.env.KW || 0.4)), (W) => [Math.min(0, F6.gapTo(W, 'shank_r', W.knee_l.p) - 6) * 2], L.obj.reg('ch.ankle_l.dorsi', 0, 0.05), L.obj.reg('ch.hip_l.abd', 40, 0.02), CA.limitPen(paths, 12),
      (W) => ['calf_l', 'shank_l', 'foot_l'].map((id) => Math.min(0, Math.min(F6.gapTo(W, 'quad_r', W.knee_l.p), CA.bottomOf(W, id) - 1)) * 2)], { iters: 400 });
    if (!best || r.cost < best.cost) best = r;
  }
  base = best.pose;
}
// left arm out on the mat about 50 degrees from the body, palm down (planted)
const HC = CA.handContacts().filter((c) => c.id === 'arm_l');
const HL = CA.handTargets(base, { abd: 55, flex: 12 }).l;
const contacts = [FOOT, ...HC];
const NECK0 = r1(base.ch.neck_c7.flex + base.ch.head_c1.flex);
const SPLIT = { spine_l5: 0.08, spine_t12: 0.46, spine_t6: 0.46 };
function key(k, ref) {
  const p = CA.spine(clone(base), base, { l5: k.l5, t12: k.t12, t6: k.t6 });
  for (const j of Object.keys(SPLIT)) Object.assign(p.ch[j], { rot: r1(-(k.rot || 0) * SPLIT[j]), latFlex: r1(-(k.lat || 0) * (j === 'spine_l5' ? 0 : 0.5)) });
  CB.neck(p, k.neck == null ? NECK0 : k.neck, -(k.rot || 0) * 0.35);
  let q = CB.cradle(p, { side: 'r', floor: k.floor ? 0.2 : 1.0, elbowAnt: k.elbowAnt ?? -3, elbowOut: k.elbowOut ?? 18, guess: ref, ref });
  delete q.__cost;
  q = CA.fitArm(q, 'l', HL, HC);
  q.ik = { leg_r: clone(base.ik.leg_r), arm_l: { target: HL.slice(), weight: 1 } };
  return q;
}
let best = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const p = CB.cradle(clone(base), { side: 'r', floor: 0.2, guess: g }); if (!best || p.__cost < best.__cost) best = p;
}
const REF0 = CB.armOf(best, 'r');
const poses = {}; let prev = REF0;
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, floor: true },
  { name: 'up', l5: 1, t12: 9, t6: 11, rot: 14, neck: 22 },
  { name: 'twist', l5: 2, t12: 21, t6: 17, rot: +(process.env.ROT || 34), lat: 5, neck: 26, elbowAnt: 4, elbowOut: 14 },
  { name: 'hold', l5: 2.5, t12: 22, t6: 17.5, rot: +(process.env.ROT || 34) + 2, lat: 5.5, neck: 26, elbowAnt: 4, elbowOut: 14 },
  { name: 'down', l5: 0.5, t12: 5, t6: 6, rot: 10, neck: 18 },
];
for (const k of KEYS) { poses[k.name] = key(k, k.floor ? REF0 : prev); prev = CB.armOf(poses[k.name], 'r'); }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.6, pose: 'lie' }, { t: 1.0, pose: 'up' }, { t: 1.6, pose: 'twist' }, { t: 2.0, pose: 'hold' }, { t: 2.9, pose: 'down' }, { t: 3.4, pose: 'lie' }, { t: 4.0, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, contacts);
// verify's kneeFlexion takes the larger knee: the crossed left knee (constant) and the planted right knee (90)
const KMAX = Math.max(...Object.values(poses).map((p) => Math.max(CA.kneeOf(L.fk(p, contacts), 'r'), CA.kneeOf(L.fk(p, contacts), 'l'))));
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(KMAX - 4), max: Math.ceil(KMAX + 4) };

const rotOf = (p) => p.ch.spine_l5.rot + p.ch.spine_t12.rot + p.ch.spine_t6.rot;
const shR = (W) => W.shoulder_r.p[1] - W.shoulder_l.p[1];
const ek = (W) => V.len(V.sub(W.elbow_r.p, W.knee_l.p));
const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'buttock_l', 'pelvis']), shoulderTilt: shR, elbowKnee: ek, kneeR: (W) => CA.kneeOf(W, 'r') });
rep.limits = rep.limits.concat(F6.limitViolations(poses)).filter((v, i, a) => a.indexOf(v) === i);
const Wl = L.fk(base, contacts), Wt = L.fk(poses.hold, contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.hold;
kin[0].setup = d(CA.upperFromFloor(Wl)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = 'Facing the ceiling'; kin[1].peak = `${d(Math.abs(rotOf(pk)))} toward the crossed knee (thoracic ${d(Math.abs(pk.ch.spine_t12.rot + pk.ch.spine_t6.rot))}); right shoulder ${r1(shR(Wt))} cm higher than the left`;
kin[2].setup = d(base.ch.spine_t12.flex + base.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - base.ch.spine_t12.flex - base.ch.spine_t6.flex)}°)`;
kin[3].setup = `Right knee ${d(CA.kneeOf(Wl, 'r'))} (foot flat); left ankle on the right knee, left hip ${d(base.ch.hip_l.flex)} flexed, ${d(base.ch.hip_l.abd)} abducted, ${d(base.ch.hip_l.rot)} rotated`; kin[3].peak = 'Unchanged (pelvis and legs still)';
kin[4].setup = 'Right fingertips behind the head; left arm out on the mat'; kin[4].peak = `Right elbow ${Math.round(ek(Wt))} cm from the left knee (reaching toward it)`;
kin[5].setup = 'Rest 0.6 s'; kin[5].peak = '1.0 s up and turn, 0.4 s squeeze, 1.4 s down, 0.6 s rest';
console.log(`Oblique crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} hipL=${JSON.stringify(base.ch.hip_l)} kneeL=${base.ch.knee_l.flex} ankErr=${V.len(V.sub(L.fk(base, [FOOT]).ankle_l.p, ANK)).toFixed(1)}`);
for (const n of ['lie', 'up', 'twist', 'hold', 'down']) { const p = poses[n], W = L.fk(p, contacts); console.log(`  ${n.padEnd(6)} upper=${CA.upperFromFloor(W).toFixed(1)} rot=${rotOf(p).toFixed(1)} shTilt=${shR(W).toFixed(1)} ek=${ek(W).toFixed(1)} L=${p.ch.shoulder_l.plane}/${p.ch.shoulder_l.elev}/${p.ch.shoulder_l.axial} elbL=${p.ch.elbow_l.flex}`); }
M.guard('oblique-crunch', ex, rep, [(KMAX < ex.checks.measure.min || KMAX > ex.checks.measure.max) && 'knee measure', shR(Wt) < 4 && 'right shoulder barely turns up', rep.lowBack[1] - rep.lowBack[0] > 1.5 && 'low back lifts']);
