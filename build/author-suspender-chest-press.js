// Suspender Chest Press (GymVisual #14234; page not readable here, movement from the name and standard coaching): the
// athlete faces away from a suspension anchor on a pull-up bar, a handle in each hand (overhand, palms down), and leans
// forward on the balls of the feet with the body straight. From long arms in front of the chest, lower the chest between
// the hands (elbows about 45 degrees from the body) and press back out. The body turns about the planted feet: forward and
// lower as the arms bend, up as they press; each hand rides its strap sphere about the anchor behind (gear-g3-bars.js
// leanRow, press mode). One strap per hand, anchored at shoulder width so the straps run outside the arms. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/suspender-chest-press.json');

const ID = 'suspender-chest-press', ENV = (k, d) => +(process.env[k] ?? d);
const res = X.leanRow(meta, {
  style: 'handle', press: true, alphaT: ENV('AT', 42), alphaB: ENV('AB', 50), barY: 215, anchorDX: ENV('ADX', 70), anchorZ: (Ht) => Ht[2] + ENV('AZ', 0),
  body: { prone: true, heelX: -60, ankle: 12, knee: 0, half: 12 },
  // hands at the bottom: beside the lower chest, a little wider than the shoulders, just above the chest line
  topHand: (W, u, n) => V.add(W.shoulder_r.p, V.add(V.scale(u, ENV('HU', -10)), V.add(V.scale(n, ENV('HN', 22)), [0, 0, ENV('HZ', 18)]))),
  sc: (f) => ({ protract: r1(10 - 16 * f), elevate: 0 }),
  hbHint: [1, -0.3, ENV('HBZ', 0)], swivel: true,
  phaseIds: ['lower', 'bottom', 'press'],
  arm: (f, W, ub, nb, S) => ({ thumb: [0, 0, -1], palm: V.scale(nb, 1), wDir: 0.6, elbow: V.add(S, V.add(V.scale(ub, -10 * f), V.add(V.scale(nb, 10 * f), [0, 0, 14 * f]))), wElbow: 0.4 * f, ring: ENV('RW', 0), ringTilt: 180 }),
  guess: [[90, 80, 0, 10, 0], [70, 60, 20, 30, 0], [100, 90, -20, 5, 20]],
});
const { ex, lp, Ls, alphaB, alphaT, contacts, poses, N, timing } = res;
const fails = res.fails.slice();
const Wl = L.fk(poses.r0, contacts), Wc = L.fk(poses[`r${N}`], contacts);
const set = H.setKin(ex);
set('Body angle', 'setup', `≈${Math.round(alphaB)}° above the floor with the arms long, on the balls of the feet`); set('Body angle', 'peak', `≈${Math.round(alphaT)}° at the bottom of the press (the body turns about the feet)`);
set('Elbow flexion', 'setup', `≈${X.elbowDeg(Wl)}° (arms long)`); set('Elbow flexion', 'peak', `≈${X.elbowDeg(Wc)}° with the hands beside the chest`);
set('Straps', 'setup', `One strap per hand, ${r1(Ls)} cm from anchors behind the athlete, ${Math.round(2 * res.anchor[2])} cm apart`); set('Straps', 'peak', `${Math.round(lp.fromVert[0])}-${Math.round(lp.fromVert[1])}° from vertical; at least ${lp.clear.d} cm off the body`);
set('Tempo', 'setup', `Arms long ${timing.t0} s`); set('Tempo', 'peak', `${r1(timing.t1 - timing.t0)} s down, ${r1(timing.t2 - timing.t1)} s pause, ${r1(timing.t3 - timing.t2)} s up`);
console.log(`Suspender Chest Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ alpha: [alphaB, alphaT], anchor: res.anchor, strap: r1(Ls), gripErr: res.worst, tilt: res.tilt, elbow: [X.elbowDeg(Wl), X.elbowDeg(Wc)] })}\n  loop ${JSON.stringify({ ...lp, strap: lp.strap.map(r1), fromVert: lp.fromVert.map(r1), floor: r1(lp.floor), slide: +lp.slide.toFixed(3) })}\n  bottom ${JSON.stringify(poses[`r${N}`].ch.shoulder_r)} el ${poses[`r${N}`].ch.elbow_r.flex} wr ${JSON.stringify(poses[`r${N}`].ch.wrist_r)}`);
X.report(ID, fails);
