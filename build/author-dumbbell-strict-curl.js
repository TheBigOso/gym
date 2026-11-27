// Dumbbell Strict Curl (wall curl; GymVisual #1199712 is the nearest catalog match, an alternating hammer version): standing
// with the glutes, upper back and head against a wall, heels a few centimetres forward. The upper arms hang a little behind
// the trunk so the backs of the elbows touch the wall; both arms curl (palms forward/up) with the elbows staying on the wall,
// short squeeze, slow lower. The wall face is placed from the skinned mesh (measured in the player). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/dumbbell-strict-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
// Wall face x (rig cm). Measured on the Studio clay male in this pose: the rearmost mesh points are the upper back at
// x ≈ WALL + 0.2 and the glutes / back of the head within about 1 cm (see the report); the elbows are placed to touch it.
const WALL = ENV('WALL', -8.5);
const EX = ENV('EX', -7.0), EZ = ENV('EZ', 22.5); // elbow joint target: the back of the skinned elbow on the wall face
const { contacts, base } = C.standing({}, { sc: { protract: -6, elevate: 0 } });
base.ch.neck_c7 = { rot: 0, flex: ENV('NECK', -20) }; base.ch.head_c1 = { rot: 0, flex: ENV('HEAD', 19) };
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const axis = [0, 0, 1];
// bottom: arm straight down from the elbow on the wall, handle beside the thigh
const S = L.fk(base, contacts).shoulder_r.p, E = [EX, 0, EZ];
const ua = V.len(L.rig.byId.elbow_r.offset); E[1] = S[1] - Math.sqrt(ua * ua - (E[0] - S[0]) ** 2 - (E[2] - S[2]) ** 2);
const A = K.arcCurl(base, { handle0: [EX + ENV('HX', 6), E[1] - 30.5, EZ + 4.5], axis, flex1: ENV('FLEX', 118), drift: [0, 0, 0], FS, contacts, elbow0: E, elbow0W: 2, guess: [-40, 12, 40, 8, 0] });
const poses = {}, names = [];
A.poses.forEach((p, i) => {
  if (process.env.DEBUG) { const W = L.fk(p, contacts); console.log(FS[i], (p.__cost || 0).toFixed(3), W.elbow_r.p.map(r1), JSON.stringify([p.ch.shoulder_r, p.ch.elbow_r, p.ch.wrist_r])); }
  delete p.__cost; delete p.__H; K.mirrorArmTo(p); if (i) K.unwrapTo(p, poses[names[i - 1]]);
  poses[`c${i}`] = p; names.push(`c${i}`);
});
const top = names[names.length - 1];
poses.squeeze = L.clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const wall = { id: 'wall', kind: 'wall', center: [r1(WALL - 5), 0, 0], size: [10, 200, 160] };
const ex = K.assemble(meta, { contacts, poses, keyframes, props: [wall, ...C.dumbbells(['r', 'l'])] });
const rep = K.report(ex, { boxes: [K.wallBox(wall)], armBoxes: true, skip: ['thigh_r', 'thigh_l', 'quad_r', 'quad_l', 'buttock_r', 'buttock_l'] });
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
C.setKin(ex, 'Back on the wall', 'setup', `Wall face ${r1(-WALL)} cm behind the pelvis centre; heels ≈${r1(L.fk(base, contacts).ankle_r.p[0] - 6 - WALL)} cm from the wall`);
C.setKin(ex, 'Back on the wall', 'peak', 'Unchanged: trunk and elbows stay on the wall (mesh gaps in the report)');
const elbowDrift = V.len(V.sub(Wb.elbow_r.p, Wt.elbow_r.p));
console.log(`Dumbbell Strict Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { elbowDrift: r1(elbowDrift), elbow: Wb.elbow_r.p.map(r1) }))}`);
K.fail(rep, 'strict curl', [[elbowDrift < 1.5, 'elbow leaves the wall']]);
