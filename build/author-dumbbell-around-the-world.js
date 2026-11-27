// Dumbbell Around the World, standing (GymVisual #656312, bodyweight standing version; dumbbells added here): standing tall,
// feet hip width (planted leg contacts), light dumbbells in front of the thighs with the palms facing forward. Nearly
// straight arms sweep out to the sides (palms turning up at shoulder height) and on overhead until the dumbbells meet above
// the head (palms facing each other), then the arc reverses back down: 2 s up, 0.4 s overhead, 2 s down. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/dumbbell-around-the-world.json');

const base = F.standing({ stance: 12, knee: 6 });
const slerp = (a, b, t) => { const om = Math.acos(Math.max(-1, Math.min(1, V.dot(V.norm(a), V.norm(b))))); if (om < 1e-4) return V.norm(a); const s = Math.sin(om); return V.norm(V.add(V.scale(V.norm(a), Math.sin((1 - t) * om) / s), V.scale(V.norm(b), Math.sin(t * om) / s))); };
const path = (pts, u) => { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(u * n)); return slerp(pts[k], pts[k + 1], u * n - k); };
const D2R = Math.PI / 180;
// arm direction from the shoulder, elbow-tip direction (hint) and palm direction at the bottom, side and top of the arc
const ARM = [[Math.sin(20 * D2R), -Math.cos(20 * D2R), 0.02], [0.32, -0.05, 1], [0.05, 1, -0.08]];
const ELB = [[-1, 0, 0.1], [0.1, -1, 0], [0, 0.1, 1]];
const PALM = [[1, 0, 0.05], [0, 1, 0.1], [0.05, 0.1, -1]];
const FLEX = 14;
const US = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const poses = {}, err = {};
let g = { plane: 90, elev: 20, axial: -40, flex: FLEX, pron: 90 };
US.forEach((u, i) => {
  const p = clone(base.pose);
  p.ch.sc_r = { protract: r1(2 + 2 * u), elevate: r1(16 * u * u) };
  const S = L.fk(p, base.contacts).shoulder_r.p;
  const Wt = V.add(S, V.scale(path(ARM, u), L.reach(FLEX) * 0.998));
  const E = F.elbowFor(S, Wt, path(ELB, u));
  const q = F.solveArm(p, { wrist: Wt, elbow: E, palm: path(PALM, u), wPalm: 4, guess: g });
  err[`a${i}`] = q.__err; g = F.armGuess(q); poses[`a${i}`] = F.mirrorArm(q);
});
const N = US.length - 1;
const up = K.easeTimes(US.slice(1), 0.6, 2.6), down = K.easeTimes(US.slice(1), 3.0, 5.0);
const keyframes = [{ t: 0, pose: 'a0' }, { t: 0.6, pose: 'a0' }, ...up.map((t, i) => ({ t, pose: `a${i + 1}` })), { t: 3.0, pose: `a${N}` }, ...down.map((t, i) => ({ t, pose: `a${N - 1 - i}` })), { t: 5.6, pose: 'a0' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = F.scan(ex);
F.gate('dumbbell-around-the-world', rep, { maxJump: 6 });

const Wb = L.fk(poses.a0, base.contacts), Wm = L.fk(poses.a4, base.contacts), Wt = L.fk(poses[`a${N}`], base.contacts);
const planeDeg = (W) => { const v = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.round(Math.atan2(v[0], v[2]) / D2R); };
const set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(K.humElev(Wb))}° (dumbbells in front of the thighs)`); set('Shoulder elevation', 'peak', `≈${Math.round(K.humElev(Wt))}° overhead (hands ${Math.round(Wt.wrist_r.p[2] - Wt.wrist_l.p[2])} cm apart at the wrists)`);
set('Plane of elevation', 'setup', 'arms in front (flexion plane)'); set('Plane of elevation', 'peak', `≈${planeDeg(Wm)}° in front of the frontal plane at shoulder height`);
set('Humeral rotation', 'setup', 'palms forward'); set('Humeral rotation', 'peak', 'palms up at shoulder height, facing each other overhead');
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Tempo', 'setup', 'Pause 0.6 s at the thighs'); set('Tempo', 'peak', '2.0 s up, 0.4 s overhead, 2.0 s down');
console.log(`Dumbbell Around the World: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
