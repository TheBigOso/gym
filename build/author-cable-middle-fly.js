// Cable Middle Fly (GymVisual 9705, Cable Middle Fly; movement reference only, page not readable): standing midway
// between two cable towers with the pulleys set at about chest height (tower_r on the right, tower_l on the left, both a
// little behind the shoulders), feet about hip width (planted leg contacts), knees soft, trunk leaning slightly forward.
// One D-handle in each hand, each on its own cable; neutral grip (handle vertical, palms facing each other in front).
// From the hands together in front of the chest the arms open in a level arc at chest height with a fixed soft elbow
// bend (about 20 degrees) until the hands are about in line with the shoulders, pause in the stretch, then hug back
// together. Differs from author-cable-middle-fly.js (pulleys above the shoulders, hands meeting a little low) by the
// chest-height pulleys and the level arc. Bilateral (right arm solved, left mirrored). Family b6-08.js on
// b5-cablepush standFlyModule.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const X = require('./families/b6-08');
const meta = require('./meta/cable-middle-fly.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANCHOR = [ENV('AX', -8), ENV('AY', 128), ENV('AZ', 92)]; // right pulley: about chest height, out wide
const { ex, base, contacts, poses, Fr, costs } = P.standFlyModule(meta, {
  anchorR: ANCHOR, lean: ENV('LEAN', 14), elbow: 20,
  dTop: (F) => V.norm(V.add(V.add(V.scale(F.v, 0.95), V.scale(F.w, -ENV('IN', -0.04))), V.scale(F.u, -ENV('DN', 0.12)))),
  dBot: (F) => CH.upperArmDir(F, ENV('FLARE', 72), ENV('DIP', 4)),
  ax: (F) => F.u,
});
const rep = P.checkTwoHandle('cable-middle-fly', ex, ANCHOR);
const peak = X.checkMeasure('cable-middle-fly', ex);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const gT = EQ.gripPoint(Wt, 'r').p, gB = EQ.gripPoint(Wb, 'r').p;
const horiz = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[2], u[0]) / L.R.DEG; }; // 0 = straight ahead, 90 = out to the side
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (soft, fixed)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} in the stretch`);
set('Arm opening', 'setup', `Upper arm ${d(horiz(Wt))} from straight ahead, hands ${r1(2 * gT[2])} cm apart`); set('Arm opening', 'peak', `${d(horiz(Wb))} from straight ahead (hands about in line with the shoulders); hands ${Math.round(gT[1] - Wt.shoulder_r.p[1])} / ${Math.round(gB[1] - Wb.shoulder_r.p[1])} cm vs shoulder height (level arc)`);
set('Grip', 'setup', 'Neutral: palms facing each other, handles vertical'); set('Grip', 'peak', 'Unchanged (palms forward as the arms open)');
set('Cable', 'setup', `Pulleys ${ANCHOR[1]} cm high (about chest height), ${2 * ANCHOR[2]} cm apart, ${-ANCHOR[0]} cm behind the hips`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm`);
set('Trunk', 'setup', `${P.leanText(Wt)}, knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Squeeze 0.6 s with the hands together'); set('Tempo', 'peak', '2.2 s opening, 0.4 s stretch, 1.5 s closing');
console.log(`Cable Middle Fly: wrote ${L.write(ex)}\n  costs ${costs} grip top ${gT.map(r1)} bottom ${gB.map(r1)}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, knee: rep.kneeR, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })} peak ${peak}`);
