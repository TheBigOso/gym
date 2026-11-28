// Dumbbell Glute Bridge Chest Press (GymVisual "Dumbbell Glute Bridge Chest Press", movement reference only): supine on a
// mat, knees bent, feet flat and hip width (planted leg contacts), a dumbbell in each hand at the chest with the backs of
// the upper arms on the floor (elbows about 45 degrees from the trunk, forearms vertical, palms toward the feet). Drive the
// hips up into a glute bridge until knees, hips and shoulders form one line; hold the bridge and press the dumbbells straight
// up over the shoulders, pause, lower them until the upper arms touch the floor again, then lower the hips. Bilateral.
// Body: the glute bridge roll (upper back pivots on the mat, head resting just off it). Arms: the floor press path
// (b3-chest pressPath, the bottom depth solved per key so the upper arms rest on the floor).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/b3-chest');
const B = require('./families/b4-floorpush');
const G = require('./families/b6-03');
const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
const meta = require('./meta/dumbbell-glute-bridge-chest-press.json');

const lie = H.lieBase();
const W0 = L.fk(lie), SX = W0.shoulder_r.p[0], P0 = lie.root.rot.pitch, L5 = lie.ch.spine_l5.flex;
// trunk for a pelvis roll dP (as in the glute bridge): upper back stays on the mat, head resting
function trunk(dP, l5) {
  const p = clone(lie); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(l5);
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
    (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, Math.min(0, H.bottomOf(W, 'thigh_r') - 0.05) * 8, (W.shoulder_r.p[0] - SX) * 2],
    (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
}
const l5At = (f) => L5 + (0 - L5) * f;
const sagBelow = (W) => { const a = W.shoulder_r.p, k = W.knee_r.p, h = W.hip_r.p, d = V.norm([k[0] - a[0], k[1] - a[1], 0]); return -((h[0] - a[0]) * -d[1] + (h[1] - a[1]) * d[0]); };
const Z_FOOT = 10;
const contacts = [H.legC('r', { pole: [0.15, 1, 0.04] }), H.legC('l', { pole: [0.15, 1, -0.04] })];
const withFeet = (p, ax) => { const q = clone(p); q.ik = { leg_r: { target: [ax, L.ANKLE_H, Z_FOOT], weight: 1 }, leg_l: { target: [ax, L.ANKLE_H, -Z_FOOT], weight: 1 } }; return q; };
function topFor(ax) { let lo = 5, hi = 70; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, W = L.fk(withFeet(trunk(m, l5At(1)), ax), contacts); if (sagBelow(W) > 0) lo = m; else hi = m; } return r1((lo + hi) / 2); }
let a = 30, b = 60, AX = 45, DP_TOP = 0;
for (let i = 0; i < 25; i++) { AX = (a + b) / 2; DP_TOP = topFor(AX); const W = L.fk(withFeet(trunk(DP_TOP, l5At(1)), AX), contacts); if (H.kneeOf(W, 'r') > 90) a = AX; else b = AX; }
AX = r1(AX); DP_TOP = topFor(AX);
function body(f) {
  let p = withFeet(trunk(DP_TOP * f, l5At(f)), AX);
  p.ch.sc_r = clone(C.SC); p.ch.sc_l = clone(C.SC);
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target);
  return p;
}
// arms: floor press path in the trunk frame; the bottom (f = 0) depth puts the upper-arm shapes on the floor
const FLARE = 45, TOP = [0.03, 1, 0.12];
const axOf = (p) => V.scale(C.trunkFrame(L.fk(p, contacts)).w, -1);
const dipFor = (p) => r1(B.bisect((dip) => B.armMinY(L.fk(C.pressPath(p, { flare: FLARE, dip, topDir: TOP, ax: axOf(p), n: 1 })[0].pose, contacts)) - 0.05, 0, 65));
const fin = (q) => { const o = C.strip(q); C.mirrorArm(o); return G.posElev(o); };
const bottomArms = (p) => { const dip = dipFor(p); return { pose: fin(C.pressPath(p, { flare: FLARE, dip, topDir: TOP, ax: axOf(p), n: 1 })[0].pose), dip }; };
const poses = {}, dips = {};
for (const [n, f] of [['lie', 0], ['u25', 0.25], ['u50', 0.5], ['u75', 0.75]]) { const r = bottomArms(body(f)); poses[n] = r.pose; dips[n] = r.dip; }
const top = body(1), DIP = dipFor(top);
const path = C.pressPath(top, { flare: FLARE, dip: DIP, topDir: TOP, ax: axOf(top), n: 6 }).map((k) => fin(k.pose));
path.forEach((q, i) => { poses[`p${i}`] = q; });
poses.pHold = clone(poses.p6); poses.pHold.ch.elbow_r.flex = poses.pHold.ch.elbow_l.flex = r1(poses.p6.ch.elbow_r.flex + 2);
dips.top = DIP;
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.15, pose: 'u25' }, { t: 1.5, pose: 'u50' }, { t: 1.8, pose: 'u75' }, { t: 2.1, pose: 'p0' }, { t: 2.4, pose: 'p0' }];
for (let i = 1; i <= 6; i++) keyframes.push({ t: +(2.4 + 1.1 * i / 6).toFixed(3), pose: `p${i}` });
keyframes.push({ t: 3.85, pose: 'pHold' });
for (let i = 5; i >= 0; i--) keyframes.push({ t: +(3.85 + 1.5 * (6 - i) / 6).toFixed(3), pose: `p${i}` });
keyframes.push({ t: 5.65, pose: 'u75' }, { t: 6.0, pose: 'u50' }, { t: 6.35, pose: 'u25' }, { t: 6.7, pose: 'lie' }, { t: 7.2, pose: 'lie' });
const ex = H.module_(meta, contacts, poses, keyframes);
const sw = B.floorSweep(ex, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }] });
const jump = require('./families/b4-power').jumps(ex), lim = G.limits(ex);
let headMin = 1e9; const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { headMin = Math.min(headMin, H.bottomOf(W, 'hair')); } });
const Wl = L.fk(poses.lie, contacts), Wt = L.fk(poses.p0, contacts), Wp = L.fk(poses.p6, contacts);
const lineAt = (W) => { const xy = (v) => [v[0], v[1], 0]; return V.angle(xy(V.sub(W.knee_r.p, W.hip_r.p)), xy(V.sub(W.shoulder_r.p, W.hip_r.p))); };
const set = G.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Hip extension', 'setup', `Hip ${d(poses.lie.ch.hip_r.flex)} flexed lying`); set('Hip extension', 'peak', `Hip ${d(poses.p0.ch.hip_r.flex)} in the bridge (knee-hip-shoulder line ${d(lineAt(Wt))}), hip joint ${r1(Wt.hip_r.p[1])} cm up (+${r1(Wt.hip_r.p[1] - Wl.hip_r.p[1])} cm)`);
set('Knee flexion', 'setup', `${d(H.kneeOf(Wl, 'r'))}`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wt, 'r'))} in the bridge (shins about vertical)`);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} with the upper arms on the floor`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wp))} at the top (arms straight, not locked)`);
set('Elbow flare', 'setup', `${d(C.elbowFlare(Wt))} from the trunk at the bottom`); set('Elbow flare', 'peak', 'Arms vertical over the shoulders');
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.3 s bridge up, 0.3 s settle, 1.1 s press, 0.35 s hold, 1.5 s lower, 1.05 s hips down, 0.5 s rest');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Dumbbell Glute Bridge Chest Press: feet x ${AX}, roll ${DP_TOP}°, dips ${JSON.stringify(dips)} wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)}\n  ${JSON.stringify(rep)} headMin ${headMin.toFixed(2)} jump ${JSON.stringify(jump)} limits ${JSON.stringify(lim)} travel ${r1(travel)}`);
if (sw.slide > 0.05 || rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (sw.floor < -0.5 || sw.dbFloor < 0 || sw.dbBody > 0.5 || (sw.dbGap && sw.dbGap[0] < 1)) { console.error('FAIL: floor or dumbbell collision'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
