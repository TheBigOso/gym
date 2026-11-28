// Batch 6 family b6-15: helpers shared by the b6-15 authors.
//  - hang(): hanging from a free-standing pull-up bar (EQ.pullupBar) with both hands planted (arm contacts, fixed targets,
//    world-locked hand orientation, weight 1), generalised from author-pull-up.js / author-chin-up.js: overhand,
//    underhand or neutral hands, any grip points (archer: very wide; commando: staggered along a bar turned to run front
//    to back), and asymmetric keys. Each key is solved by setting the root height that gives the asked elbow angle on
//    the key's primary side; the root can also be shifted sideways (z) until the other arm reaches an asked elbow angle
//    (archer), or moved along a direction until the face and chest clear the bar (pull-up to the front, behind the neck,
//    or with the head beside the bar). Feet can be put on the floor (fitted leg channels, no leg contacts).
//  - hangCheck(): loop self-check (hands planted, floor, bar clearance, joint limits).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');

const D2R = Math.PI / 180;
const qArr = (q) => q.map((v) => +v.toFixed(6));
const orth = (a, b) => V.norm(V.sub(a, V.scale(b, V.dot(a, b))));
// Left-hand frame on the bar: palm normal `palm` (world), fingers up over the bar leaning `tilt` deg toward `lean`
// (world unit vector, default out to the left, -Z). Right hand: mirror of the left. Same construction as the pull-up
// (XL palm normal, YL = -fingers).
function handFrameL(palm, tilt = 0, lean = [0, 0, -1]) {
  const fl = V.norm(V.add(V.scale([0, 1, 0], Math.cos(tilt * D2R)), V.scale(lean, Math.sin(tilt * D2R))));
  const XL = orth(palm, fl), YL = V.scale(fl, -1), ZL = V.cross(XL, YL);
  return Q.fromBasis(XL, YL, ZL);
}
const GRIPS = {
  over: (tilt) => { const l = handFrameL([1, 0, 0], tilt); return { l, r: Q.mirrorZ(l) }; },          // palms forward
  under: (tilt) => { const l = handFrameL([-1, 0, 0], tilt); return { l, r: Q.mirrorZ(l) }; },        // palms toward the body
  neutral: (tilt) => { const l = handFrameL([0, 0, 1], tilt, [1, 0, 0]); return { l, r: Q.mirrorZ(l) }; }, // palms facing each other (bar along X)
};

const legs = (hip, knee, ankle) => ({ hip, knee, ankle });

/**
 * hang({ barH, alongX, grip: { r: [x, z], l: [x, z] }, rot: { r, l }, pole: { r, l }, plane, x0 })
 *  barH: bar centre height; alongX: bar turned to run front to back (prop rotY 90). grip: handle centres on the bar.
 *  rot: hand orientations (GRIPS.*). plane: shoulder plane guess(es) for the arm fit.
 */
function hang({ barH = 212, alongX = false, grip, rot, pole, plane = [20], x0 = -3, width = 120 } = {}) {
  const PB = EQ.pullupBar({ height: barH, width });
  if (alongX) { PB.prop.rotY = 90; PB.bar.ax = [1, 0, 0]; }
  const bar = PB.bar;
  const G = { r: [grip.r[0], barH, grip.r[1]], l: [grip.l[0], barH, grip.l[1]] };
  const contacts = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { pole: pole[s].slice(), handRot: qArr(rot[s]) }));
  const wristT = (s) => V.sub(G[s], Q.rot(rot[s], [2.2, -7.2, 0])).map((v) => +v.toFixed(2));
  const WT = { r: wristT('r'), l: wristT('l') };
  const half = width / 2 - 4;
  const barA = V.sub(bar.c, V.scale(bar.ax, half)), barB = V.add(bar.c, V.scale(bar.ax, half));
  const barClear = (W, skip = /^(hand|thumb)_/) => EQ.segmentClear(W, barA, barB, bar.r, { skip, n: 30 });
  const TRUNK = /^(hand|thumb|forearm|upperarm|biceps|triceps|deltoid)_/; // face, neck, chest, trunk and legs
  const st = L.POSES.standing();
  const both = (k, a, b) => (k[`${a}R`] != null ? { r: k[`${a}R`], l: k[`${a}L`] } : { r: k[a], l: k[a] });

  function bodyPose(k, x, y, z = 0) {
    const p = clone(st.pose); delete p.ik;
    p.root.pos = [x, y, z]; p.root.rot = { pitch: k.pitch || 0, yaw: k.yaw || 0, roll: k.roll || 0 };
    const lat = k.lat || [0, 0, 0], rt = k.trot || [0, 0, 0];
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: rt[i], latFlex: lat[i], flex: k.spine[i] }; });
    p.ch.neck_c7 = { rot: (k.neckRot || [0, 0])[0], flex: k.neck[0] }; p.ch.head_c1 = { rot: (k.neckRot || [0, 0])[1], flex: k.neck[1] };
    const sc = both(k, 'sc'); p.ch.sc_r = clone(sc.r); p.ch.sc_l = clone(sc.l);
    const lg = k.legsR ? { r: k.legsR, l: k.legsL } : { r: k.legs, l: k.legs };
    for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: lg[s].hip, abd: lg[s].abd ?? 2, rot: 0 }; p.ch[`knee_${s}`] = { flex: lg[s].knee }; p.ch[`ankle_${s}`] = { dorsi: lg[s].ankle }; }
    const f = both(k, 'flex');
    p.ch.shoulder_r = { plane: plane[0], elev: 160, axial: 0 }; p.ch.shoulder_l = clone(p.ch.shoulder_r); p.ch.elbow_r = { flex: f.r }; p.ch.elbow_l = { flex: f.l };
    return p;
  }
  const side = (k) => (k.side && k.side !== 'both' ? k.side : 'r');
  const flexOf = (k, s) => (k[`flex${s.toUpperCase()}`] ?? k.flex);
  // root height for the primary side's elbow angle (shoulder-to-wrist distance = reach(flex)); shoulders below the hands
  // (k.side 'both': the lowest height at which both arms are within their elbow angle, for a staggered grip)
  function rootY(k, x, z = 0) {
    const sides = k.side === 'both' ? ['r', 'l'] : [side(k)]; let a = 40, b = 220;
    for (let i = 0; i < 40; i++) {
      const y = (a + b) / 2, W = L.fk(bodyPose(k, x, y, z));
      const up = sides.some((s) => { const S = W[`shoulder_${s}`].p; return S[1] < WT[s][1] && V.len(V.sub(S, WT[s])) > L.reach(flexOf(k, s)); });
      if (up) a = y; else b = y;
    }
    return r1((a + b) / 2 * 10) / 10;
  }
  const otherDist = (k, x, z) => { const o = side(k) === 'r' ? 'l' : 'r'; return V.len(V.sub(L.fk(bodyPose(k, x, rootY(k, x, z), z))[`shoulder_${o}`].p, WT[o])); };
  // place the root: z from the other arm's elbow angle (k.flexOther), then x / z stepped along k.clear.dir until the trunk
  // shapes clear the bar by k.clear.min cm
  function place(k) {
    let x = k.x ?? x0, z = k.z ?? 0;
    for (let it = 0; it < (k.flexOther != null && k.clear ? 4 : 1); it++) {
      if (k.flexOther != null) {
        const want = L.reach(k.flexOther), sg = side(k) === 'r' ? 1 : -1; let a = 0, b = 40 * sg;
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (otherDist(k, x, m) < want) a = m; else b = m; }   // moving toward the primary hand stretches the other arm
        z = r1((a + b) / 2 * 10) / 10;
      }
      if (k.clear) {
        const [dx, dz] = k.clear.dir, x1 = x;
        for (let i = 0; i < 80; i++) { const W = L.fk(bodyPose(k, x, rootY(k, x, z), z)); if (barClear(W, k.clear.skip || TRUNK).d >= k.clear.min) break; x += dx; z += k.flexOther != null ? 0 : dz; }
        if (x === x1 && it > 0) break;
      }
    }
    return { x: r1(x * 10) / 10, z: r1(z * 10) / 10 };
  }
  const guessArm = (k, s, fl) => plane.map((pl) => ({ [`shoulder_${s}`]: { plane: pl, elev: 180 - fl * 0.8, axial: 0 }, [`elbow_${s}`]: { flex: fl } }));
  function solveKey(k) {
    const { x, z } = place(k), y = rootY(k, x, z);
    let p = bodyPose(k, x, y, z);
    const W0 = L.fk(p);
    if (k.feet) { // feet on the floor: fitted leg channels reach the given ankle points (foot flat)
      for (const s of ['r', 'l']) { const c = H.legC(s); p = H.fitLeg(p, s, c, k.feet[s]); delete p.__cost; }
    }
    p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };
    for (const s of ['r', 'l']) {
      const c = contacts.find((cc) => cc.id === `arm_${s}`), fl = L.flexFor(V.len(V.sub(W0[`shoulder_${s}`].p, WT[s])));
      p = H.fitArm(p, s, c, WT[s], guessArm(k, s, fl)); delete p.__cost;
    }
    for (const j of Object.keys(p.ch)) for (const c in p.ch[j]) p.ch[j][c] = r1(p.ch[j][c]);
    return p;
  }
  const pin = (ex) => { for (const p of Object.values(ex.poses)) p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } }; };
  // reach left over on each arm in a pose (cm; < 0 = the arm cannot reach its hand)
  const slack = (p) => { const W = L.fk(p); return { r: +(L.reach(0) - V.len(V.sub(W.shoulder_r.p, WT.r))).toFixed(1), l: +(L.reach(0) - V.len(V.sub(W.shoulder_l.p, WT.l))).toFixed(1) }; };
  return { PB, bar, G, WT, contacts, bodyPose, rootY, place, solveKey, pin, barClear, slack, TRUNK, barH };
}

// Loop self-check: hands planted (wrist on target, grip point on the bar), floor, bar clearance (hands and thumbs skipped,
// plus `skip`), elbow range, joint limits. Returns a report; the caller decides what fails.
function hangCheck(ex, Hh, { skip = /^(hand|thumb)_/, n = 1040 } = {}) {
  const tl = R.buildTimeline(ex), Dur = ex.timeline.duration;
  const rep = { slide: 0, slideAt: null, floor: 1e9, floorAt: null, bar: 1e9, barAt: null, gripErr: 0, elbowR: [999, -999], elbowL: [999, -999] };
  const el = (W, s) => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Dur, pz = tl.pose(t), W = R.evalPose(rig, pz, ex.contacts);
    for (const s of ['r', 'l']) { const d = V.len(V.sub(W[`wrist_${s}`].p, Hh.WT[s])); if (d > rep.slide) { rep.slide = d; rep.slideAt = [s, +t.toFixed(2)]; } rep.gripErr = Math.max(rep.gripErr, V.len(V.sub(EQ.gripPoint(W, s).p, Hh.G[s]))); }
    const f = L.shapeMinY(W); if (f.y < rep.floor) { rep.floor = f.y; rep.floorAt = [f.id, +t.toFixed(2)]; }
    const c = Hh.barClear(W, skip); if (c.d < rep.bar) { rep.bar = c.d; rep.barAt = [c.id, +t.toFixed(2)]; }
    const eR = el(W, 'r'), eL = el(W, 'l'); rep.elbowR = [Math.min(rep.elbowR[0], eR), Math.max(rep.elbowR[1], eR)]; rep.elbowL = [Math.min(rep.elbowL[0], eL), Math.max(rep.elbowL[1], eL)];
  }
  const viol = [];
  for (const [nm, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${nm}.${j}.${c}=${p.ch[j][c]}`); }
  for (const k of ['slide', 'floor', 'bar', 'gripErr']) rep[k] = +rep[k].toFixed(3);
  rep.elbowR = rep.elbowR.map(Math.round); rep.elbowL = rep.elbowL.map(Math.round); rep.viol = viol;
  return rep;
}
// standard gate for hanging authors
function hangGate(rep, { minBar = 0.5, minFloor = 0 } = {}) {
  if (rep.slide > 0.05) { console.error('FAIL: hands slide on the bar'); process.exitCode = 1; }
  if (rep.gripErr > 0.5) { console.error('FAIL: grip point off the bar'); process.exitCode = 1; }
  if (rep.floor < minFloor) { console.error('FAIL: body below the floor'); process.exitCode = 1; }
  if (rep.bar < minBar) { console.error('FAIL: body through the bar'); process.exitCode = 1; }
  if (rep.viol.length) { console.error(`FAIL: joint limits ${rep.viol.join(', ')}`); process.exitCode = 1; }
}
// The pull-up keys of author-pull-up.js (dead hang, shoulders set, three mid keys, top), each placed clear of the bar
function pullKeys({ topFlex = 142, topPitch = 7, hangFlex = 8, clear = { dir: [-0.5, 0], min: 3 } } = {}) {
  const K = {
    hang: { flex: hangFlex, sc: { protract: 4, elevate: 26 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0], legs: legs(4, 16, -28) },
    scap: { flex: hangFlex + 2, sc: { protract: 0, elevate: 8 }, pitch: 3, spine: [-1, -2, -2], neck: [-2, -2], legs: legs(6, 18, -28) },
    m1: { flex: 55, sc: { protract: -6, elevate: 2 }, pitch: 4, spine: [-2, -3, -3], neck: [-3, -3], legs: legs(10, 22, -28) },
    m2: { flex: 95, sc: { protract: -12, elevate: -2 }, pitch: 6, spine: [-2, -4, -5], neck: [-4, -4], legs: legs(14, 26, -28) },
    m3: { flex: 118, sc: { protract: -14, elevate: -6 }, pitch: 6.5, spine: [-2, -5, -6], neck: [-3, -3], legs: legs(15, 27, -28) },
    top: { flex: topFlex, sc: { protract: -16, elevate: -10 }, pitch: topPitch, spine: [-2, -5, -6], neck: [-3, -3], legs: legs(16, 28, -28) },
  };
  for (const k of Object.values(K)) k.clear = clear;
  return K;
}
const elbowOf = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));

module.exports = { GRIPS, handFrameL, legs, hang, hangCheck, hangGate, elbowOf, qArr, pullKeys };

/* ---------------- push-up with a scapular "plus" (family push.js, keys re-solved with a set shoulder-blade position) ---------------- */
// push.js keeps the shoulder blades tied to the depth (u); for the push-up plus the top is re-solved with the shoulder
// blades protracted further (arms straight), so the trunk rises between the planted hands and feet. Same objectives as
// push.js key(): soft-knee leg length to the planted ankles, trunk in line with the legs, straight-arm shoulder-to-wrist
// distance; arm and leg channels fitted to the IK solution.
const P = require('./push');
function pushKeyer(F) {
  const legLen = (kf) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(kf * R.DEG)); };
  const LEG_D = legLen(P.LEG_KNEE), dist = (a, b) => V.len(V.sub(a, b));
  const trunkDir = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
  const sag = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / R.DEG;
  const W0 = L.fk(F.base), BEND0 = sag(V.sub(W0.hip_l.p, W0.ankle_l.p), trunkDir(W0));
  function matchLeg(pose, s) {
    const Wi = L.fk(pose, F.contacts), p = clone(pose);
    const set = (x) => { const q = clone(p); q.ch[`hip_${s}`] = { flex: x[0], abd: x[1], rot: x[2] }; q.ch[`knee_${s}`] = { flex: x[3] }; q.ch[`ankle_${s}`] = { dorsi: x[4] }; return q; };
    const res = (x) => { const W = L.fk(set(x)); return [...V.sub(W[`knee_${s}`].p, Wi[`knee_${s}`].p), ...V.sub(W[`ankle_${s}`].p, Wi[`ankle_${s}`].p), ...V.sub(W[`toe_${s}`].p, Wi[`toe_${s}`].p).map((v) => v * 0.15)].concat([x[1] * 0.05, x[2] * 0.05]); };
    const c = p.ch[`hip_${s}`] || {}, x0 = [c.flex || 0, c.abd || 0, c.rot || 0, (p.ch[`knee_${s}`] || {}).flex || 5, (p.ch[`ankle_${s}`] || {}).dorsi || 0];
    return set(R.solveLM(x0, res, { iters: 300 }).x.map(L.wrap).map(r1));
  }
  function matchArm(pose, s) {
    const Wi = L.fk(pose, F.contacts), p = clone(pose);
    const set = (x) => { const q = clone(p); q.ch[`shoulder_${s}`] = { plane: x[0], elev: x[1], axial: x[2] }; q.ch[`elbow_${s}`] = { flex: x[3] }; return q; };
    const lim = (v, a, b) => (v < a ? a - v : v > b ? v - b : 0);
    const res = (x) => { const W = L.fk(set(x)); return [...V.sub(W[`elbow_${s}`].p, Wi[`elbow_${s}`].p), ...V.sub(W[`wrist_${s}`].p, Wi[`wrist_${s}`].p)].concat([x[2] * 0.01, lim(x[0], -60, 140), lim(x[1], 0, 180), lim(x[2], -90, 90), lim(x[3], 0, 150)]); };
    const c = p.ch[`shoulder_${s}`] || {}, f0 = (p.ch[`elbow_${s}`] || {}).flex || 5;
    let best = null;
    for (const g of [[90, 78, 0, f0], [90, 60, 0, 90], [60, 70, 20, 90], [120, 70, -20, 90], [c.plane ?? 90, c.elev ?? 78, c.axial ?? 0, f0]]) { const so = R.solveLM(g, res, { iters: 400 }); if (!best || so.cost < best.cost) best = so; }
    return set(best.x.map(r1));
  }
  // like push.js key(handX, { armD }) but with the shoulder blades, neck and spine given
  function key(handX, { armD, sc, neck = [1.4, 1.6], spine = [0, 0, 0] }) {
    const WR = [r1(handX), r1(F.handY + F.PALM), F.handZ], WL = [r1(handX), r1(F.handY + F.PALM), -F.handZ];
    const p = clone(F.base);
    p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
    p.ch.neck_c7 = { rot: 0, flex: neck[0] }; p.ch.head_c1 = { rot: 0, flex: neck[1] };
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: 0, flex: spine[i], latFlex: 0 }; });
    p.root.pos = [p.root.pos[0], p.root.pos[1] + F.handY * 0.8, 0]; p.root.rot.pitch = p.root.rot.pitch + F.handY * 0.5;
    const objs = [(W) => [(dist(W.hip_r.p, F.AR) - LEG_D) * 4, (dist(W.hip_l.p, F.AL) - LEG_D) * 4], (W) => [(sag(V.sub(W.hip_l.p, F.AL), trunkDir(W)) - BEND0) * 0.4], (W) => [(dist(W.shoulder_r.p, WR) - armD) * 4]];
    let q = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, { iters: 400 }).pose;
    q.ik = { arm_r: { target: WR, weight: 1 }, arm_l: { target: WL, weight: 1 }, leg_r: { target: F.AR, weight: 1 }, leg_l: { target: F.AL, weight: 1 } };
    for (const s of ['r', 'l']) { q = matchLeg(q, s); q = matchArm(q, s); }
    return q;
  }
  return { key };
}
module.exports.pushKeyer = pushKeyer;
