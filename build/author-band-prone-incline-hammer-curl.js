// Band Prone Incline Hammer Curl (GymVisual, Band Prone Incline Hammer Curl; movement reference only, page not readable):
// adjustable bench with the back pad at 40 degrees. Straddle the seat and lie chest-down on the pad with the chin just over
// the top, the balls of the feet planted on the floor behind (planted leg contacts; body set-up as the dumbbell prone
// incline curl, b4-curls2 chestOnPad). A power rack stands under the hands, its uprights outside the arms, a little behind
// them; one band per hand is looped low round the upright on that side, so each strand runs down and back from the hand
// and resists the whole curl. Arms hang straight down outside the pad with a neutral grip (palms in); both forearms curl
// about the elbow (upper arms vertical and still, b6-10 curlPath) toward the front of the shoulders, thumbs leading;
// short squeeze, slow lower. The chest stays on the pad. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const B3 = require('./families/b3-back');
const K = require('./families/b4-curls2');
const BP = require('./families/b5-bandpull');
const EQ = require('./families/equip');
const G = require('./families/b6-10');
const meta = require('./meta/band-prone-incline-hammer-curl.json');
const ENV = (k, d) => +(process.env[k] ?? d);

const ANG = 40;
const P = K.chestOnPad({ ang: ANG, along: ENV('SA', 23), foot: [ENV('FX', -50), 26] });
const { bench, contacts, body } = P;
const base = clone(body);
for (const s of ['r', 'l']) base.ch[`sc_${s}`] = { protract: 4, elevate: 0 };
const S0 = L.fk(base, contacts).shoulder_r.p;
const E0 = V.add(S0, V.scale(V.norm([ENV('EX', 0.02), -1, ENV('EZ', 0.12)]), L.UA));
const path = G.curlPath({ elbow0: E0, a0: 5, a1: ENV('A1', 128), fwd: [1, 0, 0], palm: 'hammer', medial: [0, 0, -1] });
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const { poses: keys, err } = G.armPath(base, contacts, () => ({ at: path }), FS, { guess: { plane: 90, elev: 50, axial: 0, flex: 5, pron: 90 } });
keys.forEach((q) => B3.wrapPose(q));
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wh = L.fk(poses.k0, contacts), hand = EQ.gripPoint(Wh, 'r').p;
const RK = BP.rackPair({ x: r1(hand[0] - ENV('BACK', 28)), y: ENV('AY', 10), width: ENV('RW', 96), behind: true }), STR = BP.pairStrands(RK.anchors);
ex.props = [bench.prop, RK.rack, ...RK.bands];
const sw = B3.sweep(ex, { fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes: P.boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] }, 600);
let strandBox = { d: 1e9 }, armBody = { d: 1e9 };
const rep = G.bandCheck('band-prone-incline-hammer-curl', ex, { minLine: 0.5, probe: (W, pz, t) => {
  for (const [a, b] of STR(W)) for (let k = 0; k <= 40; k++) { const p = V.lerp(a, b, k / 40); for (const bx of P.boxes) { const d = B3.boxDist(p, bx) - 0.6; if (d < strandBox.d) strandBox = { d: +d.toFixed(2), box: bx.id, t: +t.toFixed(2) }; } }
  for (const p of [EQ.gripPoint(W, 'r').p, W.wrist_r.p]) for (const id of ['head', 'jaw', 'neck', 'traps_r', 'pecs_r', 'chest']) { const d = EQ.pointShape(W, p, id) - 3.5; if (d < armBody.d) armBody = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; }
} });
if (strandBox.d < 0.5) { console.error(`FAIL: band through the bench ${JSON.stringify(strandBox)}`); process.exitCode = 1; }
if (sw.bodyBox < -0.5 || sw.drift > 0.05) { console.error(`FAIL: body vs bench ${sw.bodyBox} drift ${sw.drift} ${JSON.stringify(sw.bodyBoxAt)}`); process.exitCode = 1; }
if (armBody.d < 0) { console.error(`FAIL: hand into the body ${JSON.stringify(armBody)}`); process.exitCode = 1; }
const N = FS.length - 1, Wb = L.fk(poses.k0, contacts), Wt = L.fk(poses[`k${N}`], contacts), set = H.setKin(ex), d = G.d0;
const ua = V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p)), uaT = V.norm(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p));
set('Elbow flexion', 'setup', `${d(G.elbowAng(Wb))} (arms hanging straight)`); set('Elbow flexion', 'peak', `${d(G.elbowAng(Wt))} at the top`);
set('Forearm rotation', 'setup', `${poses.k0.ch.wrist_r.pron}° (neutral, thumb forward)`); set('Forearm rotation', 'peak', `${poses[`k${N}`].ch.wrist_r.pron}° (neutral, thumb back toward the shoulder)`);
set('Upper arm', 'setup', `${d(V.angle(ua, [0, -1, 0]))} from vertical (hanging), ${d(G.humElev(Wb))} from the trunk line`); set('Upper arm', 'peak', `Unchanged (moves ${d(V.angle(ua, uaT))})`);
set('Chest on the pad', 'setup', `Chest on the ${ANG}° pad (80 cm), seat 45 cm; head ${r1(P.along(Wb, 'head_c1') - P.PAD)} cm past the top edge`); set('Chest on the pad', 'peak', 'Unchanged (the trunk does not move)');
set('Band', 'setup', `One band per hand, looped round the rack uprights ${RK.anchors.r[1]} cm off the floor, ${2 * RK.anchors.r[2]} cm apart, ${r1(hand[0] - RK.anchors.r[0])} cm behind the hands; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at the top`);
set('Tempo', 'setup', 'Arms hanging 0.6 s'); set('Tempo', 'peak', '1.1 s up, 0.4 s squeeze, 1.8 s down, 0.4 s pause');
console.log(`Band Prone Incline Hammer Curl: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  sweep ${JSON.stringify(sw)}\n  ${JSON.stringify(rep)} strandBox ${JSON.stringify(strandBox)} armBody ${JSON.stringify(armBody)}`);
