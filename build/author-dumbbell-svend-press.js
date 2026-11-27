// Dumbbell Svend Press (GymVisual #14301; page not readable here, movement from the name): standing tall, feet about hip
// width (planted leg contacts), knees soft. One dumbbell held horizontally across the body, squeezed between the flat palms
// (two-hand item: attach.with; fingers forward, thumbs up) in front of the lower chest. Squeezing hard, the hands press
// straight forward at chest height until the arms are nearly straight, pause, then draw back to the chest. Bilateral and
// symmetric (the left arm mirrors the right). Families b3-shoulders.js (standing, solveArm) and b5-misc.js (two-hand
// dumbbell placement and clearance).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const M = require('./families/b5-misc');
const DB = require('./families/dumbbell');
const { Q } = L;
const meta = require('./meta/dumbbell-svend-press.json');

const base = F.standing({ stance: 11, knee: 6 });
const P0 = base.pose, contacts = base.contacts;
const W0 = L.fk(P0, contacts), S = W0.shoulder_r.p;
const GZ = 15, PALM = [0, 0, -1], THUMB = [0, 1, 0]; // grip points 30 cm apart: palms flat on the dumbbell's end plates
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
// right arm: grip point (palm centre, DB 'handle') at G, elbow near E, palm facing the midline, thumb up (soft)
function solveGrip(p, G, E, prev) {
  const q0 = clone(p);
  if (prev) for (const j of ['shoulder_r', 'elbow_r', 'wrist_r']) q0.ch[j] = clone(prev.ch[j]);
  else { q0.ch.shoulder_r = { plane: 70, elev: 54, axial: -65 }; q0.ch.elbow_r = { flex: 110 }; q0.ch.wrist_r = { pron: 90, flex: 0, dev: 0 }; }
  const r = L.solvePose(q0, ARM, [
    (W) => V.sub(DB.dumbbellAt(W, 'r').c, G).map((v) => v * 4),
    (W) => V.sub(W.elbow_r.p, E).map((v) => v * 0.6),
    (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), PALM).map((v) => v * 6),
    (W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), THUMB).map((v) => v * 1),
    (W, q) => [q.ch.wrist_r.flex * 0.03, q.ch.wrist_r.dev * 0.04, Math.max(0, Math.abs(q.ch.wrist_r.flex) - 60), Math.max(0, Math.abs(q.ch.wrist_r.dev) - 25), Math.max(0, 25 - q.ch.shoulder_r.elev) * 2],
  ], { iters: 600 });
  const W = L.fk(r.pose);
  r.pose.__err = { grip: +V.len(V.sub(DB.dumbbellAt(W, 'r').c, G)).toFixed(2), elbow: +V.len(V.sub(W.elbow_r.p, E)).toFixed(2), cost: +r.cost.toFixed(3) };
  return r.pose;
}
const REACH = L.reach(10) + 6; // shoulder to grip point at full reach (the grip point sits about 6 cm past the wrist)
const START = [S[0] + 22, S[1] - 18, GZ], dy = -10, dz = GZ - S[2], END = [S[0] + Math.sqrt(REACH * REACH - dy * dy - dz * dz), S[1] + dy, GZ];
const lerp = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
const N = 5, poses = {}, err = {};
let prev = null;
for (let i = N; i >= 0; i--) {
  const f = i / N, p = clone(P0);
  p.ch.sc_r = { protract: r1(2 + 10 * f), elevate: 0 };
  const Sx = L.fk(p, contacts).shoulder_r.p, Wt = lerp(START, END, f);
  const E = F.elbowFor(Sx, V.add(Wt, [-6, 0, 3]), V.norm([-0.4 + 0.2 * f, -1, 0.35]));
  const q = solveGrip(p, Wt, E, prev);
  err[`p${i}`] = q.__err; prev = clone(q); poses[`p${i}`] = F.mirrorArm(q);
}
const T = meta.timeline.phases.map((ph) => ph.end); // setup, press, hold, return, reset
const out = (t0, t1, a, b) => Array.from({ length: Math.abs(b - a) - 1 }, (_, k) => ({ t: +(t0 + ((t1 - t0) * (k + 1)) / Math.abs(b - a)).toFixed(3), pose: `p${a + Math.sign(b - a) * (k + 1)}` }));
const keyframes = [{ t: 0, pose: 'p0' }, { t: T[0], pose: 'p0' }, ...out(T[0], T[1], 0, N), { t: T[1], pose: `p${N}` }, { t: T[2], pose: `p${N}` }, ...out(T[2], T[3], N, 0), { t: T[3], pose: 'p0' }, { t: T[4], pose: 'p0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// whole loop: planted feet, floor, dumbbell clear of the chest and face, grip gap (the hands squeeze a rigid dumbbell)
let clr = { d: 1e9 }, gap = [999, -999];
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => { const c = M.twoHandDbClear(W); if (c.d < clr.d) clr = { ...c, t: +t.toFixed(2) }; const gg = M.twoHandDb(W).gripGap; gap = [Math.min(gap[0], gg), Math.max(gap[1], gg)]; } });
const Ws = L.fk(poses.p0, contacts), We = L.fk(poses[`p${N}`], contacts), set = H.setKin(ex);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const humElev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Ws))}° (hands at the chest)`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(We))}° (arms nearly straight)`);
set('Shoulder flexion', 'setup', `≈${Math.round(humElev(Ws))}°`); set('Shoulder flexion', 'peak', `≈${Math.round(humElev(We))}° (hands at chest height)`);
set('Hand path', 'setup', `Dumbbell ${r1(M.twoHandDb(Ws).c[0] - Ws.spine_t6.p[0])} cm in front of the mid-back joint, ${r1(Ws.shoulder_r.p[1] - M.twoHandDb(Ws).c[1])} cm below the shoulders`); set('Hand path', 'peak', `Straight forward ${r1(V.len(V.sub(M.twoHandDb(We).c, M.twoHandDb(Ws).c)))} cm at chest height`);
set('Grip', 'setup', `Dumbbell squeezed between flat palms, grip points ${r1(gap[0])}-${r1(gap[1])} cm apart through the loop`); set('Grip', 'peak', 'Unchanged (squeeze held)');
set('Tempo', 'setup', `At the chest ${T[0]} s`); set('Tempo', 'peak', `${r1(T[1] - T[0])} s out, ${r1(T[2] - T[1])} s squeeze, ${r1(T[3] - T[2])} s back`);


console.log(`Dumbbell Svend Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}\n  clear ${JSON.stringify(clr)} gap ${gap.map(r1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (clr.d < -0.3) { console.error('FAIL: dumbbell passes into the body'); process.exitCode = 1; }
if (gap[1] - gap[0] > 1.5) { console.error('FAIL: grip width changes'); process.exitCode = 1; }
if (process.env.DBG) for (const k in poses) { const W = L.fk(poses[k], contacts); console.log(k, r1(M.twoHandDb(W).gripGap), JSON.stringify(poses[k].ch.shoulder_r), JSON.stringify(poses[k].ch.elbow_r), JSON.stringify(poses[k].ch.wrist_r)); }
