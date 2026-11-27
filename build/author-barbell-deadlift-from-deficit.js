// Barbell Deadlift from Deficit (GymVisual "Barbell Deadlift from Deficit", movement reference only): conventional deadlift
// standing on a solid 5 cm platform, so the bar starts lower relative to the feet. The platform (60 cm wide) fits between
// the plates, which rest on the floor at the start of every rep. Feet about hip width, toes out 8 degrees, planted on the
// platform. Overhand grip just outside the knees (54 cm between the handle centres), arms straight. Start: plates on the
// floor, bar over mid-foot, shins to the bar, hips lower than in a floor deadlift but above the knees, back flat; pull up
// with the bar sliding up the shins and thighs to a tall lockout, lower the same way and set the plates down. The bar hangs
// from straight arms just clear of the legs (barbell.js placement); the root is balanced so the body + bar centre of mass
// sits over mid-foot (b3-back.js hinge). Bilateral.
const L = require('./lib');
const { r1 } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const H4 = require('./families/b4-hinges');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-deadlift-from-deficit.json');

const HALF = +(process.env.HALF ?? 13), GW = 54, KG = 40, MIDFOOT = 5;
const STEP = { h: +(process.env.SH ?? 5), x0: -16, x1: 30, w: 60 };
const F = makeFamily({ toe: +(process.env.TOE ?? 8), half: HALF });
const feet = { r: { c: 'flat', x: 0, lift: STEP.h }, l: { c: 'flat', x: 0, lift: STEP.h } };
const platform = { id: 'platform', kind: 'box', center: [r1((STEP.x0 + STEP.x1) / 2), 0, 0], size: [STEP.x1 - STEP.x0, STEP.h, STEP.w] };
const state = {};
const arms = (p) => { const q = X.hangBar(p, F.contacts, { gw: GW, clear: 0.8, state }); delete q.__bar; return q; };
function hinge(pitch, knee, g) {
  return B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: r1(+(process.env.T12 ?? 1) * g), t6: r1(+(process.env.T6 ?? 4) * g) }, sc: { protract: r1(+(process.env.SCP ?? 14) * g), elevate: r1(-2 - +(process.env.SCE ?? 8) * g) }, kg: KG, midfoot: MIDFOOT, arms });
}
// bottom: the pelvis pitch that sets the plates on the floor (lowest plate point FLOOR cm up) at the start knee angle
const KNEE_TOP = 4, KNEE_B = +(process.env.KB ?? 96), FLOOR = 0.05;
let pa = -15, pb = -75;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (EQ.barMinY(r.W, { grip: BB.GRIP }) > FLOOR) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) { const gk = 1 - Math.pow(1 - f, 1.7), gp = Math.pow(f, 1.5); return hinge(PITCH_B * (1 - gp), KNEE_B + (KNEE_TOP - KNEE_B) * gk, 1 - f).pose; }
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.62, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`p${i}`] = at(f); });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'p0' }, ...X.eased('p', FS, ph.pull[0], ph.pull[1]), { t: ph.lockout[1], pose: `p${N}` }, ...X.eased('p', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'p0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [platform, BB.barbellProp()];
const boxes = [H4.boxOB(platform, 'platform')];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W, pz, t, o) => { const b = EQ.barAt(W, BB.GRIP).c; o.barX = [Math.min(o.barX ? o.barX[0] : 1e9, b[0]), Math.max(o.barX ? o.barX[1] : -1e9, b[0])]; const bc = B.bodyBoxClear(W, boxes, ['foot_r', 'foot_l']); o.bodyBox = Math.min(o.bodyBox ?? 1e9, bc.d); } });
// bar / plates vs the platform: plate discs lie outside the platform's width at every key
const Wb = F.fk(poses.p0), Wt = F.fk(poses[`p${N}`]), bb = EQ.barAt(Wb, BB.GRIP), bt = EQ.barAt(Wt, BB.GRIP), pB = poses.p0;
const plateInner = BB.AX && (EQ.BAR.plateX - EQ.BAR.plateW / 2);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Knee flexion', 'setup', `${d(B.kneeOf(Wb, 'r'))} with the plates on the floor`); set('Knee flexion', 'peak', `${d(B.kneeOf(Wt, 'r'))} at lockout`);
set('Hip flexion', 'setup', `${d(pB.ch.hip_r.flex)} (joint channel); hips ${r1(Wb.hip_r.p[1])} cm high, knees ${r1(Wb.knee_r.p[1])} cm, shoulders ${r1(Wb.shoulder_r.p[1])} cm`); set('Hip flexion', 'peak', `${d(poses[`p${N}`].ch.hip_r.flex)} at lockout`);
set('Trunk inclination', 'setup', `${d(B.trunkLean(Wb))} from vertical, back flat`); set('Trunk inclination', 'peak', `${d(B.trunkLean(Wt))} at lockout`);
set('Deficit', 'setup', `${STEP.h} cm platform, ${STEP.w} cm wide (the plates sit outside it, inner faces ${r1(plateInner)} cm from the centre)`); set('Deficit', 'peak', `Bar ${r1(bb.c[1])} cm above the floor at the start (${r1(bb.c[1] - STEP.h)} cm above the feet); lockout height ${r1(bt.c[1])} cm`);
set('Tempo', 'setup', `Set up ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.pull[1] - ph.pull[0])} s up, ${r1(ph.lockout[1] - ph.lockout[0])} s lockout, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s reset on the floor`);
sw.barX = sw.barX.map(r1); sw.bodyBox = r1(sw.bodyBox);
console.log(`Barbell Deadlift from Deficit: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${pB.ch.hip_r.flex}, plates low ${r1(EQ.barMinY(Wb, { grip: BB.GRIP }))}, bar ${bb.c.map(r1)} -> ${bt.c.map(r1)}\n  sweep ${JSON.stringify(sw)} gripErr ${state.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
if (sw.bodyBox < -0.5) { console.error('FAIL: body through the platform'); process.exitCode = 1; }
if (pB.ch.hip_r.flex > 139) { console.error('FAIL: hip flexion at the rig limit'); process.exitCode = 1; }
