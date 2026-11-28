// Dumbbell Elevated Heel Front Squat (GymVisual "Dumbbell Elevated Heel Front Squat", movement reference only): both heels
// up on a low board (feet pitched 12 degrees heel-up, the balls of the feet on the floor), feet a little narrower than
// shoulder width, toes out 12 degrees; a dumbbell racked on each shoulder (neutral grip, rear plate on the front of the
// shoulder, elbows forward). 2 s down to thighs below parallel with the trunk upright, short pause, 1.2 s up. Both feet
// planted (constant IK targets). Bilateral. Built on the dumbbell front squat (b4-squats2 rackArms) and
// build/families/b6-03.js squatAuthor (heel board).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/b6-03');
const S = require('./families/b3-shoulders');
const K = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-elevated-heel-front-squat.json');

const STANCE = 17, TOE = 12, PITCH = 12;
let armErr = 0;
const armsFn = (p, f) => { const q = K.rackArms(p, { wristFlex: -50, level: 1 }); armErr = Math.max(armErr, q.__err.wrist); delete q.__err; return q; };
const cfg = {
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: +(process.env.KB ?? 127), pitchBottom: +(process.env.PB ?? -22), backBottom: +(process.env.BB ?? -12), kneeOut: 1.5,
  spine: { l5: -3, t12: -2, t6: 1 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3, heel: { pitch: PITCH },
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
};
const first = F.squatAuthor(cfg, meta);
cfg.heel.board = F.heelBoard(L.fk(first.poses.stand, first.contacts));
const { ex, report: r, contacts, poses } = F.squatAuthor(cfg, meta);
ex.props = [cfg.heel.board, ...S.DUMBBELLS.map((d) => JSON.parse(JSON.stringify(d)))];
ex.exercise.reference.note = F.NOTE;
// the rear plate rests on the front of the shoulder (as in the dumbbell front squat): the holding arm's deltoid and upper
// arm are left out of the rig-shape clearance
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r', 'leg_l'], skip: (s, id) => new RegExp(`^(deltoid|upperarm|biceps)_${s}$`).test(id) });
const Wt = L.fk(poses.stand, contacts);
const lim = F.limits(ex);
const set = F.setKin(ex);
set('Stance width', 'setup', `${2 * STANCE} cm between ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Heel elevation', 'setup', `Heels on a ${cfg.heel.board.size[1]} cm board, feet pitched ${PITCH}° heel-up, balls of the feet on the floor`); set('Heel elevation', 'peak', 'Unchanged (heels stay on the board)');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbells', 'setup', 'Racked on the front of the shoulders, palms in, elbows forward'); set('Dumbbells', 'peak', `Stay on the shoulders (clearance to the body ≥${rep.clear.d} cm on the rig shapes)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Elevated Heel Front Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} slide ${rep.slide} armErr ${r1(armErr)} board ${JSON.stringify(cfg.heel.board)} limits ${JSON.stringify(lim)}`);
K.gate('dumbbell-elevated-heel-front-squat', rep);
if (r.board < -0.3) { console.error('FAIL: foot through the board'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
F.gateMeasure('dumbbell-elevated-heel-front-squat', ex, r.knee[1]);
