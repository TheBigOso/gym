// Seated Dumbbell Overhead Triceps Extension (GymVisual #218812, Dumbbell Seated Triceps Extension): seated on an
// adjustable bench with the back pad at 82 degrees, buttocks on the seat and the back on the pad, feet flat on the floor
// (planted leg contacts). One dumbbell held overhead in both hands (grip 'end' on the right hand with an offset tuned on
// the skinned mesh; the left hand mirrored on the other side of the handle, palms facing each other).
// The upper arms stay still beside the head, elbows pointing up (constant upper-arm direction, still trunk; only the
// humeral rotation follows the forearm so the hands stay together); the elbows bend, lowering the dumbbell
// behind the head, then straighten. The arms and dumbbell pass behind the plane of the pad, so the pad length is solved
// to end just below them (about shoulder-blade height). Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const meta = require('./meta/seated-dumbbell-overhead-triceps-extension.json');

const SEAT_H = 42, PAD_ANGLE = 82, XS = 0;                     // seat centre at x = 0, pad hinged at the -X end of the seat
const SINK = JSON.parse(process.env.SINK || '{"butt":5.2,"back":2.4}');  // rig shapes into the seat / pad so the skinned mesh touches them (b2/tri_mesh.mjs)
const TOP_FLEX = 6, BOT_FLEX = +(process.env.BOT_FLEX || 110);
const ZW = +(process.env.ZW || 5.5);                                // wrist |z|: the hands either side of the top plate
const OFF = JSON.parse(process.env.OFF || '[8, 7.5, 0]');          // attach.offset [toward fingers, out of palm, thumb] cm: both hands on the handle, plates either side (tuned on the skinned mesh)
const UA_FWD = +(process.env.UA_FWD || -0.3);                     // upper arm tilt forward (x per unit up)
const PAD_CLEAR = 3;                                              // dumbbell clearance above the pad top (cm)
let padLen = +(process.env.PAD_LEN || 80);
const padOf = (len) => DBF.bench({ x: XS, seat: 40, height: SEAT_H, width: 30, angle: PAD_ANGLE, back: len });
let pad = padOf(padLen);
const n = [Math.sin(PAD_ANGLE * R.DEG), Math.cos(PAD_ANGLE * R.DEG), 0]; // pad surface normal toward the athlete
const padDist = (W, id) => V.dot(V.sub(T.extremePt(W, T.shapeOf(id), V.scale(n, -1)), pad.hinge), n); // shape surface in front of the pad (cm)

// Seated base: hips and knees about 90, trunk reclined with the pad.
const p0 = L.POSES.standing().pose; delete p0.ik;
Object.assign(p0.ch, { spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 }, hip_r: { flex: 88, abd: 5, rot: 0 }, hip_l: { flex: 88, abd: 5, rot: 0 }, knee_r: { flex: 90 }, knee_l: { flex: 90 },
  sc_r: { protract: 0, elevate: 8 }, sc_l: { protract: 0, elevate: 8 } });
p0.root.pos = [XS - 5, SEAT_H + 12, 0]; p0.root.rot = { pitch: 8 };
const buttY = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'));
let base = L.solvePose(p0, ['root.pos.0', 'root.pos.1', 'root.rot.pitch', 'ch.spine_l5.flex', 'ch.spine_t12.flex', 'ch.spine_t6.flex'], [
  (W) => [(buttY(W) - (SEAT_H - SINK.butt)) * 4, (padDist(W, 'chest') + SINK.back) * 3, Math.min(0, Math.min(padDist(W, 'buttock_r'), padDist(W, 'buttock_l')) + SINK.butt) * 3, (Math.min(padDist(W, 'buttock_r'), padDist(W, 'buttock_l')) + SINK.butt - 1) * 0.5],
  L.obj.reg('ch.spine_l5.flex', -4, 0.3), L.obj.reg('ch.spine_t12.flex', 0, 0.3), L.obj.reg('ch.spine_t6.flex', 2, 0.3),
], { iters: 400 }).pose;
// Head upright, eyes forward
base = L.solvePose(base, ['ch.neck_c7.flex'], [(W) => { const f = Q.rot(W.head_c1.q, [1, 0, 0]); return [f[1] * 10]; }, L.obj.reg('ch.neck_c7.flex', 0, 0.05)]).pose;
{ const f = base.ch.neck_c7.flex; base.ch.neck_c7 = { rot: 0, flex: r1(f * 0.5) }; base.ch.head_c1 = { rot: 0, flex: r1(f * 0.5) }; }
const W0 = L.fk(base);
// Feet flat, shins about vertical
const contacts = [H.legC('r', { pole: [1, 0.2, 0.15], rot: H.footQ(0, -6) }), H.legC('l', { pole: [1, 0.2, -0.15], rot: H.footQ(0, 6) })];
const FOOT = { r: [r1(W0.knee_r.p[0] + 4), L.ANKLE_H, 16], l: [r1(W0.knee_r.p[0] + 4), L.ANKLE_H, -16] };
base.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } };
for (const s of ['r', 'l']) base = H.fitLeg(base, s, contacts.find((c) => c.id === `leg_${s}`), FOOT[s], { rot: 0, abd: 5, handRot: contacts.find((c) => c.id === `leg_${s}`).handRot });
// Upper arm: up, tilted UA_FWD forward, converging so the straight-arm wrist sits at |z| = ZW. Its direction never changes;
// per key, the humeral axial rotation turns the forearm's bending plane so the hands stay ZW either side of the midline
// (the plate between the palms) while the elbow bends back.
const Wb = L.fk(base), S = Wb.shoulder_r.p;
const uaZ = (ZW - S[2]) / L.reach(TOP_FLEX), uaDir = V.norm([UA_FWD, Math.sqrt(1 - UA_FWD ** 2 - uaZ ** 2), uaZ]);
const ua = T.upperArm(base, 'r', uaDir, [-1, 0, 0], [[90, 160, 0], [90, 170, 90], [90, 170, -90], [0, 170, 0]]);
base.ch.shoulder_r = ua.ch;
function armAt(flex) {
  const q = clone(base); q.ch.elbow_r = { flex: r1(flex) };
  const set = (x) => { const p = clone(q); p.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return p; };
  const res = (x) => { const W = L.fk(set(x)); return [...V.sub(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)), uaDir).map((v) => v * 40), (W.wrist_r.p[2] - ZW) * 2, Math.max(0, W.wrist_r.p[0] - W.elbow_r.p[0] + 0.0) * 2]; };
  const x = R.solveLM([ua.ch.plane, ua.ch.elev, ua.ch.axial], res, { iters: 400 }).x.map(r1);
  const p = set(x), W = L.fk(p), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p));
  // hand in line with the forearm (fingers along it), palm facing in toward the plate
  const w = T.wristTo(p, 'r', fa, V.norm(V.sub([0, 0, -1], V.scale(fa, V.dot([0, 0, -1], fa)))));
  p.ch.wrist_r = { pron: w.pron, flex: w.flex, dev: w.dev };
  return T.mirrorArm(p);
}
const fl = (u) => TOP_FLEX + (BOT_FLEX - TOP_FLEX) * u;
const poses = { top: armAt(TOP_FLEX), d1: armAt(fl(0.25)), d2: armAt(fl(0.5)), d3: armAt(fl(0.75)), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5), u1: armAt(fl(0.75)), u2: armAt(fl(0.5)), u3: armAt(fl(0.25)) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.3, pose: 'd1' }, { t: 1.8, pose: 'd2' }, { t: 2.3, pose: 'd3' }, { t: 2.9, pose: 'bottom' }, { t: 3.05, pose: 'bottomHold' }, { t: 3.2, pose: 'bottom' }, { t: 3.55, pose: 'u1' }, { t: 3.9, pose: 'u2' }, { t: 4.25, pose: 'u3' }, { t: 4.6, pose: 'top' }, { t: 5.2, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const db = ex.props.find((p) => p.id === 'dbR'); db.attach.offset = OFF;

// Pad length: the forearms, hands and dumbbell pass behind the plane of the pad on their way behind the head, so the pad
// top must stay PAD_CLEAR cm below anything that goes behind its front surface (longest such pad, at most 80 cm).
const tl = R.buildTimeline(ex), loopW = Array.from({ length: 261 }, (_, i) => R.evalPose(rig, tl.pose((i / 260) * ex.timeline.duration), contacts));
function behindLow(W) { // lowest along-pad coordinate (surface) of the parts behind the pad's front surface
  const pts = [];
  const d = T.dumbbellAtOff(W, 'r', 'end', OFF); for (let k = 0; k <= 20; k++) pts.push([V.add(d.ends[1], V.scale(V.sub(d.ends[0], d.ends[1]), k / 20)), d.r]);
  for (const s of ['r', 'l']) for (let k = 0; k <= 10; k++) { pts.push([V.add(W[`elbow_${s}`].p, V.scale(V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p), k / 10)), 3.9 - 1.4 * k / 10]); pts.push([V.add(W[`wrist_${s}`].p, V.scale(V.sub(W[`handtip_${s}`].p, W[`wrist_${s}`].p), k / 10)), 3]); }
  let low = 1e9; for (const [p, r] of pts) { const q = V.sub(p, pad.hinge); if (V.dot(q, n) < r) low = Math.min(low, V.dot(q, pad.padDir) - r); } return low;
}
const behind = Math.min(...loopW.map(behindLow));
if (!process.env.PAD_LEN) { padLen = Math.min(80, Math.floor(behind - PAD_CLEAR)); pad = padOf(padLen); }
const dbLowAlongPad = behind - padLen;
ex.props = [pad.prop, ...ex.props];

// Whole-loop checks
const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/, ARMS = /^(forearm_[rl]|upperarm_[rl]|deltoid_[rl]|biceps_[rl]|traps_[rl]|chest)$/;
const pr = { head: 1e9, arms: 1e9, pad: 1e9, seat: 1e9, handGap: [1e9, -1e9], dbZ: [1e9, -1e9], uaDev: 0 };
const seatBox = { center: [XS, 0, 0], size: [40, SEAT_H, 30] };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
  const h = T.dumbbellBody(W, 'r', 'end', HEAD, undefined, OFF); if (h.d < pr.head) { pr.head = h.d; pr.headId = h.id; pr.headAt = +t.toFixed(2); }
  const a = T.dumbbellBody(W, 'r', 'end', ARMS, undefined, OFF); if (a.d < pr.arms) { pr.arms = a.d; pr.armsId = a.id; pr.armsAt = +t.toFixed(2); }
  pr.pad = Math.min(pr.pad, T.dumbbellPad(W, 'r', 'end', pad, OFF)); pr.seat = Math.min(pr.seat, DBF.dumbbellBoxClearance(W, 'r', seatBox, 'end'));
  pr.uaDev = Math.max(pr.uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaDir));
  const gap = V.len(V.sub(W.wrist_r.p, W.wrist_l.p)); pr.handGap = [Math.min(pr.handGap[0], gap), Math.max(pr.handGap[1], gap)];
  const c = T.dumbbellAtOff(W, 'r', 'end', OFF).c[2]; pr.dbZ = [Math.min(pr.dbZ[0], c), Math.max(pr.dbZ[1], c)];
} });
const Wt = L.fk(poses.top, contacts), Wbt = L.fk(poses.bottom, contacts);
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p)); // upper arm vs the trunk line (180 = straight overhead)
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wbt, 'r'))} at the bottom`);
set('Shoulder elevation (upper arm)', 'setup', `${d(elevOf(Wt))} from the trunk line, elbows ${Math.round(2 * Math.abs(Wt.elbow_r.p[2]))} cm apart`); set('Shoulder elevation (upper arm)', 'peak', `Unchanged (upper arm drifts at most ${pr.uaDev.toFixed(1)}° over the loop)`);
set('Back pad angle', 'setup', `${PAD_ANGLE}° (pad ${padLen} cm, top about shoulder-blade height; seat ${SEAT_H} cm)`); set('Back pad angle', 'peak', 'Back stays on the pad');
set('Dumbbell clearance', 'setup', 'Dumbbell overhead'); set('Dumbbell clearance', 'peak', `${r1(pr.head)} cm behind the head at the closest (rig shapes); arms and dumbbell pass ${r1(dbLowAlongPad)} cm above the pad top`);
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.3 s down, 0.3 s pause, 1.4 s up, 0.6 s at the top');
console.log(`Seated DB Overhead Triceps Extension: wrote ${L.write(ex)}\n  root ${JSON.stringify(base.root)} spine ${[base.ch.spine_l5.flex, base.ch.spine_t12.flex, base.ch.spine_t6.flex]} neck ${base.ch.neck_c7.flex} buttY ${r1(buttY(Wt) - SEAT_H)} chestPad ${r1(padDist(Wt, 'chest'))} buttPad ${r1(padDist(Wt, 'buttock_r'))} padLen ${padLen} (arms/dumbbell pass ${r1(dbLowAlongPad)} cm above the pad top)\n  shoulder ${JSON.stringify(ua.ch)} cost ${ua.cost.toExponential(1)} wrist top ${JSON.stringify(poses.top.ch.wrist_r)} bottom ${JSON.stringify(poses.bottom.ch.wrist_r)} elbow ${r1(T.elbowOf(Wt, 'r'))}..${r1(T.elbowOf(Wbt, 'r'))} elev ${r1(elevOf(Wt))} hip ${JSON.stringify(base.ch.hip_r)} knee ${r1(H.kneeOf(Wt, 'r'))}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (pr.head < 0.5 || pr.pad < 0 || pr.seat < 0) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
if (process.env.DBG) for (const nm of ['top', 'bottom']) { const W = L.fk(poses[nm], contacts), dd = T.dumbbellAtOff(W, 'r', 'end', OFF), hs = R.shapeWorld(W, T.shapeOf('head'));
  console.log('DBG', nm, 'sh', W.shoulder_r.p.map(r1), 'el', W.elbow_r.p.map(r1), 'wr', W.wrist_r.p.map(r1), 'db', dd.ends.map((e) => e.map(r1)), 'headC', hs.c.map(r1), 'headBack', T.extremePt(W, T.shapeOf('hair'), [-1, 0, 0]).map(r1), 'headTop', T.extremePt(W, T.shapeOf('hair'), [0, 1, 0]).map(r1)); }
