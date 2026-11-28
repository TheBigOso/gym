// Barbell Rack Pull (GymVisual #11583, "Barbell Rack Pull"; page not readable here, movement from the name and standard
// coaching): a deadlift from safety pins set just below the knees inside a power rack. Feet hip width under the bar, toes
// out 8 degrees, both feet planted; overhand grip just outside the thighs (54 cm between the handle centres), arms
// straight. Each rep starts with the bar resting on the pins (knees a little bent, hips back, flat back, shoulders over
// the bar), pulls up the thighs to a tall lockout, lowers the same way and sets the bar back on the pins. Built like
// author-barbell-deadlift.js: balanced hinge (b3-back.js) with straight arms hanging to a bar just clear of the legs
// (barbell.js); the bottom pelvis pitch is solved so the bar shaft sits on the pins. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-rack-pull.json');

const HALF = 13, GW = 54, KG = 45, MIDFOOT = 5, CLEAR = 0.8;
const F = makeFamily({ toe: 8, half: HALF });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const st = {};
const arms = (p) => { const q = X.hangBar(p, F.contacts, { gw: GW, clear: CLEAR, state: st }); delete q.__bar; return q; };
const hinge = (pitch, knee, g) => B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, sc: { protract: r1(6 * g), elevate: r1(-2 - 4 * g) }, kg: KG, midfoot: MIDFOOT, arms });
// bottom: knees KNEE_B, pelvis pitch that puts the bar shaft BAR_DY cm below the knee joints (the bar on the pins)
const KNEE_TOP = 4, KNEE_B = +(process.env.KB ?? 36), BAR_DY = +(process.env.DY ?? 4);
let pa = -10, pb = -75, Wk = null;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1), b = EQ.barAt(r.W, BB.GRIP).c; if (b[1] > r.W.knee_r.p[1] - BAR_DY) pa = pm; else pb = pm; Wk = r.W; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) { const gk = 1 - Math.pow(1 - f, 1.5), gp = Math.pow(f, 1.2); return hinge(PITCH_B * (1 - gp), KNEE_B + (KNEE_TOP - KNEE_B) * gk, 1 - f).pose; }
const FS = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
st.keep = false;
FS.forEach((f, i) => { poses[`p${i}`] = at(f); st.keep = true; });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'p0' }, ...X.eased('p', FS, ph.pull[0], ph.pull[1]), { t: ph.lockout[1], pose: `p${N}` }, ...X.eased('p', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'p0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
// power rack around the lifter: safety pins under the bar at the bottom (pin top = bar bottom), uprights 120 cm apart
const Wb = F.fk(poses.p0), Wt = F.fk(poses[`p${N}`]), bb = EQ.barAt(Wb, BB.GRIP), bt = EQ.barAt(Wt, BB.GRIP);
const SAFE_Y = r1(bb.c[1] - EQ.BAR.shaftR - 2);   // the player draws a 4 cm safety centred on safetyY
const RACK_X = r1(bb.c[0] - 25);                  // power rack 120 deep: pins span x in [RACK_X - 60, RACK_X + 90]
const rk = EQ.rack({ x: RACK_X, depth: 120, height: 230, width: 120, hookY: 150, safetyY: SAFE_Y });
ex.props = [rk.prop, BB.barbellProp()];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W, pz, t, o) => { const b = EQ.barAt(W, BB.GRIP).c; o.barX = [Math.min(o.barX ? o.barX[0] : 1e9, b[0]), Math.max(o.barX ? o.barX[1] : -1e9, b[0])]; o.pinGap = Math.min(o.pinGap ?? 1e9, b[1] - EQ.BAR.shaftR - (SAFE_Y + 2)); } });
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Knee flexion', 'setup', `${d(B.kneeOf(Wb, 'r'))} with the bar on the pins`); set('Knee flexion', 'peak', `${d(B.kneeOf(Wt, 'r'))} at lockout`);
set('Hip flexion', 'setup', `${d(poses.p0.ch.hip_r.flex)} (joint channel); bar ${r1(bb.c[1])} cm high, ${r1(Wb.knee_r.p[1] - bb.c[1])} cm below the knee joints`); set('Hip flexion', 'peak', `${d(poses[`p${N}`].ch.hip_r.flex)} at lockout`);
set('Trunk inclination', 'setup', `${d(B.trunkLean(Wb))} from vertical, back flat`); set('Trunk inclination', 'peak', `${d(B.trunkLean(Wt))} at lockout`);
set('Bar path', 'setup', `Bar on the safety pins (pin top ${r1(SAFE_Y + 2)} cm); grip ${GW} cm (handle centres)`); set('Bar path', 'peak', `Within ${r1(sw.barX[1] - sw.barX[0])} cm fore-aft, at least ${CLEAR} cm off the legs; lockout height ${r1(bt.c[1])} cm`);
set('Tempo', 'setup', `Set up ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.pull[1] - ph.pull[0])} s up, ${r1(ph.lockout[1] - ph.lockout[0])} s lockout, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s on the pins`);
sw.barX = sw.barX.map(r1);
console.log(`Barbell Rack Pull: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${poses.p0.ch.hip_r.flex}, bar ${bb.c.map(r1)} -> ${bt.c.map(r1)}, safety ${SAFE_Y}, rack x ${RACK_X}\n  sweep ${JSON.stringify(sw)} gripErr ${st.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || st.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || sw.pinGap < -0.2) { console.error('FAIL: bar through the body, the floor or the pins'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
