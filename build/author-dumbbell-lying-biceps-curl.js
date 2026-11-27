// Dumbbell Lying Biceps Curl (GymVisual #035012, lying supine curl): lying on the back on a flat bench (glutes, upper back
// and head on the pad; the batch 3 flat-bench lying base, measured on the skinned mesh), feet planted. The arms hang below
// the bench out to the sides (shoulders extended and a little abducted so the plates clear the floor on a 45 cm bench), palms
// toward the feet (supinated). Both forearms curl up about the elbow hinge toward the shoulders while the upper arms stay where
// they hang; short squeeze, slow lower, pause in the stretch. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const C3 = require('./families/b3-chest');
const B3 = require('./families/b3-back');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');
const meta = require('./meta/dumbbell-lying-biceps-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const { B, base: lie, contacts } = C3.benchBase(0);
const base = clone(lie);
base.ch.sc_r = { protract: 0, elevate: 0 }; base.ch.sc_l = { protract: 0, elevate: 0 };
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
// bottom: handle below and out from the shoulder, plates FLOOR cm above the floor, arm nearly straight
const FLOOR = ENV('FLOOR', 3), REACH = ENV('REACH', 60.5), DX = ENV('DX', 2);
const hy = FLOOR + 6, dy = S[1] - hy, dz = Math.sqrt(Math.max(0, REACH * REACH - dy * dy - DX * DX));
const axisB = [0, 0, 1];          // thumb out to the side: palm toward the feet
const p0 = K.handleArm(base, [S[0] + DX, hy, S[2] + dz], { axis: axisB, guesses: [[-30, 90, 0, 8, 0], [0, 100, 0, 8, 0], [-60, 80, 40, 8, 0]], contacts, minElev: 8 });
// top: the dumbbell finishes above the shoulder, a little toward the feet, at the end of a pure elbow hinge
const TGT = V.add(S, [ENV('TGX', 10), ENV('TGY', -2), ENV('TGZ', 14)]);
const keysR = K.hingeCurl(p0, { flexTop: ENV('FLEX', 128), target: TGT, axisB, FS, contacts, flexB: ENV('FLEXB', 8) });
const poses = {}, names = [];
keysR.forEach((q, i) => {
  if (process.env.DEBUG) console.log(FS[i], JSON.stringify([q.ch.shoulder_r, q.ch.elbow_r, q.ch.wrist_r]));
  delete q.__cost; K.mirrorArmTo(q); if (i) K.unwrapTo(q, poses[names[i - 1]]);
  poses[`c${i}`] = q; names.push(`c${i}`);
});
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
const props = [B.prop, ...C.dumbbells(['r', 'l'])];
const ex = K.assemble(meta, { contacts, poses, keyframes, props });
const boxes = B3.benchBoxes(B);
const rep = K.report(ex, { boxes });
const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.5 s down, 1.2 s pause in the stretch']);
const fit = C3.benchFit(B, Wb);
// upper arm below the bench line: angle of the upper arm below horizontal, and out from the trunk
const ua = V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p));
C.setKin(ex, 'Upper arm', 'setup', `≈${Math.round(Math.asin(-ua[1]) / R.DEG)}° below horizontal (below the bench line), ≈${Math.round(Math.atan2(ua[2], -ua[1]) / R.DEG)}° out from straight down`);
C.setKin(ex, 'Upper arm', 'peak', 'Unchanged: pure elbow hinge');
C.setKin(ex, 'Back on the bench', 'setup', 'Glutes, upper back and head on the pad (batch 3 flat-bench base; skinned mesh within about 1 cm)');
C.setKin(ex, 'Back on the bench', 'peak', 'Unchanged');
const tf = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Dumbbell Lying Biceps Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { fit, trunk: r1(tf), shoulder: S.map(r1) }))}`);
K.fail(rep, 'lying curl');
