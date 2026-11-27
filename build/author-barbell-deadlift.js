// Barbell Deadlift (GymVisual "Barbell Deadlift"): conventional deadlift from the floor. Feet about hip width under the
// bar, toes out 8 degrees, both feet planted. Overhand grip, hands just outside the knees (54 cm between the handle
// centres), arms straight. The rep starts with the plates resting on the floor (bar over mid-foot, shins just behind the
// bar, hips above the knees, shoulders a little in front of the bar, flat back), pulls up with the bar sliding up the shins
// and thighs to a tall lockout, then lowers the same way and sets the plates back down. The bar hangs from straight arms
// and is kept just clear of the legs; the root is balanced so the body + bar centre of mass sits over mid-foot (b3-back.js
// hinge). Bilateral; the left arm mirrors the right.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const meta = require('./meta/barbell-deadlift.json');

const HALF = 13, GW = 54, KG = 40;               // ankle centres 26 cm apart; grip width; 80 kg bar (40 kg per hand for balance)
const MIDFOOT = 5;                                // mid-foot: 5 cm in front of the ankle joints
const F = makeFamily({ toe: 8, half: HALF });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PALM = [-1, 0, 0], THUMB = [0, 0, -1];      // overhand: palms toward the body, right thumb toward the midline
const CLEAR = 0.8;                                // bar shaft kept this far off the legs (cm)
let gripWorst = 0;
// Arms straight down to the bar: the bar sits at the least depth that clears the legs at the height a straight arm reaches
const arms = (p) => {
  const W0 = L.fk(p, F.contacts), S = W0.shoulder_r.p, Rg = BB.reachG(p) - 0.4, z = GW / 2;
  const place = (y) => { let a = BB.legX(W0, y), b = a + 40; for (let i = 0; i < 36; i++) { const m = (a + b) / 2; if (BB.barLegClear(W0, m, y, z - 4) > CLEAR) b = m; else a = m; } return b; };
  let ya = -10, yb = S[1];
  for (let i = 0; i < 36; i++) { const y = (ya + yb) / 2; if (V.len(V.sub([place(y), y, z], S)) > Rg) ya = y; else yb = y; }
  const c = [place(yb), yb, 0], grips = EQ.barGrips(c, BB.AX, GW);
  const q = BB.armsOnBar(p, grips.r, { palm: PALM, thumb: THUMB, dirW: 1.5, guesses: [[60, 20, 30, 5, 150], [80, 40, 0, 5, 100], [40, 10, 20, 5, 160], [0, 10, 0, 5, 90]], extra: [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3]] });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q), grips)); delete q.__cost;
  return q;
};
function hinge(pitch, knee, g) {
  return B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, sc: { protract: r1(6 * g), elevate: r1(-2 - 4 * g) }, kg: KG, midfoot: MIDFOOT, arms });
}
// bottom: the pelvis pitch that sets the plates on the floor (lowest plate point FLOOR cm up) at the start knee angle
const KNEE_TOP = 4, KNEE_B = 80, FLOOR = 0.05;
let pa = -20, pb = -75;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (EQ.barMinY(r.W, { grip: BB.GRIP }) > FLOOR) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
// f = 0 floor ... 1 lockout. Off the floor the knees straighten first while the back angle holds (the bar passes the knees),
// then the hips drive through to stand tall.
function at(f) {
  const gk = 1 - Math.pow(1 - f, 1.7), gp = Math.pow(f, 1.5);
  return hinge(PITCH_B * (1 - gp), KNEE_B + (KNEE_TOP - KNEE_B) * gk, 1 - f).pose;
}
const FS = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1];
const poses = {};
FS.forEach((f, i) => { poses[`p${i}`] = at(f); });
const N = FS.length - 1;
// timeline: plates on the floor (setup), pull, lockout, lower, plates set down (rest)
const ph = meta.timeline.phases, T0 = ph[0].end, T1 = ph[1].end, T2 = ph[2].end, T3 = ph[3].end, D = meta.timeline.duration;
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const keyframes = [{ t: 0, pose: 'p0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `p${i}` }));
keyframes.push({ t: T2, pose: `p${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `p${i}` });
keyframes.push({ t: D, pose: 'p0' });

const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W, pz, t, o) => { const b = EQ.barAt(W, BB.GRIP).c; o.barX = [Math.min(o.barX ? o.barX[0] : 1e9, b[0]), Math.max(o.barX ? o.barX[1] : -1e9, b[0])]; } });
const Wb = F.fk(poses.p0), Wt = F.fk(poses[`p${N}`]), bb = EQ.barAt(Wb, BB.GRIP), bt = EQ.barAt(Wt, BB.GRIP), pB = poses.p0;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Knee flexion', 'setup', `${d(B.kneeOf(Wb, 'r'))} with the plates on the floor`); set('Knee flexion', 'peak', `${d(B.kneeOf(Wt, 'r'))} at lockout`);
set('Hip flexion', 'setup', `${d(pB.ch.hip_r.flex)} (joint channel); hips ${r1(Wb.hip_r.p[1])} cm high, knees ${r1(Wb.knee_r.p[1])} cm, shoulders ${r1(Wb.shoulder_r.p[1])} cm`); set('Hip flexion', 'peak', `${d(poses[`p${N}`].ch.hip_r.flex)} at lockout`);
set('Trunk inclination', 'setup', `${d(B.trunkLean(Wb))} from vertical, back flat`); set('Trunk inclination', 'peak', `${d(B.trunkLean(Wt))} at lockout`);
set('Bar path', 'setup', `Bar ${r1(bb.c[0] - MIDFOOT)} cm from mid-foot, shoulders ${r1(Wb.shoulder_r.p[0] - bb.c[0])} cm in front of the bar; grip ${GW} cm (handle centres)`);
set('Bar path', 'peak', `Bar stays within ${r1(sw.barX[1] - sw.barX[0])} cm fore-aft, at least ${CLEAR} cm off the legs; lockout height ${r1(bt.c[1])} cm`);
set('Tempo', 'setup', `Set up ${T0} s`); set('Tempo', 'peak', `${r1(T1 - T0)} s up, ${r1(T2 - T1)} s lockout, ${r1(T3 - T2)} s down, ${r1(D - T3)} s reset on the floor`);
sw.barX = sw.barX.map(r1);
console.log(`Barbell Deadlift: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${pB.ch.hip_r.flex}, plates low point ${r1(EQ.barMinY(Wb, { grip: BB.GRIP }))} cm, bar ${bb.c.map(r1)} -> ${bt.c.map(r1)}\n  sweep ${JSON.stringify(sw)} gripErr ${gripWorst.toFixed(2)}`);
if (sw.widthRange > 1.0 || gripWorst > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
if (pB.ch.hip_r.flex > 139) { console.error('FAIL: hip flexion at the rig limit'); process.exitCode = 1; }
