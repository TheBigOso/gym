// Cable Standing Fly (GymVisual, Cable Standing Fly; movement reference only, the page could not be read): standing
// between two cable towers, feet about hip width (planted leg contacts), knees soft, trunk leaning slightly forward. One
// D-handle in each hand, each on its own cable from its own pulley a little above shoulder height (tower_r on the right,
// tower_l on the left, both slightly behind the shoulders). Neutral grip (handle vertical, palms facing each other in front).
// From the hands together in front of the chest the arms open in a wide arc with a fixed soft elbow bend (about 20
// degrees) until the hands are about in line with the shoulders, pause in the stretch, then hug back together. Bilateral
// (right arm solved, left mirrored). Family b5-cablepush.js.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-standing-fly.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANCHOR = [ENV('AX', -8), ENV('AY', 172), ENV('AZ', 88)]; // right pulley: a little above shoulder height, out wide
const { ex, base, contacts, poses, Fr, costs } = P.standFlyModule(meta, {
  anchorR: ANCHOR, lean: ENV('LEAN', 12), elbow: 20,
  dTop: (F) => V.norm(V.add(V.add(V.scale(F.v, 0.95), V.scale(F.w, -ENV('IN', 0.08))), V.scale(F.u, -ENV('DN', 0.3)))),
  dBot: (F) => CH.upperArmDir(F, ENV('FLARE', 78), ENV('DIP', 6)),
  ax: (F) => F.u,
});
const rep = P.checkTwoHandle('cable-standing-fly', ex, ANCHOR);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const gT = EQ.gripPoint(Wt, 'r').p, gB = EQ.gripPoint(Wb, 'r').p;
const horiz = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[2], u[0]) / L.R.DEG; }; // 0 = straight ahead, 90 = out to the side
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (soft, fixed)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} in the stretch`);
set('Arm opening', 'setup', `Upper arm ${d(horiz(Wt))} from straight ahead, hands ${r1(2 * gT[2])} cm apart`); set('Arm opening', 'peak', `${d(horiz(Wb))} from straight ahead (hands about in line with the shoulders)`);
set('Grip', 'setup', 'Neutral: palms facing each other, handles vertical'); set('Grip', 'peak', 'Palms forward in the stretch');
set('Cable', 'setup', `Pulleys ${ANCHOR[1]} cm high, ${2 * ANCHOR[2]} cm apart, ${-ANCHOR[0]} cm behind the hips`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm`);
set('Trunk', 'setup', `${P.leanText(Wt)}, knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Squeeze 0.6 s with the hands together'); set('Tempo', 'peak', '2.2 s opening, 0.4 s stretch, 1.5 s closing');
console.log(`Cable Standing Fly: wrote ${L.write(ex)}\n  costs ${costs} grip top ${gT.map(r1)} bottom ${gB.map(r1)}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, knee: rep.kneeR, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}`);
