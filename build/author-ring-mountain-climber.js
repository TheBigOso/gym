// Ring Mountain Climber (GymVisual #15623; page not readable here, movement from the name and standard coaching): feet in
// suspension foot cradles (one strap per foot; src/gear/g3-bars.js 'cradle'), hands planted under the shoulders in a
// high plank with the feet about 50 cm off the floor. Drive the right knee in toward the chest, the right foot riding
// forward in its strap, return it, then drive the left knee in. The trunk stays level; the resting leg stays straight.
// The driving leg's hip and knee are solved so its cradle stays on its strap sphere (gear-g3-bars.js ringPlank /
// solveLeg). Alternating; both sides authored in one loop.
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/ring-mountain-climber.json');

const ID = 'ring-mountain-climber', ENV = (k, d) => +(process.env[k] ?? d);
const RP = X.ringPlank({ hc: ENV('HC', 48), d: ENV('D', 12) });
const DX = ENV('DX', 50);
const base = RP.solveKey({ legs: { r: { hip: 0 }, l: { hip: 0 } }, offX: 0, sc: { protract: 8, elevate: 2 } });
delete base.__cost;
const poses = { plank: base }, err = {};
for (const sd of ['r', 'l']) {
  let prev = base;
  [0.5, 1].forEach((f, i) => { const q = RP.solveLeg(prev, sd, { dx: DX * f, hip0: 55 * f + 45 * f * f, knee0: 60 * f + 50 * f * f }); err[`${sd}${i}`] = +q.__cost.toFixed(4); delete q.__cost; poses[`${sd}${i + 1}`] = q; prev = q; });
}
const ph = (id) => meta.timeline.phases.find((p) => p.id === id), D = meta.timeline.duration;
const seg = (id, sd) => { const a = ph(id).start, b = ph(id).end, m = (a + b) / 2; return [{ t: +(a + (m - a) * 0.5).toFixed(3), pose: `${sd}1` }, { t: +m.toFixed(3), pose: `${sd}2` }, { t: +(m + (b - m) * 0.5).toFixed(3), pose: `${sd}1` }, { t: b, pose: 'plank' }]; };
const keyframes = [{ t: 0, pose: 'plank' }, { t: ph('setup').end, pose: 'plank' }, ...seg('right', 'r'), ...seg('left', 'l'), { t: D, pose: 'plank' }];
const ex = H.module_(meta, RP.contacts, poses, keyframes);
for (const p of Object.values(ex.poses)) p.ik = { arm_r: { target: RP.WR.slice(), weight: 1 }, arm_l: { target: RP.WL.slice(), weight: 1 } };
const bar = require('./families/equip').pullupBar({ x: RP.anchors.r[0], height: RP.anchors.r[1], width: 120 });
ex.props = [bar.prop, ...RP.cradles()];
const tl = R.buildTimeline(ex), Ws = [];
for (let i = 0; i <= 160; i++) Ws.push(R.evalPose(L.rig, tl.pose((i / 160) * D), RP.contacts));
const cl = X.cradleLoop(Ws, RP.anchors, RP.Ls), sw = X.sweep(ex, { planted: ['arm_r', 'arm_l'] });
const fails = [];
if (cl.len[1] - cl.len[0] > 1.5) fails.push(`foot straps change length ${r1(cl.len[1] - cl.len[0])} cm`);
if (cl.clear.d < 0) fails.push(`foot strap through the body ${JSON.stringify(cl.clear)}`);
if (sw.slide > 0.05) fails.push(`hands slide ${sw.slide}`);
if (sw.floor < -0.5) fails.push(`below the floor ${JSON.stringify(sw.floorAt)}`);
const W0 = L.fk(base, RP.contacts), Wk = L.fk(poses.r2, RP.contacts), trunkDeg = (W) => Math.round(Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) / R.DEG);
const set = H.setKin(ex);
set('Hip flexion', 'setup', 'Both legs straight in the plank'); set('Hip flexion', 'peak', `Driving hip ≈${Math.round(poses.r2.ch.hip_r.flex)}°, knee ≈${Math.round(poses.r2.ch.knee_r.flex)}°, the foot ${r1(X.cradlePoint(Wk, 'r')[0] - X.cradlePoint(W0, 'r')[0])} cm forward`);
set('Trunk', 'setup', `Trunk ${trunkDeg(W0)}° from horizontal (feet ${Math.round(X.cradlePoint(W0, 'r')[1])} cm up)`); set('Trunk', 'peak', 'Unchanged: hips level while the knees drive');
set('Straps', 'setup', `One strap per foot, ${r1(RP.Ls)} cm`); set('Straps', 'peak', `The driving foot rises ${r1(X.cradlePoint(Wk, 'r')[1] - X.cradlePoint(W0, 'r')[1])} cm on its strap arc; straps at least ${cl.clear.d} cm off the body`);
set('Tempo', 'setup', `Plank ${ph('setup').end} s`); set('Tempo', 'peak', `${r1(ph('right').end - ph('right').start)} s per knee drive and return`);
const hf = Object.values(poses).map((p) => p.ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.max(...hf) - 10), max: Math.ceil(Math.max(...hf) + 10) };
console.log(`Ring Mountain Climber: wrote ${L.write(ex)}\n  anchors ${JSON.stringify(RP.anchors)} Ls ${r1(RP.Ls)} err ${JSON.stringify(err)} knee-in ${JSON.stringify({ hip: poses.r2.ch.hip_r, knee: poses.r2.ch.knee_r, ankle: poses.r2.ch.ankle_r })}\n  loop ${JSON.stringify({ cradle: cl, slide: sw.slide, floor: sw.floor, jump: sw.jump })}`);
X.report(ID, fails);
