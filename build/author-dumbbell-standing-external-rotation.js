// Dumbbell Standing External Rotation, 90/90 (GymVisual #723412): standing tall, feet hip width (planted leg contacts).
// The right upper arm is held out at shoulder height, 25 degrees in front of the frontal plane (scapular plane), elbow bent
// 90 degrees. The forearm turns about the upper arm from pointing forward (palm down) to pointing at the ceiling (palm
// forward) while the elbow stays put: 1.8 s up, 0.5 s at the top, 2.1 s down. The left arm hangs relaxed. Authored right.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/dumbbell-standing-external-rotation.json');

const base = F.standing({ stance: 12, knee: 6 });
const P0 = clone(base.pose);
P0.ch.sc_r = { protract: 0, elevate: 3 };
P0.ch.shoulder_l = { plane: 10, elev: 8, axial: 10 }; P0.ch.elbow_l = { flex: 12 }; P0.ch.wrist_l = { pron: 80, flex: 0, dev: 0 };
const D2R = Math.PI / 180, PLANE = 25, ELEV = 88;
const S = L.fk(P0, base.contacts).shoulder_r.p;
const u = [Math.sin(ELEV * D2R) * Math.sin(PLANE * D2R), -Math.cos(ELEV * D2R), Math.sin(ELEV * D2R) * Math.cos(PLANE * D2R)];
const E = V.add(S, V.scale(u, L.UA - 0.05));
const h = V.norm(V.cross([0, 1, 0], u)); // forward, perpendicular to the upper arm
const upP = V.norm(V.sub([0, 1, 0], V.scale(u, u[1]))); // up, perpendicular to the upper arm
const ROT = [0, 22, 45, 68, 90]; // external rotation (deg) at each key
const poses = {}, err = {};
let g = { plane: PLANE, elev: ELEV, axial: 0, flex: 90, pron: 90 };
ROT.forEach((phi, i) => {
  const c = Math.cos(phi * D2R), s = Math.sin(phi * D2R);
  const d = V.add(V.scale(h, c), V.scale(upP, s)), palm = V.add(V.scale(upP, -c), V.scale(h, s));
  const Wt = V.add(E, V.scale(d, L.FA - 0.3));
  const q = F.solveArm(P0, { wrist: Wt, elbow: E, palm, wPalm: 5, guess: g });
  err[`r${i}`] = q.__err; delete q.__err; g = F.armGuess(q); poses[`r${i}`] = q;
});
const up = K.easeTimes([0.25, 0.5, 0.75, 1], 0.6, 2.4), down = K.easeTimes([0.25, 0.5, 0.75, 1], 2.9, 5.0);
const keyframes = [{ t: 0, pose: 'r0' }, { t: 0.6, pose: 'r0' }, ...up.map((t, i) => ({ t, pose: `r${i + 1}` })), { t: 2.9, pose: 'r4' }, ...down.map((t, i) => ({ t, pose: `r${3 - i}` })), { t: 5.6, pose: 'r0' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
const rep = K.scanHeld(ex, [{ side: 'r', grip: 'handle' }]);
F.gate('dumbbell-standing-external-rotation', rep);

const Wb = L.fk(poses.r0, base.contacts), Wt = L.fk(poses.r4, base.contacts);
const foreUp = (W) => Math.round(Math.asin(V.norm(V.sub(W.wrist_r.p, W.elbow_r.p))[1]) / D2R);
const planeDeg = (W) => { const v = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.round(Math.atan2(v[0], v[2]) / D2R); };
const set = H.setKin(ex);
set('Shoulder abduction', 'setup', `≈${Math.round(K.humElev(Wb))}° (elbow ${Math.round(Wb.elbow_r.p[1] - Wb.shoulder_r.p[1])} cm from shoulder height)`); set('Shoulder abduction', 'peak', `≈${Math.round(K.humElev(Wt))}° (held)`);
set('Plane of elevation', 'setup', `≈${planeDeg(Wb)}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${planeDeg(Wt)}°`);
set('External rotation', 'setup', `forearm ${foreUp(Wb)}° from horizontal (forward, palm down)`); set('External rotation', 'peak', `forearm ${foreUp(Wt)}° from horizontal (vertical, palm forward); elbow moves ${V.len(V.sub(Wt.elbow_r.p, Wb.elbow_r.p)).toFixed(1)} cm`);
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Tempo', 'setup', 'Pause 0.6 s, forearm level'); set('Tempo', 'peak', '1.8 s up, 0.5 s at the top, 2.1 s down');
console.log(`Dumbbell Standing External Rotation: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, axial: [poses.r0.ch.shoulder_r.axial, poses.r4.ch.shoulder_r.axial], ...rep })}`);
