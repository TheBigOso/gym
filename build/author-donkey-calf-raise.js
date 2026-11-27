// Donkey Calf Raise (GymVisual #028412): hips hinged with the back nearly level, hands on a 45 cm bench in front (planted,
// palms down, arms long), feet hip width under the hips, knees straight but soft. Both feet roll up onto the balls of the
// feet (about 1 s), pause (0.8 s) and lower slowly (1.8 s). Each foot pivots about a fixed point under the ball of the foot
// (as in the standing calf raise). As the hips rise, the trunk pitches a little further forward so the shoulders keep the
// same distance to the planted hands (arms stay long). Bilateral.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/donkey-calf-raise.json');

const TOE = 5, HALF = 10, PITCH_TOP = 32, BENCH_H = 45;
const PITCH0 = +(process.env.P0 ?? -80), ELBOW = +(process.env.ELB ?? 10), HAND_Y = BENCH_H + +(process.env.HY ?? 0.1);
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const yawOf = (s) => (s === 'r' ? -TOE : TOE);
// hands flat on the bench, rolled TILT degrees thumb side up (as the bird dog, keeps the athlete's thumb out of the pad)
const TILT = +(process.env.TILT ?? 15), handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], TILT), L.handRotR); return H.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, yawOf(s)) })).concat(['r', 'l'].map((s) => Object.assign(H.handC(s, [-1, 0.1, s === 'r' ? 0.35 : -0.35]), { handRot: handQ(s) })));
const legOnly = contacts.slice(0, 2);
const ball = { r: F.ballPivot([0, L.ANKLE_H, HALF], yawOf('r')), l: F.ballPivot([0, L.ANKLE_H, -HALF], yawOf('l')) };
let HAND = null, ARM_D = null;
function trunkAt(pitch, footPitch) {
  const p = clone(st), f = footPitch / PITCH_TOP;
  p.ik = {};
  for (const s of ['r', 'l']) p.ik[`leg_${s}`] = { target: ball[s].ankleFor(footPitch), weight: 1, handRot: ball[s].rotFor(footPitch) };
  p.root.pos = [r1((p.ik.leg_r.target[0] - 3) * 10) / 10, 90, 0]; p.root.rot = { pitch: r1(pitch) };
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 3, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: -12 }; p.ch.head_c1 = { rot: 0, flex: -10 };   // head in line, eyes to the floor ahead of the bench
  p.ch.sc_r = { protract: 8, elevate: 4 }; p.ch.sc_l = { protract: 8, elevate: 4 };
  let a = 70, b = 110;
  for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, legOnly), 'r') > 5) a = y; else b = y; }
  p.root.pos[1] = +((a + b) / 2).toFixed(2);
  return p;
}
function poseAt(footPitch) {
  let p;
  if (!HAND) p = trunkAt(PITCH0, footPitch);
  else { // pitch so the shoulder stays ARM_D from the hand
    let a = PITCH0 - 25, b = PITCH0 + 10;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2, d = V.len(V.sub(L.fk(trunkAt(m, footPitch), legOnly).shoulder_r.p, HAND.r)); if (d > ARM_D) b = m; else a = m; }
    p = trunkAt((a + b) / 2, footPitch);
  }
  let q = p;
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), p.ik[`leg_${s}`].target, { handRot: p.ik[`leg_${s}`].handRot, rot: -TOE });
  if (HAND) for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], [{ [`shoulder_${s}`]: { plane: 90, elev: 100, axial: 0 }, [`elbow_${s}`]: { flex: ELBOW }, [`wrist_${s}`]: { pron: 0, flex: -60, dev: 0 } }]); delete q.__cost; q.ik[`arm_${s}`] = { target: HAND[s].slice(), weight: 1 }; }
  return q;
}
// hands on the bench ahead of the shoulders at the bottom: arm length for ELBOW degrees of elbow bend
{ const W = L.fk(poseAt(0), legOnly), S = W.shoulder_r.p; ARM_D = L.reach(ELBOW); const dy = S[1] - HAND_Y, dx = Math.sqrt(Math.max(0, ARM_D * ARM_D - dy * dy - 4));
  HAND = { r: [r1(S[0] + dx), HAND_Y, r1(S[2] - 2)], l: [r1(S[0] + dx), HAND_Y, r1(-(S[2] - 2))] }; }
const N = 10, poses = {};
for (let i = 0; i <= N; i++) poses[`p${i}`] = poseAt(r1(PITCH_TOP * i / N));
poses.top2 = poseAt(PITCH_TOP + 0.6);
const keyframes = F.raiseKeys(N, { hold: 2.2 });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const bench = ex.props.find((p) => p.kind === 'bench'); bench.center = [r1(HAND.r[0] + 12), 0, 0]; bench.size = [40, BENCH_H, 120];
let ballDrift = 0, heelMax = 0;
const heel0 = ball.r.heelY(L.fk(poses.p0, contacts), 'r');
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W) => { for (const s of ['r', 'l']) ballDrift = Math.max(ballDrift, ball[s].drift(W, s)); heelMax = Math.max(heelMax, ball.r.heelY(W, 'r') - heel0); } });
const W0 = L.fk(poses.p0, contacts), Wt = L.fk(poses[`p${N}`], contacts);
const trunkFromLevel = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) / R.DEG;
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const set = H.setKin(ex);
set('Ankle plantarflexion', 'setup', `≈${Math.round(-H.dorsiOf(W0, 'r'))}° (feet flat)`); set('Ankle plantarflexion', 'peak', `≈${Math.round(-H.dorsiOf(Wt, 'r'))}° (feet ${PITCH_TOP}° heel-up)`);
set('Heel height', 'setup', '0 cm (heels down)'); set('Heel height', 'peak', `≈${r1(heelMax)} cm`);
set('Hip hinge', 'setup', `Hip ≈${Math.round(poses.p0.ch.hip_r.flex)}° flexion, trunk ≈${Math.round(trunkFromLevel(W0))}° above level`); set('Hip hinge', 'peak', `Hip ≈${Math.round(poses[`p${N}`].ch.hip_r.flex)}°, trunk ≈${Math.round(trunkFromLevel(Wt))}° above level (shoulders keep their distance to the hands)`);
set('Knee', 'setup', `≈${Math.round(H.kneeOf(W0, 'r'))}°`); set('Knee', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Tempo', 'setup', 'Heels down 0.8 s'); set('Tempo', 'peak', '1.0 s up, 0.8 s pause, 1.8 s down, 0.6 s reset');
const travel = V.len(V.sub(Wt.pelvis.p, W0.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Donkey Calf Raise: wrote ${L.write(ex)}  hands ${JSON.stringify(HAND)}\n  ${JSON.stringify(rep)} ballDrift ${ballDrift.toFixed(3)} heelRise ${r1(heelMax)} travel ${r1(travel)} pitch ${poses.p0.root.rot.pitch}..${poses[`p${N}`].root.rot.pitch} elbow ${r1(elbowAng(W0))}/${r1(elbowAng(Wt))}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hand slides'); process.exitCode = 1; }
if (ballDrift > 0.05) { console.error('FAIL: ball of the foot slides'); process.exitCode = 1; }
