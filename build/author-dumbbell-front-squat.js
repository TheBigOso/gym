// Dumbbell Front Squat (GymVisual #296612): a dumbbell racked on each shoulder (neutral grip, the rear plate resting on the
// front of the shoulder, elbows forward), feet about shoulder width with the toes out 15 degrees. 2 s down to thighs about
// parallel with the trunk fairly upright, short pause, 1.2 s up. Both feet planted (constant IK targets). Bilateral.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const S = require('./families/b3-shoulders');
const K = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-front-squat.json');

const STANCE = 19.5, TOE = 15;
if (process.env.RW) K.RACK.wrist = JSON.parse(process.env.RW); if (process.env.RE) K.RACK.elbow = JSON.parse(process.env.RE);
let armErr = 0;
const WF = JSON.parse(process.env.WF || '[-50,-50]');
const armsFn = (p, f) => { const q = K.rackArms(p, { wristFlex: WF[0] + (WF[1] - WF[0]) * f, level: +(process.env.LEVEL || 1) }); armErr = Math.max(armErr, q.__err.wrist); delete q.__err; return q; };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 116, pitchBottom: -31, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
ex.props = S.DUMBBELLS.map((d) => JSON.parse(JSON.stringify(d)));
ex.exercise.reference.note = K.NOTE;
// the rear plate rests on the front of the shoulder: measured on the skinned mesh (b2/scratch/sq2/mesh.mjs, about 0.5 cm),
// so the holding arm's own deltoid and upper arm are left out of the rig-shape clearance
const HOLDS = [{ side: 'r' }, { side: 'l' }];
const rep = K.scan(ex, { holds: HOLDS, planted: ['leg_r', 'leg_l'], skip: (s, id) => new RegExp(`^(deltoid|upperarm|biceps)_${s}$`).test(id) });
const kin = ex.exercise.kinematics, set = (prefix, field, v) => { const k = kin.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
const Wt = L.fk(poses.stand, contacts);
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbells', 'setup', 'Racked on the front of the shoulders, palms in, elbows forward'); set('Dumbbells', 'peak', `Stay on the shoulders (clearance to the body ≥${rep.clear.d} cm on the rig shapes, ${rep.clear.what})`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Front Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} slide ${rep.slide} armErr ${r1(armErr)}`);
K.gate('dumbbell-front-squat', rep);
