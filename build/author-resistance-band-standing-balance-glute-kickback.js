// Resistance Band Standing Balance Glute Kickback (GymVisual #18906 version 2, movement reference only): a mini band just
// above both knees. Balance on the left leg in a quarter squat with the hips back and the chest forward (about 25 degrees),
// hands on the hips. The right leg, knee bent and foot just off the floor under the hip, drives back against the band:
// the hip extends until the thigh is about 15 degrees behind vertical while the knee opens a little, pause with the glute
// squeezed, and return slowly. The low back stays neutral. Authored on the right.
// Gear: GA.bandLoop around the knees (src/gear/attach.js). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'resistance-band-standing-balance-glute-kickback', name: 'Resistance Band Standing Balance Glute Kickback', url: 'https://gymvisual.com/videos/18906-resistance-band-standing-balance-glute-kickback-version-2-male.html',
  refTitle: 'Resistance Band Standing Balance Glute Kickback (version 2)',
  aliases: ['Mini band single-leg balance kickback', 'Banded standing glute kickback'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Thighs', 'Core'], equipment: ['Resistance band (mini loop above the knees)'],
  mechanics: 'Isolation (hip extension) with single-leg balance', plane: 'Sagittal', side: 'right', cam: 'side', difficulty: 'Intermediate',
  muscles: { target: ['glute_max_r'], synergist: ['hamstrings_r'], stabilizer: ['glute_med_l', 'glute_max_l', 'quads_l', 'core', 'spinal_extensors_r', 'spinal_extensors_l'], lengthened: ['hip_flexors_r'] },
  notes: { glute_max_r: 'Drives hip extension against the band (Macadam 2019; Neto 2020).', hamstrings_r: 'Assist hip extension (clinical opinion).', glute_med_l: 'Keeps the pelvis level on the stance leg (Boren 2011).', glute_max_l: 'Holds the stance hip in the quarter squat (clinical opinion).', quads_l: 'Hold the stance knee bent (clinical opinion).', core: 'Stops the low back arching (clinical opinion).', spinal_extensors_r: 'Hold the hinged trunk (clinical opinion).', spinal_extensors_l: 'Hold the hinged trunk (clinical opinion).', hip_flexors_r: 'Lengthen at the back of the kick (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg drives back, inhale as it returns.', cadence: 'About 1.2 s back, 0.5 s squeeze, 1.8 s forward' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Stronger band or a longer squeeze' },
  phases: [
    { id: 'setup', label: 'Balance, quarter squat', end: 0.8, cue: 'Band above the knees; hinge into a quarter squat on the left leg, hands on the hips.', w: 0.1 },
    { id: 'back', label: 'Drive the leg back', end: 2.0, breath: 'exhale', cue: 'Breathe out and drive the right knee back against the band.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Squeeze the glute; ribs down, no low-back arch.', w: 1 },
    { id: 'return', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and bring the knee back under the hip slowly.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Stay balanced in the squat; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Arching the low back to kick higher', 'Stop when the hip is fully open; the range is small.'], ['Standing up out of the squat', 'Keep the stance knee bent.'], ['Swinging', 'Pause at the back and return slower.'], ['Twisting the pelvis open', 'Keep both hip bones facing the floor.']],
  kin: [['Hip extension', 'Hip to about 10-20 degrees of extension past neutral; with the trunk hinged the thigh ends well behind vertical (clinical opinion); hip extension exercises excite the gluteus maximus (Macadam 2019; Neto 2020)', ['macadam2019', 'neto2020']], ['Stance leg', 'Quarter squat, trunk hinged about 25 degrees (clinical opinion)', ['boren2011']], ['Band', 'Mini loop above the knees (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Controlled, squeeze at the back (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.'], modify: ['Poor balance: one hand on a wall.', 'Low-back discomfort: smaller range.'], regressions: ['Standing hip extension without a band.', 'Donkey kick.'], progressions: ['Heavier band.', 'Cable donkey kickback.'] },
  act: { glute_max_r: [0.1, 0.72], hamstrings_r: [0.08, 0.4], glute_med_l: [0.3, 0.5], glute_max_l: [0.25, 0.38], quads_l: [0.3, 0.38], core: [0.15, 0.3], spinal_extensors_r: [0.2, 0.3], spinal_extensors_l: [0.2, 0.3] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [120, 0.6, 80] }],
  guides: [{ id: 'kneePath', kind: 'path', joint: 'knee_r', from: 0.8, to: 2.0, label: 'Knee drives back' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-20, 0], label: 'Hip extends past neutral' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l'] },
});

const HINGE = 25, EXT = -18;
const S = G.standLeg({ hinge: HINGE, kneeL: 25, leg: (f) => ({ hip: { flex: HINGE + 12 + (EXT - HINGE - 12) * f, abd: 2, rot: 0 }, knee: 75 - 25 * f, ankle: -10 - 10 * f }), lift: null });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'knees', id: 'miniband' });
ex.props = ex.props.concat([band]);
const B = G.bandProbe(band); let footMin = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wr = L.fk(poses.rest, S.contacts), Wt = L.fk(poses.top, S.contacts);
const set = H.setKin(ex);
set('Hip extension', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}° flexion (knee under the hip)`); set('Hip extension', 'peak', `Hip ≈${Math.round(-poses.top.ch.hip_r.flex)}° extension (channel); thigh ${Math.round(-G.thighFwd(Wt))}° behind vertical`);
set('Stance leg', 'setup', `Knee ≈${Math.round(H.kneeOf(Wr, 'l'))}°, trunk ≈${Math.round(G.trunkLean(Wr))}° forward`); set('Stance leg', 'peak', 'Held');
set('Band', 'setup', `Above both knees (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Balance 0.8 s'); set('Tempo', 'peak', '1.2 s back, 0.5 s squeeze, 1.8 s forward');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Band Standing Balance Glute Kickback: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} thigh ${r1(G.thighFwd(Wr))}->${r1(G.thighFwd(Wt))} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (B.clear < 0) { console.error('FAIL: legs overlap inside the band'); process.exitCode = 1; }
