// Dumbbell Goblet Split Squat (GymVisual "Dumbbell Goblet Split Squat", movement reference only): long split stance, right
// foot forward and flat, left heel up on the ball of the foot, one dumbbell held upright against the chest (both hands
// cupping the top plate, elbows down; b3-legs gobletArms). The pelvis drops straight down until the front knee is about
// 90 degrees and the back knee is just above the floor, then rises; the trunk stays tall behind the dumbbell. Both feet
// planted the whole loop. Authored right leg forward (the player mirrors for the left). Built on the batch 2 split squat.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-goblet-split-squat.json');

const F = makeFamily({ toe: 6, half: 9 });
const FRONT = 38, BACK = -42;   // ankle centres 80 cm apart (about 0.9x the rig's leg length; Song 2023 suggests about one leg length)
const OFF = B.GOBLET_OFFSET;
const arms = (p) => { const q = B.gobletArms(p, { at: [25, 5, 5.4], elbow: [14, -16, 17], tilt: 0.45 }); delete q.__armCost; return G.posElev(q); };
const base = (pitch) => ({ root: [5, 80, 0], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: FRONT }, l: { c: 'ball', x: BACK } } });
// top: soft front knee (about 22 degrees), back knee about 33 degrees; bottom: front knee 92 degrees, back knee 13 cm above the floor
const top = F.solveRoot(base(-10), { knee: 22, side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(F.kneeOf(W, 'l') - 33) * 0.5]] });
const bot = F.solveRoot(base(-8), { knee: 92, side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(W.knee_l.p[1] - 13) * 0.5]] });
const at = (f) => { const s = clone(top); s.root = top.root.map((v, i) => r1(v + (bot.root[i] - v) * f)); s.pitch = r1(top.pitch + (bot.pitch - top.pitch) * f); s.arms = arms; return F.pose(s); };
const poses = { top: at(0), d25: at(0.25), d50: at(0.5), d75: at(0.75), bottom: at(1), r50: at(0.5) };
poses.settle = at(0.99);
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.25, pose: 'd25' }, { t: 1.7, pose: 'd50' }, { t: 2.15, pose: 'd75' }, { t: 2.6, pose: 'bottom' },
  { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.45, pose: 'r50' }, { t: 4.0, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [B.heldProp('r', 'goblet', OFF)], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = G.NOTE;
const rep = F.report(ex), Wt = F.fk(poses.top), Wb = F.fk(poses.bottom);
const db = B.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const lim = G.limits(ex), set = G.setKin(ex);
set('Step length', 'setup', `${FRONT - BACK} cm between ankle centres, feet 18 cm apart sideways`); set('Step length', 'peak', 'Unchanged');
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Back knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'l'))}°`); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Stays at the chest, clear of the front thigh (≥${db.dbClear} cm on the rig shapes)`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.8 s down, 0.3 s pause, 1.1 s up, 1.0 s reset');
console.log(`Dumbbell Goblet Split Squat: top ${JSON.stringify(top.root)} bottom ${JSON.stringify(bot.root)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(db)} limits ${JSON.stringify(lim)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell passes through the body or the floor'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-goblet-split-squat', ex, rep.kneeR[1]);
