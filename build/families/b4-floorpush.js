// Batch 4 "floorpush" family helpers: push-up variants and floor presses.
//  - makePushG: the batch 2 push-up solver (push.js) generalised so the feet can rest on a raised surface (decline push-up)
//    and the toes can be placed at a chosen x. Same key / rep / stats API as push.js makePush, plus `armFK` to turn a
//    planted arm into FK channels (hand lift-off for the plyo push-up and the side plank).
//  - pike helpers (inverted V, hips high) and the push-up to side plank roll live in their authors; shared bits are here.
//  - Floor lying with dumbbells: lieFloor (supine on the mat, knees bent, feet planted) and floorSweep (feet slide, floor,
//    dumbbells vs floor / body / each other). The dumbbell arm solves come from b3-chest.js (pressPath, flyPath, solveArmDB).
// The Studio clay athlete differs from the rig shapes: lying on the floor its back and head sit a few cm above where the rig
// shapes touch (measured with b2/b4fp/mesh.mjs); the rig shapes may not go below the floor (verify, 0.5 cm), so the floor
// authors place the rig shapes on the floor (within that tolerance) and report the measured mesh gaps.
const L = require('../lib');
const { R, V, Q, rig, r1, clone, fk, solvePose } = L;
const H = require('./hips');
const C = require('./b3-chest');

const PALM = 2.6;                 // wrist joint height above the surface the palm rests on (lib plank, athlete PALM_RR)
const LEG_KNEE = 8;
const legLen = (kf) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(kf * R.DEG)); };
const dist = (a, b) => V.len(V.sub(a, b));
const trunkDir = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
const midS = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
const sag = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / R.DEG;
const shapeOf = (id) => rig.shapes.find((s) => s.id === id);
const CHEST = ['chest', 'pecs_r', 'pecs_l', 'ribcage'];
const shapeBottom = (W, s) => { const g = R.shapeWorld(W, s); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const lowPoint = (g) => { const n = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); return g.axes.reduce((c, a) => V.sub(c, V.scale(a, a[1] / n)), g.c); };
const chestMinY = (W) => Math.min(...CHEST.map((id) => shapeBottom(W, shapeOf(id))));
const minOf = (W, ids) => Math.min(...ids.map((id) => shapeBottom(W, shapeOf(id))));
const footMin = (A, q, s) => { const g = R.shapeWorld({ [`ankle_${s}`]: { p: A, q } }, shapeOf(`foot_${s}`)); return g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
const dorsiOf = (W, s) => ANKLE_REST - V.angle(V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p));
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
function elbowFlare(W, s) {
  const t = trunkDir(W), side = V.norm(V.sub(W[`shoulder_${s}`].p, W[`shoulder_${s === 'r' ? 'l' : 'r'}`].p));
  const ua = V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p);
  return Math.atan2(V.dot(ua, side), -V.dot(ua, t)) / R.DEG;
}
const wristExt = (W, s) => V.angle(V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`handtip_${s}`].p, W[`wrist_${s}`].p));
const elbowFlexOf = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));

// Fit FK leg channels to an IK solution (stored channels then match what is drawn; verify checks their limits).
function matchLeg(pose, s, cs) {
  const Wi = fk(pose, cs), p = clone(pose);
  const set = (x) => { const q = clone(p); q.ch[`hip_${s}`] = { flex: x[0], abd: x[1], rot: x[2] }; q.ch[`knee_${s}`] = { flex: x[3] }; q.ch[`ankle_${s}`] = { dorsi: x[4] }; return q; };
  const res = (x) => { const W = fk(set(x)); return [...V.sub(W[`knee_${s}`].p, Wi[`knee_${s}`].p), ...V.sub(W[`ankle_${s}`].p, Wi[`ankle_${s}`].p), ...V.sub(W[`toe_${s}`].p, Wi[`toe_${s}`].p).map((v) => v * 0.15)].concat([x[1] * 0.05, x[2] * 0.05]); };
  const c = p.ch[`hip_${s}`] || {}, x0 = [c.flex || 0, c.abd || 0, c.rot || 0, (p.ch[`knee_${s}`] || {}).flex || 5, (p.ch[`ankle_${s}`] || {}).dorsi || 0];
  return set(R.solveLM(x0, res, { iters: 300 }).x.map(L.wrap).map(r1));
}
// Fit FK arm channels (shoulder, elbow) to the IK elbow and wrist.
function matchArm(pose, s, cs) {
  const Wi = fk(pose, cs), p = clone(pose);
  const set = (x) => { const q = clone(p); q.ch[`shoulder_${s}`] = { plane: x[0], elev: x[1], axial: x[2] }; q.ch[`elbow_${s}`] = { flex: x[3] }; return q; };
  const lim = (v, a, b) => (v < a ? a - v : v > b ? v - b : 0);
  const res = (x) => { const W = fk(set(x)); return [...V.sub(W[`elbow_${s}`].p, Wi[`elbow_${s}`].p), ...V.sub(W[`wrist_${s}`].p, Wi[`wrist_${s}`].p)].concat([x[2] * 0.01, lim(x[0], -60, 140), lim(x[1], 0, 180), lim(x[2], -90, 90), lim(x[3], 0, 150)]); };
  const c = p.ch[`shoulder_${s}`] || {}, f0 = (p.ch[`elbow_${s}`] || {}).flex || 5;
  let best = null;
  for (const g of [[90, 78, 0, f0], [90, 60, 0, 90], [60, 70, 20, 90], [120, 70, -20, 90], [90, 40, 0, 120], [90, 150, 0, 60], [c.plane ?? 90, c.elev ?? 78, c.axial ?? 0, f0]]) { const so = R.solveLM(g, res, { iters: 400 }); if (!best || so.cost < best.cost) best = so; }
  return set(best.x.map(r1));
}
// Planted arm -> full FK arm (shoulder, elbow AND wrist channels matching the IK hand orientation), so the contact can be
// released (weight 0) on an identical-looking pose. `target` may be lifted off the floor for a hand in the air.
const ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 90, elev: 78, axial: 0 }, [`elbow_${s}`]: { flex: 10 } }, { [`shoulder_${s}`]: { plane: 90, elev: 70, axial: 40 }, [`elbow_${s}`]: { flex: 40 } }, { [`shoulder_${s}`]: { plane: 90, elev: 70, axial: -40 }, [`elbow_${s}`]: { flex: 40 } }];
function armFK(pose, s, contact, target, guess) {
  const g = guess || ARM_GUESS(s).map((x) => { const y = clone(x); y[`shoulder_${s}`] = clone(pose.ch[`shoulder_${s}`] || y[`shoulder_${s}`]); y[`elbow_${s}`] = clone(pose.ch[`elbow_${s}`] || y[`elbow_${s}`]); return y; }).concat(ARM_GUESS(s));
  const out = H.fitArm(pose, s, contact, target, g);
  delete out.__cost;
  return out;
}

// The skinned athlete's shoulder (upper-arm bone head) sits at a fixed point in the rig scapula (sc) frame, about 5 cm
// toward the back and the pelvis from the rig shoulder joint, and its arm (shoulder to wrist) is 50.5 cm long against the
// rig's 55 (measured on push-up, pike and glute-bridge frames with b2/b4fp/bonepos.mjs). A planted palm is drawn on the
// floor only if the wrist target is within that reach of the mesh shoulder.
const MESH_SH = [-5.1, -5.6, 17.5], MESH_ARM = 50.5;
const meshShoulder = (W, s = 'r') => V.add(W[`sc_${s}`].p, Q.rot(W[`sc_${s}`].q, s === 'r' ? MESH_SH : [MESH_SH[0], MESH_SH[1], -MESH_SH[2]]));
const meshReach = (W, s, target) => dist(meshShoulder(W, s), target);
const MESH_UA = 24.5, MESH_FA = 26.0;
// Elbow flexion of the drawn (skinned) arm for a planted wrist target (law of cosines on the mesh arm)
// Wrist of the drawn arm when the arm is FK (contact released): mesh shoulder plus the rig segment directions at mesh lengths
const meshWristFK = (W, s = 'r') => { const S = meshShoulder(W, s), u = V.norm(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p)), f = V.norm(V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p)); return V.add(V.add(S, V.scale(u, MESH_UA)), V.scale(f, MESH_FA)); };
const meshElbow = (W, s, target) => { const d = Math.min(MESH_UA + MESH_FA - 0.05, meshReach(W, s, target)); return 180 - Math.acos((MESH_UA ** 2 + MESH_FA ** 2 - d * d) / (2 * MESH_UA * MESH_FA)) / R.DEG; };

/**
 * makePushG({ handY, handZ, footY, toeX, ankleZ, flarePole, footTilt })
 *  handY: surface under the palms; footY: surface under the toes (0 floor, 45 bench); toeX: toe joint x (default: lib plank).
 */
function makePushG({ handY = 0, handZ = 24, footY = 0, toeX = null, ankleZ = 8, flarePole = [-1, 0.25, 0.75], footTilt = 0, legKnee = LEG_KNEE, footQuat = null } = {}) {
  const LEG_D = legLen(legKnee);
  const P = L.POSES.plank();
  const base = clone(P.pose);
  base.ch.hip_r = { flex: 0, abd: 0, rot: 0 }; base.ch.hip_l = { flex: 0, abd: 0, rot: 0 };
  const W0 = fk(base);
  const qz = Q.axis([0, 0, 1], footTilt);
  // footQuat (right foot, world): e.g. laces down on a bench = the standing foot turned 180 degrees about z
  const footQ = footQuat ? { r: Q.norm(footQuat).map((v) => +v.toFixed(6)), l: Q.norm(Q.mirrorZ(footQuat)).map((v) => +v.toFixed(6)) }
    : { r: Q.norm(Q.mul(qz, W0.ankle_r.q)).map((v) => +v.toFixed(6)), l: Q.norm(Q.mul(qz, W0.ankle_l.q)).map((v) => +v.toFixed(6)) };
  const anchor = (s) => {
    const z = s === 'r' ? ankleZ : -ankleZ, toe = W0[`toe_${s}`].p, q = footQ[s];
    let A = V.sub([toeX ?? toe[0], toe[1], z], Q.rot(q, rig.byId[`toe_${s}`].offset));
    A = V.add(A, [0, footY + 0.05 - footMin(A, q, s), 0]);
    return A.map((v) => +v.toFixed(2));
  };
  const AR = anchor('r'), AL = anchor('l');
  const contacts = [
    Object.assign(L.handContact('r'), { pole: flarePole.slice() }),
    Object.assign(L.handContact('l'), { pole: [flarePole[0], flarePole[1], -flarePole[2]] }),
    Object.assign(L.legContact('r'), { pole: [0.3, -1, 0.08], handRot: footQ.r }),
    Object.assign(L.legContact('l'), { pole: [0.3, -1, -0.08], handRot: footQ.l }),
  ];
  const BEND0 = sag(V.sub(W0.hip_l.p, W0.ankle_l.p), trunkDir(W0));
  function headSc(p, u, neck = 0) {
    p.ch.sc_r = { protract: r1(8 - 7 * u), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
    const f = 3 - 7 * u + neck; p.ch.neck_c7 = { rot: 0, flex: r1(f * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(f * 0.55) };
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j) => { p.ch[j] = { rot: 0, flex: 0, latFlex: 0 }; });
    return p;
  }
  const WR0 = (handX) => [r1(handX), r1(handY + PALM), handZ], WL0 = (handX) => [r1(handX), r1(handY + PALM), -handZ];
  // Body key: solve root x / y / pitch for straight legs (hip-ankle = LEG_D), a straight body line and either the arm
  // length armD (shoulder to the planted wrist), the chest height chestY, or (free hands) the chest height alone.
  function body(handX, { armD, meshD, chestY, u, neck = 0 }) {
    const WR = WR0(handX);
    const p = headSc(clone(base), u, neck);
    const objs = [
      (W) => [(dist(W.hip_r.p, AR) - LEG_D) * 4, (dist(W.hip_l.p, AL) - LEG_D) * 4],
      (W) => [(sag(V.sub(W.hip_l.p, AL), trunkDir(W)) - BEND0) * 0.4],
    ];
    if (meshD != null) objs.push((W) => [(meshReach(W, 'r', WR) - meshD) * 4, Math.max(0, dist(W.shoulder_r.p, WR) - L.reach(5)) * 4]);
    else if (armD != null) objs.push((W) => [(dist(W.shoulder_r.p, WR) - armD) * 4]);
    else objs.push((W) => [(chestMinY(W) - chestY) * 4]);
    p.root.pos = [p.root.pos[0], p.root.pos[1] + handY * 0.8 + footY * 0.8, 0];
    p.root.rot.pitch = p.root.rot.pitch + handY * 0.5 - footY * 0.4;
    return solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, { iters: 400 });
  }
  function key(handX, o) {
    const s = body(handX, o);
    let q = s.pose;
    q.ik = { arm_r: { target: WR0(handX), weight: 1 }, arm_l: { target: WL0(handX), weight: 1 }, leg_r: { target: AR, weight: 1 }, leg_l: { target: AL, weight: 1 } };
    for (const sd of ['r', 'l']) { q = matchLeg(q, sd, contacts); q = matchArm(q, sd, contacts); }
    return { pose: q, cost: s.cost };
  }
  // Fully FK arms (hands released, weight 0) for a body key; lift: cm the wrists sit above the planted target.
  // The drawn FK hand differs from the rig wrist (shorter skinned arm, offset shoulder): the rig target is corrected so the
  // drawn wrist lands at the wanted point (planted spot + lift), so the hands do not slide when the contact is released (horizontally; the drawn hand may sit a little higher).
  function freeArms(q, handX, lift = 0, dx = 0) {
    let p = clone(q);
    for (const sd of ['r', 'l']) {
      const T = sd === 'r' ? WR0(handX) : WL0(handX), want = [T[0] + dx, T[1] + lift, T[2]], c = contacts.find((x) => x.id === `arm_${sd}`);
      let tgt = want.slice(), out = null;
      for (let it = 0; it < 4; it++) { out = armFK(p, sd, c, tgt); const M = meshWristFK(fk(out), sd); tgt = [tgt[0] + want[0] - M[0], want[1], tgt[2] + want[2] - M[2]]; } // horizontal only: the rig wrist never goes below its planted height
      p = out;
    }
    p.ik.arm_r = { target: WR0(handX), weight: 0 }; p.ik.arm_l = { target: WL0(handX), weight: 0 };
    return p;
  }
  function stats(p) {
    const W = fk(p, contacts), m = R.measures(W), t = trunkDir(W), WR = p.ik.arm_r.target;
    const bodyAng = Math.atan2(t[1], t[0]) / R.DEG;
    return {
      elbow: m.elbowR, elbowL: m.elbowL, flare: elbowFlare(W, 'r'), wristExt: wristExt(W, 'r'), chestY: chestMinY(W), sh: W.shoulder_r.p[1],
      shAhead: midS(W)[0] - WR[0], bodyAng, bend: sag(V.sub(W.hip_l.p, AL), t) - BEND0,
      knee: kneeOf(W, 'r'), dorsi: dorsiOf(W, 'r'), armD: dist(W.shoulder_r.p, WR), legD: dist(W.hip_r.p, AR), minY: L.shapeMinY(W),
      handW: 2 * handZ, shW: dist(W.shoulder_r.p, W.shoulder_l.p), wristY: W.wrist_r.p[1], drawnElbow: meshElbow(W, 'r', WR), meshReach: meshReach(W, 'r', WR),
    };
  }
  // Sweep: planted wrist / ankle error (weight-1 frames), floor, dorsi / knee range and clearance above box props
  // (props: [{ prop, skip: RegExp of shapes allowed to rest on it }]).
  function sweep(ex, props = [], n = 800) {
    const tl = R.buildTimeline(ex), out = { arm: 0, leg: 0, floor: 1e9, prop: 1e9, dorsi: [99, -99], knee: 0, wristMax: 0 };
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * ex.timeline.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
      for (const sd of ['r', 'l']) { const k = pose.ik[`arm_${sd}`]; if ((k.weight ?? 1) >= 0.999) out.arm = Math.max(out.arm, dist(W[`wrist_${sd}`].p, k.target)); }
      out.leg = Math.max(out.leg, dist(W.ankle_r.p, AR), dist(W.ankle_l.p, AL));
      out.wristMax = Math.max(out.wristMax, W.wrist_r.p[1] - (handY + PALM));
      const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
      const d = dorsiOf(W, 'r'); out.dorsi = [Math.min(out.dorsi[0], d), Math.max(out.dorsi[1], d)]; out.knee = Math.max(out.knee, kneeOf(W, 'r'));
      for (const { prop, skip } of props) {
        const x0 = prop.center[0] - prop.size[0] / 2, x1 = prop.center[0] + prop.size[0] / 2, z0 = prop.center[2] - prop.size[2] / 2, z1 = prop.center[2] + prop.size[2] / 2, top = prop.center[1] + prop.size[1];
        for (const s of rig.shapes) {
          if (skip && skip.test(s.id)) continue;
          const g = R.shapeWorld(W, s);
          const pts = g.kind === 'capsule' ? [[g.a, g.r[0]], [g.b, g.r[1]]].map(([c, r]) => [c[0], c[1] - r, c[2]]) : [lowPoint(g)];
          for (const [x, y, z] of pts) if (x > x0 && x < x1 && z > z0 && z < z1 && y - top < out.prop) { out.prop = y - top; out.propAt = [s.id, +t.toFixed(2)]; }
        }
      }
    }
    for (const k of ['arm', 'leg', 'floor', 'prop', 'knee', 'wristMax']) out[k] = +out[k].toFixed(3);
    out.dorsi = out.dorsi.map((v) => +v.toFixed(1));
    return out;
  }
  // One repetition like push.js rep(): top -> eased lowering keys -> bottom -> pause -> pressing keys -> top.
  // meshSlack: the top is solved so the drawn (skinned) arm is that many cm short of its full reach (palms on the floor,
  // arms straight on screen); without it the rig arm is set to topElbow degrees of flexion.
  const topKey = (handX, { topElbow = 8, meshSlack = null, neck = 0 } = {}) => key(handX, meshSlack != null ? { meshD: MESH_ARM - meshSlack, u: 0, neck } : { armD: L.reach(topElbow), u: 0, neck });
  function rep(handX, { topElbow = 8, meshSlack = null, botChest = 8, T, nDown = 6, nUp = 4, neck = 0 }) {
    const ease = (f) => f * f * (3 - 2 * f);
    const top = topKey(handX, { topElbow, meshSlack, neck }).pose, bottom = key(handX, { chestY: handY + botChest, u: 1, neck }).pose;
    const cTop = chestMinY(fk(top, contacts)), cBot = handY + botChest;
    const poses = { top, bottom };
    const t0 = T.hold, t1 = t0 + T.down, t2 = t1 + T.pause, t3 = t2 + T.up;
    const keyframes = [{ t: 0, pose: 'top' }, { t: t0, pose: 'top' }];
    for (let i = 1; i < nDown; i++) { const u = ease(i / nDown), nm = `down${i}`; poses[nm] = key(handX, { chestY: cTop + (cBot - cTop) * u, u, neck }).pose; keyframes.push({ t: +(t0 + (T.down * i) / nDown).toFixed(3), pose: nm }); }
    keyframes.push({ t: t1, pose: 'bottom' });
    poses.bottomHold = key(handX, { chestY: cBot + 0.4, u: 1, neck }).pose;
    keyframes.push({ t: +((t1 + t2) / 2).toFixed(3), pose: 'bottomHold' }, { t: t2, pose: 'bottom' });
    for (let i = 1; i < nUp; i++) { const u = 1 - ease(i / nUp), nm = `up${i}`; poses[nm] = key(handX, { chestY: cTop + (cBot - cTop) * u, u, neck }).pose; keyframes.push({ t: +(t2 + (T.up * i) / nUp).toFixed(3), pose: nm }); }
    keyframes.push({ t: t3, pose: 'top' }, { t: T.D, pose: 'top' });
    return { poses, keyframes, cTop, cBot };
  }
  return { base, contacts, AR, AL, footQ, key, topKey, body, freeArms, rep, stats, sweep, LEG_D, PALM, handY, handZ, footY, chestMinY, WR0, WL0 };
}

/* ---------------- Floor lying with dumbbells ---------------- */
// Supine on the mat, head toward -X, knees bent with the feet flat (leg contacts), shoulder blades set back and down.
function lieFloor({ knee = 80, footZ = 16, yaw = 8 } = {}) {
  const CA = require('./core-a');
  const lie = CA.lie({ kneeFlex: 90, headRest: 'floor' });
  let p = clone(lie.pose);
  p.ch.sc_r = clone(C.SC); p.ch.sc_l = clone(C.SC);
  const contacts = C.footContacts(yaw);
  const fx = C.footXForKnee(p, contacts, footZ, knee);
  p = C.plantFeet(p, contacts, fx, footZ);
  return { base: p, contacts, foot: [fx, L.ANKLE_H, footZ] };
}
// Lowest point of the arm shapes of one side (cm above the floor)
const ARM_SHAPES = (s) => rig.shapes.filter((x) => new RegExp(`^(upperarm|biceps|deltoid|triceps|forearm|elbow)_${s}$`).test(x.id)).map((x) => x.id);
const armMinY = (W, s = 'r') => minOf(W, ARM_SHAPES(s));
// Whole-loop scan for floor dumbbell work: planted contacts (weight-1 frames), floor, dumbbells vs floor / body / each other
function floorSweep(ex, { grips, n = 600, probe } = {}) {
  const tl = R.buildTimeline(ex), Dn = ex.timeline.duration, out = { slide: 0, floor: 1e9, dbFloor: 1e9, dbBody: -1e9, armFloor: 1e9 };
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Dn, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    for (const c of ex.contacts) { const k = pz.ik && pz.ik[c.id]; if (!k || (k.weight ?? 1) < 0.999) continue; out.slide = Math.max(out.slide, dist(W[c.chain[2]].p, k.target)); }
    const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
    out.armFloor = Math.min(out.armFloor, armMinY(W, 'r'));
    if (grips.length === 2) {
      const a = C.dbAt(W, grips[0].side, grips[0].grip, grips[0].off), b = C.dbAt(W, grips[1].side, grips[1].grip, grips[1].off);
      let m = 1e9;
      for (const p of C.dbPoints(a)) for (const pc of b.plates) { const dl = V.sub(p, pc), ax = V.dot(dl, b.ax), rad = V.len(V.sub(dl, V.scale(b.ax, ax))); const qx = rad - b.r, qy = Math.abs(ax) - b.plateLen / 2; m = Math.min(m, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0)); }
      out.dbGap = [Math.min(out.dbGap ? out.dbGap[0] : 1e9, +m.toFixed(2)), Math.max(out.dbGap ? out.dbGap[1] : -1e9, +m.toFixed(2))];
    }
    for (const g of grips) {
      const d = C.dbAt(W, g.side, g.grip, g.off);
      out.dbFloor = Math.min(out.dbFloor, Math.min(...d.ends.map((e) => e[1])) - d.r);
      const pen = C.dbBodyPen(W, d, g.skip || [new RegExp(`^(hand|thumb|forearm)_${g.side}$`)]); if (pen.depth > out.dbBody) { out.dbBody = pen.depth; out.dbBodyAt = [g.side, pen.id, +t.toFixed(2)]; }
    }
    if (probe) probe(W, pz, t, out);
  }
  for (const k of ['slide', 'floor', 'dbFloor', 'dbBody', 'armFloor']) out[k] = +out[k].toFixed(2);
  return out;
}
// Bisection on a monotone function f(x) for f(x) = 0 on [a, b]
function bisect(f, a, b, it = 40) { let fa = f(a); for (let i = 0; i < it; i++) { const m = (a + b) / 2, fm = f(m); if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; }

module.exports = { MESH_SH, MESH_ARM, meshShoulder, meshReach, meshElbow, meshWristFK, PALM, LEG_KNEE, legLen, dist, trunkDir, midS, sag, shapeOf, shapeBottom, lowPoint, chestMinY, minOf, footMin, dorsiOf, kneeOf, elbowFlare, wristExt, elbowFlexOf,
  matchLeg, matchArm, armFK, makePushG, lieFloor, ARM_SHAPES, armMinY, floorSweep, bisect };
