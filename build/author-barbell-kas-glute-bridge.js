// Barbell KAS Glute Bridge (GymVisual #23642 "Barbell KAS Glute Bridge (male)"; page not readable here, movement from the
// name and standard coaching): the Kas glute bridge, a short-range hip thrust. Upper back across the edge of a 42 cm bench
// (resting a little higher on the back than in a hip thrust), feet flat about hip width with the knees above the ankles at the
// top, a barbell across the hip crease held overhand outside the hips (68 cm between the hands). The trunk barely moves on the
// bench: the hips travel only from a little below level to level (about 20 degrees of trunk pivot on the edge), finishing with
// the pelvis tucked (posterior tilt) and a squeeze; the bar never returns to the floor. The bar sits on the front of the hips
// (b6-01 hipBarCentre) and both arms are solved onto it at every key (barbell.js armsOnBar, mirrored). Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const F = require('./families/b6-01');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-kas-glute-bridge.json');

const BENCH_H = 42, BENCH_D = 36, GW = 68, PLATE_D = 45;
const EDGE = [0, BENCH_H, 0];
const CHEST = rig.shapes.find((x) => x.id === 'chest');
const BACK_PT = [r1(CHEST.c[0] - CHEST.r[0] * Math.sqrt(1 - ((8 - CHEST.c[1]) / CHEST.r[1]) ** 2)), 8, 0]; // higher on the back than a hip thrust
const base = (() => { const p = H.lieBase(); p.root.pos = [40, 50, 0]; Object.assign(p.ch, { spine_l5: { rot: 0, flex: -3, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 3, latFlex: 0 } }); p.ch.sc_r = { protract: 4, elevate: 2 }; p.ch.sc_l = { protract: 4, elevate: 2 }; return p; })();
function trunk(pitch, l5 = null) {
  const p = clone(base); p.root.rot = { pitch: r1(pitch) }; if (l5 != null) p.ch.spine_l5 = { rot: 0, flex: l5, latFlex: 0 };
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE).map((v) => v * 3)]).pose;
  const tilt = pitch - 90; // chin tucked: eyes toward the knees at the top, head in line with the trunk lower down
  s.ch.neck_c7 = { rot: 0, flex: r1(18 + 0.15 * tilt) }; s.ch.head_c1 = { rot: 0, flex: r1(12 + 0.1 * tilt) };
  return s;
}
const trunkTilt = (W) => Math.atan2(W.hip_r.p[1] - W.shoulder_r.p[1], W.hip_r.p[0] - W.shoulder_r.p[0]) / R.DEG;
let lo = 60, hi = 120, P_TOP = 90;
for (let i = 0; i < 40; i++) { P_TOP = (lo + hi) / 2; if (trunkTilt(L.fk(trunk(P_TOP))) < 0) lo = P_TOP; else hi = P_TOP; }
P_TOP = r1(P_TOP);
const STANCE = 13, RANGE = 20;
const contacts = [H.legC('r', { pole: [1, 0.3, 0.15] }), H.legC('l', { pole: [1, 0.3, -0.15] })];
const Wtop = L.fk(trunk(P_TOP));
const FOOT = (() => { let a = Wtop.hip_r.p[0] + 20, b = Wtop.hip_r.p[0] + 60, x = 0; for (let i = 0; i < 40; i++) { x = (a + b) / 2; const p = trunk(P_TOP); p.ik = { leg_r: { target: [x, L.ANKLE_H, STANCE], weight: 1 } }; if (H.kneeOf(L.fk(p, [contacts[0]]), 'r') > 90) a = x; else b = x; } return [r1(x), L.ANKLE_H, STANCE]; })();
const FOOT_L = [FOOT[0], FOOT[1], -STANCE];
// pelvis tucks (posterior tilt) toward the top: low back flexes a little, as the Kas bridge is coached
function legs(pitch) {
  const g = Math.max(0, Math.min(1, (pitch - (P_TOP - RANGE)) / RANGE)), p = trunk(pitch, r1(-3 + 5 * g));
  p.ik = { leg_r: { target: FOOT.slice(), weight: 1 }, leg_l: { target: FOOT_L.slice(), weight: 1 } };
  let q = H.fitLeg(p, 'r', contacts[0], FOOT); q = H.fitLeg(q, 'l', contacts[1], FOOT_L);
  return q;
}
let TH = 10;
const barAt = (W) => F.hipBarCentre(W, { gw: GW, plateR: PLATE_D / 2, th: TH, thW: 0.4 });
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
const P_BOT = r1(P_TOP - RANGE); // short range: hips a little below level
let seed = null, worst = 0;
const info = {}, cache = {};
// keys from the top down (the bar-direction preference follows the previous key, so the bar slides smoothly into the crease)
function poseAt(f) {
  if (cache[f]) return cache[f];
  const q = legs(P_BOT + (P_TOP - P_BOT) * f), W = L.fk(q, contacts), b = barAt(W); TH = b.th;
  const a = F.hipBarArms(q, contacts, b.c, GW, { seed }); seed = a.seed; worst = Math.max(worst, a.err);
  a.pose.ik = { leg_r: { target: FOOT.slice(), weight: 1 }, leg_l: { target: FOOT_L.slice(), weight: 1 } };
  info[f] = { gap: +b.gap.toFixed(2), th: b.th, onPlates: b.onPlates, err: +a.err.toFixed(2), c: b.c.map(r1) };
  return (cache[f] = a.pose);
}
const FS = [1.015, 1, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0.02, 0];
for (const f of FS) poseAt(f);
const poses = { bottom: poseAt(0), top: poseAt(1), squeeze: poseAt(1.015), low: poseAt(0.02) };
for (const f of FS.slice(2, -2)) poses[`k${Math.round(f * 1000)}`] = poseAt(f);
const up = FS.slice(2, -2).reverse(); // 0.125 ... 0.875
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.6, pose: 'bottom' }];
up.forEach((f) => keyframes.push({ t: +(0.6 + 1.0 * f).toFixed(3), pose: `k${Math.round(f * 1000)}` }));
keyframes.push({ t: 1.6, pose: 'top' }, { t: 2.0, pose: 'squeeze' }, { t: 2.4, pose: 'top' });
up.slice().reverse().forEach((f) => keyframes.push({ t: +(2.4 + 1.5 * (1 - f)).toFixed(3), pose: `k${Math.round(f * 1000)}` }));
keyframes.push({ t: 3.75, pose: 'low' }, { t: 3.9, pose: 'bottom' }, { t: 4.5, pose: 'bottom' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [{ id: 'bench', kind: 'bench', center: [r1(EDGE[0] - BENCH_D / 2), 0, 0], size: [BENCH_D, BENCH_H, 150] }, BB.barbellProp({ plateD: PLATE_D })];
let pivot = 0, freeFoot = 1e9, buttMin = 1e9;
const sw = BB.sweep(ex, { skip: F.HIPSKIP, probe: (W) => { buttMin = Math.min(buttMin, buttY(W)); pivot = Math.max(pivot, V.len(V.sub(V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BACK_PT)), EDGE))); } });
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench height', 'setup', `${BENCH_H} cm`); set('Bench height', 'peak', 'Upper back (just below the shoulder blades) pivots on the edge through about 20°');
set('Hip flexion', 'setup', `${d(poses.bottom.ch.hip_r.flex)} at the bottom of the short range (buttocks ${r1(buttMin)} cm off the floor)`); set('Hip flexion', 'peak', `${d(poses.top.ch.hip_r.flex)} at the top, pelvis tucked`);
set('Knee flexion', 'setup', `${d(H.kneeOf(Wb, 'r'))} at the bottom`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wt, 'r'))} (knees over the ankles); feet ${2 * STANCE} cm apart`);
set('Trunk inclination', 'setup', `${d(-trunkTilt(Wb))} below level`); set('Trunk inclination', 'peak', `${d(Math.abs(trunkTilt(Wt)))} (level)`);
set('Bar position', 'setup', `Across the hip crease, ${GW} cm overhand grip; plates ${sw.barFloor} cm or more off the floor`); set('Bar position', 'peak', `Rides on the hips, ${r1(Wt.pelvis.p[1] - Wb.pelvis.p[1])} cm of hip travel`);
set('Tempo', 'setup', 'Hips a little below level 0.6 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s squeeze, 1.5 s down, 0.6 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
const lim = S5.limits(ex);
console.log(`Barbell KAS Glute Bridge: pitch ${P_BOT}..${P_TOP}, foot ${FOOT}, wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify(sw)} pivotErr ${pivot.toFixed(2)} buttMin ${r1(buttMin)} gripErr ${worst.toFixed(2)} limits ${JSON.stringify(lim)}\n  bar ${JSON.stringify(info)}`);
const bad = [];
if (sw.widthRange > 1.0 || worst > 0.5) bad.push('grip width');
if (sw.barFloor < -0.1 || sw.barBody < -0.3) bad.push(`bar collision ${JSON.stringify(sw.barBodyAt)}`);
if (rep.slide > 0.05) bad.push('planted foot slides');
if (rep.floor < -0.5) bad.push('through the floor');
if (Object.keys(lim).length) bad.push('joint limits');
if (bad.length) { console.error(`FAIL barbell-kas-glute-bridge: ${bad.join('; ')}`); process.exitCode = 1; }
