// Dumbbell Lu Raise (GymVisual #23695; page not read, movement from the name): standing tall, feet hip width (planted),
// knees soft. The straight arms (soft, fixed elbows) rise out to the sides in the scapular plane (20 degrees in front of
// the frontal plane) from the sides all the way to overhead (about 165 degrees). Palms face in at the sides; the thumbs
// turn up as the arms pass shoulder height and lead the dumbbells overhead, so the palms face forward at the top. The
// shoulder blades rise and rotate up with the arms. Slow lowering by the same path. Bilateral, light dumbbells.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-lu-raise.json');
const ID = meta.exercise.id;

const PLANE = 20, E0 = 10, E1 = +(process.env.E1 || 155);
const st = F.standing({ stance: 12, knee: 6 });
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
const D2R = Math.PI / 180;
const keys = FS.map((f, i) => {
  const elev = G.lerp(E0, E1, f), w = Math.min(1, elev / 90);
  // thumb: forward at the sides, then along the direction the hand travels (tangent of the elevation arc)
  const tangent = () => { const e = elev * D2R, pl = PLANE * D2R; return [Math.cos(e) * Math.sin(pl), Math.sin(e), Math.cos(e) * Math.cos(pl)]; };
  return { name: i === 0 ? 'bottom' : i === FS.length - 1 ? 'top' : `r${i}`, plane: PLANE, elev: r1(elev), axial: r1(G.lerp(-10, -60, Math.min(1, f * 1.4))), flex: r1(12 + 4 * Math.sin(Math.PI * f)), pron: 90,
    sc: { protract: r1(2 + 3 * f), elevate: r1(G.lerp(0, 24, f * f)) }, thumb: () => G.blendDir([1, 0, 0], tangent(), w) };
});
const { poses, err } = G.raiseKeys(st.pose, keys, st.contacts);
const N = FS.length - 1;
const up = G.easeTimes(FS.slice(1), 0.6, 2.6), dn = G.easeTimes(FS.slice(1), 3.1, 5.6);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.6, pose: 'bottom' }, ...up.map((t, i) => ({ t, pose: keys[i + 1].name })), { t: 3.1, pose: 'top' },
  ...dn.map((t, i) => ({ t, pose: keys[N - 1 - i].name })), { t: 6.2, pose: 'bottom' }];
const ex = H.module_(meta, st.contacts, poses, keyframes);
const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const rep = K.scanHeld(ex, ['r', 'l'].map((side) => ({ side, grip: 'handle', size: SZ })));
F.gate(ID, rep);

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), W90 = L.fk(poses[keys[4].name], st.contacts);
const planeDeg = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / D2R; };
const set = H.setKin(ex), d = G.deg;
set('Shoulder abduction', 'setup', `${d(K.humElev(Wb))} (dumbbells at the sides)`); set('Shoulder abduction', 'peak', `${d(K.humElev(Wt))} overhead, hands ${Math.round(V.len(V.sub(Wt.wrist_r.p, Wt.wrist_l.p)))} cm apart`);
set('Plane of elevation', 'setup', `${d(planeDeg(W90))} in front of the frontal plane`); set('Plane of elevation', 'peak', 'Held');
set('Grip', 'setup', 'Palms facing in, thumbs forward'); set('Grip', 'peak', 'Thumbs up from shoulder height, palms forward overhead');
set('Elbow flexion', 'setup', d(K.elbowAng(Wb))); set('Elbow flexion', 'peak', d(K.elbowAng(Wt)));
set('Trunk', 'setup', 'Upright, knees soft'); set('Trunk', 'peak', 'Unchanged (no lean back)');
set('Tempo', 'setup', 'Pause 0.6 s at the sides'); set('Tempo', 'peak', '2.0 s up, 0.5 s overhead, 2.5 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, top: poses.top.ch.shoulder_r, ...rep })}`);
G.fail(ID, G.limits(poses));
