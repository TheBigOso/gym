// Cable Seated Chest Press (GymVisual, Cable Seated Chest Press; movement reference only, the page could not be read):
// sitting tall on the end of a flat bench between two cable towers (no back support, the pad runs behind toward the
// towers), feet flat in front (planted leg contacts). One D-handle in each hand, each on its own cable from its own pulley
// at about shoulder height behind the athlete (tower_r behind on the right, tower_l behind on the left; the cables pass
// either side of the bench), pronated grip. From the arms extended in front of the chest the handles come back to the sides
// of the chest, pause, then press forward and slightly together. Bilateral (right arm solved, left mirrored). Family
// b5-cablepush.js (press path), seat from b4-shoulders3 seatedFlat.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-seated-chest-press.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const sf = K.seatedFlat({ seatH: 45, stance: 18, hipFlex: 88 });
const base = clone(sf.pose);
base.ch.sc_r = { protract: 0, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: -2 };
const W0 = L.fk(base, sf.contacts), S = W0.shoulder_r.p;
const ANCHOR = [r1(S[0] + ENV('AX', -40)), r1(S[1] + ENV('AY', 6)), ENV('AZ', 84)]; // right pulley behind, wide, about shoulder height
const G0 = [r1(S[0] + ENV('G0X', 23)), r1(S[1] - 8), r1(S[2] + 10)], G1 = [r1(S[0] + ENV('G1X', 55.5)), r1(S[1] - 4), 10];
const path = P.pressPath(base, sf.contacts, { G0, G1, n: 6 }).map((k) => ({ f: k.f, pose: C.mirrorArm(P.strip(k.pose)) }));
const T = CH.phaseT(meta), Fr = CH.trunkFrame(W0);
const settle = C.mirrorArm(P.strip(C.armR(base, sf.contacts, { grip: V.add(G0, [-0.4, 0, 0.1]), palm: V.norm(V.add(V.scale(Fr.u, -1), V.scale(Fr.v, 0.2))), axis: [0, 0, 1], elbow: L.fk(path[0].pose, sf.contacts).elbow_r.p, wElbow: 1.5, guess: C.guessOf(path[0].pose), wGrip: 4 })));
const { poses, keyframes } = CH.repKeys(path, T, settle);
const ex = H.module_(meta, sf.contacts, poses, keyframes);
ex.props = [sf.bench.prop, ...P.towers(ANCHOR, { offset: [-8, 10] }), ...P.handles(ANCHOR)];
const rep = P.checkTwoHandle('cable-seated-chest-press', ex, ANCHOR);
const Wt = L.fk(poses.top, sf.contacts), Wb = L.fk(poses.bottom, sf.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
// body on the seat: lowest buttock / thigh point vs the seat top
const seatGap = Math.min(H.bottomOf(Wt, 'buttock_r'), H.bottomOf(Wt, 'thigh_r')) - sf.bench.top;
// cables clear of the bench (sampled along each line against the bench box)
const bp = sf.bench.prop, bx = [bp.center[0] - bp.size[0] / 2 - 80, bp.center[0] + bp.size[0] / 2], bz = bp.size[2] / 2;
let benchHit = false;
for (const W of [Wt, Wb]) for (let k = 0; k <= 20; k++) { const g = EQ.gripPoint(W, 'r').p, p = V.add(ANCHOR, V.scale(V.sub(g, ANCHOR), k / 20)); if (p[0] > bx[0] && p[0] < bx[1] && Math.abs(p[2]) < bz && p[1] < sf.bench.top) benchHit = true; }
if (benchHit) { console.error('FAIL cable-seated-chest-press: cable through the bench'); process.exitCode = 1; }
if (Math.abs(seatGap) > 1) { console.error(`FAIL cable-seated-chest-press: seat gap ${seatGap}`); process.exitCode = 1; }
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} with the arms extended`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} with the hands beside the chest`);
set('Elbow flare', 'setup', '–'); set('Elbow flare', 'peak', `${d(CH.elbowFlare(Wb))} from the trunk at the chest`);
set('Grip', 'setup', `Palms down, hands ${r1(2 * EQ.gripPoint(Wt, 'r').p[2])} cm apart in front`); set('Grip', 'peak', `Hands ${r1(2 * EQ.gripPoint(Wb, 'r').p[2])} cm apart beside the chest`);
set('Cable', 'setup', `Pulleys ${ANCHOR[1]} cm high, ${r1(S[0] - ANCHOR[0])} cm behind the shoulders, ${2 * ANCHOR[2]} cm apart`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm and pass either side of the bench`);
set('Trunk', 'setup', 'Sitting tall, no back support'); set('Trunk', 'peak', 'Unchanged');
set('Seat', 'setup', `Flat bench ${sf.bench.top} cm, knees ${d(H.kneeOf(Wt, 'r'))}`); set('Seat', 'peak', `Unchanged (buttocks ${r1(seatGap)} cm from the seat top, feet planted)`);
set('Tempo', 'setup', 'Pause 0.5 s with the arms extended'); set('Tempo', 'peak', '2 s back, 0.3 s pause, 1.3 s press');
console.log(`Cable Seated Chest Press: wrote ${L.write(ex)}\n  S ${S.map(r1)} anchor ${ANCHOR} elbow ${r1(C.elbowAng(Wb))}..${r1(C.elbowAng(Wt))} seatGap ${r1(seatGap)} hip ${base.ch.hip_r.flex}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}`);
