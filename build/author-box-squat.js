// Box Squat (GymVisual #1016812): bodyweight, arms reaching forward; feet a little wider than the shoulders, toes out 18
// degrees, a box behind the heels. Push the hips back with the shins close to vertical and sit lightly on the box (about
// 0.6 s, staying braced), then stand. Both feet planted (constant IK targets). Bilateral. The box height and position come
// from the skinned mesh: its top sits under the lowest point of the buttocks at the bottom (b2/scratch/sq2/mesh.mjs).
const L = require('./lib');
const { V, R, r1 } = L;
const F = require('./families/squat');
const K = require('./families/b4-squats2');
const meta = require('./meta/box-squat.json');

const STANCE = 23, TOE = 18;
// measured on the skinned mesh at the bottom: lowest buttock vertex (x, y) in rig cm
const SEAT = JSON.parse(process.env.SEAT || '[-25, 46.2]');
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 4, kneeBottom: +(process.env.KB || 96), pitchBottom: -40, backBottom: -26, kneeOut: 1.5,
  spine: { l5: -3, t12: -2, t6: 1 }, arms: 'forward', lead: 1.4, settle: 0.4,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, l92: 0.92, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.6, pose: 'l92' }, { t: 2.8, pose: 'bottom' },
    { t: 3.1, pose: 'bottomSettle' }, { t: 3.4, pose: 'bottom' }, { t: 4.0, pose: 'rise50' }, { t: 4.6, pose: 'stand' }, { t: 6.4, pose: 'stand' }],
}, meta);
// box: top under the buttocks, front edge 9 cm in front of their lowest point
const BOX_H = r1(SEAT[1]), FRONT = r1(SEAT[0] + 9);
ex.props = [{ id: 'box', kind: 'box', center: [r1(FRONT - 20), 0, 0], size: [40, BOX_H, 40] }];
ex.exercise.reference.note = K.NOTE;
const rep = K.scan(ex, { planted: ['leg_r', 'leg_l'] });
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts);
const shin = (W) => Math.atan2(W.knee_r.p[0] - W.ankle_r.p[0], W.knee_r.p[1] - W.ankle_r.p[1]) / R.DEG;
const set = (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Box height', 'setup', `${BOX_H} cm box, front edge ${-FRONT} cm behind the ankles`); set('Box height', 'peak', 'Buttocks touch the box top (measured on the skinned mesh)');
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Shin angle', 'setup', `≈${Math.round(shin(Wt))}°`); set('Shin angle', 'peak', `≈${Math.round(shin(Wb))}° forward of vertical on the box`);
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward (hip ${Math.round(r.hipBottom)}°)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.6 s on the box, 1.2 s up, 1.8 s reset');
delete r.Wb; delete r.Wt;
console.log(`Box Squat: wrote ${L.write(ex)} box ${JSON.stringify(ex.props[0])}\n  ${JSON.stringify(r)} shinBottom ${r1(shin(Wb))} slide ${rep.slide}`);
K.gate('box-squat', rep);
