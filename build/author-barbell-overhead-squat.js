// Barbell Overhead Squat (GymVisual "Barbell Overhead Squat"): the bar held overhead on locked arms with a wide snatch
// grip (handle centres GW cm apart), palms up, shoulder blades shrugged up and in; the bar is kept over mid-foot the whole
// rep (its depth is fixed in the world, its height is the straight-arm reach from the shoulders). Feet about shoulder width
// (ankle centres 44 cm apart), toes out 25 degrees, both feet planted. The trunk stays more upright than in a back squat,
// so the hips sit down between the heels to below parallel. 2.2 s down, short pause, 1.3 s up.
// Built on the squat family (squat.js) with the b5-bbsquat overhead arms (barbell.js armsOnBar). The arms move against
// the trunk through the rep, so the depth curve is sampled densely to keep the grip width constant between keys.
const L = require('./lib');
const { r1 } = L;
const F = require('./families/squat');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-overhead-squat.json');

const STANCE = +(process.env.ST ?? 22), TOE = +(process.env.TOE ?? 25), GW = +(process.env.GW ?? 96);
const KB = +(process.env.KB ?? 124), PITCH = +(process.env.PB ?? -32), BACK = +(process.env.BK ?? -30);
const FOOT_X = -12, MID = FOOT_X + 6, BAR_X = +(process.env.BX ?? MID);
const arms = S5.overheadBar({ gw: GW, x: () => BAR_X, sc: { protract: 4, elevate: +(process.env.SCE ?? 24) }, flex: 3 });
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const depths = {}; FS.forEach((f, i) => { depths[`d${i}`] = f; });
depths.bottom = 1;
// keyframes: down over 2.2 s (eased), pause, up over 1.3 s
const ease = (u) => u * u * (3 - 2 * u), inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const T0 = 0.8, T1 = 3.0, T2 = 3.4, T3 = 4.7, D = 6;
const keyframes = [{ t: 0, pose: 'd0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `d${i}` }));
keyframes.push({ t: 3.2, pose: 'bottomSettle' });
for (let i = FS.length - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `d${i}` });
keyframes.push({ t: D, pose: 'd0' });
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: KB, pitchBottom: PITCH, backBottom: BACK, footX: FOOT_X, kneeOut: 1.5,
  spine: { l5: +(process.env.L5 ?? 4), t12: 0, t6: -4 }, arms: 'none', armsFn: arms.armsFn, lead: 1.5, settle: 0.3, topPose: 'd0',
  depths, keyframes,
}, meta);
ex.props = [BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W, pz, t, o) => { const b = EQ.barAt(W, BB.GRIP).c; o.barX = [Math.min(o.barX ? o.barX[0] : 1e9, b[0]), Math.max(o.barX ? o.barX[1] : -1e9, b[0])]; const h = EQ.segmentClear(W, ...EQ.barGeometry(EQ.barAt(W, BB.GRIP)).caps[0].slice(0, 2), EQ.BAR.shaftR, { skip: /^(?!head|hair|nose|ear|jaw)/ }); o.head = Math.min(o.head ?? 1e9, h.d); } });
ex.exercise.reference.note = S5.NOTE;
const Wt = L.fk(poses.d0, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const hk = (W) => { const v = r1(W.knee_r.p[1] - W.hip_r.p[1]); return v >= 0 ? `${v} cm below` : `${-v} cm above`; };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Stance width', 'setup', `${2 * STANCE} cm between the ankle centres (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', d(F.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(r.knee[1])}; hip joints ${hk(Wb)} the knee joints`);
set('Hip flexion', 'setup', d(r.hipTop)); set('Hip flexion', 'peak', `${d(r.hipBottom)} (joint channel)`);
set('Trunk inclination', 'setup', d(r.trunkTop)); set('Trunk inclination', 'peak', `${d(r.trunkBottom)} forward of vertical`);
set('Bar position', 'setup', `Overhead on locked arms (elbow ${r1(arms.st.elbow[0])}-${r1(arms.st.elbow[1])}°), ${GW} cm snatch grip (handle centres), ${r1(bt.c[1] - Wt.head_c1.p[1])} cm above the head-neck joint`);
set('Bar position', 'peak', `Bar ${r1(bt.c[0] - MID)} cm from mid-foot, within ${r1(sw.barX[1] - sw.barX[0])} cm fore-aft all rep; shoulder elevation ${d(poses.d0.ch.shoulder_r.elev)} standing, ${d(poses.bottom.ch.shoulder_r.elev)} at the bottom (bar + body centre of mass ${r1(BB.comWithBar(Wt, 40)[0] - MID)} → ${r1(BB.comWithBar(Wb, 40)[0] - MID)} cm)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.2 s down, 0.4 s pause, 1.3 s up, 1.3 s reset');
delete r.Wb; delete r.Wt;
const lim = S5.limits(ex);
sw.barX = sw.barX.map(r1); sw.head = r1(sw.head);
console.log(`Barbell Overhead Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  sweep ${JSON.stringify(sw)} grip ${arms.st.worst.toFixed(2)} elbow ${arms.st.elbow.map(r1)} sh ${JSON.stringify(poses.d0.ch.shoulder_r)} / ${JSON.stringify(poses.bottom.ch.shoulder_r)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-overhead-squat', sw, { gripWorst: arms.st.worst });
if (sw.head < 3) { console.error('FAIL: bar too close to the head'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
const m = ex.checks.measure; if (r.knee[1] < m.min || r.knee[1] > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; }
