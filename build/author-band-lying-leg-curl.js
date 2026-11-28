// Band Lying Leg Curl (GymVisual #22589, movement reference only): lying face down on a mat, arms resting overhead, a mini
// band looped around both ankles. The left leg stays long on the mat and anchors the band; the right heel curls toward the
// glutes against it to about 110 degrees of knee flexion with the foot flexed, pause, and lowers slowly. Hips stay pressed
// into the mat. Authored on the right.
// Gear: GA.bandLoop around the ankles (src/gear/attach.js). Prone base: build/families/gear-g3attach.js (proneLie).
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'band-lying-leg-curl', name: 'Band Lying Leg Curl', url: 'https://gymvisual.com/videos/22589-band-lying-leg-curl.html',
  aliases: ['Prone mini band hamstring curl', 'Banded lying leg curl'], bodyPart: 'Thighs (hamstrings)', secondary: ['Calves'], equipment: ['Resistance band (mini loop around the ankles)', 'Mat'],
  mechanics: 'Isolation (knee flexion)', plane: 'Sagittal', side: 'right', cam: 'side',
  muscles: { target: ['hamstrings_r'], synergist: ['calves_r'], stabilizer: ['glute_max_r', 'core'], lengthened: ['quads_r'] },
  notes: { hamstrings_r: 'Flex the knee against the band (clinical opinion).', calves_r: 'Gastrocnemius assists knee flexion (clinical opinion).', glute_max_r: 'Keeps the hip pressed into the mat (clinical opinion).', core: 'Stops the low back arching (clinical opinion).', quads_r: 'Lengthen as the heel nears the glutes (clinical opinion).' },
  breathing: { pattern: 'Exhale as the heel curls in, inhale as it lowers.', cadence: 'About 1.2 s in, 0.5 s hold, 1.8 s down' },
  rx: { reps: '12-20 per side', tempo: '1-0.5-2-0', progression: 'Stronger band, or a longer squeeze' },
  phases: [
    { id: 'setup', label: 'Lie face down, band on', end: 0.8, cue: 'Lie face down, band around both ankles, arms resting overhead, legs long.', w: 0.1 },
    { id: 'curl', label: 'Curl the heel in', end: 2.0, breath: 'exhale', cue: 'Breathe out and curl the right heel toward the glutes, foot flexed.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Squeeze the hamstrings; hips stay on the mat.', w: 1 },
    { id: 'lower', label: 'Lower with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and lower the leg slowly against the band.', w: 0.15 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Stop just before the foot touches; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Lifting the hips', 'Press the hip bones into the mat.'], ['Arching the low back', 'Brace the abs; only the knee moves.'], ['Pointing the toes', 'Keep the foot flexed so the hamstrings lead.'], ['Dropping the leg', 'Lower over about 2 s.']],
  kin: [['Knee flexion', 'From near straight to about 100-120 degrees (clinical opinion)', []], ['Hips', 'Pelvis and thighs stay on the mat (clinical opinion)', []], ['Band', 'Mini loop around both ankles; the resting leg anchors it (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Controlled, slower down (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.', 'Hamstring cramp: stop, stretch, use a lighter band.'], modify: ['Low-back discomfort: a folded towel under the hips.'], regressions: ['Leg curl without a band.'], progressions: ['Heavier band.', 'Dumbbell lying femoral.'] },
  act: { hamstrings_r: [0.1, 0.72], calves_r: [0.08, 0.35], glute_max_r: [0.1, 0.22], core: [0.08, 0.15] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [190, 0.6, 70] }],
  guides: [{ id: 'heelPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Heel curls toward the glutes' }, { id: 'kneeAngle', kind: 'jointAngle', joint: 'knee_r', normBand: [100, 120], label: 'Knee flexion about 100-120 degrees' }],
  checks: { stillJoints: ['pelvis', 'ankle_l'] },
});

const KTOP = 112;
const base = G.armsOverhead(G.proneLie());
const K0 = base.ch.knee_r.flex, A0 = base.ch.ankle_r.dorsi;
const LIFT = 0.12; // f = 0 is the foot just off the mat
function poseAt(f) {
  const p = clone(base), e = LIFT + (1 - LIFT) * f;
  p.ch.knee_r = { flex: r1(K0 + (KTOP - K0) * e) }; p.ch.ankle_r = { dorsi: r1(A0 + (5 - A0) * Math.min(1, e / 0.6)) };
  return p;
}
const { poses, keyframes } = G.rep(poseAt);
const ex = H.module_(meta, [], poses, keyframes);
// band centred along the shins; the mat is under the body
const mat = ex.props[0], W0 = L.fk(poses.rest); mat.center = [r1((W0.head_c1.p[0] + W0.ankle_r.p[0]) / 2 + 10), 0, 0];
const band = GA.bandLoop({ where: 'ankles', id: 'miniband' });
ex.props = ex.props.concat([band]);
const B = G.bandProbe(band); let footMin = 1e9, hipLift = 0;
const rep = H.loopReport(ex, { probe: (W) => { B.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); } });
const Wr = L.fk(poses.rest), Wt = L.fk(poses.top);
const set = H.setKin(ex);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wr, 'r'))}° (foot just off the mat)`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Hips', 'setup', 'Pelvis and thighs on the mat'); set('Hips', 'peak', 'Unchanged (only the knee moves)');
set('Band', 'setup', `Around both ankles (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Lie 0.8 s'); set('Tempo', 'peak', '1.2 s in, 0.5 s hold, 1.8 s down');
ex.checks.measure = { name: 'kneeFlexion', min: KTOP - 6, max: KTOP + 6 };
console.log(`Band Lying Leg Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (rep.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
if (footMin < 0.3) { console.error('FAIL: curling foot scuffs the mat'); process.exitCode = 1; }
