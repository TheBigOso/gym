// Glute Bridge March (GymVisual #7627, page not readable; movement from the name): supine bridge (author-glute-bridge.js
// solve via b6-14 makeBridge): lift into the bridge with knees, hips and shoulders in one line, then, keeping the pelvis high
// and level, lift the right knee until the thigh is about vertical (hip about 62 degrees, knee 90) and set it down, then the left, and lower.
// Alternating, one march per leg per loop. Hands planted beside the hips (arm contacts). Feet planted with leg contacts;
// a lifting leg hands over to FK on an identical-looking key (channels fitted to the planted leg, contact weight 0).
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/glute-bridge-march.json');

const Bq = X.makeBridge({ kneeTop: 90 });
const LIFT = { hip: 62, knee: 90, ankle: 0 };   // free leg at the top of the march: thigh about vertical, shin level (channels relative to the pelvis)
const top = Bq.poseAt(1);
const legCh = (p, s) => ({ hip: clone(p.ch[`hip_${s}`]), knee: clone(p.ch[`knee_${s}`]), ankle: clone(p.ch[`ankle_${s}`]) });
const lerpLeg = (a, f) => ({ hip: { flex: r1(a.hip.flex + (LIFT.hip - a.hip.flex) * f), abd: r1(a.hip.abd * (1 - f)), rot: r1(a.hip.rot * (1 - f)) }, knee: { flex: r1(a.knee.flex + (LIFT.knee - a.knee.flex) * f) }, ankle: { dorsi: r1(a.ankle.dorsi + (LIFT.ankle - a.ankle.dorsi) * f) } });
const marchKey = (s, f) => { const p = clone(top); const ch = lerpLeg(legCh(top, s), f); p.ch[`hip_${s}`] = ch.hip; p.ch[`knee_${s}`] = ch.knee; p.ch[`ankle_${s}`] = ch.ankle; p.ik[`leg_${s}`].weight = 0; return p; };
const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration;   // setup, lift, marchR, marchL, lower, reset
const poses = { lie: Bq.poseAt(0), top, u25: Bq.poseAt(0.25), u50: Bq.poseAt(0.5), u75: Bq.poseAt(0.75), touch: Bq.poseAt(0.03) };
for (const s of ['r', 'l']) { poses[`rel_${s}`] = marchKey(s, 0); poses[`${s}1`] = marchKey(s, 0.15); poses[`${s}2`] = marchKey(s, 0.55); poses[`${s}3`] = marchKey(s, 1); poses[`${s}3b`] = marchKey(s, 0.97); }
const keyframes = [{ t: 0, pose: 'lie' }, { t: ph[0], pose: 'lie' }];
const add = (t, n) => keyframes.push({ t: +t.toFixed(3), pose: n });
const L1 = ph[0], L2 = ph[1]; add(L1 + (L2 - L1) * 0.3, 'u25'); add(L1 + (L2 - L1) * 0.55, 'u50'); add(L1 + (L2 - L1) * 0.78, 'u75'); add(L2, 'top');
function march(s, t0, t1) { const d = t1 - t0; add(t0 + 0.06, `rel_${s}`); add(t0 + 0.18, `${s}1`); add(t0 + 0.34, `${s}2`); add(t0 + 0.5, `${s}3`); add(t0 + 0.7, `${s}3b`); add(t0 + 0.86, `${s}2`); add(t0 + 1.0, `${s}1`); add(t1 - 0.08, `rel_${s}`); add(t1, 'top'); return d; }
march('r', ph[1], ph[2]); march('l', ph[2], ph[3]);
const Lo = ph[3], Lr = ph[4]; add(Lo + (Lr - Lo) * 0.25, 'u75'); add(Lo + (Lr - Lo) * 0.5, 'u50'); add(Lo + (Lr - Lo) * 0.75, 'u25'); add(Lr, 'touch'); add(Lr + 0.25, 'lie'); add(D, 'lie');
X.wrapPoses(poses);
const ex = H.module_(meta, Bq.contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'] });
// free foot clearance above the floor and above the other knee
const tl = R.buildTimeline(ex); let footMin = 1e9;
for (let i = 0; i <= 600; i++) { const t = (i / 600) * D, pz = tl.pose(t); if (pz.ik.leg_r.weight > 0.5 && pz.ik.leg_l.weight > 0.5) continue; const W = R.evalPose(L.rig, pz, ex.contacts); const s = pz.ik.leg_r.weight < 0.5 ? 'r' : 'l'; footMin = Math.min(footMin, H.bottomOf(W, `foot_${s}`)); }
const Wl = L.fk(poses.lie, Bq.contacts), Wt = L.fk(top, Bq.contacts), Wm = L.fk(poses.r3, Bq.contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° (lying)`); set('Hip flexion', 'peak', `≈${Math.round(top.ch.hip_r.flex)}° on the standing leg (line ${Math.round(Bq.lineAt(Wt))}°)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wl, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° on the standing leg`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm, held while marching`);
set('Lifted leg', 'setup', 'Both feet planted'); set('Lifted leg', 'peak', `Hip ${LIFT.hip}°, knee ${LIFT.knee}°; foot ${r1(H.bottomOf(Wm, 'foot_r'))} cm off the floor; pelvis level`);
set('Tempo', 'setup', `Lying ${ph[0]} s; ${r1(ph[1] - ph[0])} s up`); set('Tempo', 'peak', `${r1(ph[2] - ph[1])} s per march (0.5 s up, 0.2 s hold, 0.5 s down), ${r1(ph[4] - ph[3])} s down`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'hipFlexion');
console.log(`Glute Bridge March: feet x ${Bq.AX}, roll ${Bq.DP_TOP}° wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} free foot min ${footMin.toFixed(2)} peak hip ${pk.toFixed(1)}`);
X.finishChecks(ex, 'glute-bridge-march', rep);
if (footMin < 0) { console.error('FAIL: free foot drags on the floor'); process.exitCode = 1; }
