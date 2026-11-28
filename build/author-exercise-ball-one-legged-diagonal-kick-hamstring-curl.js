// Exercise Ball One Legged Diagonal Kick Hamstring Curl (GymVisual #13796, movement reference only): lying on the back,
// arms on the floor by the sides (planted), hips lifted, the left heel on top of a 55 cm exercise ball and the right leg
// held up in line with the body. The left heel curls the ball in toward the glutes (knee to about 90 degrees) while the
// hips rise a little further, and at the same time the straight right leg kicks up and across the body (about 75 degrees
// of hip flexion with 15 degrees of adduction); then the left leg rolls the ball back out as the right leg returns.
// The pelvis never touches down. Authored on the right kicking leg (left leg curls).
// Gear: the rolling ball of src/gear/g3attach-balls.js, mounted between the left ankle and toe so it rolls under the heel
// with its bottom on the floor. Bridge trunk: build/families/gear-g3attach.js (supineRoll).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'exercise-ball-one-legged-diagonal-kick-hamstring-curl', name: 'Exercise Ball One Legged Diagonal Kick Hamstring Curl', url: 'https://gymvisual.com/videos/13796-exercise-ball-one-legged-diagonal-kick-hamstring-curl.html',
  aliases: ['Single-leg stability ball curl with diagonal kick', 'Swiss ball one-leg hamstring curl and kick'], bodyPart: 'Thighs (hamstrings)', secondary: ['Hips', 'Core'], equipment: ['Stability ball', 'Mat'],
  mechanics: 'Compound (knee flexion with hip extension)', plane: 'Multiplanar', side: 'right', cam: 'threeQuarter', difficulty: 'Advanced',
  muscles: { target: ['hamstrings_l'], synergist: ['glute_max_l', 'calves_l', 'hip_flexors_r'], stabilizer: ['core', 'obliques_r', 'obliques_l', 'glute_med_l', 'adductors_r'], lengthened: ['hamstrings_r'] },
  notes: { hamstrings_l: 'Curl the ball in on one leg while holding the hips up (Escamilla 2016, Swiss ball curls).', glute_max_l: 'Keeps the hips lifted (Lehecka 2017).', calves_l: 'Gastrocnemius assists knee flexion (clinical opinion).', hip_flexors_r: 'Lift the straight right leg into the diagonal kick (clinical opinion).', core: 'Steadies the trunk on one leg and the ball (Escamilla 2016).', obliques_r: 'Resist the twist of the diagonal kick (clinical opinion).', obliques_l: 'Resist the twist of the diagonal kick (clinical opinion).', glute_med_l: 'Keeps the pelvis level (clinical opinion).', adductors_r: 'Draw the kicking leg across (clinical opinion).', hamstrings_r: 'Lengthen as the straight leg kicks up (clinical opinion).' },
  breathing: { pattern: 'Exhale as the ball curls in and the leg kicks, inhale as both return.', cadence: 'About 1.2 s in, 0.5 s hold, 1.8 s out' },
  rx: { reps: '6-10 per side', tempo: '1-0.5-2-0', progression: 'Slower return, or arms across the chest' },
  phases: [
    { id: 'setup', label: 'Hips up, one heel on the ball', end: 0.8, cue: 'Lie on your back, arms on the floor, left heel on the ball, right leg up in line, hips lifted.', w: 0.3 },
    { id: 'curl', label: 'Curl and kick', end: 2.0, breath: 'exhale', cue: 'Breathe out, curl the ball in with the left heel and kick the straight right leg up and across.', w: 1 },
    { id: 'hold', label: 'Hold', end: 2.5, cue: 'Hips high, ball still.', w: 1 },
    { id: 'extend', label: 'Roll out', end: 4.3, breath: 'inhale', cue: 'Breathe in, roll the ball back out and bring the right leg back in line.', w: 0.35 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep the hips off the floor; repeat, then switch legs.', w: 0.3 },
  ],
  mistakes: [['Dropping the hips as the ball rolls in', 'Drive the hips up as the heel comes in.'], ['Letting the ball wander sideways', 'Press the heel straight down through the middle of the ball.'], ['Bending the kicking knee', 'Keep the right leg long.'], ['Rushing the roll-out', 'Roll out over about 2 s with the hips up.']],
  kin: [['Knee flexion (ball leg)', 'From near straight to about 80-100 degrees (clinical opinion); Swiss ball curls load the hamstrings (Escamilla 2016)', ['escamilla2016']], ['Hips', 'Lifted throughout (Lehecka 2017)', ['lehecka2017']], ['Diagonal kick', 'Straight leg to about 60-80 degrees of hip flexion, across the midline (clinical opinion)', []], ['Ball', 'Rolls toward the glutes under the heel (standard technique)', []], ['Tempo', 'Controlled, slower out (clinical opinion)', []]],
  safety: { cautions: ['Use a ball rated for exercise, inflated firm, on a non-slip mat.', 'Hamstring cramp: stop and use both legs.'], modify: ['Both heels on the ball (two-leg curl).'], regressions: ['Lying hip lift on a stability ball.'], progressions: ['Arms across the chest.', 'Pause with the ball curled in.'] },
  act: { hamstrings_l: [0.3, 0.8], glute_max_l: [0.3, 0.6], calves_l: [0.12, 0.35], hip_flexors_r: [0.15, 0.5], core: [0.25, 0.42], obliques_r: [0.15, 0.32], obliques_l: [0.15, 0.32], glute_med_l: [0.2, 0.32], adductors_r: [0.08, 0.25] },
  props: [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [180, 0.6, 62] }],
  guides: [{ id: 'kickPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Diagonal kick' }, { id: 'kneeAngle', kind: 'jointAngle', joint: 'knee_l', normBand: [80, 100], label: 'Ball leg curls to about 90 degrees' }],
  checks: { stillJoints: ['wrist_r', 'wrist_l'], plantedContacts: ['arm_r', 'arm_l'] },
});

const B = G.supineRoll();
const BALL_D = 55, SQ = 0.04, RY = (BALL_D / 2) * (1 - SQ), RX = (BALL_D / 2) * (1 + SQ / 2);
const K0 = 12, K1 = 92, DORSI = -8;
// left leg: knee k, hip flex solved so the left foot's ankle-toe midpoint stays at MID_Y (the ball rolls, bottom on the floor)
const midY = (W) => (W.ankle_l.p[1] + W.toe_l.p[1]) / 2;
const legL = (p, hf, k) => { p.ch.hip_l = { flex: r1(hf), abd: 0, rot: 0 }; p.ch.knee_l = { flex: r1(k) }; p.ch.ankle_l = { dorsi: DORSI }; return p; };
const bisect = (p0, k, f) => { let a = -20, b = 110; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(L.fk(legL(clone(p0), m, k))) < 0) a = m; else b = m; } return legL(clone(p0), (a + b) / 2, k); };
const ballBelow = (W) => { const h = H.lowPoint(W, 'foot_l'); return { c: [h[0], RY, h[2]], r: BALL_D / 2, rx: RX, ry: RY }; };
// start: hips up in a straight line shoulders-hips-heel (pelvis roll found by bisection), heel touching the ball top
const sagBelow = (W) => { const sh = W.shoulder_l.p, an = W.ankle_l.p, h = W.hip_l.p, d = V.norm([an[0] - sh[0], an[1] - sh[1], 0]); return -((h[0] - sh[0]) * -d[1] + (h[1] - sh[1]) * d[0]); };
const startLeg = (dP) => bisect(B.trunk(dP), K0, (W) => GA.shapeBallGap(W, ballBelow(W), 'foot_l'));
let lo = 5, hi = 60, DP = 25; for (let i = 0; i < 30; i++) { DP = (lo + hi) / 2; if (sagBelow(L.fk(startLeg(DP))) > 0) lo = DP; else hi = DP; }
DP = r1(DP);
const W0 = L.fk(startLeg(DP)), MID_Y = midY(W0);
const DP_CURL = 14; // extra pelvis roll at full curl: the hips rise as the heel comes in
function poseAt(f) {
  let p = bisect(B.trunk(DP + DP_CURL * f), K0 + (K1 - K0) * f, (W) => midY(W) - MID_Y);
  // right leg: in line with the body at the start, kicks up and across (straight knee)
  p.ch.hip_r = { flex: r1(8 + 70 * f), abd: r1(2 - 18 * f), rot: 0 }; p.ch.knee_r = { flex: 4 }; p.ch.ankle_r = { dorsi: r1(-20 + 15 * f) };
  return B.arms(p);
}
const { poses, keyframes } = G.rep(poseAt);
const ex = H.module_(meta, B.contacts, poses, keyframes);
const Wr = L.fk(poses.rest);
const ballProp = G.rollingBall(Wr, 'ankle_l', 'toe_l', ballBelow(Wr).c, { d: BALL_D, squash: SQ });
ex.props = ex.props.concat([ballProp]);
const ballAt = (W) => { const b = G.rollingBallAt(W, ballProp); return { c: b.c, r: b.r, rx: RX, ry: RY }; };
let heelGap = [1e9, -1e9], ballY = [1e9, -1e9], ballX = [1e9, -1e9], bodyBall = 1e9, butt = 1e9, kickClr = 1e9;
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W) => { const ball = ballAt(W), g = GA.shapeBallGap(W, ball, 'foot_l'); heelGap = [Math.min(heelGap[0], g), Math.max(heelGap[1], g)];
  const bot = ball.c[1] - ball.ry; ballY = [Math.min(ballY[0], bot), Math.max(ballY[1], bot)]; ballX = [Math.min(ballX[0], ball.c[0]), Math.max(ballX[1], ball.c[0])];
  bodyBall = Math.min(bodyBall, GA.ballClear(W, ball, { skip: /^(foot|calf|shank)_l$/ }).d); butt = Math.min(butt, H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis'));
  kickClr = Math.min(kickClr, L.V.len(L.V.sub(W.ankle_r.p, W.knee_l.p)) - 12); } });
const Wt = L.fk(poses.top);
const set = H.setKin(ex);
set('Knee flexion (ball leg)', 'setup', `≈${Math.round(H.kneeOf(Wr, 'l'))}°`); set('Knee flexion (ball leg)', 'peak', `≈${Math.round(H.kneeOf(Wt, 'l'))}°`);
set('Hips', 'setup', `Lifted in line (hip joint ${r1(Wr.hip_l.p[1])} cm)`); set('Hips', 'peak', `${r1(Wt.hip_l.p[1])} cm; lowest point of the seat ${butt.toFixed(1)} cm off the mat`);
set('Diagonal kick', 'setup', `Right hip ≈${poses.rest.ch.hip_r.flex}°`); set('Diagonal kick', 'peak', `Right hip ≈${poses.top.ch.hip_r.flex}° flexion, ${-poses.top.ch.hip_r.abd}° adduction, knee straight`);
set('Ball', 'setup', `${BALL_D} cm ball under the left heel`); set('Ball', 'peak', `Rolls ${(ballX[1] - ballX[0]).toFixed(0)} cm toward the glutes`);
set('Tempo', 'setup', 'Set 0.8 s'); set('Tempo', 'peak', '1.2 s in, 0.5 s hold, 1.8 s out');
ex.checks.measure = { name: 'kneeFlexion', min: K1 - 5, max: K1 + 5 };
console.log(`Ball One-Leg Curl + Kick: roll ${DP} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} heelGap ${heelGap.map((v) => v.toFixed(2))} ballBottom ${ballY.map((v) => v.toFixed(2))} roll ${ballX.map(r1)} bodyBall ${bodyBall.toFixed(1)} butt ${butt.toFixed(1)} kickClr ${kickClr.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hands slide'); process.exitCode = 1; }
if (Math.abs(ballY[0]) > 0.6 || Math.abs(ballY[1]) > 0.6) { console.error('FAIL: ball leaves the floor'); process.exitCode = 1; }
if (heelGap[0] < -1.5 || heelGap[1] > 1.5) { console.error('FAIL: heel not on the ball'); process.exitCode = 1; }
if (butt < 2) { console.error('FAIL: hips touch down'); process.exitCode = 1; }
