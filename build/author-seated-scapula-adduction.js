// Seated Scapula Adduction (GymVisual #691312): sitting tall on the end of a flat bench, feet flat (planted leg contacts).
// Elbows bent about 90 degrees with the upper arms about 35 degrees out from the sides, forearms forward, palms facing in.
// The shoulder blades squeeze back and together (clavicle retraction about 15-18 degrees, Oyama 2010) so the elbows travel
// back a little; 1.2 s in, 3 s hold, 1.2 s out. Bilateral, body weight only.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/seated-scapula-adduction.json');

const base = K.seatedFlat({ seatH: 45, stance: 16, hipFlex: 88, footAhead: 3 }); // rig v2: rig buttocks (= drawn body) rest on the seat
const P0 = clone(base.pose);
P0.ch.neck_c7 = { rot: 0, flex: 2 }; P0.ch.head_c1 = { rot: 0, flex: 0 };
const D2R = Math.PI / 180, ELEV = 35;
const dir = (e, pl) => [Math.sin(e * D2R) * Math.sin(pl * D2R), -Math.cos(e * D2R), Math.sin(e * D2R) * Math.cos(pl * D2R)];
// f = 0 relaxed (blades slightly forward), f = 1 squeezed; spine extends a touch with the squeeze
const KEYS = [0, 0.5, 1];
const poses = {}, err = {};
let g = { plane: 20, elev: ELEV, axial: -20, flex: 90, pron: 90 };
KEYS.forEach((f, i) => {
  const p = clone(P0);
  p.ch.sc_r = { protract: r1(4 - 20 * f), elevate: r1(-1 + 1 * f) };
  p.ch.spine_t6 = { rot: 0, flex: r1(1 - 3 * f), latFlex: 0 };
  const S = L.fk(p, base.contacts).shoulder_r.p;
  const pl = 22 - 30 * f, e = ELEV + 2 * f;
  const E = V.add(S, V.scale(dir(e, pl), L.UA - 0.05));
  const fwd = V.norm([1, 0.08, -0.12 - 0.05 * f]);
  const Wt = V.add(E, V.scale(fwd, L.FA - 0.3));
  const q = F.solveArm(p, { wrist: Wt, elbow: E, palm: V.norm([0, 0.15, -1]), wPalm: 4, guess: g });
  err[`s${i}`] = q.__err; g = F.armGuess(q); poses[`s${i}`] = F.mirrorArm(q);
});
const keyframes = [{ t: 0, pose: 's0' }, { t: 1.0, pose: 's0' }, { t: 1.6, pose: 's1' }, { t: 2.2, pose: 's2' }, { t: 5.2, pose: 's2' }, { t: 5.8, pose: 's1' }, { t: 6.4, pose: 's0' }, { t: 7.0, pose: 's0' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop];
const rep = K.scanHeld(ex, []);
F.gate('seated-scapula-adduction', rep);

const W0 = L.fk(poses.s0, base.contacts), W1 = L.fk(poses.s2, base.contacts);
const set = H.setKin(ex);
set('Shoulder blade retraction', 'setup', `clavicle protraction ${poses.s0.ch.sc_r.protract}° (relaxed)`); set('Shoulder blade retraction', 'peak', `${poses.s2.ch.sc_r.protract}° (${Math.abs(poses.s2.ch.sc_r.protract - poses.s0.ch.sc_r.protract)}° of retraction); shoulder joint moves back ${(W0.shoulder_r.p[0] - W1.shoulder_r.p[0]).toFixed(1)} cm`);
set('Arm position', 'setup', `elbow ≈${Math.round(K.elbowAng(W0))}°, upper arm ≈${Math.round(K.humElev(W0))}° from the trunk`); set('Arm position', 'peak', `elbows ${(W0.elbow_r.p[0] - W1.elbow_r.p[0]).toFixed(1)} cm further back`);
set('Trunk', 'setup', `upright on the bench (hip ${Math.round(poses.s0.ch.hip_r.flex)}°)`); set('Trunk', 'peak', 'unchanged');
set('Tempo', 'setup', 'Relax 1.0 s'); set('Tempo', 'peak', '1.2 s in, 3.0 s hold, 1.2 s out');
console.log(`Seated Scapula Adduction: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, root: base.pose.root, bench: base.bench.prop, ...rep })}`);
