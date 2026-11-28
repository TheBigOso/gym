// Cable Standing Hip Flexion (GymVisual #19019, movement reference only): an ankle strap on the right ankle clipped to a
// low pulley behind the athlete. Standing tall on the left leg (planted contact) facing away from the tower, hands on the
// hips, the right leg starts a little behind the body; it swings forward and up, knee almost straight, to about 50 degrees
// of hip flexion, pauses and returns slowly against the cable. The trunk stays tall (no leaning back). Authored on the right.
// Gear: GA.ankleStrap (src/gear/attach.js) on a low pulley (EQ.cableTower). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'cable-standing-hip-flexion', name: 'Cable Standing Hip Flexion', url: 'https://gymvisual.com/videos/19019-cable-standing-hip-flexion-male.html',
  aliases: ['Cable straight-leg raise', 'Standing cable leg raise forward', 'Ankle-strap hip flexion'], bodyPart: 'Hips (hip flexors)', secondary: ['Thighs', 'Core'], equipment: ['Cable machine (low pulley)', 'Ankle strap'],
  mechanics: 'Isolation (hip flexion)', plane: 'Sagittal', side: 'right', cam: 'side',
  muscles: { target: ['hip_flexors_r'], synergist: ['quads_r'], stabilizer: ['glute_med_l', 'glute_max_l', 'core', 'calves_l'], lengthened: ['hamstrings_r', 'glute_max_r'] },
  notes: { hip_flexors_r: 'Iliopsoas and rectus femoris lift the leg against the cable (clinical opinion).', quads_r: 'Rectus femoris crosses the hip and keeps the knee long (clinical opinion).', glute_med_l: 'Holds the pelvis level on the stance leg (Boren 2011).', glute_max_l: 'Keeps the stance hip tall (clinical opinion).', core: 'Stops the trunk leaning back as the leg rises (Escamilla 2006).', calves_l: 'Balance (clinical opinion).', hamstrings_r: 'Lengthen at the top (clinical opinion).', glute_max_r: 'Lengthens at the top (clinical opinion).' },
  breathing: { pattern: 'Exhale as the leg rises, inhale as it returns.', cadence: 'About 1.2 s up, 0.5 s hold, 1.8 s down' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Add a plate on the stack once 15 controlled reps are easy' },
  phases: [
    { id: 'setup', label: 'Stand tall, strap on', end: 0.8, cue: 'Strap the right ankle to the low pulley behind you; stand tall on the left leg, hands on the hips.', w: 0.1 },
    { id: 'up', label: 'Leg forward and up', end: 2.0, breath: 'exhale', cue: 'Breathe out and swing the long right leg forward and up, toes pointing ahead.', w: 1 },
    { id: 'hold', label: 'Pause', end: 2.5, cue: 'Pause with the trunk tall; do not lean back.', w: 1 },
    { id: 'down', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and let the cable draw the leg back slowly.', w: 0.15 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Stop with the foot just behind the body; repeat, then switch legs.', w: 0.1 },
  ],
  mistakes: [['Leaning back to lift higher', 'Stay tall; stop where the pelvis starts to tuck.'], ['Bending the knee a lot', 'Keep the knee long so the hip flexors do the work.'], ['Letting the stack pull the leg back fast', 'Control the return.'], ['Standing too close to the tower', 'Step out until the cable has tension with the leg under the hip.']],
  kin: [['Hip flexion', 'About 45-60 degrees with the knee near straight (clinical opinion)', []], ['Trunk', 'Tall, no backward lean (Escamilla 2006, trunk stability under limb load)', ['escamilla2006']], ['Cable line', 'Low pulley behind the strapped ankle (standard setup)', []], ['Tempo', 'Controlled, slower down (clinical opinion)', []]],
  safety: { cautions: ['Check the strap is snug and the clip is closed before each set.'], modify: ['Poor balance: one hand on the machine.', 'Hip pinching at the top: lower range.'], regressions: ['Standing knee raise without load.'], progressions: ['Heavier stack.', 'Longer pause at the top.'] },
  act: { hip_flexors_r: [0.1, 0.72], quads_r: [0.08, 0.4], glute_med_l: [0.25, 0.42], glute_max_l: [0.15, 0.25], core: [0.12, 0.3], calves_l: [0.2, 0.26] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [120, 0.6, 80] }],
  guides: [{ id: 'footPath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Leg swings forward and up' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [45, 60], label: 'Hip flexion about 45-60 degrees' }],
  checks: { stillJoints: ['ankle_l', 'toe_l'], plantedContacts: ['leg_l'] },
});

const FLEX0 = -6, FLEX1 = 52;
const S = G.standLeg({ leg: (f) => ({ hip: { flex: FLEX0 + (FLEX1 - FLEX0) * f, abd: 2, rot: 0 }, knee: 42 - 36 * G.ease(Math.min(1, f / 0.55)), ankle: 10 }), lift: null });
const { poses, keyframes } = G.rep(S.poseAt);
const ex = H.module_(meta, S.contacts, poses, keyframes);
// low pulley behind the right foot, in line with it
const W0 = L.fk(poses.rest, S.contacts);
const PULLEY = [r1(W0.ankle_r.p[0] - 70), 12, r1(W0.ankle_r.p[2] + 4)];
const strap = GA.ankleStrap(PULLEY, { side: 'r', ring: [-1, 0, 0], id: 'strap', schemaAttachment: 'ankle_strap' });
ex.props = ex.props.concat([EQ.cableTower(PULLEY, { offset: [-12, 0], id: 'tower' }), strap]);
const C = G.strapProbe(strap); let footMin = 1e9, trunkMax = 0;
const rep = H.loopReport(ex, { planted: S.planted, probe: (W) => { C.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); trunkMax = Math.max(trunkMax, G.trunkLean(W)); } });
const Wt = L.fk(poses.top, S.contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${FLEX0}° (leg just behind the body)`); set('Hip flexion', 'peak', `≈${FLEX1}° (channel); leg ${Math.round(G.legFwd(Wt))}° forward of vertical, knee ≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Trunk', 'setup', 'Tall'); set('Trunk', 'peak', `≤${Math.round(trunkMax)}° from vertical`);
set('Cable line', 'setup', `Pulley behind at ankle height; cable ${Math.round(C.cable[0])} cm`); set('Cable line', 'peak', `Cable ${Math.round(C.cable[1])} cm; clears the body by ${C.line.d.toFixed(1)} cm or more`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s hold, 1.8 s down');
ex.checks.measure = { name: 'hipFlexion', min: FLEX1 - 5, max: FLEX1 + 5 };
console.log(`Cable Standing Hip Flexion: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} trunk ${trunkMax.toFixed(1)} line ${JSON.stringify(C.line)} cable ${G.fmt(C.cable)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (C.line.d < 0.5) { console.error('FAIL: cable passes through the body'); process.exitCode = 1; }
