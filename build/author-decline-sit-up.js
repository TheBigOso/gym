// Decline Sit-up (GymVisual #028213; page not readable here, movement from the name and standard coaching): lying on a
// 25-degree decline board (gear pack decline_bench), head toward the low end, knees bent about 90 degrees, feet flat on
// the board near the high end and hooked under the ankle roller (planted contacts), fingertips lightly behind the head,
// elbows wide. Curl the head and shoulder blades up, keep curling and sit up until the chest is close to the thighs,
// pause, then roll back down: low back first, shoulder blades, head last. Same movement as the floor sit-up
// (author-sit-up.js), authored in the board's flat frame (y = 0 is the board surface) and moved onto the board with
// gear-benches.boardFrame; the roller is fitted over the insteps. Bilateral.
const L = require('./lib');
const { R, V, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const M = require('./families/b4-core2');
const GB = require('./families/gear-benches');
const meta = require('./meta/decline-sit-up.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANGLE = ENV('ANGLE', 25), ANK_X = ENV('ANK_X', -26); // ankle joints this far down the board from its high edge (flat frame)
const KNEE = 88;
const lie0 = M.lie({ kneeFlex: 90, headRest: 'hands' });
const F = CA.plantFeet(lie0, KNEE);
const lie = F.pose, P0 = lie.root.rot.pitch, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
const LEG = { hip: clone(lie.ch.hip_r), hipL: clone(lie.ch.hip_l) };
const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const sitBottom = (W) => Math.min(M.bottomOf(W, 'buttock_r'), M.bottomOf(W, 'buttock_l'), M.bottomOf(W, 'pelvis'));
const SIT0 = sitBottom(L.fk(lie));

// Pelvis pitch P (smaller = rolled toward the thighs). The legs stay world-fixed: hip flexion grows by the pitch change.
// `drop` lowers the pelvis (cm) so the buttocks stay pressed into the mat as the pelvis rolls onto the sit bones.
function setP(q, P, drop = 0) {
  q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop);
  q.ch.hip_r = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) });
  q.ch.hip_l = Object.assign(clone(LEG.hipL), { flex: r1(LEG.hipL.flex + (P0 - P)) });
  return q;
}
function trunk(k, guess) {
  const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
  CA.neck(p, k.neck == null ? NECK0 : k.neck);
  let P = P0;
  if (k.fromFloor != null) {
    // step down from the lying pitch to the first crossing (the measure folds back past vertical), then bisect
    let hi = P0 + 10, lo = hi;
    while (lo > 0 && trunkFromFloor(L.fk(setP(clone(p), lo))) <= k.fromFloor) { hi = lo; lo -= 2; }
    for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (trunkFromFloor(L.fk(setP(clone(p), P))) > k.fromFloor) lo = P; else hi = P; }
  } else P = P0 + (k.pitch || 0);
  setP(p, P);
  // keep the buttocks at their lying depth (the pelvis rolls on them, so the joint drops a little as it tips forward)
  const W = L.fk(p, F.contacts), drop = Math.max(0, sitBottom(W) - SIT0);
  setP(p, P, drop);
  // re-fit the leg channels to the anchored feet (the pelvis moved a little)
  let q = p;
  for (const s of ['r', 'l']) q = CA.fitLeg(q, s, F.targets[s], F.contacts);
  q.ik = clone(lie.ik);
  const out = CB.cradle(q, { floor: k.floor ? 0.2 : 1.0, elbowAnt: k.elbowAnt ?? -3, elbowOut: 20, guess, ref: k.floor ? guess : null });
  return out;
}
const KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, floor: true },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 30, pitch: 1 },
  { name: 'rise', l5: 20, t12: 20, t6: 17, neck: 26, fromFloor: 40 },
  { name: 'top', l5: 30, t12: 17, t6: 12, neck: 18, fromFloor: 80 },
  { name: 'topHold', l5: 31, t12: 18, t6: 12.5, neck: 18, fromFloor: 81 },
  { name: 'lower', l5: 32, t12: 22, t6: 16, neck: 22, fromFloor: 45 },
  { name: 'lowBack', l5: 8, t12: 16, t6: 17, neck: 28, pitch: 0 },
  { name: 'touch', l5: 0, t12: 3, t6: 6, neck: 16, pitch: 0, floor: true },
];
// one arm branch for every key, seeded at the curl pose
let seed = null;
for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) {
  const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } };
  const p = trunk(KEYS[1], g); if (!seed || p.__cost < seed.__cost) seed = p;
}
const ARM0 = CB.armOf(seed, 'r');
const poses = {}; let prev = ARM0;
for (const k of KEYS) { const p = trunk(k, k.floor ? ARM0 : prev); prev = CB.armOf(p, 'r'); delete p.__cost; poses[k.name] = p; }
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.5, pose: 'curl' }, { t: 1.95, pose: 'rise' }, { t: 2.4, pose: 'top' }, { t: 2.9, pose: 'topHold' },
  { t: 3.9, pose: 'lower' }, { t: 4.6, pose: 'lowBack' }, { t: 5.0, pose: 'touch' }, { t: 5.5, pose: 'lie' }, { t: 6.4, pose: 'lie' }];
// ---- onto the board: shift along the board so the ankles sit ANK_X from the high edge, fit the roller over the insteps
const dx = ANK_X - F.targets.r[0];
const shift = (p) => { const q = clone(p); q.root.pos[0] = r1(q.root.pos[0] + dx); if (q.ik) for (const k in q.ik) q.ik[k].target[0] = r1(q.ik[k].target[0] + dx); return q; };
const flat = {}; for (const k in poses) flat[k] = shift(poses[k]);
const benchAt = (rollerAt, rollerUp) => GB.declineBench({ x: 0, params: { angle: ANGLE, rollerAt, rollerUp } });
const db0 = benchAt(10, 13), frame = GB.boardFrame(db0);
const contacts = frame.contacts(F.contacts);
const onBoard = {}; for (const k in flat) onBoard[k] = frame.pose(flat[k]);
const Wl = L.fk(onBoard.lie, contacts);
// roller axis RX cm toward the toes from the ankle joint, as low as it goes with ROLL cm above the feet
const RX = ENV('RX', 7), rollerAt = r1(-(ANK_X + RX));
const footGap = (db) => GB.bodyClear(Wl, db, { skip: /^(?!foot_|toe|shank_|calf_)/, parts: /^pad[5-7]$/ }).d;
let lo = 6, hi = 24; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (footGap(benchAt(rollerAt, m)) >= ENV('ROLL', 0.3)) hi = m; else lo = m; }
const db = benchAt(rollerAt, r1(hi + 0.05));
const ex = CA.buildModule(meta, onBoard, keyframes, contacts);
ex.props = [db.prop];
const band = [77, 83].map((a) => trunk(Object.assign({}, KEYS[3], { fromFloor: a }), ARM0).ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...band)), max: Math.ceil(Math.max(...band)) };

// whole loop: planted feet, body on the board (no shape sinks more than SINK cm into the pad plane), body vs the rest of
// the bench (roller, posts) clear, the feet under the roller
const pad = db.surfaces.pad, padPlane = { o: pad.o, n: pad.n };
const pr = { sink: { d: 1e9 }, parts: { d: 1e9 }, roll: [1e9, -1e9], floor: 1e9 };
const trunkBoard = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), pad.n);
const rep = CA.scan(ex, { trunk: (W) => trunkBoard(W), hip: (W, p) => p.ch.hip_r.flex });
{
  const tl = R.buildTimeline(ex), D = ex.timeline.duration;
  for (let i = 0; i <= 240; i++) {
    const t = (i / 240) * D, W = R.evalPose(L.rig, tl.pose(t), ex.contacts);
    for (const s of L.rig.shapes) { if (/^(hand|thumb)_/.test(s.id)) continue; const g = GB.shapePlane(W, s.id, padPlane); if (g < pr.sink.d) pr.sink = { d: +g.toFixed(2), shape: s.id, t: +t.toFixed(2) }; }
    const b = GB.bodyClear(W, db, { skip: /^(foot_|toe|hand_|thumb_)/, parts: /^(?!pad0$)/ }); if (b.d < pr.parts.d) pr.parts = Object.assign(b, { t: +t.toFixed(2) });
    const r = GB.bodyClear(W, db, { skip: /^(?!foot_)/, parts: /^pad[5-7]$/ }).d; pr.roll = [Math.min(pr.roll[0], r), Math.max(pr.roll[1], r)];
    pr.floor = Math.min(pr.floor, L.shapeMinY(W).y);
  }
}
const Wt = L.fk(onBoard.topHold, contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pk = poses.topHold;
kin[0].setup = `Lying on the ${ANGLE}° decline (shoulder blades on the board)`; kin[0].peak = `${d(trunkBoard(Wt))} from the board (chest toward the thighs; ${d(trunkBoard(Wt) - ANGLE)} from the floor)`;
kin[1].setup = d(lie.ch.spine_l5.flex) + ' (slight lordosis)'; kin[1].peak = `${d(pk.ch.spine_l5.flex)} (L5-T12 segment, rounded)`;
kin[2].setup = d(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'; kin[2].peak = `${d(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} at the top (more during the curl)`;
kin[3].setup = d(lie.ch.hip_r.flex); kin[3].peak = `${d(pk.ch.hip_r.flex)} (pelvis rolled toward the thighs)`;
kin[4].setup = d(CA.kneeOf(Wl, 'r')) + ', feet under the roller'; kin[4].peak = `${d(CA.kneeOf(Wt, 'r'))}, feet unchanged`;
kin[5].setup = 'Rest 0.8 s'; kin[5].peak = '0.7 s curl, 0.9 s sit up, 0.5 s pause, 2.1 s roll down, 1.4 s rest';
console.log(`Decline Sit-up: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: db.prop.params, slide: rep.slide, trunk: rep.trunk, hip: rep.hip, sink: pr.sink, parts: pr.parts, roll: pr.roll.map(r1), floor: r1(pr.floor), measure: ex.checks.measure })}`);
const fails = [];
if (rep.slide > 0.05) fails.push('planted feet slide');
if (pr.sink.d < -0.8) fails.push(`body sinks into the board ${JSON.stringify(pr.sink)}`);
if (pr.parts.d < -0.5) fails.push(`body into the bench ${JSON.stringify(pr.parts)}`);
if (pr.roll[0] < -0.6 || pr.roll[0] > 1.5) fails.push(`feet not under the roller ${pr.roll}`);
if (pr.floor < 1) fails.push('body near the floor');
if (rep.trunk[1] < 75 || rep.trunk[1] > 88) fails.push(`peak trunk ${rep.trunk[1]} outside 75-88 degrees`);
if (fails.length) { console.error(`FAIL decline-sit-up: ${fails.join('; ')}`); process.exitCode = 1; }
module.exports = { ex };
