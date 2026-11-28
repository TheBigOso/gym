// Barbell Glute Bridge (hands on bar) (GymVisual #13813; page not readable here, movement from the name and standard
// coaching): supine on a mat, knees bent, feet flat and hip width (planted leg contacts), a barbell with 45 cm plates rolled
// over the hip crease and held there with both hands overhand just outside the hips (68 cm between the hands). The pelvis
// rolls up about the upper back (as in the bodyweight glute bridge: the upper back and head stay on the mat) until knees,
// hips and shoulders form one line (about 1.2 s), a 0.8 s squeeze, 2 s down. Lying, the hip crease is below the plate
// radius, so the bar rests on the plates just above the hips; as the hips rise they pick it up and it rides on the hip crease
// (b6-01 hipBarCentre). Both arms are solved onto the bar at every key (barbell.js armsOnBar, mirrored). Bilateral.
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const BB = require('./families/barbell');
const F = require('./families/b6-01');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-glute-bridge-hands-on-bar.json');

const GW = 68, PLATE_D = 45;
const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
const lie = H.lieBase();
const W0 = L.fk(lie), SX = W0.shoulder_r.p[0], P0 = lie.root.rot.pitch, L5 = lie.ch.spine_l5.flex;
// trunk for a pelvis roll dP (deg): upper back stays on the mat (shoulders keep their x), head resting (bodyweight glute bridge)
function trunk(dP, l5) {
  const p = clone(lie); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(l5);
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
    (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, Math.min(0, H.bottomOf(W, 'thigh_r') - 0.05) * 8, (W.shoulder_r.p[0] - SX) * 2],
    (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
}
const l5At = (f) => L5 + (0 - L5) * f;
const xy = (v) => [v[0], v[1], 0];
const lineAt = (W) => V.angle(xy(V.sub(W.knee_r.p, W.hip_r.p)), xy(V.sub(W.shoulder_r.p, W.hip_r.p)));
const sagBelow = (W) => { const a = W.shoulder_r.p, k = W.knee_r.p, h = W.hip_r.p, d = V.norm([k[0] - a[0], k[1] - a[1], 0]); return -((h[0] - a[0]) * -d[1] + (h[1] - a[1]) * d[0]); };
const Z_FOOT = 11;
const contacts = [H.legC('r', { pole: [0.15, 1, 0.04] }), H.legC('l', { pole: [0.15, 1, -0.04] })];
const withFeet = (p, ax) => { const q = clone(p); q.ik = { leg_r: { target: [ax, L.ANKLE_H, Z_FOOT], weight: 1 }, leg_l: { target: [ax, L.ANKLE_H, -Z_FOOT], weight: 1 } }; return q; };
function topFor(ax) { let lo = 5, hi = 70; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, W = L.fk(withFeet(trunk(m, l5At(1)), ax), contacts); if (sagBelow(W) > 0) lo = m; else hi = m; } return r1((lo + hi) / 2); }
let a = 30, b = 60, AX = 45, DP_TOP = 0;
for (let i = 0; i < 25; i++) { AX = (a + b) / 2; DP_TOP = topFor(AX); const W = L.fk(withFeet(trunk(DP_TOP, l5At(1)), AX), contacts); if (H.kneeOf(W, 'r') > 90) a = AX; else b = AX; }
AX = r1(AX); DP_TOP = topFor(AX);
let seed = null, worst = 0, TH = 10;
const info = {}, cache = {};
function poseAt(f) {
  if (cache[f]) return cache[f];
  let p = withFeet(trunk(DP_TOP * f, l5At(f)), AX);
  p.ch.sc_r = { protract: 2, elevate: 0 }; p.ch.sc_l = { protract: 2, elevate: 0 };
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  const bar = F.hipBarCentre(L.fk(p, contacts), { gw: GW, plateR: PLATE_D / 2, th: TH, thW: 0.4 }); TH = bar.th;
  const arm = F.hipBarArms(p, contacts, bar.c, GW, { seed }); seed = arm.seed; worst = Math.max(worst, arm.err);
  arm.pose.ik = clone(p.ik);
  info[f] = { gap: +bar.gap.toFixed(2), onPlates: bar.onPlates, th: bar.th, err: +arm.err.toFixed(2), c: bar.c.map(r1) };
  return (cache[f] = arm.pose);
}
const FS = [1.02, 1, 0.875, 0.75, 0.625, 0.5, 0.375, 0.25, 0.125, 0.03, 0];
for (const f of FS) poseAt(f);
const poses = { lie: poseAt(0), top: poseAt(1), squeeze: poseAt(1.02), touch: poseAt(0.03) };
const mid = FS.slice(2, -2).reverse();
for (const f of mid) poses[`k${Math.round(f * 1000)}`] = poseAt(f);
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }];
mid.forEach((f) => keyframes.push({ t: +(0.8 + 1.2 * f).toFixed(3), pose: `k${Math.round(f * 1000)}` }));
keyframes.push({ t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' });
mid.slice().reverse().forEach((f) => keyframes.push({ t: +(2.8 + 2.0 * (1 - f)).toFixed(3), pose: `k${Math.round(f * 1000)}` }));
keyframes.push({ t: 5.0, pose: 'touch' }, { t: 5.3, pose: 'lie' }, { t: 6.0, pose: 'lie' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [...(meta.props || []), BB.barbellProp({ plateD: PLATE_D })];
let shX = [1e9, -1e9], headMin = 1e9;
const sw = BB.sweep(ex, { skip: F.HIPSKIP, probe: (W) => { shX = [Math.min(shX[0], W.shoulder_r.p[0]), Math.max(shX[1], W.shoulder_r.p[0])]; headMin = Math.min(headMin, H.bottomOf(W, 'hair')); } });
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
const Wl = L.fk(poses.lie, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Hip flexion', 'setup', `${d(poses.lie.ch.hip_r.flex)} (lying)`); set('Hip flexion', 'peak', `${d(poses.top.ch.hip_r.flex)} (knee-hip-shoulder line ${Math.round(lineAt(Wt))}°)`);
set('Knee flexion', 'setup', d(H.kneeOf(Wl, 'r'))); set('Knee flexion', 'peak', `${d(H.kneeOf(Wt, 'r'))} (shins about vertical)`);
set('Hip lift', 'setup', `Hip joints ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip lift', 'peak', `${r1(Wt.hip_r.p[1])} cm (+${r1(Wt.hip_r.p[1] - Wl.hip_r.p[1])} cm)`);
set('Bar position', 'setup', `${GW} cm overhand grip; lying, the bar rests on the ${PLATE_D} cm plates just above the hip crease`); set('Bar position', 'peak', `Rides on the hip crease at the top (shaft ${info[1].gap} cm off the body)`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.8 s squeeze, 2.0 s down, 1.0 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
const lim = S5.limits(ex);
console.log(`Barbell Glute Bridge (hands on bar): feet x ${AX}, roll ${DP_TOP}° wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify(sw)} gripErr ${worst.toFixed(2)} shoulderX ${shX.map(r1)} headMin ${headMin.toFixed(2)} limits ${JSON.stringify(lim)}\n  bar ${JSON.stringify(info)}`);
const bad = [];
if (sw.widthRange > 1.0 || worst > 0.5) bad.push('grip width');
if (sw.barFloor < -0.1 || sw.barBody < -0.3) bad.push(`bar collision ${JSON.stringify(sw.barBodyAt)}`);
if (rep.slide > 0.05) bad.push('planted foot slides');
if (rep.floor < -0.5) bad.push('through the floor');
if (Object.keys(lim).length) bad.push('joint limits');
if (bad.length) { console.error(`FAIL barbell-glute-bridge-hands-on-bar: ${bad.join('; ')}`); process.exitCode = 1; }
