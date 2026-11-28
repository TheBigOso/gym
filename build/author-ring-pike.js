// Ring Pike (GymVisual #15624; page not readable here, movement from the name and standard coaching): feet in suspension
// foot cradles (one strap per foot from a pull-up bar; src/gear/g3-bars.js 'cradle'), hands planted under the shoulders:
// a high plank with the feet about 50 cm off the floor. Lift the hips high with straight legs into a pike; the feet swing
// forward in the straps toward the hands, the shoulders stay over the hands and the head drops between the arms; hold,
// then lower back to a straight plank. Each key is solved for root x / y / pitch with the arms straight onto the planted
// hands and each cradle on its strap sphere about its anchor (gear-g3-bars.js ringPlank). Bilateral.
const L = require('./lib');
const { V, R, r1 } = L;
const H = require('./families/hips');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/ring-pike.json');

const ID = 'ring-pike', ENV = (k, d) => +(process.env[k] ?? d);
const RP = X.ringPlank({ hc: ENV('HC', 50), d: ENV('D', 30) });
const HIP = ENV('HIP', 105), OFF = ENV('OFF', 4), FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
const ease = (x) => x * x * (3 - 2 * x);
const poses = {}; let prev = RP.plank;
FS.forEach((f, i) => {
  const q = RP.solveKey({ legs: { r: { hip: HIP * f }, l: { hip: HIP * f } }, offX: OFF * f, guess: prev, sc: { protract: r1(6 + 6 * f), elevate: r1(4 * f) }, neck: -6 * f });
  delete q.__cost; poses[`p${i}`] = q; prev = q;
});
const N = FS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const t0 = ph('pike').start, t1 = ph('pike').end, t2 = ph('top').end, t3 = ph('lower').end, D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'p0' }];
FS.forEach((f, i) => keyframes.push({ t: +(t0 + (t1 - t0) * inv(f)).toFixed(3), pose: `p${i}` }));
keyframes.push({ t: t2, pose: `p${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(t2 + (t3 - t2) * inv(1 - FS[i])).toFixed(3), pose: `p${i}` });
keyframes.push({ t: D, pose: 'p0' });
const ex = H.module_(meta, RP.contacts, poses, keyframes);
for (const p of Object.values(ex.poses)) p.ik = { arm_r: { target: RP.WR.slice(), weight: 1 }, arm_l: { target: RP.WL.slice(), weight: 1 } };
const bar = require('./families/equip').pullupBar({ x: RP.anchors.r[0], height: RP.anchors.r[1], width: 120 });
ex.props = [bar.prop, ...RP.cradles()];
// loop: hands planted, floor, cradle straps taut and clear
const tl = R.buildTimeline(ex), Ws = [];
for (let i = 0; i <= 160; i++) Ws.push(R.evalPose(L.rig, tl.pose((i / 160) * D), RP.contacts));
const cl = X.cradleLoop(Ws, RP.anchors, RP.Ls), sw = X.sweep(ex, { planted: ['arm_r', 'arm_l'] });
const fails = [];
if (cl.len[1] - cl.len[0] > 1.5) fails.push(`foot straps change length ${r1(cl.len[1] - cl.len[0])} cm`);
if (cl.clear.d < 0) fails.push(`foot strap through the body ${JSON.stringify(cl.clear)}`);
if (sw.slide > 0.05) fails.push(`hands slide ${sw.slide}`);
if (sw.floor < -0.5) fails.push(`below the floor ${JSON.stringify(sw.floorAt)}`);
const W0 = L.fk(poses.p0, RP.contacts), Wt = L.fk(poses[`p${N}`], RP.contacts), cz = (W) => X.cradlePoint(W, 'r');
const hipAng = (W) => Math.round(V.angle(V.sub(W.neck_c7.p, W.pelvis.p), V.sub(W.ankle_r.p, W.hip_r.p)));
const set = H.setKin(ex);
set('Hip flexion', 'setup', `Straight plank (trunk-to-leg ≈${hipAng(W0)}°), feet ${Math.round(cz(W0)[1])} cm off the floor`); set('Hip flexion', 'peak', `Trunk-to-leg ≈${hipAng(Wt)}° in the pike, hips ${Math.round(Wt.pelvis.p[1])} cm high`);
set('Shoulder position', 'setup', 'Shoulders over the wrists, arms straight'); set('Shoulder position', 'peak', `Shoulders ${r1(Wt.shoulder_r.p[0] - RP.WR[0])} cm ahead of the wrists, head between the arms`);
set('Straps', 'setup', `One strap per foot, ${r1(RP.Ls)} cm from anchors ${RP.anchors.r[1]} cm up`); set('Straps', 'peak', `Feet swing ${r1(cz(Wt)[0] - cz(W0)[0])} cm toward the hands on the strap arcs; straps at least ${cl.clear.d} cm off the body`);
set('Tempo', 'setup', `Plank ${t0} s`); set('Tempo', 'peak', `${r1(t1 - t0)} s up, ${r1(t2 - t1)} s hold, ${r1(t3 - t2)} s down`);
const hf = Object.values(poses).map((p) => p.ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.max(...hf) - 10), max: Math.ceil(Math.max(...hf) + 10) };
console.log(`Ring Pike: wrote ${L.write(ex)}\n  anchors ${JSON.stringify(RP.anchors)} Ls ${r1(RP.Ls)} cradle0 ${cz(W0).map(r1)} cradleTop ${cz(Wt).map(r1)} pelvisTop ${Wt.pelvis.p.map(r1)}\n  loop ${JSON.stringify({ cradle: cl, slide: sw.slide, floor: sw.floor, jump: sw.jump })}`);
X.report(ID, fails);
