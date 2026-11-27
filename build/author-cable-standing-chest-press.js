// Cable Standing Chest Press (GymVisual, Cable Standing Chest Press; movement reference only, the page could not be read):
// standing facing away from two cable towers, feet about hip width (planted leg contacts), knees soft, a slight forward
// lean with the trunk braced. One D-handle in each hand, each on its own cable from its own pulley at about shoulder
// height behind the athlete (tower_r behind on the right, tower_l behind on the left), pronated grip (palms down, handles
// across the body). From the arms extended in front of the chest the handles come back to the sides of the chest (elbows
// back and out, well bent), pause, then press forward and slightly together. Bilateral (right arm solved, left mirrored).
// Family b5-cablepush.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-standing-chest-press.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANCHOR = [ENV('AX', -32), ENV('AY', 138), ENV('AZ', 84)]; // right pulley behind, out wide, about shoulder height
const st = F.standing({ stance: 14, knee: 10, lean: ENV('LEAN', 12) });
const base = clone(st.pose);
base.ch.sc_r = { protract: 0, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: -4 };
const W0 = L.fk(base, st.contacts), S = W0.shoulder_r.p;
const G0 = [r1(S[0] + ENV('G0X', 23)), r1(S[1] - 8), r1(S[2] + 10)], G1 = [r1(S[0] + ENV('G1X', 55.5)), r1(S[1] - 4), 10];
const path = P.pressPath(base, st.contacts, { G0, G1, n: 6 }).map((k) => ({ f: k.f, pose: C.mirrorArm(P.strip(k.pose)) }));
const T = CH.phaseT(meta);
const settle = C.mirrorArm(P.strip(C.armR(base, st.contacts, { grip: V.add(G0, [-0.4, 0, 0.1]), palm: V.norm(V.add(V.scale(CH.trunkFrame(W0).u, -1), V.scale(CH.trunkFrame(W0).v, 0.2))), axis: [0, 0, 1], elbow: L.fk(path[0].pose, st.contacts).elbow_r.p, wElbow: 1.5, guess: C.guessOf(path[0].pose), wGrip: 4 })));
const { poses, keyframes } = CH.repKeys(path, T, settle);
const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [...P.towers(ANCHOR, { offset: [-8, 10] }), ...P.handles(ANCHOR)];
const rep = P.checkTwoHandle('cable-standing-chest-press', ex, ANCHOR);
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.bottom, st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} with the arms extended`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} with the hands beside the chest`);
set('Elbow flare', 'setup', '–'); set('Elbow flare', 'peak', `${d(CH.elbowFlare(Wb))} from the trunk at the chest`);
set('Grip', 'setup', `Palms down, hands ${r1(2 * EQ.gripPoint(Wt, 'r').p[2])} cm apart in front`); set('Grip', 'peak', `Hands ${r1(2 * EQ.gripPoint(Wb, 'r').p[2])} cm apart beside the chest`);
set('Cable', 'setup', `Pulleys ${ANCHOR[1]} cm high, ${-ANCHOR[0]} cm behind the hips, ${2 * ANCHOR[2]} cm apart`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm (over the upper arms)`);
set('Trunk', 'setup', `${P.leanText(Wt)}, braced`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the arms extended'); set('Tempo', 'peak', '2 s back, 0.3 s pause, 1.3 s press');
console.log(`Cable Standing Chest Press: wrote ${L.write(ex)}\n  worst grip ${path.worstGrip} G0 ${G0} G1 ${G1} elbow ${r1(C.elbowAng(Wb))}..${r1(C.elbowAng(Wt))}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}`);
