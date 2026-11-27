// Dumbbell Side Squat (GymVisual #12882; page not readable here, movement from the name): a lateral (side-to-side) squat
// from a fixed wide stance. Feet about 1.8x shoulder width, toes out slightly, both feet planted flat (constant IK targets).
// One dumbbell held upright at the chest, both hands cupping the top plate (goblet hold; batch 3 gobletArms). The hips sit
// back and shift over the right foot (right knee about 85-90 degrees, left leg straight, both heels down), pause, then push
// back up to the middle. Authored to the right (the player mirrors). Lunge family (lunge.js) for the stance and root solve.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-side-squat.json');

const F = makeFamily({ toe: 12, half: 9 });
const HALF = 38, KNEE = +(process.env.KNEE ?? 88), BOTTOM_X = -28;
const OFF = B.GOBLET_OFFSET;
const armsFn = (f) => (p) => { const q = B.gobletArms(p, { at: [25, 6 - 2 * f, 5.4], elbow: [14, -16, 17 + 2 * f], tilt: 0.45 }); delete q.__armCost; return q; };
const flat = (x, z) => ({ c: 'flat', x, z });
const feet = { r: flat(0, HALF), l: flat(0, -HALF) };
const top = F.rootY({ root: [-2, 85, 0], pitch: -4, spine: { l5: 0, t12: 0, t6: 0 }, feet }, 8, 'r');
// depth f (0 = standing wide, 1 = bottom over the right foot): pelvis height keeps the left knee nearly straight, the
// sideways shift (bisection) sets the right knee; the trunk hinges forward as the hips sit back
const depth = (f) => {
  if (f === 0) return clone(top);
  const x = r1(top.root[0] + (BOTTOM_X - top.root[0]) * f), pitch = r1(-4 - 28 * f), spine = { l5: r1(-2 * f), t12: 0, t6: r1(2 * f) };
  const at = (z) => F.rootY({ root: [x, 84, z], pitch, spine, feet }, 10, 'l');
  let lo = 0, hi = HALF, best = null;
  for (let i = 0; i < 40; i++) { const z = (lo + hi) / 2, sp = at(z); best = sp; if (F.kneeOf(F.fk(F.build(sp)), 'r') < 8 + (KNEE - 8) * f) lo = z; else hi = z; }
  best.root[2] = r1(best.root[2]); return best;
};
const P = (f, dy = 0) => { const s = depth(f); s.root[1] = r1(s.root[1] - dy); return F.pose(Object.assign(s, { arms: armsFn(f) })); };
const poses = { stand: P(0), d25: P(0.25), d50: P(0.5), d75: P(0.75), bottom: P(1), settle: P(1, 0.3) };
for (const k in poses) delete poses[k].__armCost;
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.25, pose: 'd25' }, { t: 1.7, pose: 'd50' }, { t: 2.15, pose: 'd75' }, { t: 2.6, pose: 'bottom' },
  { t: 2.8, pose: 'settle' }, { t: 3.0, pose: 'bottom' }, { t: 3.4, pose: 'd75' }, { t: 3.75, pose: 'd50' }, { t: 4.1, pose: 'd25' }, { t: 4.4, pose: 'stand' }, { t: 5.2, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [B.heldProp('r', 'goblet', OFF)], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const rep = F.report(ex), Wb = F.fk(poses.bottom), Ws = F.fk(poses.stand);
const db = B.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Stance width', 'setup', `${2 * HALF} cm between ankle centres, toes out 12°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Squatting knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}°`); set('Squatting knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Straight leg', 'setup', `≈${Math.round(F.kneeOf(Ws, 'l'))}°`); set('Straight leg', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}° forward`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Clear of the chest and thighs (≥${db.dbClear} cm on the rig shapes)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.8 s down, 0.4 s pause, 1.4 s up, 0.8 s at the top');
const kb = Math.round(F.kneeOf(Wb, 'r'));
ex.checks.measure = { name: 'kneeFlexion', min: kb - 6, max: kb + 6 };
console.log(`Dumbbell Side Squat: top ${JSON.stringify(top.root)} bottom ${JSON.stringify(poses.bottom.root.pos)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} ${JSON.stringify(db)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell passes through the body or the floor'); process.exitCode = 1; }
