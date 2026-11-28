// Ring High Row (GymVisual #11420; page not readable here, movement from the name and standard coaching): gymnastic rings
// hang from a pull-up bar at shoulder width (one strap per ring). The athlete leans back with the body straight from
// heels to head, heels planted, an overhand grip on the rings (palms toward the feet, thumbs in). Pull the rings to the
// upper chest with the elbows wide, about level with the shoulders (upper arms well out from the trunk), squeeze the
// shoulder blades, lower under control to long arms. The body turns about the heels; each ring rides its strap sphere and
// is turned in the hand to sit along its strap (gear-g3-bars.js leanRow, gear-bars.js ringTiltFit). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/ring-high-row.json');

const ID = 'ring-high-row', ENV = (k, d) => +(process.env[k] ?? d);
const res = X.leanRow(meta, {
  style: 'ring', alphaT: ENV('AT', 48), barY: 230, anchorDX: ENV('ADX', 4), anchorZ: (Ht) => Ht[2] + ENV('AZ', 2),
  topHand: (W, u, n) => V.add(W.shoulder_r.p, V.add(V.scale(u, ENV('HU', 1)), V.add(V.scale(n, ENV('HN', 24)), [0, 0, ENV('HZ', 8)]))),
  sc: (f) => ({ protract: r1(6 - 18 * f), elevate: r1(2 * f) }),
  arm: (f, W, ub, nb, S) => ({ thumb: [0, 0, -1], palm: V.scale(ub, -1), wDir: ENV('WD', 0.6), elbow: V.add(S, V.add(V.scale(ub, -3 * f), V.add(V.scale(nb, 14 * (1 - f) - 3 * f), [0, 0, 6 + 16 * f]))), wElbow: 0.15 + 0.35 * f, ring: ENV('RW', 2) }),
  guess: [[90, 80, 0, 10, 0], [80, 60, -30, 20, 20], [100, 90, 20, 5, -20]],
});
const { ex, lp, Ls, alphaB, alphaT, contacts, poses, N, timing } = res;
const fails = res.fails.slice();
const Wb = L.fk(poses.r0, contacts), Wt = L.fk(poses[`r${N}`], contacts);
// elbow flare: angle between the upper arm and the trunk axis at the top
const flare = Math.round(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), V.sub(Wt.pelvis.p, Wt.neck_c7.p)));
if (flare < 60) fails.push(`elbows not wide enough (${flare} deg)`);
const set = H.setKin(ex);
set('Body angle', 'setup', `≈${Math.round(alphaB)}° above the floor, heels down`); set('Body angle', 'peak', `≈${Math.round(alphaT)}° at the top`);
set('Elbow flare', 'setup', 'Arms long toward the rings'); set('Elbow flare', 'peak', `Upper arms ≈${flare}° from the trunk, hands at the upper chest`);
set('Elbow flexion', 'setup', `≈${X.elbowDeg(Wb)}° (arms long)`); set('Elbow flexion', 'peak', `≈${X.elbowDeg(Wt)}° at the top`);
set('Straps', 'setup', `One strap per ring, ${r1(Ls)} cm, anchors ${Math.round(2 * res.anchor[2])} cm apart; ${Math.round(lp.fromVert[1])}° from vertical at the bottom`); set('Straps', 'peak', `${Math.round(lp.fromVert[0])}° from vertical at the top; at least ${lp.clear.d} cm off the body`);
set('Tempo', 'setup', `Hang ${timing.t0} s`); set('Tempo', 'peak', `${r1(timing.t1 - timing.t0)} s up, ${r1(timing.t2 - timing.t1)} s squeeze, ${r1(timing.t3 - timing.t2)} s down`);
console.log(`Ring High Row: wrote ${L.write(ex)}\n  ${JSON.stringify({ alpha: [alphaB, alphaT], anchor: res.anchor, strap: r1(Ls), gripErr: res.worst, tilt: res.tilt, flare })}\n  loop ${JSON.stringify({ ...lp, strap: lp.strap.map(r1), fromVert: lp.fromVert.map(r1), floor: r1(lp.floor), slide: +lp.slide.toFixed(3) })}\n  top arm ${JSON.stringify(poses[`r${N}`].ch.shoulder_r)} el ${poses[`r${N}`].ch.elbow_r.flex} wr ${JSON.stringify(poses[`r${N}`].ch.wrist_r)}`);
X.report(ID, fails);
