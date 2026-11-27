// Dumbbell Sumo Squat (GymVisual #232212): wide stance (ankle centres 60 cm, about 1.6x shoulder width), toes out 30
// degrees, one dumbbell hanging upright between the legs with its top plate squeezed between the palms (arms long, palms
// facing each other). 2 s down to thighs about parallel with the knees pushed out over the toes and the trunk fairly upright,
// short pause, 1.2 s up. Both feet planted (constant IK targets). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const F = require('./families/squat');
const K = require('./families/b4-squats2');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-sumo-squat.json');

const STANCE = 30, TOE = 30;
let armErr = 0;
const armsFn = (p) => { const q = K.sumoArms(p); armErr = Math.max(armErr, q.__err.wrist); delete q.__err; return q; };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 4, kneeBottom: 104, pitchBottom: -32, backBottom: -17, kneeOut: 1,
  spine: { l5: -4, t12: -2, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
ex.props = [B.heldProp('r', 'end', K.SUMO_OFFSET)];
ex.exercise.reference.note = K.NOTE;
const HOLDS = [{ side: 'r', grip: 'end', offset: K.SUMO_OFFSET }];
// the left hand squeezes the other side of the top plate: its hand/forearm are left out (the right ones always are)
const rep = K.scan(ex, { holds: HOLDS, planted: ['leg_r', 'leg_l'], skip: (s, id) => /^(hand|thumb|forearm)_l$/.test(id) });
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts);
const thighOut = (W) => { const u = V.sub(W.knee_r.p, W.hip_r.p); return Math.atan2(u[2], Math.hypot(u[0], u[1])) / L.R.DEG; };
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width)`); set('Stance width', 'peak', 'Unchanged');
set('Toe-out', 'setup', `${TOE}°`); set('Toe-out', 'peak', `Unchanged; knee ${r.kneeLine[1]} cm outside the foot axis at the bottom`);
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel), thighs ≈${Math.round(thighOut(Wb))}° out of the sagittal plane`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbell', 'setup', 'Hanging upright between the legs, top plate between the palms'); set('Dumbbell', 'peak', `${rep.dbFloor} cm above the floor at the lowest; ≥${rep.clear.d} cm from the legs and trunk (rig shapes)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Sumo Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} slide ${rep.slide} armErr ${r1(armErr)}`);
K.gate('dumbbell-sumo-squat', rep);
