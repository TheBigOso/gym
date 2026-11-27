// Dumbbell Farmers Carry (GymVisual #291712): a heavy dumbbell in each hand at the sides (neutral grip), standing tall,
// shoulders set. Walk forward with short, controlled steps (a half step, three full steps and a closing step, about
// 1.1 m), arms long and still, trunk upright, then stand with the feet together; the loop restarts at the start mark.
// Planted feet use flat contacts; each step rolls the back foot onto its ball before it swings through. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-farmers-carry.json');

const F = P.makeFamily({ toe: 6, half: 10 });
const SIZE = [36, 16, 16], DSZ = { length: 36, diameter: 16 };   // heavy hex dumbbells
const STEP = +(process.env.STEP ?? 55), PERIOD = +(process.env.PERIOD ?? 0.72);
const { keys: gk, travel } = P.gait(F, { step: STEP, period: PERIOD, knee: 7, sc: { protract: 0, elevate: -4 } });
const ARM = P.hangKey(1, 9, 6);
const keys = gk.map((k) => Object.assign(k, { arm: ARM }));
keys.splice(1, 0, { same: 'stand', t: 0.6 });
keys.push({ same: 'end', t: +(keys[keys.length - 1].t + 0.8).toFixed(3) });
const { poses, keyframes, err } = P.chain(F, keys);
const D = keyframes[keyframes.length - 1].t;
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.timeline = Object.assign({}, ex.timeline, { duration: D });
ex.props = [P.B.heldProp('r', 'handle', SIZE), P.B.heldProp('l', 'handle', SIZE)];
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = P.B.sweep(ex, { held });
const lr = F.report(ex);
const jump = P.jumps(ex);
const set = H.setKin(ex), Wm = L.fk(poses.k2swing, F.contacts);
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${STEP} cm steps (stride ${2 * STEP} cm), ${travel} cm per loop`);
set('Cadence', 'setup', `${PERIOD} s per step`); set('Cadence', 'peak', `≈${Math.round(60 / PERIOD)} steps per minute`);
set('Trunk', 'setup', `≈${Math.round(P.trunkLean(L.fk(poses.stand, F.contacts)))}° from vertical standing`); set('Trunk', 'peak', `≈${Math.round(P.trunkLean(Wm))}° mid-step (upright)`);
set('Arms', 'setup', 'Long, dumbbells at the sides'); set('Arms', 'peak', `Elbows ≈${Math.round(P.B.elbowOf(Wm, 'r'))}°, dumbbells clear of the legs by ${rep.dbBody} cm (rig shapes)`);
console.log(`Dumbbell Farmers Carry: wrote ${L.write(ex)} (${keyframes.length} keys, ${D} s)\n  ${JSON.stringify(rep)}\n  legs ${JSON.stringify(lr)} jump ${JSON.stringify(jump)}`);
if (rep.slide > 0.05 || lr.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1 || rep.floor < -0.5) { console.error('FAIL: dumbbell through the floor or the body, or a foot below the floor'); process.exitCode = 1; }
