// Lying Hip Lift on a Stability Ball (GymVisual #996, movement reference only): lying on the back on a mat, arms on the
// floor by the sides (planted), knees soft with the heels resting on top of a 55 cm stability ball. As the hips rise
// the ball rolls a few cm under the heels (the knees stay soft, the heels stay on top of it). The pelvis rolls up about the upper back until shoulders, hips and
// ankles form one line, a squeeze, then lowers under control. Head stays on the mat. Bilateral.
// Gear: stability_ball prop (src/gear/attach.js, GA.stabilityBall). Bridge trunk solve as in author-glute-bridge.js.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'lying-hip-lift-on-stability-ball', name: 'Lying Hip Lift (on stability ball)', url: 'https://gymvisual.com/videos/996-lying-hip-lift-on-stability-ball.html',
  aliases: ['Stability ball bridge', 'Swiss ball hip lift', 'Heels-on-ball glute bridge'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Hamstrings', 'Core'], equipment: ['Stability ball', 'Mat'],
  mechanics: 'Compound (hip extension)', plane: 'Sagittal', side: 'bilateral', cam: 'side',
  muscles: { target: G.both('glute_max'), synergist: G.both('hamstrings'), stabilizer: ['core', ...G.both('spinal_extensors'), ...G.both('obliques'), ...G.both('glute_med')], lengthened: G.both('hip_flexors') },
  notes: { glute_max_r: 'Extends the hip to lift the pelvis (Lehecka 2017).', glute_max_l: 'Extends the hip to lift the pelvis (Lehecka 2017).', hamstrings_r: 'Work hard with the legs long on the ball (Escamilla 2016).', hamstrings_l: 'Work hard with the legs long on the ball (Escamilla 2016).', core: 'Steadies the trunk on the unstable ball (Escamilla 2016).', spinal_extensors_r: 'Hold the line at the top (clinical opinion).', spinal_extensors_l: 'Hold the line at the top (clinical opinion).', obliques_r: 'Stop the ball rolling sideways (clinical opinion).', obliques_l: 'Stop the ball rolling sideways (clinical opinion).', glute_med_r: 'Keeps the pelvis level (clinical opinion).', glute_med_l: 'Keeps the pelvis level (clinical opinion).', hip_flexors_r: 'Lengthen at the top (clinical opinion).', hip_flexors_l: 'Lengthen at the top (clinical opinion).' },
  breathing: { pattern: 'Exhale as the hips rise, inhale as they lower.', cadence: 'About 1.5 s up, 1 s squeeze, 2 s down' },
  rx: { reps: '10-15', tempo: '1.5-1-2-0', progression: 'Arms across the chest, then single-leg' },
  phases: [
    { id: 'setup', label: 'Heels on the ball', end: 0.8, cue: 'Lie on your back, heels on top of the ball, legs almost straight, arms on the floor by your sides.', w: 0.08 },
    { id: 'up', label: 'Lift the hips', end: 2.3, breath: 'exhale', cue: 'Breathe out, press the heels into the ball and lift the hips until the body is one straight line.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 3.3, cue: 'Squeeze the glutes; keep the ball still.', w: 1 },
    { id: 'down', label: 'Lower with control', end: 5.3, breath: 'inhale', cue: 'Breathe in and lower the hips slowly to just above the mat.', w: 0.15 },
    { id: 'reset', label: 'Reset', end: 6.0, cue: 'Touch down lightly; repeat.', w: 0.08 },
  ],
  mistakes: [['Arching the low back at the top', 'Stop at a straight line; ribs down.'], ['Letting the ball roll', 'Press both heels down evenly.'], ['Pushing through the arms', 'Arms only steady you.'], ['Dropping fast', 'Lower over about 2 s.']],
  kin: [['Hip extension', 'To neutral (straight line shoulders-hips-ankles) (clinical opinion); bridging excites the gluteus maximus (Lehecka 2017)', ['lehecka2017']], ['Knee', 'Nearly straight, heels on the ball (standard setup)', []], ['Hip height', 'Pelvis rises from the mat to the shoulder-ankle line (clinical opinion)', []], ['Ball', 'Supine work on a Swiss ball raises core and hamstring demand (Escamilla 2016)', ['escamilla2016']], ['Tempo', 'Controlled, squeeze at the top (clinical opinion)', []]],
  safety: { cautions: ['Use a ball rated for exercise, inflated firm, on a non-slip mat.'], modify: ['Ball unsteady: start with the calves on the ball.'], regressions: ['Glute bridge on the floor.'], progressions: ['Arms across the chest.', 'Exercise ball one-legged hamstring curl.'] },
  act: { glute_max_r: [0.08, 0.68], glute_max_l: [0.08, 0.68], hamstrings_r: [0.08, 0.5], hamstrings_l: [0.08, 0.5], core: [0.1, 0.35], spinal_extensors_r: [0.08, 0.3], spinal_extensors_l: [0.08, 0.3], obliques_r: [0.08, 0.25], obliques_l: [0.08, 0.25], glute_med_r: [0.08, 0.25], glute_med_l: [0.08, 0.25] },
  props: [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [180, 0.6, 62] }],
  guides: [{ id: 'hipPath', kind: 'path', joint: 'pelvis', from: 0.8, to: 2.3, label: 'Hips lift' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-5, 5], label: 'Hip extended to neutral' }],
  checks: { stillJoints: ['wrist_r', 'wrist_l'], plantedContacts: ['arm_r', 'arm_l'] },
});

const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
const BALL_D = 55, SQ = 0.04, Z_FOOT = 9;
// lying with straight-ish legs (knees 8), feet relaxed; then rotate the legs up at the hips until the heels sit on the ball top
const lie0 = (() => { const p = H.lieBase(); for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 0, abd: 3, rot: 0 }; p.ch[`knee_${s}`] = { flex: 8 }; p.ch[`ankle_${s}`] = { dorsi: 0 }; } return p; })();
const W00 = L.fk(lie0), SX = W00.shoulder_r.p[0], P0 = lie0.root.rot.pitch, L5 = lie0.ch.spine_l5.flex;
function trunk(dP) {
  const p = clone(lie0); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(L5 * (1 - Math.min(1, dP / 30)));
  return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
    (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, (W.shoulder_r.p[0] - SX) * 2],
    (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
}
// Legs: knees soft (KNEE) and feet relaxed; for each pelvis roll the hip angle is solved so the ankles stay at the height
// where the heels rest on top of the ball. The ball rolls a few cm under the heels as the hips rise: it is the rolling ball
// of src/gear/g3attach-balls.js, mounted between the ankles (its centre keeps a fixed offset from them, bottom on the floor).
const KNEE = 10, DORSI = -8;
const TOPY = BALL_D * (1 - SQ);
const legs = (p, hf) => { for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: r1(hf), abd: 3, rot: 0 }; p.ch[`knee_${s}`] = { flex: KNEE }; p.ch[`ankle_${s}`] = { dorsi: DORSI }; } return p; };
// rest: heels just touching a ball centred below them (between the feet); later poses keep the ankles at that height so the
// ball (rigidly offset from the ankles) keeps its bottom on the floor
const RY = (BALL_D / 2) * (1 - SQ), RX = (BALL_D / 2) * (1 + SQ / 2);
const ballBelow = (W) => { const h = H.lowPoint(W, 'foot_r'); return { c: [h[0], RY, 0], r: BALL_D / 2, rx: RX, ry: RY }; };
const bisect = (p0, f) => { let a = -10, b = 90; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(L.fk(legs(clone(p0), m))) < 0) a = m; else b = m; } return legs(clone(p0), (a + b) / 2); };
let ANK_Y = null;
function solveLegs(p0) { return ANK_Y == null ? bisect(p0, (W) => GA.shapeBallGap(W, ballBelow(W), 'foot_r')) : bisect(p0, (W) => W.ankle_r.p[1] - ANK_Y); }
const HAND = { r: [r1(W00.hip_r.p[0] + 4), 2.7, 24], l: [r1(W00.hip_r.p[0] + 4), 2.7, -24] };
const contacts = [H.handC('r', [0, 0.5, 1]), H.handC('l', [0, 0.5, -1])];
const ARM_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 30, elev: 15, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: -20, elev: 20, axial: 60 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }];
// top: shoulder-hip-ankle line straight
const sagBelow = (W) => { const sh = W.shoulder_r.p, an = W.ankle_r.p, h = W.hip_r.p, d = V.norm([an[0] - sh[0], an[1] - sh[1], 0]); return -((h[0] - sh[0]) * -d[1] + (h[1] - sh[1]) * d[0]); };
let lo = 2, hi = 70, DP = 30;
for (let i = 0; i < 30; i++) { DP = (lo + hi) / 2; const W = L.fk(solveLegs(trunk(DP))); if (sagBelow(W) > 0) lo = DP; else hi = DP; }
DP = r1(DP);
const DP0 = 1.5; // pelvis just off the mat at the bottom
ANK_Y = L.fk(solveLegs(trunk(DP0))).ankle_r.p[1];
function poseAt(f) {
  let p = solveLegs(trunk(DP0 + (DP - DP0) * f));
  p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], ARM_GUESS(s)); delete p.__cost; }
  p.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 } };
  return p;
}
const { poses, keyframes } = G.rep(poseAt, { top: 2.3, hold: 3.3, back: 5.3, end: 6.0 });
const ex = H.module_(meta, contacts, poses, keyframes);
const Wr0 = L.fk(poses.rest);
const ballProp = G.rollingBall(Wr0, 'ankle_r', 'ankle_l', ballBelow(Wr0).c, { d: BALL_D, squash: SQ });
ex.props = ex.props.concat([ballProp]);
const ballAt = (W) => { const b = G.rollingBallAt(W, ballProp); return { c: b.c, r: b.r, rx: RX, ry: RY }; };
let heelGap = [1e9, -1e9], ballClr = 1e9, ballY = [1e9, -1e9], ballX = [1e9, -1e9];
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W) => { const ball = ballAt(W); const g = Math.min(GA.shapeBallGap(W, ball, 'foot_r'), GA.shapeBallGap(W, ball, 'foot_l')); heelGap = [Math.min(heelGap[0], g), Math.max(heelGap[1], g)]; ballClr = Math.min(ballClr, GA.ballClear(W, ball, { skip: /^(foot|calf|shank)_/ }).d);
  const bot = ball.c[1] - ball.ry; ballY = [Math.min(ballY[0], bot), Math.max(ballY[1], bot)]; ballX = [Math.min(ballX[0], ball.c[0]), Math.max(ballX[1], ball.c[0])]; } });
const Wr = L.fk(poses.rest, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
set('Hip extension', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}° flexion (pelvis just off the mat)`); set('Hip extension', 'peak', `Hip ≈${Math.round(poses.top.ch.hip_r.flex)}° (line shoulders-hips-ankles)`);
set('Knee', 'setup', `≈${Math.round(H.kneeOf(Wr, 'r'))}°`); set('Knee', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Hip height', 'setup', `Hip joint ${r1(Wr.hip_r.p[1])} cm`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm`);
set('Ball', 'setup', `${BALL_D} cm ball under the heels (heel gap ${heelGap[0].toFixed(1)} to ${heelGap[1].toFixed(1)} cm)`); set('Ball', 'peak', `Rolls ${(ballX[1] - ballX[0]).toFixed(0)} cm under the heels (bottom ${ballY[0].toFixed(1)} to ${ballY[1].toFixed(1)} cm off the floor)`);
set('Tempo', 'setup', 'Lie 0.8 s'); set('Tempo', 'peak', '1.5 s up, 1 s squeeze, 2 s down');
const travel = V.len(V.sub(Wt.pelvis.p, Wr.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Lying Hip Lift on Ball: roll ${DP} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} heelGap ${heelGap.map((v) => v.toFixed(2))} bodyBall ${ballClr.toFixed(1)} ballBottom ${ballY.map((v) => v.toFixed(2))} roll ${ballX.map(r1)} travel ${r1(travel)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hands slide'); process.exitCode = 1; }
if (Math.abs(ballY[0]) > 0.6 || Math.abs(ballY[1]) > 0.6) { console.error('FAIL: ball leaves the floor'); process.exitCode = 1; }
if (heelGap[0] < -1.2 || heelGap[1] > 1.2) { console.error('FAIL: heels not on the ball'); process.exitCode = 1; }
