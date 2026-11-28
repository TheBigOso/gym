// Smith Squat (GymVisual "Smith Squat"): back squat in a Smith machine. The bar rides on vertical guide rails, so it can
// only travel straight up and down; the feet stand about 20 cm in front of the bar line (more forward than a free squat),
// letting the hips sit back while the trunk stays fairly upright (about 20 degrees of lean at the bottom). Bar on the upper
// traps just below C7, hands 80 cm apart (bar grip), elbows down; feet a little wider than the hips, toes out 25 degrees,
// both feet planted. Squat to the thighs at or a little below parallel, then drive the bar back up the rails.
// The trunk travel is tuned so the bar seat on the upper back stays on one vertical line (within about 0.2 cm); the
// hands then hold the bar exactly on the rail line at the seat's height. Built on the squat family (squat.js) with the
// Smith helpers (gear-smith.js) and barbell.js arms. Pegs (hookY) just below the standing bar height, safety stops just
// under the bottom.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const F = require('./families/squat');
const SG = require('./families/gear-smith');
const BB = require('./families/barbell');
const H = require('./families/hips');
const meta = require('./meta/smith-squat.json');

const STANCE = 22, TOE = 25, GW = 80, FOOT_X = 13;
const BAR_T6 = [-5.2, 14.4, 0];                   // bar seat in the spine_t6 frame: on top of the upper traps, below C7
const ELBOW_T6 = [-8, -20, 10];                   // elbows down, a little back and out
const SC = { protract: -8, elevate: 4 };          // shoulder blades squeezed back: the shelf for the bar
const RAIL_X = -9.1;                              // rail line (vertical): the bar seat's x through the rep (tuned)
const sm0 = SG.smith({ x: RAIL_X });
let gripWorst = 0, seatOff = 0;
const seat = (W) => V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BAR_T6));
const armsFn = (p) => {
  p.ch.sc_r = clone(SC); p.ch.sc_l = clone(SC);
  const W = L.fk(p), s = seat(W), c = SG.railPoint(sm0, s[1]), fwd = Q.rot(W.spine_t6.q, [1, 0, 0]);
  seatOff = Math.max(seatOff, Math.abs(s[0] - c[0]));
  const E = V.add(W.shoulder_r.p, V.scale(V.norm(Q.rot(W.spine_t6.q, ELBOW_T6)), L.UA));
  const q = SG.armsOnSmith(p, sm0, c[1], GW, { palm: fwd, thumb: [0, 0, -1], elbow: E, elbowW: 0.3, dirW: 1.5, guesses: [[-20, 20, -120, 135, 0], [-30, 40, -100, 130, 60], [0, 50, -110, 120, 0], [-40, 50, -60, 130, 0]] });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q), SG.grips(sm0, c[1], GW))); delete q.__cost;
  return q;
};
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 112, pitchBottom: -19, backBottom: -23, footX: FOOT_X, kneeOut: 1.5,
  spine: { l5: 8, t12: 2, t6: 0 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);

// props: the Smith machine (pegs 6 cm below the standing bar height, safety stops 4 cm under the bottom)
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts), bt = SG.barAt(Wt, sm0), bb = SG.barAt(Wb, sm0);
const HOOK_Y = Math.round(bt.y - 6), SAFETY_Y = Math.floor(bb.y - 4);
const sm = SG.smith({ x: RAIL_X, hookY: HOOK_Y, safetyY: SAFETY_Y, restY: HOOK_Y });
ex.props = sm.props;

// whole-loop checks: grip width, hands' midpoint on the rail line, bar clear of the body (the traps / upper back where it
// rests and the neck behind which it sits are skipped), plates off the floor, frame clear of the body, feet planted
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = SG.sweep(ex, sm, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const rest = SG.sweep(ex, sm, {}, 120).barBody; // with nothing skipped: how the bar meets the traps (about 0 = resting on them)
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const midFoot = FOOT_X + 6;
set('Foot position', 'setup', `Mid-foot ${r1(midFoot - RAIL_X)} cm in front of the bar line`); set('Foot position', 'peak', 'Unchanged (feet planted)');
set('Stance width (ankle centres)', 'setup', `${2 * STANCE} cm between the ankle centres, toes out ${TOE}°`); set('Stance width (ankle centres)', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${r1(Wb.knee_r.p[1] - Wb.hip_r.p[1])} cm below the knee joints`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical`);
set('Bar path', 'setup', `Vertical rails at x ${RAIL_X} cm; bar centre ${r1(bt.y)} cm high standing`); set('Bar path', 'peak', `${r1(bb.y)} cm at the bottom (${r1(bt.y - bb.y)} cm of travel); bar seat on the traps within ${r1(seatOff)} cm of the rail line`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Smith Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} trapsRest ${rest} gripErr ${gripWorst.toFixed(2)} seatOff ${seatOff.toFixed(2)} hookY ${HOOK_Y} safetyY ${SAFETY_Y}`);
SG.fail(sw);
if (gripWorst > 0.5) { console.error('FAIL: hands off the bar grip points'); process.exitCode = 1; }
if (rest < -1.5 || seatOff > 0.6) { console.error('FAIL: bar sinks into the traps or leaves its seat'); process.exitCode = 1; }
if (r.hipBottom > 139.5) { console.error('FAIL: hip flexion at the rig limit'); process.exitCode = 1; }
