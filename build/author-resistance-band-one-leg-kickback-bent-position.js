// Resistance Band One Leg Kickback, Bent Position (GymVisual #9141, movement reference only): a mini band around both
// ankles; standing on the left leg with the knee soft, the trunk hinged forward about 45 degrees from the hips (flat back),
// hands on the hips. The right leg hangs under the hip with the knee a little bent, then kicks back and up against the band
// until it is roughly in line with the trunk (hip about 15 degrees past neutral, knee almost straight); short squeeze, slow
// return. Authored on the right.
// Gear: GA.bandLoop around the ankles (src/gear/attach.js). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'resistance-band-one-leg-kickback-bent-position', name: 'Resistance Band One Leg Kickback (Bent Position)', url: 'https://gymvisual.com/videos/9141-resistance-band-one-leg-kickback-bent-position-male.html',
  aliases: ['Bent-over band kickback', 'Hinged mini band glute kickback'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Hamstrings', 'Lower back'], equipment: ['Resistance band (mini loop around the ankles)'],
  mechanics: 'Isolation (hip extension)', plane: 'Sagittal', side: 'right', cam: 'side', difficulty: 'Intermediate',
  muscles: { target: ['glute_max_r'], synergist: ['hamstrings_r'], stabilizer: ['hamstrings_l', 'glute_med_l', 'spinal_extensors_r', 'spinal_extensors_l', 'core'], lengthened: ['hip_flexors_r'] },
  notes: { glute_max_r: 'Extends the hip against the band; the hinged trunk lets the hip work through more range (Macadam 2019).', hamstrings_r: 'Assist hip extension (clinical opinion).', hamstrings_l: 'Hold the hinge on the stance leg (clinical opinion).', glute_med_l: 'Keeps the pelvis level (Boren 2011).', spinal_extensors_r: 'Hold the flat back (clinical opinion).', spinal_extensors_l: 'Hold the flat back (clinical opinion).', core: 'Stops the low back arching (clinical opinion).', hip_flexors_r: 'Lengthen at the top (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg kicks back, inhale as it returns.', cadence: 'About 1.2 s back, 0.5 s squeeze, 1.8 s down' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Stronger band, or a pause at the top' },
  phases: [
    { id: 'setup', label: 'Hinge on one leg', end: 0.8, cue: 'Band around the ankles; hinge forward with a flat back on a soft left knee, hands on the hips.', w: 0.1 },
    { id: 'back', label: 'Kick back and up', end: 2.0, breath: 'exhale', cue: 'Breathe out and drive the right heel back and up until the leg lines up with the trunk.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Squeeze the glute; keep the hips square to the floor.', w: 1 },
    { id: 'return', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and lower the leg slowly under the hip.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep the hinge and the band tension; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Rounding the back', 'Keep the chest long and the back flat in the hinge.'], ['Kicking above the trunk line', 'Stop when the leg lines up with the trunk; higher only arches the low back.'], ['Opening the hip to the side', 'Keep both hip bones facing the floor.'], ['Bouncing', 'Pause at the top, slow down.']],
  kin: [['Hip extension', 'From about 50 degrees of flexion to 10-20 degrees past neutral (clinical opinion); hip extension excites the gluteus maximus (Macadam 2019; Neto 2020)', ['macadam2019', 'neto2020']], ['Trunk hinge', 'About 40-50 degrees forward, flat back (clinical opinion)', []], ['Band', 'Mini loop around both ankles (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.'], modify: ['Poor balance: hold a support in front.', 'Low-back discomfort: hinge less and shorten the range.'], regressions: ['Resistance band leg kickback (upright, hands on a wall).'], progressions: ['Heavier band.', 'Cable donkey kickback.'] },
  act: { glute_max_r: [0.12, 0.75], hamstrings_r: [0.1, 0.45], hamstrings_l: [0.3, 0.38], glute_med_l: [0.28, 0.45], spinal_extensors_r: [0.25, 0.38], spinal_extensors_l: [0.25, 0.38], core: [0.15, 0.3] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [140, 0.6, 80] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Heel drives back and up' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-20, -10], label: 'Hip 10-20 degrees past neutral' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l'] },
});

const HINGE = 45, EXT = -18;
const S = G.standLeg({ hinge: HINGE, kneeL: 15, x: -8, leg: (f) => ({ hip: { flex: HINGE + 14 + (EXT - HINGE - 14) * f, abd: 2, rot: 0 }, knee: 58 - 52 * f, ankle: -5 - 20 * f }), lift: null });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'ankles', id: 'miniband' });
ex.props = ex.props.concat([band]);
const B = G.bandProbe(band); let footMin = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wr = L.fk(poses.rest, S.contacts), Wt = L.fk(poses.top, S.contacts);
const legLine = (W) => Math.round(180 - L.V.angle(L.V.sub(W.neck_c7.p, W.hip_r.p), L.V.sub(W.ankle_r.p, W.hip_r.p)));
const set = H.setKin(ex);
set('Hip extension', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}° flexion (leg under the hip)`); set('Hip extension', 'peak', `≈${Math.round(-poses.top.ch.hip_r.flex)}° past neutral (channel); leg ${legLine(Wt)}° off the trunk line`);
set('Trunk hinge', 'setup', `≈${Math.round(G.trunkLean(Wr))}° forward, stance knee ≈${Math.round(H.kneeOf(Wr, 'l'))}°`); set('Trunk hinge', 'peak', 'Held');
set('Band', 'setup', `Around both ankles (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Hinge 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s squeeze, 1.8 s down');
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(HINGE - 10), max: Math.ceil(trunkMax + 2) };
console.log(`Band One Leg Kickback Bent: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} line ${legLine(Wt)} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (B.clear < 0) { console.error('FAIL: legs overlap inside the band'); process.exitCode = 1; }
