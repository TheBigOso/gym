// Dumbbell Plyo Squat (GymVisual "Dumbbell Plyo Squat", movement reference only): a squat jump holding a light dumbbell in
// each hand at the sides (neutral grip, arms long). Feet hip width; squat down to about 90-100 degrees of knee flexion,
// short pause, then drive up hard: hips and knees extend, the feet roll up onto the balls and leave the floor; in the air
// the legs are long with the toes pointing down; land on the balls of the feet, roll down to the heels and absorb into a
// quarter squat with the knees over the toes; stand tall and reset. About 14 cm of foot clearance (about 0.34 s in the air).
// Feet: flat contacts (planted) or rolling / airborne keys (both contacts at weight 0, legs fitted per key). Bilateral.
// Built on the batch 4 power family (b4-power body / chain / hangKey, the lunge family's rolling feet).
const L = require('./lib');
const { V, r1 } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-plyo-squat.json');

const F = P.makeFamily({ toe: 8, half: 10 });
const SIZE = [30, 11, 11], DSZ = { length: 30, diameter: 11 };   // light dumbbells
const LIFT = +(process.env.LIFT ?? 20);
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
const air = (lift, pitch) => ({ r: { c: 'flat', x: 3, lift, w: 0, pitch }, l: { c: 'flat', x: 3, lift, w: 0, pitch } });
const sp = (l5, t12, t6) => ({ l5, t12, t6 });
const sc = { protract: 2, elevate: -3 };
const ARM = P.hangKey(2, 8, 8);
const B = {
  stand: { feet: flat, knee: 4, pitch: 0, sc },
  d50: { feet: flat, knee: 55, pitch: -16, x: -6, spine: sp(-2, -1, 0), sc },
  bottom: { feet: flat, knee: 98, pitch: -34, x: -14, spine: sp(-3, -2, 1), sc },
  settle: { feet: flat, knee: 100, pitch: -34, x: -14.3, spine: sp(-3, -2, 1), sc },
  drive: { feet: flat, knee: 50, pitch: -16, x: -6, spine: sp(-2, -1, 0), sc },
  ext: { feet: roll(28), knee: 6, pitch: 2, x: 2, sc },
  up: { feet: air(LIFT * 0.6, 32), knee: 6, pitch: 2, x: 3, sc },
  peak: { feet: air(LIFT, 28), knee: 9, pitch: 0, x: 3, sc },
  down: { feet: air(LIFT * 0.5, 24), knee: 10, pitch: -1, x: 3, sc },
  touch: { feet: roll(26), knee: 12, pitch: -3, x: 2, sc },
  heels: { feet: flat, knee: 30, pitch: -9, x: -2, spine: sp(-1, 0, 0), sc },
  absorb: { feet: flat, knee: 58, pitch: -18, x: -7, spine: sp(-2, -1, 0), sc },
  rise: { feet: flat, knee: 25, pitch: -7, x: -2, sc },
};
// airborne keys: no planted foot, so the root height comes from the fitted legs (bisection on the knee angle)
const airY = (c) => {
  let a = 70, b = 130;
  for (let i = 0; i < 40; i++) { const y = (a + b) / 2, sp2 = { root: [c.x ?? 0, y, 0], pitch: c.pitch, spine: c.spine || sp(0, 0, 0), feet: c.feet }; if (P.kneeOf(L.fk(F.pose(sp2), F.contacts), 'r') > c.knee) a = y; else b = y; }
  return r1((a + b) / 2);
};
for (const k of ['up', 'peak', 'down']) B[k].rootY = airY(B[k]);
const keys = [
  { name: 'stand', t: 0, cfg: B.stand, arm: ARM }, { same: 'stand', t: 0.8 },
  { name: 'd50', t: 1.45, cfg: B.d50, arm: ARM }, { name: 'bottom', t: 2.05, cfg: B.bottom, arm: ARM }, { name: 'settle', t: 2.15, cfg: B.settle, arm: ARM }, { same: 'bottom', t: 2.25 },
  { name: 'drive', t: 2.45, cfg: B.drive, arm: ARM }, { name: 'ext', t: 2.62, cfg: B.ext, arm: ARM, n: 2 },
  { name: 'up', t: 2.7, cfg: B.up, arm: ARM }, { name: 'peak', t: 2.79, cfg: B.peak, arm: ARM }, { name: 'down', t: 2.89, cfg: B.down, arm: ARM },
  { name: 'touch', t: 2.96, cfg: B.touch, arm: ARM }, { name: 'heels', t: 3.1, cfg: B.heels, arm: ARM, n: 2 }, { name: 'absorb', t: 3.35, cfg: B.absorb, arm: ARM },
  { name: 'rise', t: 3.95, cfg: B.rise, arm: ARM }, { same: 'stand', t: 4.4 }, { same: 'stand', t: 5.4 },
];
const { poses, keyframes, err } = P.chain(F, keys);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'handle', SIZE), P.B.heldProp('l', 'handle', SIZE)];
ex.exercise.reference.note = G.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = P.B.sweep(ex, { held });
const lr = F.report(ex), jump = P.jumps(ex), lim = G.limits(ex);
// foot clearance in the air and flight time (both feet off the floor by more than 1 cm)
const tl = L.R.buildTimeline(ex);
let clear = 0, airT = 0;
for (let i = 0; i <= 2000; i++) { const t = (i / 2000) * ex.timeline.duration, W = L.R.evalPose(L.rig, tl.pose(t), ex.contacts); const lo = Math.min(H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'foot_l')); clear = Math.max(clear, lo); if (lo > 1) airT += ex.timeline.duration / 2000; }
const Wb = L.fk(poses.bottom, F.contacts), Ws = L.fk(poses.stand, F.contacts), Wa = L.fk(poses.absorb, F.contacts);
const set = G.setKin(ex);
set('Squat depth', 'setup', `≈${Math.round(P.kneeOf(Ws, 'r'))}° standing`); set('Squat depth', 'peak', `≈${Math.round(P.kneeOf(Wb, 'r'))}° knee flexion before the jump (hip ${Math.round(poses.bottom.ch.hip_r.flex)}°)`);
set('Flight', 'setup', 'Feet flat'); set('Flight', 'peak', `Feet ${r1(clear)} cm off the floor at the top, ≈${airT.toFixed(2)} s in the air`);
set('Landing', 'setup', '–'); set('Landing', 'peak', `Balls of the feet first, then heels; absorbs to ≈${Math.round(P.kneeOf(Wa, 'r'))}° knee flexion, knees over the toes`);
set('Trunk inclination', 'setup', `≈${Math.round(P.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(P.trunkLean(Wb))}° forward at the bottom`);
set('Dumbbells', 'setup', 'Hanging at the sides, palms in'); set('Dumbbells', 'peak', `Stay at the sides (≥${rep.dbBody} cm from the legs on the rig shapes)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.25 s down, 0.2 s pause, 0.37 s drive, flight, landing absorbed over about 0.4 s, 1.05 s back to standing');
console.log(`Dumbbell Plyo Squat: wrote ${L.write(ex)} (${keyframes.length} keys)\n  ${JSON.stringify(rep)}\n  legs ${JSON.stringify(lr)} jump ${JSON.stringify(jump)} err ${JSON.stringify(err)}\n  clear ${r1(clear)} air ${airT.toFixed(2)} limits ${JSON.stringify(lim)}`);
if (rep.slide > 0.05 || lr.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1 || rep.floor < -0.5) { console.error('FAIL: dumbbell through the floor or the body, or a foot below the floor'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-plyo-squat', ex, r1(lr.kneeR[1]));
