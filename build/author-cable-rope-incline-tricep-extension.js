// Cable Rope Incline Tricep Extension (GymVisual 3737, animated GIF; movement reference only, page not readable): back
// pad at 30 degrees with its top end toward a low pulley, seat flat, glutes in the crease, upper back and head on the
// pad, feet planted (leg contacts). A rope (cable attachment 'rope', two hands, palms facing each other) in both hands.
// The upper arms point straight up (3 degrees back toward the pulley) and stay still (constant shoulder channels) while only the
// elbows bend, the rope ends travelling back beside and behind the head, then straighten. The cable runs from the low
// pulley behind the bench, past the top of the pad, to the rope. Bilateral (right arm solved, left mirrored; the arms move
// in sagittal planes so the grip width is constant). Built like author-incline-dumbbell-triceps-extension.js (b3-chest.js
// bench base, b4-benchpress.js extArm).
const L = require('./lib');
const { V, R, r1 } = L;
const CH = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B5 = require('./families/b5-cablepull');
const meta = require('./meta/cable-rope-incline-tricep-extension.json');

const ID = 'cable-rope-incline-tricep-extension';
const ANGLE = 30, BACK = +(process.env.BACK ?? 3), FLEX_TOP = 8, FLEX_BOT = +(process.env.FLEXB ?? 100), N = 4;
const T = CH.phaseT(meta), { B, base, contacts, foot } = CH.benchBase(ANGLE);
const W0 = L.fk(base, contacts);
// upper arm: tilted BACK degrees behind vertical (toward the head); forearm folds toward the head in the sagittal plane
const b = BACK * R.DEG, ua = [-Math.sin(b), Math.cos(b), 0], fa = [-Math.cos(b), Math.sin(b), 0];
const keyAt = (f) => CH.mirrorArm(P.extArm(base, ua, fa, FLEX_TOP + (FLEX_BOT - FLEX_TOP) * f, [0, 0, -1]));
const path = []; for (let i = 0; i <= N; i++) { const q = keyAt(i / N); path.push({ f: 1 - i / N, pose: CH.strip(q), cost: q.__cost }); }
path.reverse();
const settle = CH.strip(keyAt(0.985));
const { poses, keyframes } = CH.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
// low pulley behind the top end of the pad, in line with the forearms at mid range
const padTop = V.add(B.hinge, V.scale(B.padDir, 80));
const ANCHOR = [r1(padTop[0] - +(process.env.BEHIND ?? 60)), +(process.env.AY ?? 45), 0];
ex.props.push(EQ.cableTower(ANCHOR, { offset: [-12, 0] }), { id: 'rope', kind: 'cable', attachment: 'rope', anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } });

// loop checks: feet, floor, grip width, cable line and rope strands clear of the body, hands clear of the head and pad,
// cable clear of the pad (points over the pad's footprint must be above its surface or well below the slab)
const knot = (W) => EQ.attachPoint(W, { two: true, rope: true, anchor: ANCHOR });
const rep = C.scan(ex, { line: (W) => [ANCHOR, knot(W)] });
let ropeClr = { d: 1e9 }, handClr = { d: 1e9 }, padLine = 1e9, padHand = 1e9, uaDev = 0;
const padH = (p) => V.dot(B.padN, p) - B.padD, along = (p) => V.dot(V.sub(p, B.hinge), B.padDir);
H.loopReport(ex, { probe: (W, pz, t) => {
  const rc = B5.ropeClear(W, ANCHOR); if (rc.d < ropeClr.d) ropeClr = { d: +rc.d.toFixed(2), id: rc.id, t: +t.toFixed(2) };
  for (const s of ['r', 'l']) {
    const gp = EQ.gripPoint(W, s).p;
    for (const id of ['head', 'hair', 'ear_r', 'ear_l', 'neck']) { const d = EQ.pointShape(W, gp, id) - 3; if (d < handClr.d) handClr = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; }
    if (along(gp) < 82 && Math.abs(gp[2]) < 18) padHand = Math.min(padHand, padH(gp) - 3);
  }
  const k = knot(W);
  for (let i = 0; i <= 30; i++) { const q = V.add(ANCHOR, V.scale(V.sub(k, ANCHOR), i / 30)), s = along(q); if (s > -2 && s < 82 && Math.abs(q[2]) < 16) { const h = padH(q); if (h < 1 && h > -12) padLine = Math.min(padLine, h); } }
  uaDev = Math.max(uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), ua));
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (ropeClr.d < 0) fail(`rope into the body ${JSON.stringify(ropeClr)}`);
if (handClr.d < 0) fail(`hands into the head ${JSON.stringify(handClr)}`);
if (padHand < 0) fail(`hands into the pad ${padHand.toFixed(2)}`);
if (padLine < 1e8) fail(`cable through the pad (${padLine.toFixed(2)} cm)`);

const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
const shFlex = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), V.scale(CH.trunkFrame(Wt).u, -1));
set('Bench angle', 'setup', `${ANGLE}° back pad, flat seat`); set('Bench angle', 'peak', 'Glutes in the crease and upper back on the pad (rig shapes), back of the head just off it with a neutral neck');
set('Elbow flexion', 'setup', `${d(CH.elbowFlexOf(Wt))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(CH.elbowFlexOf(Wb))} at the bottom`);
set('Upper arm angle', 'setup', `${BACK}° behind vertical: ${d(shFlex)} of shoulder flexion relative to the trunk`); set('Upper arm angle', 'peak', `Unchanged: shoulder channels constant (max ${uaDev.toFixed(1)}° drift)`);
set('Rope and cable', 'setup', `Low pulley ${ANCHOR[1]} cm high, ${r1(padTop[0] - ANCHOR[0])} cm behind the top of the pad; ${r1(EQ.barAt(Wt).width)} cm between the hands`); set('Rope and cable', 'peak', `Grip width unchanged (${rep.gripWidth.join('-')} cm); hands ${r1(handClr.d)} cm from the head and ${r1(padHand)} cm above the pad at the closest`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Cable Rope Incline Tricep Extension: wrote ${L.write(ex)}\n  bench ${JSON.stringify(CH.benchFit(B, W0))} shFlex ${r1(shFlex)} costs ${path.map((k) => k.cost.toFixed(4)).join(',')}\n  anchor ${ANCHOR} padTop ${padTop.map(r1)}\n  ${JSON.stringify(rep)}\n  rope ${JSON.stringify(ropeClr)} hands ${JSON.stringify(handClr)} padHand ${r1(padHand)} padLine ${padLine}`);
