// Dumbbell Bar Grip Sumo Squat (GymVisual "Dumbbell Bar Grip Sumo Squat", movement reference only): wide stance (ankle
// centres 60 cm, about 1.6x shoulder width), toes out 30 degrees; one dumbbell held across the body by its handle in both
// hands (overhand, hands side by side, palms toward the body), arms long so it hangs between the legs. 2 s down to thighs
// about parallel with the knees pushed out over the toes and the trunk fairly upright, short pause, 1.2 s up. The dumbbell
// hangs straight under the shoulders, clear of the thighs. Both feet planted (constant IK targets). Bilateral.
// Two-hand dumbbell (attach wrist_r with wrist_l): the player draws it midway between the hands along the line joining
// them. Built on the dumbbell sumo squat and build/families/b6-03.js (squatAuthor, db2Hang, db2Clear).
const L = require('./lib');
const { V, r1 } = L;
const F = require('./families/b6-03');
const K = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-bar-grip-sumo-squat.json');

const STANCE = 30, TOE = 30;
// keys every 1/8 of the depth (the two hands share one handle: denser keys keep their spacing steady between keys)
const N = 8, DEPTHS = { stand: 0, bottom: 1 }, KEYS = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }];
for (let k = 1; k < N; k++) DEPTHS[`d${k}`] = k / N;
for (let k = 1; k < N; k++) KEYS.push({ t: +(0.8 + (2.0 * k) / N).toFixed(3), pose: `d${k}` });
KEYS.push({ t: 2.8, pose: 'bottom' }, { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' });
for (let k = N - 1; k >= 1; k--) KEYS.push({ t: +(3.2 + (1.2 * (N - k)) / N).toFixed(3), pose: `d${k}` });
KEYS.push({ t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' });
let armCost = 0;
const armsFn = (p, f, contacts) => { const q = F.db2Hang(p, contacts, { hz: 4.6, clear: 2.5 }); armCost = Math.max(armCost, q.__cost); delete q.__cost; delete q.__handle; return q; };
const { ex, report: r, contacts, poses } = F.squatAuthor({
  stance: STANCE, toe: TOE, kneeTop: 4, kneeBottom: 104, pitchBottom: -30, backBottom: -16, kneeOut: 1,
  spine: { l5: -4, t12: -2, t6: 1 }, arms: 'none', armsFn, armsLate: true, lead: 1.5, settle: 0.3,
  depths: DEPTHS, keyframes: KEYS,
}, meta);
ex.props = [{ id: 'db', kind: 'dumbbell', size: [F.DB2.length, F.DB2.diameter, F.DB2.diameter], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } }];
ex.exercise.reference.note = F.NOTE;
// whole loop: dumbbell clearance to the body (hands and forearms hold it), lowest point, hands on the handle
const tl = L.R.buildTimeline(ex);
const db = { clear: { d: 1e9 }, minY: 1e9, gap: [1e9, 0] };
for (let i = 0; i <= 600; i++) {
  const t = (i / 600) * ex.timeline.duration, W = L.R.evalPose(L.rig, tl.pose(t), contacts), c = F.db2Clear(W);
  if (c.clear.d < db.clear.d) db.clear = { d: +c.clear.d.toFixed(2), id: c.clear.id, t: +t.toFixed(2) };
  db.minY = Math.min(db.minY, c.minY); db.gap = [Math.min(db.gap[0], c.d.gap), Math.max(db.gap[1], c.d.gap)];
}
db.minY = r1(db.minY); db.gap = db.gap.map(r1);
const rep = K.scan(ex, { planted: ['leg_r', 'leg_l'] });
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts);
const thighOut = (W) => { const u = V.sub(W.knee_r.p, W.hip_r.p); return Math.atan2(u[2], Math.hypot(u[0], u[1])) / L.R.DEG; };
const lim = F.limits(ex), set = F.setKin(ex);
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width)`); set('Stance width', 'peak', 'Unchanged');
set('Toe-out', 'setup', `${TOE}°`); set('Toe-out', 'peak', `Unchanged; knee ${r.kneeLine[1]} cm outside the foot axis at the bottom`);
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel), thighs ≈${Math.round(thighOut(Wb))}° out of the sagittal plane`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbell', 'setup', 'Held across by the handle in both hands, overhand, arms long'); set('Dumbbell', 'peak', `${db.minY} cm above the floor at the lowest; ≥${db.clear.d} cm from the legs and trunk (rig shapes); hands ${db.gap[0]}-${db.gap[1]} cm apart on the handle`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Bar Grip Sumo Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  db ${JSON.stringify(db)} armCost ${armCost.toFixed(3)} slide ${rep.slide} limits ${JSON.stringify(lim)}`);
if (db.minY < 0 || db.clear.d < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
if (db.gap[1] > 12 || db.gap[1] - db.gap[0] > 1.5) { console.error('FAIL: hands slide on the handle'); process.exitCode = 1; }
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
F.gateMeasure('dumbbell-bar-grip-sumo-squat', ex, r.knee[1]);
