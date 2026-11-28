// Single Leg Calf Raise Off Step (GymVisual #11782; page not readable here, movement from the name): body-weight single-leg
// calf raise with the ball of the right foot on the edge of a step (box), the heel hanging off. Both hands rest lightly on
// a wall in front for balance (planted hand contacts), left knee bent with the foot lifted behind. From level, the heel
// lowers below the step into a calf stretch, pauses, then the foot rolls up onto the ball as high as possible, pauses and
// returns to level; the foot pivots about a fixed point on the step edge under the ball of the foot (per key the ankle IK
// target follows the arc about that point). Built as author-one-leg-floor-calf-raise.js with a 20 cm step under the foot.
// authoredSide 'right' (the player mirrors).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const B = require('./families/b3-legs');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/single-leg-calf-raise-off-step.json');

const TOE = 5, HALF = 9.5, STEP = 20, PITCH_TOP = 30, PITCH_LOW = -20, ROOT_Z = 5.5;
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const contacts = [H.legC('r', { rot: H.footQ(0, -TOE) }), H.wallHand('l'), H.wallHand('r')];
const legOnly = contacts.slice(0, 1);
const ball = F.ballPivot([0, L.ANKLE_H + STEP, HALF], -TOE);
let HAND = null;
function poseAt(pitch) {
  const p = clone(st), f = pitch / PITCH_TOP;
  p.ik = { leg_r: { target: ball.ankleFor(pitch), weight: 1, handRot: ball.rotFor(pitch) } };
  const dx = p.ik.leg_r.target[0] + 2.5 * Math.max(0, f) + 1.5 * Math.min(0, f);
  p.root.pos = [r1(dx * 10) / 10, 110, ROOT_Z]; p.root.rot = { pitch: r1(-1.5 * f), roll: 0 };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: r1(0.6 * f) }; p.ch.head_c1 = { rot: 0, flex: r1(0.7 * f) };
  p.ch.hip_l = { flex: 6, abd: -2, rot: 0 }; p.ch.knee_l = { flex: 75 }; p.ch.ankle_l = { dorsi: -25 };
  let a = 80, b = 130;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, legOnly), 'r') > 4) a = y; else b = y; }
  p.root.pos[1] = +((a + b) / 2).toFixed(2);
  let q = H.fitLeg(p, 'r', contacts[0], p.ik.leg_r.target, { handRot: p.ik.leg_r.handRot, rot: -TOE });
  const hl = clone(q.ch.hip_l), kl = clone(q.ch.knee_l), al = clone(q.ch.ankle_l);
  q = B.armsHang(q, { out: 9 }); delete q.__armCost;
  q.ch.hip_l = hl; q.ch.knee_l = kl; q.ch.ankle_l = al;
  q.ch.sc_l = { protract: 6, elevate: 2 }; q.ch.sc_r = { protract: 6, elevate: 2 };
  if (HAND) {
    q = H.fitArm(q, 'l', contacts[1], HAND.l, H.WALL_ARM_GUESS('l')); delete q.__cost; q.ik.arm_l = { target: HAND.l.slice(), weight: 1 };
    q = H.fitArm(q, 'r', contacts[2], HAND.r, H.WALL_ARM_GUESS('r')); delete q.__cost; q.ik.arm_r = { target: HAND.r.slice(), weight: 1 };
  }
  return q;
}
{ const W = L.fk(poseAt(0), legOnly), Sl = W.shoulder_l.p, Sr = W.shoulder_r.p, o = { flex: 40, drop: 14, inset: 3 };
  HAND = { l: H.wallHandTargets([Sl[0], Sl[1], -Sl[2]], o).l, r: H.wallHandTargets(Sr, o).r };
  HAND.r[0] = HAND.l[0] = Math.max(HAND.l[0], HAND.r[0]); }
// pitch keys: level -> heel down (stretch) -> up to the top -> back to level
const DOWN = [0, -5, -10, -15, -20], UP = [-15, -10, -5, 0, 6, 12, 18, 24, 30];
const poses = {};
const name = (pt) => (pt < 0 ? `m${-pt}` : `p${pt}`);
for (const pt of [...new Set([...DOWN, ...UP])]) poses[name(pt)] = poseAt(pt);
poses.low2 = poseAt(PITCH_LOW - 0.5); poses.top2 = poseAt(PITCH_TOP + 0.6);
const WALL_X = H.wallFaceX(poses.p0, contacts);
const kfs = [[0, 'p0'], [0.6, 'p0']];
DOWN.slice(1).forEach((pt, i) => kfs.push([r1(100 * (0.6 + 1.2 * F.invEase((i + 1) / 4))) / 100, name(pt)]));
kfs.push([2.2, 'low2']);
UP.forEach((pt, i) => kfs.push([r1(100 * (2.4 + 1.3 * F.invEase((i + 1) / UP.length))) / 100, name(pt)]));
kfs.push([4.3, 'top2'], [4.6, 'p30']);
[24, 18, 12, 6, 0].forEach((pt, i) => kfs.push([r1(100 * (4.6 + 1.3 * F.invEase((i + 1) / 5))) / 100, name(pt)]));
kfs.push([6.4, 'p0']);
const keyframes = F.kf ? F.kf(kfs) : kfs.map(([t, pose]) => ({ t, pose }));
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(WALL_X + wall.size[0] / 2), 0, 0];
// step: the box top edge sits 1 cm behind the pivot under the ball of the foot; the heel hangs past it
const EDGE = r1(ball.B[0] - 1), BOXL = r1(Math.min(40, WALL_X - EDGE - 6));
const box = { id: 'step', kind: 'box', center: [r1(EDGE + BOXL / 2), 0, 4], size: [BOXL, STEP, 50] };
ex.props = [box, wall];
let ballDrift = 0, heel = [1e9, -1e9], boxPen = 0;
const heel0 = ball.heelY(L.fk(poses.p0, contacts), 'r');
const foot = L.rig.shapes.find((x) => x.id === 'foot_r');
const rep = H.loopReport(ex, { planted: ['arm_l', 'arm_r'], probe: (W) => {
  ballDrift = Math.max(ballDrift, ball.drift(W, 'r')); const h = ball.heelY(W, 'r') - heel0; heel = [Math.min(heel[0], h), Math.max(heel[1], h)];
  // foot sole vs the step top over the step footprint (sampled along the sole)
  const g = L.R.shapeWorld(W, foot); for (let k = -10; k <= 10; k++) { const u = k / 10, pnt = V.add(g.c, V.add(V.scale(g.axes[0], u), V.scale(g.axes[1], -Math.sqrt(1 - u * u)))); if (pnt[0] > EDGE) boxPen = Math.max(boxPen, STEP - pnt[1]); } } });
const W0 = L.fk(poses.p0, contacts), Wt = L.fk(poses.p30, contacts), Wl = L.fk(poses.m20, contacts);
const set = H.setKin(ex);
set('Ankle', 'setup', `≈${Math.round(-H.dorsiOf(W0, 'r'))}° plantarflexion with the foot level`); set('Ankle', 'peak', `≈${Math.round(H.dorsiOf(Wl, 'r'))}° dorsiflexion at the bottom (heel ${r1(-heel[0])} cm below the step), ≈${Math.round(-H.dorsiOf(Wt, 'r'))}° plantarflexion at the top`);
set('Heel travel', 'setup', 'Level with the step'); set('Heel travel', 'peak', `${r1(heel[1] - heel[0])} cm from the bottom of the stretch to the top`);
set('Knee', 'setup', `Standing knee ≈${Math.round(H.kneeOf(W0, 'r'))}°, free knee ≈${Math.round(H.kneeOf(W0, 'l'))}°`); set('Knee', 'peak', `Standing knee ≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Support', 'setup', `Ball of the foot on a ${STEP} cm step, both hands lightly on the wall`); set('Support', 'peak', 'Unchanged; the wall hands stay planted');
set('Tempo', 'setup', 'Level 0.6 s'); set('Tempo', 'peak', '1.2 s down, 0.4 s stretch, 1.3 s up, 0.6 s pause, 1.3 s back to level');
const travel = V.len(V.sub(Wt.pelvis.p, Wl.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: 0, max: Math.ceil(travel + 2) };
console.log(`Single Leg Calf Raise Off Step: wrote ${L.write(ex)} step ${JSON.stringify(box)} wall ${JSON.stringify(wall.center)}\n  ${JSON.stringify(rep)} ballDrift ${ballDrift.toFixed(3)} heel ${heel.map(r1)} boxPen ${r1(boxPen)} travel ${r1(travel)}`);
const bad = [rep.slide > 0.05 && 'planted hand slides', ballDrift > 0.05 && 'ball of the foot slides', boxPen > 0.6 && 'foot sinks into the step', rep.dorsiR[1] > 35 && 'ankle past its limit', BOXL < 20 && 'no room for the step'].filter(Boolean);
if (bad.length) { console.error('FAIL single-leg-calf-raise-off-step: ' + bad.join('; ')); process.exitCode = 1; }
