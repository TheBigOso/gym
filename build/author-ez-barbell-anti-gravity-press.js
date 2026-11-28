// EZ Barbell Anti-Gravity Press (GymVisual #5059; page not readable here, movement from the name and standard coaching):
// lying face down on an adjustable bench set to 45 degrees, chest on the pad with the chin just over the top, straddling
// the seat on the balls of the feet. Both hands hold an EZ curl bar overhand on the outer cambers (44 cm between the grip
// points) at forehead level in front of the face, elbows bent and out. Press the bar out past the head in line with the
// pad until the arms are long beside the ears, then bring it back. The chest stays on the pad; only the arms and the
// shoulder blades move. Arms solved on the right grip point and mirrored (constant grip width); the bar turns about its
// own axis with the hands (src/gear/bars.js ez_bar). Body set-up from author-chest-supported-dumbbell-row.js
// (gear-g3-bars.js proneIncline). Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const G = require('./families/gear-bars');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/ez-barbell-anti-gravity-press.json');

const ID = 'ez-barbell-anti-gravity-press', ENV = (k, d) => +(process.env[k] ?? d);
const ANG = 45, PI = X.proneIncline({ ang: ANG, along: ENV('ALONG', 21) });
const { body, contacts, bench, boxes, dir, nrm } = PI;
const GW = G.EZ.width, CAMBER = G.EZ.camber, bar = G.ezProp({ width: GW, grip: 'outer', camber: CAMBER, plates: 1, plateD: 25 });
const W0 = L.fk(body, contacts), S = W0.shoulder_r.p;
// right grip point: start beside the forehead in front of the face, end with the arm long in line with the pad
const g0 = V.add(V.add(S, V.scale(dir, ENV('D0', 26))), V.add(V.scale(nrm, ENV('N0', -20)), [0, 0, GW / 2 - S[2]]));
const g1 = V.add(V.add(S, V.scale(dir, ENV('D1', 60))), V.add(V.scale(nrm, ENV('N1', -8)), [0, 0, GW / 2 - S[2]]));
// overhand: palm facing up the pad (the press direction), thumbs in, turned by the camber toward neutral
const handAxes = (palm0) => { const c = Math.cos(CAMBER * R.DEG), s = Math.sin(CAMBER * R.DEG), Z = [0, 0, -1]; return { thumb: V.add(V.scale(Z, c), V.scale(palm0, s)), palm: V.sub(V.scale(palm0, c), V.scale(Z, s)) }; };
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.72, 0.82, 0.9, 0.96, 1], poses = {};
let guess = [[60, 120, 0, 100, 0], [40, 140, 20, 90, 0], [80, 110, -20, 110, 20], [30, 150, 0, 60, 0]], worst = 0;
FS.forEach((f, i) => {
  const p = clone(body); p.ch.sc_r = { protract: r1(4 + 6 * f), elevate: r1(6 + 12 * f) }; p.ch.sc_l = clone(p.ch.sc_r);
  const Wp = L.fk(p, contacts), Sp = Wp.shoulder_r.p, g = V.add(g0, V.scale(V.sub(g1, g0), f));
  const ax = handAxes(dir);
  const E = V.add(V.sub(g, V.scale(dir, ENV('EF', 24))), V.add(V.scale(nrm, ENV('EN', -2)), [0, 0, ENV('EZ', 3)])); // forearm along the press line, elbow under the hand
  const q = G.armTo(p, g, { grip: 'bar', thumb: ax.thumb, palm: ax.palm, wDir: ENV('WD', 2), elbow: E, wElbow: 0.3 * (1 - f) + 0.05, guesses: guess, mirror: true, contacts });
  worst = Math.max(worst, q.__err); delete q.__err; delete q.__cost; guess = [G.guessOf(q)];
  poses[`p${i}`] = X.unwrapArms(q, i ? poses[`p${i - 1}`] : null);
});
const N = FS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id), D = meta.timeline.duration;
const t0 = ph('press').start, t1 = ph('press').end, t2 = ph('top').end, t3 = ph('lower').end;
const keyframes = [{ t: 0, pose: 'p0' }, ...K.easeTimes(FS, t0, t1).map((t, i) => ({ t, pose: `p${i}` })), { t: t2, pose: `p${N}` }, ...K.easeTimes(FS.slice(0, -1).map((k) => 1 - k).reverse(), t2, t3).map((t, i) => ({ t, pose: `p${N - 1 - i}` })), { t: D, pose: 'p0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [bench.prop, bar];
// loop: grip width, EZ bar clear of the body and the bench, feet planted
let sw = { width: [1e9, -1e9], clear: { d: 1e9 }, bench: { d: 1e9 }, camber: 0 };
const rep = K.scanHeld(ex, [], { probe: (W, pz, t) => {
  const ez = G.ezAt(W); sw.width = [Math.min(sw.width[0], ez.width), Math.max(sw.width[1], ez.width)]; sw.camber = Math.max(sw.camber, Math.abs(ez.camber - CAMBER));
  const c = G.ezClear(W, bar.params); if (c.d < sw.clear.d) sw.clear = { ...c, d: r1(c.d), t: +t.toFixed(2) };
  const b = X.geomBoxClear(G.ezGeometry(W, bar.params), boxes); if (b.d < sw.bench.d) sw.bench = { ...b, d: r1(b.d), t: +t.toFixed(2) };
} });
const fails = [];
if (worst > 0.8) fails.push(`hands off the bar (${worst} cm)`);
if (sw.width[1] - sw.width[0] > 1.0) fails.push('grip width varies');
if (sw.camber > 6) fails.push(`hands off the cambers (${r1(sw.camber)} deg)`);
if (sw.clear.d < 0) fails.push(`EZ bar into the body ${JSON.stringify(sw.clear)}`);
if (sw.bench.d < 0) fails.push(`EZ bar into the bench ${JSON.stringify(sw.bench)}`);
if (rep.slide > 0.05) fails.push('feet slide');
if (rep.floor < -0.5) fails.push('below the floor');
if (rep.jump.v > 4) fails.push(`channel jump ${JSON.stringify(rep.jump)}`);
const Wb = L.fk(poses.p0, contacts), Wt = L.fk(poses[`p${N}`], contacts);
const humTrunk = (W) => Math.round(V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p)));
const set = H.setKin(ex);
set('Bench angle', 'setup', `${ANG}° pad, chest on the pad, chin over the top`); set('Bench angle', 'peak', 'Unchanged (the trunk does not move)');
set('Shoulder elevation', 'setup', `Upper arm ≈${humTrunk(Wb)}° from the trunk`); set('Shoulder elevation', 'peak', `≈${humTrunk(Wt)}° with the arms long past the head`);
set('Elbow flexion', 'setup', `≈${Math.round(K.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(K.elbowAng(Wt))}°`);
set('Grip', 'setup', `Overhand on the outer cambers, ${GW} cm between the grip points`); set('Grip', 'peak', `Grip width steady within ${r1(sw.width[1] - sw.width[0])} cm; bar at least ${sw.clear.d} cm off the body and ${sw.bench.d} cm off the bench`);
set('Tempo', 'setup', `${t0} s set`); set('Tempo', 'peak', `${r1(t1 - t0)} s out, ${r1(t2 - t1)} s hold, ${r1(t3 - t2)} s back`);
console.log(`EZ Barbell Anti-Gravity Press: wrote ${L.write(ex)}\n  worst ${worst} g0 ${g0.map(r1)} g1 ${g1.map(r1)} elbow ${Math.round(K.elbowAng(Wb))}->${Math.round(K.elbowAng(Wt))} hum ${humTrunk(Wb)}->${humTrunk(Wt)}\n  loop ${JSON.stringify({ ...sw, width: sw.width.map(r1), camber: r1(sw.camber), floor: rep.floor, slide: rep.slide, jump: rep.jump })}`);
X.report(ID, fails);
