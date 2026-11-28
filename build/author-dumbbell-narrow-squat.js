// Dumbbell Narrow Squat (GymVisual "Dumbbell Narrow Squat", movement reference only): feet close together (ankle centres
// 16 cm apart, toes out 6 degrees), a dumbbell hanging in each hand at the sides (neutral grip, arms long). 2 s down with
// the knees travelling forward over the toes and the trunk leaning a little more than in a hip-width squat (the narrow
// base and the rig's 35-degree ankle range limit the depth to about parallel), short pause, 1.2 s up. The dumbbells hang
// straight down beside the legs. Both feet planted (constant IK targets). Bilateral.
// Built on build/families/b6-03.js squatAuthor (a copy of the batch 2 squat solve) with b3-legs armsHang.
const L = require('./lib');
const F = require('./families/b6-03');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-narrow-squat.json');

const STANCE = 8, TOE = 6;
const HANG = { out: +(process.env.OUT ?? 6), fwd: 1 };
const armsFn = (p) => { const q = B.armsHang(p, HANG); delete q.__armCost; return q; };
const { ex, report: r, contacts, poses } = F.squatAuthor({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: +(process.env.KB ?? 105), pitchBottom: +(process.env.PB ?? -36), backBottom: +(process.env.BB ?? -18), kneeOut: 0.5,
  spine: { l5: -4, t12: -2, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
ex.props = [B.heldProp('r'), B.heldProp('l')];
ex.exercise.reference.note = F.NOTE;
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r', 'leg_l'] });
const Wt = L.fk(poses.stand, contacts);
const lim = F.limits(ex), set = F.setKin(ex);
set('Stance width', 'setup', `${2 * STANCE} cm between ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°, ankle dorsiflexion ≈${Math.round(r.dorsi)}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbells', 'setup', 'Hanging at the sides, palms in'); set('Dumbbells', 'peak', `Straight down beside the legs (≥${rep.clear.d} cm from the body on the rig shapes, ${rep.dbFloor} cm off the floor at the lowest)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Narrow Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} slide ${rep.slide} limits ${JSON.stringify(lim)}`);
K.gate('dumbbell-narrow-squat', rep);
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
F.gateMeasure('dumbbell-narrow-squat', ex, r.knee[1]);
