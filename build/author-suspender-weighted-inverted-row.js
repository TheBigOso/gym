// Suspender Weighted Inverted Row (GymVisual #21834; page not readable here, movement from the name and standard
// coaching): the suspended row with a weight vest. Two straps hang from one anchor on a pull-up bar; the athlete leans
// back with the body straight from heels to head, heels planted (the pivot), a handle in each hand (neutral grip), a
// weight vest snug on the chest (src/gear/g3-bars.js 'vest', body-mounted on spine_t6). Pull the chest up to the hands,
// elbows close to the body, squeeze, lower under control. The body turns as one piece about the heels; the hands ride
// their strap spheres (gear-g3-bars.js leanRow). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/suspender-weighted-inverted-row.json');

const ID = 'suspender-weighted-inverted-row', ENV = (k, d) => +(process.env[k] ?? d);
const res = X.leanRow(meta, {
  style: 'handle', alphaT: ENV('AT', 52), barY: 215, anchorDX: 6,
  topHand: (W, u, n) => V.add(W.shoulder_r.p, V.add(V.scale(u, -11), V.add(V.scale(n, ENV('HN', 15)), [0, 0, 2]))),
  sc: (f) => ({ protract: r1(6 - 16 * f), elevate: 0 }),
  arm: (f, W, ub, nb, S) => ({ thumb: ub, palm: [0, 0, -1], elbow: V.add(S, V.add(V.scale(ub, -18 * f), V.add(V.scale(nb, -6 * f + 10 * (1 - f)), [0, 0, 6 + 2 * f]))), wElbow: 0.3 * f }),
});
const { ex, lp, Ls, alphaB, alphaT, contacts, poses, N, timing, Ws } = res;
ex.props.push(X.vestProp());
// vest clear of the straps: the straps run from the hands up to the anchor in front of the chest
const fails = res.fails.slice();
const Wb = L.fk(poses.r0, contacts), Wt = L.fk(poses[`r${N}`], contacts);
const set = H.setKin(ex);
set('Body angle', 'setup', `≈${Math.round(alphaB)}° above the floor, heels down, straight from heels to head`); set('Body angle', 'peak', `≈${Math.round(alphaT)}° at the top (the body turns about the heels)`);
set('Elbow flexion', 'setup', `≈${X.elbowDeg(Wb)}° (arms long)`); set('Elbow flexion', 'peak', `≈${X.elbowDeg(Wt)}° with the hands at the lower chest`);
set('Load', 'setup', 'Weight vest snug on the chest (front and back panels)'); set('Load', 'peak', 'Same line as the unweighted row; only the load changes');
set('Straps', 'setup', `Straps ${r1(Ls)} cm from a single anchor 215 cm up; ${Math.round(lp.fromVert[1])}° from vertical at the bottom`); set('Straps', 'peak', `${Math.round(lp.fromVert[0])}° from vertical at the top; at least ${lp.clear.d} cm off the body`);
set('Tempo', 'setup', `Hang ${timing.t0} s`); set('Tempo', 'peak', `${r1(timing.t1 - timing.t0)} s up, ${r1(timing.t2 - timing.t1)} s squeeze, ${r1(timing.t3 - timing.t2)} s down`);
console.log(`Suspender Weighted Inverted Row: wrote ${L.write(ex)}\n  ${JSON.stringify({ alpha: [alphaB, alphaT], anchor: res.anchor, strap: r1(Ls), gripErr: res.worst, tilt: res.tilt })}\n  loop ${JSON.stringify({ ...lp, strap: lp.strap.map(r1), fromVert: lp.fromVert.map(r1), floor: r1(lp.floor), slide: +lp.slide.toFixed(3) })}`);
X.report(ID, fails);
