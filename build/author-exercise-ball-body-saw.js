// Exercise Ball Body Saw (GymVisual #14471, movement reference only): a forearm plank with the shins on top of a 55 cm
// exercise ball, elbows on the mat under the shoulders (planted forearms), body in one straight line. Keeping the line,
// the body saws back (the shoulders slide behind the elbows, about 12 cm, the arms reaching further overhead) and forward
// again; the ball rolls a few cm under the shins. Bilateral.
// Gear: the rolling ball of src/gear/g3attach-balls.js, mounted between the ankles. Forearm plank set-up as in
// author-front-plank.js (elbows held on their mat points by keeping the shoulders one upper-arm length away).
const L = require('./lib');
const { R, V, Q, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'exercise-ball-body-saw', name: 'Exercise Ball Body Saw', url: 'https://gymvisual.com/videos/14471-exercise-ball-body-saw.html',
  aliases: ['Stability ball body saw', 'Swiss ball forearm plank saw'], bodyPart: 'Waist (core)', secondary: ['Shoulders'], equipment: ['Stability ball', 'Mat'],
  mechanics: 'Compound (anti-extension core)', plane: 'Sagittal', side: 'bilateral', cam: 'side', difficulty: 'Advanced',
  muscles: { target: ['core'], synergist: [...G.both('obliques'), ...G.both('lats'), ...G.both('serratus')], stabilizer: [...G.both('ant_deltoid'), ...G.both('glute_max'), ...G.both('quads'), ...G.both('hip_flexors')], lengthened: [] },
  notes: { core: 'Rectus abdominis resists the trunk sagging as the lever lengthens (Escamilla 2016; Oliva-Lozano 2020).', obliques_r: 'Brace the trunk on the unstable ball (Escamilla 2016).', obliques_l: 'Brace the trunk on the unstable ball (Escamilla 2016).', lats_r: 'Pull the body forward again (clinical opinion).', lats_l: 'Pull the body forward again (clinical opinion).', serratus_r: 'Hold the shoulder blades as the arms reach overhead (clinical opinion).', serratus_l: 'Hold the shoulder blades as the arms reach overhead (clinical opinion).', ant_deltoid_r: 'Push the body back (clinical opinion).', ant_deltoid_l: 'Push the body back (clinical opinion).', glute_max_r: 'Keeps the hips in line (clinical opinion).', glute_max_l: 'Keeps the hips in line (clinical opinion).', quads_r: 'Keep the knees straight (clinical opinion).', quads_l: 'Keep the knees straight (clinical opinion).', hip_flexors_r: 'Stop the hips sagging (clinical opinion).', hip_flexors_l: 'Stop the hips sagging (clinical opinion).' },
  breathing: { pattern: 'Breathe out as you saw back, in as you come forward; keep the brace.', cadence: 'About 1.5 s back, 0.5 s hold, 1.5 s forward' },
  rx: { reps: '8-12', tempo: '1.5-0.5-1.5-0', progression: 'Saw further back, or slower' },
  phases: [
    { id: 'setup', label: 'Forearm plank on the ball', end: 0.8, cue: 'Forearms on the mat under the shoulders, shins on the ball, body in one straight line.', w: 0.45 },
    { id: 'back', label: 'Saw back', end: 2.2, breath: 'exhale', cue: 'Breathe out and push the body back, shoulders sliding behind the elbows.', w: 1 },
    { id: 'hold', label: 'Hold', end: 2.7, cue: 'Hold the line; no sag at the hips.', w: 1 },
    { id: 'forward', label: 'Saw forward', end: 4.3, breath: 'inhale', cue: 'Breathe in and pull the body forward until the shoulders are over the elbows.', w: 0.5 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Stay braced; repeat.', w: 0.45 },
  ],
  mistakes: [['Hips sagging as you go back', 'Shorten the saw; brace the abs and squeeze the glutes.'], ['Piking the hips up', 'Keep shoulders, hips and ankles in one line.'], ['Shrugging', 'Push the floor away through the forearms.'], ['Rushing', 'Smooth, controlled saw; the ball should roll, not bounce.']],
  kin: [['Body line', 'Shoulder-hip-ankle straight throughout (clinical opinion)', []], ['Shoulder travel', 'Shoulders slide about 10-15 cm behind the elbows (clinical opinion)', []], ['Elbows', 'Planted under the shoulders at the start (standard forearm plank)', []], ['Ball', 'Prone work on a Swiss ball raises abdominal demand (Escamilla 2016; Oliva-Lozano 2020)', ['escamilla2016', 'oliva2020']], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Use a ball rated for exercise, inflated firm, on a non-slip mat.', 'Low-back pain: stop; regress to a front plank.'], modify: ['Ball further up the legs (thighs) for a shorter lever.'], regressions: ['Front plank.', 'Ball plank hold.'], progressions: ['Longer saw.', 'Feet on the ball.'] },
  act: { core: [0.4, 0.75], obliques_r: [0.25, 0.45], obliques_l: [0.25, 0.45], lats_r: [0.15, 0.3], lats_l: [0.15, 0.3], serratus_r: [0.25, 0.42], serratus_l: [0.25, 0.42], ant_deltoid_r: [0.25, 0.4], ant_deltoid_l: [0.25, 0.4], glute_max_r: [0.15, 0.22], glute_max_l: [0.15, 0.22], quads_r: [0.15, 0.2], quads_l: [0.15, 0.2], hip_flexors_r: [0.15, 0.25], hip_flexors_l: [0.15, 0.25] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [200, 0.6, 70] }],
  guides: [{ id: 'shoulderPath', kind: 'path', joint: 'shoulder_r', from: 0.8, to: 2.2, label: 'Shoulders slide back' }],
  checks: { stillJoints: ['elbow_r', 'elbow_l'], plantedContacts: ['arm_r', 'arm_l'] },
});

const r3 = (v) => Math.round(v * 1000) / 1000;
const BALL_D = 55, SQ = 0.04, RY = (BALL_D / 2) * (1 - SQ), SAW = 12;
function solve(pose, paths, objs, contacts) {
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => L.setPathV(q, p, x[i])); return q; };
  const res = (x) => { const q = set(x), W = L.fk(q, contacts); return objs.flatMap((f) => f(W, q)); };
  const sol = R.solveLM(paths.map((p) => L.getPath(pose, p) ?? 0), res, { iters: 400 });
  return set(sol.x.map(r3));
}
// straight body: legs long, feet relaxed (pointed), head neutral
const base = clone(L.POSES.plank().pose); delete base.ik;
Object.assign(base.ch, { knee_r: { flex: 3 }, knee_l: { flex: 3 }, ankle_r: { dorsi: -35 }, ankle_l: { dorsi: -35 }, hip_r: { flex: 0, abd: 0, rot: 0 }, hip_l: { flex: 0, abd: 0, rot: 0 }, sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 8, elevate: 0 } });
P.head(base, -14);
// shins on the ball: the lower shank capsule rests on the ball top; ball centre below the shins near the ankles
const SHANK_R = L.rig.shapes.find((x) => x.id === 'shank_r').r[1];
const ANK_Y = r3(BALL_D * (1 - SQ) + SHANK_R + 0.3 + 3);
const p0 = solve(base, ['root.pos.1', 'root.rot.pitch'], [L.obj.atY('shoulder_r', P.ELBOW_Y + P.UA, 3), (W) => [(W.ankle_r.p[1] - ANK_Y) * 3]]);
const W0 = L.fk(p0);
const E = { r: [r3(W0.shoulder_r.p[0]), P.ELBOW_Y, r3(W0.shoulder_r.p[2])], l: [r3(W0.shoulder_l.p[0]), P.ELBOW_Y, r3(W0.shoulder_l.p[2])] };
const WT = {}; for (const s of ['r', 'l']) { const dy = P.PALM - P.ELBOW_Y; WT[s] = [r3(E[s][0] + Math.sqrt(P.FA ** 2 - dy * dy)), P.PALM, E[s][2]]; }
const handQ = (s) => P.qArr(s === 'r' ? L.handRotR : Q.mirrorZ(L.handRotR));
const contacts = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { label: `${s === 'r' ? 'Right' : 'Left'} forearm`, pole: [-0.5, -1, 0], handRot: handQ(s) }));
const sphere = (W) => ['r', 'l'].flatMap((s) => V.sub(W[`elbow_${s}`].p, E[s]).map((v) => v * 6));
// f: 0 = shoulders over the elbows, 1 = shoulders SAW cm behind them. The ankles stay at ANK_Y (ball bottom on the floor).
function poseAt(f) {
  const p = clone(p0); p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };
  const q = solve(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [sphere, (W) => [(W.shoulder_r.p[0] - (E.r[0] - SAW * f)) * 3, (W.ankle_r.p[1] - ANK_Y) * 3]], contacts);
  return P.fitAll(q, contacts);
}
const { poses, keyframes } = G.repDense(poseAt, { top: 2.2, hold: 2.7 }, 10);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wr = L.fk(poses.rest, contacts);
const mid = V.scale(V.add(Wr.ankle_r.p, Wr.ankle_l.p), 0.5);
// ball centre: under the lower shins, 9 cm up the legs from the ankles
const cen = [mid[0] + 9, RY, 0];
const ballProp = G.rollingBall(Wr, 'ankle_r', 'ankle_l', cen, { d: BALL_D, squash: SQ });
ex.props = ex.props.concat([ballProp]);
const ballAt = (W) => { const b = G.rollingBallAt(W, ballProp); return { c: b.c, r: b.r, rx: b.r * (1 + SQ / 2), ry: RY }; };
let shin = [1e9, -1e9], ballY = [1e9, -1e9], ballX = [1e9, -1e9], line = [1e9, -1e9], other = 1e9;
const sw = P.sweep(ex, ['r', 'l'].map((s) => ({ joint: `elbow_${s}`, p: E[s] })));
H.loopReport(ex, { probe: (W) => { const b = ballAt(W), g = Math.min(GA.shapeBallGap(W, b, 'shank_r'), GA.shapeBallGap(W, b, 'shank_l')); shin = [Math.min(shin[0], g), Math.max(shin[1], g)];
  const bot = b.c[1] - b.ry; ballY = [Math.min(ballY[0], bot), Math.max(ballY[1], bot)]; ballX = [Math.min(ballX[0], b.c[0]), Math.max(ballX[1], b.c[0])]; other = Math.min(other, GA.ballClear(W, b, { skip: /^(shank|calf|foot)_/ }).d);
  const ln = 180 - V.angle(V.sub(W.shoulder_r.p, W.hip_r.p), V.sub(W.ankle_r.p, W.hip_r.p)); line = [Math.min(line[0], ln), Math.max(line[1], ln)]; } });
const set = H.setKin(ex);
set('Body line', 'setup', `${Math.round(line[0])}° off straight`); set('Body line', 'peak', `≤${Math.round(line[1])}° off straight`);
set('Shoulder travel', 'setup', 'Shoulders over the elbows'); set('Shoulder travel', 'peak', `${SAW} cm behind the elbows`);
set('Elbows', 'setup', `Planted ${Math.round(2 * E.r[2])} cm apart`); set('Elbows', 'peak', 'Stay planted');
set('Ball', 'setup', `${BALL_D} cm ball under the shins (gap ${shin[0].toFixed(1)} to ${shin[1].toFixed(1)} cm)`); set('Ball', 'peak', `Rolls ${(ballX[1] - ballX[0]).toFixed(0)} cm`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.4 s back, 0.5 s hold, 1.6 s forward');
const travel = V.len(V.sub(L.fk(poses.top, contacts).pelvis.p, Wr.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Exercise Ball Body Saw: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} shinGap ${shin.map((v) => v.toFixed(2))} ballBottom ${ballY.map((v) => v.toFixed(2))} roll ${ballX.map((v) => v.toFixed(1))} line ${line.map((v) => v.toFixed(1))} otherBall ${other.toFixed(1)} travel ${travel.toFixed(1)}`);
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted forearms slide'); process.exitCode = 1; }
if (Math.abs(ballY[0]) > 0.6 || Math.abs(ballY[1]) > 0.6) { console.error('FAIL: ball leaves the floor'); process.exitCode = 1; }
if (shin[0] < -1.5 || shin[1] > 1.5) { console.error('FAIL: shins not on the ball'); process.exitCode = 1; }
