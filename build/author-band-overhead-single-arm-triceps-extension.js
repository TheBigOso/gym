// Band Overhead Single Arm Triceps Extension (GymVisual, Band Overhead Single Arm Triceps Extension; movement reference
// only): standing tall, feet about hip width, knees soft (planted leg contacts), left hand on the hip, back to a rack. The
// band is looped low around the rack upright behind the right shoulder and runs up behind the body to a handle in the
// right hand overhead, palm facing in. The upper arm stays still beside the head, elbow pointing up (constant upper-arm direction;
// the humeral rotation follows the forearm so the hand stays at one width); the elbow bends, letting the band draw the
// hand down behind the head, then straightens. (A band under the rear foot was tried first: its strand cut through the
// rear shin, so the band is anchored behind instead.) authoredSide 'right'. Arm keys as in the seated dumbbell version (b3-triceps upperArm / wristTo).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const S = require('./families/b4-shoulders2');
const B5 = require('./families/b5-bandpush');
const meta = require('./meta/band-overhead-single-arm-triceps-extension.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const TOP_FLEX = 6, BOT_FLEX = ENV('BOT_FLEX', 112), ZW = ENV('ZW', 9), UA_FWD = ENV('UA_FWD', -0.1);
const STANCE = 12, RACK_X = ENV('RACK_X', -60), ANCHOR_Y = ENV('ANCHOR_Y', 40);
const st = require('./families/b3-shoulders').standing({ stance: STANCE, knee: 6 }), contacts = st.contacts;
let base = clone(st.pose);
Object.assign(base.ch, { sc_r: { protract: 0, elevate: 8 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 2 } });
base = S.leftOnHip(base);
const Wb = L.fk(base, contacts), Sh = Wb.shoulder_r.p;
const uaZ = (ZW - Sh[2]) / L.reach(TOP_FLEX), uaDir = V.norm([UA_FWD, Math.sqrt(1 - UA_FWD ** 2 - uaZ ** 2), uaZ]);
const ua = T.upperArm(base, 'r', uaDir, [-1, 0, 0], [[90, 160, 0], [90, 170, 90], [90, 170, -90], [0, 170, 0]]);
base.ch.shoulder_r = ua.ch;
function armAt(flex) {
  const q = clone(base); q.ch.elbow_r = { flex: r1(flex) };
  const set = (x) => { const p = clone(q); p.ch.shoulder_r = { plane: x[0], elev: x[1], axial: x[2] }; return p; };
  const res = (x) => { const W = L.fk(set(x), contacts); return [...V.sub(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)), uaDir).map((v) => v * 40), (W.wrist_r.p[2] - ZW) * 2, Math.max(0, W.wrist_r.p[0] - W.elbow_r.p[0]) * 2]; };
  const x = R.solveLM([ua.ch.plane, ua.ch.elev, ua.ch.axial], res, { iters: 400 }).x.map(r1);
  const p = set(x), W = L.fk(p, contacts), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p));
  const w = T.wristTo(p, 'r', fa, V.norm(V.sub([0, 0, -1], V.scale(fa, V.dot([0, 0, -1], fa)))));
  p.ch.wrist_r = { pron: w.pron, flex: w.flex, dev: w.dev };
  return p;
}
const fl = (u) => TOP_FLEX + (BOT_FLEX - TOP_FLEX) * u;
const poses = { top: armAt(TOP_FLEX), d1: armAt(fl(0.25)), d2: armAt(fl(0.5)), d3: armAt(fl(0.75)), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5), u1: armAt(fl(0.75)), u2: armAt(fl(0.5)), u3: armAt(fl(0.25)) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.3, pose: 'd1' }, { t: 1.8, pose: 'd2' }, { t: 2.3, pose: 'd3' }, { t: 2.9, pose: 'bottom' }, { t: 3.05, pose: 'bottomHold' }, { t: 3.2, pose: 'bottom' }, { t: 3.55, pose: 'u1' }, { t: 3.9, pose: 'u2' }, { t: 4.25, pose: 'u3' }, { t: 4.6, pose: 'top' }, { t: 5.2, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// rack behind, shifted so its right upright stands behind the right shoulder
const rk = require('./families/equip').rack({ x: RACK_X, z: r1(Sh[2] - 60), width: 120, hookY: 140 });
const anchor = [RACK_X, ANCHOR_Y, r1(Sh[2])];
ex.props = [rk.prop, ...B5.bandProps({ anchor, sides: ['r'], color: B5.COLOR.light })];
const HEAD = /^(head|hair|ear_[rl]|jaw|nose|neck|brow_[rl]|eye_[rl])$/;
const pr = { head: 1e9, uaDev: 0 };
const rep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'],  probe: (W, pz, t) => {
  const h = T.dumbbellBody(W, 'r', 'handle', HEAD, { length: 13, diameter: 4 }); if (h.d < pr.head) { pr.head = h.d; pr.headId = h.id; pr.headAt = +t.toFixed(2); }
  pr.uaDev = Math.max(pr.uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaDir));
} });
B5.gateBands('band-overhead-single-arm-triceps-extension', rep);
const Wt = L.fk(poses.top, contacts), Wbt = L.fk(poses.bottom, contacts);
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const set = H.setKin(ex), d = B5.d0;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wbt, 'r'))} at the bottom`);
set('Shoulder elevation (upper arm)', 'setup', `${d(elevOf(Wt))} from the trunk line, elbow ${Math.round(Math.abs(Wt.elbow_r.p[2]))} cm from the midline`); set('Shoulder elevation (upper arm)', 'peak', `Unchanged (upper arm drifts at most ${pr.uaDev.toFixed(1)}° over the loop)`);
set('Band', 'setup', `Looped around the rack upright ${-RACK_X} cm behind, ${ANCHOR_Y} cm up, in line with the right shoulder; strand ${rep.bandLen[0]} cm with the hand behind the head`); set('Band', 'peak', `Strand ${rep.bandLen[1]} cm with the arm straight; at least ${r1(rep.band.d)} cm from the body (closest: ${rep.band.id}), handle ${r1(pr.head)} cm from the head`);
set('Trunk', 'setup', `Standing tall (${d(V.angle(V.sub(Wt.neck_c7.p, Wt.pelvis.p), [0, 1, 0]))} from vertical), feet ${2 * STANCE} cm apart, left hand on the hip`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.3 s down, 0.3 s pause, 1.4 s up, 0.6 s at the top');
console.log(`Band Overhead Single Arm Triceps Extension: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} elbow ${r1(T.elbowOf(Wt, 'r'))}..${r1(T.elbowOf(Wbt, 'r'))} elev ${r1(elevOf(Wt))}\n  band ${JSON.stringify(rep.band)} len ${rep.bandLen} slide ${rep.slide} floor ${rep.floor}\n  ${JSON.stringify(pr)}`);
if (pr.head < 0.5) { console.error('FAIL: handle clearance from the head'); process.exitCode = 1; }
