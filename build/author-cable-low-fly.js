// Cable Low Fly (GymVisual, Cable Low Fly; movement reference only, the page could not be read): low-to-high fly standing
// between two cable towers with the pulleys at the bottom. Feet about hip width (planted leg contacts), knees soft, a
// slight forward lean. One D-handle in each hand, each on its own cable from its own low pulley (tower_r on the right,
// tower_l on the left, a little behind the hips). From the hands together in front of the upper chest (palms up) the arms
// lower and open in a wide arc with a fixed soft elbow bend (about 20 degrees) until the hands are out beside the hips
// (palms forward), pause, then scoop back up and together. Bilateral (right arm solved, left mirrored). Family
// b5-cablepush.js.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-low-fly.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANCHOR = [ENV('AX', -10), ENV('AY', 16), ENV('AZ', 80)]; // right pulley at the bottom of its tower
const { ex, contacts, poses, costs } = P.standFlyModule(meta, {
  anchorR: ANCHOR, lean: ENV('LEAN', 10), elbow: 20,
  dTop: (F) => V.norm(V.add(V.add(V.scale(F.v, 0.95), V.scale(F.w, -ENV('IN', -0.02))), V.scale(F.u, ENV('UP', 0.0)))),
  dBot: (F) => V.norm(V.add(V.add(V.scale(F.u, -0.8), V.scale(F.w, ENV('OUT', 0.55))), V.scale(F.v, ENV('FWD', 0.12)))),
  palm: (F, f) => CH.slerpV(V.norm(V.add(F.u, V.scale(F.w, -0.25))), F.v, f), wPalm: 4,
});
const rep = P.checkTwoHandle('cable-low-fly', ex, ANCHOR);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const gT = EQ.gripPoint(Wt, 'r').p, gB = EQ.gripPoint(Wb, 'r').p;
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (soft, fixed)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} in the stretch`);
set('Arm path', 'setup', `Upper arm ${d(elevOf(Wt))} from the trunk, hands ${r1(gT[1] - Wt.shoulder_r.p[1])} cm from shoulder height, ${r1(2 * gT[2])} cm apart`); set('Arm path', 'peak', `Upper arm ${d(elevOf(Wb))} from the trunk, hands ${r1(gB[2])} cm out from the midline at ${r1(gB[1])} cm`);
set('Grip', 'setup', 'Palms up and slightly in at the top'); set('Grip', 'peak', 'Palms forward at the bottom');
set('Cable', 'setup', `Low pulleys ${ANCHOR[1]} cm high, ${2 * ANCHOR[2]} cm apart, ${-ANCHOR[0]} cm behind the hips`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm`);
set('Trunk', 'setup', `${P.leanText(Wt)}, knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Squeeze 0.6 s at the top'); set('Tempo', 'peak', '2.2 s down, 0.4 s stretch, 1.5 s up');
console.log(`Cable Low Fly: wrote ${L.write(ex)}\n  costs ${costs} grip top ${gT.map(r1)} bottom ${gB.map(r1)}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}`);
