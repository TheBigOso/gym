// Dumbbell Halo (GymVisual #1167112, dumbbell standing around head rotation): standing tall, feet hip width (planted leg
// contacts). One dumbbell is held upright by the handle in both hands, the right fist on the lower half of the handle
// (handle grip with an offset along the thumb axis) and the left fist stacked above it (the mirror image of the right
// hand about the plane through the handle). It circles the head at about forehead height, close to but clear of it: past
// the right ear, behind the head (elbows forward and up), past the left ear, back to the front; then the other way round.
// 2.8 s per circle. The far arm crosses in front of the forehead as the dumbbell passes the opposite ear.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const DB = require('./families/dumbbell');
const meta = require('./meta/dumbbell-halo.json');

const OFF = meta.props[0].attach.offset;
const GK = K.gripKey('handle', OFF);
const base = F.standing({ stance: 12, knee: 6 });
const P0 = clone(base.pose);
const W0 = L.fk(P0, base.contacts), HC = V.add(W0.head_c1.p, [3, 8.6, 0]); // head centre (rig head shape)
const D2R = Math.PI / 180, UPV = [0, 1, 0];
// dumbbell centre on the circle at angle th (deg; 0 = in front, 90 = right side, clockwise seen from above)
const RAD = (th) => { const c = Math.cos(th * D2R); return 18.5 + -1.5 * (1 - c * c) + 1.5 * Math.max(0, -c); };
const CY = (th) => { const c = Math.cos(th * D2R); return 2 + 5 * (1 - c * c) + 9 * Math.max(0, -c); };
function ring(th) {
  const rh = [Math.cos(th * D2R), 0, Math.sin(th * D2R)];
  return { c: V.add(HC, V.add(V.scale(rh, RAD(th)), [0, CY(th), 0])), u: V.norm([-Math.sin(th * D2R), 0, Math.abs(Math.cos(th * D2R))]) };
}
const SC = { protract: 8, elevate: 14 };
const ARMP = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const lim = (q) => { const w = q.ch.wrist_r, e = q.ch.elbow_r.flex, sh = q.ch.shoulder_r; return [Math.max(0, sh.elev - 205) * 3, Math.min(0, sh.elev - 8) * 3, Math.min(0, w.flex + 75) * 3, Math.max(0, w.flex - 70) * 3, Math.min(0, w.dev + 18) * 3, Math.max(0, w.dev - 32) * 3, Math.max(0, e - 145) * 3, Math.min(0, e - 5) * 3, Math.min(0, sh.plane + 55) * 3, Math.max(0, sh.plane - 135) * 3]; };
const nr = (v, ref) => v + 360 * Math.round((ref - v) / 360);
function multi(q0base, objs, guess) {
  let best = null;
  for (const g of [guess, { ...guess, axial: guess.axial + 45 }, { ...guess, axial: guess.axial - 45 }, { ...guess, pron: guess.pron + 60 }, { ...guess, pron: guess.pron - 60 }]) {
    const q0 = clone(q0base); q0.ch.shoulder_r = { plane: g.plane, elev: g.elev, axial: g.axial }; q0.ch.elbow_r = { flex: g.flex }; q0.ch.wrist_r = { pron: g.pron, flex: g.wf ?? 0, dev: g.wd ?? 0 };
    const r = L.solvePose(q0, ARMP, objs, { iters: 500 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose, sh = q.ch.shoulder_r;
  // (plane, elev, axial) and (plane + 180, 360 - elev, axial + 180) are the same orientation: keep the one nearest the
  // previous key that fits the rig limits (elevation may pass 180 behind the head: the arm crosses the pole smoothly)
  if (sh.elev < 0) { sh.elev = -sh.elev; sh.plane += 180; sh.axial += 180; }
  { const alt = { plane: nr(sh.plane + 180, guess.plane), elev: 360 - sh.elev, axial: nr(sh.axial + 180, guess.axial) }, cur = { plane: nr(sh.plane, guess.plane), elev: sh.elev, axial: nr(sh.axial, guess.axial) };
    const ok = (o) => o.plane >= -60 && o.plane <= 140 && o.elev >= 0 && o.elev <= 210, dist = (o) => Math.abs(o.plane - guess.plane) + Math.abs(o.elev - guess.elev) + Math.abs(o.axial - guess.axial);
    const pick = [cur, alt].filter(ok).sort((a, b) => dist(a) - dist(b))[0] || cur; Object.assign(sh, pick); }
  sh.plane = r1(nr(sh.plane, guess.plane)); sh.axial = r1(nr(sh.axial, guess.axial)); q.ch.wrist_r.pron = r1(nr(q.ch.wrist_r.pron, guess.pron));
  return { q, cost: best.cost };
}
// Each fist wraps the vertical handle: its grip point (where the handle crosses the closed fist) on the handle axis, the
// thumb along the handle (soft), the elbow out and forward (soft), wrist and forearm close to the previous key. The right
// fist sits on the lower half of the handle and carries the dumbbell; the left fist is stacked above it. The left arm is
// solved as the mirror image of a right-arm problem (body symmetric above the hips).
const GRIP_PT = [2.2, -7.2, 0];
const SEEDS = [{ plane: 90, elev: 150, axial: -60, flex: 120, pron: 60 }, { plane: 40, elev: 140, axial: -90, flex: 130, pron: 0 }, { plane: 120, elev: 120, axial: 0, flex: 110, pron: 120 }, { plane: 0, elev: 120, axial: -60, flex: 120, pron: 90 }, { plane: 90, elev: 100, axial: 20, flex: 110, pron: 60 }];
const chDiff = (q, g) => Math.abs(q.ch.shoulder_r.plane - g.plane) + Math.abs(q.ch.shoulder_r.elev - g.elev) + Math.abs(q.ch.shoulder_r.axial - g.axial) + Math.abs(q.ch.elbow_r.flex - g.flex) + Math.abs(q.ch.wrist_r.pron - g.pron);
function fist(p, gp, E, guess, side, extra = []) {
  const m = clone(p); if (side === 'l') m.ch.sc_r = clone(p.ch.sc_l);
  const M = side === 'l' ? K.mz : (v) => v;
  const objs = [
    (W) => V.sub(V.add(W.wrist_r.p, Q.rot(W.wrist_r.q, GRIP_PT)), M(gp)).map((v) => v * 3),
    (W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), UPV).map((v) => v * 1.2),
    L.obj.at('elbow_r', M(E), 0.25), (W, q) => lim(q), L.obj.reg('ch.wrist_r.flex', 0, 0.01), L.obj.reg('ch.wrist_r.dev', 0, 0.01), ...extra,
  ];
  // best of the seeds and the previous key's solution, with a penalty for jumping away from the previous key
  let best = null;
  for (const sd of [guess, ...SEEDS]) {
    const r = multi(m, objs, { ...sd, plane: nr(sd.plane, guess.plane), axial: nr(sd.axial, guess.axial), pron: nr(sd.pron, guess.pron) });
    const sc = r.cost + chDiff(r.q, guess) * 0.004;
    if (!best || sc < best.sc) best = { ...r, sc };
  }
  const out = clone(p);
  for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_${side}`] = clone(best.q.ch[`${j}_r`]);
  return { q: out, cost: best.cost };
}
const gOf = (q, s) => ({ plane: q.ch[`shoulder_${s}`].plane, elev: q.ch[`shoulder_${s}`].elev, axial: q.ch[`shoulder_${s}`].axial, flex: q.ch[`elbow_${s}`].flex, pron: q.ch[`wrist_${s}`].pron, wf: q.ch[`wrist_${s}`].flex, wd: q.ch[`wrist_${s}`].dev });
const STACK = 4.2; // grip points this far below / above the dumbbell centre (two fists on the 14 cm handle)
const poses = {}, err = {};
// elbow direction hint: out to the arm's side and forward in front of the face, up and forward behind the head
const hintR = (th) => { const c = Math.cos(th * D2R), sn = Math.sin(th * D2R); return V.norm([0.6 * Math.max(c, 0) + 0.15, 0.1 + 0.9 * (1 - sn) / 2 + 0.5 * Math.max(-c, 0), 0.8 * Math.max(sn, 0) + 0.1]); };
// elbow direction hint: forward and out in front, out to the side on the near side, up behind the head, straight up when
// the arm reaches over the head to the far side (the humerus then passes close to vertical)
const hint = (th, sd) => (sd === 'r' ? hintR(th) : K.mz(hintR(-th)));
const STEP = 10, NS = 360 / STEP;
const pre = clone(P0); pre.ch.sc_r = clone(SC); pre.ch.sc_l = clone(SC);
const Wp = L.fk(pre, base.contacts);
// 1) right fist (lower) all the way round, continuous from key to key
const right = [];
let g = { plane: 90, elev: 100, axial: 20, flex: 110, pron: 60 };
for (let i = 0; i <= NS; i++) {
  const r = ring(i * STEP), gp = V.sub(r.c, [0, STACK, 0]);
  const a = fist(pre, gp, F.elbowFor(Wp.shoulder_r.p, V.sub(gp, [3, 7, 0]), hint(i * STEP, 'r')), g, 'r');
  g = gOf(a.q, 'r'); right.push(a);
}
// 2) left fist (upper): seeded with the mirror of the right arm at the mirrored angle (the left arm's natural branch)
for (let i = 0; i <= NS; i++) {
  const r = ring(i * STEP), gp = V.add(r.c, [0, STACK, 0]), mir = gOf(right[NS - i].q, 'r');
  const b = fist(right[i].q, gp, F.elbowFor(Wp.shoulder_l.p, V.sub(gp, [3, 7, 0]), hint(i * STEP, 'l')), mir, 'l');
  poses[`c${i}`] = b.q; err[`c${i}`] = [+right[i].cost.toFixed(2), +b.cost.toFixed(2)];
}
// Shoulder angle representation along the circle: (plane, elev, axial) and (plane + 180, 360 - elev, axial + 180) are the
// same arm. Pick per key (within the rig limits) the sequence whose interpolated humerus path is shortest, so the arm
// crosses the overhead pole near vertical instead of sweeping round it.
function humDir(sh) { const W = L.fk({ root: { pos: [0, 100, 0], rot: {} }, ch: { shoulder_r: sh } }); return V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); }
function segLen(a, b) { let len = 0, prev = humDir(a); for (let k = 1; k <= 8; k++) { const t = k / 8, sh = { plane: a.plane + (b.plane - a.plane) * t, elev: a.elev + (b.elev - a.elev) * t, axial: a.axial + (b.axial - a.axial) * t }, d = humDir(sh); len += V.angle(prev, d); prev = d; } return len; }
for (const sd of ['r', 'l']) {
  const keys = []; for (let i = 0; i <= NS; i++) keys.push(poses[`c${i}`].ch[`shoulder_${sd}`]);
  const opts = keys.map((k) => { const a = { ...k }, b = { plane: k.plane + 180, elev: 360 - k.elev, axial: k.axial + 180 }; for (const o of [a, b]) o.plane = nr(o.plane, 40); return [a, b].filter((o) => o.plane >= -60 && o.plane <= 140 && o.elev >= 0 && o.elev <= 210); });
  // dynamic programming over the options (axial unwrapped to the previous key)
  let prev = opts[0].map((o) => ({ o, cost: Math.abs(o.elev - keys[0].elev) < 1e-6 ? 0 : 1e3, path: [o] }));
  for (let i = 1; i <= NS; i++) {
    prev = opts[i].map((o) => { let best = null; for (const p of prev) { const oo = { ...o, axial: nr(o.axial, p.o.axial) }, c = p.cost + segLen(p.o, oo); if (!best || c < best.cost) best = { o: oo, cost: c, path: [...p.path, oo] }; } return best; });
  }
  const best = prev.sort((a, b) => a.cost - b.cost)[0];
  best.path.forEach((o, i) => { poses[`c${i}`].ch[`shoulder_${sd}`] = { plane: r1(o.plane), elev: r1(o.elev), axial: r1(o.axial) }; });
  // forearm rotation: unwrap to the previous key
  for (let i = 1; i <= NS; i++) { const w = poses[`c${i}`].ch[`wrist_${sd}`]; w.pron = r1(nr(w.pron, poses[`c${i - 1}`].ch[`wrist_${sd}`].pron)); }
}
// Where an arm still changes representation between two keys (plane jump), add a key between them where that arm is close
// to vertical (pulled toward elev 180), stored twice, 1/120 s apart, once in each representation of the same arm: both
// neighbouring segments then interpolate smoothly and the switch itself is a re-labelling of the same pose.
const tCW = (x) => 0.9 + (2.8 * x) / NS, tCCW = (x) => 4.3 + (2.8 * (NS - x)) / NS;
const extraKeys = [];
for (let i = 0; i < NS; i++) {
  const cross = ['r', 'l'].filter((sd) => Math.abs(poses[`c${i}`].ch[`shoulder_${sd}`].plane - poses[`c${i + 1}`].ch[`shoulder_${sd}`].plane) >= 90);
  // crossing point: where the arm is naturally closest to vertical (fewest compromises for the pole key)
  const natural = (sd, fr) => { const th = (i + fr) * STEP, r = ring(th), gpR = V.sub(r.c, [0, STACK, 0]), gpL = V.add(r.c, [0, STACK, 0]);
    const a1 = fist(pre, gpR, F.elbowFor(Wp.shoulder_r.p, V.sub(gpR, [3, 7, 0]), hint(th, 'r')), gOf(poses[`c${i}`], 'r'), 'r');
    const q = sd === 'r' ? a1.q : fist(a1.q, gpL, F.elbowFor(Wp.shoulder_l.p, V.sub(gpL, [3, 7, 0]), hint(th, 'l')), gOf(poses[`c${i}`], 'l'), 'l').q;
    const sh = q.ch[`shoulder_${sd}`]; return Math.abs(Math.abs(((sh.elev % 360) + 360) % 360 - 180)); };
  const frs = {};
  for (const sd of cross) { let best = null; for (const fr of [0.15, 0.3, 0.5, 0.7, 0.85]) { const d = natural(sd, fr); if (!best || d < best.d) best = { fr, d }; } frs[sd] = best.fr; }
  if (cross.length === 2 && frs.r === frs.l) { frs.r = Math.max(0.1, frs.r - 0.08); frs.l = Math.min(0.9, frs.l + 0.08); }
  cross.sort((x, y) => frs[x] - frs[y]);
  cross.forEach((sd, k) => {
    const fr = frs[sd];
    const A = poses[`c${i}`].ch[`shoulder_${sd}`], B = poses[`c${i + 1}`].ch[`shoulder_${sd}`];
    const th = (i + fr) * STEP, r = ring(th), other = sd === 'r' ? 'l' : 'r';
    const pole = [(W, q) => [(q.ch.shoulder_r.elev - 180) * 0.6]];
    const gpR = V.sub(r.c, [0, STACK, 0]), gpL = V.add(r.c, [0, STACK, 0]);
    const a1 = fist(pre, gpR, F.elbowFor(Wp.shoulder_r.p, V.sub(gpR, [3, 7, 0]), hint(th, 'r')), gOf(poses[`c${i}`], 'r'), 'r', sd === 'r' ? pole : []);
    const b1 = fist(a1.q, gpL, F.elbowFor(Wp.shoulder_l.p, V.sub(gpL, [3, 7, 0]), hint(th, 'l')), gOf(poses[`c${i}`], 'l'), 'l', sd === 'l' ? pole : []);
    const q = b1.q, sh = q.ch[`shoulder_${sd}`];
    // the two representations of the same (near-vertical) arm: one continuing from the key before, one into the key after
    const reps = [{ ...sh }, { plane: sh.plane + 180, elev: 360 - sh.elev, axial: sh.axial + 180 }];
    const near = (o, R0) => ({ plane: r1(nr(o.plane, R0.plane)), elev: r1(o.elev), axial: r1(nr(o.axial, R0.axial)) });
    const dd = (o, R0) => Math.abs(o.plane - R0.plane) + Math.abs(o.elev - R0.elev) + Math.abs(o.axial - R0.axial);
    const inLim = (o) => o.plane >= -60 && o.plane <= 140 && o.elev >= 0 && o.elev <= 210;
    const fit = (o) => { for (const k of [0, 360, -360]) { const v = { ...o, plane: o.plane + k, axial: o.axial + k }; if (inLim(v)) return v; } return null; };
    const pickRep = (R0) => reps.map((o) => fit(near(o, R0))).filter(Boolean).sort((x, y) => dd(x, R0) - dd(y, R0))[0];
    const ra = pickRep(A), rb = pickRep(B);
    const repA = ra, repB = rb;
    // the other arm: in the representation of the key on the side where it has not (yet / any more) switched
    const ref = cross.includes(other) && cross.indexOf(other) < k ? poses[`c${i + 1}`] : poses[`c${i}`];
    const oth = q.ch[`shoulder_${other}`], oR = ref.ch[`shoulder_${other}`];
    const cand = [{ ...oth }, { plane: oth.plane + 180, elev: 360 - oth.elev, axial: oth.axial + 180 }].map((o) => ({ plane: nr(o.plane, oR.plane), elev: o.elev, axial: nr(o.axial, oR.axial) }))
      .filter((o) => o.plane >= -60 && o.plane <= 140 && o.elev >= 0 && o.elev <= 210).sort((x, y) => Math.abs(x.plane - oR.plane) + Math.abs(x.elev - oR.elev) - Math.abs(y.plane - oR.plane) - Math.abs(y.elev - oR.elev));
    if (cand.length) q.ch[`shoulder_${other}`] = { plane: r1(cand[0].plane), elev: r1(cand[0].elev), axial: r1(cand[0].axial) };
    for (const w of ['r', 'l']) q.ch[`wrist_${w}`].pron = r1(nr(q.ch[`wrist_${w}`].pron, poses[`c${i}`].ch[`wrist_${w}`].pron));
    const qa = clone(q), qb = clone(q); qa.ch[`shoulder_${sd}`] = repA; qb.ch[`shoulder_${sd}`] = repB;
    poses[`p${i}${sd}a`] = qa; poses[`p${i}${sd}b`] = qb;
    extraKeys.push({ i, fr, sd, a: `p${i}${sd}a`, b: `p${i}${sd}b`, cost: +(a1.cost + b1.cost).toFixed(2) });
  });
}
const EPS = 1 / 120;
const keyframes = [{ t: 0, pose: 'c0' }];
for (let i = 0; i <= NS; i++) {
  keyframes.push({ t: +tCW(i).toFixed(3), pose: `c${i}` });
  for (const k of extraKeys.filter((x) => x.i === i)) { const tm = tCW(i + k.fr); keyframes.push({ t: +(tm - EPS / 2).toFixed(4), pose: k.a }, { t: +(tm + EPS / 2).toFixed(4), pose: k.b }); }
}
for (let i = NS - 1; i >= 0; i--) {
  for (const k of extraKeys.filter((x) => x.i === i)) { const tm = tCCW(i + k.fr); keyframes.push({ t: +(tm - EPS / 2).toFixed(4), pose: k.b }, { t: +(tm + EPS / 2).toFixed(4), pose: k.a }); }
  keyframes.push({ t: +tCCW(i).toFixed(3), pose: `c${i}` });
}
keyframes.push({ t: 8.4, pose: 'c0' });
keyframes.sort((x, y) => x.t - y.t);
const ex = H.module_(meta, base.contacts, poses, keyframes);
const SIZE = meta.props[0].size;
const held = [{ side: 'r', grip: 'handle', offset: OFF, size: SIZE, skip: ['hand_r', 'thumb_r', 'forearm_r', 'hand_l', 'thumb_l', 'forearm_l'] }];
let handGap = { d: 0 };
// left fist on the handle: its grip point (where the right-hand grip would put the handle) within ~2 cm of the handle line
const gripPt = (W, s) => V.add(W[`wrist_${s}`].p, Q.rot(W[`wrist_${s}`].q, s === 'l' ? [2.2, -7.2, 0] : GRIP_PT));
const rep = K.scanHeld(ex, held, { probe: (W, pz, t) => { const d0 = DB.dumbbellAt(W, 'r', GK), g = gripPt(W, 'l'), v = V.sub(g, d0.c), along = V.dot(v, d0.ax); const d = Math.max(V.len(V.sub(v, V.scale(d0.ax, along))), Math.abs(along) > 16 ? Math.abs(along) - 16 : 0); if (d > handGap.d) handGap = { d: +d.toFixed(2), t: +t.toFixed(2) }; } });
rep.handGap = handGap;
// channel jumps happen only at the twin pole keys (same arm, 1/60 s apart): not gated here
F.gate('dumbbell-halo', rep, { maxJump: 400 });
if (handGap.d > 3.5) { console.error(`FAIL dumbbell-halo: left hand leaves the plate by ${handGap.d} cm at ${handGap.t}s`); process.exitCode = 1; }

const Wc = L.fk(poses.c0, base.contacts), Wr = L.fk(poses.c3, base.contacts), Wb = L.fk(poses.c6, base.contacts);
const set = H.setKin(ex);
set('Path', 'setup', `dumbbell upright in front of the face, centre ${Math.round(RAD(0))} cm in front of the head centre`); set('Path', 'peak', `circle of radius ≈${Math.round(RAD(90))}-${Math.round(RAD(0))} cm around the head centre; closest dumbbell-to-body gap ${rep.clear.d} cm (rig shapes)`);
set('Shoulder elevation', 'setup', `front ≈${Math.round(K.humElev(Wc))}°`); set('Shoulder elevation', 'peak', `right side: right ≈${Math.round(K.humElev(Wr))}°, left ≈${Math.round(K.humElev(Wr, 'l'))}°; behind ≈${Math.round(K.humElev(Wb))}°`);
set('Elbow flexion', 'setup', `front ≈${Math.round(K.elbowAng(Wc))}°`); set('Elbow flexion', 'peak', `behind the head ≈${Math.round(K.elbowAng(Wb))}°`);
set('Trunk', 'setup', 'upright, still'); set('Trunk', 'peak', 'unchanged');
set('Tempo', 'setup', 'Hold 0.9 s in front'); set('Tempo', 'peak', '2.8 s per circle, clockwise then counter-clockwise');
console.log(`Dumbbell Halo: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, extraKeys, ...rep })}`);
