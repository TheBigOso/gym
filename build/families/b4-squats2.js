// Batch 4 loaded squats and lunges family helpers: dumbbells racked on the shoulders (front squat, thruster), pressed
// overhead (thruster, overhead lunge), one dumbbell held by its top end between the legs (sumo squat), a heel-pivot foot
// (cossack squat: the straight leg turns up onto its heel), and a hand on a side wall (sissy squat).
// Builds on build/families/b3-shoulders.js (solveArm, dbClearance), b3-legs.js and the batch 2 families.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const S = require('./b3-shoulders');
const B = require('./b3-legs');
const H = require('./hips');
const DB = require('./dumbbell');

const qArr = (q) => q.map((v) => +v.toFixed(6));
const t6 = (W) => W.spine_t6;
// point given relative to the right shoulder in the upper-trunk (spine_t6) frame -> world
// `level` (0..1) turns the frame back toward upright by that fraction of the upper-trunk lean (the forearms stay more vertical)
const leanOf = (q) => { const up = Q.rot(q, [0, 1, 0]); return Math.atan2(up[0], up[1]) / R.DEG; }; // + = leaning forward
const rackFrame = (W, level = 0) => Q.mul(Q.axis([0, 0, 1], level * leanOf(t6(W).q)), t6(W).q);
const fromShoulder = (W, v, level = 0) => { const T = t6(W), F = rackFrame(W, level), sh = Q.rot(Q.conj(F), V.sub(W.shoulder_r.p, T.p)); return V.add(T.p, Q.rot(F, V.add(sh, v))); };

/* ---------------- dumbbells racked on the shoulders ---------------- */
// Neutral grip (palms facing each other), the handles pointing forward, the rear plate resting on top of the front of the
// shoulder, elbows forward and down. Targets ride in the upper-trunk frame so the rack follows the trunk lean.
const RACK = { wrist: [12, -4, 1.5], elbow: [18, -24, 6], palm: [0, 0.2, -1], wristFlex: -50, wristDev: 0, sc: { protract: 6, elevate: 8 } };
// Arm solve with the wrist flexion free: wrist position, palm direction (trunk frame), handle axis (world: the thumb side of
// the right fist points back, nearly level), elbow placement (soft), channel limits.
const RACK_PATHS = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
const LIM = { 'ch.elbow_r.flex': [0, 150], 'ch.wrist_r.flex': [-75, 70], 'ch.wrist_r.dev': [-18, 30], 'ch.shoulder_r.plane': [-55, 135], 'ch.shoulder_r.elev': [0, 205] };
function armSolve(p, spec, guess) {
  const objs = [L.obj.at('wrist_r', spec.wrist, 3)];
  if (spec.elbow) objs.push(L.obj.at('elbow_r', spec.elbow, spec.wElbow ?? 0.6));
  if (spec.palm) objs.push((W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), V.norm(spec.palm)).map((v) => v * (spec.wPalm ?? 4)));
  if (spec.axis) objs.push((W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), V.norm(spec.axis)).map((v) => v * (spec.wAxis ?? 5)));
  if (spec.extra) objs.push(spec.extra);
  objs.push((W, q) => RACK_PATHS.map((pp) => { const lim = LIM[pp], v = L.getPath(q, pp) ?? 0; return lim ? (Math.max(0, lim[0] - v) + Math.max(0, v - lim[1])) * 4 : 0; }));
  objs.push(L.obj.reg('ch.wrist_r.dev', 0, 0.02), L.obj.reg('ch.wrist_r.flex', 0, 0.01), L.obj.reg('ch.shoulder_r.axial', guess['ch.shoulder_r.axial'] ?? 0, 0.005));
  let best = null;
  const seeds = [guess, ...(spec.seeds || [])];
  for (const g of seeds) {
    const q0 = clone(p);
    for (const pp of RACK_PATHS) if (g[pp] != null) L.setPathV(q0, pp, g[pp]);
    const r = L.solvePose(q0, RACK_PATHS, objs, { iters: 500 });
    if (!best || r.cost < best.cost - 1e-6) best = r;
  }
  const q = best.pose, W = L.fk(q);
  for (const pp of ['ch.shoulder_r.plane', 'ch.shoulder_r.axial', 'ch.wrist_r.pron']) L.setPathV(q, pp, r1(guess[pp] != null ? L.getPath(q, pp) + 360 * Math.round((guess[pp] - L.getPath(q, pp)) / 360) : L.wrap(L.getPath(q, pp))));
  q.__err = { wrist: +V.len(V.sub(W.wrist_r.p, spec.wrist)).toFixed(2), elbow: spec.elbow ? +V.len(V.sub(W.elbow_r.p, spec.elbow)).toFixed(2) : 0, cost: +best.cost.toFixed(3) };
  return q;
}
const chOf = (q) => Object.fromEntries(RACK_PATHS.map((pp) => [pp, L.getPath(q, pp)]));
const RACK_GUESSES = [{ plane: 78, elev: 33, axial: -86, flex: 150, pron: 86 }, { plane: 80, elev: 60, axial: 0, flex: 140, pron: 0 }, { plane: 70, elev: 70, axial: 90, flex: 130, pron: 150 }];
// opt overrides RACK fields (wristFlex tilts the handles: more negative = front end higher)
function rackArms(pose, opt = {}) {
  const k = Object.assign({}, RACK, opt);
  const p = clone(pose); p.ch.sc_r = clone(k.sc);
  const W = L.fk(p), F = rackFrame(W, k.level || 0);
  const spec = { wrist: fromShoulder(W, k.wrist, k.level || 0), elbow: fromShoulder(W, k.elbow, k.level || 0), wElbow: 1, palm: Q.rot(F, k.palm), wPalm: 4, wristFlex: k.wristFlex, wristDev: k.wristDev };
  let best = null;
  for (const g of opt.guess ? [opt.guess] : RACK_GUESSES) { const q = S.solveArm(p, Object.assign({ guess: g }, spec)); if (!best || q.__err.cost < best.__err.cost) best = q; }
  best.ch.elbow_r.flex = Math.min(best.ch.elbow_r.flex, 149.5); // the solver's soft limit can overshoot the rig's 150
  const err = best.__err; const q = S.mirrorArm(best); q.__err = err;
  return q;
}

/* ---------------- dumbbells pressed overhead (neutral grip) ---------------- */
// key: { wrist: [fwd, up, out] from the right shoulder in the world frame (trunk upright), elbowHint: world direction the
// elbow should point, sc, axis: handle direction (thumb side of the right fist), palm }. guess: channel map (armSolve).
function pressArm(pose, key, guess) {
  const p = clone(pose); if (key.sc) p.ch.sc_r = clone(key.sc);
  const W = L.fk(p), Sh = W.shoulder_r.p, wrist = V.add(Sh, key.wrist);
  const elbow = key.elbowHint ? S.elbowFor(Sh, wrist, key.elbowHint) : null;
  const q = armSolve(p, { wrist, elbow, wElbow: key.wElbow ?? 0.8, palm: key.palm || [0, 0, -1], wPalm: 3, axis: key.axis || [-1, 0, 0], wAxis: key.wAxis ?? 3,
    seeds: [{ ...guess, 'ch.shoulder_r.axial': guess['ch.shoulder_r.axial'] + 40 }, { ...guess, 'ch.wrist_r.pron': guess['ch.wrist_r.pron'] - 40 }] }, guess);
  return q;
}
// Right arm only (pressArm), mirrored to the left for a pair of dumbbells
const mirrorArms = (q) => { const e = q.__err; S.mirrorArm(q); q.__err = e; return q; };

/* ---------------- one dumbbell hanging by its top end (sumo squat) ---------------- */
// Both arms hang long in front of the body; the dumbbell hangs upright between the legs with its top plate squeezed between
// the palms (palms facing each other, fingers down). The right hand carries it (grip 'end': the bar hangs along the fingers,
// offset puts the top plate between the palms), the left hand mirrors on the other side of the plate.
const SUMO_OFFSET = [18, 7.6, 0];
const SUMO_GUESS = { 'ch.shoulder_r.plane': 130, 'ch.shoulder_r.elev': 14, 'ch.shoulder_r.axial': 0, 'ch.elbow_r.flex': 8, 'ch.wrist_r.pron': 0, 'ch.wrist_r.flex': 0, 'ch.wrist_r.dev': 0 };
function sumoArms(pose, opt = {}) {
  const p = clone(pose); p.ch.sc_r = clone(opt.sc || { protract: 14, elevate: -2 });
  const W = L.fk(p), Sh = W.shoulder_r.p, elbow = opt.elbow ?? 8, half = opt.half ?? SUMO_OFFSET[1], fwd = opt.fwd ?? 11;
  const reach = L.reach(elbow), dz = half - Sh[2], dy = -Math.sqrt(Math.max(1, reach * reach - fwd * fwd - dz * dz));
  const wrist = V.add(Sh, [fwd, dy, dz]);
  const q = armSolve(p, { wrist, palm: [0, 0, -1], wPalm: 4, extra: (Wx) => V.sub(Q.rot(Wx.wrist_r.q, [0, -1, 0]), [0, -1, 0]).map((v) => v * 4),
    seeds: [{ ...SUMO_GUESS, 'ch.shoulder_r.axial': -40 }, { ...SUMO_GUESS, 'ch.shoulder_r.plane': 20, 'ch.wrist_r.pron': 40 }] }, opt.guess || SUMO_GUESS);
  return mirrorArms(q);
}

/* ---------------- heel pivot (cossack squat: the straight leg's foot turns up onto its heel) ---------------- */
// The foot rotates toes-up about a fixed point on the back of the sole (foot frame HEEL_PT, picked so the rig foot shape
// stays within about 0.8 cm of the floor and never more than 0.4 cm below it while pitching 0-35 degrees).
const HEEL_PT = [-2.2, -5.8, 0];
const footQ = (pitch, yaw) => Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)); // pitch > 0 = heel up, < 0 = toes up
// ankle target for a foot pitched toes-up by `up` degrees (yaw = toe-out of that foot) whose heel point stays where the flat
// foot's was; flatAnkle = the flat foot's ankle target
function heelPivot(flatAnkle, up, yaw) {
  const H0 = V.add(flatAnkle, Q.rot(footQ(0, yaw), HEEL_PT));
  return V.sub(H0, Q.rot(footQ(-up, yaw), HEEL_PT)).map((v) => +v.toFixed(2));
}
const heelContact = (s, up, yaw, id) => H.legC(s, { rot: footQ(-up, yaw), id: id || `heel_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} foot (on the heel)` });

// Mirror a key pose left-right (swap _r/_l channels and contacts, negate the z axis and the axial/lateral spine channels)
function mirrorPose(p) {
  const q = clone(p), sw = (k) => (k.endsWith('_r') ? k.slice(0, -2) + '_l' : k.endsWith('_l') ? k.slice(0, -2) + '_r' : k);
  q.ch = {};
  for (const [j, v] of Object.entries(p.ch)) q.ch[sw(j)] = clone(v);
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6', 'neck_c7', 'head_c1']) if (q.ch[j]) { if (q.ch[j].rot) q.ch[j].rot = -q.ch[j].rot; if (q.ch[j].latFlex) q.ch[j].latFlex = -q.ch[j].latFlex; }
  q.root.pos = [p.root.pos[0], p.root.pos[1], -p.root.pos[2]];
  q.root.rot = Object.assign({}, p.root.rot); if (q.root.rot.yaw) q.root.rot.yaw = -q.root.rot.yaw; if (q.root.rot.roll) q.root.rot.roll = -q.root.rot.roll;
  q.ik = {};
  for (const [id, k] of Object.entries(p.ik || {})) { q.ik[sw(id)] = Object.assign(clone(k), { target: [k.target[0], k.target[1], -k.target[2]] }); if (k.handRot) q.ik[sw(id)].handRot = qArr(Q.mirrorZ(k.handRot)); }
  return q;
}

/* ---------------- whole-loop scan ---------------- */
// Clearance of the held dumbbells (rig shapes) to the body, each other and the floor, planted-contact slide, channel jumps.
// holds: [{ side, grip, offset }]; skip(side, shapeId) -> true to leave a shape out (the holding hand and forearm always are;
// a racked dumbbell rests on its own shoulder, measured on the skinned mesh instead). box: optional box prop to keep clear.
const BODY = rig.shapes.filter((s) => !/^(eye|brow)/.test(s.id));
function holdPoints(W, h) {
  const d = DB.dumbbellAt(W, h.side, B.gripSpec(h.grip || 'handle', h.offset)), ax = d.ax;
  const t = V.norm(V.cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), b = V.cross(ax, t), out = [];
  for (const sg of [-1, 1]) for (const s of [7, 11.5, 16]) {
    for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * Math.PI; out.push(V.add(d.c, V.add(V.scale(ax, sg * s), V.add(V.scale(t, Math.cos(a) * 6), V.scale(b, Math.sin(a) * 6))))); }
    if (s === 16) out.push(V.add(d.c, V.scale(ax, sg * s)));
  }
  return { d, pts: out };
}
const JCH = (pz) => { const o = {}; for (const j of ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'sc_r']) for (const c in pz.ch[j] || {}) o[`${j}.${c}`] = pz.ch[j][c]; return o; };
function scan(ex, { holds = [], planted = [], skip = () => false, box = null, probe } = {}) {
  let clr = { d: 1e9 }, dbFloor = 1e9, jump = { v: 0 }, prevC = null;
  const rep = H.loopReport(ex, {
    planted,
    probe: (W, pz, t, out) => {
      const hp = holds.map((h) => holdPoints(W, h));
      holds.forEach((h, i) => {
        dbFloor = Math.min(dbFloor, B.dbMinY(W, h.side, h.grip || 'handle', h.offset));
        for (const s of BODY) {
          if (new RegExp(`^(hand|thumb|forearm)_${h.side}$`).test(s.id) || skip(h.side, s.id, t)) continue;
          for (const p of hp[i].pts) { const d = S.shapeDist(W, s, p); if (d < clr.d) clr = { d, what: `db${h.side.toUpperCase()}-${s.id}`, t: +t.toFixed(2) }; }
        }
        if (box) { const bc = DB.dumbbellBoxClearance(W, h.side, box, B.gripSpec(h.grip || 'handle', h.offset)); if (bc < clr.d) clr = { d: bc, what: `db${h.side.toUpperCase()}-box`, t: +t.toFixed(2) }; }
      });
      const cc = JCH(pz);
      if (prevC) for (const k in cc) { const d = Math.abs(cc[k] - (prevC[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
      prevC = cc;
      if (probe) probe(W, pz, t, out);
    },
  });
  rep.clear = { d: +clr.d.toFixed(2), what: clr.what, t: clr.t }; rep.dbFloor = +dbFloor.toFixed(1); rep.jump = jump;
  return rep;
}
function gate(name, rep, { minClear = -0.5, maxJump = 4 } = {}) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor}`);
  if (rep.dbFloor < 0) bad.push(`dumbbell below the floor ${rep.dbFloor}`);
  if (rep.clear && rep.clear.d < minClear) bad.push(`dumbbell clearance ${rep.clear.d} cm (${rep.clear.what} at ${rep.clear.t}s)`);
  if (rep.jump && rep.jump.v > maxJump) bad.push(`channel jump ${rep.jump.v} deg (${rep.jump.k} at ${rep.jump.t}s)`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
}
const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
module.exports = { qArr, fromShoulder, rackFrame, RACK, rackArms, armSolve, chOf, RACK_PATHS, pressArm, mirrorArms, SUMO_OFFSET, sumoArms, HEEL_PT, footQ, heelPivot, heelContact, mirrorPose, scan, gate, holdPoints, NOTE };
