// Push-up (wall) (GymVisual 10390, movement reference only; page not readable at authoring time): stand facing a wall,
// feet hip width and well back, hands on the wall at about shoulder height a little wider than the shoulders, arms
// straight, body in one line leaning about 15 degrees from vertical. Lean in as one piece (pivoting at the ankles, heels
// down) with the elbows about 30-45 degrees from the body until the face is a few cm from the wall, pause, push back to
// straight arms. Bilateral. Feet planted flat (leg contacts), palms planted on the wall (H.wallHand contacts: palm toward
// the wall, fingers up). Each key is solved for root x / y / pitch with straight legs to the planted ankles and the trunk
// in line with the legs; the top by the straight-arm reach, the other keys by the nose's distance from the wall.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/push-up-wall.json');

const LEAN0 = 15, FOOT_Z = 10, TOP_ELBOW = 12, NOSE_GAP = 4, HAND_DROP = 4, HAND_OUT = 6;
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, 0) })).concat([H.wallHand('r'), H.wallHand('l')]);
const AR = [0, L.ANKLE_H, FOOT_Z], AL = [0, L.ANKLE_H, -FOOT_Z];
const legLen = (kf) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(kf * R.DEG)); };
const LEG_D = legLen(3);
const trunkDir = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
const sag = (a, b) => Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]) / R.DEG;
const st = L.POSES.standing({ stance: FOOT_Z });
const base = clone(st.pose); delete base.ik;
for (const s of ['r', 'l']) { base.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; base.ch[`knee_${s}`] = { flex: 3 }; base.ch[`ankle_${s}`] = { dorsi: 0 }; }
const BEND0 = (() => { const W = L.fk(base); return sag(V.sub(W.hip_l.p, W.ankle_l.p), trunkDir(W)); })();
const legsObj = (W) => [(V.len(V.sub(W.hip_r.p, AR)) - LEG_D) * 4, (V.len(V.sub(W.hip_l.p, AL)) - LEG_D) * 4, (sag(V.sub(W.hip_l.p, AL), trunkDir(W)) - BEND0) * 0.6];
const leanOf = (W) => V.angle(V.sub(W.neck_c7.p, V.scale(V.add(AR, AL), 0.5)), [0, 1, 0]);
const noseX = (W) => H.frontOf(W, 'nose');
function body(u, extra) {   // u: 0 top, 1 bottom (shoulder blades and head)
  const p = clone(base);
  p.ch.sc_r = { protract: r1(8 - 8 * u), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(2 - 3 * u) }; p.ch.head_c1 = { rot: 0, flex: r1(2 - 3 * u) };
  p.root.rot = { pitch: -LEAN0 };
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [legsObj, extra], { iters: 400 });
  let q = s.pose;
  q.ik = { leg_r: { target: AR, weight: 1 }, leg_l: { target: AL, weight: 1 } };
  for (const sd of ['r', 'l']) { q = H.fitLeg(q, sd, contacts.find((c) => c.id === `leg_${sd}`), sd === 'r' ? AR : AL); delete q.__cost; }
  return q;
}
// top: lean LEAN0 from vertical; the hands go on the wall at straight-arm reach in front of the shoulders
const top0 = body(0, (W) => [(leanOf(W) - LEAN0) * 0.5]);
const S0 = L.fk(top0).shoulder_r.p;
const HAND = H.wallHandTargets(S0, { flex: TOP_ELBOW, drop: HAND_DROP, inset: -HAND_OUT });
const withArms = (q) => {
  q = clone(q);
  q.ik = Object.assign(q.ik || {}, { arm_r: { target: HAND.r, weight: 1 }, arm_l: { target: HAND.l, weight: 1 } });
  for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], H.WALL_ARM_GUESS(s)); delete q.__cost; }
  for (const j of Object.keys(q.ch)) for (const c in q.ch[j]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  return q;
};
const poses = { top: withArms(top0) };
const WALL_X = H.wallFaceX(poses.top, contacts);
const bottom0 = body(1, (W) => [(noseX(W) - (WALL_X - NOSE_GAP)) * 2]);
poses.bottom = withArms(bottom0);
const nTop = noseX(L.fk(poses.top, contacts)), nBot = WALL_X - NOSE_GAP;
const ease = (f) => f * f * (3 - 2 * f);
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }];
const ND = 5, NU = 4;
for (let i = 1; i < ND; i++) { const u = ease(i / ND), n = `down${i}`; poses[n] = withArms(body(u, (W) => [(noseX(W) - (nTop + (nBot - nTop) * u)) * 2])); keyframes.push({ t: +(0.8 + 1.6 * i / ND).toFixed(3), pose: n }); }
keyframes.push({ t: 2.4, pose: 'bottom' }, { t: 2.7, pose: 'bottom' });
for (let i = 1; i < NU; i++) { const u = 1 - ease(i / NU), n = `up${i}`; poses[n] = withArms(body(u, (W) => [(noseX(W) - (nTop + (nBot - nTop) * u)) * 2])); keyframes.push({ t: +(2.7 + 1.1 * i / NU).toFixed(3), pose: n }); }
keyframes.push({ t: 3.8, pose: 'top' }, { t: 4.6, pose: 'top' });
for (const p of Object.values(poses)) p.ik = { leg_r: { target: AR, weight: 1 }, leg_l: { target: AL, weight: 1 }, arm_r: { target: HAND.r, weight: 1 }, arm_l: { target: HAND.l, weight: 1 } };

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [{ id: 'wall', kind: 'wall', center: [r1(WALL_X + 5), 0, 0], size: [10, 220, 140] }];
// loop scan: planted contacts, floor, ankle angle, body into the wall (forearms may come right up to the wall by the
// planted hands; everything else keeps 1 cm)
let wallPen = { d: 1e9 };
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_r', 'leg_l'], probe: (W, pz, t) => { for (const sh of rig.shapes) { if (/^(hand|thumb)_/.test(sh.id)) continue; const ids = sh.bilateral ? [`${sh.id}_r`, `${sh.id}_l`] : [sh.id]; for (const id of ids) { const d = WALL_X - H.frontOf(W, id) - (/^forearm_/.test(id) ? 0 : 1); if (d < wallPen.d) wallPen = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; } } } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const el = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(el(Wt))} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(el(Wb))} with the nose ${NOSE_GAP} cm from the wall`);
set('Body lean', 'setup', `${d(leanOf(Wt))} from vertical (ankles to C7)`); set('Body lean', 'peak', `${d(leanOf(Wb))} from vertical at the bottom`);
set('Hand position', 'setup', `Wrists ${Math.round(HAND.r[1])} cm up (shoulders ${Math.round(S0[1])} cm), ${Math.round(2 * HAND.r[2])} cm apart; wall ${Math.round(WALL_X)} cm in front of the ankles`); set('Hand position', 'peak', 'Unchanged (hands planted)');
set('Ankle', 'setup', `Dorsiflexion ${d(H.dorsiOf(Wt, 'r'))}, heels down`); set('Ankle', 'peak', `${d(H.dorsiOf(Wb, 'r'))} at the bottom (limit 35°)`);
set('Tempo', 'setup', 'Top 0.8 s'); set('Tempo', 'peak', '1.6 s in, 0.3 s pause, 1.1 s out, 0.8 s at the top');
console.log(`Push-up (wall): wrote ${L.write(ex)}\n  wall ${WALL_X} hands ${JSON.stringify(HAND)} lean ${leanOf(Wt).toFixed(1)}->${leanOf(Wb).toFixed(1)} elbow ${el(Wt).toFixed(0)}->${el(Wb).toFixed(0)}\n  ${JSON.stringify(rep)} wall gap ${JSON.stringify(wallPen)}`);
const viol = [];
for (const [n, p] of Object.entries(ex.poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (rep.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
if (rep.dorsiR[1] > 35) { console.error('FAIL: ankle past its dorsiflexion limit'); process.exitCode = 1; }
if (wallPen.d < 0) { console.error('FAIL: body into the wall'); process.exitCode = 1; }
if (viol.length) { console.error(`FAIL: joint limits ${viol.join(', ')}`); process.exitCode = 1; }
