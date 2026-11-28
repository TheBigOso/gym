// Resistance Band Standing Hip Abduction (GymVisual #14470, movement reference only): a mini band looped around both
// ankles. Stand tall on the left leg (planted contact), hands
// on the hips. The straight right leg sweeps out to the side against the band to about 30 degrees of hip abduction, toes
// forward, pauses, and returns slowly until the feet are almost together. The pelvis stays level. Authored on the right.
// Gear: GA.bandLoop around the ankles (src/gear/attach.js). Helpers: build/families/gear-g3attach.js (standLeg, rep).
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'resistance-band-standing-hip-abduction', name: 'Resistance Band Standing Hip Abduction', url: 'https://gymvisual.com/videos/14470-resistance-band-standing-hip-abduction.html',
  aliases: ['Mini band standing hip abduction', 'Banded standing side leg raise'], bodyPart: 'Hips (gluteus medius)', secondary: ['Core'], equipment: ['Resistance band (mini loop around the ankles)'],
  mechanics: 'Isolation (hip abduction)', plane: 'Frontal', side: 'right', cam: 'front',
  muscles: { target: ['glute_med_r'], synergist: ['glute_max_r'], stabilizer: ['glute_med_l', 'core', 'obliques_l', 'calves_l'], lengthened: ['adductors_r'] },
  notes: { glute_med_r: 'Prime mover of hip abduction; standing and side-lying abduction rank high for gluteus medius (Distefano 2009; Boren 2011).', glute_max_r: 'Upper fibres assist abduction (Selkowitz 2013).', glute_med_l: 'Holds the pelvis level over the stance leg, also working against the band (clinical opinion).', core: 'Keeps the trunk tall (clinical opinion).', obliques_l: 'Resists leaning away from the band (clinical opinion).', calves_l: 'Balance on the stance foot (clinical opinion).', adductors_r: 'Lengthen as the leg moves out (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg moves out, inhale as it returns.', cadence: 'About 1.2 s out, 0.5 s hold, 1.8 s back' },
  rx: { reps: '12-20 per side', tempo: '1-0.5-2-0', progression: 'Stronger band, or move the band from above the knees to the ankles' },
  phases: [
    { id: 'setup', label: 'Stand tall, band on', end: 0.8, cue: 'Loop the band around both ankles, stand tall on the left leg and put the hands on the hips.', w: 0.05 },
    { id: 'out', label: 'Leg out to the side', end: 2.0, breath: 'exhale', cue: 'Breathe out and push the straight right leg out to the side, toes forward.', w: 1 },
    { id: 'hold', label: 'Pause', end: 2.5, cue: 'Pause at about 30 degrees with the pelvis level.', w: 1 },
    { id: 'back', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and let the band draw the leg back slowly.', w: 0.15 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep a little tension before the feet meet; repeat, then switch legs.', w: 0.05 },
  ],
  mistakes: [['Leaning over the stance leg', 'Stay tall; the hips do the work, not a side bend.'], ['Turning the toes up', 'Keep the toes forward so the hip does not rotate out.'], ['Letting the band snap back', 'Control the return; slower back than out.'], ['Hitching the hip', 'Keep the pelvis level; make the arc smaller if it tips.']],
  kin: [['Hip abduction', 'About 25-35 degrees against a band (clinical opinion); standing abduction excites the gluteus medius well (Distefano 2009; Boren 2011)', ['distefano2009', 'boren2011']], ['Pelvis and trunk', 'Pelvis level, trunk upright (clinical opinion)', []], ['Band', 'Mini loop around both ankles; tension grows as the feet separate (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Slow and controlled (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use; a snapping band can sting.'], modify: ['Poor balance: hold a wall with one hand.', 'Hip pinching: make the arc smaller.'], regressions: ['Band above the knees.', 'Side-lying hip abduction.'], progressions: ['Heavier band.', 'Longer pause at the top.'] },
  act: { glute_med_r: [0.12, 0.72], glute_max_r: [0.06, 0.4], glute_med_l: [0.28, 0.5], core: [0.12, 0.28], obliques_l: [0.1, 0.3], calves_l: [0.2, 0.26] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [120, 0.6, 80] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Leg sweeps out to the side' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [25, 35], label: 'Hip abduction about 25-35 degrees' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l'] },
});

const ABD0 = 4, ABD1 = 30;
const S = G.standLeg({ leg: (f) => ({ hip: { flex: 18 - 8 * f, abd: ABD0 + (ABD1 - ABD0) * f, rot: 0 }, knee: 40 - 28 * f, ankle: 0 }), lift: null, lean: (f) => 2 * f });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'ankles', id: 'miniband' });
ex.props = ex.props.concat([band]);
const B = G.bandProbe(band); let footMin = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wr = L.fk(poses.rest, S.contacts), Wt = L.fk(poses.top, S.contacts);
const set = H.setKin(ex);
set('Hip abduction', 'setup', `≈${ABD0}° (feet almost together)`); set('Hip abduction', 'peak', `≈${ABD1}° (joint channel); leg ${Math.round(G.legAbd(Wt))}° from vertical`);
set('Pelvis and trunk', 'setup', 'Tall, pelvis level over the stance foot'); set('Pelvis and trunk', 'peak', `≈${Math.round(trunkMax)}° lean (small)`);
set('Band', 'setup', `Around both ankles (legs ${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm between the ankles`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s out, 0.5 s hold, 1.8 s back');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Resistance Band Standing Hip Abduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} leg ${r1(G.legAbd(Wr))}->${r1(G.legAbd(Wt))} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (B.clear < 0) { console.error('FAIL: legs overlap inside the band'); process.exitCode = 1; }
