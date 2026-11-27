// Standing Dumbbell Overhead Triceps Extension (GymVisual #043012, Dumbbell Standing Triceps Extension): standing tall,
// feet about hip width (planted leg contacts), one dumbbell held overhead in both hands, palms up under the top plate
// (grip 'end' on the right hand with the seated version's offset tuned on the skinned mesh; the left hand mirrored on
// the other side of the handle). The upper arms stay still beside the head, elbows pointing up (constant upper-arm
// direction; only the humeral rotation follows the forearm so the hands stay together); the elbows bend, lowering the
// dumbbell behind the head, then straighten. Same arm solve as the seated version (b3), on a standing base. Bilateral.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const meta = require('./meta/standing-dumbbell-overhead-triceps-extension.json');
const ENV = (k, d) => +(process.env[k] ?? d);
// bottom elbow 105 (was 112): rig v2's neck shape sits further back, so the dumbbell behind the head bottoms out a little higher
const TOP_FLEX = 6, BOT_FLEX = ENV('BOT_FLEX', 105), ZW = ENV('ZW', 5.5), UA_FWD = ENV('UA_FWD', -0.12);
const OFF = JSON.parse(process.env.OFF || '[8, 7.5, 0]');           // attach.offset, as on the seated version
const st = L.POSES.standing({ stance: 11, toeOut: 8 });
const contacts = st.contacts;
const base = clone(st.pose);
Object.assign(base.ch, { sc_r: { protract: 0, elevate: 8 }, sc_l: { protract: 0, elevate: 8 }, neck_c7: { rot: 0, flex: ENV('NECK', 4) }, head_c1: { rot: 0, flex: ENV('HEADF', 2) }, knee_r: { flex: 4 }, knee_l: { flex: 4 } });
const Wb = L.fk(base, contacts), S = Wb.shoulder_r.p;
const uaZ = (ZW - S[2]) / L.reach(TOP_FLEX), uaDir = V.norm([UA_FWD, Math.sqrt(1 - UA_FWD ** 2 - uaZ ** 2), uaZ]);
const ua = T.upperArm(base, 'r', uaDir, [-1, 0, 0], [[90, 160, 0], [90, 170, 90], [90, 170, -90], [0, 170, 0]]);
// same arm, other ISB representation, when the plane falls outside the rig limits (-60..140): (p + 180, 360 - e, a + 180)
if (ua.ch.plane < -60 || ua.ch.plane > 140) ua.ch = { plane: r1(L.wrap(ua.ch.plane + 180)), elev: r1(360 - ua.ch.elev), axial: r1(L.wrap(ua.ch.axial + 180)) };
base.ch.shoulder_r = ua.ch;
function armAt(flex) {
  const q = clone(base); q.ch.elbow_r = { flex: r1(flex) };
  const set = (x) => { const p = clone(q); p.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return p; };
  const res = (x) => { const W = L.fk(set(x), contacts); return [...V.sub(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)), uaDir).map((v) => v * 40), (W.wrist_r.p[2] - ZW) * 2, Math.max(0, W.wrist_r.p[0] - W.elbow_r.p[0]) * 2]; };
  const x = R.solveLM([ua.ch.plane, ua.ch.elev, ua.ch.axial], res, { iters: 400 }).x.map(r1);
  const p = set(x), W = L.fk(p, contacts), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p));
  const w = T.wristTo(p, 'r', fa, V.norm(V.sub([0, 0, -1], V.scale(fa, V.dot([0, 0, -1], fa)))));
  p.ch.wrist_r = { pron: w.pron, flex: w.flex, dev: w.dev };
  return T.mirrorArm(p);
}
const fl = (u) => TOP_FLEX + (BOT_FLEX - TOP_FLEX) * u;
const poses = { top: armAt(TOP_FLEX), d1: armAt(fl(0.25)), d2: armAt(fl(0.5)), d3: armAt(fl(0.75)), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5), u1: armAt(fl(0.75)), u2: armAt(fl(0.5)), u3: armAt(fl(0.25)) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.3, pose: 'd1' }, { t: 1.8, pose: 'd2' }, { t: 2.3, pose: 'd3' }, { t: 2.9, pose: 'bottom' }, { t: 3.05, pose: 'bottomHold' }, { t: 3.2, pose: 'bottom' }, { t: 3.55, pose: 'u1' }, { t: 3.9, pose: 'u2' }, { t: 4.25, pose: 'u3' }, { t: 4.6, pose: 'top' }, { t: 5.2, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'dbR').attach.offset = OFF;
const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/, ARMS = /^(forearm_[rl]|upperarm_[rl]|deltoid_[rl]|biceps_[rl]|traps_[rl]|chest)$/;
const pr = { head: 1e9, arms: 1e9, handGap: [1e9, -1e9], uaDev: 0, back: 1e9 };
const BACK = /^(chest|ribcage|traps_[rl]|spine.*|scapula_[rl]|lats_[rl])$/;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
  const h = T.dumbbellBody(W, 'r', 'end', HEAD, undefined, OFF); if (h.d < pr.head) { pr.head = h.d; pr.headId = h.id; pr.headAt = +t.toFixed(2); }
  const a = T.dumbbellBody(W, 'r', 'end', ARMS, undefined, OFF); if (a.d < pr.arms) { pr.arms = a.d; pr.armsId = a.id; }
  const b = T.dumbbellBody(W, 'r', 'end', BACK, undefined, OFF); if (b.d < pr.back) { pr.back = b.d; pr.backId = b.id; }
  pr.uaDev = Math.max(pr.uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaDir));
  const gap = V.len(V.sub(W.wrist_r.p, W.wrist_l.p)); pr.handGap = [Math.min(pr.handGap[0], gap), Math.max(pr.handGap[1], gap)];
} });
const Wt = L.fk(poses.top, contacts), Wbt = L.fk(poses.bottom, contacts);
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wbt, 'r'))} at the bottom`);
set('Shoulder elevation (upper arm)', 'setup', `${d(elevOf(Wt))} from the trunk line, elbows ${Math.round(2 * Math.abs(Wt.elbow_r.p[2]))} cm apart`); set('Shoulder elevation (upper arm)', 'peak', `Unchanged (upper arm drifts at most ${pr.uaDev.toFixed(1)}° over the loop)`);
set('Dumbbell clearance', 'setup', 'Dumbbell overhead'); set('Dumbbell clearance', 'peak', `${r1(pr.head)} cm behind the head at the closest (rig shapes), ${r1(pr.back)} cm above the upper back`);
set('Trunk', 'setup', `Trunk vertical (${d(V.angle(V.sub(Wt.neck_c7.p, Wt.pelvis.p), [0, 1, 0]))}), knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.3 s down, 0.3 s pause, 1.4 s up, 0.6 s at the top');
console.log(`Standing DB Overhead Triceps Extension: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} cost ${ua.cost.toExponential(1)} elbow ${r1(T.elbowOf(Wt, 'r'))}..${r1(T.elbowOf(Wbt, 'r'))} elev ${r1(elevOf(Wt))}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(pr)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (pr.head < 0.5 || pr.back < 0) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
