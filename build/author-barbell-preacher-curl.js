// Barbell Preacher Curl (GymVisual #007013; page not readable here, movement from the name and standard coaching):
// seated on a preacher bench (gear pack preacher_bench), chest against the top of a 45-degree arm pad, armpits on its
// rolled top edge, the backs of both upper arms flat on the pad. Underhand grip about shoulder width (42 cm between the
// handle points). From nearly straight arms (bar a little above the pad, not hanging off it) the bar curls up about the
// elbows, which stay on the pad, until the forearms are about vertical; slow lower. Bilateral.
// The pad is fitted to the seated body with gear-benches.preacherFit (top edge under the armpit, surface under the
// upper arm), so the prop's params come out of this script.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const H = require('./families/hips');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const A = require('./families/b5-bbarms');
const GB = require('./families/gear-benches');
const meta = require('./meta/barbell-preacher-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const SEAT_H = ENV('SEAT_H', 52), ANGLE = ENV('ANGLE', 45);
const STANCE = ENV('STANCE', 16), FOOT_DX = ENV('FOOTDX', 30);
const st = L.POSES.standing({ stance: STANCE, toeOut: 10 });
const contacts = st.contacts;
let p = clone(st.pose); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: ENV('L5', 2), latFlex: 0 }, spine_t12: { rot: 0, flex: ENV('T12', 6), latFlex: 0 }, spine_t6: { rot: 0, flex: ENV('T6', 6), latFlex: 0 },
  hip_r: { flex: 88, abd: 6, rot: -4 }, hip_l: { flex: 88, abd: 6, rot: -4 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: ENV('PRO', 26), elevate: 0 }, sc_l: { protract: ENV('PRO', 26), elevate: 0 },
  neck_c7: { rot: 0, flex: ENV('NECK', -6) }, head_c1: { rot: 0, flex: ENV('HEAD', -4) } });
p.root.pos = [ENV('ROOTX', -2), 60, 0]; p.root.rot = { pitch: ENV('PITCH', -24) };
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => C.shapePlaneDist(W, id, [0, SEAT_H, 0], [0, 1, 0])));
p = L.solvePose(p, ['root.pos.1'], [(W) => [(seatY(W) - ENV('SEAT_OFF', 0)) * 4]]).pose;
const W0 = L.fk(p);
p.ik = { leg_r: { target: [r1(W0.hip_r.p[0] + FOOT_DX), L.ANKLE_H, STANCE], weight: 1 }, leg_l: { target: [r1(W0.hip_l.p[0] + FOOT_DX), L.ANKLE_H, -STANCE], weight: 1 } };
const base = p;

// elbow on the pad: the upper arm points down the pad slope from the shoulder, elbows a little inside the shoulders
const S = L.fk(base, contacts).shoulder_r.p, UA = V.len(L.rig.byId.elbow_r.offset), a = ANGLE * R.DEG;
const EZ = ENV('EZ', 16), dz = EZ - S[2], c = Math.sqrt(UA * UA - dz * dz), UAA = ENV('UAA', ANGLE + 7) * R.DEG;
const E = [r1(S[0] + c * Math.cos(UAA)), r1(S[1] - c * Math.sin(UAA)), EZ];
// pad top edge: as high up the upper arm as the chest allows (the chest sits behind the rolled top edge, the armpits
// over it); bisect the edge position along the slope for CHEST cm between the trunk and the pad
const TRUNK = /^(chest|ribcage|abdomen|pecs_[rl]|pelvis|traps_[rl]|lats_[rl]|neck|head)/, NOT_TRUNK = new RegExp(`^(?!${TRUNK.source.slice(2, -1)})`);
const Wbase = L.fk(base, contacts);
const benchAt = (armpit) => GB.preacherBench({ x: 0, params: Object.assign({ seatH: SEAT_H }, GB.preacherFit(S, E, { angle: ANGLE, armpit, gap: ENV('GAP', 4.8) })) });
let ARMPIT = ENV('ARMPIT', 99);
if (ARMPIT === 99) { let lo = -24, hi = 6; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (GB.bodyClear(Wbase, benchAt(m), { skip: NOT_TRUNK, parts: /^(?!pad0$)/ }).d >= ENV('CHEST', -0.8)) lo = m; else hi = m; } ARMPIT = r1(lo - 0.05); }
const pb = benchAt(ARMPIT), fit = pb.prop.params;
const pad = pb.surfaces.pad;

// bottom angle: smallest grip angle (about the elbow, from straight down toward +X) that keeps the bar shaft and the
// forearms off the pad
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], A1 = ENV('A1', 168);
const shaft = (W) => { const b = EQ.barAt(W, BB.GRIP); return GB.segClear(V.sub(b.c, V.scale(b.ax, 65)), V.add(b.c, V.scale(b.ax, 65)), EQ.BAR.sleeveR, pb); };
const forearm = (W) => GB.bodyClear(W, pb, { skip: /^(?!forearm_|hand_|thumb_)/ }).d;
let a0 = ENV('A0', 0);
if (!a0) {
  let lo = ANGLE, hi = ANGLE + 50;
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2, q = A.curlPoses(base, contacts, { E, a1: A1, FS: [0], a0: m }).poses[0], W = L.fk(q, contacts); if (shaft(W) >= 0.8 && forearm(W) >= -0.6) hi = m; else lo = m; }
  a0 = r1(hi + 0.1);
}
const cp = A.curlPoses(base, contacts, { E, a1: A1, FS, a0 });
const poses = {}, names = [];
cp.poses.forEach((q, i) => { poses[`c${i}`] = q; names.push(`c${i}`); });
poses.squeeze = clone(poses[names[names.length - 1]]); for (const s of ['r', 'l']) poses.squeeze.ch[`wrist_${s}`].flex = r1(poses.squeeze.ch[`wrist_${s}`].flex + 3);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [pb.prop, BB.barbellProp({ plateD: A.PLATE_D })];

// whole loop: bar vs body / floor (barbell sweep), bar shaft vs the bench, body vs the bench (arms and the rest)
const pr = { shaft: 1e9, arms: { d: 1e9 }, body: { d: 1e9 }, elbow: 0 };
const sw = BB.sweep(ex, { skip: A.SKIP, probe: (W, pz, t) => {
  pr.shaft = Math.min(pr.shaft, shaft(W));
  const ar = GB.bodyClear(W, pb, { skip: /^(?!upperarm|biceps|triceps|forearm|elbow|deltoid)/ }); if (ar.d < pr.arms.d) pr.arms = Object.assign(ar, { t: +t.toFixed(2) });
  const bo = GB.bodyClear(W, pb, { skip: /^(upperarm|biceps|triceps|forearm|elbow|deltoid|hand|thumb|thigh|buttock|pelvis)/ }); if (bo.d < pr.body.d) pr.body = Object.assign(bo, { t: +t.toFixed(2) });
  const lg = GB.bodyClear(W, pb, { skip: /^(?!thigh|buttock|pelvis)/, parts: /^(?!pad0$)/ }); if (lg.d < pr.body.d) pr.body = Object.assign(lg, { t: +t.toFixed(2) }); // seat contact: the cushion takes the thighs
  pr.elbow = Math.max(pr.elbow, V.len(V.sub(W.elbow_r.p, E)));
} });
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms nearly straight on the pad 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
const set = H.setKin(ex), gapE = (W) => r1(V.dot(V.sub(W.elbow_r.p, pad.o), pad.n));
set('Upper arm on the pad', 'setup', `Pad ${ANGLE}° (top edge ${r1(pad.o[1])} cm high, ${r1(pad.o[0])} cm ahead of the seat centre); elbow ${gapE(Wb)} cm off the pad surface (upper-arm radius)`);
set('Upper arm on the pad', 'peak', `Elbows stay on the pad (drift ≤${r1(pr.elbow)} cm); arms vs pad ${r1(pr.arms.d)} cm at the closest`);
const trunk = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunk(Wb) - 2), max: Math.ceil(trunk(Wb) + 2) };
const info = { armpit: ARMPIT, a0, a1: A1, E, fit, gripErr: +cp.gripErr.toFixed(2), elbow: [r1(C.elbowFlex(Wb, 'r')), r1(C.elbowFlex(Wt, 'r'))], trunk: r1(trunk(Wb)), seat: +seatY(Wb).toFixed(2), shaftPad: r1(pr.shaft), arms: pr.arms, body: pr.body, elbowDrift: r1(pr.elbow) };
A.report('Barbell Preacher Curl', L.write(ex), sw, info, A.failures(sw, [[cp.gripErr < 0.5, `hands off the bar (${cp.gripErr.toFixed(2)} cm)`], [pr.shaft > 0, 'bar into the bench'], [pr.arms.d > -1.0, 'arms sink into the pad'], [pr.body.d > -1.0, 'body into the bench'], [pr.elbow < 2.5, 'elbows leave the pad']]));
module.exports = { ex };
