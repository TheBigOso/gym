// Otis-Up (GymVisual #8755; page not readable here, movement from the name and standard coaching). Bilateral: supine on
// a mat, knees bent about 90 degrees, feet flat (planted contacts), one dumbbell held across the chest squeezed between
// the flat palms (two-hand item, palms on the end plates as the svend press). Curl up and keep sitting up while pressing
// the dumbbell toward the ceiling, finishing with the trunk about 80 degrees up and the arms straight overhead; then bring
// the dumbbell back to the chest while rolling down (low back, shoulder blades, head). The classic Otis-up uses a
// weight plate; a held plate is not drawable yet, so a dumbbell (a common variant) is used. Trunk keys from the sit-up.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const B5 = require('./families/b5-misc');
const DB = require('./families/dumbbell');
const S3 = require('./families/b3-shoulders');
const F = require('./families/b6-20');
const meta = require('./meta/otis-up.json');

const KNEE = 88;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const FT = CA.plantFeet(lie0, KNEE);
const lie = FT.pose, P0 = lie.root.rot.pitch, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const LEG = { hip: clone(lie.ch.hip_r), hipL: clone(lie.ch.hip_l) };
const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const sitBottom = (W) => Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'pelvis'));
const SIT0 = sitBottom(L.fk(lie));
function setP(q, P, drop = 0) {
  q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop);
  q.ch.hip_r = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) });
  q.ch.hip_l = Object.assign(clone(LEG.hipL), { flex: r1(LEG.hipL.flex + (P0 - P)) });
  return q;
}
function trunk(k) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  let P = P0;
  if (k.fromFloor != null) {
    let hi = P0 + 10, lo = hi;
    while (lo > 0 && trunkFromFloor(L.fk(setP(clone(p), lo))) <= k.fromFloor) { hi = lo; lo -= 2; }
    for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (trunkFromFloor(L.fk(setP(clone(p), P))) > k.fromFloor) lo = P; else hi = P; }
  } else P = P0 + (k.pitch || 0);
  setP(p, P);
  const W = L.fk(p, FT.contacts), drop = Math.max(0, sitBottom(W) - SIT0);
  setP(p, P, drop);
  let q = p;
  for (const s of ['r', 'l']) q = CA.fitLeg(q, s, FT.targets[s], FT.contacts);
  q.ik = clone(lie.ik);
  return q;
}

/* ---------------- Arms: dumbbell squeezed between the palms ---------------- */
const GZ = 15;                                   // grip points 30 cm apart (palms on the end plates)
const ARM = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const tframe = (W) => ({ o: W.spine_t6.p, x: Q.rot(W.spine_t6.q, [1, 0, 0]), y: Q.rot(W.spine_t6.q, [0, 1, 0]), z: Q.rot(W.spine_t6.q, [0, 0, 1]) });
const inT = (T, v) => V.add(V.add(V.add(T.o, V.scale(T.x, v[0])), V.scale(T.y, v[1])), V.scale(T.z, v[2]));
// key: { g: grip point in the t6 frame [ant, cranial, right] or 'up' (world vertical above the shoulder, dist), thumb in t6 frame }
function arms(p, key, prev) {
  const W = L.fk(p), T = tframe(W), S = W.shoulder_r.p;
  let G;
  if (key.up != null) { const d = key.up; G = [S[0] + (key.fwd || 0), S[1] + Math.sqrt(Math.max(1, d * d - (key.fwd || 0) ** 2 - (GZ - S[2]) ** 2)), GZ]; }
  else { const g = inT(T, key.g); G = [g[0], g[1], GZ]; }
  const thumb = V.norm(inT({ o: [0, 0, 0], x: T.x, y: T.y, z: T.z }, key.thumb));
  const E = S3.elbowFor(S, V.add(G, V.scale(V.norm(V.sub(G, S)), -6)), key.elbowHint(T));
  const q0 = clone(p);
  if (prev) for (const j of ['shoulder_r', 'elbow_r', 'wrist_r']) q0.ch[j] = clone(prev.ch[j]);
  else { q0.ch.shoulder_r = { plane: 70, elev: 60, axial: -60 }; q0.ch.elbow_r = { flex: 110 }; q0.ch.wrist_r = { pron: 90, flex: 0, dev: 0 }; }
  const r = L.solvePose(q0, ARM, [
    (Wx) => V.sub(DB.dumbbellAt(Wx, 'r').c, G).map((v) => v * 4),
    (Wx) => V.sub(Wx.elbow_r.p, E).map((v) => v * 0.5),
    (Wx) => V.sub(Q.rot(Wx.wrist_r.q, [1, 0, 0]), [0, 0, -1]).map((v) => v * 6),
    (Wx) => V.sub(Q.rot(Wx.wrist_r.q, [0, 0, 1]), thumb).map((v) => v * 1),
    (Wx, q) => [q.ch.wrist_r.flex * 0.03, q.ch.wrist_r.dev * 0.04, Math.max(0, Math.abs(q.ch.wrist_r.flex) - 60), Math.max(0, Math.abs(q.ch.wrist_r.dev) - 25), Math.max(0, q.ch.shoulder_r.elev - 205) * 3],
    CA.limitPen(['ch.elbow_r.flex', 'ch.shoulder_r.elev', 'ch.shoulder_r.plane', 'ch.wrist_r.flex', 'ch.wrist_r.dev'], 5),
  ], { iters: 600 });
  const Wq = L.fk(r.pose);
  const out = S3.mirrorArm(r.pose);
  out.__err = +V.len(V.sub(DB.dumbbellAt(Wq, 'r').c, G)).toFixed(2);
  return out;
}
const CHEST = { g: [30, 0, GZ], thumb: [0, 1, 0], elbowHint: (T) => V.add(V.scale(T.x, -0.3), V.scale(T.z, 1)) };
const MID = (d, fwd) => ({ up: d, fwd, thumb: [-0.5, 0.85, 0], elbowHint: (T) => V.add(V.scale(T.y, -0.3), V.scale(T.z, 1)) });
const OVER = { up: L.reach(8) + 5, fwd: 4, thumb: [-0.6, 0.8, 0], elbowHint: (T) => V.add(V.scale(T.x, -0.2), V.scale(T.z, 1)) };
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, arm: CHEST },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 30, pitch: 1, arm: CHEST },
  { name: 'rise', l5: 20, t12: 20, t6: 17, neck: 26, fromFloor: 40, arm: MID(44, 8) },
  { name: 'top', l5: 30, t12: 17, t6: 12, neck: 18, fromFloor: 78, arm: OVER },
  { name: 'topHold', l5: 30.5, t12: 17.5, t6: 12, neck: 18, fromFloor: 79, arm: OVER },
  { name: 'lower', l5: 32, t12: 22, t6: 16, neck: 22, fromFloor: 45, arm: MID(40, 8) },
  { name: 'lowBack', l5: 8, t12: 16, t6: 17, neck: 28, pitch: 0, arm: CHEST },
  { name: 'touch', l5: 0, t12: 3, t6: 6, neck: 16, pitch: 0, arm: CHEST },
];
// Each key: trunk pose, then the arms. Between keys, in-between poses blend the trunk channels and the grip target
// (shoulder-relative) so the arm solve stays on one branch and the grip width holds between keys.
const TIMES = [0, 1.5, 2.0, 2.5, 3.0, 4.0, 4.7, 5.1];
const tr = KEYS.map((k) => trunk(k));
const gripRel = (p, key) => { const W = L.fk(p), T = tframe(W), S = W.shoulder_r.p; let G; if (key.up != null) { const d = key.up; G = [S[0] + (key.fwd || 0), S[1] + Math.sqrt(Math.max(1, d * d - (key.fwd || 0) ** 2 - (GZ - S[2]) ** 2)), GZ]; } else { const g = inT(T, key.g); G = [g[0], g[1], GZ]; } return V.sub(G, S); };
const lerp = (a, b, f) => a + (b - a) * f;
function blendTrunk(pa, pb, f) {
  const q = clone(pa);
  q.root.pos = pa.root.pos.map((v, i) => r1(lerp(v, pb.root.pos[i], f))); q.root.rot.pitch = r1(lerp(pa.root.rot.pitch, pb.root.rot.pitch, f));
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6', 'neck_c7', 'head_c1']) for (const c in pa.ch[j]) q.ch[j][c] = r1(lerp(pa.ch[j][c], pb.ch[j][c], f));
  let out = q; for (const s of ['r', 'l']) out = CA.fitLeg(out, s, FT.targets[s], FT.contacts);
  out.ik = clone(lie.ik); return out;
}
function armAt(p, ka, kb, f, Ra, Rb, prev) {
  const W = L.fk(p), S = W.shoulder_r.p, rel = Ra.map((v, i) => lerp(v, Rb[i], f));
  const key = { g: null, up: null, thumb: ka.thumb.map((v, i) => lerp(v, kb.thumb[i], f)), elbowHint: (T) => V.add(V.scale(ka.elbowHint(T), 1 - f), V.scale(kb.elbowHint(T), f)) };
  const G = V.add(S, rel); key.up = null; key.g = null;
  return armsAtG(p, [G[0], G[1], GZ], key, prev);
}
function armsAtG(p, G, key, prev) {
  const T = tframe(L.fk(p)), k2 = Object.assign({}, key, { g: null });
  // express G in the t6 frame so arms() can use it
  const d = V.sub(G, T.o); k2.g = [V.dot(d, T.x), V.dot(d, T.y), V.dot(d, T.z)];
  return arms(p, k2, prev);
}
const poses = {}, err = {}, keyframes = []; let prev = null;
const NB = 3;
for (let i = 0; i < KEYS.length; i++) {
  const k = KEYS[i];
  if (i === 0) { const p = arms(tr[0], k.arm, null); err[k.name] = p.__err; delete p.__err; poses[k.name] = p; prev = p; keyframes.push({ t: 0, pose: k.name }, { t: 0.8, pose: k.name }); continue; }
  const ka = KEYS[i - 1], Ra = gripRel(tr[i - 1], ka.arm), Rb = gripRel(tr[i], k.arm), t0 = i === 1 ? 0.8 : TIMES[i - 1];
  for (let n = 1; n <= NB; n++) {
    const f = n / (NB + 1), nm = `${ka.name}_${k.name}${n}`, q = armAt(blendTrunk(tr[i - 1], tr[i], f), ka.arm, k.arm, f, Ra, Rb, prev);
    err[nm] = q.__err; delete q.__err; poses[nm] = q; prev = q;
    keyframes.push({ t: +(t0 + (TIMES[i] - t0) * f).toFixed(3), pose: nm });
  }
  const p = arms(tr[i], k.arm, prev); err[k.name] = p.__err; delete p.__err; poses[k.name] = p; prev = p;
  keyframes.push({ t: TIMES[i], pose: k.name });
}
// roll back down to lying: touch -> lie
keyframes.push({ t: 5.6, pose: 'lie' }, { t: 6.4, pose: 'lie' });
const ex = CA.buildModule(meta, poses, keyframes, FT.contacts);
ex.props = [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [190, 0.6, 66] }, { id: 'db', kind: 'dumbbell', size: [32, 12, 12], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } }];
const band = [76, 82].map((a) => trunk(Object.assign({}, KEYS[3], { fromFloor: a })).ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...band)) - 1, max: Math.ceil(Math.max(...band)) + 1 };

let clr = { d: 1e9 }, gap = [999, -999], dbLow = 1e9;
const rep = CA.scan(ex, { trunk: (W) => trunkFromFloor(W), probe: (W, pz) => { const c = B5.twoHandDbClear(W); if (c.d < clr.d) clr = c; dbLow = Math.min(dbLow, c.minY); const gg = B5.twoHandDb(W).gripGap; gap = [Math.min(gap[0], gg), Math.max(gap[1], gg)]; return 0; } });
delete rep.probe;
const Wl = L.fk(lie, FT.contacts), Wt = L.fk(poses.topHold, FT.contacts), pk = poses.topHold;
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
F.setKin(ex, 'Trunk angle', 'Lying (shoulder blades on the mat)', `${F.deg(trunkFromFloor(Wt))} from the floor`);
F.setKin(ex, 'Hip flexion', F.deg(lie.ch.hip_r.flex), `${F.deg(pk.ch.hip_r.flex)} (pelvis rolled toward the thighs)`);
F.setKin(ex, 'Arms', `Dumbbell at the chest (elbows ${F.deg(elbowAng(Wl))})`, `Overhead (elbows ${F.deg(elbowAng(Wt))}), dumbbell ${Math.round(B5.twoHandDb(Wt).c[1] - Wt.shoulder_r.p[1])} cm above the shoulders`);
F.setKin(ex, 'Grip', 'Dumbbell squeezed between flat palms', `Grip points ${r1(gap[0])}-${r1(gap[1])} cm apart through the loop`);
F.setKin(ex, 'Tempo', 'Lie 0.8 s', '1.7 s up and press, 0.5 s hold, 2.6 s down, 0.8 s settle');
console.log(`Otis-Up: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  armErr ${JSON.stringify(err)} clear ${JSON.stringify(clr)} gap ${gap.map(r1)} dbLow ${r1(dbLow)}`);
// Near overhead the ISB plane and axial channels partly cancel (Y-X-Y angles), so check what is drawn instead: the
// fastest elbow and hand-axis motion over the loop (a branch flip would show as a spike).
const sp = (() => { const tl = R.buildTimeline(ex), n = 1600, D = ex.timeline.duration; let pe = null, ph = null, ve = 0, vh = 0, at = 0;
  for (let i = 0; i <= n; i++) { const W = R.evalPose(L.rig, tl.pose((i / n) * D), ex.contacts), e = W.elbow_r.p, h = Q.rot(W.wrist_r.q, [0, 0, 1]);
    if (pe) { const v = V.len(V.sub(e, pe)) / (D / n), w = V.angle(h, ph) / (D / n); if (v > ve) { ve = v; at = (i / n) * D; } vh = Math.max(vh, w); } pe = e; ph = h; }
  return { elbowCmS: Math.round(ve), handDegS: Math.round(vh), at: +at.toFixed(2) }; })();
console.log('  speed', JSON.stringify(sp));
CA.guard('otis-up', rep, [sp.handDegS > 400 && `hand orientation snaps ${JSON.stringify(sp)}`, clr.d < -0.3 && `dumbbell passes into the body (${clr.d} ${clr.what})`, gap[1] - gap[0] > 1.5 && `grip width changes ${gap.map(r1)}`, dbLow < 0 && 'dumbbell below the floor', Math.max(...Object.values(err)) > 1.5 && 'arm targets missed']);
