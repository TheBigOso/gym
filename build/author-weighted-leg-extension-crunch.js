// Weighted Leg Extension Crunch (GymVisual #985, movement reference only): seated on a mat, leaning back on the hands
// (planted on the floor behind the hips), a dumbbell held upright between the feet. From the legs extended and hovering
// (knees almost straight, legs about 25 degrees off the floor, trunk leaned back about 50 degrees), draw the knees in toward
// the chest while the trunk comes up to meet them (the crunch), pause, then push the legs back out and lean back again.
// The feet never touch down; the seat stays on the mat. Bilateral.
// Gear: dumbbell resting on the body between the feet (src/gear/attach.js, attach ankle_r + params.axis); part clearances
// and helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const H = require('./families/hips');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'weighted-leg-extension-crunch', name: 'Weighted Leg Extension Crunch', url: 'https://gymvisual.com/videos/985-weighted-leg-extension-crunch.html',
  aliases: ['Seated dumbbell knee tuck', 'Weighted seated in-and-out', 'Dumbbell tuck crunch'], bodyPart: 'Waist (rectus abdominis)', secondary: ['Hip flexors', 'Obliques'], equipment: ['Dumbbell (between the feet)', 'Mat'],
  mechanics: 'Compound (hip and trunk flexion)', plane: 'Sagittal', side: 'bilateral', cam: 'side', difficulty: 'Intermediate',
  muscles: { target: ['core', ...G.both('hip_flexors')], synergist: [...G.both('obliques'), ...G.both('quads')], stabilizer: [...G.both('triceps'), ...G.both('post_deltoid')], lengthened: G.both('spinal_extensors') },
  notes: { core: 'Rectus abdominis curls the pelvis and trunk together (Escamilla 2006).', hip_flexors_r: 'Draw the weighted legs in and hold them off the floor (Escamilla 2006).', hip_flexors_l: 'Draw the weighted legs in and hold them off the floor (Escamilla 2006).', obliques_r: 'Assist trunk flexion (clinical opinion).', obliques_l: 'Assist trunk flexion (clinical opinion).', quads_r: 'Straighten the knees on the way out (clinical opinion).', quads_l: 'Straighten the knees on the way out (clinical opinion).', triceps_r: 'Prop the trunk on the hands (clinical opinion).', triceps_l: 'Prop the trunk on the hands (clinical opinion).', post_deltoid_r: 'Hold the arms behind the body (clinical opinion).', post_deltoid_l: 'Hold the arms behind the body (clinical opinion).', spinal_extensors_r: 'Lengthen as the trunk curls (clinical opinion).', spinal_extensors_l: 'Lengthen as the trunk curls (clinical opinion).' },
  breathing: { pattern: 'Exhale as the knees come in, inhale as the legs extend.', cadence: 'About 1.2 s in, 0.5 s hold, 1.8 s out' },
  rx: { reps: '10-15', tempo: '1-0.5-2-0', progression: 'Heavier dumbbell, then hands off the floor' },
  phases: [
    { id: 'setup', label: 'Lean back, legs out', end: 0.8, cue: 'Sit leaning back on your hands, dumbbell squeezed upright between the feet, legs extended off the floor.', w: 0.35 },
    { id: 'in', label: 'Knees in, crunch', end: 2.0, breath: 'exhale', cue: 'Breathe out, pull the knees to the chest and curl the trunk up to meet them.', w: 1 },
    { id: 'hold', label: 'Squeeze', end: 2.5, cue: 'Squeeze the abs; keep the feet off the floor.', w: 0.9 },
    { id: 'out', label: 'Extend', end: 4.3, breath: 'inhale', cue: 'Breathe in, push the legs back out and lean back with control.', w: 0.4 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Hold the legs long just off the floor; repeat.', w: 0.35 },
  ],
  mistakes: [['Letting the feet touch down', 'Keep the legs hovering; make the range smaller if needed.'], ['Arching the low back as the legs go out', 'Keep the ribs down; stop the legs higher.'], ['Losing the dumbbell', 'Squeeze the handle with the feet flexed; use a light one.'], ['Rocking with momentum', 'Pause in and out.']],
  kin: [['Hip flexion', 'From about 45 degrees (legs out) to 110-130 degrees (knees in) (clinical opinion)', []], ['Knee flexion', 'From near straight to about 120 degrees (clinical opinion)', []], ['Trunk', 'Leaned back about 45-55 degrees, curls up as the knees come in (Escamilla 2006)', ['escamilla2006']], ['Dumbbell', 'Upright between the feet (standard technique)', []], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Use a light dumbbell you can grip securely with the feet; clear the area in case it slips.', 'Low-back pain: keep the legs higher.'], modify: ['No dumbbell until the movement is smooth.'], regressions: ['Seated knee tuck without weight.'], progressions: ['Heavier dumbbell.', 'Hands lifted off the floor.'] },
  act: { core: [0.3, 0.72], hip_flexors_r: [0.35, 0.68], hip_flexors_l: [0.35, 0.68], obliques_r: [0.15, 0.38], obliques_l: [0.15, 0.38], quads_r: [0.25, 0.15], quads_l: [0.25, 0.15], triceps_r: [0.2, 0.15], triceps_l: [0.2, 0.15], post_deltoid_r: [0.15, 0.12], post_deltoid_l: [0.15, 0.12] },
  props: [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [180, 0.6, 70] }],
  guides: [{ id: 'kneePath', kind: 'path', joint: 'knee_r', from: 0.8, to: 2.0, label: 'Knees to the chest' }],
  checks: { stillJoints: ['wrist_r', 'wrist_l'], plantedContacts: ['arm_r', 'arm_l'] },
});

const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const ABD = -2, DORSI = 12;
// seat pivot: lowest point of the buttocks stays at (SX, 0)
const seatPt = (W) => H.lowPoint(W, 'buttock_r');
function body(lean, curl, hip, knee) {
  const p = { root: { pos: [0, 15, 0], rot: { pitch: r1(lean) } }, ch: { spine_l5: { ...z0(), flex: r1(curl * 0.4) }, spine_t12: { ...z0(), flex: r1(curl * 0.35) }, spine_t6: { ...z0(), flex: r1(curl * 0.25) },
    neck_c7: { rot: 0, flex: r1(8 + curl * 0.2) }, head_c1: { rot: 0, flex: r1(6 + curl * 0.15) } } };
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: r1(hip), abd: ABD, rot: 0 }; p.ch[`knee_${s}`] = { flex: r1(knee) }; p.ch[`ankle_${s}`] = { dorsi: DORSI }; p.ch[`sc_${s}`] = { protract: -6, elevate: 4 }; }
  return L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => { const s = seatPt(W); return [s[0] * 3, s[1] * 3]; }]).pose;
}
// f: 0 = legs out (lean back 52, hip 48, knee 8), 1 = knees in (lean back 30, spine curled 24, hip 118, knee 122)
const lerp = (a, b, f) => a + (b - a) * f;
const at = (f) => body(lerp(52, 38, f), lerp(0, 22, f), lerp(48, 116, f), lerp(8, 100, f));
// hands planted behind the hips: below and a little behind the shoulders in the leaned-back pose
const Wout = L.fk(at(0));
const HAND = { r: [r1(Wout.shoulder_r.p[0] + 5), 2.7, r1(Wout.shoulder_r.p[2] + 6)], l: [r1(Wout.shoulder_l.p[0] + 5), 2.7, r1(Wout.shoulder_l.p[2] - 6)] };
const contacts = ['r', 'l'].map((s) => Object.assign(H.handC(s, [-0.2, 0.3, s === 'r' ? 1 : -1]), {}));
const GUESS = (s) => [{ [`shoulder_${s}`]: { plane: -40, elev: 40, axial: 0 }, [`elbow_${s}`]: { flex: 20 }, [`wrist_${s}`]: { pron: 0, flex: -70, dev: 0 } }, { [`shoulder_${s}`]: { plane: -60, elev: 50, axial: 40 }, [`elbow_${s}`]: { flex: 30 }, [`wrist_${s}`]: { pron: 80, flex: -70, dev: 0 } }];
function poseAt(f) {
  let p = at(f);
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], GUESS(s)); delete p.__cost; }
  p.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 } };
  return p;
}
const { poses, keyframes } = G.rep(poseAt);
const ex = H.module_(meta, contacts, poses, keyframes);
const W0 = L.fk(poses.rest);
const mid = V.scale(V.add(W0.ankle_r.p, W0.ankle_l.p), 0.5), cen = V.add(V.add(mid, V.scale(Q.rot(W0.ankle_r.q, [1, 0, 0]), 4)), V.scale(Q.rot(W0.ankle_r.q, [0, 1, 0]), 3));
const db = { id: 'db', kind: 'dumbbell', size: [30, 10, 10], attach: { joint: 'ankle_r', offset: GA.toFrame(W0, 'ankle_r', cen).map(r1) }, params: { axis: [1, 0, 0] } };
ex.props = ex.props.concat([db]);
let handle = 1e9, plates = 1e9, dbLow = 1e9, footLow = 1e9, seat = [1e9, -1e9], body2 = 1e9;
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W) => { const r = G.dbParts(W, db, { skip: /^(hand|thumb|foot)_/ }); handle = Math.min(handle, G.dbParts(W, db).handle.d); plates = Math.min(plates, G.dbParts(W, db).plates.d); body2 = Math.min(body2, r.plates.d);
  dbLow = Math.min(dbLow, ...r.ends.map((e) => e[1] - 5)); footLow = Math.min(footLow, H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'calf_r')); const s = seatPt(W); seat = [Math.min(seat[0], s[1]), Math.max(seat[1], s[1])]; } });
const Wt = L.fk(poses.top);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.rest.ch.hip_r.flex)}° (legs out)`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° (knees in)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(W0, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Trunk', 'setup', `Leaned back ≈${Math.round(G.trunkLean(W0))}° from vertical`); set('Trunk', 'peak', `≈${Math.round(G.trunkLean(Wt))}°, spine curled`);
set('Dumbbell', 'setup', `Upright between the feet, lowest ${dbLow.toFixed(0)} cm off the floor`); set('Dumbbell', 'peak', 'Rides with the feet');
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.2 s in, 0.5 s hold, 1.8 s out');
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(poses.top.ch.hip_r.flex - 4), max: Math.ceil(poses.hold.ch.hip_r.flex + 4) };
console.log(`Weighted Leg Extension Crunch: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} handle ${handle.toFixed(2)} plates ${plates.toFixed(2)} platesVsBody ${body2.toFixed(2)} dbLow ${dbLow.toFixed(1)} footLow ${footLow.toFixed(1)} seat ${seat.map((v) => v.toFixed(2))}`);
if (rep.slide > 0.05) { console.error('FAIL: planted hands slide'); process.exitCode = 1; }
if (rep.floor < -0.5 || dbLow < 0.5 || footLow < 1) { console.error('FAIL: legs or dumbbell touch the floor'); process.exitCode = 1; }
if (body2 < -0.5) { console.error('FAIL: dumbbell plates in the body'); process.exitCode = 1; }
