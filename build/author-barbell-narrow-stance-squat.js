// Barbell Narrow Stance Squat (GymVisual "Barbell Narrow Stance Squat"): high-bar back squat with the feet close
// together. Bar on the upper traps just below C7 (fixed in the spine_t6 frame), 80 cm overhand grip, elbows down; feet
// about hip width (ankle centres 20 cm apart), toes nearly straight (8 degrees out), both feet planted. The narrow stance
// lets the knees travel well forward over the toes (ankle dorsiflexion is the depth limit), so the squat goes to about
// thighs parallel; the ankle caps how far the knees travel, so the trunk still leans about as far as in the wider full
// squat. 2 s down, short pause, 1.2 s up.
// Built on the squat family (squat.js) with the b5-bbsquat back-bar arms (barbell.js armsOnBar).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-narrow-stance-squat.json');

const STANCE = +(process.env.ST ?? 10), TOE = +(process.env.TOE ?? 8);
const KB = +(process.env.KB ?? 110), PITCH = +(process.env.PB ?? -38), BACK = +(process.env.BK ?? -34);
const bar = S5.backBar(S5.HIGH_BAR);
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: PITCH, backBottom: BACK, footX: -12, kneeOut: 0.5,
  spine: { l5: 10, t12: 4, t6: 0 }, arms: 'none', armsFn: bar.armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 45), HOOK_Y = Math.round(bt.c[1] - 6);
ex.props = [BB.barbellProp(), EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop];
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}, 120).barBody;
ex.exercise.reference.note = S5.NOTE;
const hk = (W) => { const v = r1(W.knee_r.p[1] - W.hip_r.p[1]); return v >= 0 ? `${v} cm below` : `${-v} cm above`; };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, MID = -12 + 6;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${hk(Wb)} the knee joints, knees ${r1(Wb.knee_r.p[0] - Wb.toe_r.p[0])} cm past the toe tips, ankle dorsiflexion ${d(r.dorsi)} past neutral`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical`);
set('Bar position', 'setup', 'High bar: on the upper traps just below C7, 80 cm grip (handle centres)'); set('Bar position', 'peak', `Bar ${r1(bt.c[0] - MID)} cm from mid-foot at the top, ${r1(bb.c[0] - MID)} cm at the bottom (bar + body centre of mass ${r1(BB.comWithBar(Wt)[0] - MID)} → ${r1(BB.comWithBar(Wb)[0] - MID)} cm)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
console.log(`Barbell Narrow Stance Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-narrow-stance-squat', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
