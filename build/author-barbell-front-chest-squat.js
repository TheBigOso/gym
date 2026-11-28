// Barbell Front Chest Squat (GymVisual #4989 "Barbell Front Chest Squat"; page not readable here, movement from the name and
// standard coaching): front squat with the bar in the front rack: across the front delts against the throat, resting in the
// fingers (hands a little wider than the shoulders), elbows high and forward, wrists extended (b5-extra frontRack, solved
// once relative to the upper trunk so the bar rides with the trunk and the grip width is constant). Feet a little wider
// than the hips (ankle centres 44 cm apart), toes out 25 degrees, both feet planted. The trunk stays much more upright than
// in a back squat; the knees travel forward and out; full depth (hips below the knees). 2 s down, short pause, 1.2 s up.
// Built on the squat family (squat.js); clearance sweep from b5-extra barSweep.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-extra');
const P5 = require('./families/b5-bbpress');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-front-chest-squat.json');

const STANCE = 22, TOE = 25, KB = +(process.env.KB ?? 120);
const st = L.POSES.standing({ stance: STANCE, toeOut: TOE });
const RACK = X.frontRack(st.pose, { gw: 64, contacts: st.contacts });
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: +(process.env.PB ?? -18), backBottom: +(process.env.BK ?? -38), footX: -12, kneeOut: 1.5,
  spine: { l5: 6, t12: 2, t6: -2 }, arms: 'none', armsFn: (p) => RACK.apply(p), lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, RACK.grip), bb = EQ.barAt(Wb, RACK.grip);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 50), HOOK_Y = Math.round(bt.c[1] - 6);
// squat rack just behind the lifter (as the other barbell squats here), clear of the hips at the bottom
ex.props = [RACK.prop(), EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop];
let arms = { d: 1e9 };
const sw = X.barSweep(ex, { grip: RACK.grip, skip: /^(hand|thumb|forearm)_|^deltoid_/, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W) => { const c = P5.shapesClear(W, ['upperarm_r', 'forearm_r'], ['thigh_r', 'quad_r', 'thigh_l', 'quad_l']); if (c.d < arms.d) arms = { d: +c.d.toFixed(2), a: c.a, b: c.b }; } });
const rest = X.barSweep(ex, { grip: RACK.grip, n: 150 }).barBody;
ex.exercise.reference.note = S5.NOTE;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, MID = -12 + 6;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres, toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${r1(Wb.knee_r.p[1] - Wb.hip_r.p[1])} cm below the knee joints; ankle dorsiflexion ${d(r.dorsi)}`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical; bar ${r1(bb.c[0] - MID)} cm from mid-foot`);
set('Front rack', 'setup', `Bar across the front delts in the fingers, ${Math.round(RACK.width)} cm between the hands; elbows ${r1(RACK.elbowT6[0] - RACK.shoulderT6[0])} cm in front of the shoulders, wrists extended ${Math.round(-RACK.arms.wrist_r.flex)}°`); set('Front rack', 'peak', `Unchanged: the bar rides with the trunk (grip width ${sw.width.join('-')} cm)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
console.log(`Barbell Front Chest Squat: wrote ${L.write(ex)}\n  rack ${JSON.stringify({ cost: RACK.cost, gripErr: RACK.gripErr, width: RACK.width })}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} rest ${rest} arms-vs-thighs ${JSON.stringify(arms)} limits ${JSON.stringify(lim)}`);
const bad = [];
if (sw.widthRange > 1.0) bad.push('grip width varies');
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5) bad.push('bar through the floor or the body');
if (sw.slide > 0.05 || sw.drift > 0.05) bad.push('planted feet move');
if (arms.d < 0) bad.push('arms through the thighs');
if (Object.keys(lim).length) bad.push('joint limits');
if (r.hipBottom > 139.5) bad.push('hip flexion at the rig limit');
{ const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) bad.push('peak knee outside the measure range'); }
if (bad.length) { console.error(`FAIL barbell-front-chest-squat: ${bad.join('; ')}`); process.exitCode = 1; }
