// Rig v2 (shorter arms): 20 cm plates and a little more shoulder-blade reach at the dead stop keep the hip channel under 140.
// Dumbbell Pendlay Row (GymVisual #1188712): feet hip width, hips hinged until the back is nearly level (about 10-15 degrees
// above the floor), knees bent just enough that the straight arms set the dumbbells on the floor under the shoulders
// (neutral grip). Dead stop on the floor, then a fast row of both dumbbells to the lower ribs (elbows back close to the
// body, shoulder blades squeezing), a short squeeze, a controlled lowering back to the floor and a full stop. The trunk,
// hips and legs are held still the whole loop (balanced over the mid-foot); only the arms and shoulder blades move. Both
// feet planted. Bilateral.
const L = require('./lib');
const { r1 } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-pendlay-row.json');

const F = makeFamily({ toe: +(process.env.TOE ?? 6), half: +(process.env.HALF ?? 9) });
for (const c of F.contacts) { const s = c.id.endsWith('_r') ? 1 : -1, a = (+(process.env.TOE ?? 6) + 6) * Math.PI / 180; c.pole = [+Math.cos(a).toFixed(3), 0, +(s * Math.sin(a)).toFixed(3)]; }   // knees track over the toes
const SIZE = [34, +(process.env.DIA ?? 20), +(process.env.DIA ?? 20)], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = +(process.env.P ?? -84), FLOOR = +(process.env.DBF ?? 0.3);   // rig dumbbell low point at the dead stop (rig v2 shapes match the mesh: the plates just touch the floor and the hands stay above it)
const ROW = { top: { du: -22, dz: +(process.env.DZ ?? 12.5), wx: 8, wz: 3, tilt: 12 }, sc: [{ protract: +(process.env.PR ?? 28), elevate: -1 }, { protract: -14, elevate: -2 }], hang: [+(process.env.HX ?? 8), +(process.env.HZ ?? 9)], bend: +(process.env.BEND ?? 0) };
const base = (knee) => B.hinge(F, { pitch: PITCH, knee, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: ROW.sc[0], size: DSZ, kg: +(process.env.KG ?? 0), midfoot: 5,   // balanced at the dead stop, with the dumbbells resting on the floor
  neck: (lean) => -Math.min(lean, 80) * 0.22, arms: (p) => B.mirrorArm(B.rowArm(p, 0, ROW, {})) });
// knee angle (root height) that sets the hanging dumbbells on the floor
let ka = 5, kb = 80;
for (let i = 0; i < 18; i++) { const k = (ka + kb) / 2; if (DBH.dumbbellMinY(base(k).W, 'r', 'handle', DSZ) > FLOOR) ka = k; else kb = k; }
const KNEE = r1((ka + kb) / 2), hold = base(KNEE).pose;
const state = {};
function at(f) { const q = B.rowArm(hold, f, ROW, state); B.mirrorArm(q); return B.wrapPose(q); }
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
const T = H.phaseT(meta), [T0, T1] = T.pull, [T2, T3] = T.lower, D = meta.timeline.duration;
// fast pull (eased only at the top), controlled lowering, dead stop on the floor
const keyframes = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * (1 - Math.sqrt(1 - f))).toFixed(3), pose: `r${i}` }));
keyframes.push({ t: T2, pose: `r${N}` }, ...H.easedKeys('r', FS, T2, T3, true), { t: D, pose: 'r0' });
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const W0 = F.fk(poses.r0), W1 = F.fk(poses[`r${N}`]);
H.setKin(ex, 'Trunk angle', 'setup', `≈${Math.round(90 - B.trunkLean(W0))}° above horizontal (hip channel ${Math.round(hold.ch.hip_r.flex)}°), spine neutral`); H.setKin(ex, 'Trunk angle', 'peak', 'Unchanged (held)');
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(W0, 'r'))}° (sets the dumbbells on the floor)`); H.setKin(ex, 'Knee flexion', 'peak', 'Unchanged');
H.setKin(ex, 'Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°, dumbbells resting on the floor`); H.setKin(ex, 'Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}°, shoulder blades retracted (clavicle protraction ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
H.setKin(ex, 'Tempo', 'setup', `Dead stop ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s up, ${r1(T2 - T1)} s squeeze, ${r1(T3 - T2)} s down, ${r1(D - T3 + T0)} s dead stop on the floor`);
console.log(`Dumbbell Pendlay Row: wrote ${L.write(ex)}\n  knee ${KNEE}, trunk ${r1(90 - B.trunkLean(W0))} above horiz, db low ${r1(DBH.dumbbellMinY(W0, 'r', 'handle', DSZ))}, elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))}, top cost ${state.cost.toFixed(2)}; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < FLOOR - 0.5 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
