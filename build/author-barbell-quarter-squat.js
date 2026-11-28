// Barbell Quarter Squat (GymVisual #11615 "Barbell Quarter Squat"; page not readable here, movement from the name and
// standard coaching): high-bar back squat cut to the top quarter of the range. Bar on the upper traps just below C7 (fixed
// in the spine_t6 frame, b5-bbsquat backBar), 80 cm overhand grip, elbows down; feet a little wider than the hips (ankle
// centres 40 cm apart), toes out 20 degrees, both feet planted. Dip until the knees are about 60 degrees with a small
// forward lean (hips and knees bending together), short pause, drive back up. 1.2 s down, 0.3 s pause, 1 s up.
// Built on the squat family (squat.js) with the b5-bbsquat back-bar arms (barbell.js armsOnBar).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-quarter-squat.json');

const STANCE = 20, TOE = 20, KB = 60;
const bar = S5.backBar(S5.HIGH_BAR);
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: -16, backBottom: -12, footX: -12, kneeOut: 1.0,
  spine: { l5: 5, t12: 2, t6: 0 }, arms: 'none', armsFn: bar.armsFn, lead: 1.3, settle: 0.2,
  depths: { stand: 0, l33: 0.33, l66: 0.66, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.2, pose: 'l33' }, { t: 1.6, pose: 'l66' }, { t: 2.0, pose: 'bottom' },
    { t: 2.15, pose: 'bottomSettle' }, { t: 2.3, pose: 'bottom' }, { t: 2.8, pose: 'rise50' }, { t: 3.3, pose: 'stand' }, { t: 4.5, pose: 'stand' }],
}, meta);
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 45), HOOK_Y = Math.round(bt.c[1] - 6);
ex.props = [BB.barbellProp(), EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop];
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}, 120).barBody;
ex.exercise.reference.note = S5.NOTE;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, MID = -12 + 6;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])} (hips ${r1(Wb.hip_r.p[1] - Wb.knee_r.p[1])} cm above the knees)`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical; bar ${r1(bb.c[0] - MID)} cm from mid-foot`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.2 s down, 0.3 s pause, 1.0 s up, 1.2 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
console.log(`Barbell Quarter Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-quarter-squat', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
