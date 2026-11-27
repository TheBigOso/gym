// Barbell Low Split Squat (GymVisual "Barbell Low Split Squat"): high-bar barbell on the upper traps (fixed in the
// spine_t6 frame, 80 cm overhand grip, elbows down); a long split stance, right foot forward and flat, left heel up on the
// ball of the foot. The pelvis drops straight down into a deep ("low") split squat: the back knee comes to just above
// the floor and the front thigh passes parallel (front knee about 104 degrees), trunk upright under the bar, then rises.
// Both feet planted the whole loop. Authored right leg forward (the player mirrors for the left). Built on the split squat
// (lunge.js) with the b5-bbsquat back-bar arms (barbell.js armsOnBar).
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const BB = require('./families/barbell');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-low-split-squat.json');
const bar = S5.backBar(S5.HIGH_BAR);
const KB = JSON.parse(process.env.KB || '[104, 12]');

const F = makeFamily({ toe: 6, half: 9 });
const FRONT = +(process.env.FR ?? 44), BACK = +(process.env.BA ?? -48);   // ankle centres 92 cm apart (a little over one leg length, Song 2023): room for the deep bottom
const base = (pitch) => ({ root: [5, 80, 0], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: FRONT }, l: { c: 'ball', x: BACK } } });
// top: soft front knee (about 22 degrees), back knee about 33 degrees (reachable with both feet planted), keeps the back hip inside its extension range
const top = F.solveRoot(base(-14), { knee: 22, side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(F.kneeOf(W, 'l') - 33) * 0.5]] });
// bottom: front knee about 104 degrees, back knee joint centre 12 cm above the floor (the kneecap a few cm off it)
const bot = F.solveRoot(base(-10), { knee: KB[0], side: 'r', paths: ['root.0', 'root.1'], extra: [(W) => [(W.knee_l.p[1] - KB[1]) * 0.5]] });
const at = (f) => { const s = clone(top); s.root = top.root.map((v, i) => r1(v + (bot.root[i] - v) * f)); s.pitch = r1(top.pitch + (bot.pitch - top.pitch) * f); s.arms = bar.armsFn; return F.pose(s); };
const poses = { top: at(0), d25: at(0.25), d50: at(0.5), d75: at(0.75), bottom: at(1), r50: at(0.5) };
poses.settle = at(0.99);
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.25, pose: 'd25' }, { t: 1.7, pose: 'd50' }, { t: 2.15, pose: 'd75' }, { t: 2.6, pose: 'bottom' },
  { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.45, pose: 'r50' }, { t: 4.0, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [BB.barbellProp()], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex), Wt = F.fk(poses.top), Wb = F.fk(poses.bottom);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step length', 'setup', `${FRONT - BACK} cm between ankle centres, feet 18 cm apart sideways`); set('Step length', 'peak', 'Unchanged');
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Back knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'l'))}°`); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.8 s down, 0.3 s pause, 1.1 s up, 1.0 s reset');
ex.exercise.reference.note = S5.NOTE;
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}, 150).barBody, lim = S5.limits(ex);
console.log(`Barbell Low Split Squat: top ${JSON.stringify(top.root)} bottom ${JSON.stringify(bot.root)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)} hip ${poses.bottom.ch.hip_r.flex}/${poses.top.ch.hip_l.flex}`);
S5.gate('barbell-low-split-squat', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
{ const m = ex.checks.measure; if (rep.kneeR[1] < m.min || rep.kneeR[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; } }
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
