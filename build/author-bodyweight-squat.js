// Bodyweight Squat (GymVisual #119712): feet about shoulder width, toes out 15 degrees, arms reaching forward at shoulder
// height. 2 s down to thighs about parallel, brief pause, about 1.2 s up. Both feet planted (constant IK targets). Bilateral.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const meta = require('./meta/bodyweight-squat.json');

const STANCE = 18.5; // ankle centres 37 cm apart: about the rig's shoulder width (Zawadka 2020 protocol)
const { ex, report: r } = F.author({
  stance: STANCE, toe: 15, kneeTop: 3, kneeBottom: 112, pitchBottom: -38, backBottom: -20, kneeOut: 1,
  spine: { l5: -3, t12: -2, t6: 1 }, arms: 'forward', lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);

const kin = ex.exercise.kinematics, set = (prefix, field, v) => { const k = kin.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out 15°`);
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(r.Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Bodyweight Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}`);
