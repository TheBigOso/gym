// Ring Arm Curl (GymVisual #15615; page not readable here, movement from the name and standard coaching): gymnastic rings
// hang from a pull-up bar at shoulder width. The athlete leans back with the body straight from heels to head, heels
// planted, an underhand grip on the rings (palms up / toward the face), arms long and raised toward the anchor. Only the
// elbows bend: the upper arms keep pointing up toward the rings while the hands curl in beside the forehead, pulling the
// body up about the heels; squeeze, then straighten the elbows slowly. Each ring rides its strap sphere and sits along its
// strap in the hand (gear-g3-bars.js leanRow). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/ring-arm-curl.json');

const ID = 'ring-arm-curl', ENV = (k, d) => +(process.env[k] ?? d);
const BETA = (ENV('BETA', 30) * Math.PI) / 180, ELB = ENV('ELB', 115);
const res = X.leanRow(meta, {
  // top: upper arm square to the trunk (along the chest normal, tipped BETA toward the head), elbow bent ELB: the hand
  // sits beside the temple; the ring's anchor continues the upper-arm line up to the bar
  style: 'ring', alphaT: ENV('AT', 50), barY: 230,
  anchorAt: (W, u, n) => { const d = X.unit(V.add(V.scale(n, Math.cos(BETA)), V.scale(u, Math.sin(BETA)))), E = V.add(W.shoulder_r.p, V.scale(d, L.UA)), k = (228.4 - E[1]) / d[1]; return [E[0] + d[0] * k, 228.4, W.shoulder_r.p[2] + ENV('AZ', 2)]; },
  topHand: (W, u, n) => { const d = X.unit(V.add(V.scale(n, Math.cos(BETA)), V.scale(u, Math.sin(BETA)))), a = BETA + (ELB * Math.PI) / 180, f = X.unit(V.add(V.scale(n, Math.cos(a)), V.scale(u, Math.sin(a)))); return V.add(W.shoulder_r.p, V.add(V.scale(d, L.UA), V.add(V.scale(f, L.FA + 7.6), [0, 0, ENV('HZ', -2)]))); },
  sc: (f) => ({ protract: r1(4 - 6 * f), elevate: r1(10 - 4 * f) }),
  reachFlex: 6, swivel: true, FS: [0, 0.08, 0.16, 0.25, 0.34, 0.43, 0.52, 0.61, 0.7, 0.79, 0.88, 0.95, 1],
  arm: (f, W, ub, nb, S, anchor) => ({ thumb: [0, 0, 1], palm: V.scale(nb, -1), wDir: ENV('WD', 0.4), elbow: V.add(S, V.scale(X.unit(V.sub(anchor, S)), L.UA)), wElbow: ENV('WE', 0.5), ring: ENV('RW', 0) }),
  guess: [[80, 150, 0, 10, 90], [60, 130, 20, 30, 90], [90, 160, -20, 5, 80]],
});
const { ex, lp, Ls, alphaB, alphaT, contacts, poses, N, timing } = res;
const fails = res.fails.slice();
const Wb = L.fk(poses.r0, contacts), Wt = L.fk(poses[`r${N}`], contacts);
const uaDev = (W) => Math.round(V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(res.anchor, W.shoulder_r.p)));
const dev = Math.max(uaDev(Wb), uaDev(Wt));
if (dev > 25) fails.push(`upper arm off the strap line by ${dev} deg`);
const set = H.setKin(ex);
set('Body angle', 'setup', `≈${Math.round(alphaB)}° above the floor, heels down`); set('Body angle', 'peak', `≈${Math.round(alphaT)}° at the top`);
set('Elbow flexion', 'setup', `≈${X.elbowDeg(Wb)}° (arms long)`); set('Elbow flexion', 'peak', `≈${X.elbowDeg(Wt)}° with the hands beside the forehead`);
set('Upper arm', 'setup', `Raised toward the rings (within ${uaDev(Wb)}° of the line to the anchor)`); set('Upper arm', 'peak', `Still pointing at the rings (within ${uaDev(Wt)}°); only the elbows bend`);
set('Straps', 'setup', `One strap per ring, ${r1(Ls)} cm; ${Math.round(lp.fromVert[1])}° from vertical at the bottom`); set('Straps', 'peak', `${Math.round(lp.fromVert[0])}° from vertical at the top; at least ${lp.clear.d} cm off the body`);
set('Tempo', 'setup', `Hang ${timing.t0} s`); set('Tempo', 'peak', `${r1(timing.t1 - timing.t0)} s up, ${r1(timing.t2 - timing.t1)} s squeeze, ${r1(timing.t3 - timing.t2)} s down`);
console.log(`Ring Arm Curl: wrote ${L.write(ex)}\n  ${JSON.stringify({ alpha: [alphaB, alphaT], anchor: res.anchor, strap: r1(Ls), gripErr: res.worst, tilt: res.tilt, uaDev: [uaDev(Wb), uaDev(Wt)], elbow: [X.elbowDeg(Wb), X.elbowDeg(Wt)] })}\n  loop ${JSON.stringify({ ...lp, strap: lp.strap.map(r1), fromVert: lp.fromVert.map(r1), floor: r1(lp.floor), slide: +lp.slide.toFixed(3) })}\n  top ${JSON.stringify(poses[`r${N}`].ch.shoulder_r)} ${JSON.stringify(poses[`r${N}`].ch.wrist_r)} bottom ${JSON.stringify(poses.r0.ch.shoulder_r)} ${JSON.stringify(poses.r0.ch.wrist_r)}`);
X.report(ID, fails);
