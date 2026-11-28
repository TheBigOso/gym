// Dumbbell Goblet Split Squat Front Foot Elevanted (GymVisual "Dumbbell Goblet Split Squat Front Foot Elevanted", movement
// reference only; the catalogue's spelling is kept in the id): the whole right foot flat on a 15 cm step, the left foot back
// on its ball on the floor, one dumbbell held upright against the chest (both hands cupping the top plate, elbows down;
// b3-legs gobletArms). The pelvis drops until the back knee is just above the floor (below the level of the front foot),
// then rises. Both feet planted the whole loop (constant IK targets). Authored right leg in front (the player mirrors).
// Built on the front-foot-elevated split squat (build/families/lunge.js); the step height under the foot is the one checked
// there on the skinned mesh.
const L = require('./lib');
const { R, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-goblet-split-squat-front-foot-elevanted.json');

const F = makeFamily({ toe: 6, half: 9 });
const STEP_H = 15, FOOT_LIFT = 15;
const FRONT = 40, BACK = -45;   // ankle centres 85 cm apart (about one leg length, Song 2023)
const OFF = B.GOBLET_OFFSET;
const arms = (p) => { const q = B.gobletArms(p, { at: [25, 5, 5.4], elbow: [14, -16, 17], tilt: 0.45 }); delete q.__armCost; return G.posElev(q); };
const base = (pitch) => ({ root: [0, 85, 0], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: FRONT, lift: FOOT_LIFT }, l: { c: 'ball', x: BACK } } });
// top: back knee about 18 degrees (the back foot must still reach the floor); bottom: front knee about 104, back knee joint 13 cm up
const top = F.rootY(Object.assign(base(-6), { root: [-4, 85, 0] }), 18, 'l');
const bot = F.solveRoot(base(-10), { knee: 104, side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(W.knee_l.p[1] - 13) * 0.5]] });
const at = (f) => { const s = clone(top); s.root = top.root.map((v, i) => r1(v + (bot.root[i] - v) * f)); s.pitch = r1(top.pitch + (bot.pitch - top.pitch) * f); s.arms = arms; return F.pose(s); };
const poses = { top: at(0), d25: at(0.25), d50: at(0.5), d75: at(0.75), bottom: at(1), settle: at(0.985), r50: at(0.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.3, pose: 'd25' }, { t: 1.8, pose: 'd50' }, { t: 2.25, pose: 'd75' }, { t: 2.7, pose: 'bottom' },
  { t: 2.85, pose: 'settle' }, { t: 3.0, pose: 'bottom' }, { t: 3.55, pose: 'r50' }, { t: 4.1, pose: 'top' }, { t: 5.2, pose: 'top' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: clone(meta.props), contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.props = [{ id: 'step', kind: 'box', center: [FRONT + 6, 0, 9], size: [36, STEP_H, 30] }, B.heldProp('r', 'goblet', OFF)];
ex.exercise.reference.note = G.NOTE;
const rep = K.scan(ex, { holds: [{ side: 'r', grip: 'goblet', offset: OFF }], planted: ['leg_r', 'ball_l'], box: ex.props[0], skip: (s, id) => /^(hand|thumb|forearm)_l$/.test(id) });
const fr = F.report(ex), Wt = F.fk(poses.top), Wb = F.fk(poses.bottom);
const shin = (W) => Math.atan2(W.knee_r.p[0] - W.ankle_r.p[0], W.knee_r.p[1] - W.ankle_r.p[1]) / R.DEG;
const lim = G.limits(ex), set = G.setKin(ex);
set('Step height', 'setup', `${STEP_H} cm step under the whole right foot`); set('Step height', 'peak', 'Front foot stays flat on the step');
set('Stance length', 'setup', `${FRONT - BACK} cm between ankle centres, feet 18 cm apart sideways`); set('Stance length', 'peak', 'Unchanged');
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°, shin ≈${Math.round(shin(Wb))}° forward of vertical`);
set('Back knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'l'))}°`); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, joint centre ${r1(Wb.knee_l.p[1])} cm above the floor (the front ankle is ${r1(Wb.ankle_r.p[1])} cm up)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Stays at the chest, clear of the front thigh (≥${rep.clear.d} cm on the rig shapes)`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.9 s down, 0.3 s pause, 1.1 s up, 1.1 s reset');
console.log(`Dumbbell Goblet FFE Split Squat: top ${JSON.stringify(top.root)} bottom ${JSON.stringify(bot.root)} wrote ${L.write(ex)}\n  ${JSON.stringify(fr)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} limits ${JSON.stringify(lim)}`);
K.gate('dumbbell-goblet-split-squat-front-foot-elevanted', rep);
if (fr.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-goblet-split-squat-front-foot-elevanted', ex, fr.kneeR[1]);
