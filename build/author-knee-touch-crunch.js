// Knee Touch Crunch (GymVisual #9304, movement reference only; page not readable here). Bilateral: supine on a mat, knees
// bent about 90 degrees with the feet flat (planted), palms resting on the front of the thighs. Curl the head, shoulders
// and shoulder blades off the mat, sliding the hands up the thighs until the fingertips touch the knees; squeeze, then
// lower with the hands sliding back: shoulder blades first, head last. Low back and pelvis stay down. Built on core-a /
// b4-core2 (as crunch) and b6-17 armReach.
const L = require('./lib');
const { V, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const F6 = require('./families/b6-17');
const meta = require('./meta/knee-touch-crunch.json');

const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const F = CA.plantFeet(lie0, 90);
const lie = F.pose, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
// point on top of the right thigh at fraction u from hip to knee (u = 1: kneecap)
function thighPt(W, u, extra = 0) {
  const h = W.hip_r.p, k = W.knee_r.p, ax = V.norm(V.sub(k, h));
  const n = V.norm(V.sub([0, 1, 0], V.scale(ax, ax[1]))), base = V.add(h, V.scale(V.sub(k, h), u));
  const up = F6.surfaceUp(W, base, n, ['thigh_r', 'quad_r', 'shank_r'], 0.8) + extra;
  return { p: V.add(base, V.scale(n, up)), ax, n };
}
function curl(k, ref) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  const T = thighPt(L.fk(p, F.contacts), k.u, k.up ?? 0);
  const q = F6.armReach(p, 'r', { tip: T.p, palm: V.scale(T.n, -1), fingers: T.ax, palmW: 0.6, fingersW: 0.5, elbow: k.elbow ?? 10, elbowW: 0.05, floor: 0.5, guess: ref, ref, protract: k.pro ?? 0,
    extra: [(W) => ['quad_r', 'thigh_r'].map((id) => Math.min(0, F6.gapTo(W, id, W.wrist_r.p) - 2.2) * 3)] });
  delete q.__cost;
  return F6.mirrorArm(q);
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, u: 0.3, elbow: 20 },
  { name: 'peel', l5: 0.5, t12: 7, t6: 10, neck: 22, u: 0.55 },
  { name: 'top', l5: 2, t12: 20, t6: 17, neck: 28, u: 0.97, pro: 12 },
  { name: 'topHold', l5: 2.5, t12: 21, t6: 17.5, neck: 28, u: 0.99, pro: 13 },
  { name: 'down', l5: 0.5, t12: 4, t6: 6, neck: 18, u: 0.48 },
  { name: 'touch', l5: 0, t12: 1, t6: 2, neck: NECK0 + 4, u: 0.33, elbow: 18 },
];
const seed = F6.armOf(curl(KEYS[2]), 'r');
const poses = {}; let prev = seed;
for (const k of [KEYS[2], KEYS[3], KEYS[1], KEYS[4], KEYS[5], KEYS[0]]) { poses[k.name] = curl(k, prev); prev = F6.armOf(poses[k.name], 'r'); }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'peel' }, { t: 1.8, pose: 'top' }, { t: 2.3, pose: 'topHold' }, { t: 3.3, pose: 'down' }, { t: 3.9, pose: 'touch' }, { t: 4.4, pose: 'lie' }, { t: 5.0, pose: 'lie' }];
const ex = CA.buildModule(meta, poses, keyframes, F.contacts);

const thighGap = (W) => Math.min(...['quad_r', 'thigh_r'].map((id) => Math.min(F6.gapTo(W, id, W.handtip_r.p), F6.gapTo(W, id, W.wrist_r.p))));
const rep = CA.scan(ex, { upper: (W) => CA.upperFromFloor(W), lowBack: (W) => CA.minOf(W, ['buttock_r', 'pelvis']), thighGap });
const Wl = L.fk(lie, F.contacts), Wt = L.fk(poses.topHold, F.contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
const tipKnee = (W) => V.len(V.sub(W.handtip_r.p, thighPt(W, 1).p));
kin[0].setup = d(CA.upperFromFloor(Wl)); kin[0].peak = `${d(CA.upperFromFloor(Wt))} (C7 up ${r1(Wt.neck_c7.p[1] - Wl.neck_c7.p[1])} cm)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (low back stays on the mat)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} (+${Math.round(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex - lie.ch.spine_t12.flex - lie.ch.spine_t6.flex)}°)`;
kin[3].setup = 'Palms on the front of the thighs, about a third of the way to the knees'; kin[3].peak = `Fingertips ${r1(tipKnee(Wt))} cm from the top of the kneecap; elbows ${d(L.R.measures(Wt).elbowR)}`;
kin[4].setup = `Hip ${d(lie.ch.hip_r.flex)}, knee ${d(CA.kneeOf(Wl, 'r'))}`; kin[4].peak = 'Unchanged (pelvis and feet still)';
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '1.0 s up, 0.5 s squeeze, 1.6 s down, 1.1 s rest';
console.log(`Knee touch crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
for (const k of KEYS) { const p = poses[k.name], W = L.fk(p, F.contacts), T = thighPt(W, k.u, k.up ?? 0); console.log(`  ${k.name.padEnd(8)} upper=${CA.upperFromFloor(W).toFixed(1)} sh=${p.ch.shoulder_r.plane}/${p.ch.shoulder_r.elev}/${p.ch.shoulder_r.axial} elb=${p.ch.elbow_r.flex} sc=${p.ch.sc_r.protract} tipErr=${V.len(V.sub(W.handtip_r.p, T.p)).toFixed(1)} gap=${thighGap(W).toFixed(1)}`); }
M.guard('knee-touch-crunch', ex, rep, [(CA.upperFromFloor(Wt) < 25 || CA.upperFromFloor(Wt) > 50) && 'upper-trunk curl outside 25-50 degrees', rep.lowBack[1] > 1.5 && 'low back lifts', tipKnee(Wt) > 4 && `fingertips ${r1(tipKnee(Wt))} cm short of the knees`]);
