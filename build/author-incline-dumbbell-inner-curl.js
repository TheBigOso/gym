// Incline Dumbbell Inner Curl (GymVisual #032212): seated on an adjustable bench with the back pad at 55 degrees, hips and
// upper back on the pad (the same mesh-measured seat as the incline curl), feet flat. The arms hang straight down out to the
// sides, turned out with the palms facing forward and out; both forearms curl up and out toward the outside of the
// shoulders with the elbows staying where they hang; short squeeze, slow lower, pause in the stretch. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/incline-dumbbell-inner-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANGLE = 55, SEAT = 32, WIDTH = 28, HINGE_X = -20;
// Mesh corrections (cm) measured on the Studio clay male for this bench and pad angle (batch 3 incline curl): the rig shapes
// sit this far off the pad/seat so the skinned mesh rests on them within about 1 cm
const OFF = { seatOff: -6.3, lowOff: -6.4, upOff: -2.9, headOff: -6 };
const b = D.bench({ x: HINGE_X + SEAT / 2, seat: SEAT, height: 45, width: WIDTH, angle: ANGLE, back: 80 }), pad = C.padFrame(b, WIDTH);
const S0 = C.seatOnBench(b, pad, Object.assign({ stance: 17, footDX: 33, headOn: false }, OFF));
const { contacts } = S0;
S0.pose.ch.neck_c7 = { rot: 0, flex: 2 }; S0.pose.ch.head_c1 = { rot: 0, flex: 14 };
const base = S0.pose;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
// curl plane: forward and out (OUT deg from straight ahead); thumb axis = down x fwd (palm faces along the curl)
const OUT = ENV('OUT', 40) * R.DEG, fwd = [Math.cos(OUT), 0, Math.sin(OUT)], down = [0, -1, 0];
const axis = V.norm(V.cross(down, fwd));
const S = L.fk(base, contacts).shoulder_r.p;
// bottom: arm hanging straight down, out to the side (AB cm out from the shoulder) and a little behind it
const AB = ENV('AB', 17), BX = ENV('BX', -6);
const reachDown = Math.sqrt(ENV('REACH', 61.5) ** 2 - AB * AB - BX * BX);
const p0 = K.handleArm(base, [S[0] + BX, S[1] - reachDown, S[2] + AB], { axis, guesses: [[-45, 50, 30, 8, 0]], contacts, minElev: 8 });
// pure elbow hinge: the humerus is turned out so the dumbbell finishes just outside and in front of the shoulder
const TGT = V.add(S, [ENV('TGX', 4), ENV('TGY', -2), ENV('TGZ', 15)]);
const A = { poses: K.hingeCurl(p0, { flexTop: ENV('FLEX', 128), target: TGT, axisB: axis, FS, contacts, flexB: ENV('FLEXB', 8) }) };
const poses = {}, names = [];
A.poses.forEach((q, i) => {
  if (process.env.DEBUG) { const W = L.fk(q, contacts); console.log(FS[i], (q.__cost || 0).toFixed(3), q.__H ? V.len(V.sub(D.dumbbellAt(W, 'r', 'handle').c, q.__H)).toFixed(2) : '-', JSON.stringify([q.ch.shoulder_r, q.ch.elbow_r, q.ch.wrist_r])); }
  delete q.__cost; delete q.__H; K.mirrorArmTo(q); if (i) K.unwrapTo(q, poses[names[i - 1]]);
  poses[`c${i}`] = q; names.push(`c${i}`);
});
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const props = [b.prop, ...C.dumbbells(['r', 'l'])];
const ex = K.assemble(meta, { contacts, poses, keyframes, props });
const seatBox = { center: b.prop.center, size: b.prop.size };
const rep = C.loopCheck(ex, { benchBox: seatBox });
const tl = L.R.buildTimeline(ex); let padDb = 1e9, padArm = 1e9;
for (let i = 0; i <= 300; i++) { const W = L.R.evalPose(L.rig, tl.pose((i / 300) * meta.timeline.duration), contacts); for (const s of ['r', 'l']) { padDb = Math.min(padDb, C.benchClearance(W, s, pad, seatBox)); padArm = Math.min(padArm, C.armPadClearance(W, s, pad)); } }
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.5 s down, 1.2 s pause in the stretch']);
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
C.setKin(ex, 'Back pad angle', 'setup', `${ANGLE}° from the floor (trunk line ≈${Math.round(trunk)}° back from vertical)`);
C.setKin(ex, 'Back pad angle', 'peak', 'Unchanged (the trunk stays on the pad)');
// upper arm out from the trunk midline plane: angle between the upper arm and the trunk's sagittal plane
const abd = (W) => Math.round(Math.asin(Math.min(1, Math.abs(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p))[2]))) / R.DEG);
C.setKin(ex, 'Arm abduction', 'setup', `Upper arm ≈${abd(Wb)}° out from the sagittal plane, turned out (palms forward and out)`);
C.setKin(ex, 'Arm abduction', 'peak', `≈${abd(Wt)}° (elbows stay out); forearms curl ${Math.round(OUT / R.DEG)}° out from straight ahead`);
console.log(`Incline Dumbbell Inner Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { padDb, padArm, trunk: r1(trunk), m: S0.measure(Wb) }))}`);
K.fail(rep, 'incline inner curl', [[padDb >= 0 && padArm >= 0, `dumbbell or arm into the pad (${padDb}, ${padArm})`], [rep.bench > 0, 'dumbbell into the seat']]);
