// Barbell Seated Good morning (GymVisual "Barbell Seated Good morning", movement reference only): sitting tall on the end of
// a flat bench (45 cm), feet wide and flat, toes turned out; a barbell across the upper traps as in a high-bar back squat
// (fixed in the upper-trunk frame, so it rides with the trunk), hands 80 cm apart just outside the shoulders, elbows down,
// shoulder blades squeezed back to make the shelf. Hinge forward from the hips with a flat back to a lean of about 50
// degrees, then sit tall again. The hips stay on the seat: each key pelvis pitch is solved so the hip joints keep their
// place over the seat and the lowest glute point rests on the pad (seated-dumbbell-good-morning.js placement). Both feet
// planted. Bilateral. Arms from the barbell family (barbell.js armsOnBar), solved once in the trunk frame.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const H4 = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-seated-good-morning.json');

const TOE = 20, HALF = 28, SEAT = 45, GW = 80;
const F = makeFamily({ toe: TOE, half: HALF });
for (const c of F.contacts) { const s = c.id.endsWith('_r') ? 1 : -1, a = (TOE + 6) * R.DEG; c.pole = [+Math.cos(a).toFixed(3), 0, +(s * Math.sin(a)).toFixed(3)]; }
const seatOff = () => 0;   // rig v2: the lowest glute point rests on the pad
const FX = 34;
const GLUTE = rig.shapes.filter((s) => /^(buttock|pelvis)/.test(s.id));
const gluteMin = (W) => Math.min(...GLUTE.map((s) => { const g = R.shapeWorld(W, s); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); }));
const hipMid = (W) => V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5);
const FEET = { r: { c: 'flat', x: FX, z: HALF }, l: { c: 'flat', x: FX, z: -HALF } };
function key(pitch, sp) {
  let x = 0, y = 50;
  for (let i = 0; i < 6; i++) {
    const W = L.fk({ root: { pos: [x, y, 0], rot: { pitch } }, ch: { spine_l5: { rot: 0, flex: sp.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: sp.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: sp.t6, latFlex: 0 } } });
    x -= hipMid(W)[0]; y -= gluteMin(W) - (SEAT + seatOff());
  }
  return { root: [r1(x), r1(y), 0], pitch, spine: sp, feet: FEET };
}
// bar on the upper traps (squat author's high-bar spot), arms solved once with the trunk upright
const BAR_T6 = [-5.2, 14.4, 0], ELBOW_T6 = [-8, -20, 10], SC = { protract: -8, elevate: 4 };
const barOn = (W) => V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BAR_T6));
const state = {};
const up = F.pose(key(0, { l5: 0, t12: 0, t6: 0 }));
up.ch.sc_r = clone(SC); up.ch.sc_l = clone(SC);
const Wu = L.fk(up), Cu = barOn(Wu), Eu = V.add(Wu.shoulder_r.p, V.scale(V.norm(Q.rot(Wu.spine_t6.q, ELBOW_T6)), L.UA));
const armQ = X.barArms(up, Cu, GW, { palm: Q.rot(Wu.spine_t6.q, [1, 0, 0]), thumb: [0, 0, -1], elbow: Eu, elbowW: 0.3, dirW: 1.5, guesses: [[-20, 20, -120, 135, 0], [-30, 40, -100, 130, 60], [0, 50, -110, 120, 0], [-40, 50, -60, 130, 0]] }, state);
const ARMS = ['sc_r', 'sc_l', 'shoulder_r', 'shoulder_l', 'elbow_r', 'elbow_l', 'wrist_r', 'wrist_l'];
const PITCH = +(process.env.P ?? -54);
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  const sp = { l5: r1(-4 * g), t12: r1(-1 * g), t6: r1(1 * g) };
  const p = F.pose(key(r1(PITCH * g), sp));
  for (const j of ARMS) p.ch[j] = clone(armQ.ch[j]);
  const lean = -PITCH * g + sp.l5 + sp.t12 + sp.t6, nk = -lean * 0.2;
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.55) };
  return B.wrapPose(p);
}
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
const keyframes = [{ t: 0, pose: 'h0' }, ...X.eased('h', FS, ph.lower[0], ph.lower[1]), ...X.eased('h', FS, ph.rise[0], ph.rise[1], true), { t: D, pose: 'h0' }];
const W0 = F.fk(poses.h0);
const seatEnd = r1(Math.min(W0.knee_r.p[0] - 18, 16));
const bench = DBH.bench({ x: r1(seatEnd - 20), z: 0, seat: 40, height: SEAT, width: 30, angle: 0, back: 80, side: -1 });
const boxes = B.benchBoxes(bench);
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [bench.prop, BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], probe: (W, pz, t, o) => { const b = B.bodyBoxClear(W, boxes, ['buttock_r', 'buttock_l', 'pelvis', 'thigh_r', 'thigh_l']); o.bodyBox = Math.min(o.bodyBox ?? 1e9, b.d); } });
const rest = BB.sweep(ex, {}).barBody;
const Wb = F.fk(poses[`h${N}`]);
const glu = FS.map((f, i) => r1(gluteMin(F.fk(poses[`h${i}`])) - SEAT));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Hip flexion', 'setup', `${d(poses.h0.ch.hip_r.flex)} seated`); set('Hip flexion', 'peak', `${d(poses[`h${N}`].ch.hip_r.flex)} (joint channel)`);
set('Trunk inclination', 'setup', `${d(B.trunkLean(W0))} (sitting tall), bar on the upper traps, ${GW} cm grip`); set('Trunk inclination', 'peak', `${d(B.trunkLean(Wb))} forward of vertical`);
set('Lumbar motion', 'setup', 'Neutral'); set('Lumbar motion', 'peak', `Spine channels ${poses[`h${N}`].ch.spine_l5.flex}°/${poses[`h${N}`].ch.spine_t12.flex}°/${poses[`h${N}`].ch.spine_t6.flex}° (L5/T12/T6): neutral`);
set('Tempo', 'setup', `Sit ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(ph.bottom[1] - ph.bottom[0])} s pause, ${r1(ph.rise[1] - ph.rise[0])} s up, ${r1(D - ph.rise[1])} s reset`);
sw.bodyBox = r1(sw.bodyBox);
console.log(`Barbell Seated Good Morning: wrote ${L.write(ex)}\n  trunk ${r1(B.trunkLean(Wb))}, hip ${poses[`h${N}`].ch.hip_r.flex}, glute-pad ${glu}\n  sweep ${JSON.stringify(sw)} trapsRest ${rest} gripErr ${state.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
if (sw.bodyBox < -1) { console.error('FAIL: body through the bench'); process.exitCode = 1; }
