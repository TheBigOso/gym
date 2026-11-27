// Dumbbell Gorilla Row (GymVisual #1124112): wide stance (ankles 80 cm apart, toes out 30 degrees, knees pushed out
// over the toes), hips back and low, back flat and close to level, a dumbbell on the floor under each
// shoulder between the feet, hands on the handles (neutral grip). Row the right dumbbell up inside the knee to the side of the lower ribs while the left hand
// presses its dumbbell into the floor (left hand planted: constant IK target and orientation), lower it back to rest on the
// floor, then row the left side. The hinge is held still the whole loop (balanced over the mid-foot). Both feet planted;
// each hand is planted while its dumbbell rests on the floor. Alternating (bilateral loop).
const L = require('./lib');
const { R, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-gorilla-row.json');

const TOE = 30, HALF = 40;
const F = makeFamily({ toe: TOE, half: HALF });
for (const c of F.contacts) { const s = c.id.endsWith('_r') ? 1 : -1, a = (TOE + 6) * R.DEG; c.pole = [+Math.cos(a).toFixed(3), 0, +(s * Math.sin(a)).toFixed(3)]; }   // knees over the toes
const SIZE = [28, 18, 18], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = +(process.env.P ?? -86), FLOOR = +(process.env.DBF ?? -0.7);   // rig dumbbell low point on the floor (the athlete's sits a little higher)
// hanging arms for the set-up (rowArm at f = 0: hands a little forward of and inside the shoulders); shoulder blades
// protracted on the floor, retracted at the top of the row
const ROW = { top: { du: -22, dz: 8, wx: 8, wz: 0 }, sc: [{ protract: 10, elevate: -1 }, { protract: -14, elevate: -2 }], hang: [6, -3], bend: 3 };
const hinge = (knee) => B.hinge(F, { pitch: PITCH, knee, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: ROW.sc[0], size: DSZ, kg: 0, midfoot: 5,   // the dumbbells rest on the floor: balance the body alone
  neck: (lean) => -Math.min(lean, 80) * 0.22, arms: (p) => B.mirrorArm(B.rowArm(p, 0, ROW, {})) });
// knee angle (root height) that sets the hanging dumbbells on the floor
let ka = 10, kb = 110;
for (let i = 0; i < 18; i++) { const k = (ka + kb) / 2; if (DBH.dumbbellMinY(hinge(k).W, 'r', 'handle', DSZ) > FLOOR) ka = k; else kb = k; }
const KNEE = r1((ka + kb) / 2), hold = B.wrapPose(hinge(KNEE).pose);
// both hands planted on their dumbbells: arm contacts from the hold, arm channels fitted to the contact solution
const arms = H.plantArms(hold, F.contacts), contacts = F.contacts.concat(arms.contacts);
let base = clone(hold);
base.ik.hold_r = { target: arms.targets.r, weight: 1 }; base.ik.hold_l = { target: arms.targets.l, weight: 1 };
base = H.fitArm(base, 'r', contacts, 'hold_r'); const fitR = base.__fit; base = H.fitArm(base, 'l', contacts, 'hold_l'); const fitL = base.__fit; delete base.__fit;
// Row path (right hand): the handle rises from the floor almost straight up first (staying inside the knees), then moves back
// to the side of the lower ribs, in front of the hip crease so it clears the thighs; the hand keeps a neutral grip with the
// handle's front end tipped down a little at the top. The arm is solved for each point (one branch, kept by the guess).
const Wb = L.fk(base, contacts), C0 = DBH.dumbbellAt(Wb, 'r', 'handle', DSZ).c, SH = Wb.shoulder_r.p;
const END = [SH[0] - +(process.env.EX ?? 1), SH[1] - +(process.env.EY ?? 10), C0[2] + +(process.env.EZ ?? 22)];
const state = { cost: 0 };
let guess = null;
function row(f) {
  const q0 = clone(base), u = f * f * (3 - 2 * f);
  q0.ch.sc_r = { protract: r1(ROW.sc[0].protract + (ROW.sc[1].protract - ROW.sc[0].protract) * u), elevate: r1(ROW.sc[0].elevate + (ROW.sc[1].elevate - ROW.sc[0].elevate) * u) };
  const fy = Math.min(1, f / 0.75), fx = Math.max(0, (f - 0.25) / 0.75), sy = fy * fy * (3 - 2 * fy), sx = fx * fx * (3 - 2 * fx);
  const c = [C0[0] + (END[0] - C0[0]) * sx, C0[1] + (END[1] - C0[1]) * sy, C0[2] + (END[2] - C0[2]) * sy];
  const tl = -20 * u * R.DEG, palm = [0, 0, -1], thumb = [Math.cos(tl), Math.sin(tl), 0];
  const q = B.holdArm(q0, B.wristFromHandle(c, palm, thumb), { palm, axis: thumb, axialW: 0.02, tw: [6, 6, 6], dirW: 2, guesses: (guess ? [guess] : []).concat([[base.ch.shoulder_r.plane, base.ch.shoulder_r.elev, base.ch.shoulder_r.axial, base.ch.elbow_r.flex, base.ch.wrist_r.pron], [70, 45, 0, 8, 90], [40, 30, 0, 60, 90], [-30, 40, 40, 100, 90]]) });
  guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];
  state.cost = Math.max(state.cost, q.__cost); delete q.__cost;
  return B.wrapPose(q);
}
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = H.alternate(base, contacts, row, FS);
const T = H.phaseT(meta), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'R0' }, { t: T.setup[1], pose: 'R0' },
  ...H.easedKeys('R', FS, T.rowR[0], T.rowR[1]), { t: T.topR[1], pose: `R${N}` }, ...H.easedKeys('R', FS, T.lowerR[0], T.lowerR[1], true),
  { t: T.switch[1], pose: 'L0' }, ...H.easedKeys('L', FS, T.rowL[0], T.rowL[1]), { t: T.topL[1], pose: `L${N}` }, ...H.easedKeys('L', FS, T.lowerL[0], T.lowerL[1], true), { t: D, pose: 'R0' }];
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts });
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const W0 = L.fk(poses.R0, contacts), W1 = L.fk(poses[`R${N}`], contacts);
H.setKin(ex, 'Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal (hip channel ${Math.round(hold.ch.hip_r.flex)}°), spine neutral`); H.setKin(ex, 'Trunk angle', 'peak', 'Unchanged (held, no twist)');
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(W0, 'r'))}°, ankles ${2 * HALF} cm apart, toes out ${TOE}°`); H.setKin(ex, 'Knee flexion', 'peak', 'Unchanged');
H.setKin(ex, 'Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°, dumbbell resting on the floor`); H.setKin(ex, 'Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}°, shoulder blade retracted (clavicle ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°), dumbbell beside the lower ribs`);
H.setKin(ex, 'Tempo', 'setup', `Set ${T.setup[1]} s`); H.setKin(ex, 'Tempo', 'peak', `Per side ${r1(T.rowR[1] - T.rowR[0])} s up, ${r1(T.topR[1] - T.topR[0])} s squeeze, ${r1(T.lowerR[1] - T.lowerR[0])} s down, ${r1(T.switch[1] - T.switch[0])} s with both dumbbells down`);
console.log(`Dumbbell Gorilla Row: wrote ${L.write(ex)}\n  knee ${KNEE}, trunk ${r1(90 - B.trunkLean(W0))} above horiz, hip ${hold.ch.hip_r.flex}, db low ${r1(DBH.dumbbellMinY(W0, 'r', 'handle', DSZ))}, db z ${r1(DBH.dumbbellAt(W0, 'r', 'handle', DSZ).c[2])}, elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))}, arm fit ${JSON.stringify(fitR)} ${JSON.stringify(fitL)}, top cost ${state.cost.toFixed(2)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
if (rep.dbFloor < FLOOR - 0.5 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
