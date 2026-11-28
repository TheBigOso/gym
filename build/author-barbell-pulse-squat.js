// Barbell Pulse Squat (GymVisual #21895 "Barbell Pulse Squat (male)"; page not readable here, movement from the name and
// standard coaching): high-bar back squat down to about thighs parallel, then three small pulses (rise about a quarter of
// the way, sink back to the bottom) without standing, then drive all the way up. Bar on the upper traps just below C7 (fixed
// in the spine_t6 frame, b5-bbsquat backBar), 80 cm overhand grip, elbows down; ankle centres 42 cm apart, toes out 25
// degrees, both feet planted. 1.6 s down, 3 x 0.67 s pulses, 1.2 s up.
// Built on the squat family (squat.js) with the b5-bbsquat back-bar arms (barbell.js armsOnBar).
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-pulse-squat.json');

const STANCE = 21, TOE = 25, KB = 108, PULSE = 0.72; // pulse top: 72% of the way down (about a hand-width above the bottom)
const bar = S5.backBar(S5.HIGH_BAR);
const kf = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.2, pose: 'l25' }, { t: 1.6, pose: 'l50' }, { t: 2.0, pose: 'l75' }, { t: 2.4, pose: 'bottom' }];
// three pulses: bottom -> pulse top -> bottom, 0.67 s each (mid keys keep the curve smooth)
for (let i = 0; i < 3; i++) { const t0 = 2.4 + i * 0.6667; kf.push({ t: +(t0 + 0.17).toFixed(3), pose: 'pmid' }, { t: +(t0 + 0.33).toFixed(3), pose: 'ptop' }, { t: +(t0 + 0.5).toFixed(3), pose: 'pmid' }, { t: +(t0 + 0.6667).toFixed(3), pose: 'bottom' }); }
kf[kf.length - 1].t = 4.4;
kf.push({ t: 4.8, pose: 'rise66' }, { t: 5.2, pose: 'rise33' }, { t: 5.6, pose: 'stand' }, { t: 6.5, pose: 'stand' });
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: -34, backBottom: -28, footX: -12, kneeOut: 1.5,
  spine: { l5: 12, t12: 4, t6: 0 }, arms: 'none', armsFn: bar.armsFn, lead: 1.5,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, ptop: PULSE, pmid: (1 + PULSE) / 2, rise66: 0.66, rise33: 0.33 },
  keyframes: kf,
}, meta);
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), Wp = L.fk(poses.ptop, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 45), HOOK_Y = Math.round(bt.c[1] - 6);
ex.props = [BB.barbellProp(), EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop];
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}, 120).barBody;
ex.exercise.reference.note = S5.NOTE;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, MID = -12 + 6;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])} at the bottom, ${d(F.kneeOf(Wp, 'r'))} at the top of each pulse (hips ${r1(Wp.pelvis.p[1] - Wb.pelvis.p[1])} cm higher)`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical; bar ${r1(bb.c[0] - MID)} cm from mid-foot`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '1.6 s down, three 0.67 s pulses, 1.2 s up, 0.9 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
console.log(`Barbell Pulse Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-pulse-squat', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
