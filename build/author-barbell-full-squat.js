// Barbell Full Squat (GymVisual "Barbell Full Squat (with rack)"): high-bar back squat. The bar rests on the upper traps
// just below C7 (fixed in the spine_t6 frame, so it rides with the trunk), hands about 80 cm apart (handle centres, just
// outside the shoulders), overhand, elbows pointing down and a little back; shoulder blades squeezed back to make the
// shelf. Feet a little wider than the hips, toes out 28 degrees, both feet planted (constant IK targets). 2 s down to a
// full squat (hip joints below the knees), short pause, 1.2 s up. The squat rack stands in front of the lifter (stepped back
// out of it), J-hooks just below the bar's standing height. Built on the squat family (squat.js) with barbell.js arms.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const meta = require('./meta/barbell-full-squat.json');

const STANCE = 22, TOE = 28, GW = 80;            // ankle centres 44 cm apart; grip width (handle centres) 80 cm
const BAR_T6 = [-5.2, 14.4, 0];                   // bar centre in the spine_t6 frame: on top of the upper traps, below C7
const ELBOW_T6 = [-8, -20, 10];                   // elbows down, a little back and out (spine_t6 frame direction)
const SC = { protract: -8, elevate: 4 };          // shoulder blades squeezed back: the shelf for the bar
let gripWorst = 0;
const barOn = (W) => V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BAR_T6));
const armsFn = (p) => {
  p.ch.sc_r = clone(SC); p.ch.sc_l = clone(SC);
  const W = L.fk(p), c = barOn(W), grips = EQ.barGrips(c, BB.AX, GW), fwd = Q.rot(W.spine_t6.q, [1, 0, 0]);
  const E = V.add(W.shoulder_r.p, V.scale(V.norm(Q.rot(W.spine_t6.q, ELBOW_T6)), L.UA));
  const q = BB.armsOnBar(p, grips.r, { palm: fwd, thumb: [0, 0, -1], elbow: E, elbowW: 0.3, dirW: 1.5, guesses: [[-20, 20, -120, 135, 0], [-30, 40, -100, 130, 60], [0, 50, -110, 120, 0], [-40, 50, -60, 130, 0]] });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q), grips)); delete q.__cost;
  return q;
};
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 122, pitchBottom: -36, backBottom: -30, footX: -12, kneeOut: 1.5,
  spine: { l5: 12, t12: 4, t6: 0 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);

// props: the barbell on the back; the rack stands just behind the lifter (J-hooks facing forward, toward the lifter, 6 cm
// below the bar's standing height), clear of the hips at the bottom and out of the way of the 3/4 and side views
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const RACK_X = r1(Math.min(bt.c[0], bb.c[0]) - 45), HOOK_Y = Math.round(bt.c[1] - 6);
const rack = EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: 200, width: 120 }).prop;
ex.props = [BB.barbellProp(), rack];

// whole-loop checks: grip width, plates off the floor, bar clear of the body (the traps / upper back where it rests and the
// neck behind which it sits are skipped), feet planted
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = BB.sweep(ex, {}).barBody; // with nothing skipped: how the bar meets the traps (about 0 = resting on them)
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${r1(Wb.knee_r.p[1] - Wb.hip_r.p[1])} cm below the knee joints`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical`);
set('Bar position', 'setup', `High bar: on the upper traps just below C7, ${GW} cm grip (handle centres)`); set('Bar position', 'peak', `Bar ${r1(bt.c[0] - (-12 + 6))} cm over / behind mid-foot at the top, ${r1(bb.c[0] - (-12 + 6))} cm at the bottom (bar + body centre of mass ${r1(BB.comWithBar(Wt)[0] + 6)} → ${r1(BB.comWithBar(Wb)[0] + 6)} cm from mid-foot)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Barbell Full Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} trapsRest ${rest} gripErr ${gripWorst.toFixed(2)} rack x ${RACK_X} hookY ${HOOK_Y}`);
if (sw.widthRange > 1.0 || gripWorst > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
if (r.hipBottom > 139.5) { console.error('FAIL: hip flexion at the rig limit'); process.exitCode = 1; }
