// Front-Foot-Elevated Split Squat (GymVisual #778412, dumbbell version): the whole right foot flat on a 15 cm step, the
// left foot back on its ball on the floor, a dumbbell hanging in each hand at the sides. The pelvis drops until the back knee
// is just above the floor (below the level of the front foot), then rises. Both feet planted the whole loop (constant IK
// targets). Authored right leg in front (the player mirrors). Built on the batch 2 split squat (build/families/lunge.js).
// The step height under the foot is checked on the skinned mesh (b2/scratch/sq2/mesh.mjs: the sole rests on the step top).
const L = require('./lib');
const { R, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const meta = require('./meta/front-foot-elevated-split-squat.json');

const F = makeFamily({ toe: 6, half: 9 });
const STEP_H = 15, FOOT_LIFT = +(process.env.LIFT ?? 15);   // ankle lift over the floor height: mesh sole on the step top
const FRONT = 40, BACK = -45;   // ankle centres 85 cm apart (about one leg length, Song 2023)
const HANG = { out: 9 };
const arms = (p) => { const q = B.armsHang(p, HANG); delete q.__armCost; return q; };
const base = (pitch) => ({ root: [0, 85, 0], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: FRONT, lift: FOOT_LIFT }, l: { c: 'ball', x: BACK } } });
const KT = JSON.parse(process.env.KT || '[0, 18]'), KB = JSON.parse(process.env.KB || '[104, 13]');
// top: back knee about 18 degrees (the back foot must still reach the floor), front knee then about 29; bottom: front knee about 104 degrees, back knee joint 13 cm above the floor
const topX = +(process.env.TX ?? -4);
const top = F.rootY(Object.assign(base(-8), { root: [topX, 85, 0] }), KT[1], 'l');
const bot = F.solveRoot(base(-14), { knee: KB[0], side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(W.knee_l.p[1] - KB[1]) * 0.5]] });
const at = (f) => { const s = clone(top); s.root = top.root.map((v, i) => r1(v + (bot.root[i] - v) * f)); s.pitch = r1(top.pitch + (bot.pitch - top.pitch) * f); s.arms = arms; return F.pose(s); };
const poses = { top: at(0), d25: at(0.25), d50: at(0.5), d75: at(0.75), bottom: at(1), settle: at(0.985), r50: at(0.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.3, pose: 'd25' }, { t: 1.8, pose: 'd50' }, { t: 2.25, pose: 'd75' }, { t: 2.7, pose: 'bottom' },
  { t: 2.85, pose: 'settle' }, { t: 3.0, pose: 'bottom' }, { t: 3.55, pose: 'r50' }, { t: 4.1, pose: 'top' }, { t: 5.2, pose: 'top' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: clone(meta.props), contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.props[0] = { id: 'step', kind: 'box', center: [FRONT + 6, 0, 9], size: [36, STEP_H, 30] };
ex.exercise.reference.note = K.NOTE;
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r', 'ball_l'], box: ex.props[0] });
const fr = F.report(ex), Wt = F.fk(poses.top), Wb = F.fk(poses.bottom);
const shin = (W) => Math.atan2(W.knee_r.p[0] - W.ankle_r.p[0], W.knee_r.p[1] - W.ankle_r.p[1]) / R.DEG;
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step height', 'setup', `${STEP_H} cm step under the whole right foot`); set('Step height', 'peak', 'Front foot stays flat on the step');
set('Stance length', 'setup', `${FRONT - BACK} cm between ankle centres, feet 18 cm apart sideways`); set('Stance length', 'peak', 'Unchanged');
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°, shin ≈${Math.round(shin(Wb))}° forward of vertical`);
set('Back knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'l'))}°`); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, joint centre ${r1(Wb.knee_l.p[1])} cm above the floor (the front ankle is ${r1(Wb.ankle_r.p[1])} cm up)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.9 s down, 0.3 s pause, 1.1 s up, 1.1 s reset');
console.log(`Front-Foot-Elevated Split Squat: top ${JSON.stringify(top.root)} bottom ${JSON.stringify(bot.root)} wrote ${L.write(ex)}\n  ${JSON.stringify(fr)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} hip ${poses.bottom.ch.hip_r.flex}/${poses.top.ch.hip_l.flex}`);
K.gate('front-foot-elevated-split-squat', rep);
if (fr.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
