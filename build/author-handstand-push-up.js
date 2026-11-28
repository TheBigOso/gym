// Handstand Push-up (GymVisual #11591, page not readable; movement from the name): wall-supported. Handstand with the back to
// the wall, hands just wider than the shoulders about a hand length from it (fingers pointing away), arms locked, legs
// straight and together with the heels resting on the wall. Lower under control until the crown of the head is just above
// the mat, a little in front of the hands (head and hands form a triangle), then press back to locked arms. Bilateral.
// Palms planted (arm contacts, constant targets, fingers toward -X); legs are FK (straight, toes pointed). Each key solves
// root x / y / pitch so the heels (calf and foot shapes) touch the wall face, with the shoulder-to-wrist distance and the
// shoulder line's x interpolated between the locked-out top and the solved bottom.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const P = require('./families/prone');
const X = require('./families/b6-14');
const meta = require('./meta/handstand-push-up.json');

const HZ = 23;            // wrist |z| (shoulder joints ~19): just wider than the shoulders
const PALM = 2.6;
const TOP_ELBOW = 6;      // locked out (soft)
const LEAN = 6;           // top: body leans this many degrees from vertical toward the wall (heels on it)
const HEAD_Y = 2.5;       // bottom: crown this far above the floor (mat 0.6 cm)
const HEAD_AHEAD = 13;    // bottom: crown this far in front of the wrists (toward -X, away from the wall)
const WR = [0, PALM, HZ], WL = [0, PALM, -HZ];
const handQ = (s) => { const q = Q.mul(Q.axis([0, 1, 0], 180), L.handRotR); return (s === 'r' ? q : Q.mirrorZ(q)).map((v) => +v.toFixed(6)); };
const contacts = [Object.assign(L.handContact('r'), { pole: [-0.8, 0, 0.6], handRot: handQ('r') }), Object.assign(L.handContact('l'), { pole: [-0.8, 0, -0.6], handRot: handQ('l') })];
const base = clone(L.POSES.standing().pose); delete base.ik;
Object.assign(base.ch, { hip_r: { flex: 0, abd: 1, rot: 0 }, hip_l: { flex: 0, abd: 1, rot: 0 }, knee_r: { flex: 2 }, knee_l: { flex: 2 }, ankle_r: { dorsi: -35 }, ankle_l: { dorsi: -35 },
  spine_l5: { rot: 0, flex: -4, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 }, sc_r: { protract: 6, elevate: 20 }, sc_l: { protract: 6, elevate: 20 },
  shoulder_r: { plane: 90, elev: 170, axial: 0 }, shoulder_l: { plane: 90, elev: 170, axial: 0 }, elbow_r: { flex: 6 }, elbow_l: { flex: 6 } });
base.root = { pos: [0, 120, 0], rot: { pitch: 180 } };
base.ik = { arm_r: { target: WR, weight: 1 }, arm_l: { target: WL, weight: 1 } };
const headLow = (W) => Math.min(H.bottomOf(W, 'hair'), H.bottomOf(W, 'head'));
const headX = (W) => W.head_c1.p[0];  // the skull base / crown sits along the trunk line when inverted
const midSX = (W) => (W.shoulder_r.p[0] + W.shoulder_l.p[0]) / 2;
const backX = (W) => Math.max(...['calf_r', 'calf_l', 'foot_r', 'foot_l'].map((id) => H.frontOf(W, id)));
const trunkFromVert = (W) => V.angle(V.sub(W.pelvis.p, W.neck_c7.p), [0, 1, 0]);
const head = (p, f) => { p.ch.neck_c7 = { rot: 0, flex: r1(f * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(f * 0.55) }; return p; };
const solve = (p, objs) => L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], objs, { iters: 500, contacts });
// Top: arm length locked out, body leaning LEAN degrees toward the wall (+X) from vertical, shoulders 3 cm toward the fingers
const lean = (W) => { const d = V.sub(W.ankle_r.p, W.wrist_r.p); return Math.atan2(d[0], d[1]) / R.DEG; };
const top0 = solve(head(clone(base), -6), [(W) => [(V.len(V.sub(W.shoulder_r.p, WR)) - L.reach(TOP_ELBOW)) * 4], (W) => [(lean(W) - LEAN) * 0.5], (W) => [(midSX(W) + 3) * 2]]);
const WALL = r1(backX(L.fk(top0.pose, contacts)));
const wallObj = (W) => [(backX(W) - WALL) * 3];
// Bottom: crown at HEAD_Y, HEAD_AHEAD in front of the wrists, heels on the wall
const bot0 = solve(head(clone(top0.pose), -14), [wallObj, (W) => [(headLow(W) - HEAD_Y) * 3], (W) => [(headX(W) + HEAD_AHEAD) * 1]]);
const Wt = L.fk(top0.pose, contacts), Wb = L.fk(bot0.pose, contacts);
const D0 = V.len(V.sub(Wt.shoulder_r.p, WR)), D1 = V.len(V.sub(Wb.shoulder_r.p, WR)), S0 = midSX(Wt), S1 = midSX(Wb);
function key(u) { // u: 0 top, 1 bottom
  const q = head(clone(u < 0.5 ? top0.pose : bot0.pose), -6 - 8 * u);
  const s = u === 0 ? top0 : u === 1 ? bot0 : solve(q, [wallObj, (W) => [(V.len(V.sub(W.shoulder_r.p, WR)) - (D0 + (D1 - D0) * u)) * 4], (W) => [(midSX(W) - (S0 + (S1 - S0) * u)) * 2]]);
  let p = clone(s.pose); head(p, -6 - 8 * u);
  p.ik = { arm_r: { target: WR, weight: 1 }, arm_l: { target: WL, weight: 1 } };
  const G = (sd) => [{ [`shoulder_${sd}`]: { plane: 90, elev: 170, axial: 0 }, [`elbow_${sd}`]: { flex: 10 + 80 * u } }, { [`shoulder_${sd}`]: { plane: 60, elev: 160, axial: 30 }, [`elbow_${sd}`]: { flex: 10 + 80 * u } }, { [`shoulder_${sd}`]: { plane: 120, elev: 160, axial: -30 }, [`elbow_${sd}`]: { flex: 10 + 80 * u } }];
  for (const sd of ['r', 'l']) { p = H.fitArm(p, sd, contacts.find((c) => c.id === `arm_${sd}`), sd === 'r' ? WR : WL, G(sd)); delete p.__cost; }
  return { pose: p, cost: s.cost };
}
const ph = meta.timeline.phases.map((x) => x.end), Dur = meta.timeline.duration;
const poses = {}, keyframes = [], costs = {};
const add = (t, n, u) => { if (u != null) { const k = key(u); poses[n] = k.pose; costs[n] = +k.cost.toFixed(4); } keyframes.push({ t: +t.toFixed(3), pose: n }); };
add(0, 'top', 0); add(ph[0], 'top');
const ND = 6, NU = 5;
for (let i = 1; i < ND; i++) add(ph[0] + ((ph[1] - ph[0]) * i) / ND, `down${i}`, X.ease(i / ND));
add(ph[1], 'bottom', 1); add((ph[1] + ph[2]) / 2, 'bottomHold', 0.985); add(ph[2], 'bottom');
for (let i = 1; i < NU; i++) add(ph[2] + ((ph[3] - ph[2]) * i) / NU, `up${i}`, 1 - X.ease(i / NU));
add(ph[3], 'top'); add(Dur, 'top');
X.wrapPoses(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = meta.props.concat([{ id: 'wall', kind: 'wall', center: [r1(WALL + 5), 0, 0], size: [10, 240, 160] }]);
const sw = P.sweep(ex);
// wall penetration / gap through the loop
const tl = R.buildTimeline(ex); let wallPen = -1e9, wallGap = 1e9, elbowMax = 0;
for (let i = 0; i <= 400; i++) { const W = R.evalPose(rig, tl.pose((i / 400) * Dur), contacts); const bx = Math.max(...rig.shapes.map((s) => H.frontOf(W, s.id))); wallPen = Math.max(wallPen, bx - WALL); wallGap = Math.min(wallGap, WALL - backX(W)); elbowMax = Math.max(elbowMax, R.measures(W).elbowR); }
const mt = R.measures(Wt), mb = R.measures(Wb), set = H.setKin(ex);
set('Hand placement', 'setup', `Wrists ${2 * HZ} cm apart (shoulder joints ${Math.round(V.len(V.sub(Wt.shoulder_r.p, Wt.shoulder_l.p)))} cm), ${r1(WALL)} cm from the wall face`); set('Hand placement', 'peak', 'Unchanged (hands planted)');
set('Elbow flexion', 'setup', `≈${Math.round(mt.elbowR)}° (locked out)`); set('Elbow flexion', 'peak', `≈${Math.round(mb.elbowR)}° at the bottom`);
set('Shoulder flexion', 'setup', `Arm ${Math.round(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), V.sub(Wt.pelvis.p, Wt.neck_c7.p)))}° from the trunk line (overhead)`); set('Shoulder flexion', 'peak', `${Math.round(V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), V.sub(Wb.pelvis.p, Wb.neck_c7.p)))}° at the bottom`);
set('Head path', 'setup', `Crown ${r1(headLow(Wt))} cm above the floor`); set('Head path', 'peak', `${r1(headLow(Wb))} cm above the floor, ${r1(-headX(Wb))} cm in front of the wrists`);
set('Body line', 'setup', `Trunk ${Math.round(trunkFromVert(Wt))}° from vertical; heels on the wall`); set('Body line', 'peak', `${Math.round(trunkFromVert(Wb))}° at the bottom; heels slide down the wall ${r1(Wt.ankle_r.p[1] - Wb.ankle_r.p[1])} cm`);
set('Tempo', 'setup', `${ph[0]} s at the top`); set('Tempo', 'peak', `${r1(ph[1] - ph[0])} s down, ${r1(ph[2] - ph[1])} s pause, ${r1(ph[3] - ph[2])} s up, ${r1(Dur - ph[3])} s lock-out`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'trunkFlexion');
console.log(`Handstand Push-up: wrote ${L.write(ex)} WALL ${WALL}\n  top elbow ${mt.elbowR.toFixed(0)} head ${headLow(Wt).toFixed(1)} trunk ${trunkFromVert(Wt).toFixed(1)}; bottom elbow ${mb.elbowR.toFixed(0)} head ${headLow(Wb).toFixed(1)} headX ${headX(Wb).toFixed(1)} trunk ${trunkFromVert(Wb).toFixed(1)}\n  costs ${JSON.stringify(costs)}\n  sweep ${JSON.stringify(sw)} wallPen ${wallPen.toFixed(2)} heelGap ${wallGap.toFixed(2)} elbowMax ${elbowMax.toFixed(0)} peak ${pk.toFixed(1)}`);
console.log('  top ch', JSON.stringify({ sh: poses.top.ch.shoulder_r, el: poses.top.ch.elbow_r, wr: poses.top.ch.wrist_r }), 'bottom', JSON.stringify({ sh: poses.bottom.ch.shoulder_r, el: poses.bottom.ch.elbow_r, wr: poses.bottom.ch.wrist_r }));
X.finishChecks(ex, 'handstand-push-up', sw);
if (wallPen > 0.5 || wallGap > 0.5) { console.error('FAIL: heels off the wall or body in the wall'); process.exitCode = 1; }
