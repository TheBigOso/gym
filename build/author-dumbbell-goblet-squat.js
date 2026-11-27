// Dumbbell Goblet Squat (GymVisual #176012): one dumbbell held upright against the chest, both hands cupping the top plate
// (carried by the right hand, grip 'goblet'; the left hand mirrors beside it), elbows down. Feet about shoulder width, toes
// out 18 degrees. 2 s down to thighs a bit below parallel with the elbows just inside the knees, short pause, 1.2 s up.
// Both feet planted (constant IK targets). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const F = require('./families/squat');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-goblet-squat.json');

const STANCE = 19.5, TOE = 18;
const OFF = B.GOBLET_OFFSET;
// hands in front of the sternum (spine_t6 frame); the elbows drop a little lower and wider as the squat deepens
// (elbow z 17: the rig v2 shoulders sit at z 20.2, so the upper arms hang forward and only slightly in, not across the chest)
const armsFn = (p, f) => B.gobletArms(p, { at: [25, 6 - 2 * f, 5.4], elbow: [14, -16, 17 + 2 * f], tilt: 0.45 });
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 118, pitchBottom: -34, backBottom: -18, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 0 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
for (const k in poses) delete poses[k].__armCost;
ex.props = [B.heldProp('r', 'goblet', OFF)];

// dumbbell checks over the loop: floor, chest/abdomen/thighs (hands and forearms hold it, so they are left out)
const db = B.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.stand, contacts);
const elbowGap = r1(Math.min(Wb.knee_r.p[2] - Wb.elbow_r.p[2], -Wb.knee_l.p[2] + Wb.elbow_l.p[2])); // knee joint centre outside the elbow
const kin = ex.exercise.kinematics, set = (prefix, field, v) => { const k = kin.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Clear of the chest and thighs (≥${db.dbClear} cm on the rig shapes); elbows ${elbowGap} cm inside the knee joint centres`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Goblet Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  ${JSON.stringify(db)} elbowInsideKnee ${elbowGap}`);
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell passes through the body or the floor'); process.exitCode = 1; }
