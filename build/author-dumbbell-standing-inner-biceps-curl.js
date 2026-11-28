// Dumbbell Standing Inner Biceps Curl (GymVisual #13786, page not readable here): standing tall, feet about hip width
// (planted leg contacts). The arms hang straight a little out from the sides, turned out with the palms facing forward
// and out; both forearms curl up and out toward the outside of the shoulders while the elbows stay where they hang (pure
// elbow hinge with the humerus turned out); short squeeze, slow lower, short pause. Same arm solve as the incline inner
// curl (b4-curls2 handleArm / hingeCurl) on the standing base of the batch 3 curls. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const meta = require('./meta/dumbbell-standing-inner-biceps-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ST = C.standing({}, { stance: 11, toeOut: 8 });
const { contacts } = ST, base = ST.base;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
// curl plane: forward and out (OUT deg from straight ahead); thumb axis = down x fwd (palm faces along the curl)
const OUT = ENV('OUT', 40) * R.DEG, fwd = [Math.cos(OUT), 0, Math.sin(OUT)], down = [0, -1, 0];
const axis = V.norm(V.cross(down, fwd));
const S = L.fk(base, contacts).shoulder_r.p;
// bottom: arm hanging straight down, out to the side (AB cm out from the shoulder), level with it front to back
const AB = ENV('AB', 16), BX = ENV('BX', 1);
const reachDown = Math.sqrt(ENV('REACH', 61.5) ** 2 - AB * AB - BX * BX);
const p0 = K.handleArm(base, [S[0] + BX, S[1] - reachDown, S[2] + AB], { axis, guesses: [[-45, 50, 30, 8, 0], [20, 20, -20, 8, 0]], contacts, minElev: 8 });
// pure elbow hinge: the humerus is turned out so the dumbbell finishes just outside and in front of the shoulder
const TGT = V.add(S, [ENV('TGX', 9), ENV('TGY', -4), ENV('TGZ', 14)]);
const A = { poses: K.hingeCurl(p0, { flexTop: ENV('FLEX', 128), target: TGT, axisB: axis, FS, contacts, flexB: ENV('FLEXB', 8) }) };
const poses = {}, names = [];
A.poses.forEach((q, i) => {
  if (process.env.DEBUG) console.log(FS[i], (q.__cost || 0).toFixed(3), JSON.stringify([q.ch.shoulder_r, q.ch.elbow_r, q.ch.wrist_r]));
  delete q.__cost; delete q.__H; K.mirrorArmTo(q); if (i) K.unwrapTo(q, poses[names[i - 1]]);
  poses[`c${i}`] = q; names.push(`c${i}`);
});
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const ex = K.assemble(meta, { contacts, poses, keyframes, props: C.dumbbells(['r', 'l']) });
const rep = C.loopCheck(ex);
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.5 s down, 1.2 s pause at the bottom']);
const abd = (W) => Math.round(Math.asin(Math.min(1, Math.abs(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p))[2]))) / R.DEG);
C.setKin(ex, 'Arm abduction', 'setup', `Upper arm ≈${abd(Wb)}° out from the sagittal plane, turned out (palms forward and out)`);
C.setKin(ex, 'Arm abduction', 'peak', `≈${abd(Wt)}° (elbows stay out); forearms curl ${Math.round(OUT / R.DEG)}° out from straight ahead`);
C.setKin(ex, 'Stance', 'setup', 'Standing tall, feet hip width, knees soft'); C.setKin(ex, 'Stance', 'peak', 'Unchanged (trunk and legs still)');
console.log(`Dumbbell Standing Inner Biceps Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  bottom ${JSON.stringify(poses.c0.ch.shoulder_r)} top ${JSON.stringify(poses.squeeze.ch.shoulder_r)} ${JSON.stringify(poses.squeeze.ch.wrist_r)}`);
K.fail(rep, 'standing inner curl');
