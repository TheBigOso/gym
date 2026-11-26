// 1 to 2 Jump Box (GymVisual #420913): single-leg takeoff (right) from a staggered stance, both legs come up
// together in flight, soft two-foot landing on top of a 45 cm plyo box, stand tall, step down backward, reset.
const L = require('./lib');
const { R, V, Q, rig, r1, clone, obj, solvePose, POSES, ANKLE_H, legContact } = L;
const meta = require('./meta/one-to-two-jump-box.json');

/* ---------- Layout (cm). Figure faces +X; the box sits ahead of the start position. ---------- */
const boxProp = meta.props.find((p) => p.kind === 'box');
const BOX = { x0: boxProp.center[0] - boxProp.size[0] / 2, x1: boxProp.center[0] + boxProp.size[0] / 2, h: boxProp.size[1], hz: boxProp.size[2] / 2 };
const ST = rig.byId.hip_r.offset[2];            // feet under the hips
const TOP = BOX.h + ANKLE_H;                      // ankle height with the foot flat on the box top
const START = 0;                                  // start ankles: toes 30 cm behind the box edge
const STAG = -30;                                 // left foot steps back into the stagger
const LAND = BOX.x0 + 11;                         // landing ankles: heel ~4 cm in from the edge, whole foot on the box
const DOWN_L = BOX.x0 - 22;                       // left foot after the step down (toe tip ~4 cm behind the box)
const TOE_Y = 0.8;                                // ball-of-foot contacts sit 0.8 cm proud so pivots never dip below the surface
const A = (x, y, s) => [x, y, s === 'r' ? ST : -ST];

const contacts = [legContact('r'), legContact('l')];
const { pose: base } = POSES.standing();
const FOOT = { r: rig.shapes.find((s) => s.id === 'foot_r'), l: rig.shapes.find((s) => s.id === 'foot_l') };
const footMinY = (W, s) => { const g = R.shapeWorld(W, FOOT[s]); return g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); };

/* ---------- Leg solver: FK channels that put the foot where the IK contact will hold it ---------- */
const legPaths = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
function legObjs(s, spec) {
  const os = [];
  const qd = Q.axis([0, 0, 1], spec.pitch || 0), xd = Q.rot(qd, [1, 0, 0]), yd = Q.rot(qd, [0, 1, 0]);
  os.push((W) => { const q = W[`ankle_${s}`].q; return [...V.sub(Q.rot(q, [1, 0, 0]), xd), ...V.sub(Q.rot(q, [0, 1, 0]), yd)].map((v) => v * 20); });
  if (spec.ankle) os.push(obj.at(`ankle_${s}`, spec.ankle));
  if (spec.toe) os.push((W) => [(W[`toe_${s}`].p[0] - spec.toe[0]) * 3, (W[`toe_${s}`].p[2] - spec.toe[2]) * 3, (footMinY(W, s) - spec.toe[1] - TOE_Y) * 3]);
  os.push(obj.reg(`ch.hip_${s}.rot`, 0, 0.03), obj.reg(`ch.hip_${s}.abd`, 0, 0.03));
  // stay inside the rig's joint limits (with a 2 degree margin)
  for (const [j, c] of [[`hip_${s}`, 'flex'], [`hip_${s}`, 'abd'], [`hip_${s}`, 'rot'], [`knee_${s}`, 'flex'], [`ankle_${s}`, 'dorsi']]) {
    const [lo, hi] = rig.byId[j].limits[c];
    os.push((W, p) => { const v = p.ch[j][c]; return [Math.min(0, v - lo - 2) * 3 + Math.max(0, v - hi + 2) * 3]; });
  }
  return os;
}

/* ---------- Key pose builder ---------- */
// k: root [x, y, z], pitch (- = lean forward), spine [l5, t12, t6] flex, head (flex, + = look down),
// arm {plane, elev, axial, elbow}, legs {r, l}: {ankle} flat contact | {toe, pitch} ball-of-foot contact | {ch} free swing,
// knee {r, l}: preferred knee flexion when the root height is free (freeY), ik {r, l}: [target, weight].
const SIDES = { plane: 30, elev: 8, axial: 0, elbow: 10 };
function build(k) {
  const p = clone(base);
  p.root.pos = [k.root[0], k.root[1] ?? 90, k.root[2] ?? 0];
  p.root.rot = { pitch: k.pitch || 0, roll: k.roll || 0 };
  const sp = k.spine || [0, 0, 0];
  ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: 0, flex: sp[i], latFlex: i === 0 ? -(k.roll || 0) : 0 }; });
  const h = k.head || 0;
  p.ch.neck_c7 = { rot: 0, flex: r1(h * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(h * 0.6) };
  const arm = Object.assign({}, SIDES, k.arm || {});
  for (const s of ['r', 'l']) { p.ch[`shoulder_${s}`] = { plane: arm.plane, elev: arm.elev, axial: arm.axial }; p.ch[`elbow_${s}`] = { flex: arm.elbow }; p.ch[`sc_${s}`] = { protract: arm.protract || 0, elevate: arm.elevate || 0 }; }
  const paths = k.freeY ? ['root.pos.1'] : [], objs = [];
  for (const s of ['r', 'l']) {
    const spec = k.legs[s];
    if (spec.ch) { const c = spec.ch; p.ch[`hip_${s}`] = { flex: c.flex, abd: c.abd || 0, rot: c.rot || 0 }; p.ch[`knee_${s}`] = { flex: c.knee }; p.ch[`ankle_${s}`] = { dorsi: c.dorsi || 0 }; continue; }
    const g = spec.guess || {};
    p.ch[`hip_${s}`] = { flex: g.flex ?? 10, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: g.knee ?? ((k.knee && k.knee[s]) || 15) }; p.ch[`ankle_${s}`] = { dorsi: g.dorsi ?? 0 };
    paths.push(...legPaths(s)); objs.push(...legObjs(s, spec));
    if (k.knee && k.knee[s] != null) objs.push(obj.reg(`ch.knee_${s}.flex`, k.knee[s], k.freeY ? 1 : 0.02));
  }
  let out = p;
  if (paths.length) { const sol = solvePose(p, paths, objs, { iters: 400 }); out = sol.pose; out._cost = sol.cost; }
  // residual report: contact position error (cm) and foot orientation error (deg) per solved leg
  const Wd = L.fk(out); out._err = [];
  for (const s of ['r', 'l']) {
    const spec = k.legs[s]; if (spec.ch) continue;
    const pe = spec.ankle ? V.len(V.sub(Wd[`ankle_${s}`].p, spec.ankle)) : Math.hypot(Wd[`toe_${s}`].p[0] - spec.toe[0], Wd[`toe_${s}`].p[2] - spec.toe[2], footMinY(Wd, s) - spec.toe[1] - TOE_Y);
    const oe = V.angle(Q.rot(Wd[`ankle_${s}`].q, [1, 0, 0]), Q.rot(Q.axis([0, 0, 1], spec.pitch || 0), [1, 0, 0]));
    out._err.push(`${s}:${pe.toFixed(2)}cm/${oe.toFixed(1)}°`);
  }
  out.ik = {};
  for (const s of ['r', 'l']) { const [target, weight] = k.ik[s]; out.ik[`leg_${s}`] = { target: target.map(r1), weight }; }
  return out;
}

/* ---------- Key poses ---------- */
const P = {}, rep = [];
const add = (name, k) => { P[name] = build(k); };
const flat = (x, y, s) => ({ ankle: A(x, y, s) });
const T0r = A(START, ANKLE_H, 'r'), T0l = A(START, ANKLE_H, 'l'), TSl = A(STAG, ANKLE_H, 'l');
const TBr = A(LAND, TOP, 'r'), TBl = A(LAND, TOP, 'l'), TDl = A(DOWN_L, ANKLE_H, 'l');

// Set up and stagger
add('stand', { root: [START], freeY: true, knee: { r: 2, l: 2 }, legs: { r: flat(START, ANKLE_H, 'r'), l: flat(START, ANKLE_H, 'l') }, ik: { r: [T0r, 1], l: [T0l, 1] } });
add('stepBack', { root: [START - 3, null, 2.5], freeY: true, knee: { r: 6 }, pitch: -2, head: 6, legs: { r: flat(START, ANKLE_H, 'r'), l: { ankle: A(-15, 14, 'l'), pitch: -18 } }, ik: { r: [T0r, 1], l: [T0l, 0] } });
add('stagger', { root: [-12, null, 2], freeY: true, knee: { l: 3 }, pitch: -4, head: 10, legs: { r: flat(START, ANKLE_H, 'r'), l: flat(STAG, ANKLE_H, 'l') }, ik: { r: [T0r, 1], l: [TSl, 1] } });
add('loadMid', { root: [-8, null, 2.3], freeY: true, knee: { r: 28 }, pitch: -10, spine: [3, 3, 2], head: 12, arm: { plane: -30, elev: 26, elbow: 14 }, legs: { r: flat(START, ANKLE_H, 'r'), l: { toe: [STAG + 16, 0, -ST], pitch: -10 } }, ik: { r: [T0r, 1], l: [TSl, 0] } });
// Load: hinge, sink into the front (takeoff) leg, back heel lifts, arms swing back
add('load', { root: [-4, null, 2.5], freeY: true, knee: { r: 42 }, pitch: -16, spine: [6, 5, 3], head: 14, arm: { plane: -60, elev: 34, elbow: 18 }, legs: { r: flat(START, ANKLE_H, 'r'), l: { toe: [STAG + 16, 0, -ST], pitch: -32 } }, ik: { r: [T0r, 1], l: [TSl, 0] } });
// Arms pass the hips as the drive starts; back foot leaves the floor
add('swing', { root: [3, null, 2], freeY: true, knee: { r: 34 }, pitch: -16, spine: [6, 5, 3], head: 14, arm: { plane: 40, elev: 8, elbow: 20 }, legs: { r: flat(START, ANKLE_H, 'r'), l: { ankle: A(-16, 17, 'l'), pitch: -40 } }, ik: { r: [T0r, 1], l: [TSl, 0] } });
// Drive: takeoff leg extends onto the ball of the foot, free knee drives up, arms forward
add('drive', { root: [11, null, 1.5], freeY: true, knee: { r: 14 }, pitch: -13, spine: [5, 4, 2], head: 12, arm: { plane: 90, elev: 62, elbow: 22 }, legs: { r: { toe: [START + 16, 0, ST], pitch: -28 }, l: { ch: { flex: 55, knee: 100, dorsi: -12 } } }, ik: { r: [T0r, 0], l: [TBl, 0] } });
// Toe-off: triple extension of the takeoff leg
add('toeoff', { root: [17, null, 1], freeY: true, knee: { r: 4 }, pitch: -10, spine: [4, 3, 2], head: 12, arm: { plane: 90, elev: 112, elbow: 22 }, legs: { r: { toe: [START + 16, 0, ST], pitch: -50 }, l: { ch: { flex: 76, knee: 112, dorsi: -10 } } }, ik: { r: [TBr, 0], l: [TBl, 0] } });
add('push', { root: [14, null, 1.2], freeY: true, knee: { r: 8 }, pitch: -11, spine: [4, 3, 2], head: 12, arm: { plane: 90, elev: 92, elbow: 22 }, legs: { r: { toe: [START + 16, 0, ST], pitch: -40 }, l: { ch: { flex: 68, knee: 108, dorsi: -11 } } }, ik: { r: [T0r, 0], l: [TBl, 0] } });
// Landing contact on the box: both feet flat at once, soft knees
add('contact', { root: [LAND - 7], freeY: true, knee: { r: 26, l: 26 }, pitch: -14, spine: [5, 4, 2], head: 14, arm: { plane: 90, elev: 92, elbow: 18 }, legs: { r: flat(LAND, TOP, 'r'), l: flat(LAND, TOP, 'l') }, ik: { r: [TBr, 1], l: [TBl, 1] } });
// Absorb: quarter-to-half squat, hips back, knees over toes, arms forward
add('absorb', { root: [LAND - 14], freeY: true, knee: { r: 66, l: 66 }, pitch: -30, spine: [8, 6, 3], head: 16, arm: { plane: 90, elev: 72, elbow: 16 }, legs: { r: flat(LAND, TOP, 'r'), l: flat(LAND, TOP, 'l') }, ik: { r: [TBr, 1], l: [TBl, 1] } });
add('standBox', { root: [LAND], freeY: true, knee: { r: 2, l: 2 }, head: 8, legs: { r: flat(LAND, TOP, 'r'), l: flat(LAND, TOP, 'l') }, ik: { r: [TBr, 1], l: [TBl, 1] } });

/* ---------- Step down backward (left first), then reset ---------- */
add('shift', { root: [LAND - 2, null, 2.5], freeY: true, knee: { r: 14 }, pitch: -6, head: 14, arm: { plane: 90, elev: 18, elbow: 14 }, legs: { r: flat(LAND, TOP, 'r'), l: flat(LAND, TOP, 'l') }, ik: { r: [TBr, 1], l: [TBl, 1] } });
add('liftL', { root: [LAND - 6, null, 3], freeY: true, knee: { r: 26 }, pitch: -12, spine: [3, 2, 1], head: 16, arm: { plane: 90, elev: 24, elbow: 14 }, legs: { r: flat(LAND, TOP, 'r'), l: { ankle: A(LAND - 9, TOP + 12, 'l'), pitch: -25 } }, ik: { r: [TBr, 1], l: [TBl, 0] } });
add('reach', { root: [LAND - 18, null, 3], freeY: true, knee: { r: 60 }, pitch: -26, spine: [6, 4, 2], head: 18, arm: { plane: 90, elev: 38, elbow: 16 }, legs: { r: flat(LAND, TOP, 'r'), l: { ankle: A(DOWN_L + 2, 54, 'l'), pitch: -35 } }, ik: { r: [TBr, 1], l: [TDl, 0] } });
add('touch', { root: [DOWN_L + 6, null, 3], freeY: true, knee: { l: 2 }, roll: -5, pitch: -30, spine: [8, 6, 3], head: 20, arm: { plane: 90, elev: 45, elbow: 16 }, legs: { r: flat(LAND, TOP, 'r'), l: { toe: [DOWN_L + 16, 0, -ST], pitch: -50 } }, ik: { r: [TBr, 1], l: [TDl, 0] } });
add('touchMid', { root: [DOWN_L + 4.5, null, 1], freeY: true, knee: { l: 3 }, roll: -3.5, pitch: -26, spine: [7, 5, 3], head: 18, arm: { plane: 90, elev: 38, elbow: 15 }, legs: { r: flat(LAND, TOP, 'r'), l: { toe: [DOWN_L + 16, 0, -ST], pitch: -33 } }, ik: { r: [TBr, 1], l: [TDl, 0] } });
add('transfer', { root: [DOWN_L + 3, null, -1], freeY: true, knee: { l: 4 }, roll: -2, pitch: -22, spine: [6, 5, 3], head: 16, arm: { plane: 90, elev: 32, elbow: 14 }, legs: { r: { toe: [LAND + 16, BOX.h, ST], pitch: -28, guess: { flex: 100, knee: 100 } }, l: { toe: [DOWN_L + 16, 0, -ST], pitch: -16 } }, ik: { r: [TBr, 0], l: [TDl, 0] } });
add('liftR', { root: [DOWN_L - 1, null, -2.5], freeY: true, knee: { l: 6 }, pitch: -14, spine: [3, 2, 1], head: 12, arm: { plane: 90, elev: 20, elbow: 12 }, legs: { r: { ankle: A(LAND - 8, TOP + 8, 'r'), pitch: -22, guess: { flex: 90, knee: 115 } }, l: flat(DOWN_L, ANKLE_H, 'l') }, ik: { r: [T0r, 0], l: [TDl, 1] } });
add('backR', { root: [DOWN_L - 4, null, -2.5], freeY: true, knee: { l: 8 }, pitch: -9, head: 10, arm: { plane: 90, elev: 14, elbow: 12 }, legs: { r: { ankle: A(BOX.x0 - 19, TOP + 6, 'r'), pitch: -20, guess: { flex: 60, knee: 115 } }, l: flat(DOWN_L, ANKLE_H, 'l') }, ik: { r: [T0r, 0], l: [TDl, 1] } });
add('lowR', { root: [DOWN_L - 7, null, -2.5], freeY: true, knee: { l: 10 }, pitch: -5, head: 8, legs: { r: { ankle: A(START + 8, 18, 'r'), pitch: -10, guess: { flex: 10, knee: 50 } }, l: flat(DOWN_L, ANKLE_H, 'l') }, ik: { r: [T0r, 0], l: [TDl, 1] } });
add('downR', { root: [(START + DOWN_L) / 2 - 1, null, 0], freeY: true, knee: { l: 7 }, pitch: -3, head: 6, legs: { r: flat(START, ANKLE_H, 'r'), l: flat(DOWN_L, ANKLE_H, 'l') }, ik: { r: [T0r, 1], l: [TDl, 1] } });
add('stepL', { root: [START + 3, null, 2.5], freeY: true, knee: { r: 5 }, pitch: -2, head: 4, legs: { r: flat(START, ANKLE_H, 'r'), l: { ankle: A(START + 12, 15, 'l'), pitch: -10 } }, ik: { r: [T0r, 1], l: [T0l, 0] } });

/* ---------- Flight: ballistic pelvis arc between toe-off and landing contact ---------- */
const T_OFF = 2.32, T_LAND = 2.7, FT = T_LAND - T_OFF, G = 980;
const p0 = P.toeoff.root.pos, p1 = P.contact.root.pos;
const vy = (p1[1] - p0[1] + 0.5 * G * FT * FT) / FT;
const arc = (t) => { const u = t - T_OFF; return [r1(p0[0] + ((p1[0] - p0[0]) * u) / FT), r1(p0[1] + vy * u - 0.5 * G * u * u), r1(p0[2] + ((p1[2] - p0[2]) * u) / FT)]; };
const T_APEX = 2.5, T_PRE = 2.64, T_REC = 2.41;
add('recover', { root: arc(T_REC), pitch: -10, spine: [4, 3, 2], head: 14, arm: { plane: 90, elev: 116, elbow: 20 }, legs: { r: { ch: { flex: 32, knee: 108, dorsi: -22 } }, l: { ch: { flex: 76, knee: 100, dorsi: -9 } } }, ik: { r: [TBr, 0], l: [TBl, 0] } });
add('apex', { root: arc(T_APEX), pitch: -10, spine: [4, 3, 2], head: 16, arm: { plane: 90, elev: 112, elbow: 20 }, legs: { r: { ch: { flex: 72, knee: 92, dorsi: -8 } }, l: { ch: { flex: 74, knee: 90, dorsi: -8 } } }, ik: { r: [TBr, 0], l: [TBl, 0] } });
add('preland', { root: arc(T_PRE), pitch: -12, spine: [5, 4, 2], head: 15, arm: { plane: 90, elev: 100, elbow: 18 }, legs: { r: { ch: { flex: 46, knee: 40, dorsi: -8 } }, l: { ch: { flex: 46, knee: 40, dorsi: -8 } } }, ik: { r: [TBr, 0], l: [TBl, 0] } });
// Keep moving along the arc right up to contact (a repeated preland pose froze the body for 30 ms).
add('reach2', { root: arc(T_LAND - 0.03), pitch: -12, spine: [5, 4, 2], head: 15, arm: { plane: 90, elev: 100, elbow: 18 }, legs: { r: { ch: { flex: 40, knee: 32, dorsi: -6 } }, l: { ch: { flex: 40, knee: 32, dorsi: -8 } } }, ik: { r: [TBr, 0], l: [TBl, 0] } });

for (const [n, p] of Object.entries(P)) { const W = L.fk(p); rep.push(`${n.padEnd(9)} root ${p.root.pos.map((v) => v.toFixed(1)).join(',')} kneeR ${p.ch.knee_r.flex} kneeL ${p.ch.knee_l.flex} hipR ${p.ch.hip_r.flex} hipL ${p.ch.hip_l.flex} dorsiR ${p.ch.ankle_r.dorsi} dorsiL ${p.ch.ankle_l.dorsi} err ${(p._err || []).join(' ')} minY ${L.shapeMinY(W).y.toFixed(2)}`); delete p._cost; delete p._err; }

/* ---------- Keyframes ---------- */
const keyframes = [
  { t: 0, pose: 'stand' }, { t: 0.7, pose: 'stand' },
  { t: 1.0, pose: 'stepBack' }, { t: 1.4, pose: 'stagger' },
  { t: 1.6, pose: 'stagger' }, { t: 1.75, pose: 'loadMid' }, { t: 1.95, pose: 'load' }, { t: 2.1, pose: 'swing' }, { t: 2.22, pose: 'drive' }, { t: 2.27, pose: 'push' }, { t: T_OFF, pose: 'toeoff' },
  { t: T_REC, pose: 'recover' }, { t: T_APEX, pose: 'apex' }, { t: T_PRE, pose: 'preland' }, { t: T_LAND - 0.03, pose: 'reach2', set: { 'ik.leg_r.weight': 0, 'ik.leg_l.weight': 0 } },
  { t: T_LAND, pose: 'contact' }, { t: 3.0, pose: 'absorb' }, { t: 3.4, pose: 'absorb' },
  { t: 4.2, pose: 'standBox' }, { t: 4.6, pose: 'standBox' },
  { t: 4.9, pose: 'shift' }, { t: 5.15, pose: 'liftL' }, { t: 5.45, pose: 'reach' }, { t: 5.75, pose: 'touch' }, { t: 5.85, pose: 'touchMid' }, { t: 5.95, pose: 'transfer' },
  { t: 6.15, pose: 'liftR' }, { t: 6.35, pose: 'backR' }, { t: 6.6, pose: 'lowR' }, { t: 6.85, pose: 'downR' },
  { t: 7.2, pose: 'stepL' }, { t: 7.55, pose: 'stand' }, { t: 9, pose: 'stand' },
];

const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses: P, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
};

/* ---------- Report: box clearance, floor, knee flexion, leg reach ---------- */
const tl = R.buildTimeline(ex);
function boxPen(W) {
  let worst = { d: 0 };
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s), pts = [];
    if (g.kind === 'capsule') { for (let i = 0; i <= 6; i++) { const c = V.lerp(g.a, g.b, i / 6), r = g.r[0] + ((g.r[1] - g.r[0]) * i) / 6; for (const d of [[1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 1, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0]]) pts.push(V.add(c, V.scale(d, r))); } }
    else for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) { if (!a && !b && !c) continue; const n = Math.hypot(a, b, c); pts.push(V.add(g.c, V.add(V.add(V.scale(g.axes[0], a / n), V.scale(g.axes[1], b / n)), V.scale(g.axes[2], c / n)))); }
    for (const p of pts) { if (p[0] > BOX.x0 && p[0] < BOX.x1 && p[1] < BOX.h && Math.abs(p[2]) < BOX.hz) { const d = Math.min(p[0] - BOX.x0, BOX.x1 - p[0], BOX.h - p[1]); if (d > worst.d) worst = { d, id: s.id }; } }
  }
  return worst;
}
const kneeAng = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
let pen = { d: 0 }, floor = { y: 1e9 }, kneePk = { v: 0 };
for (let i = 0; i <= 900; i++) {
  const t = (i / 900) * tl.duration, W = R.evalPose(rig, tl.pose(t), contacts), b = boxPen(W), f = L.shapeMinY(W);
  if (b.d > pen.d) pen = { d: +b.d.toFixed(2), id: b.id, t: +t.toFixed(2) };
  if (f.y < floor.y) floor = { y: +f.y.toFixed(2), id: f.id, t: +t.toFixed(2) };
  for (const s of ['r', 'l']) { const k = kneeAng(W, s); if (k > kneePk.v) kneePk = { v: +k.toFixed(1), s, t: +t.toFixed(2) }; }
}
const ab = L.R.evalPose(rig, P.absorb, contacts);
const kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
const byMeasure = (m) => kin.find((k) => k.measure.startsWith(m));
if (byMeasure('Landing knee')) byMeasure('Landing knee').peak = `${d(kneeAng(L.R.evalPose(rig, P.contact, contacts), 'r'))} at contact, ${d(kneeAng(ab, 'r'))} settled`;
if (byMeasure('Landing hip')) byMeasure('Landing hip').peak = d(P.absorb.ch.hip_r.flex);
const trunk = (p) => { const W = L.fk(p); return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]); };
if (byMeasure('Trunk at takeoff')) byMeasure('Trunk at takeoff').peak = `Inclined forward ${d(trunk(P.load))} at the bottom of the load, ${d(trunk(P.toeoff))} at toe-off, with the arm swing`;
if (byMeasure('Takeoff knee')) byMeasure('Takeoff knee').peak = d(kneeAng(L.R.evalPose(rig, P.load, contacts), 'r'));
console.log(`wrote ${L.write(ex)}  flight vy ${vy.toFixed(0)} cm/s, apex pelvis ${(p0[1] + (vy * vy) / (2 * G)).toFixed(1)} cm`);
rep.forEach((r) => console.log('  ' + r));
console.log('  box penetration', JSON.stringify(pen), ' floor', JSON.stringify(floor), ' knee peak', JSON.stringify(kneePk));
