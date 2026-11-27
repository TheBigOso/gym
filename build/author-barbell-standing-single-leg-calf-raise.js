// Barbell Standing Single Leg Calf Raise (GymVisual #22219): standing on the right foot on the floor with a barbell on the
// upper back (the barbell full squat's high-bar position: bar on the upper traps just below C7, hands overhand about 80 cm
// apart, elbows down and a little back, shoulder blades squeezed), the left knee bent with the foot lifted behind. The right
// foot rolls up onto the ball of the foot (about 1 s), pauses (0.8 s) and lowers slowly (1.8 s). The foot pivots about a
// fixed point under the ball of the foot (b4-calvesglutes.js ballPivot, as in the single-leg dumbbell calf raise); the
// pelvis shifts over the standing foot and, per key, the root is moved so the centre of mass of body + bar (a 40 kg bar vs an
// 80 kg body) sits over the foot: over mid-foot with the heel down, over the ball of the foot at the top. No support hand
// (both hands hold the bar); the rack stands behind. authoredSide 'right' (the player mirrors). Family b5-bbpress.js.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const H = require('./families/hips');
const CG = require('./families/b4-calvesglutes');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const B3 = require('./families/b3-back');
const meta = require('./meta/barbell-standing-single-leg-calf-raise.json');

const TOE = 5, HALF = 9.5, PITCH_TOP = 30, GW = 80, BAR_KG = +(process.env.BARKG ?? 40);
const BAR_T6 = [-5.2, 14.4, 0], ELBOW_T6 = [-8, -20, 10], SC = { protract: -8, elevate: 4 };
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const contacts = [H.legC('r', { rot: H.footQ(0, -TOE) })];
const ball = CG.ballPivot([0, L.ANKLE_H, HALF], -TOE);
const barOn = (W) => V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BAR_T6));
let gripWorst = 0, ARMSEED = null;
function arms(p) {
  p.ch.sc_r = clone(SC); p.ch.sc_l = clone(SC);
  const W = L.fk(p, contacts), c = barOn(W), grips = EQ.barGrips(c, BB.AX, GW), fwd = Q.rot(W.spine_t6.q, [1, 0, 0]);
  const E = V.add(W.shoulder_r.p, V.scale(V.norm(Q.rot(W.spine_t6.q, ELBOW_T6)), L.UA));
  const q = BB.armsOnBar(p, grips.r, { palm: fwd, thumb: [0, 0, -1], elbow: E, elbowW: 0.3, dirW: 1.5, guesses: ARMSEED ? [ARMSEED] : [[-20, 20, -120, 135, 0], [-30, 40, -100, 130, 60], [0, 50, -110, 120, 0], [-40, 50, -60, 130, 0]] });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q, contacts), grips)); delete q.__cost;
  ARMSEED = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
  return q;
}
const com = (W) => B3.comX(W, [{ c: EQ.barAt(W, BB.GRIP).c, kg: BAR_KG }], 80);
function poseAt(pitch) {
  const f = pitch / PITCH_TOP, tgt = ball.ankleFor(pitch), footMid = V.add(tgt, [5, 0, 0]);
  const wantX = footMid[0] + (ball.B[0] - 1.5 - footMid[0]) * f, wantZ = HALF + 1;
  let p = clone(st); delete p.ik;
  p.root.pos = [tgt[0], 90, HALF]; p.root.rot = { pitch: 0, roll: 0 };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 }, neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 } });
  p.ch.hip_l = { flex: 8, abd: -3, rot: 0 }; p.ch.knee_l = { flex: 80 }; p.ch.ankle_l = { dorsi: -25 };
  let q = p;
  for (let it = 0; it < 4; it++) {
    q = clone(p); q.ik = { leg_r: { target: tgt, weight: 1, handRot: ball.rotFor(pitch) } };
    let a = 70, b = 110; // knee straight but soft (4 degrees)
    for (let i = 0; i < 40; i++) { const y = (a + b) / 2; q.root.pos[1] = y; if (H.kneeOf(L.fk(q, contacts), 'r') > 4) a = y; else b = y; }
    q.root.pos[1] = +((a + b) / 2).toFixed(2);
    q = H.fitLeg(q, 'r', contacts[0], tgt, { handRot: q.ik.leg_r.handRot, rot: -TOE });
    q.ch.hip_l = clone(p.ch.hip_l); q.ch.knee_l = clone(p.ch.knee_l); q.ch.ankle_l = clone(p.ch.ankle_l);
    q = arms(q);
    const c = com(L.fk(q, contacts));
    p.root.pos[0] = +(p.root.pos[0] + (wantX - c[0])).toFixed(2); p.root.pos[2] = +(p.root.pos[2] + (wantZ - c[2])).toFixed(2);
  }
  q.__com = com(L.fk(q, contacts)); q.__want = [wantX, wantZ];
  return q;
}
const N = 10, poses = {}, info = [];
for (let i = 0; i <= N; i++) { const q = poseAt(r1(PITCH_TOP * i / N)); info.push({ com: q.__com.map(r1), want: q.__want.map(r1) }); delete q.__com; delete q.__want; poses[`p${i}`] = q; }
{ const q = poseAt(PITCH_TOP + 0.6); delete q.__com; delete q.__want; poses.top2 = q; }
const keyframes = CG.raiseKeys(N, { hold: 2.2 });
CG.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wb0 = L.fk(poses.p0, contacts), bt = EQ.barAt(Wb0, BB.GRIP);
const rack = EQ.rack({ x: Math.round(bt.c[0] - 45), hookY: Math.round(bt.c[1] - 6), height: 200, width: 120 }).prop;
ex.props = [BB.barbellProp(), rack];
let ballDrift = 0, heelMax = 0, legs = { d: 1e9 };
const heel0 = ball.heelY(Wb0, 'r');
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { planted: [], skip: SKIP, probe: (W) => {
  ballDrift = Math.max(ballDrift, ball.drift(W, 'r')); heelMax = Math.max(heelMax, ball.heelY(W, 'r') - heel0);
  // free leg clear of the standing leg
  for (const a of ['foot_l', 'shank_l', 'calf_l']) for (const b of ['shank_r', 'calf_r', 'foot_r', 'thigh_r', 'quad_r']) { const pts = require('./families/b5-bbpress').shapePts(W, a); for (const pt of pts) { const dd = EQ.pointShape(W, pt, b); if (dd < legs.d) legs = { d: +dd.toFixed(2), a, b }; } }
} });
const rest = BB.sweep(ex, { planted: [] }).barBody;
const Wt = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Ankle plantarflexion', 'setup', `${d(-H.dorsiOf(Wb0, 'r'))} (foot flat)`); set('Ankle plantarflexion', 'peak', `${d(-H.dorsiOf(Wt, 'r'))} (foot ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heel down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Knee', 'setup', `Standing knee ${d(H.kneeOf(Wb0, 'r'))}, free knee ${d(H.kneeOf(Wb0, 'l'))} (foot lifted behind)`); set('Knee', 'peak', `Standing knee ${d(H.kneeOf(Wt, 'r'))}`);
set('Bar position', 'setup', `High bar on the upper traps, ${GW} cm grip (handle centres); body + bar centre of mass ${r1(info[0].com[0] - ball.ankleFor(0)[0])} cm ahead of the ankle`); set('Bar position', 'peak', `Centre of mass ${r1(ball.B[0] - info[N].com[0])} cm behind the ball of the foot at the top (pelvis shifted ${r1(poses.p0.root.pos[2])} cm over the standing foot)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, Wb0.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Barbell Standing Single Leg Calf Raise: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} trapsRest ${rest}\n  ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} travel ${r1(travel)} legs ${JSON.stringify(legs)} gripErr ${gripWorst.toFixed(2)} com ${JSON.stringify([info[0], info[N]])} root ${JSON.stringify(poses.p0.root)}`);
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
if (sw.widthRange > 1.0 || gripWorst > 0.5) { console.error('FAIL: hands do not stay on the bar'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5 || legs.d < 0) { console.error('FAIL: collision'); process.exitCode = 1; }
