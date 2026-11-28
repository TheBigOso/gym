// Cable Hip Adduction (GymVisual #4349, movement reference only): an ankle strap on the right ankle clipped to a low pulley
// on the athlete's right. Standing tall on the left leg (planted contact), hands on the hips, the cable holds the right leg
// out to the side at about 25 degrees of abduction. The nearly straight leg sweeps in across the body, passing just in
// front of the stance foot, to about 12 degrees of adduction, pauses and returns slowly against the cable. Authored on the
// right. Gear: GA.ankleStrap (src/gear/attach.js) on a low pulley (EQ.cableTower). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'cable-hip-adduction', name: 'Cable Hip Adduction', url: 'https://gymvisual.com/videos/4349-cable-hip-adduction.html',
  aliases: ['Standing cable adduction', 'Ankle-strap cable adduction', 'Cable inner thigh sweep'], bodyPart: 'Hips (adductors)', secondary: ['Core'], equipment: ['Cable machine (low pulley)', 'Ankle strap'],
  mechanics: 'Isolation (hip adduction)', plane: 'Frontal', side: 'right', cam: 'front',
  muscles: { target: ['adductors_r'], synergist: ['hip_flexors_r'], stabilizer: ['glute_med_l', 'core', 'obliques_r', 'calves_l'], lengthened: ['glute_med_r'] },
  notes: { adductors_r: 'Adductor longus, brevis, magnus and gracilis pull the leg in across the body (clinical opinion).', hip_flexors_r: 'Assist as the leg passes in front of the stance leg (clinical opinion).', glute_med_l: 'Holds the pelvis level on the stance leg (Boren 2011).', core: 'Keeps the trunk tall (clinical opinion).', obliques_r: 'Resist the cable pulling the trunk toward the tower (clinical opinion).', calves_l: 'Balance (clinical opinion).', glute_med_r: 'Lengthens as the leg crosses the midline (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg sweeps in, inhale as it returns.', cadence: 'About 1.2 s in, 0.5 s hold, 1.8 s out' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Add a plate on the stack once 15 controlled reps are easy' },
  phases: [
    { id: 'setup', label: 'Stand tall, strap on', end: 0.8, cue: 'Strap the right ankle to the low pulley on your right; stand tall on the left leg, hands on the hips, leg drawn out by the cable.', w: 0.12 },
    { id: 'in', label: 'Sweep across', end: 2.0, breath: 'exhale', cue: 'Breathe out and sweep the long right leg in, just in front of the stance foot.', w: 1 },
    { id: 'hold', label: 'Pause', end: 2.5, cue: 'Pause with the toes forward and the pelvis level.', w: 1 },
    { id: 'out', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and let the cable take the leg back out slowly.', w: 0.18 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Stop at about 25 degrees out; repeat, then switch legs.', w: 0.12 },
  ],
  mistakes: [['Leaning toward the tower', 'Stay tall; the hip moves, not the trunk.'], ['Swinging the leg through', 'Slow in, pause, slower out.'], ['Kicking the stance foot', 'Let the leg pass a little in front of the stance foot.'], ['Turning the toes out', 'Keep the toes forward.']],
  kin: [['Hip adduction', 'From about 25 degrees of abduction to 10-15 degrees past the midline (clinical opinion)', []], ['Pelvis and trunk', 'Pelvis level, trunk tall (clinical opinion)', ['boren2011']], ['Cable line', 'Low pulley at ankle height on the working side (standard setup)', []], ['Tempo', 'Controlled, slower out (clinical opinion)', []]],
  safety: { cautions: ['Check the strap is snug and the clip is closed before each set.', 'Groin strain history: start light and keep the range small.'], modify: ['Poor balance: hold the machine with the free hand.'], regressions: ['Side-lying hip adduction.'], progressions: ['Heavier stack.', 'Longer pause.'] },
  act: { adductors_r: [0.15, 0.72], hip_flexors_r: [0.06, 0.25], glute_med_l: [0.25, 0.42], core: [0.12, 0.28], obliques_r: [0.1, 0.25], calves_l: [0.2, 0.26] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [120, 0.6, 90] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Leg sweeps across' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [-15, -10], label: 'Adduction 10-15 degrees past the midline' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l'] },
});

const ABD0 = 25, ABD1 = -11;
const S = G.standLeg({ leg: (f) => ({ hip: { flex: 10 + 20 * f, abd: ABD0 + (ABD1 - ABD0) * f, rot: 0 }, knee: 22 - 12 * f, ankle: 6 }), lift: null, lean: (f) => 3 - 4 * f });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
const W0 = L.fk(poses.rest, S.contacts);
const PULLEY = [r1(W0.ankle_r.p[0] + 4), 12, r1(W0.ankle_r.p[2] + 62)];
const strap = GA.ankleStrap(PULLEY, { side: 'r', ring: [0, 0, 1], id: 'strap', schemaAttachment: 'ankle_strap' });
ex.props = ex.props.concat([EQ.cableTower(PULLEY, { offset: [0, 12], id: 'tower' }), strap]);
const C = G.strapProbe(strap); let footMin = 1e9, trunkMax = 0, legGap = 1e9;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { C.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W));
  legGap = Math.min(legGap, EQ.segmentClear(W, W.knee_r.p, W.ankle_r.p, 5, { skip: /^(?!.*_l$).*/, n: 12 }).d); } });
const Wt = L.fk(poses.top, S.contacts);
const set = H.setKin(ex);
set('Hip adduction', 'setup', `≈${ABD0}° abduction`); set('Hip adduction', 'peak', `≈${-ABD1}° adduction (channel); leg ${Math.round(-G.legAbd(Wt))}° past vertical, ${Math.round(Wt.ankle_r.p[0] - Wt.ankle_l.p[0])} cm in front of the stance ankle`);
set('Pelvis and trunk', 'setup', 'Tall, pelvis level'); set('Pelvis and trunk', 'peak', `≤${Math.round(trunkMax)}° lean`);
set('Cable line', 'setup', `Pulley on the right at ankle height; cable ${Math.round(C.cable[0])} cm`); set('Cable line', 'peak', `Cable ${Math.round(C.cable[1])} cm; clears the body by ${C.line.d.toFixed(1)} cm or more`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s in, 0.5 s hold, 1.8 s out');
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 2) };
console.log(`Cable Hip Adduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} line ${JSON.stringify(C.line)} cable ${G.fmt(C.cable)} shin-to-stance-leg ${legGap.toFixed(1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (C.line.d < 0.5) { console.error('FAIL: cable passes through the body'); process.exitCode = 1; }
if (legGap < 0.3) { console.error('FAIL: moving shin hits the stance leg'); process.exitCode = 1; }
