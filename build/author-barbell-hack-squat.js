// Barbell Hack Squat (GymVisual "Barbell Hack Squat"): the barbell held behind the legs on straight arms, overhand grip
// (handle centres GW cm apart, just outside the hips), feet about hip width (ankle centres 24 cm apart), toes out
// 10 degrees, both feet planted. The trunk stays nearly upright and the knees travel forward while the hips sit straight
// down, so the bar slides down the backs of the thighs, past the backs of the knees and stops behind the calves, kept just
// clear of the legs (the bar depth is the least that clears the legs and buttocks at the height the straight arms reach).
// 2 s down, short pause, 1.2 s up. Built on the squat family (squat.js) with the b5-bbsquat behind-the-legs arms. The arms
// move against the trunk through the rep, so the depth curve is sampled densely to keep the grip width constant.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-hack-squat.json');

const STANCE = +(process.env.ST ?? 12), TOE = +(process.env.TOE ?? 10), GW = +(process.env.GW ?? 56);
const KB = +(process.env.KB ?? 96), PITCH = +(process.env.PB ?? -30), BACK = +(process.env.BK ?? -24);
const FOOT_X = -12, MID = FOOT_X + 6;
const arms = S5.behindBar({ gw: GW, clear: 1.0 });
const FS = Array.from({ length: 21 }, (_, i) => i / 20); // dense: the arms swing through the hanging position (plane / axial change fast there)
const depths = {}; FS.forEach((f, i) => { depths[`d${i}`] = f; });
depths.bottom = 1;
const ease = (u) => u * u * (3 - 2 * u), inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const T0 = 0.8, T1 = 2.8, T2 = 3.2, T3 = 4.4, D = 6;
const keyframes = [{ t: 0, pose: 'd0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `d${i}` }));
keyframes.push({ t: 3.0, pose: 'bottomSettle' });
for (let i = FS.length - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `d${i}` });
keyframes.push({ t: D, pose: 'd0' });
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: PITCH, backBottom: BACK, footX: FOOT_X, kneeOut: 1,
  spine: { l5: +(process.env.L5 ?? 4), t12: 2, t6: 0 }, arms: 'none', lead: 1.5, settle: 0.3, topPose: 'd0',
  depths, keyframes,
}, meta);
// the bar rides on the backs of the legs: placed on the fitted poses
const tAt = {}; for (const k of [...FS.map((f, i) => `d${i}`), 'bottom', 'bottomSettle']) { poses[k] = arms.armsFn(poses[k]); tAt[k] = r1(arms.st.t * 100) / 100; }
ex.props = [BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W, pz, t, o) => { const b = EQ.barAt(W, BB.GRIP).c; o.barY = Math.min(o.barY ?? 1e9, b[1]); const c = S5.behindClear(W, b[0], b[1], GW / 2 - 4); o.legs = Math.min(o.legs ?? 1e9, c); } });
ex.exercise.reference.note = S5.NOTE;
const Wt = L.fk(poses.d0, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const hk = (W) => { const v = r1(W.knee_r.p[1] - W.hip_r.p[1]); return v >= 0 ? `${v} cm below` : `${-v} cm above`; };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${hk(Wb)} the knee joints`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical`);
set('Bar position', 'setup', `Behind the thighs just below the buttocks on straight arms, ${GW} cm overhand grip (handle centres); bar ${r1(bt.c[1])} cm high`);
set('Bar position', 'peak', `Behind the backs of the knees, ${r1(bb.c[1])} cm high (knee joints ${r1(Wb.knee_r.p[1])} cm), ${r1(bb.c[0] - Wb.ankle_r.p[0])} cm in front of the ankle joints; kept at least ${r1(sw.legs)} cm off the legs all rep (bar + body centre of mass ${r1(BB.comWithBar(Wt, 40)[0] - MID)} → ${r1(BB.comWithBar(Wb, 40)[0] - MID)} cm from mid-foot)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
sw.legs = r1(sw.legs); sw.barY = r1(sw.barY);
console.log(`Barbell Hack Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} grip ${arms.st.worst.toFixed(2)} t ${tAt.d0}->${tAt.bottom} sh ${JSON.stringify(poses.d0.ch.shoulder_r)} / ${JSON.stringify(poses.bottom.ch.shoulder_r)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-hack-squat', sw, { gripWorst: arms.st.worst });
if (sw.legs < 0.5) { console.error('FAIL: bar touches the legs'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
