// Weighted Plate Incline Press (GymVisual #25624; page not readable here, movement from the name and standard coaching):
// lying on an adjustable bench at 30 degrees (glutes on the seat, upper back and head on the pad, feet planted), both
// hands hold a weight plate by its rim at 3 and 9 o'clock, palms facing in, thumbs toward the head, so the plate lies
// parallel to the trunk. From arms long over the shoulders, lower the plate to just above the upper chest (elbows about
// 45 degrees from the body), pause, press back up. Arms solved on the right rim grip point and mirrored (constant grip
// width). Bench and body from build/families/b3-chest.js (benchBase), as the dumbbell incline press. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const G = require('./families/gear-bars');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/weighted-plate-incline-press.json');

const ID = 'weighted-plate-incline-press', ENV = (k, d) => +(process.env[k] ?? d);
const ANG = 30, PD = 40, TH = 3.5, GW = G.plateGripWidth(PD);
const { B, base, contacts } = C.benchBase(ANG);
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
// plate centre: top over the shoulders (arms long), bottom just above the upper chest
const Pb = V.add(F.mid, V.add(V.scale(F.u, ENV('BU', -8)), V.scale(F.v, ENV('BV', 27))));
const Pt = V.add(F.mid, V.add(V.scale(F.u, ENV('TU', -2)), V.scale(F.v, ENV('TV', 60.5))));
const across = [0, 0, 1];
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], poses = {};
let guess = [[90, 90, 0, 10, 90], [70, 80, 20, 20, 90], [60, 60, -20, 90, 90]], worst = 0;
FS.forEach((f, i) => { // f 0 = top (arms long) .. 1 = bottom
  const p = clone(base); p.ch.sc_r = { protract: r1(6 - 10 * f), elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  const P = V.add(Pt, V.scale(V.sub(Pb, Pt), f)), g = V.add(P, V.scale(across, GW / 2)), Wp = L.fk(p, contacts), S = Wp.shoulder_r.p;
  const E = V.add(S, V.add(V.scale(F.u, -10 * f), V.add(V.scale(F.v, -2 * f + 20 * (1 - f)), [0, 0, 16 * f])));
  const q = G.armTo(p, g, { grip: 'handle', thumb: F.u, palm: [0, 0, -1], wDir: 1.2, elbow: E, wElbow: 0.3 * f + 0.05, guesses: guess, mirror: true, contacts });
  worst = Math.max(worst, q.__err); delete q.__err; delete q.__cost; guess = [G.guessOf(q)];
  poses[`p${i}`] = X.unwrapArms(q, i ? poses[`p${i - 1}`] : null);
});
const N = FS.length - 1, ph = (id) => meta.timeline.phases.find((p) => p.id === id), D = meta.timeline.duration;
const t0 = ph('lower').start, t1 = ph('lower').end, t2 = ph('bottom').end, t3 = ph('press').end;
const keyframes = [{ t: 0, pose: 'p0' }, ...K.easeTimes(FS, t0, t1).map((t, i) => ({ t, pose: `p${i}` })), { t: t2, pose: `p${N}` }, ...K.easeTimes(FS.slice(0, -1).map((k) => 1 - k).reverse(), t2, t3).map((t, i) => ({ t, pose: `p${N - 1 - i}` })), { t: D, pose: 'p0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [B.prop, G.plateProp({ two: true, D: PD, thick: TH })];
let pl = { width: [1e9, -1e9], clear: { d: 1e9 } };
const sw = C.sweep(ex, B, { grips: [], probe: (W, pz, t) => {
  const d = G.plateAt(W, { two: true, D: PD, thick: TH }); pl.width = [Math.min(pl.width[0], d.width), Math.max(pl.width[1], d.width)];
  const c = G.plateClear(W, { two: true, D: PD, thick: TH }, /^(hand|thumb|forearm)_/); if (c.d < pl.clear.d) pl.clear = { ...c, d: r1(c.d), t: +t.toFixed(2) };
} });
const fails = [];
if (worst > 0.8) fails.push(`hands off the rim (${worst} cm)`);
if (pl.width[1] - pl.width[0] > 1.2) fails.push(`grip width varies ${pl.width.map(r1)}`);
if (pl.clear.d < 0) fails.push(`plate into the body ${JSON.stringify(pl.clear)}`);
if (sw.slide > 0.05) fails.push('feet slide');
if (sw.bodyBench > 2.5) fails.push(`body into the bench ${sw.bodyBench}`);
const Wt = L.fk(poses.p0, contacts), Wb = L.fk(poses[`p${N}`], contacts);
const set = H.setKin(ex);
set('Bench angle', 'setup', `${ANG}° back pad, flat seat`); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad');
set('Elbow flexion', 'setup', `≈${Math.round(C.elbowFlexOf(Wt))}° (arms long)`); set('Elbow flexion', 'peak', `≈${Math.round(C.elbowFlexOf(Wb))}° at the bottom, elbows ≈${Math.round(C.elbowFlare(Wb))}° from the trunk`);
set('Grip', 'setup', `Rim at 3 and 9 o'clock, ${r1(GW)} cm between the grip points (${PD} cm plate)`); set('Grip', 'peak', `Steady within ${r1(pl.width[1] - pl.width[0])} cm; plate at least ${pl.clear.d} cm off the body`);
set('Tempo', 'setup', `Arms long ${t0} s`); set('Tempo', 'peak', `${r1(t1 - t0)} s down, ${r1(t2 - t1)} s pause, ${r1(t3 - t2)} s up`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Weighted Plate Incline Press: wrote ${L.write(ex)}\n  worst ${worst} elbow ${Math.round(C.elbowFlexOf(Wt))}->${Math.round(C.elbowFlexOf(Wb))} flare ${Math.round(C.elbowFlare(Wb))} trunk ${r1(tf)}\n  loop ${JSON.stringify({ ...pl, width: pl.width.map(r1), slide: sw.slide, floor: sw.floor, bodyBench: sw.bodyBench })}`);
X.report(ID, fails);
