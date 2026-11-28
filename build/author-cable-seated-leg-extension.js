// Cable Seated Leg Extension (GymVisual #14653, movement reference only): seated tall on the end of a flat bench, hands on
// the bench behind the hips (planted), left foot flat on the floor (planted). An ankle strap on the right ankle runs back to
// a low pulley under the bench. The right knee extends from about 90 degrees to nearly straight (thigh stays on the bench),
// pause with the quads squeezed, and lowers slowly against the cable. Authored on the right.
// Gear: GA.ankleStrap (src/gear/attach.js) on a low pulley (EQ.cableTower). Seat: build/families/gear-g3attach.js.
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'cable-seated-leg-extension', name: 'Cable Seated Leg Extension', url: 'https://gymvisual.com/videos/14653-cable-seated-leg-extension.html',
  aliases: ['Ankle-strap cable knee extension', 'Seated cable leg extension'], bodyPart: 'Thighs (quadriceps)', equipment: ['Cable machine (low pulley)', 'Ankle strap', 'Flat bench'],
  mechanics: 'Isolation (knee extension)', plane: 'Sagittal', side: 'right', cam: 'side',
  muscles: { target: ['quads_r'], synergist: ['hip_flexors_r'], stabilizer: ['core'], lengthened: ['hamstrings_r'] },
  notes: { quads_r: 'Open-chain knee extension isolates the quadriceps; activity peaks near full extension (Escamilla 1998).', hip_flexors_r: 'Rectus femoris also crosses the hip (clinical opinion).', core: 'Keeps the trunk still on the bench (clinical opinion).', hamstrings_r: 'Lengthen as the knee straightens (clinical opinion).' },
  breathing: { pattern: 'Exhale as the knee straightens, inhale as it bends.', cadence: 'About 1.2 s up, 0.5 s hold, 1.8 s down' },
  rx: { reps: '10-15 per side', tempo: '1-0.5-2-0', progression: 'Add a plate on the stack once 15 controlled reps are easy' },
  phases: [
    { id: 'setup', label: 'Seated, strap on', end: 0.8, cue: 'Sit tall at the end of the bench, right ankle strapped to the low pulley under it, hands on the bench behind you.', w: 0.12 },
    { id: 'up', label: 'Straighten the knee', end: 2.0, breath: 'exhale', cue: 'Breathe out and straighten the right knee against the cable.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Squeeze the quads with the knee almost straight; thigh stays on the bench.', w: 1 },
    { id: 'down', label: 'Lower with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and bend the knee slowly back to 90 degrees.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep tension on the cable; repeat, then switch legs.', w: 0.12 },
  ],
  mistakes: [['Lifting the thigh off the bench', 'Only the knee moves; keep the thigh down.'], ['Kicking the leg up', 'Straighten smoothly and pause.'], ['Leaning far back', 'Sit tall; the hands just steady you.'], ['Letting the stack drop', 'Lower over about 2 s.']],
  kin: [['Knee flexion', 'From about 90 degrees to 5-15 degrees (clinical opinion); open-chain extension loads the quadriceps most near extension (Escamilla 1998)', ['escamilla1998']], ['Hip', 'About 90 degrees, thigh on the bench (standard setup)', []], ['Cable line', 'Low pulley under the bench, behind the strapped ankle (standard setup)', []], ['Tempo', 'Controlled, slower down (clinical opinion)', []]],
  safety: { cautions: ['Check the strap is snug and the clip is closed before each set.', 'Knee pain at the front of the knee: shorten the range near full extension.'], modify: ['Lighter stack with a longer pause.'], regressions: ['Seated knee extension without load.'], progressions: ['Heavier stack.', 'Lever leg extension.'] },
  act: { quads_r: [0.12, 0.78], hip_flexors_r: [0.06, 0.22], core: [0.08, 0.15] },
  guides: [{ id: 'anklePath', kind: 'path', joint: 'ankle_r', from: 0.8, to: 2.0, label: 'Shin swings up' }, { id: 'kneeAngle', kind: 'jointAngle', joint: 'knee_r', normBand: [5, 15], label: 'Knee almost straight' }],
  checks: { stillJoints: ['pelvis', 'ankle_l'], plantedContacts: ['arm_r', 'arm_l', 'leg_l'] },
});

const K0 = 88, K1 = 10;
const S = G.seatedBase({ half: 11, toe: 4, hipAbd: 3, pitch: 12, handBack: 14, handZ: 12.5, benchLen: 70 });
const contacts = [...S.contacts.arms, S.contacts.legs[1]];
function poseAt(f) {
  let p = clone(S.pose);
  p.ik = { leg_l: { target: S.FOOT.l.slice(), weight: 1 } };
  p = H.fitLeg(p, 'l', S.contacts.legs[1], S.FOOT.l, { rot: -4 });
  p.ch.hip_r = { flex: 88, abd: 3, rot: -4 }; p.ch.knee_r = { flex: r1(K0 + (K1 - K0) * f) }; p.ch.ankle_r = { dorsi: r1(4 - 10 * f) };
  return G.handsOn(p, S.contacts.arms, S.HAND, { protract: -8, elevate: -8 });
}
const { poses, keyframes } = G.rep(poseAt);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wr = L.fk(poses.rest, contacts);
const PULLEY = [r1(Wr.ankle_r.p[0] - 30), 8, r1(Wr.ankle_r.p[2])];
const strap = GA.ankleStrap(PULLEY, { side: 'r', ring: [-1, 0, 0], id: 'strap', schemaAttachment: 'ankle_strap' });
ex.props = [S.bench.prop, EQ.cableTower(PULLEY, { x: r1(S.bench.seatX[0] - 12), z: r1(PULLEY[2]), id: 'tower' }), strap];
const C = G.strapProbe(strap); let footMin = 1e9, benchLine = 1e9;
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_l'], probe: (W) => { C.probe(W); footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); } });
const Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wr, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Hip', 'setup', `≈${poses.rest.ch.hip_r.flex}° flexion, trunk ${Math.round(G.trunkLean(Wr))}° back of vertical`); set('Hip', 'peak', 'Unchanged');
set('Cable line', 'setup', `Pulley under the bench; cable ${Math.round(C.cable[0])} cm`); set('Cable line', 'peak', `Cable ${Math.round(C.cable[1])} cm; clears the body by ${C.line.d.toFixed(1)} cm or more`);
set('Tempo', 'setup', 'Seated 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s hold, 1.8 s down');
ex.checks.measure = { name: 'kneeFlexion', min: K0 - 4, max: K0 + 4 };
console.log(`Cable Seated Leg Extension: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} footR ${footMin.toFixed(2)} line ${JSON.stringify(C.line)} cable ${G.fmt(C.cable)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hands or foot slide'); process.exitCode = 1; }
if (footMin < 0.5) { console.error('FAIL: moving foot scuffs the floor'); process.exitCode = 1; }
if (C.line.d < 0.5) { console.error('FAIL: cable passes through the body'); process.exitCode = 1; }
