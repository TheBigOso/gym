// Suspended Row (GymVisual #2290, "Suspended Row"; page not readable here, movement from the name and standard coaching):
// a suspension-trainer row. Two straps hang from one anchor on a pull-up bar; the athlete leans back under it with the body
// straight from heels to head, heels planted on the floor (the pivot), arms long and a handle in each hand (neutral grip,
// thumbs toward the head). Pull the chest up to the hands, elbows close to the body and shoulder blades squeezed, then
// lower under control to long arms. The body rotates as one piece about the heels; each hand stays on its strap's sphere
// about the anchor (gear-bars.js sphereArc / onSphere), and the handles are turned in the hand to sit along the straps
// (gear-bars.js ringTiltFit). Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const EQ = require('./families/equip');
const H = require('./families/hips');
const G = require('./families/gear-bars');
const meta = require('./meta/suspended-row.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ALPHA_T = ENV('AT', 52), BAR_Y = ENV('BARY', 215), HALF = 11;   // body angle above the floor at the top (deg), bar height, heel half-spacing
// body: straight from the heels to the head, the root pitched back; legs keep 3 degrees of knee bend
const supine = L.POSES.supine({ kneeFlex: 0 }).pose;
const body0 = clone(supine);
Object.assign(body0.ch, { hip_r: { flex: 0, abd: 2, rot: 0 }, hip_l: { flex: 0, abd: 2, rot: 0 }, knee_r: { flex: 3 }, knee_l: { flex: 3 }, ankle_r: { dorsi: -20 }, ankle_l: { dorsi: -20 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 4 }, sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 } });
// heel point: the lowest point of the foot, kept at the floor; it does not move, so the ankle joints are the fixed targets
const at0 = (alpha) => { const p = clone(body0); p.root = { pos: [0, 0, 0], rot: { pitch: 90 - alpha } }; return p; };
const ref = at0(ALPHA_T), Wref = L.fk(ref);
const heelDrop = (W, s) => W[`ankle_${s}`].p[1] - H.bottomOf(W, `foot_${s}`);
const target = { r: [120, r1(heelDrop(Wref, 'r')), HALF], l: [120, r1(heelDrop(Wref, 'l')), -HALF] };
const footRot = { r: H.qArr(Wref.ankle_r.q), l: H.qArr(Wref.ankle_l.q) };
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: [-0.3, 1, s === 'r' ? 0.1 : -0.1], handRot: footRot[s] }));
// body at angle alpha: root placed so the right ankle (with the stored leg channels) lands on its target
function bodyAt(alpha) {
  const p = at0(alpha), W = L.fk(p), d = V.sub(target.r, W.ankle_r.p);
  p.root.pos = V.add(p.root.pos, [d[0], d[1], 0]).map(r1);
  p.ik = { leg_r: { target: target.r, weight: 1 }, leg_l: { target: target.l, weight: 1 } };
  return p;
}
const reach = L.reach(5) + 7.6; // shoulder to the handle point, elbow 5 degrees (grip point ~7.6 cm past the wrist)
// top: hands beside the lower chest; the anchor straight above the midpoint of the hands
const top = bodyAt(ALPHA_T), Wt0 = L.fk(top, contacts);
const u = V.norm(V.sub(Wt0.neck_c7.p, Wt0.pelvis.p)), n = V.norm(V.cross(u, [0, 0, 1])); // toward the head; chest normal (up)
const Ht = V.add(Wt0.shoulder_r.p, V.add(V.scale(u, -11), V.add(V.scale(n, ENV('HN', 15)), [0, 0, 2])));
const anchor = [r1(Ht[0] - ENV('AX', 6)), BAR_Y - 1.6, 0];   // under the bar, at the midline (one anchor, two straps)
const Ls = V.len(V.sub(Ht, anchor));
// bottom: arms long, each in line with its strap: the body angle that puts the shoulder Ls + reach from the anchor
let lo = 5, hi = ALPHA_T;
for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, S = L.fk(bodyAt(m), contacts).shoulder_r.p; if (V.len(V.sub(anchor, S)) > Ls + reach - 1.5) lo = m; else hi = m; }
const ALPHA_B = r1(hi);
const Sb = L.fk(bodyAt(ALPHA_B), contacts).shoulder_r.p, Hb = G.onSphere(anchor, Ls, Sb, reach - 1.5, [0, -1, 0.3]);
// keys along the rep: body angle and hand both eased between the ends; arms solved onto the strap sphere and mirrored
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], poses = {};
let guess = [[85, 80, 0, 10, 90], [70, 60, 20, 30, 90], [90, 90, -20, 5, 80]], worst = 0;
FS.forEach((f, i) => {
  const p = bodyAt(ALPHA_B + (ALPHA_T - ALPHA_B) * f);
  p.ch.sc_r = { protract: r1(6 - 16 * f), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);    // shoulder blades squeeze at the top
  const W = L.fk(p, contacts), g = G.sphereArc(anchor, Ls, Hb, Ht, f), ub = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), nb = V.norm(V.cross(ub, [0, 0, 1]));
  const E = V.add(W.shoulder_r.p, V.add(V.scale(ub, -18 * f), V.add(V.scale(nb, -6 * f + 10 * (1 - f)), [0, 0, 6 + 2 * f])));
  const q = G.armTo(p, g, { grip: 'handle', thumb: ub, palm: [0, 0, -1], wDir: 0.8, elbow: E, wElbow: 0.3 * f, guesses: guess, mirror: true, contacts });
  worst = Math.max(worst, q.__err); delete q.__err; delete q.__cost;
  guess = [G.guessOf(q)]; poses[`r${i}`] = q;
});
const N = FS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id);
const ease = (x) => x * x * (3 - 2 * x), inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const t0 = ph('pull').start, t1 = ph('pull').end, t2 = ph('top').end, t3 = ph('lower').end, D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => keyframes.push({ t: +(t0 + (t1 - t0) * inv(f)).toFixed(3), pose: `r${i}` }));
keyframes.push({ t: t2, pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(t2 + (t3 - t2) * inv(1 - FS[i])).toFixed(3), pose: `r${i}` });
if (D > t3) keyframes.push({ t: D, pose: 'r0' });
const ex = H.module_(meta, contacts, poses, keyframes);
// handle turned in the hand to sit along its strap (best fixed angle over the loop)
const tl = R.buildTimeline(ex), Ws = [];
for (let i = 0; i <= 120; i++) Ws.push(R.evalPose(L.rig, tl.pose((i / 120) * D), contacts));
const tilt = { r: G.ringTiltFit(Ws, 'r', anchor), l: G.ringTiltFit(Ws, 'l', anchor) };
const bar = EQ.pullupBar({ x: anchor[0], height: BAR_Y, width: 120 });
ex.props = [bar.prop, ...G.ringProps({ anchors: { r: anchor, l: anchor }, style: 'handle', tilt: { r: tilt.r.tilt, l: tilt.l.tilt } })];
// loop: strap length (taut), straps clear of the body, heels planted, body above the floor
const lp = { strap: [1e9, -1e9], clear: { d: 1e9 }, floor: 1e9, slide: 0, fromVert: [1e9, -1e9] };
Ws.forEach((W, i) => {
  for (const s of ['r', 'l']) { const st = G.strap(W, s, anchor); lp.strap = [Math.min(lp.strap[0], st.len), Math.max(lp.strap[1], st.len)]; lp.fromVert = [Math.min(lp.fromVert[0], st.fromVertical), Math.max(lp.fromVert[1], st.fromVertical)]; const c = G.strapClear(W, s, anchor); if (c.d < lp.clear.d) lp.clear = { d: r1(c.d), id: c.id, t: r1((i / 120) * D) }; }
  lp.floor = Math.min(lp.floor, L.shapeMinY(W).y);
  for (const s of ['r', 'l']) lp.slide = Math.max(lp.slide, V.len(V.sub(W[`ankle_${s}`].p, target[s])));
});
const Wb = L.fk(poses.r0, contacts), Wt = L.fk(poses[`r${N}`], contacts), elb = (W) => Math.round(180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p)));
const set = H.setKin(ex);
set('Body angle', 'setup', `≈${Math.round(ALPHA_B)}° above the floor, heels down, straight from heels to head`); set('Body angle', 'peak', `≈${Math.round(ALPHA_T)}° at the top (the body turns about the heels)`);
set('Elbow flexion', 'setup', `≈${elb(Wb)}° (arms long)`); set('Elbow flexion', 'peak', `≈${elb(Wt)}° with the hands at the lower chest`);
set('Straps', 'setup', `Straps ${r1(Ls)} cm from a single anchor ${BAR_Y} cm up; ${Math.round(lp.fromVert[1])}° from vertical at the bottom`); set('Straps', 'peak', `${Math.round(lp.fromVert[0])}° from vertical at the top; at least ${lp.clear.d} cm off the body`);
set('Tempo', 'setup', `Hang ${t0} s`); set('Tempo', 'peak', `${r1(t1 - t0)} s up, ${r1(t2 - t1)} s squeeze, ${r1(t3 - t2)} s down`);
console.log(`Suspended Row: wrote ${L.write(ex)}\n  ${JSON.stringify({ alpha: [ALPHA_B, ALPHA_T], anchor, strap: r1(Ls), gripErr: worst, tilt })}\n  loop ${JSON.stringify({ ...lp, strap: lp.strap.map(r1), fromVert: lp.fromVert.map(r1), floor: r1(lp.floor), slide: +lp.slide.toFixed(3) })}`);
const fails = [];
if (worst > 0.8) fails.push(`hands off their targets (${worst} cm)`);
if (lp.strap[1] - lp.strap[0] > 1.5) fails.push(`straps change length ${r1(lp.strap[1] - lp.strap[0])} cm`);
if (lp.clear.d < 0) fails.push(`strap through the body (${lp.clear.id} at ${lp.clear.t}s)`);
if (lp.floor < -0.5) fails.push('body through the floor');
if (lp.slide > 0.05) fails.push('heels slide');
if (tilt.r.residual > 30) fails.push(`handle off its strap by ${tilt.r.residual} deg`);
if (fails.length) { console.error(`FAIL suspended-row: ${fails.join('; ')}`); process.exitCode = 1; }
