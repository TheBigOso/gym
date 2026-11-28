// Dumbbell Elevated Heel Goblet Squat (GymVisual "Dumbbell Elevated Heel Goblet Squat", movement reference only): both
// heels up on a low board (feet pitched 12 degrees heel-up, the balls of the feet on the floor), feet a little narrower than
// shoulder width with the toes out 12 degrees; one dumbbell held upright against the chest, both hands cupping the top
// plate, elbows down. The raised heels let the knees travel further forward, so the squat sinks deep with the trunk upright:
// 2 s down to thighs below parallel, short pause, 1.2 s up. Both feet planted (constant IK targets). Bilateral.
// Built on the goblet squat (b3-legs gobletArms) and build/families/b6-03.js squatAuthor (heel board).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/b6-03');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-elevated-heel-goblet-squat.json');

const STANCE = 17, TOE = 12, PITCH = +(process.env.PITCH ?? 12);
const OFF = B.GOBLET_OFFSET;
const armsFn = (p, f) => { const q = B.gobletArms(p, { at: [25, 6 - 2 * f, 5.4], elbow: [14, -16, 17 + 2 * f], tilt: 0.45 }); delete q.__armCost; return q; };
const cfg = {
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: +(process.env.KB ?? 128), pitchBottom: +(process.env.PB ?? -24), backBottom: +(process.env.BB ?? -13), kneeOut: 1.5,
  spine: { l5: -3, t12: -2, t6: 0 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3, heel: { pitch: PITCH },
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
};
// first pass places the board under the standing heels; the second checks the whole loop against it
const first = F.squatAuthor(cfg, meta);
cfg.heel.board = F.heelBoard(L.fk(first.poses.stand, first.contacts));
const { ex, report: r, contacts, poses } = F.squatAuthor(cfg, meta);
ex.props = [cfg.heel.board, B.heldProp('r', 'goblet', OFF)];
ex.exercise.reference.note = F.NOTE;
const db = B.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.stand, contacts);
const lim = F.limits(ex), heel = F.heelOver(Wt, cfg.heel.board);
const set = F.setKin(ex);
set('Stance width', 'setup', `${2 * STANCE} cm between ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Heel elevation', 'setup', `Heels on a ${cfg.heel.board.size[1]} cm board, feet pitched ${PITCH}° heel-up, balls of the feet on the floor`); set('Heel elevation', 'peak', 'Unchanged (heels stay on the board)');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Clear of the chest and thighs (≥${db.dbClear} cm on the rig shapes)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Dumbbell Elevated Heel Goblet Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  ${JSON.stringify(db)} board ${JSON.stringify(cfg.heel.board)} heel over board ${heel.toFixed(2)} limits ${JSON.stringify(lim)}`);
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell passes through the body or the floor'); process.exitCode = 1; }
if (r.board < -0.3 || r.floor < -0.5) { console.error('FAIL: foot through the board or the floor'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
F.gateMeasure('dumbbell-elevated-heel-goblet-squat', ex, r.knee[1]);
