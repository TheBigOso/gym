// Dumbbell Lying Femoral (GymVisual #9291, movement reference only): the prone dumbbell leg curl. Lying face down on a flat
// bench with the knees just past its end, hands holding the bench legs below the front end, a dumbbell held upright
// between the feet (handle squeezed between the arches, feet flexed). Both knees curl the dumbbell up until the shins are
// past vertical (about 100 degrees), pause, and lower slowly to nearly straight. Hips stay pressed into the bench. Bilateral.
// Gear: dumbbell resting on the body (src/gear/attach.js, attach to ankle_r with params.axis). Prone base and the dumbbell
// part clearances: build/families/gear-g3attach.js (proneLie, armsDown, dbParts).
const L = require('./lib');
const { V, Q, r1, clone } = L;
const H = require('./families/hips');
const D = require('./families/dumbbell');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'dumbbell-lying-femoral', name: 'Dumbbell Lying Femoral', url: 'https://gymvisual.com/videos/9291-dumbbell-lying-femoral.html',
  aliases: ['Prone dumbbell leg curl', 'Dumbbell lying leg curl', 'Lying femoral curl with dumbbell'], bodyPart: 'Thighs (hamstrings)', secondary: ['Calves'], equipment: ['Dumbbell (between the feet)', 'Flat bench'],
  mechanics: 'Isolation (knee flexion)', plane: 'Sagittal', side: 'bilateral', cam: 'side', difficulty: 'Intermediate',
  muscles: { target: G.both('hamstrings'), synergist: G.both('calves'), stabilizer: [...G.both('glute_max'), 'core', ...G.both('forearm_flexors')], lengthened: G.both('quads') },
  notes: { hamstrings_r: 'Flex the knee against the dumbbell; the load is heaviest with the shins horizontal (clinical opinion).', hamstrings_l: 'Flex the knee against the dumbbell (clinical opinion).', calves_r: 'Gastrocnemius assists knee flexion (clinical opinion).', calves_l: 'Gastrocnemius assists knee flexion (clinical opinion).', glute_max_r: 'Keeps the hips on the bench (clinical opinion).', glute_max_l: 'Keeps the hips on the bench (clinical opinion).', core: 'Stops the low back arching (clinical opinion).', forearm_flexors_r: 'Grip the bench (clinical opinion).', forearm_flexors_l: 'Grip the bench (clinical opinion).', quads_r: 'Lengthen at the top (clinical opinion).', quads_l: 'Lengthen at the top (clinical opinion).' },
  breathing: { pattern: 'Exhale as the heels curl up, inhale as they lower.', cadence: 'About 1.2 s up, 0.5 s hold, 2 s down' },
  rx: { reps: '8-12', tempo: '1-0.5-2-0', progression: 'Heavier dumbbell; have a partner place it between the feet' },
  phases: [
    { id: 'setup', label: 'Lie on the bench, dumbbell between the feet', end: 0.8, cue: 'Lie face down, knees just past the end of the bench, a dumbbell squeezed upright between the feet; hold the bench.', w: 0.12 },
    { id: 'curl', label: 'Curl up', end: 2.0, breath: 'exhale', cue: 'Breathe out and curl the heels up, keeping the feet flexed around the handle.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Shins just past vertical; hips stay down.', w: 0.75 },
    { id: 'lower', label: 'Lower with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and lower slowly to almost straight.', w: 0.25 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep the knees soft at the bottom; repeat.', w: 0.12 },
  ],
  mistakes: [['Lifting the hips off the bench', 'Press the hips down; go lighter if they rise.'], ['Losing the squeeze on the dumbbell', 'Keep the feet flexed and pressed together.'], ['Dropping into full extension', 'Stop with the knees soft so the load stays on the hamstrings.'], ['Curling too far', 'Past vertical the load falls off; stop there.']],
  kin: [['Knee flexion', 'From about 10 degrees to 90-110 degrees (clinical opinion)', []], ['Hips', 'Pelvis and thighs on the bench, knees just past its end (standard setup)', []], ['Dumbbell', 'Upright between the feet, handle between the arches (standard setup)', []], ['Tempo', 'Controlled, slower down (clinical opinion)', []]],
  safety: { cautions: ['Use a weight you can control; a dropped dumbbell can land on the calves or the floor.', 'Have a partner place and remove the dumbbell.'], modify: ['Hamstring cramp: lighter weight, smaller range.'], regressions: ['Band lying leg curl.'], progressions: ['Heavier dumbbell.', 'Slower lowering.'] },
  act: { hamstrings_r: [0.12, 0.75], hamstrings_l: [0.12, 0.75], calves_r: [0.08, 0.35], calves_l: [0.08, 0.35], glute_max_r: [0.1, 0.2], glute_max_l: [0.1, 0.2], core: [0.1, 0.16], forearm_flexors_r: [0.15, 0.25], forearm_flexors_l: [0.15, 0.25] },
  guides: [{ id: 'heelPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Heels curl up' }, { id: 'kneeAngle', kind: 'jointAngle', joint: 'knee_r', normBand: [90, 110], label: 'Knee flexion about 90-110 degrees' }],
  checks: { stillJoints: ['pelvis'] },
});

const SEAT = 45, KTOP = 102, K0 = 10, ABD = -2, DORSI = 15;
let base = G.proneLie({ y0: SEAT, knee: K0, ankle: DORSI });
for (const s of ['r', 'l']) { base.ch[`hip_${s}`].abd = ABD; base.ch[`ankle_${s}`] = { dorsi: DORSI }; }
base = G.armsDown(base, { fwd: 6, drop: 36, out: 5 });
function poseAt(f) { const p = clone(base); for (const s of ['r', 'l']) p.ch[`knee_${s}`] = { flex: r1(K0 + (KTOP - K0) * f) }; return p; }
const { poses, keyframes } = G.rep(poseAt, { holdF: 1.02 });
const ex = H.module_(meta, [], poses, keyframes);
const W0 = L.fk(poses.rest);
// dumbbell between the feet: centre between the ankles, 4 cm toward the toes and 3 cm up the shins (ankle_r frame)
const mid = V.scale(V.add(W0.ankle_r.p, W0.ankle_l.p), 0.5), cen = V.add(V.add(mid, V.scale(Q.rot(W0.ankle_r.q, [1, 0, 0]), 4)), V.scale(Q.rot(W0.ankle_r.q, [0, 1, 0]), 3));
const db = { id: 'db', kind: 'dumbbell', size: [30, 10, 10], attach: { joint: 'ankle_r', offset: GA.toFrame(W0, 'ankle_r', cen).map(r1) }, params: { axis: [1, 0, 0] } };
// bench: from just above the knees to past the shoulders
const back = r1(W0.knee_r.p[0] + 6), front = r1(W0.shoulder_r.p[0] + 8), bench = D.bench({ x: r1((back + front) / 2), seat: r1(front - back), height: SEAT, width: 30, id: 'bench' });
ex.props = [bench.prop, db];
let handle = 1e9, plates = 1e9, dbLow = 1e9, onBench = [1e9, -1e9];
const rep = H.loopReport(ex, { probe: (W) => { const r = G.dbParts(W, db); handle = Math.min(handle, r.handle.d); plates = Math.min(plates, r.plates.d); dbLow = Math.min(dbLow, ...r.ends.map((e) => e[1] - 5));
  const lo = Math.min(...G.PRONE_BODY.map((id) => H.bottomOf(W, id))) - SEAT; onBench = [Math.min(onBench[0], lo), Math.max(onBench[1], lo)]; } });
const Wt = L.fk(poses.top);
const set = H.setKin(ex);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(W0, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Hips', 'setup', `Trunk and thighs on the ${SEAT} cm bench, knees ${Math.round(back - W0.knee_r.p[0])} cm past its end`); set('Hips', 'peak', 'Unchanged');
set('Dumbbell', 'setup', `Between the feet (handle clearance ${handle.toFixed(1)} cm, plates ${plates.toFixed(1)} cm)`); set('Dumbbell', 'peak', 'Rides with the feet');
set('Tempo', 'setup', 'Set 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s hold, 1.8 s down');
ex.checks.measure = { name: 'kneeFlexion', min: KTOP - 5, max: KTOP + 5 };
console.log(`Dumbbell Lying Femoral: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} handle ${handle.toFixed(2)} plates ${plates.toFixed(2)} dbLow ${dbLow.toFixed(1)} bodyOnBench ${onBench.map((v) => v.toFixed(2))} hands y ${r1(W0.wrist_r.p[1])}`);
if (rep.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
if (handle < -0.3 || plates < -1.5) { console.error('FAIL: dumbbell inside the feet'); process.exitCode = 1; }
if (onBench[0] < -0.6) { console.error('FAIL: body sinks into the bench'); process.exitCode = 1; }
