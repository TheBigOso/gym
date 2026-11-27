// Barbell Stiff Legged Deadlift (GymVisual "Barbell Stiff Legged Deadlift", movement reference only): stand tall with the
// bar in front of the thighs, overhand grip just outside the legs (50 cm between the handle centres), feet hip width, toes
// out 6 degrees, both feet planted. Keeping the knees nearly straight (soft, about 8 degrees) the hips hinge back with a
// flat back and the bar slides down the front of the legs to about mid-shin, plates still well off the floor, then the
// hips drive forward to stand tall. The bar hangs from straight arms just clear of the legs (barbell.js placement) and the
// root is balanced so the body + bar centre of mass stays over mid-foot (b3-back.js hinge). Bilateral.
const L = require('./lib');
const { r1 } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-stiff-legged-deadlift.json');

const HALF = 11, GW = 50, KG = 25, MIDFOOT = 5;
const F = makeFamily({ toe: 6, half: HALF });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const state = {};
const arms = (p) => { const q = X.hangBar(p, F.contacts, { gw: GW, clear: 1.0, state }); delete q.__bar; return q; };
function hinge(pitch, knee, g) {
  return B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: r1(1 * g), t6: r1(2 * g) }, sc: { protract: r1(2 + 4 * g), elevate: r1(-2 - 3 * g) }, kg: KG, midfoot: MIDFOOT, arms });
}
const KNEE_TOP = 5, KNEE_B = 9, HIP_MAX = +(process.env.HIPMAX ?? 114);
// bottom: deepest pitch with hip flexion at HIP_MAX (the bar then sits around mid-shin)
let pa = -40, pb = -110;
for (let i = 0; i < 20; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (r.pose.ch.hip_r.flex < HIP_MAX) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) { const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65; return hinge(PITCH_B * g, KNEE_TOP + (KNEE_B - KNEE_TOP) * Math.min(1, f / 0.3), g).pose; }
const FS = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'h0' }, ...X.eased('h', FS, ph.lower[0], ph.lower[1]), ...X.eased('h', FS, ph.rise[0], ph.rise[1], true), { t: D, pose: 'h0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'] });
const Wt = F.fk(poses.h0), Wb = F.fk(poses[`h${N}`]), bb = EQ.barAt(Wb, BB.GRIP), pB = poses[`h${N}`];
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Hip flexion', 'setup', `${d(poses.h0.ch.hip_r.flex)} standing`); set('Hip flexion', 'peak', `${d(pB.ch.hip_r.flex)} (joint channel) at the bottom`);
set('Knee flexion', 'setup', d(B.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', `${d(B.kneeOf(Wb, 'r'))}, held nearly straight`);
set('Trunk inclination', 'setup', `${d(B.trunkLean(Wt))} from vertical`); set('Trunk inclination', 'peak', `${d(B.trunkLean(Wb))} from vertical (${d(90 - B.trunkLean(Wb))} from level), back flat`);
set('Bar path', 'setup', `Bar against the thighs, grip ${GW} cm (handle centres)`); set('Bar path', 'peak', `Bar ${r1(bb.c[1])} cm up at the bottom (shin top ${r1(Wb.knee_r.p[1])} cm), plates ${r1(EQ.barMinY(Wb, { grip: BB.GRIP }))} cm off the floor, ${r1(bb.c[0] - MIDFOOT)} cm from mid-foot`);
set('Tempo', 'setup', `Stand ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(ph.bottom[1] - ph.bottom[0])} s pause, ${r1(ph.rise[1] - ph.rise[0])} s up, ${r1(D - ph.rise[1])} s reset`);
console.log(`Barbell Stiff Legged Deadlift: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, hip ${pB.ch.hip_r.flex}, knee ${r1(B.kneeOf(Wb, 'r'))}, trunk ${r1(B.trunkLean(Wb))}, bar ${bb.c.map(r1)}\n  sweep ${JSON.stringify(sw)} gripErr ${state.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
if (pB.ch.hip_r.flex > 139) { console.error('FAIL: hip flexion at the rig limit'); process.exitCode = 1; }
