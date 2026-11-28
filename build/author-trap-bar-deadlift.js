// Trap Bar Deadlift (GymVisual #2293 / #960, "Trap Bar Deadlift"; page not readable here, movement from the name and
// standard coaching): standing inside a hex (trap) bar, feet about hip width (planted), neutral grip on the side handles
// (62 cm between the handle centres, thumbs forward, palms facing the body). The rep starts with the plates resting on the
// floor: hips back and down, knees bent more than in a straight-bar deadlift, chest up, flat back, arms straight. Drive
// through the floor to stand tall, then hinge and bend the knees to set the plates back down. The load sits beside the
// body, so the trunk stays more upright and the knees bend more than with a straight bar (Swinton 2011). The root is
// balanced so the body + bar centre of mass sits over mid-foot (b3-back.js hinge); arms hang straight to the handles
// (gear-bars.js armTo, handle axis fore-aft). Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const C = require('./families/b3-curls');
const H = require('./families/hips');
const G = require('./families/gear-bars');
const meta = require('./meta/trap-bar-deadlift.json');

const F = makeFamily({ toe: 8, half: 11 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const bar = G.trapProp({ width: G.TRAP.width, plates: 1, plateD: 45 });
const HW = bar.params.width / 2, KG = 35;                 // 70 kg on the bar (35 kg per hand for balance)
const KNEE_TOP = 4, KNEE_B = +(process.env.KB ?? 98), FLOOR = 0.3;
// straight-arm reach from the shoulder to the handle point (neutral grip, elbow 4 degrees)
const reach = (() => { const q = clone(F.pose({ root: [0, 95, 0], pitch: 0, feet })); C.setArm(q, 'r', { plane: 0, elev: 0.01, axial: 0, flex: 4, pron: 90 }); const W = L.fk(q); return V.len(V.sub(G.handFrame(W, 'r').p, W.shoulder_r.p)) - 0.3; })();
let gripWorst = 0, guess = null;
// arms straight down to the handles: handle under the shoulder (x), at z = +-HW, at the height a straight arm reaches
const arms = (p) => {
  const S = L.fk(p, F.contacts).shoulder_r.p, dz = HW - S[2], y = S[1] - Math.sqrt(reach * reach - dz * dz), g = [S[0], y, HW];
  const q = G.armTo(p, g, { grip: 'handle', axis: [1, 0, 0], thumb: [1, 0, 0], palm: [0, 0, -1], wDir: 1, guesses: guess ? [guess, [10, 15, 0, 5, 90]] : [[10, 15, 0, 5, 90], [60, 30, 0, 5, 90], [80, 60, 0, 5, 90]], extra: [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3]], mirror: true });
  gripWorst = Math.max(gripWorst, q.__err); guess = G.guessOf(q); delete q.__err; delete q.__cost;
  return q;
};
function hinge(pitch, knee, g) {
  return B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, sc: { protract: r1(6 * g), elevate: r1(-2 - 4 * g) }, kg: KG, midfoot: 5, arms });
}
// bottom: the pelvis pitch that sets the plates on the floor at the bottom knee angle
let pa = -10, pb = -60;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (G.trapMinY(r.W, bar.params) > FLOOR) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) { // f = 0 floor ... 1 lockout: knees and hips extend together (the bar rises straight up beside the legs)
  const gk = 1 - Math.pow(1 - f, 1.4), gp = Math.pow(f, 1.2);
  return hinge(PITCH_B * (1 - gp), KNEE_B + (KNEE_TOP - KNEE_B) * gk, 1 - f).pose;
}
const FS = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1], poses = {};
FS.forEach((f, i) => { poses[`p${i}`] = at(f); });
const N = FS.length - 1;
const ph = meta.timeline.phases, T0 = ph[0].end, T1 = ph[1].end, T2 = ph[2].end, T3 = ph[3].end, D = meta.timeline.duration;
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const keyframes = [{ t: 0, pose: 'p0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `p${i}` }));
keyframes.push({ t: T2, pose: `p${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `p${i}` });
keyframes.push({ t: D, pose: 'p0' });

const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [bar];
// loop sweep: feet, floor, grip width, frame / plates vs the body and the floor, bar level, bar path
const tl = L.R.buildTimeline(ex), sw = B.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] }, 600);
const tb = { width: [1e9, -1e9], clear: { d: 1e9 }, floor: 1e9, tilt: 0, x: [1e9, -1e9] };
for (let i = 0; i <= 300; i++) {
  const t = (i / 300) * D, W = L.R.evalPose(L.rig, tl.pose(t), ex.contacts), f = G.trapAt(W);
  tb.width = [Math.min(tb.width[0], f.width), Math.max(tb.width[1], f.width)]; tb.x = [Math.min(tb.x[0], f.c[0]), Math.max(tb.x[1], f.c[0])];
  const c = G.trapClear(W, bar.params); if (c.d < tb.clear.d) tb.clear = { ...c, d: r1(c.d), t: +t.toFixed(2) };
  tb.floor = Math.min(tb.floor, G.trapMinY(W, bar.params)); tb.tilt = Math.max(tb.tilt, f.tilt);
}
const Wb = F.fk(poses.p0), Wt = F.fk(poses[`p${N}`]), fb = G.trapAt(Wb), ft = G.trapAt(Wt), pB = poses.p0;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Knee flexion', 'setup', `${d(B.kneeOf(Wb, 'r'))} with the plates on the floor`); set('Knee flexion', 'peak', `${d(B.kneeOf(Wt, 'r'))} at lockout`);
set('Hip flexion', 'setup', `${d(pB.ch.hip_r.flex)} (joint channel); hips ${r1(Wb.hip_r.p[1])} cm high, knees ${r1(Wb.knee_r.p[1])} cm`); set('Hip flexion', 'peak', `${d(poses[`p${N}`].ch.hip_r.flex)} at lockout`);
set('Trunk inclination', 'setup', `${d(B.trunkLean(Wb))} from vertical, back flat`); set('Trunk inclination', 'peak', `${d(B.trunkLean(Wt))} at lockout`);
set('Bar path', 'setup', `Handles ${r1(fb.c[0] - 5)} cm from mid-foot, ${r1(fb.c[1])} cm high; ${bar.params.width} cm between the handle centres`);
set('Bar path', 'peak', `Handles travel ${r1(tb.x[1] - tb.x[0])} cm fore-aft; lockout height ${r1(ft.c[1])} cm; frame at least ${tb.clear.d} cm off the legs`);
set('Tempo', 'setup', `Set up ${T0} s`); set('Tempo', 'peak', `${r1(T1 - T0)} s up, ${r1(T2 - T1)} s lockout, ${r1(T3 - T2)} s down, ${r1(D - T3)} s reset on the floor`);
console.log(`Trap Bar Deadlift: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${pB.ch.hip_r.flex}, gripErr ${gripWorst.toFixed(2)}, handles ${fb.c.map(r1)} -> ${ft.c.map(r1)}\n  trap ${JSON.stringify({ ...tb, width: tb.width.map(r1), x: tb.x.map(r1), floor: r1(tb.floor), tilt: r1(tb.tilt) })}\n  sweep ${JSON.stringify({ floor: sw.floor, slide: sw.slide, drift: sw.drift })}`);
const fails = [];
if (tb.width[1] - tb.width[0] > 1.0 || gripWorst > 0.6) fails.push('hands do not stay on the handles');
if (tb.floor < -0.05) fails.push('plates through the floor');
if (tb.clear.d < 0) fails.push(`trap bar into the body (${tb.clear.id} ${tb.clear.what} at ${tb.clear.t}s)`);
if (tb.tilt > 2) fails.push(`bar tilts ${tb.tilt.toFixed(1)} deg`);
if (sw.slide > 0.05 || sw.drift > 0.05) fails.push('planted feet move');
if (sw.floor < -0.5) fails.push('body through the floor');
if (pB.ch.hip_r.flex > 139) fails.push('hip flexion at the rig limit');
if (fails.length) { console.error(`FAIL trap-bar-deadlift: ${fails.join('; ')}`); process.exitCode = 1; }
