// Dumbbell Lateral Walk (GymVisual 17978, male; movement reference only, the page could not be read, so the movement
// follows the name and standard coaching): a dumbbell in each hand at the sides (neutral grip), feet hip width, sitting
// into a half squat (hips back, chest up). Step the right foot out to the side, then bring the left foot in after it to
// hip width again, staying low; then walk back the other way (left foot leads, right follows) to the start. Two side
// steps each way per loop. Planted feet are flat leg contacts; a stepping foot is lifted (contact weight 0) and set down
// flat. Lunge-family body keys (b4-power body / handArm), arms long with the dumbbells beside the thighs. Bilateral
// (both directions every loop).
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-lateral-walk.json');

const ID = 'dumbbell-lateral-walk';
const HALF = 13, STEP = +(process.env.STEP ?? 30), KNEE = +(process.env.KNEE ?? 42), LIFT = 6, PITCH = -16;
const F = P.makeFamily({ toe: 8, half: HALF });
const sc = { protract: 2, elevate: -2 };
const fl = (z, o = {}) => Object.assign({ c: 'flat', x: 0, z }, o);
const up = (z, lift = LIFT) => fl(z, { lift, w: 0 });
const cfg = (r, l, z, side, knee = KNEE) => ({ feet: { r, l }, z, side, knee, pitch: PITCH, spine: { l5: -2, t12: 0, t6: 1 }, shX: 4, sc: clone(sc), neck: P.levelNeck(-PITCH + 1) });
const Z = { r0: HALF, l0: -HALF, r1: HALF + STEP, l1: -HALF + STEP };
const B = {
  s0: cfg(fl(Z.r0), fl(Z.l0), 0, 'r'),
  rUp: cfg(up(Z.r0 + STEP * 0.5), fl(Z.l0), -3, 'l', KNEE + 3),
  rReach: cfg(up(Z.r1 - 1.5, 1.2), fl(Z.l0), 4, 'l', KNEE + 2),
  rDn: cfg(fl(Z.r1), fl(Z.l0), STEP / 2, 'r', KNEE - 4),
  lUp: cfg(fl(Z.r1), up(Z.l0 + STEP * 0.5), STEP + 3, 'r', KNEE + 3),
  lReach: cfg(fl(Z.r1), up(Z.l1 - 1.5, 1.2), STEP - 4, 'r', KNEE + 2),
  lDn: cfg(fl(Z.r1), fl(Z.l1), STEP, 'r'),
};
// arms long, dumbbells beside the thighs (neutral grip)
const ARM = P.hangKey(1, 11.5, 8);
const order = ['s0', 'rUp', 'rReach', 'rDn', 'lUp', 'lReach', 'lDn'];
const poses = {}, err = {}, state = {};
for (const n of order) { const b = P.body(F, B[n]); let p = P.handArm(b, ARM, state); err[n] = state.err; p = P.mirror(p); delete p.__spec; poses[n] = p; }
// left foot reaching back the other way (mirror of the right foot's reach): reuse rUp / rReach shapes for the return
const R2 = { lUpB: cfg(fl(Z.r1), up(Z.l1 - STEP * 0.5), STEP + 3, 'r', KNEE + 3), lReachB: cfg(fl(Z.r1), up(Z.l0 + 1.5, 1.2), STEP - 4, 'r', KNEE + 2), rUpB: cfg(up(Z.r1 - STEP * 0.5), fl(Z.l0), -3, 'l', KNEE + 3), rReachB: cfg(up(Z.r0 + 1.5, 1.2), fl(Z.l0), 4, 'l', KNEE + 2) };
for (const n of Object.keys(R2)) { const b = P.body(F, R2[n]); let p = P.handArm(b, ARM, state); err[n] = state.err; p = P.mirror(p); delete p.__spec; poses[n] = p; }
poses.lDnH = clone(poses.lDn); poses.s0H = clone(poses.s0);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
// a step: lift (0.36), reach (0.62), land (0.75) of the step time; the pelvis shifts over the stance foot first
const step = (t0, t1, a, b, c, d) => { const s = t1 - t0; return [{ t: +(t0 + s * 0.36).toFixed(3), pose: b }, { t: +(t0 + s * 0.68).toFixed(3), pose: c }, { t: +(t0 + s * 0.85).toFixed(3), pose: d }]; };
const keyframes = [{ t: 0, pose: 's0' }, { t: ph.setup.end, pose: 's0' },
  ...step(ph.right1.start, ph.right1.end, 's0', 'rUp', 'rReach', 'rDn'), ...step(ph.right2.start, ph.right2.end, 'rDn', 'lUp', 'lReach', 'lDn'), { t: ph.pause.end, pose: 'lDnH' },
  ...step(ph.left1.start, ph.left1.end, 'lDn', 'lUpB', 'lReachB', 'rDn'), ...step(ph.left2.start, ph.left2.end, 'rDn', 'rUpB', 'rReachB', 's0H'), { t: D, pose: 's0' }];
// the rDn key is reused on the way back (same stance); give it its own name there
keyframes.forEach((k, i) => { if (k.pose === 'rDn' && i > 6) k.pose = 'rDnB'; }); poses.rDnB = clone(poses.rDn);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [P.B.heldProp('r', 'handle'), P.B.heldProp('l', 'handle')];
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle' }));
const rep = P.B.sweep(ex, { held });
const lr = F.report(ex);
const jump = P.jumps(ex);
require('./families/eq-cable').limits(poses);
const BC = require('./families/b5-bandcore');
const pk = BC.scan(ex, { measure: BC.MEASURE.kneeFlexion }).peak;
const set = H.setKin(ex), W0 = L.fk(poses.s0, F.contacts), Wd = L.fk(poses.rDn, F.contacts);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(W0, 'r'))}° (half squat, feet hip width)`); set('Knee flexion', 'peak', `${lr.kneeR[0]}-${lr.kneeR[1]}° right, ${lr.kneeL[0]}-${lr.kneeL[1]}° left over the loop (stays low; peak ${pk}°)`);
set('Step width', 'setup', `Feet ${2 * HALF} cm apart (ankle centres)`); set('Step width', 'peak', `${STEP} cm side steps: ${2 * HALF + STEP} cm apart after the lead foot lands`);
set('Trunk', 'setup', `≈${Math.round(P.trunkLean(W0))}° forward (hips back, chest up)`); set('Trunk', 'peak', `≈${Math.round(P.trunkLean(Wd))}° forward in the wide stance`);
set('Arms', 'setup', 'Long, dumbbells beside the thighs'); set('Arms', 'peak', `Unchanged; dumbbells clear of the legs by ${rep.dbBody} cm (rig shapes)`);
set('Tempo', 'setup', 'Settle 0.6 s in the half squat'); set('Tempo', 'peak', 'About 1 s per side step, two steps each way');
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(pk - 6), max: Math.ceil(pk + 6) };
console.log(`Dumbbell Lateral Walk: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  legs ${JSON.stringify(lr)} jump ${JSON.stringify(jump)} peak ${pk}`);
if (rep.slide > 0.05 || lr.slide > 0.05) { console.error(`FAIL ${ID}: planted feet slide`); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -1 || rep.floor < -0.5) { console.error(`FAIL ${ID}: dumbbell through the floor or the body, or below the floor`); process.exitCode = 1; }
