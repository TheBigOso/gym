// 90 degrees Heel Touch (GymVisual 9306, movement reference only; page not readable at authoring time). Read here as the
// double-leg tabletop heel tap: supine on a mat, arms by the sides palms down (planted hands), hips and knees bent 90
// degrees with the shins level. Keeping the knees at 90 degrees, both legs lower from the hips until the heels lightly
// touch the mat, then the thighs return to vertical. Pelvis and upper back stay down. Bilateral.
const L = require('./lib');
const { r1, clone } = L;
const C = require('./families/core-a');
const F = require('./families/b6-19');
const meta = require('./meta/90-degrees-heel-touch.json');

const { base, HC } = F.supineHands({ abd: 14 });
const KNEE = 90;
function legs(hip) { const p = clone(base); for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: r1(hip), abd: 1, rot: 0 }; p.ch[`knee_${s}`] = { flex: KNEE }; p.ch[`ankle_${s}`] = { dorsi: -5 }; } return p; }
const heel = (p) => C.minOf(L.fk(p, HC), ['foot_r', 'calf_r', 'shank_r']);
// hip flexion that puts the thighs vertical (tabletop) and the one where the heels just touch (0.3 cm)
const thighV = (() => { let a = 40, b = 140; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (C.thighFromFloor(L.fk(legs(m), HC)) < 90) a = m; else b = m; } return r1((a + b) / 2); })();
const tapHip = (() => { let a = 0, b = thighV; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (heel(legs(m)) < 0.3) a = m; else b = m; } return r1(b); })();
const poses = { table: legs(thighV), d1: legs(thighV - (thighV - tapHip) * 0.5), d2: legs(tapHip + 6), tap: legs(tapHip), u1: legs(thighV - (thighV - tapHip) * 0.45) };
const keyframes = [{ t: 0, pose: 'table' }, { t: 0.8, pose: 'table' }, { t: 1.5, pose: 'd1' }, { t: 2.0, pose: 'd2' }, { t: 2.2, pose: 'tap' }, { t: 2.5, pose: 'tap' }, { t: 3.1, pose: 'u1' }, { t: 3.7, pose: 'table' }, { t: 4.6, pose: 'table' }];
const ex = C.buildModule(meta, poses, keyframes, HC);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(thighV - 4), max: Math.ceil(thighV + 4) };
const rep = C.scan(ex, { heel: (W) => C.minOf(W, ['foot_r', 'calf_r', 'shank_r']), knee: (W) => C.kneeOf(W, 'r') });
const Wt = L.fk(poses.table, HC), Wb = L.fk(poses.tap, HC), set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); k[f] = v; }, d = (v) => `≈${Math.round(v)}°`;
set('Hip flexion', 'setup', `${d(thighV)} (thighs vertical)`); set('Hip flexion', 'peak', `${d(tapHip)} at the heel touch`);
set('Knee flexion', 'setup', d(C.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(C.kneeOf(Wb, 'r'))} (held)`);
set('Heel height', 'setup', `Heels ${Math.round(heel(poses.table))} cm above the mat in tabletop`); set('Heel height', 'peak', `${rep.heel[0]} cm (light touch)`);
set('Pelvis and low back', 'setup', 'On the mat'); set('Pelvis and low back', 'peak', `Unchanged (pelvis moves ${rep.still} cm)`);
set('Tempo', 'setup', 'Tabletop 0.8 s'); set('Tempo', 'peak', '1.4 s down, 0.3 s touch, 1.2 s up, 0.9 s pause');
console.log(`90 degrees Heel Touch: wrote ${L.write(ex)} thighV ${thighV} tapHip ${tapHip}\n  ${JSON.stringify(rep)}`);
C.guard('90-degrees-heel-touch', rep, [rep.heel[0] < -0.4 && 'heels through the mat']);
