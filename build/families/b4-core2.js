// Batch 4 core family, part 2: helpers shared by the sit-up, crunch variations, side crunch, frog crunch, dumbbell
// overhead crunch and bent-knee lying twist (supine / side-lying on a mat), plus small standing helpers for the dumbbell
// side bend and windmill. Builds on core-a.js (lying base, cradle, planted feet, scan) and core-b.js (one-sided cradle,
// mirror).
//
// Mesh calibration: the Studio clay athlete's back and buttocks are thinner than the RepRig collision shapes, so a body
// whose shapes rest on the floor floats on the skinned mesh (measured: buttocks about 7 cm, upper back about 3 cm, the
// back of the head about 6 cm above the mat for a supine lie). The lying bases here sink the rig shapes by the measured
// mesh offsets so the athlete's skin, not the proxy shapes, rests on the mat. Each module then records the rig-shape
// penetration it needs in checks.floorTolerance (the mesh itself stays on or above the mat; see the authors' reports).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const CA = require('./core-a');
const CB = require('./core-b');

// Skinned-mesh offsets for a supine body: (mesh lowest point) - (rig shape lowest point), cm, measured on the Studio clay
// male (b2/b4c2/bones.mjs). back = upper back (chest shape / spine_04), butt = buttocks (buttock / pelvis shapes),
// head = back of the skull, hand = back of the hands cradling the head, arm = upper arm lying on the mat.
const MESH = { butt: 6.9, back: 1.9, head: 6.4, hand: 10.0, arm: 7.0, calf: 0.6 };

// Arms overhead lift the skin of the upper back off the mat (scapulae rotate up): smaller back offset; head resting on the mat.
const OVERHEAD = { back: 1.0, head: 11.0 };
const bottomOf = CA.bottomOf, minOf = CA.minOf, headPt = CA.headPt;
const HEAD = CB.HEAD;
const headBottom = (W) => Math.min(...HEAD.map((id) => bottomOf(W, id)));

/* ---------------- Supine base on the mat, calibrated to the athlete mesh ---------------- */
// kneeFlex 0 = straight legs; headRest 'hands' (head in the hands) | 'floor' (back of the head on the mat) | 'free'.
function lie({ kneeFlex = 90, headRest = 'hands', m = MESH, pitch = 92 } = {}) {
  const sup = L.POSES.supine({ kneeFlex });
  const base0 = clone(sup.pose);
  base0.root.pos = [0, base0.root.pos[1], 0];
  let p = L.solvePose(base0, ['root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
    (W) => [(bottomOf(W, 'buttock_r') + m.butt) * 4, (bottomOf(W, 'chest') + m.back) * 3, Math.max(0, bottomOf(W, 'ribcage') + m.back - 1.2) * 2, Math.min(0, bottomOf(W, 'ribcage') + m.back) * 4],
    L.obj.reg('ch.spine_l5.flex', -8, 0.15), L.obj.reg('ch.spine_t12.flex', 2, 0.25), L.obj.reg('ch.spine_t6.flex', 4, 0.4), L.obj.reg('root.rot.pitch', pitch, 0.2),
  ]).pose;
  p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  if (headRest === 'floor') p = headTo(p, -m.head + 0.3);
  else if (headRest === 'hands') {
    const cr = (q) => L.solvePose(q, ['ch.neck_c7.flex'], [(W) => [(headPt(W, [CA.HAND_C[0] - 1.8, CA.HAND_C[1], CA.HAND_C[2]])[1] - 1.6 + m.hand) * 3]]).pose;
    p = cr(p); p.ch.head_c1 = { rot: 0, flex: r1(p.ch.neck_c7.flex * 0.45 / 0.55) }; p = cr(p);
  }
  if (!kneeFlex) {
    for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: 2 }; p.ch[`ankle_${s}`] = { dorsi: -25 }; }
    p = L.solvePose(p, ['ch.hip_r.flex'], [(W) => [(minOf(W, ['calf_r', 'foot_r', 'shank_r']) + m.calf - 0.15) * 3]]).pose;
    CA.mirrorLeg(p);
  }
  return p;
}
// Neck/head flexion (55/45 split) so the lowest head shape sits at y (bisection).
function headTo(pose, y, rot = 0) {
  const set = (q, f) => { q.ch.neck_c7 = { rot: r1(rot * 0.4), flex: r1(f * 0.55) }; q.ch.head_c1 = { rot: r1(rot * 0.6), flex: r1(f * 0.45) }; return q; };
  let lo = -40, hi = 60;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (headBottom(L.fk(set(clone(pose), mid))) < y) lo = mid; else hi = mid; }
  return set(clone(pose), (lo + hi) / 2);
}

/* ---------------- Arms straight overhead, in line with the trunk (beside the ears) ---------------- */
// Wrist target in the upper-back (spine_t6) frame: `ang` degrees from the trunk axis toward the front of the chest
// (0 = straight along the spine past the head, 90 = pointing at the ceiling when lying), hands `width` cm apart.
// Elbows nearly straight. Returns the pose with both arms solved (right solved, left mirrored).
function overheadArms(pose, { ang = 20, width = 26, elbow = 6, palms = 'in', guess, floorClr = 0.5, armFloor = MESH.arm } = {}) {
  let p = clone(pose);
  p.ch.sc_r = { protract: 4, elevate: 10 }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.elbow_r = { flex: elbow };
  const W0 = L.fk(p), T = W0.spine_t6, S = W0.shoulder_r.p;
  const up = Q.rot(T.q, [0, 1, 0]), fwd = Q.rot(T.q, [1, 0, 0]), side = Q.rot(T.q, [0, 0, 1]);
  const a = ang * R.DEG, dir = V.norm(V.add(V.scale(up, Math.cos(a)), V.scale(fwd, Math.sin(a))));
  const reach = L.reach(elbow);
  // wrist on the line from the shoulder along dir, pulled in so the hands are `width` apart
  const sideOff = V.dot(V.sub(S, T.p), side) - width / 2;
  let tgt = V.add(S, V.scale(dir, Math.sqrt(Math.max(1, reach * reach - sideOff * sideOff))));
  tgt = V.sub(tgt, V.scale(side, sideOff));
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
  if (guess) for (const j in guess) p.ch[j] = clone(guess[j]);
  else { p.ch.shoulder_r = { plane: 20, elev: 165, axial: 0 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 }; }
  // palms 'in' (facing each other: palm normal toward -side), 'up' (palms toward the ceiling side = fwd)
  const palmDir = palms === 'in' ? V.scale(side, -1) : fwd;
  const objs = [L.obj.at('wrist_r', tgt, 3),
    (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), palmDir).map((v) => v * 1.5),
    L.obj.reg('ch.wrist_r.flex', 0, 0.1), L.obj.reg('ch.wrist_r.dev', 0, 0.1), CA.limitPen(paths, 3),
    (W) => CA.ARM_IDS('r').map((id) => Math.min(0, bottomOf(W, id) + armFloor - floorClr) * 3)];
  let best = null;
  const seeds = guess ? [null] : [[20, 165, 0, 0], [0, 170, 60, 0], [40, 160, -60, 0], [10, 170, 90, 90], [10, 170, -90, -90]];
  for (const sd of seeds) {
    const q = clone(p);
    if (sd) { q.ch.shoulder_r = { plane: sd[0], elev: sd[1], axial: sd[2] }; q.ch.wrist_r = { pron: sd[3], flex: 0, dev: 0 }; }
    const s = L.solvePose(q, paths, objs, { iters: 400 });
    if (!best || s.cost < best.cost) best = s;
  }
  const out = best.pose;
  out.ch.shoulder_r.axial = r1(L.wrap(out.ch.shoulder_r.axial)); out.ch.wrist_r.pron = r1(L.wrap(out.ch.wrist_r.pron));
  CA.mirrorArm(out); out.__cost = best.cost;
  return out;
}
const armOf = (p) => ({ shoulder_r: clone(p.ch.shoulder_r), elbow_r: clone(p.ch.elbow_r), wrist_r: clone(p.ch.wrist_r), sc_r: clone(p.ch.sc_r) });

/* ---------------- Module helpers ---------------- */
// Floor tolerance for a mesh-calibrated module: the deepest rig-shape point over the loop plus a small margin.
function meshFloor(ex, rep, margin = 0.5) {
  ex.checks.floorTolerance = Math.ceil((-rep.floor + margin) * 2) / 2;
  if (ex.checks.floorTolerance < 0.5) ex.checks.floorTolerance = 0.5;
  return ex.checks.floorTolerance;
}

// Whole-loop guard (core-a scan report): slides, still joints, limits, and the floor against the module's floorTolerance.
function guard(name, ex, rep, extra = []) {
  const tol = (ex.checks && ex.checks.floorTolerance) ?? 0.5;
  CA.guard(name, Object.assign({}, rep, { floor: rep.floor + tol - 0.5 }), extra);
}

module.exports = { MESH, OVERHEAD, guard, bottomOf, minOf, headPt, headBottom, lie, headTo, overheadArms, armOf, meshFloor };
