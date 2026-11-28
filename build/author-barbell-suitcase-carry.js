// Barbell Suitcase Carry (GymVisual "Barbell Suitcase Carry", movement reference only): one barbell held by its middle (its
// balance point) in the right hand at the side, neutral grip, the bar pointing front to back and level, arm long, shoulders
// level; the left arm hangs relaxed. Walk forward with short, controlled steps (a half step, three full steps and a closing
// step, about 1 m), trunk upright and not leaning away from or toward the bar, then stand with the feet together; the loop
// restarts at the start mark. Planted feet use flat contacts; each step rolls the back foot onto its ball before it swings
// through. Authored with the bar in the right hand (the player mirrors). Built on the dumbbell farmers carry (b4-power gait)
// and the one-hand barbell helpers (b5-bbhinge bar1At / sweep1).
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const G = require('./families/b6-03');
const meta = require('./meta/barbell-suitcase-carry.json');

const F = P.makeFamily({ toe: 6, half: 10 });
const PLATE_D = 45;
const STEP = 50, PERIOD = 0.75;
const { keys: gk, travel } = P.gait(F, { step: STEP, period: PERIOD, knee: 7, sc: { protract: 0, elevate: -2 } });
// right hand: straight arm a little outside the shoulder, thumb forward (the bar fore-aft); the arm hangs a touch further
// out than for a dumbbell so the bar clears the thigh
const ARM = Object.assign(P.hangKey(1, 10, 6), { grip: X.GRIP });
const keys = gk.map((k) => Object.assign(k, { arm: ARM }));
keys.splice(1, 0, { same: 'stand', t: 0.6 });
keys.push({ same: 'end', t: +(keys[keys.length - 1].t + 0.8).toFixed(3) });
const { poses, keyframes, err } = P.chain(F, keys, { both: false });
// left arm relaxed at the side (no load), shoulder girdle level with the loaded side
for (const k in poses) { poses[k] = P.leftRelaxed(poses[k], { out: 7, fwd: 2, elbow: 12 }); poses[k].ch.sc_l = { protract: 0, elevate: 0 }; }
const D = keyframes[keyframes.length - 1].t;
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.timeline = Object.assign({}, ex.timeline, { duration: D });
ex.props = [X.barbell1Prop({ plateD: PLATE_D })];
ex.exercise.reference.note = G.NOTE;
const sw = X.sweep1(ex, { probe: (W, pz, t, o) => { const b = X.bar1At(W); o.tilt = Math.max(o.tilt ?? 0, Math.abs(Math.asin(Math.max(-1, Math.min(1, b.ax[1])))) * 180 / Math.PI); o.yaw = Math.max(o.yaw ?? 0, Math.abs(Math.asin(Math.max(-1, Math.min(1, b.ax[2])))) * 180 / Math.PI); } });
const lr = F.report(ex), jump = P.jumps(ex), lim = G.limits(ex);
const set = G.setKin(ex), Wm = L.fk(poses.k2swing, F.contacts), W0 = L.fk(poses.stand, F.contacts);
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${STEP} cm steps (stride ${2 * STEP} cm), ${travel} cm per loop`);
set('Cadence', 'setup', `${PERIOD} s per step`); set('Cadence', 'peak', `≈${Math.round(60 / PERIOD)} steps per minute`);
set('Trunk', 'setup', `≈${Math.round(P.trunkLean(W0))}° from vertical standing, no side bend`); set('Trunk', 'peak', `≈${Math.round(P.trunkLean(Wm))}° mid-step; spine side-bend channels 0 (upright against the one-sided load)`);
set('Bar', 'setup', `Held at its middle in the right hand, bar fore-aft, plates ${r1(X.bar1MinY(W0, { plateD: PLATE_D }))} cm off the floor`); set('Bar', 'peak', `Within ${r1(sw.tilt)}° of level and ${r1(sw.yaw)}° of straight ahead; ≥${r1(sw.barBody)} cm from the body (rig shapes)`);
sw.tilt = r1(sw.tilt); sw.yaw = r1(sw.yaw);
console.log(`Barbell Suitcase Carry: wrote ${L.write(ex)} (${keyframes.length} keys, ${D} s)\n  ${JSON.stringify(sw)}\n  legs ${JSON.stringify(lr)} jump ${JSON.stringify(jump)} limits ${JSON.stringify(lim)}`);
if (sw.slide > 0.05 || lr.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < -0.5 || sw.floor < -0.5) { console.error('FAIL: bar through the floor or the body, or a foot below the floor'); process.exitCode = 1; }
if (sw.tilt > 6) { console.error('FAIL: bar not level'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
{ const W1 = L.fk(poses.end, F.contacts), trav = V.len(V.sub(W1.pelvis.p, W0.pelvis.p)); G.gateMeasure('barbell-suitcase-carry', ex, r1(trav)); }
