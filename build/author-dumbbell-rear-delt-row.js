// Dumbbell Rear Delt Row (GymVisual #037712): feet hip width (planted leg contacts), soft knees, hip hinge with a flat back
// until the trunk is about 20 degrees above horizontal; dumbbells hang under the shoulders with a pronated grip (palms
// facing back). The elbows pull up and out wide, about 80 degrees from the trunk, until the upper arms are level with the
// back and the elbows are bent about 90 degrees (forearms stay about vertical), with the shoulder blades squeezing together:
// 1.2 s up, 0.4 s squeeze, 2 s down. The hinge is held still. Bilateral, a dumbbell in each hand (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/dumbbell-rear-delt-row.json');

const TRUNK = 20;
const base = F.hinge({ stance: 13, knee: 24, trunk: TRUNK });
const slerp = (a, b, t) => { const om = Math.acos(Math.max(-1, Math.min(1, V.dot(a, b)))); if (om < 1e-4) return a; const s = Math.sin(om); return V.add(V.scale(a, Math.sin((1 - t) * om) / s), V.scale(b, Math.sin(t * om) / s)); };
const DOWN = V.norm([0.03, -1, 0.15]), OUT = V.norm([0.18, 0.06, 1]);
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {}, err = {};
let g = { plane: 60, elev: 70, axial: 30, flex: 10, pron: 160 };
FS.forEach((f, i) => {
  const p = clone(base.pose);
  p.ch.sc_r = { protract: r1(6 - 22 * f), elevate: r1(-1 + 2 * f) };
  const S = L.fk(p, base.contacts).shoulder_r.p;
  const ud = V.norm(slerp(DOWN, OUT, f * f * (3 - 2 * f) * 0.4 + f * 0.6));
  const E = V.add(S, V.scale(ud, L.UA - 0.05));
  const fd = V.norm([0.06, -1, 0.02 * (1 - f) - 0.04 * f]);
  const Wt = V.add(E, V.scale(fd, L.FA - 0.3));
  const q = F.solveArm(p, { wrist: Wt, elbow: E, palm: [-1, 0, 0], wPalm: 4, guess: g });
  err[`r${i}`] = q.__err; g = F.armGuess(q); poses[`r${i}`] = F.mirrorArm(q);
});
poses.sq = clone(poses.r5); poses.sq.ch.sc_r.protract = poses.sq.ch.sc_l.protract = r1(poses.r5.ch.sc_r.protract - 2);
const up = K.easeTimes(FS.slice(1), 0.8, 2.0), down = K.easeTimes(FS.slice(1), 2.4, 4.4);
const keyframes = [{ t: 0, pose: 'r0' }, { t: 0.8, pose: 'r0' }, ...up.map((t, i) => ({ t, pose: `r${i + 1}` })), { t: 2.2, pose: 'sq' }, { t: 2.4, pose: 'r5' },
  ...down.map((t, i) => ({ t, pose: `r${4 - i}` })), { t: 5.2, pose: 'r0' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = F.scan(ex);
F.gate('dumbbell-rear-delt-row', rep);

const Wb = L.fk(poses.r0, base.contacts), Wt = L.fk(poses.r5, base.contacts);
const trunkUp = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) * 180 / Math.PI;
const flare = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.neck_c7.p, W.pelvis.p));
const set = H.setKin(ex);
set('Trunk inclination', 'setup', `≈${Math.round(trunkUp(Wb))}° above horizontal`); set('Trunk inclination', 'peak', 'unchanged (held)');
set('Elbow flare', 'setup', 'arms hanging under the shoulders'); set('Elbow flare', 'peak', `upper arm ≈${Math.round(flare(Wt))}° from the trunk line (head direction), elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm from shoulder height`);
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Grip', 'setup', 'pronated, palms facing back'); set('Grip', 'peak', 'pronated (held)');
set('Knee flexion', 'setup', `≈${Math.round(rep.kneeR[0])}°`); set('Knee flexion', 'peak', 'unchanged');
set('Tempo', 'setup', 'Hold the hinge 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.4 s squeeze, 2.0 s down');
console.log(`Dumbbell Rear Delt Row: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
