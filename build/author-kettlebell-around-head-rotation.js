// Kettlebell Around Head Rotation (GymVisual 6828, movement reference only; page not readable at authoring time): the
// kettlebell halo. Standing tall, feet hip width (planted leg contacts). One kettlebell is held upside down ("bottom up")
// by the handle in both hands, hands side by side (two-hand attach, wrist_r with wrist_l), palms toward the face, in
// front of the chin. It circles the head close to but clear of it: past the right ear (bell pointing back, the left arm
// crossing in front of the face), behind the head (elbows forward and up, the bell tipped back and down behind the head), past
// the left ear, back to the front; then the other way round. 3 s per circle.
// The handle keeps running left-right (world Z) while the bell turns about it: up in front, back at the sides, down
// behind the head (bell direction = rotation of "up" toward the back by 90 * (1 - cos th) degrees at circle angle th).
// The hands' frames follow (fingers along the bell direction, thumbs out along the handle). The right arm is solved at
// every 10 degrees of the circle with continuation from the previous key; the motion is mirror-symmetric, so the left
// arm at angle th is the mirror image of the right arm at 360 - th. Built on the structure of author-dumbbell-halo.js.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const EQ = require('./families/equip');
const HB = require('./families/b5-barkb');
const meta = require('./meta/kettlebell-around-head-rotation.json');

const env = (k, d) => +(process.env[k] ?? d);
const ZW = env('ZW', 5);                     // grip points ZW cm each side of the handle centre (hands side by side)
const base = F.standing({ stance: 12, knee: 6 });
const P0 = clone(base.pose);
const SC = { protract: 8, elevate: 14 };
P0.ch.sc_r = clone(SC); P0.ch.sc_l = clone(SC);
const W0 = L.fk(P0, base.contacts), HC = R.shapeWorld(W0, rig.shapes.find((s) => s.id === 'head')).c.map(r1); // head centre
const D2R = Math.PI / 180;
// handle centre at circle angle th (deg; 0 = in front, 90 = right side, 180 = behind; clockwise seen from above)
const RF = env('RF', 27), RS = env('RS', 23), RB = env('RB', 22);   // radius in front, at the sides, behind
const YF = env('YF', -13), YS = env('YS', -2), YB = env('YB', 9);   // height relative to the head centre
const mix = (th, f, s, b) => { const c = Math.cos(th * D2R); return c >= 0 ? s + (f - s) * c : s + (b - s) * -c; };
const handleC = (th) => { const r = mix(th, RF, RS, RB), y = mix(th, YF, YS, YB); return V.add(HC, [r * Math.cos(th * D2R), y, r * Math.sin(th * D2R)]); };
const PHI = env('PHI', 67.5); // half the bell's turn: up in front, back at the sides, back and down (135 deg) behind the head
const bellDir = (th) => { const ph = PHI * (1 - Math.cos(th * D2R)) * D2R; return [-Math.sin(ph), Math.cos(ph), 0]; };
// right elbow direction hint (from the shoulder): down, out and forward in front; out at the right side; forward and up
// behind the head; forward across the face when the hands pass the left ear
const HINTS = [[0, [0.45, -0.55, 0.7]], [90, [0.15, 0.25, 1]], [180, [0.75, 0.55, 0.35]], [270, [1, 0.25, -0.05]], [360, [0.45, -0.55, 0.7]]];
function hint(th) { th = ((th % 360) + 360) % 360; for (let i = 1; i < HINTS.length; i++) if (th <= HINTS[i][0]) { const [a, va] = HINTS[i - 1], [b, vb] = HINTS[i], u = (th - a) / (b - a); return V.norm(V.add(V.scale(va, 1 - u), V.scale(vb, u))); } return HINTS[0][1]; }

const ARMP = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const limR = (q) => { const sh = q.ch.shoulder_r, e = q.ch.elbow_r.flex, w = q.ch.wrist_r, pen = (v, lo, hi) => (Math.max(0, lo - v) + Math.max(0, v - hi)) * 3;
  return [pen(sh.plane, -58, 138), pen(sh.elev, 2, 205), pen(e, 3, 148), pen(w.flex, -68, 68), pen(w.dev, -18, 30), pen(w.pron, -10, 170)]; };
const nr = (v, ref) => v + 360 * Math.round((ref - v) / 360);
function solveRight(th, guess) {
  const c = handleC(th), gp = V.add(c, [0, 0, ZW]), d = bellDir(th);
  const E = F.elbowFor(W0.shoulder_r.p, V.sub(gp, V.scale(d, 8)), hint(th));
  const objs = [
    (W) => V.sub(V.add(W.wrist_r.p, Q.rot(W.wrist_r.q, HB.GRIP_PT)), gp).map((v) => v * 3),
    (W) => V.sub(Q.rot(W.wrist_r.q, [0, -1, 0]), d).map((v) => v * env('OW', 4)),          // fingers along the bell direction
    (W) => V.cross(Q.rot(W.wrist_r.q, [0, 0, 1]), [0, 0, 1]).map((v) => v * env('OW', 4)), // the handle runs through the fist (along Z)
    L.obj.at('elbow_r', E, env('EW', 0.05)), (W, q) => limR(q), L.obj.reg('ch.wrist_r.flex', 0, 0.02), L.obj.reg('ch.wrist_r.dev', 0, 0.02),
  ];
  const seeds = [guess, { ...guess, axial: guess.axial + 40 }, { ...guess, axial: guess.axial - 40 }, { ...guess, pron: guess.pron + 50 }, { ...guess, pron: guess.pron - 50 }];
  let best = null;
  for (const g of seeds) {
    const q0 = clone(P0); q0.ch.shoulder_r = { plane: g.plane, elev: g.elev, axial: g.axial }; q0.ch.elbow_r = { flex: g.flex }; q0.ch.wrist_r = { pron: g.pron, flex: g.wf ?? 0, dev: g.wd ?? 0 };
    const r = L.solvePose(q0, ARMP, objs, { iters: 500 });
    const sh = r.pose.ch.shoulder_r, jumpPen = (Math.abs(sh.plane - guess.plane) + Math.abs(sh.elev - guess.elev) + Math.abs(nr(sh.axial, guess.axial) - guess.axial) + Math.abs(r.pose.ch.elbow_r.flex - guess.flex)) * 0.003;
    if (!best || r.cost + jumpPen < best.sc) best = { ...r, sc: r.cost + jumpPen };
  }
  const q = best.pose; q.ch.shoulder_r.axial = r1(nr(q.ch.shoulder_r.axial, guess.axial)); q.ch.wrist_r.pron = r1(nr(q.ch.wrist_r.pron, guess.pron));
  return { q, cost: best.cost };
}
const gOf = (q) => ({ plane: q.ch.shoulder_r.plane, elev: q.ch.shoulder_r.elev, axial: q.ch.shoulder_r.axial, flex: q.ch.elbow_r.flex, pron: q.ch.wrist_r.pron, wf: q.ch.wrist_r.flex, wd: q.ch.wrist_r.dev });
const STEP = 10, NS = 360 / STEP;
const right = [], err = {};
// start in front: two passes round the circle so the first key is also a continuation of the last
let g = { plane: 60, elev: 70, axial: 40, flex: 125, pron: 90 };
for (let pass = 0; pass < 2; pass++) for (let i = 0; i <= NS; i++) { const a = solveRight(i * STEP, g); g = gOf(a.q); if (pass === 1) right.push(a); }
const poses = {};
for (let i = 0; i <= NS; i++) {
  const p = clone(right[i].q), m = right[NS - i].q;
  for (const j of ['shoulder', 'elbow', 'wrist']) p.ch[`${j}_l`] = clone(m.ch[`${j}_r`]);
  poses[`c${i}`] = p; err[`c${i}`] = +right[i].cost.toFixed(3);
}
// keep the last key identical to the first (loop closes exactly)
poses[`c${NS}`] = clone(poses.c0);
const T0 = 0.8, TC = 3.0, TP = 4.2, D = 8.0;
const keyframes = [{ t: 0, pose: 'c0' }];
for (let i = 0; i <= NS; i++) keyframes.push({ t: +(T0 + (TC * i) / NS).toFixed(3), pose: `c${i}` });
for (let i = NS; i >= 0; i--) keyframes.push({ t: +(TP + (TC * (NS - i)) / NS).toFixed(3), pose: `c${i}` });
keyframes.push({ t: D, pose: 'c0' });
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [{ id: 'kettlebell', kind: 'kettlebell', size: [EQ.KB.width, EQ.KB.bell, EQ.KB.bell], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } }];

// Self-check: feet planted, floor, bell and hands clear of the head and body, grip width constant, channel jumps, limits
const kb = { body: 1e9, bodyAt: null, hands: 1e9, handsAt: null, wMin: 1e9, wMax: -1e9, dirErr: 0, jump: { v: 0 } };
// the brow and eye shapes are small, unskinned helpers (skipped as in the dumbbell halo's clearance check)
const KSKIP = /^(hand|thumb|forearm|eye|brow)/;
let prevC = null;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
  const c = EQ.kettlebellClear(W, 'r', { two: true, skip: KSKIP }); if (c.d < kb.body) { kb.body = c.d; kb.bodyAt = [c.id, +t.toFixed(2)]; }
  for (const s of ['r', 'l']) for (const id of ['head', 'hair', 'neck', 'jaw', 'nose']) { if (!rig.shapes.find((x) => x.id === id)) continue; const d = EQ.pointShape(W, EQ.gripPoint(W, s).p, id) - 4; if (d < kb.hands) { kb.hands = d; kb.handsAt = [s, id, +t.toFixed(2)]; } }
  const w = EQ.barAt(W).width; kb.wMin = Math.min(kb.wMin, w); kb.wMax = Math.max(kb.wMax, w);
  const cc = {}; for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l']) for (const k in pz.ch[j]) cc[`${j}.${k}`] = pz.ch[j][k];
  if (prevC) for (const k in cc) { const dd = Math.abs(cc[k] - prevC[k]); if (dd > kb.jump.v) kb.jump = { v: +dd.toFixed(2), k, t: +t.toFixed(2) }; }
  prevC = cc;
} });
for (const k of ['body', 'hands', 'wMin', 'wMax']) kb[k] = +kb[k].toFixed(2);
const viol = HB.limitViolations(ex);
const Wf = L.fk(poses.c0, base.contacts), Wr = L.fk(poses.c9, base.contacts), Wb = L.fk(poses.c18, base.contacts);
const set = H.setKin(ex);
set('Path', 'setup', `Kettlebell upside down in front of the chin, handle ${RF} cm in front of the head centre`); set('Path', 'peak', `Handle circles the head at ${RS}-${RF} cm from its centre; closest bell-to-body gap ${kb.body} cm, hands ${kb.hands} cm from the head`);
set('Shoulder elevation', 'setup', `In front ≈${Math.round(K.humElev(Wf))}°`); set('Shoulder elevation', 'peak', `Right side: right ≈${Math.round(K.humElev(Wr))}°, left ≈${Math.round(K.humElev(Wr, 'l'))}°; behind ≈${Math.round(K.humElev(Wb))}°`);
set('Elbow flexion', 'setup', `In front ≈${Math.round(K.elbowAng(Wf))}°`); set('Elbow flexion', 'peak', `Behind the head ≈${Math.round(K.elbowAng(Wb))}°`);
set('Trunk', 'setup', 'Upright, still'); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', `Hold ${T0} s in front`); set('Tempo', 'peak', `${TC} s per circle, clockwise then counter-clockwise`);
console.log(`Kettlebell Around Head Rotation: wrote ${L.write(ex)}\n  err max ${Math.max(...Object.values(err))} ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  kettlebell ${JSON.stringify(kb)}\n  limits ${viol.length ? viol.join(', ') : 'ok'}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (kb.body < 0) { console.error('FAIL: kettlebell through the body'); process.exitCode = 1; }
if (kb.hands < 0) { console.error('FAIL: hands through the head'); process.exitCode = 1; }
if (kb.wMax - kb.wMin > 1.5) { console.error('FAIL: grip width varies'); process.exitCode = 1; }
if (kb.jump.v > 12) { console.error('FAIL: arm channels jump'); process.exitCode = 1; }
if (viol.length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
if (process.env.DIAG) for (let i = 0; i <= NS; i += 3) {
  const W = L.fk(poses[`c${i}`], base.contacts), th = i * STEP, gp = V.add(handleC(th), [0, 0, ZW]);
  const kc = EQ.kettlebellAt(W, 'r', { two: true }), cl = EQ.kettlebellClear(W, 'r', { two: true, skip: KSKIP });
  console.log(th, 'grip', V.len(V.sub(EQ.gripPoint(W, 'r').p, gp)).toFixed(1), 'fing', V.angle(Q.rot(W.wrist_r.q, [0, -1, 0]), bellDir(th)).toFixed(0), 'thumb', V.angle(Q.rot(W.wrist_r.q, [0, 0, 1]), [0, 0, 1]).toFixed(0), 'clear', cl.d.toFixed(1), cl.id, 'bell', V.sub(kc.c, HC).map(Math.round), JSON.stringify(poses[`c${i}`].ch.shoulder_r), JSON.stringify(poses[`c${i}`].ch.elbow_r), JSON.stringify(poses[`c${i}`].ch.wrist_r));
}
