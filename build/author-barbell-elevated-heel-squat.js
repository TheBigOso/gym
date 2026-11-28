// Barbell Elevated Heel Squat (GymVisual #20944 "Barbell Elevated Heel Squat"; page not readable here, movement from the
// name and standard coaching): high-bar back squat with both heels on a low block (the balls of the feet on the floor, feet
// pitched about 15 degrees heel-up). Bar on the upper traps just below C7 (b5-bbsquat backBar), 80 cm overhand grip, elbows
// down; feet about hip width (ankle centres 26 cm apart), toes out 10 degrees, both feet planted. The raised heels let the
// knees travel far forward over the toes with the trunk upright, so the squat goes deep (knees about 125 degrees) with less
// forward lean than a flat-footed squat. 2 s down, short pause, 1.2 s up. The block is sized to the heels (b6-01 heelSquat).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/b6-01');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-elevated-heel-squat.json');

const STANCE = 13, TOE = 10, HEEL = +(process.env.HEEL ?? 15), KB = +(process.env.KB ?? 125);
const bar = S5.backBar(S5.HIGH_BAR);
const { ex, report: r, contacts, poses, block, Wt, Wb } = F.heelSquat({
  stance: STANCE, toe: TOE, heel: HEEL, ballX: 0.5, kneeTop: 3, kneeBottom: KB, pitchBottom: +(process.env.PB ?? -22), backBottom: +(process.env.BK ?? -22), kneeOut: 0.5,
  spine: { l5: 8, t12: 3, t6: 0 }, armsFn: bar.armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
const bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 45), HOOK_Y = Math.round(bt.c[1] - 6);
ex.props = [BB.barbellProp(), block, EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop];
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}, 120).barBody;
ex.exercise.reference.note = S5.NOTE;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, MID = Wt.ankle_r.p[0] + 6;
set('Heel block', 'setup', `${block.size[1]} cm block under the heels, feet ${HEEL}° heel-up with the balls of the feet on the floor`); set('Heel block', 'peak', `Unchanged; peak ankle dorsiflexion ${d(r.dorsi)} relative to the foot`);
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${r1(Wb.knee_r.p[1] - Wb.hip_r.p[1])} cm below the knees, knees ${r1(Wb.knee_r.p[0] - Wb.toe_r.p[0])} cm past the toe joints`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical; bar ${r1(bb.c[0] - MID)} cm from mid-foot`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
const lim = S5.limits(ex);
console.log(`Barbell Elevated Heel Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-elevated-heel-squat', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
if (r.hipBottom > 139.5) { console.error('FAIL: hip flexion at the rig limit'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
