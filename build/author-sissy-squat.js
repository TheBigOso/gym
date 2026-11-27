// Sissy Squat (GymVisual #148912): bodyweight, feet hip width on the balls of the feet (heels up 35 degrees), left hand
// resting on a wall beside the body for balance, right arm reaching forward. The knees drive forward and down while the body
// leans back in one straight line from the knees to the shoulders (hips stay extended), down to about 100 degrees of knee
// flexion, then back up. Feet and the wall hand are planted (constant IK targets). Bilateral legs; the one-hand support is on
// the left.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-squats2');
const { com } = require('./families/single');
const meta = require('./meta/sissy-squat.json');

const HALF = 10, TOE = 6, PITCH = 35, BALL_X = 12.5;
const KNEE_TOP = 6, KNEE_BOT = +(process.env.KB || 100), HIP_EXT = 4, CX = +(process.env.CX || 5);
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
// feet on the balls (rig foot shape lowest point 0.1 cm over the floor at x = BALL_X)
const tipC = { r: H.legC('r', { rot: K.footQ(PITCH, -TOE), id: 'tip_r', label: 'Right foot (ball)', pole: [1, 0, 0.15] }), l: H.legC('l', { rot: K.footQ(PITCH, TOE), id: 'tip_l', label: 'Left foot (ball)', pole: [1, 0, -0.15] }) };
const TIP = {};
for (const s of ['r', 'l']) {
  const z = s === 'r' ? HALF : -HALF;
  const res = (x) => { const p = clone(st); p.root.pos = [0, 72, 0]; p.ik = { [tipC[s].id]: { target: [x[0], x[1], z], weight: 1 } }; const lp = H.lowPoint(L.fk(p, [tipC[s]]), `foot_${s}`); return [(lp[0] - BALL_X) * 3, (lp[1] - 0.1) * 3]; };
  const x = R.solveLM([4, 12], res, { iters: 200 }).x;
  TIP[s] = [r1(x[0]), r1(x[1]), z];
}
// left hand on a wall to the left: palm toward the wall (-Z), fingers forward
const wallRotL = Q.fromBasis([0, 0, -1], [-1, 0, 0], [0, 1, 0]);
const wallC = Object.assign(L.handContact('l'), { id: 'wall_l', label: 'Left hand (wall)', pole: [-0.4, -1, -0.5], handRot: K.qArr(wallRotL) });
const contacts = [tipC.r, tipC.l, wallC];
const sag = (v) => Math.atan2(v[0], v[1]) / R.DEG; // forward tilt of a vector from vertical (sagittal)
const kneeOf = H.kneeOf;
function base(root, pitch) {
  const p = clone(st);
  p.root.pos = root.slice(); p.root.rot = { pitch };
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 2, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 2, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: r1(pitch * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(pitch * 0.4) }; // eyes level as the body leans back
  p.ik = { tip_r: { target: TIP.r.slice(), weight: 1 }, tip_l: { target: TIP.l.slice(), weight: 1 } };
  // right arm reaching forward at shoulder height (counterbalance)
  const S = L.fk(p).shoulder_r.p;
  const q = L.armToTarget(p, [S[0] + L.reach(8) * 0.97, S[1] - 8, S[2] - 4], { flex: 8, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: [90, 85, 0] });
  q.ch.sc_r = { protract: 8, elevate: 2 };
  return q;
}
// key for a knee angle: root x, y and pitch so the right knee bends `knee`, the thigh and trunk stay in line (hip extended
// HIP_EXT degrees) and the centre of mass sits over the forefoot (x = CX)
function rootYFor(x, pitch, knee) { // knee flexion falls as the pelvis rises (bisection; LM stalls at full reach)
  let lo = 30, hi = 110;
  for (let i = 0; i < 40; i++) { const y = (lo + hi) / 2; if (kneeOf(L.fk(base([x, y, 0], pitch), contacts), 'r') > knee) lo = y; else hi = y; }
  return (lo + hi) / 2;
}
function solveKey(knee, guess) {
  const res = (x) => {
    const W = L.fk(base([x[0], rootYFor(x[0], x[1], knee), 0], x[1]), contacts);
    const thigh = sag(V.sub(W.hip_r.p, W.knee_r.p)), trunk = sag(V.sub(W.neck_c7.p, W.pelvis.p));
    return [(trunk - thigh - HIP_EXT) * 0.3, (com(W)[0] - CX) * 0.6];
  };
  const x = R.solveLM(guess, res, { iters: 100 }).x;
  return { root: [r1(x[0]), r1(rootYFor(x[0], x[1], knee)), 0], pitch: r1(x[1]) };
}
let g = [0, 0];
const keys = {};
for (const [n, f] of [['top', 0], ['d25', 0.25], ['d50', 0.5], ['d75', 0.75], ['bottom', 1]]) { keys[n] = solveKey(KNEE_TOP + (KNEE_BOT - KNEE_TOP) * f, g); g = [keys[n].root[0], keys[n].pitch]; }
keys.settle = solveKey(KNEE_BOT + 1.5, g);
// wall hand target: about 25 cm out from the left shoulder, between its top and bottom heights (rig v2's shorter arm: high
// enough that the top of the rep is reached with the elbow still bent)
const Wt0 = L.fk(base(keys.top.root, keys.top.pitch), contacts), Wb0 = L.fk(base(keys.bottom.root, keys.bottom.pitch), contacts);
const HAND = [r1((Wt0.shoulder_l.p[0] + Wb0.shoulder_l.p[0]) / 2 + 10), r1((Wt0.shoulder_l.p[1] + Wb0.shoulder_l.p[1]) / 2 - 20), r1(Wt0.shoulder_l.p[2] - 24)];
const ARM_GUESS = [{ shoulder_l: { plane: 20, elev: 50, axial: 0 }, elbow_l: { flex: 40 }, wrist_l: { pron: 90, flex: 0, dev: 0 } }, { shoulder_l: { plane: 40, elev: 40, axial: 60 }, elbow_l: { flex: 30 }, wrist_l: { pron: 0, flex: 0, dev: 0 } }];
let armErr = 0;
function pose(k) {
  let p = base(k.root, k.pitch);
  for (const s of ['r', 'l']) p = H.fitLeg(p, s, tipC[s], TIP[s], { rot: 0 });
  p = H.fitArm(p, 'l', wallC, HAND, ARM_GUESS); delete p.__cost;
  const W = L.fk(Object.assign(clone(p), { ik: { tip_r: p.ik.tip_r, tip_l: p.ik.tip_l } }), contacts);
  armErr = Math.max(armErr, V.len(V.sub(W.wrist_l.p, HAND)));
  p.ik.wall_l = { target: HAND.slice(), weight: 1 };
  p.ch.sc_l = { protract: 4, elevate: 2 };
  for (const j in p.ch) for (const c in p.ch[j]) if (typeof p.ch[j][c] === 'number') p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return p;
}
const poses = {};
for (const n of Object.keys(keys)) poses[n] = pose(keys[n]);
poses.r50 = clone(poses.d50); poses.r75 = clone(poses.d75); poses.r25 = clone(poses.d25);
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.4, pose: 'd25' }, { t: 1.95, pose: 'd50' }, { t: 2.5, pose: 'd75' }, { t: 3.0, pose: 'bottom' },
  { t: 3.2, pose: 'settle' }, { t: 3.4, pose: 'bottom' }, { t: 3.8, pose: 'r75' }, { t: 4.15, pose: 'r50' }, { t: 4.5, pose: 'r25' }, { t: 4.8, pose: 'top' }, { t: 6.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// wall face where the palm of the rig hand shape meets it (rig v2 shapes match the body)
const palmZ = (() => { const g = R.shapeWorld(L.fk(poses.top, contacts), L.rig.shapes.find((x) => x.id === 'hand_l')); return g.c[2] - Math.hypot(g.axes[0][2], g.axes[1][2], g.axes[2][2]); })();
ex.props = [{ id: 'wall', kind: 'wall', center: [r1(HAND[0]), 0, r1(palmZ - 5)], size: [120, 200, 10] }];
const rep = K.scan(ex, { planted: ['tip_r', 'tip_l', 'wall_l'] });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const line = (W) => sag(V.sub(W.neck_c7.p, W.pelvis.p)) - sag(V.sub(W.hip_r.p, W.knee_r.p));
const set = H.setKin(ex);
set('Stance', 'setup', `${2 * HALF} cm between ankle centres, heels up ${PITCH}° on the balls of the feet`); set('Stance', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(kneeOf(Wb, 'r'))}°`);
set('Hip flexion', 'setup', `≈${Math.round(poses.top.ch.hip_r.flex)}° (joint channel)`); set('Hip flexion', 'peak', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° (joint channel); thigh-to-trunk line ${r1(line(Wb))}° from straight`);
set('Trunk inclination', 'setup', `≈${Math.round(-sag(V.sub(Wt.neck_c7.p, Wt.pelvis.p)))}° back`); set('Trunk inclination', 'peak', `≈${Math.round(-sag(V.sub(Wb.neck_c7.p, Wb.pelvis.p)))}° back from vertical`);
set('Knee travel', 'setup', `knee ${r1(Wt.knee_r.p[0] - Wt.toe_r.p[0])} cm from the toes`); set('Knee travel', 'peak', `knee joint ${r1(Wb.knee_r.p[0] - Wb.toe_r.p[0])} cm in front of the toe joint`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.2 s down, 0.4 s pause, 1.4 s up, 1.2 s reset');
console.log(`Sissy Squat: tips ${JSON.stringify(TIP)} hand ${HAND} wall ${JSON.stringify(ex.props[0])} keys ${JSON.stringify(keys)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  armErr ${r1(armErr)} com bottom ${com(Wb).map(Math.round)} ankle dorsi ${r1(H.dorsiOf(Wb, 'r'))}`);
K.gate('sissy-squat', rep, { maxJump: 6 });
if (armErr > 0.5) { console.error('FAIL: wall hand not reached'); process.exitCode = 1; }
