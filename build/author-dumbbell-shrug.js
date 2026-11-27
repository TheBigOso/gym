// Dumbbell Shrug (GymVisual #040612): standing tall, feet hip width, a dumbbell in each hand at the sides (neutral grip).
// The shoulder girdles elevate straight up (sc elevate about 25 degrees, about 7 cm), hold 1 s, lower slowly to a slight
// stretch. Arms stay long and hang straight down; both feet planted. Bilateral.
// Rig note: elevating the clavicle tilts the hanging arm outward; the shoulder re-solves each key so the hands stay under
// the shoulders (the rig's shoulder plane limit leaves about 4 cm of outward drift and a slight elbow bend at the top).
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const meta = require('./meta/dumbbell-shrug.json');

const F = makeFamily({ toe: 6, half: 10 });
const SIZE = [32, 12, 12];
const spec = F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 4 });
const p0 = F.pose(spec);
const S0 = L.fk(p0).shoulder_r.p, HANG = L.reach(6), FX = 6, ZOUT = 9;
// dumbbells hang just in front of the shoulders and beside the thighs; the hand target follows the shoulder straight up
const base = [S0[0] + FX, S0[1] - Math.sqrt(HANG * HANG - FX * FX - ZOUT * ZOUT), S0[2] + ZOUT];
let guess = [30, 12, 0, 6, 60];
function at(elev) {
  const p = clone(p0);
  p.ch.sc_r = { protract: 0, elevate: r1(elev) }; p.ch.sc_l = { ...p.ch.sc_r };
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  const S = L.fk(p).shoulder_r.p;
  const q = B.holdArm(p, [base[0], base[1] + (S[1] - S0[1]), base[2]], { palm: [0, 0, -1], axis: [1, 0, 0], tw: [3, 3, 0.4], axialW: 0.05,
    guesses: [guess], extra: [L.obj.reg('ch.elbow_r.flex', 6, 0.5)] });
  guess = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron]; // continuous branch
  return B.mirrorArm(q);
}
// The shoulder plane turns from abduction toward flexion as the clavicle rises: keys every ~3.6 degrees follow the path.
const LOW = -3, HIGH = 28, N = 8;
const poses = {}, names = [];
for (let i = 0; i <= N; i++) { const n = `e${i}`; poses[n] = at(LOW + (HIGH - LOW) * i / N); names.push(n); }
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const keyframes = [{ t: 0, pose: 'e0' }];
const T0 = 0.8, T1 = 1.8, T2 = 2.8, T3 = 4.3, D = 5.0;
for (let i = 0; i <= N; i++) keyframes.push({ t: +(T0 + (T1 - T0) * inv(i / N)).toFixed(3), pose: names[i] });
for (let i = N; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv((N - i) / N)).toFixed(3), pose: names[i] });
keyframes.push({ t: D, pose: 'e0' });
poses.down = poses.e0; poses.up = poses[`e${N}`];
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const held = [{ side: 'r', grip: 'handle', size: { length: SIZE[0], diameter: SIZE[1] } }, { side: 'l', grip: 'handle', size: { length: SIZE[0], diameter: SIZE[1] } }];
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const Wd = F.fk(poses.down), Wu = F.fk(poses.up);
const rise = Wu.shoulder_r.p[1] - Wd.shoulder_r.p[1], handRise = Wu.wrist_r.p[1] - Wd.wrist_r.p[1], drift = Wu.wrist_r.p[2] - Wd.wrist_r.p[2];
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Shoulder girdle', 'setup', `Clavicle ${LOW}° (slight stretch)`); set('Shoulder girdle', 'peak', `Clavicle +${HIGH}°: shoulders rise ≈${r1(rise)} cm, dumbbells ≈${r1(handRise)} cm`);
set('Arm position', 'setup', `Arms hang by the sides, elbows ≈${Math.round(B.elbowOf(Wd, 'r'))}°`); set('Arm position', 'peak', `Elbows ≈${Math.round(B.elbowOf(Wu, 'r'))}°, hands ${r1(drift)} cm wider`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.0 s up, 1.0 s hold, 1.5 s down, 0.7 s reset');
console.log(`Dumbbell Shrug: wrote ${L.write(ex)}\n  rise ${r1(rise)} cm, hands ${r1(handRise)} cm, drift ${r1(drift)} cm; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < 0) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
