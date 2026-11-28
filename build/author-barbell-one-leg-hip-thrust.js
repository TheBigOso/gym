// Barbell One Leg Hip Thrust (GymVisual #7436 "Barbell one leg hip thrust"; page not readable here, movement from the name
// and standard coaching): upper back across the edge of a 42 cm bench, right foot flat (planted leg contact), left leg held
// straight off the floor, a barbell across the hip crease held overhand at both sides of the hips (68 cm between the hands).
// The trunk pivots on the bench edge (as in the bodyweight single-leg hip thrust): the hips drop until the plates rest on the
// floor, then drive up until the trunk is level and the right shin vertical; 0.8 s squeeze, 2 s down. The bar sits on the
// front of the hips (b6-01 hipBarCentre: as close to the body as the shaft allows, never below the plate radius) and both
// arms are solved onto it at every key (barbell.js armsOnBar, mirrored, so the grip width is constant). Authored on the
// right leg (the player mirrors).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const F = require('./families/b6-01');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-one-leg-hip-thrust.json');

const BENCH_H = 42, BENCH_D = 36, GW = 68, PLATE_D = 45;
const EDGE = [0, BENCH_H, 0];
const CHEST = rig.shapes.find((x) => x.id === 'chest');
const BACK_PT = [r1(CHEST.c[0] - CHEST.r[0] * Math.sqrt(1 - ((4 - CHEST.c[1]) / CHEST.r[1]) ** 2)), 4, 0];
const base = (() => { const p = H.lieBase(); p.root.pos = [40, 50, 0]; Object.assign(p.ch, { spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 } }); p.ch.sc_r = { protract: 4, elevate: 2 }; p.ch.sc_l = { protract: 4, elevate: 2 }; return p; })();
function trunk(pitch) {
  const p = clone(base); p.root.rot = { pitch: r1(pitch) };
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE).map((v) => v * 3)]).pose;
  const tilt = pitch - 90; // chin tucked: eyes toward the knees at the top, head in line with the trunk lower down
  s.ch.neck_c7 = { rot: 0, flex: r1(18 + 0.15 * tilt) }; s.ch.head_c1 = { rot: 0, flex: r1(12 + 0.1 * tilt) };
  return s;
}
const trunkTilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG;
let lo = 60, hi = 120, P_TOP = 90;
for (let i = 0; i < 40; i++) { P_TOP = (lo + hi) / 2; if (trunkTilt(L.fk(trunk(P_TOP))) < 0) lo = P_TOP; else hi = P_TOP; }
P_TOP = r1(P_TOP);
const contacts = [H.legC('r', { pole: [1, 0.3, 0.1] })];
const Wtop = L.fk(trunk(P_TOP));
const FOOT = (() => { let a = Wtop.hip_r.p[0] + 20, b = Wtop.hip_r.p[0] + 60, x = 0; for (let i = 0; i < 40; i++) { x = (a + b) / 2; const p = trunk(P_TOP); p.ik = { leg_r: { target: [x, L.ANKLE_H, 10], weight: 1 } }; if (H.kneeOf(L.fk(p, contacts), 'r') > 90) a = x; else b = x; } return [r1(x), L.ANKLE_H, 10]; })();
// free (left) leg: straight, in line with the working thigh at the top; lifted a little more lower down so the heel stays clear
function legs(pitch) {
  const p = trunk(pitch); p.ik = { leg_r: { target: FOOT.slice(), weight: 1 } };
  let q = H.fitLeg(p, 'r', contacts[0], FOOT);
  // about horizontal: in line with the working thigh at the top, lower than it (never above it, where the bar lies) lower down
  q.ch.knee_l = { flex: 4 }; q.ch.ankle_l = { dorsi: -10 }; q.ch.hip_l = { flex: r1(Math.max(0, Math.min(q.ch.hip_r.flex, 90 - pitch + 4))), abd: 2, rot: 0 };
  // keep the free heel at least 5 cm above the floor (up to 8 degrees below the working thigh)
  for (let k = 0; k < 60 && H.bottomOf(L.fk(q, contacts), 'foot_l') < 5 && q.ch.hip_l.flex < q.ch.hip_r.flex - 8; k++) q.ch.hip_l.flex = r1(q.ch.hip_l.flex + 1);
  return q;
}
let TH = 10;
const barAt = (W) => F.hipBarCentre(W, { gw: GW, plateR: PLATE_D / 2, th: TH, thW: 0.4 });
// bottom: hips drop until the plates reach the floor or the buttocks are 7 cm off it, whichever comes first
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
lo = P_TOP - 70; hi = P_TOP;
let P_BOT = P_TOP;
for (let i = 0; i < 30; i++) { P_BOT = (lo + hi) / 2; const W = L.fk(legs(P_BOT), contacts); TH = 10; if (barAt(W).onPlates || buttY(W) < 7) lo = P_BOT; else hi = P_BOT; }
P_BOT = r1(hi);
let seed = null, worst = 0;
const info = {}, cache = {};
// keys from the top down (the bar-direction preference follows the previous key, so the bar slides smoothly into the crease)
function poseAt(f) {
  if (cache[f]) return cache[f];
  const q = legs(P_BOT + (P_TOP - P_BOT) * f), W = L.fk(q, contacts), b = barAt(W); TH = b.th;
  const a = F.hipBarArms(q, contacts, b.c, GW, { seed }); seed = a.seed; worst = Math.max(worst, a.err);
  a.pose.ik = { leg_r: { target: FOOT.slice(), weight: 1 } };
  info[f] = { gap: +b.gap.toFixed(2), th: b.th, onPlates: b.onPlates, err: +a.err.toFixed(2), c: b.c.map(r1) };
  return (cache[f] = a.pose);
}
const FS = [1.015, 1, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0.02, 0];
for (const f of FS) poseAt(f);
const poses = { bottom: poseAt(0), top: poseAt(1), squeeze: poseAt(1.015), low: poseAt(0.02) };
for (const f of FS.slice(2, -2)) poses[`k${Math.round(f * 1000)}`] = poseAt(f);
const up = FS.slice(2, -2).reverse(); // 0.125 ... 0.875
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }];
up.forEach((f) => keyframes.push({ t: +(0.8 + 1.2 * f).toFixed(3), pose: `k${Math.round(f * 1000)}` }));
keyframes.push({ t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' });
up.slice().reverse().forEach((f) => keyframes.push({ t: +(2.8 + 2.0 * (1 - f)).toFixed(3), pose: `k${Math.round(f * 1000)}` }));
keyframes.push({ t: 4.8, pose: 'low' }, { t: 5.3, pose: 'bottom' }, { t: 6.0, pose: 'bottom' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [{ id: 'bench', kind: 'bench', center: [r1(EDGE[0] - BENCH_D / 2), 0, 0], size: [BENCH_D, BENCH_H, 150] }, BB.barbellProp({ plateD: PLATE_D })];
let pivot = 0, freeFoot = 1e9;
const sw = BB.sweep(ex, { skip: F.HIPSKIP, probe: (W) => { freeFoot = Math.min(freeFoot, H.bottomOf(W, 'foot_l')); pivot = Math.max(pivot, V.len(V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE))); } });
const rep = H.loopReport(ex, { planted: ['leg_r'] });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench height', 'setup', `${BENCH_H} cm`); set('Bench height', 'peak', 'Upper back pivots on the bench edge');
set('Working hip flexion', 'setup', `${d(poses.bottom.ch.hip_r.flex)} at the bottom (plates on the floor)`); set('Working hip flexion', 'peak', `${d(poses.top.ch.hip_r.flex)} at the top`);
set('Working knee flexion', 'setup', `${d(H.kneeOf(Wb, 'r'))} at the bottom`); set('Working knee flexion', 'peak', `${d(H.kneeOf(Wt, 'r'))} (shin vertical)`);
set('Trunk inclination', 'setup', `${d(-trunkTilt(Wb))} (hips below the shoulders)`); set('Trunk inclination', 'peak', `${d(Math.abs(trunkTilt(Wt)))} (level)`);
set('Bar position', 'setup', `Across the hip crease, ${GW} cm overhand grip, ${PLATE_D} cm plates resting on the floor at the bottom`); set('Bar position', 'peak', `Rides on the hips (shaft ${info[1].gap} cm off the body at the top), ${r1(Wt.pelvis.p[1] - Wb.pelvis.p[1])} cm of hip travel`);
set('Tempo', 'setup', 'Hips down 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.8 s squeeze, 2.0 s down, 1.2 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
const lim = S5.limits(ex);
console.log(`Barbell One Leg Hip Thrust: pitch ${P_BOT}..${P_TOP}, foot ${FOOT}, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify(sw)} pivotErr ${pivot.toFixed(2)} freeFoot ${r1(freeFoot)} gripErr ${worst.toFixed(2)} limits ${JSON.stringify(lim)}\n  bar ${JSON.stringify(info)}`);
const bad = [];
if (sw.widthRange > 1.0 || worst > 0.5) bad.push('grip width');
if (sw.barFloor < -0.1 || sw.barBody < -0.3) bad.push(`bar collision ${JSON.stringify(sw.barBodyAt)}`);
if (rep.slide > 0.05) bad.push('planted foot slides');
if (rep.floor < -0.5 || freeFoot < 0) bad.push('through the floor');
if (Object.keys(lim).length) bad.push('joint limits');
if (bad.length) { console.error(`FAIL barbell-one-leg-hip-thrust: ${bad.join('; ')}`); process.exitCode = 1; }
