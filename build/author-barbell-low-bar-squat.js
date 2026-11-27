// Barbell Low Bar Squat (GymVisual "Barbell Low Bar Squat"): the powerlifting-style back squat. The bar sits about 6 cm
// lower than in the high-bar squat, across the rear delts on the spine of the shoulder blades (fixed in the spine_t6
// frame), held there by an 84 cm overhand grip with the elbows lifted back. Feet about shoulder width (ankle centres
// 44 cm apart), toes out 25 degrees, both feet planted. The lower bar asks for a deeper hip hinge: the hips travel back,
// the trunk leans further forward and the knees travel less, to about thighs parallel. 2 s down, short pause, 1.2 s up.
// Built on the squat family (squat.js) with the b5-bbsquat back-bar arms (barbell.js armsOnBar).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-low-bar-squat.json');

const STANCE = +(process.env.ST ?? 22), TOE = +(process.env.TOE ?? 25);
const KB = +(process.env.KB ?? 112), PITCH = +(process.env.PB ?? -44), BACK = +(process.env.BK ?? -34);
const LOW = { barT6: JSON.parse(process.env.BAR || '[-6.3, 8.5, 0]'), elbowT6: [-16, -12, 12], gw: 84, sc: { protract: -14, elevate: 0 } };
const bar = S5.backBar(LOW);
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: PITCH, backBottom: BACK, footX: -12, kneeOut: 1.5,
  spine: { l5: +(process.env.L5 ?? 8), t12: +(process.env.T12 ?? 2), t6: 0 }, arms: 'none', armsFn: bar.armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 45), HOOK_Y = Math.round(bt.c[1] - 6);
ex.props = [BB.barbellProp(), EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop];
const SKIP = /^(hand|thumb|forearm)_|^traps_|^deltoid_|^chest$|^neck$/; // the bar rests on the rear delts and traps
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}, 120).barBody;
ex.exercise.reference.note = S5.NOTE;
const hk = (W) => { const v = r1(W.knee_r.p[1] - W.hip_r.p[1]); return v >= 0 ? `${v} cm below` : `${-v} cm above`; };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, MID = -12 + 6;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${hk(Wb)} the knee joints, knees ${r1(Wb.knee_r.p[0] - Wb.toe_r.p[0])} cm from the toe tips (+ = past them)`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical`);
set('Bar position', 'setup', `Low bar: across the rear delts on the spine of the shoulder blades, ${r1(Wt.neck_c7.p[1] - bt.c[1])} cm below C7 (the high bar sits about 3.5 cm below it), 84 cm grip (handle centres)`); set('Bar position', 'peak', `Bar ${r1(bt.c[0] - MID)} cm from mid-foot at the top, ${r1(bb.c[0] - MID)} cm at the bottom (bar + body centre of mass ${r1(BB.comWithBar(Wt)[0] - MID)} → ${r1(BB.comWithBar(Wb)[0] - MID)} cm)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
console.log(`Barbell Low Bar Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-low-bar-squat', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
