// Dumbbell Prone Incline Curl (GymVisual #037412): adjustable bench with the back pad at 45 degrees. Straddle the seat and lie
// chest-down on the pad, chin just over the top, balls of the feet planted behind (the batch 3 chest-supported row setup).
// The arms hang straight down outside the pad, palms forward (supinated); both forearms curl about the elbow hinge toward
// the shoulders while the upper arms stay vertical; short squeeze, slow lower. Bilateral.
// The same builder makes the spider curl (lower pad, shoulders at the top edge): see author-dumbbell-spider-curl.js.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-curls');
const B3 = require('./families/b3-back');
const K = require('./families/b4-curls2');
const D = require('./families/dumbbell');

const ENV = (k, d) => +(process.env[k] ?? d);
module.exports = function chestPadCurl(meta, { label, ang, along, foot, hangOut = 3, flexTop = 128, tgt = [6, 0, 2], neck = -14, head = -16, knee, hip }) {
  const P = K.chestOnPad({ ang, along, foot, neck, head, knee, hip });
  const { bench, contacts, body } = P;
  const base = clone(body);
  for (const s of ['r', 'l']) base.ch[`sc_${s}`] = { protract: 4, elevate: 0 };
  const W0 = L.fk(base, contacts), S = W0.shoulder_r.p;
  const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
  // bottom: the arm hangs straight down from the shoulder, a little out so it clears the pad edge
  const reach = ENV('REACH', 61.3), axisB = [0, 0, 1];
  const p0 = K.handleArm(base, [S[0] + ENV('HX', 0.5), S[1] - Math.sqrt(reach * reach - hangOut * hangOut), S[2] + hangOut], { axis: axisB, guesses: [[60, 75, 20, 8, 0], [90, 60, 0, 8, 0], [30, 80, 40, 8, 0]], contacts, minElev: 8 });
  // top: pure elbow hinge, the dumbbell finishing in front of the shoulder
  const keysR = K.hingeCurl(p0, { flexTop, target: V.add(S, tgt), axisB, FS, contacts, flexB: process.env.FLEXB ? +process.env.FLEXB : null });
  const poses = {}, names = [];
  keysR.forEach((q, i) => {
    if (process.env.DEBUG) console.log(FS[i], JSON.stringify([q.ch.shoulder_r, q.ch.elbow_r, q.ch.wrist_r]));
    delete q.__cost; K.mirrorArmTo(q); B3.wrapPose(q); if (i) K.unwrapTo(q, poses[names[i - 1]]);
    poses[`c${i}`] = q; names.push(`c${i}`);
  });
  const top = names[names.length - 1];
  poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
  const ph = (id) => C.phase(meta, id);
  const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
  const props = [bench.prop, ...C.dumbbells(['r', 'l'])];
  const ex = K.assemble(meta, { contacts, poses, keyframes, props });
  const rep = K.report(ex, { boxes: P.boxes });
  const sw = B3.sweep(ex, { held: [{ side: 'r', grip: 'handle', size: D.DB }, { side: 'l', grip: 'handle', size: D.DB }], fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes: P.boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] }, 400);
  const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
  C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.3 s down, 1.0 s at the bottom']);
  const ua = V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p));
  C.setKin(ex, 'Upper arm', 'setup', `≈${Math.round(V.angle(ua, [0, -1, 0]))}° from vertical (hanging); ≈${Math.round(C.upperArmFromTrunk(Wb, 'r'))}° from the trunk line (shoulder flexed)`);
  C.setKin(ex, 'Upper arm', 'peak', 'Unchanged: pure elbow hinge');
  C.setKin(ex, 'Bench angle', 'setup', `${ang}° back pad (80 cm), seat 45 cm`);
  C.setKin(ex, 'Bench angle', 'peak', `Trunk ≈${Math.round(90 - B3.trunkLean(Wb))}° above horizontal, along the pad`);
  C.setKin(ex, 'Chest on the pad', 'setup', `Chest on the pad; head ${r1(P.along(Wb, 'head_c1') - P.PAD)} cm past the top edge, shoulders ${r1(P.along(Wb, 'shoulder_r') - P.PAD)} cm`);
  C.setKin(ex, 'Chest on the pad', 'peak', 'Unchanged (the trunk does not move)');
  const tf = B3.trunkLean(Wb);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
  console.log(`${label}: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { sw: { dbBox: sw.dbBox, bodyBox: sw.bodyBox, bodyBoxAt: sw.bodyBoxAt, drift: sw.drift }, trunk: r1(tf), shoulder: S.map(r1), knee: sw.kneeR }))}`);
  K.fail(rep, label, [[sw.drift < 0.05, 'pelvis or feet drift'], [sw.dbBox >= 0, 'dumbbell into the bench']]);
  return ex;
};
if (require.main === module) module.exports(require('./meta/dumbbell-prone-incline-curl.json'), { label: 'Dumbbell Prone Incline Curl', ang: 45, along: ENV('SA', 22), foot: [ENV('FX', -50), 26] });
