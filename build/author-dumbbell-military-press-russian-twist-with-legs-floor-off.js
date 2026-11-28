// Dumbbell Military Press Russian Twist with Legs Floor Off (GymVisual #16922; page not readable here, movement from the
// name): seated on the mat in a V-sit, trunk leaned back about 45 degrees with a long spine, knees bent and both feet held off
// the floor (no foot contacts; the pelvis stays put). A dumbbell in each hand at the shoulders, palms forward. Press both
// dumbbells up to straight arms over the shoulders and lower them back (military press), then, holding them at the
// shoulders, turn the trunk to the right and back (Russian twist); press again, then turn to the left. Bilateral loop. The
// seated lean follows author-russian-twist.js (core-b.js lie / neck helpers); the press keys are b3-chest solveArmDB solves
// in the trunk frame (dumbbell centre and handle axis), mirrored to the left arm; the turn is spine rotation with the arms
// riding along.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CB = require('./families/core-b');
const C = require('./families/b3-chest');
const H = require('./families/hips');
const S3 = require('./families/b3-shoulders');
const F6 = require('./families/b6-04');
const meta = require('./meta/dumbbell-military-press-russian-twist-with-legs-floor-off.json');

const LEAN = 45, KNEE = 90, FOOT_Y = +(process.env.FOOTY ?? 10), REACH = +(process.env.REACH ?? 60), TURN = +(process.env.TURN ?? 34);
const sitBottom = (W) => Math.min(CB.bottomOf(W, 'pelvis'), CB.bottomOf(W, 'buttock_r'), CB.bottomOf(W, 'buttock_l'));
let base = CB.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
Object.assign(base.ch, { spine_l5: { rot: 0, latFlex: 0, flex: 10 }, spine_t12: { rot: 0, latFlex: 0, flex: 6 }, spine_t6: { rot: 0, latFlex: 0, flex: 2 } });
CB.neck(base, 6);
const setPitch = (p, P) => { p.root.rot = { pitch: r1(P) }; return p; };
{ let lo = 0, hi = 90; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, a = CB.trunkFromVertical(L.fk(setPitch(clone(base), m))); if (a < LEAN) lo = m; else hi = m; } setPitch(base, (lo + hi) / 2); }
for (const s of ['r', 'l']) { base.ch[`hip_${s}`] = { flex: 100, abd: 4, rot: 0 }; base.ch[`knee_${s}`] = { flex: KNEE }; base.ch[`ankle_${s}`] = { dorsi: -20 }; }
base.root.pos[1] = r1(base.root.pos[1] - sitBottom(L.fk(base)) + 0.2);
// legs: raise the thighs until the lowest point of the feet is FOOT_Y cm off the floor (knees held at KNEE)
const footLow = (W) => Math.min(CB.bottomOf(W, 'foot_r'), CB.bottomOf(W, 'foot_l'));
{ let lo = 60, hi = 130; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2, q = clone(base); q.ch.hip_r.flex = q.ch.hip_l.flex = m; if (footLow(L.fk(q)) < FOOT_Y) lo = m; else hi = m; } base.ch.hip_r.flex = base.ch.hip_l.flex = r1((lo + hi) / 2); }
base.root.pos[1] = r1(base.root.pos[1] - sitBottom(L.fk(base)) + 0.2);
base.ch.sc_r = { protract: 4, elevate: 2 }; base.ch.sc_l = { protract: 4, elevate: 2 };
delete base.ik;
const contacts = [];
// press keys (right arm): f = 0 dumbbell at the shoulder (palm forward, forearm along the trunk), f = 1 arm straight up over the
// shoulder, angled forward of the trunk line toward vertical
const W0 = L.fk(base), F = C.trunkFrame(W0);
const RACK = JSON.parse(process.env.RACK || '[4, 15, 19]'); // [out of the chest, up the trunk, out to the side] from the shoulder joint
const S = W0.shoulder_r.p, cb = V.add(S, V.add(V.add(V.scale(F.v, RACK[0]), V.scale(F.u, RACK[1])), V.scale(F.w, RACK[2])));
const dTop = V.norm(V.add(F.u, V.scale(F.v, +(process.env.FWD ?? 0.55)))), ct = V.add(S, V.scale(dTop, REACH)), ax = V.scale(F.w, -1);
const EL0 = V.add(S, V.scale(V.norm(V.add(V.add(V.scale(F.u, -0.35), V.scale(F.w, 0.85)), V.scale(F.v, 0.35))), L.UA)); // rack: elbow out to the side, a little forward and below the shoulder
const GRID = [];
for (const plane of [10, 30, 50, 70]) for (const elev of [60, 80, 100]) for (const axial of [-90, -45, 0, 45]) for (const pron of [0, 90, 170]) GRID.push({ shoulder_r: { plane, elev, axial }, elbow_r: { flex: 120 }, wrist_r: { pron, flex: 0, dev: 0 } });
const ease = (f) => f * f * (3 - 2 * f);
let prev = null; const raw = [];
for (let i = 0; i <= 6; i++) {
  const f = i / 6, e = ease(f), c = V.add(V.scale(cb, 1 - e), V.scale(ct, e)), pc = prev && clone(prev.ch);
  const p = clone(base); p.ch.sc_r = { protract: r1(4 + 4 * e), elevate: r1(2 + 8 * e) };
  const q = C.solveArmDB(p, { c, ax, seeds: prev ? [{ shoulder_r: pc.shoulder_r, elbow_r: pc.elbow_r, wrist_r: pc.wrist_r }] : GRID, wristW: 0.1,
    extra: (W, qq) => (prev ? [(qq.ch.wrist_r.pron - pc.wrist_r.pron) * 0.005, (qq.ch.shoulder_r.axial - pc.shoulder_r.axial) * 0.005] : [...V.sub(W.elbow_r.p, EL0).map((v) => v * 0.5)]).concat([Math.min(0, qq.ch.shoulder_r.plane + 10) * 0.5]) });
  const W = L.fk(q), d = C.dbAt(W, 'r');
  raw.push({ f, pose: C.mirrorArm(C.strip(q)), err: +V.len(V.sub(d.c, c)).toFixed(2), axErr: +V.angle(d.ax, ax).toFixed(1) });
  prev = q;
}
const SPLIT = { spine_l5: 0.1, spine_t12: 0.45, spine_t6: 0.45 };
function turn(theta) { const p = clone(raw[0].pose); for (const j of Object.keys(SPLIT)) p.ch[j] = Object.assign({}, p.ch[j], { rot: r1(theta * SPLIT[j]) }); CB.neck(p, 6, theta * 0.4); return p; }
const poses = { rack: raw[0].pose, top: raw[6].pose, R: turn(TURN), Rhold: turn(TURN + 2), L: turn(-TURN), Lhold: turn(-TURN - 2) };
for (let i = 1; i <= 5; i++) poses[`p${i}`] = raw[i].pose;
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = poses.topHold.ch.elbow_l.flex = r1(Math.max(0, poses.top.ch.elbow_r.flex - 2));
const ph = meta.timeline.phases, D = meta.timeline.duration, kf = [{ t: 0, pose: 'rack' }];
for (const P of ph) {
  const a = P.start, b = P.end, m = (a + b) / 2;
  if (P.id.startsWith('press')) { for (let i = 1; i <= 5; i++) kf.push({ t: a + ((b - a) * i) / 6, pose: `p${i}` }); kf.push({ t: b, pose: 'top' }); }
  else if (P.id.startsWith('top')) kf.push({ t: m, pose: 'topHold' }, { t: b, pose: 'top' });
  else if (P.id.startsWith('lower')) { for (let i = 5; i >= 1; i--) kf.push({ t: a + ((b - a) * (6 - i)) / 6, pose: `p${i}` }); kf.push({ t: b, pose: 'rack' }); }
  else if (P.id.startsWith('twist')) { const s = P.id.slice(-1); kf.push({ t: a + (b - a) * 0.4, pose: s }, { t: a + (b - a) * 0.55, pose: `${s}hold` }, { t: b, pose: 'rack' }); }
  else kf.push({ t: b, pose: 'rack' });
}
const keyframes = [...new Map(kf.map((k) => [+k.t.toFixed(3), { t: +k.t.toFixed(3), pose: k.pose }])).values()].sort((a, b) => a.t - b.t);
const ex = H.module_(meta, contacts, poses, keyframes);
const rep = S3.scan(ex, { planted: [] });
S3.gate('dumbbell-military-press-russian-twist-with-legs-floor-off', rep);
let pelvisDrift = 0, feetLow = 1e9;
const tl = R.buildTimeline(ex), Wp = L.fk(poses.rack);
for (let i = 0; i <= 400; i++) { const W = R.evalPose(rig, tl.pose((i / 400) * D), contacts); pelvisDrift = Math.max(pelvisDrift, V.len(V.sub(W.pelvis.p, Wp.pelvis.p))); feetLow = Math.min(feetLow, footLow(W)); }
const Wt = L.fk(poses.top), Wr = L.fk(poses.Rhold), rh = poses.Rhold.ch, rot = rh.spine_l5.rot + rh.spine_t12.rot + rh.spine_t6.rot, d = F6.d0;
const set = H.setKin(ex);
set('Trunk lean', 'setup', `${d(CB.trunkFromVertical(Wp))} back from vertical (pelvis to C7)`); set('Trunk lean', 'peak', 'Held through the presses and turns');
set('Legs', 'setup', `Knees ${d(CB.kneeOf(Wp, 'r'))}, hips ${d(base.ch.hip_r.flex)}, feet ${r1(footLow(Wp))} cm off the floor`); set('Legs', 'peak', `Held off the floor (lowest ${r1(feetLow)} cm)`);
set('Press', 'setup', `Dumbbells at the shoulders, elbows ${d(C.elbowFlexOf(Wp))}, palms forward`); set('Press', 'peak', `Arms straight (elbows ${d(C.elbowFlexOf(Wt))}), ${d(V.angle(V.sub(Wt.wrist_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`);
set('Trunk rotation', 'setup', 'Facing the knees'); set('Trunk rotation', 'peak', `${d(rot)} each way, dumbbells riding at the shoulders`);
set('Tempo', 'setup', `Hold ${ph[0].end} s`); set('Tempo', 'peak', `Press ${r1(ph[1].end - ph[1].start)} s up, ${r1(ph[3].end - ph[3].start)} s down; turn ${r1(ph[4].end - ph[4].start)} s each side`);
const tfMax = CB.trunkFromVertical(Wp); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tfMax - 3), max: Math.ceil(tfMax + 3) };
console.log(`Dumbbell Military Press Russian Twist (legs off): wrote ${L.write(ex)}\n  errs ${raw.map((k) => k.err)} axErr ${raw.map((k) => k.axErr)} hip ${base.ch.hip_r.flex} lean ${CB.trunkFromVertical(Wp).toFixed(1)} elbow ${C.elbowFlexOf(Wp).toFixed(0)}->${C.elbowFlexOf(Wt).toFixed(0)} turn ${r1(rot)} pelvisDrift ${pelvisDrift.toFixed(3)} feetLow ${r1(feetLow)}\n  ${JSON.stringify({ floor: rep.floor, dbFloor: rep.dbFloor, clear: rep.clear, jump: rep.jump, elev: rep.elev, elbow: rep.elbow })}`);
if (Math.max(...raw.map((k) => k.err)) > 1 || Math.max(...raw.map((k) => k.axErr)) > 10) { console.error('FAIL: press key not solved'); process.exitCode = 1; }
if (pelvisDrift > 0.05 || feetLow < 1) { console.error('FAIL: pelvis moves or feet touch the floor'); process.exitCode = 1; }
