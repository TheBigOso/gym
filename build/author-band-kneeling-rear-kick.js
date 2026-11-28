// Band Kneeling Rear Kick (GymVisual #2381, movement reference only): on all fours on a mat with a mini band looped just
// above both knees. The right knee lifts off the mat and the leg kicks straight back against the band until it is level with
// the hips and almost straight (hip about 10 degrees past neutral relative to the pelvis, which stays still), then the knee
// bends and returns under the hip to hover just above the mat. Back flat, hips square. Authored on the right.
// Built on the all-fours base (build/families/prone.js). Gear: GA.bandLoop around the knees (src/gear/attach.js).
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'band-kneeling-rear-kick', name: 'Band Kneeling Rear Kick', url: 'https://gymvisual.com/animated-gifs/2381-band-kneeling-rear-kick.html',
  aliases: ['Mini band quadruped kickback', 'Banded straight-leg rear kick'], bodyPart: 'Hips (gluteus maximus)', secondary: ['Hamstrings', 'Core'], equipment: ['Resistance band (mini loop above the knees)', 'Mat'],
  mechanics: 'Isolation (hip extension)', plane: 'Sagittal', side: 'right', cam: 'side',
  muscles: { target: ['glute_max_r'], synergist: ['hamstrings_r'], stabilizer: ['core', 'obliques_r', 'obliques_l', 'glute_med_l', 'spinal_extensors_r', 'spinal_extensors_l', 'serratus_r', 'serratus_l'], lengthened: ['hip_flexors_r'] },
  notes: { glute_max_r: 'Extends the hip against the band (Macadam 2019; Neto 2020).', hamstrings_r: 'Assist hip extension with the knee straight (clinical opinion).', core: 'Holds the spine neutral (clinical opinion).', obliques_r: 'Stop the pelvis rotating (clinical opinion).', obliques_l: 'Stop the pelvis rotating (clinical opinion).', glute_med_l: 'Steadies the support hip and resists the band (clinical opinion).', spinal_extensors_r: 'Hold the back flat (clinical opinion).', spinal_extensors_l: 'Hold the back flat (clinical opinion).', serratus_r: 'Hold the shoulder blades on the ribs (clinical opinion).', serratus_l: 'Hold the shoulder blades on the ribs (clinical opinion).', hip_flexors_r: 'Lengthen at the back of the kick (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg kicks back, inhale as it returns.', cadence: 'About 1.2 s back, 0.5 s hold, 1.8 s in' },
  rx: { reps: '12-20 per side', tempo: '1-0.5-2-0', progression: 'Stronger band' },
  phases: [
    { id: 'setup', label: 'All fours, band on', end: 0.8, cue: 'Band above the knees; hands under the shoulders, knees under the hips, back flat.', w: 0.1 },
    { id: 'kick', label: 'Kick back', end: 2.0, breath: 'exhale', cue: 'Breathe out and kick the right leg straight back to hip height against the band.', w: 1 },
    { id: 'hold', label: 'Hold', end: 2.5, cue: 'Leg long and level; hips square, no arch.', w: 1 },
    { id: 'return', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in, bend the knee and bring it back under the hip slowly.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Hover the knee above the mat; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Kicking above hip height', 'Stop when the leg is level; higher only arches the low back.'], ['Opening the hip to the side', 'Toes point down, hips square.'], ['Sagging through the shoulders', 'Push the floor away.'], ['Swinging', 'Pause at the back, return slower.']],
  kin: [['Hip extension', 'Leg level with the hips, about 0-15 degrees past neutral (clinical opinion); quadruped hip extension excites the gluteus maximus (Macadam 2019; Neto 2020)', ['macadam2019', 'neto2020']], ['Knee', 'Straight at the back, bent under the hip (clinical opinion)', []], ['Band', 'Mini loop above both knees (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.', 'Wrist discomfort: use fists or forearms.'], modify: ['Knee discomfort: fold the mat under the support knee.'], regressions: ['Rear kick without a band.'], progressions: ['Heavier band.', 'Cable donkey kickback.'] },
  act: { glute_max_r: [0.1, 0.7], hamstrings_r: [0.08, 0.45], core: [0.15, 0.32], obliques_r: [0.1, 0.25], obliques_l: [0.1, 0.25], glute_med_l: [0.15, 0.3], spinal_extensors_r: [0.15, 0.3], spinal_extensors_l: [0.15, 0.3], serratus_r: [0.15, 0.22], serratus_l: [0.15, 0.22] },
  props: [{ id: 'mat', kind: 'mat', center: [-5, 0, 0], size: [190, 0.6, 62] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Leg kicks straight back' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-15, 0], label: 'Leg level with the hips' }],
  checks: { stillJoints: ['pelvis'], plantedContacts: ['arm_r', 'arm_l', 'leg_l'] },
});

const A = P.allFours(), { fours, contacts, Wf } = A;
const h0 = fours.ch.hip_r, k0 = fours.ch.knee_r.flex, a0 = fours.ch.ankle_r.dorsi;
const HIP_TOP = -14, HOVER = 0.14;
// f: 0 = knee hovering, 1 = leg straight back. The hip leads; the knee opens in the second half so the foot clears the mat.
function kick(f) {
  const e = HOVER + (1 - HOVER) * f, q = clone(fours), kf = G.ease(Math.max(0, Math.min(1, (e - 0.3) / 0.7)));
  q.ch.hip_r = { flex: r1(h0.flex + (HIP_TOP - h0.flex) * e), abd: r1(h0.abd * (1 - e)), rot: r1(h0.rot * (1 - e)) };
  q.ch.knee_r = { flex: r1(k0 + (4 - k0) * kf + 10 * Math.sin(Math.PI * e) * (1 - kf)) };
  q.ch.ankle_r = { dorsi: r1(a0 + (-30 - a0) * Math.min(1, e / 0.5)) };
  q.ik.leg_r.weight = 0;
  return q;
}
const { poses, keyframes } = G.rep(kick);
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'knees', id: 'miniband' });
ex.props = ex.props.concat([band]);
const sw = P.sweep(ex, [{ joint: 'knee_l', p: Wf.knee_l.p }]);
const B = G.bandProbe(band); let footMin = 1e9;
H.loopReport(ex, { probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'shank_r'), H.bottomOf(W, 'thigh_r')); } });
const Wr = L.fk(poses.rest, contacts), Wt = L.fk(poses.top, contacts);
const legAng = (W) => Math.atan2(W.ankle_r.p[1] - W.hip_r.p[1], W.hip_r.p[0] - W.ankle_r.p[0]) / R.DEG;
const set = H.setKin(ex);
set('Hip extension', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}° flexion (knee hovering)`); set('Hip extension', 'peak', `Hip ≈${Math.round(poses.top.ch.hip_r.flex)}°; leg ${Math.round(legAng(Wt))}° from level`);
set('Knee', 'setup', `≈${Math.round(P.kneeAngle(Wr, 'r'))}°`); set('Knee', 'peak', `≈${Math.round(P.kneeAngle(Wt, 'r'))}°`);
set('Band', 'setup', `Above both knees (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', '0.8 s on all fours'); set('Tempo', 'peak', '1.2 s back, 0.5 s hold, 1.8 s in');
ex.checks.measure = { name: 'hipFlexion', min: 60, max: 95 };
console.log(`Band Kneeling Rear Kick: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} liftedMin ${footMin.toFixed(2)} leg ${r1(legAng(Wt))} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: lifted leg touches the mat'); process.exitCode = 1; }
