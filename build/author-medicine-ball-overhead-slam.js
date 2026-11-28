// Medicine Ball Overhead Slam (GymVisual #11444, movement reference only): standing with the feet a little wider than the
// hips (planted), a medicine ball held in both hands at the chest. Reach the ball up overhead with long arms, then slam it
// down hard: hips hinge back, knees bend and the arms drive the ball to the floor just in front of the feet. Squat down
// with it, pick it up and stand tall with the ball back at the chest. The ball stays between the hands (it is drawn
// touching the floor at the bottom rather than bouncing). Bilateral.
// Gear: medicine ball (src/gear/g3attach-balls.js, plate with params.shape 'ball'); arms solved onto the ball each key
// (build/families/gear-g3attach.js armsOnBall) so the hands stay the same distance apart.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const G = require('./families/gear-g3attach');
const F = require('./families/b4-calvesglutes');

const meta = G.meta({
  id: 'medicine-ball-overhead-slam', name: 'Medicine Ball Overhead Slam', url: 'https://gymvisual.com/videos/11444-medicine-ball-overhead-slam.html',
  aliases: ['Med ball slam', 'Overhead ball slam', 'Medicine ball slam'], bodyPart: 'Full body (core and shoulders)', secondary: ['Lats', 'Hips', 'Thighs'], equipment: ['Medicine ball (slam ball)'],
  mechanics: 'Compound (power)', plane: 'Sagittal', side: 'bilateral', cam: 'side', difficulty: 'Intermediate',
  muscles: { target: ['core', ...G.both('lats')], synergist: [...G.both('glute_max'), ...G.both('hamstrings'), ...G.both('triceps'), ...G.both('ant_deltoid')], stabilizer: [...G.both('quads'), ...G.both('spinal_extensors'), ...G.both('calves')], lengthened: [] },
  notes: { core: 'Rectus abdominis flexes the trunk hard into the slam (Oliva-Lozano 2020, dynamic core work).', lats_r: 'Pull the arms down from overhead (clinical opinion).', lats_l: 'Pull the arms down from overhead (clinical opinion).', glute_max_r: 'Hinge and stand back up (clinical opinion).', glute_max_l: 'Hinge and stand back up (clinical opinion).', hamstrings_r: 'Control the hinge (clinical opinion).', hamstrings_l: 'Control the hinge (clinical opinion).', triceps_r: 'Extend the elbows into the throw (clinical opinion).', triceps_l: 'Extend the elbows into the throw (clinical opinion).', ant_deltoid_r: 'Lift the ball overhead (clinical opinion).', ant_deltoid_l: 'Lift the ball overhead (clinical opinion).', quads_r: 'Squat down to pick the ball up (clinical opinion).', quads_l: 'Squat down to pick the ball up (clinical opinion).', spinal_extensors_r: 'Protect the back in the pick-up (clinical opinion).', spinal_extensors_l: 'Protect the back in the pick-up (clinical opinion).', calves_r: 'Steady the stance (clinical opinion).', calves_l: 'Steady the stance (clinical opinion).' },
  breathing: { pattern: 'Inhale as the ball goes up, exhale forcefully as you slam.', cadence: 'About 0.9 s up, 0.6 s slam, 1.8 s pick-up' },
  rx: { sets: '3-5', reps: '6-10', tempo: 'Explosive down, controlled up', rest: '60-90 s', progression: 'Heavier slam ball, or more reps at the same power' },
  phases: [
    { id: 'setup', label: 'Ball at the chest', end: 0.6, cue: 'Stand a little wider than hip width, ball at the chest in both hands.', w: 0.12 },
    { id: 'lift', label: 'Reach overhead', end: 1.5, breath: 'inhale', cue: 'Breathe in and reach the ball up overhead with long arms.', w: 0.45 },
    { id: 'slam', label: 'Slam', end: 2.4, breath: 'exhale', cue: 'Breathe out hard and slam the ball to the floor just in front of your feet, hips back, knees bent.', w: 1 },
    { id: 'pick', label: 'Pick up and stand', end: 4.2, cue: 'Squat down, pick the ball up with a flat back and stand tall.', w: 0.4 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Ball back at the chest; repeat.', w: 0.12 },
  ],
  mistakes: [['Slamming with a rounded back only', 'Hinge at the hips and bend the knees; let the trunk follow.'], ['Throwing the ball at the feet', 'Aim just in front of the toes.'], ['Bouncing ball to the face', 'Use a dead (non-bouncing) slam ball.'], ['Picking up with straight legs', 'Squat down to the ball with a flat back.']],
  kin: [['Overhead reach', 'Arms long overhead, trunk tall (standard technique)', []], ['Hip hinge', 'Deep hinge and knee bend at the bottom (clinical opinion)', []], ['Trunk', 'Forceful trunk flexion into the slam (Oliva-Lozano 2020)', ['oliva2020']], ['Ball', 'Held between the hands throughout; touches the floor in front of the feet', []], ['Tempo', 'Explosive down, controlled pick-up (clinical opinion)', []]],
  safety: { cautions: ['Use a dead slam ball made for throwing, not a bouncing medicine ball.', 'Clear the area around you.'], modify: ['Low-back pain: lighter ball, smaller hinge.'], regressions: ['Lighter ball, slower tempo.'], progressions: ['Heavier ball.', 'Rotational slam.'] },
  act: { core: [0.15, 0.85], lats_r: [0.1, 0.75], lats_l: [0.1, 0.75], glute_max_r: [0.12, 0.55], glute_max_l: [0.12, 0.55], hamstrings_r: [0.1, 0.45], hamstrings_l: [0.1, 0.45], triceps_r: [0.1, 0.5], triceps_l: [0.1, 0.5], ant_deltoid_r: [0.15, 0.45], ant_deltoid_l: [0.15, 0.45], quads_r: [0.15, 0.45], quads_l: [0.15, 0.45], spinal_extensors_r: [0.15, 0.45], spinal_extensors_l: [0.15, 0.45], calves_r: [0.15, 0.3], calves_l: [0.15, 0.3] },
  props: [{ id: 'mat', kind: 'mat', center: [10, 0, 0], size: [140, 0.6, 90] }],
  guides: [{ id: 'ballPath', kind: 'path', joint: 'wrist_r', from: 1.5, to: 2.4, label: 'Slam path' }],
  checks: { stillJoints: ['ankle_r', 'ankle_l'], plantedContacts: ['leg_r', 'leg_l'] },
});

const HALF = 16, TOE = 10, BALL = 24, WIDTH = BALL + 3;
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, s === 'r' ? -TOE : TOE), pole: [1, 0.1, s === 'r' ? 0.3 : -0.3] }));
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
function body(o) {
  const p = clone(st); p.root.pos = [r1(o.x), r1(o.y), 0]; p.root.rot = { pitch: r1(-o.hinge) }; const sf = o.spine;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: r1(sf * 0.4), latFlex: 0 }, spine_t12: { rot: 0, flex: r1(sf * 0.35), latFlex: 0 }, spine_t6: { rot: 0, flex: r1(sf * 0.25), latFlex: 0 } });
  p.ch.neck_c7 = { rot: 0, flex: r1(o.neck * 0.5) }; p.ch.head_c1 = { rot: 0, flex: r1(o.neck * 0.5) };
  p.ik = { leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } };
  let q = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: -TOE }); q = H.fitLeg(q, 'l', contacts[1], FOOT.l, { rot: -TOE });
  q.ch.sc_r = { protract: 6, elevate: r1(o.elev) }; q.ch.sc_l = clone(q.ch.sc_r);
  return q;
}
// key postures along the rep (body params + ball centre); poses in between interpolate the parameters
const K = {
  chest: { x: 0, y: 90, hinge: 0, spine: 0, neck: 0, elev: 4, C: [32, 112, 0] },
  over: { x: -2, y: 90, hinge: -3, spine: -2, neck: -8, elev: 14, C: [14, 190, 0] },
  upf: { x: -1, y: 90, hinge: -1, spine: -1, neck: -4, elev: 9, C: [42, 152, 0] },
  dnf: { x: -4, y: 88, hinge: 10, spine: 6, neck: -10, elev: 10, C: [48, 145, 0] },
  mid: { x: -8, y: 82, hinge: 28, spine: 14, neck: -15, elev: 8, C: [48, 92, 0] },
  floor: { x: -18, y: 60, hinge: 56, spine: 28, neck: -30, elev: 4, C: [28, 12, 0] },
  lift: { x: -14, y: 70, hinge: 38, spine: 12, neck: -20, elev: 4, C: [30, 55, 0] },
};
const mix = (a, b, f) => { const o = {}; for (const k of Object.keys(a)) o[k] = k === 'C' ? V.lerp(a.C, b.C, f) : a[k] + (b[k] - a[k]) * f; return o; };
// samples [t, params]: hold at the chest, reach up, short pause, slam (fast), at the floor, pick up, stand
const SEG = [['chest', 'upf', 0.6, 1.05, 6], ['upf', 'over', 1.05, 1.5, 6], ['over', 'over', 1.5, 1.75, 0], ['over', 'dnf', 1.75, 1.9, 4], ['dnf', 'mid', 1.9, 2.05, 3], ['mid', 'floor', 2.05, 2.4, 6], ['floor', 'floor', 2.4, 2.8, 0], ['floor', 'lift', 2.8, 3.5, 6], ['lift', 'chest', 3.5, 4.2, 7]];
const samples = [[0, K.chest], [0.6, K.chest]];
for (const [a, b, t0, t1, n] of SEG) { if (!n) { samples.push([t1, K[a]]); continue; } for (let i = 1; i <= n; i++) samples.push([t0 + ((t1 - t0) * i) / n, i === n ? K[b] : mix(K[a], K[b], G.ease(i / n))]); }
samples.push([5.0, K.chest]);
let guess = { plane: 40, elev: 40, axial: 0, elbow: 95, pron: 0, flex: 0, dev: 0 };
const poses = {}, keyframes = []; let worst = 0, prevKey = null, idx = 0;
for (const [t, o] of samples) {
  const same = prevKey && JSON.stringify(prevKey.o) === JSON.stringify(o);
  if (same) { keyframes.push({ t: +t.toFixed(3), pose: prevKey.name }); continue; }
  const a = G.armsOnBall(body(o), o.C, WIDTH, { guess, cont: 0.04 }); const sh = a.ch.shoulder_r;
  guess = { plane: sh.plane, elev: sh.elev, axial: sh.axial, elbow: a.ch.elbow_r.flex, pron: a.ch.wrist_r.pron, flex: a.ch.wrist_r.flex, dev: a.ch.wrist_r.dev };
  worst = Math.max(worst, a.__err); delete a.__err;
  const name = o === K.chest ? 'chest' : o === K.over ? 'over' : o === K.floor ? 'floorKey' : o === K.mid ? 'mid' : o === K.lift ? 'lift' : o === K.upf ? 'upf' : o === K.dnf ? 'dnf' : `k${idx++}`;
  if (!poses[name]) poses[name] = a;
  keyframes.push({ t: +t.toFixed(3), pose: name }); prevKey = { o, name };
}
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const ball = G.medBall({ d: BALL });
ex.props = ex.props.concat([ball]);
let width = [1e9, -1e9], ballLow = 1e9, ballClr = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { const b = G.medBallAt(W, ball); width = [Math.min(width[0], b.width), Math.max(width[1], b.width)]; ballLow = Math.min(ballLow, b.c[1] - BALL / 2); ballClr = Math.min(ballClr, G.medBallClear(W, ball).d); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wf = L.fk(poses.floorKey, contacts), Wo = L.fk(poses.over, contacts);
const set = H.setKin(ex);
set('Overhead reach', 'setup', 'Ball at the chest'); set('Overhead reach', 'peak', `Ball centre ${Math.round(K.over.C[1])} cm high, shoulders ${Math.round(poses.over.ch.shoulder_r.elev)}° elevation`);
set('Hip hinge', 'setup', 'Standing tall'); set('Hip hinge', 'peak', `Hip ≈${Math.round(poses.floorKey.ch.hip_r.flex)}°, knee ≈${Math.round(H.kneeOf(Wf, 'r'))}° at the floor`);
set('Trunk', 'setup', 'Upright'); set('Trunk', 'peak', `≈${Math.round(trunkMax)}° from vertical at the bottom`);
set('Ball', 'setup', `Between the hands (${width[0].toFixed(0)} cm apart)`); set('Ball', 'peak', `Touches the floor in front of the feet (lowest ${ballLow.toFixed(1)} cm)`);
set('Tempo', 'setup', 'Hold 0.6 s'); set('Tempo', 'peak', '0.9 s up, 0.25 s pause, 0.65 s slam, 1.8 s pick-up');
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunkMax - 3), max: Math.ceil(trunkMax + 3) };
console.log(`Medicine Ball Overhead Slam: wrote ${L.write(ex)} armErr ${worst.toFixed(2)} keys ${keyframes.length}\n  ${JSON.stringify(rep)} width ${width.map((v) => v.toFixed(2))} ballLow ${ballLow.toFixed(2)} ballBody ${ballClr.toFixed(1)} trunk ${trunkMax.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (width[1] - width[0] > 1.5) { console.error('FAIL: hands leave the ball'); process.exitCode = 1; }
if (ballLow < -0.5) { console.error('FAIL: ball through the floor'); process.exitCode = 1; }
if (worst > 1) { console.error('FAIL: arm solve misses the ball'); process.exitCode = 1; }
