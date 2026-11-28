// Resistance Band Standing Balance Hip Abduction (GymVisual #18901, movement reference only): a mini band just above both
// knees. Balance on the left leg in a quarter squat (stance knee about 25 degrees, hips back, chest a little forward), hands
// on the hips. The slightly bent right leg, foot just off the floor, presses out to the side against the band to about 30
// degrees of hip abduction, pauses and returns under control while the stance leg holds the squat. Authored on the right.
// Gear: GA.bandLoop around the knees (src/gear/attach.js). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'resistance-band-standing-balance-hip-abduction', name: 'Resistance Band Standing Balance Hip Abduction', url: 'https://gymvisual.com/videos/18901-resistance-band-standing-balance-hip-abduction-male.html',
  aliases: ['Single-leg balance banded abduction', 'Mini band quarter-squat hip abduction'], bodyPart: 'Hips (gluteus medius)', secondary: ['Thighs', 'Core'], equipment: ['Resistance band (mini loop above the knees)'],
  mechanics: 'Isolation (hip abduction) with single-leg balance', plane: 'Frontal', side: 'right', cam: 'front', difficulty: 'Intermediate',
  muscles: { target: ['glute_med_r', 'glute_med_l'], synergist: ['glute_max_r', 'glute_max_l'], stabilizer: ['quads_l', 'core', 'obliques_l', 'calves_l'], lengthened: ['adductors_r'] },
  notes: { glute_med_r: 'Moves the leg out against the band (Distefano 2009).', glute_med_l: 'Works hard holding the pelvis level on the single-leg squat (Boren 2011; Distefano 2009).', glute_max_r: 'Upper fibres assist abduction (Selkowitz 2013).', glute_max_l: 'Holds the hip in the quarter squat (clinical opinion).', quads_l: 'Hold the stance knee bent (clinical opinion).', core: 'Steadies the trunk (clinical opinion).', obliques_l: 'Resist leaning (clinical opinion).', calves_l: 'Balance on the stance foot (clinical opinion).', adductors_r: 'Lengthen as the leg moves out (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg presses out, inhale as it returns.', cadence: 'About 1.2 s out, 0.5 s hold, 1.8 s back' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Stronger band, deeper stance squat, or eyes on a fixed point further away' },
  phases: [
    { id: 'setup', label: 'Balance, quarter squat', end: 0.8, cue: 'Band above the knees; sit into a quarter squat on the left leg, hands on the hips.', w: 0.1 },
    { id: 'out', label: 'Knee out to the side', end: 2.0, breath: 'exhale', cue: 'Breathe out and press the right leg out to the side; the stance knee stays over the toes.', w: 1 },
    { id: 'hold', label: 'Pause', end: 2.5, cue: 'Pause; pelvis level, chest proud.', w: 1 },
    { id: 'back', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and bring the leg back slowly without touching down.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Stay in the squat; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Stance knee caving in', 'Push the stance knee out over the middle toes against the band.'], ['Standing up out of the squat', 'Keep the stance knee bent the whole set.'], ['Leaning over the stance leg', 'Stay square; a smaller arc is fine.'], ['Rushing', 'Pause at the top and come back slower than you went out.']],
  kin: [['Hip abduction', 'About 25-35 degrees (clinical opinion); single-leg stance and abduction both load the gluteus medius (Boren 2011; Distefano 2009)', ['boren2011', 'distefano2009']], ['Stance leg', 'Quarter squat, knee over the toes (clinical opinion)', []], ['Band', 'Mini loop above both knees (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Slow and controlled (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.'], modify: ['Poor balance: one hand on a wall.', 'Knee discomfort: stand taller.'], regressions: ['Resistance band standing hip abduction (upright).', 'Band clamshell.'], progressions: ['Heavier band.', 'Band around the ankles.'] },
  act: { glute_med_r: [0.15, 0.7], glute_med_l: [0.35, 0.62], glute_max_r: [0.08, 0.38], glute_max_l: [0.25, 0.4], quads_l: [0.3, 0.38], core: [0.15, 0.3], obliques_l: [0.12, 0.3], calves_l: [0.22, 0.3] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [120, 0.6, 80] }],
  guides: [{ id: 'kneePath', kind: 'path', joint: 'knee_r', from: 0.8, to: 2.0, label: 'Knee presses out' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [25, 35], label: 'Hip abduction about 25-35 degrees' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l'] },
});

const ABD0 = 3, ABD1 = 30, HINGE = 18;
const S = G.standLeg({ hinge: HINGE, kneeL: 25, leg: (f) => ({ hip: { flex: HINGE + 24 - 6 * f, abd: ABD0 + (ABD1 - ABD0) * f, rot: 0 }, knee: 62 - 14 * f, ankle: -5 }), lift: null, lean: (f) => 2 * f });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'knees', id: 'miniband' });
ex.props = ex.props.concat([band]);
const B = G.bandProbe(band); let footMin = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wr = L.fk(poses.rest, S.contacts), Wt = L.fk(poses.top, S.contacts);
const set = H.setKin(ex);
set('Hip abduction', 'setup', `≈${ABD0}°`); set('Hip abduction', 'peak', `≈${ABD1}° (joint channel); thigh ${Math.round(G.legAbd(Wt))}° out in the frontal view`);
set('Stance leg', 'setup', `Knee ≈${Math.round(H.kneeOf(Wr, 'l'))}°, trunk ≈${Math.round(G.trunkLean(Wr))}° forward`); set('Stance leg', 'peak', 'Held');
set('Band', 'setup', `Above both knees (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Balance 0.8 s'); set('Tempo', 'peak', '1.2 s out, 0.5 s hold, 1.8 s back');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Band Standing Balance Hip Abduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (B.clear < 0) { console.error('FAIL: legs overlap inside the band'); process.exitCode = 1; }
