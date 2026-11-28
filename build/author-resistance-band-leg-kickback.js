// Resistance Band Leg Kickback (GymVisual #14182, movement reference only): standing upright facing a wall, hands lightly
// on it at shoulder height (planted hand contacts), a mini band around both ankles. On the left leg (planted), the straight
// right leg kicks back against the band to about 18 degrees of hip extension while the pelvis tips forward only a little
// and the low back stays neutral; short squeeze, slow return with the foot just off the floor. Authored on the right.
// Gear: GA.bandLoop around the ankles (src/gear/attach.js). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'resistance-band-leg-kickback', name: 'Resistance Band Leg Kickback', url: 'https://gymvisual.com/videos/14182-resistance-band-leg-kickback.html',
  aliases: ['Mini band standing kickback', 'Banded straight-leg kickback'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Hamstrings'], equipment: ['Resistance band (mini loop around the ankles)', 'Wall for balance'],
  mechanics: 'Isolation (hip extension)', plane: 'Sagittal', side: 'right', cam: 'side',
  muscles: { target: ['glute_max_r'], synergist: ['hamstrings_r'], stabilizer: ['glute_med_l', 'core', 'calves_l'], lengthened: ['hip_flexors_r'] },
  notes: { glute_max_r: 'Main hip extensor against the band (Macadam 2019).', hamstrings_r: 'Assist hip extension with the knee straight (clinical opinion).', glute_med_l: 'Keeps the pelvis level (Boren 2011).', core: 'Stops the low back arching (clinical opinion).', calves_l: 'Balance on the stance foot (clinical opinion).', hip_flexors_r: 'Lengthen as the leg goes back (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg kicks back, inhale as it returns.', cadence: 'About 1.2 s back, 0.5 s squeeze, 1.8 s forward' },
  rx: { reps: '12-20 per side', tempo: '1-0.5-2-0', progression: 'Stronger band' },
  phases: [
    { id: 'setup', label: 'Stand at the wall', end: 0.8, cue: 'Band around both ankles; stand tall, hands lightly on the wall, weight on the left leg.', w: 0.05 },
    { id: 'back', label: 'Kick back', end: 2.0, breath: 'exhale', cue: 'Breathe out and push the straight right leg back against the band.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Squeeze the glute; ribs stay down.', w: 1 },
    { id: 'return', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and bring the leg forward slowly, foot just off the floor.', w: 0.15 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep tension in the band; repeat, then switch legs.', w: 0.05 },
  ],
  mistakes: [['Arching the low back', 'The range is small: stop when the hip is open.'], ['Leaning far forward', 'Stay tall; only a slight tip is fine.'], ['Bending the knee to kick higher', 'Keep the knee long so the glute does the work.'], ['Letting the band snap the leg forward', 'Control the return.']],
  kin: [['Hip extension', 'About 15-20 degrees past neutral (clinical opinion); hip extension excites the gluteus maximus (Macadam 2019)', ['macadam2019']], ['Trunk', 'Tall, slight forward tip, no lumbar extension (clinical opinion)', []], ['Band', 'Mini loop around both ankles (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.'], modify: ['Low-back discomfort: smaller range.'], regressions: ['Standing hip extension without a band.'], progressions: ['Heavier band.', 'Cable kickback with an ankle strap.'] },
  act: { glute_max_r: [0.1, 0.68], hamstrings_r: [0.08, 0.42], glute_med_l: [0.25, 0.42], core: [0.12, 0.26], calves_l: [0.2, 0.26] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [120, 0.6, 80] }, { id: 'wall', kind: 'wall', center: [60, 0, 0], size: [10, 240, 300] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Leg kicks back' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-20, -10], label: 'Hip extension 10-20 degrees' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l', 'arm_r', 'arm_l'] },
});

const EXT = -18;
const S = G.standLeg({ hands: 'wall', hinge: (f) => 6 * f, leg: (f) => ({ hip: { flex: 12 + (EXT - 12) * f, abd: 2, rot: 0 }, knee: 50 - 46 * G.ease(Math.max(0, Math.min(1, (f - 0.45) / 0.55))), ankle: 8 }), lift: null });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(S.wallX(poses.rest) + wall.size[0] / 2), 0, 0];
const band = GA.bandLoop({ where: 'ankles', id: 'miniband' });
ex.props = ex.props.concat([band]);
const B = G.bandProbe(band); let footMin = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wr = L.fk(poses.rest, S.contacts), Wt = L.fk(poses.top, S.contacts);
const set = H.setKin(ex);
set('Hip extension', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}° flexion`); set('Hip extension', 'peak', `≈${Math.round(-poses.top.ch.hip_r.flex)}° extension (channel); leg ${Math.round(-G.legFwd(Wt))}° behind vertical`);
set('Trunk', 'setup', 'Tall'); set('Trunk', 'peak', `≈${Math.round(trunkMax)}° forward tip with the pelvis`);
set('Band', 'setup', `Around both ankles (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s back, 0.5 s squeeze, 1.8 s forward');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Band Leg Kickback: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} leg ${r1(G.legFwd(Wr))}->${r1(G.legFwd(Wt))} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot or hands slide'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (B.clear < 0) { console.error('FAIL: legs overlap inside the band'); process.exitCode = 1; }
