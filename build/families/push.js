// Push family (batch 2): push-ups with both palms planted (arm contacts, constant targets, palm-down world orientation)
// and both feet on the balls (leg contacts, constant ankle targets, world-fixed foot orientation). The body is one rigid
// line that pivots about the planted ankles; each key pose is solved for root x / y / pitch so the hip-to-ankle distance
// keeps a soft-knee leg length, the trunk stays in line with the legs, and the chest (or shoulders) sits at the asked
// height. The palms can be on the floor (handY = 0) or on top of a prop (handY = prop height).
const L = require('../lib');
const { R, V, Q, rig, r1, clone, fk, solvePose, obj } = L;

const PALM = 2.6;                 // wrist joint height above the surface the palm rests on (lib plank, athlete PALM_RR)
const LEG_KNEE = 8;               // planted legs: knees straight but not locked
const legLen = (kf) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(kf * R.DEG)); };
const LEG_D = legLen(LEG_KNEE);
const dist = (a, b) => V.len(V.sub(a, b));
const trunkDir = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
const midS = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
const sag = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / R.DEG;
const CHEST = ['chest', 'pecs_r', 'pecs_l', 'ribcage'];
const shapeBottom = (W, s) => { const g = R.shapeWorld(W, s); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
// Lowest point of an ellipsoid shape (world), for prop clearance.
const lowPoint = (g) => { const n = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); return g.axes.reduce((c, a) => V.sub(c, V.scale(a, a[1] / n)), g.c); };
const chestMinY = (W) => Math.min(...CHEST.map((id) => shapeBottom(W, rig.shapes.find((s) => s.id === id))));
const footShape = (s) => rig.shapes.find((x) => x.id === `foot_${s}`);
const footMin = (A, q, s) => { const g = R.shapeWorld({ [`ankle_${s}`]: { p: A, q } }, footShape(s)); return g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset);
const dorsiOf = (W, s) => ANKLE_REST - V.angle(V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p));
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
// Upper arm away from the trunk (deg) seen from above the back: 0 = elbow straight back along the ribs, 90 = out to the side ("T").
function elbowFlare(W, s) {
  const t = trunkDir(W), side = V.norm(V.sub(W[`shoulder_${s}`].p, W[`shoulder_${s === 'r' ? 'l' : 'r'}`].p));
  const ua = V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p);
  return Math.atan2(V.dot(ua, side), -V.dot(ua, t)) / R.DEG;
}
// Wrist extension: forearm line (elbow -> wrist) to the flat hand (wrist -> fingertip).
const wristExt = (W, s) => V.angle(V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`handtip_${s}`].p, W[`wrist_${s}`].p));

/**
 * makePush({ handY, handZ, ankleZ, flarePole, footTilt })
 *  handY: surface height under the palms (0 floor, prop top for incline). handZ: wrist |z| (cm).
 *  flarePole: [x, y, z] elbow pole for the right arm (z mirrored for the left): elbows back and out about 30-45 degrees.
 */
function makePush({ handY = 0, handZ = 24, ankleZ = 8, flarePole = [-1, 0.25, 0.75], footTilt = 0 } = {}) {
  const P = L.POSES.plank();
  const base = clone(P.pose);
  base.ch.hip_r = { flex: 0, abd: 0, rot: 0 }; base.ch.hip_l = { flex: 0, abd: 0, rot: 0 };
  const W0 = fk(base);
  // Feet: plank foot orientation tilted by footTilt (deg, + = heel lower) about the world z axis; the foot rests on its
  // ball on the floor. Ankle anchors keep the plank toe x.
  const qz = Q.axis([0, 0, 1], footTilt);
  const footQ = { r: Q.norm(Q.mul(qz, W0.ankle_r.q)).map((v) => +v.toFixed(6)), l: Q.norm(Q.mul(qz, W0.ankle_l.q)).map((v) => +v.toFixed(6)) };
  const anchor = (s) => {
    const z = s === 'r' ? ankleZ : -ankleZ, toe = W0[`toe_${s}`].p, q = footQ[s];
    let A = V.sub([toe[0], toe[1], z], Q.rot(q, rig.byId[`toe_${s}`].offset));
    A = V.add(A, [0, 0.05 - footMin(A, q, s), 0]);
    return A.map((v) => +v.toFixed(2));
  };
  const AR = anchor('r'), AL = anchor('l');
  const contacts = [
    Object.assign(L.handContact('r'), { pole: flarePole.slice() }),
    Object.assign(L.handContact('l'), { pole: [flarePole[0], flarePole[1], -flarePole[2]] }),
    Object.assign(L.legContact('r'), { pole: [0.3, -1, 0.08], handRot: footQ.r }), // knees toward the floor (prone)
    Object.assign(L.legContact('l'), { pole: [0.3, -1, -0.08], handRot: footQ.l }),
  ];
  const BEND0 = sag(V.sub(W0.hip_l.p, W0.ankle_l.p), trunkDir(W0)); // plank (hip 0, knee 0): "one straight line"

  function headSc(p, u) { // u: 0 top, 1 bottom
    p.ch.sc_r = { protract: r1(8 - 7 * u), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
    const f = 3 - 7 * u; p.ch.neck_c7 = { rot: 0, flex: r1(f * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(f * 0.55) };
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j) => { p.ch[j] = { rot: 0, flex: 0, latFlex: 0 }; });
    return p;
  }
  // Fit FK leg channels to the IK solution (stored channels then match what is drawn; verify checks their limits).
  function matchLeg(pose, s, cs) {
    const Wi = fk(pose, cs), p = clone(pose);
    const set = (x) => { const q = clone(p); q.ch[`hip_${s}`] = { flex: x[0], abd: x[1], rot: x[2] }; q.ch[`knee_${s}`] = { flex: x[3] }; q.ch[`ankle_${s}`] = { dorsi: x[4] }; return q; };
    const res = (x) => { const W = fk(set(x)); return [...V.sub(W[`knee_${s}`].p, Wi[`knee_${s}`].p), ...V.sub(W[`ankle_${s}`].p, Wi[`ankle_${s}`].p), ...V.sub(W[`toe_${s}`].p, Wi[`toe_${s}`].p).map((v) => v * 0.15)].concat([x[1] * 0.05, x[2] * 0.05]); };
    const c = p.ch[`hip_${s}`] || {}, x0 = [c.flex || 0, c.abd || 0, c.rot || 0, (p.ch[`knee_${s}`] || {}).flex || 5, (p.ch[`ankle_${s}`] || {}).dorsi || 0];
    return set(R.solveLM(x0, res, { iters: 300 }).x.map(L.wrap).map(r1));
  }
  // Fit FK arm channels (shoulder plane / elevation / axial, elbow flex) to the IK elbow and wrist.
  function matchArm(pose, s, cs) {
    const Wi = fk(pose, cs), p = clone(pose);
    const set = (x) => { const q = clone(p); q.ch[`shoulder_${s}`] = { plane: x[0], elev: x[1], axial: x[2] }; q.ch[`elbow_${s}`] = { flex: x[3] }; return q; };
    const lim = (v, a, b) => (v < a ? a - v : v > b ? v - b : 0);
    const res = (x) => { const W = fk(set(x)); return [...V.sub(W[`elbow_${s}`].p, Wi[`elbow_${s}`].p), ...V.sub(W[`wrist_${s}`].p, Wi[`wrist_${s}`].p)].concat([x[2] * 0.01, lim(x[0], -60, 140), lim(x[1], 0, 180), lim(x[2], -90, 90), lim(x[3], 0, 150)]); };
    const c = p.ch[`shoulder_${s}`] || {}, f0 = (p.ch[`elbow_${s}`] || {}).flex || 5;
    let best = null;
    for (const g of [[90, 78, 0, f0], [90, 60, 0, 90], [60, 70, 20, 90], [120, 70, -20, 90], [90, 40, 0, 120], [c.plane ?? 90, c.elev ?? 78, c.axial ?? 0, f0]]) { const so = R.solveLM(g, res, { iters: 400 }); if (!best || so.cost < best.cost) best = so; }
    return set(best.x.map(r1));
  }

  // Key pose at a given hand x and either { armD } (straight arms) or { chestY } (depth). u drives head/scapula.
  function key(handX, { armD, chestY, u }) {
    const WR = [r1(handX), r1(handY + PALM), handZ], WL = [r1(handX), r1(handY + PALM), -handZ];
    const p = headSc(clone(base), u);
    const objs = [
      (W) => [(dist(W.hip_r.p, AR) - LEG_D) * 4, (dist(W.hip_l.p, AL) - LEG_D) * 4],
      (W) => [(sag(V.sub(W.hip_l.p, AL), trunkDir(W)) - BEND0) * 0.4],
    ];
    if (armD != null) objs.push((W) => [(dist(W.shoulder_r.p, WR) - armD) * 4]);
    else objs.push((W) => [(chestMinY(W) - chestY) * 4]);
    // start near the plank, raised/tilted for an incline
    p.root.pos = [p.root.pos[0], p.root.pos[1] + handY * 0.8, 0];
    p.root.rot.pitch = p.root.rot.pitch + handY * 0.5;
    const s = solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, { iters: 400 });
    let q = s.pose;
    q.ik = { arm_r: { target: WR, weight: 1 }, arm_l: { target: WL, weight: 1 }, leg_r: { target: AR, weight: 1 }, leg_l: { target: AL, weight: 1 } };
    for (const sd of ['r', 'l']) { q = matchLeg(q, sd, contacts); q = matchArm(q, sd, contacts); }
    return { pose: q, cost: s.cost };
  }
  function stats(p) {
    const W = fk(p, contacts), m = R.measures(W), t = trunkDir(W), WR = p.ik.arm_r.target;
    const bodyAng = Math.atan2(t[1], t[0]) / R.DEG; // trunk above horizontal
    return {
      elbow: m.elbowR, elbowL: m.elbowL, flare: elbowFlare(W, 'r'), wristExt: wristExt(W, 'r'), chestY: chestMinY(W), sh: W.shoulder_r.p[1],
      shAhead: midS(W)[0] - WR[0], elbowAhead: W.elbow_r.p[0] - WR[0], bodyAng, bend: sag(V.sub(W.hip_l.p, AL), t) - BEND0,
      knee: kneeOf(W, 'r'), dorsi: dorsiOf(W, 'r'), hip: p.ch.hip_r.flex, armD: dist(W.shoulder_r.p, WR), legD: dist(W.hip_r.p, AR), minY: L.shapeMinY(W), trunkFromVert: V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]),
      handW: 2 * handZ, shW: dist(W.shoulder_r.p, W.shoulder_l.p),
    };
  }
  // Sweep: planted wrist / ankle error, floor, and (optional) prop clearance for every body shape over the prop.
  function sweep(ex, prop) {
    const tl = R.buildTimeline(ex), out = { arm: 0, leg: 0, floor: 1e9, prop: 1e9, dorsi: [99, -99], knee: 0 };
    for (let i = 0; i <= 800; i++) {
      const t = (i / 800) * ex.timeline.duration, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
      out.arm = Math.max(out.arm, dist(W.wrist_r.p, pose.ik.arm_r.target), dist(W.wrist_l.p, pose.ik.arm_l.target));
      out.leg = Math.max(out.leg, dist(W.ankle_r.p, AR), dist(W.ankle_l.p, AL));
      const f = L.shapeMinY(W); if (f.y < out.floor) { out.floor = f.y; out.floorAt = [f.id, +t.toFixed(2)]; }
      const d = dorsiOf(W, 'r'); out.dorsi = [Math.min(out.dorsi[0], d), Math.max(out.dorsi[1], d)]; out.knee = Math.max(out.knee, kneeOf(W, 'r'));
      if (prop) {
        const x0 = prop.center[0] - prop.size[0] / 2, x1 = prop.center[0] + prop.size[0] / 2, top = prop.center[1] + prop.size[1];
        for (const s of rig.shapes) {
          if (/^(hand|thumb)_/.test(s.id)) continue; // the palms rest on the top
          const g = R.shapeWorld(W, s);
          const pts = g.kind === 'capsule' ? [[g.a, g.r[0]], [g.b, g.r[1]]].map(([c, r]) => [c[0], c[1] - r]) : [lowPoint(g)].map((c) => [c[0], c[1]]);
          for (const [x, y] of pts) if (x > x0 && x < x1 && y - top < out.prop) { out.prop = y - top; out.propAt = [s.id, +t.toFixed(2)]; }
        }
      }
    }
    for (const k of ['arm', 'leg', 'floor', 'prop', 'knee']) out[k] = +out[k].toFixed(3);
    out.dorsi = out.dorsi.map((v) => +v.toFixed(1));
    return out;
  }
  // One repetition: top (straight arms, elbows soft by topElbow deg) -> solved lowering keys (eased chest height) ->
  // bottom (chest botChest cm above the palm surface) -> short pause -> solved pressing keys -> top.
  // T: { hold, down, pause, up, D } in seconds; returns { poses, keyframes }.
  function rep(handX, { topElbow = 8, botChest = 8, T, nDown = 6, nUp = 4 }) {
    const ease = (f) => f * f * (3 - 2 * f);
    const top = key(handX, { armD: L.reach(topElbow), u: 0 }).pose, bottom = key(handX, { chestY: handY + botChest, u: 1 }).pose;
    const cTop = chestMinY(fk(top, contacts)), cBot = handY + botChest;
    const poses = { top, bottom };
    const t0 = T.hold, t1 = t0 + T.down, t2 = t1 + T.pause, t3 = t2 + T.up;
    const keyframes = [{ t: 0, pose: 'top' }, { t: t0, pose: 'top' }];
    for (let i = 1; i < nDown; i++) { const u = ease(i / nDown), n = `down${i}`; poses[n] = key(handX, { chestY: cTop + (cBot - cTop) * u, u }).pose; keyframes.push({ t: +(t0 + (T.down * i) / nDown).toFixed(3), pose: n }); }
    keyframes.push({ t: t1, pose: 'bottom' });
    poses.bottomHold = key(handX, { chestY: cBot + 0.4, u: 1 }).pose; // a breath at the bottom: hold the line, tiny settle
    keyframes.push({ t: +((t1 + t2) / 2).toFixed(3), pose: 'bottomHold' }, { t: t2, pose: 'bottom' });
    for (let i = 1; i < nUp; i++) { const u = 1 - ease(i / nUp), n = `up${i}`; poses[n] = key(handX, { chestY: cTop + (cBot - cTop) * u, u }).pose; keyframes.push({ t: +(t2 + (T.up * i) / nUp).toFixed(3), pose: n }); }
    keyframes.push({ t: t3, pose: 'top' }, { t: T.D, pose: 'top' });
    return { poses, keyframes };
  }
  return { base, contacts, AR, AL, footQ, key, rep, stats, sweep, LEG_D, PALM, handY, handZ, chestMinY };
}
module.exports = { makePush, elbowFlare, wristExt, chestMinY, LEG_KNEE };
