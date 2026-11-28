// Potty Squat (GymVisual #17609; page not readable here, movement from the name: a deep "toilet" squat, sitting straight
// down between the heels). Feet a little wider than the shoulders, toes out 25 degrees, heels down, arms reaching forward
// as a counterbalance. 2 s down to a deep squat (knees about 125 degrees, hips well below the knees' line toward the heels,
// trunk fairly upright), a short pause, about 1.2 s up. Both feet planted (constant IK targets). Bilateral. Squat family
// (squat.js author), deeper and more upright than the bodyweight squat; the ankle stays inside its 35 degree limit.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const S = require('./families/single');
const meta = require('./meta/potty-squat.json');

const STANCE = 21, TOE = 25;
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 125, pitchBottom: -30, backBottom: -22, kneeOut: 2,
  spine: { l5: -2, t12: -1, t6: 2 }, arms: 'forward', lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.3, pose: 'bottom' }, { t: 3.9, pose: 'rise50' }, { t: 4.5, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
const Wb = L.fk(poses.bottom, contacts), com = S.com(Wb);
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (!k) throw new Error(prefix); k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(r.Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Ankle', 'setup', 'Heels down'); set('Ankle', 'peak', `≈${Math.round(r.dorsi)}° dorsiflexion, heels still down`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.5 s pause, 1.2 s up, 1.5 s reset');
delete r.Wb; delete r.Wt;
console.log(`Potty Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)} comBottom x ${r1(com[0])} (ankles at 0)`);
if (com[0] < -6) { console.error('FAIL: centre of mass behind the heels'); process.exitCode = 1; }
