// Seated Dumbbell Good Morning (GymVisual #951512): sitting tall on the end of a flat bench (45 cm), feet wide and flat, toes
// turned out, one dumbbell held upright against the chest (goblet hold, as in the standing good morning). Hinge forward
// from the hips with a flat back, the chest lowering between the thighs to a lean of about 50 degrees, then sit tall again.
// The hips stay on the seat: each key pelvis pitch is solved so the hip joints keep their place over the seat and the
// lowest glute point rests on the pad (placed from the skinned-mesh measurement). Both feet planted. Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const B3L = require('./families/b3-legs');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/seated-dumbbell-good-morning.json');

const TOE = 20, HALF = 30;
const F = makeFamily({ toe: TOE, half: HALF });
for (const c of F.contacts) { const s = c.id.endsWith('_r') ? 1 : -1, a = (TOE + 6) * R.DEG; c.pole = [+Math.cos(a).toFixed(3), 0, +(s * Math.sin(a)).toFixed(3)]; }
const SEAT = 45;
// rig glute low point above the pad, from the skinned-mesh measurement: the athlete's glutes sit about 3.5 cm lower than the
// rig shapes when upright and match them in the forward lean
const seatOff = (g) => r1(+(process.env.SO0 ?? -3.4) + (+(process.env.SO1 ?? 0.3) - +(process.env.SO0 ?? -3.4)) * g);
const FX = +(process.env.FX ?? 34);                     // ankles this far in front of the hip joints
const OFF = B3L.GOBLET_OFFSET;
const GLUTE = rig.shapes.filter((s) => /^(buttock|pelvis)/.test(s.id));
const gluteMin = (W) => Math.min(...GLUTE.map((s) => { const g = R.shapeWorld(W, s); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); }));
const hipMid = (W) => V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5);
// upright seated reference: pelvis at the origin, find the hip centre and glute low point
const spec0 = (pitch, x, y, sp) => ({ root: [x, y, 0], pitch, spine: sp, feet: { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } } });
const ref = L.fk({ root: { pos: [0, 50, 0], rot: { pitch: 0 } }, ch: {} });
const HIP0 = hipMid(ref);   // hip centre with the pelvis at [0, 50, 0]
let FEET = null;
function key(pitch, sp, g = 0) {
  // root so the hip centre stays at x = 0 and the glute low point sits on the pad
  const base = (x, y) => { const s = spec0(pitch, x, y, sp); s.feet = FEET; return s; };
  let x = 0, y = 50;
  for (let i = 0; i < 6; i++) {
    const W = L.fk({ root: { pos: [x, y, 0], rot: { pitch } }, ch: { spine_l5: { rot: 0, flex: sp.l5, latFlex: 0 }, spine_t12: { rot: 0, flex: sp.t12, latFlex: 0 }, spine_t6: { rot: 0, flex: sp.t6, latFlex: 0 } } });
    x -= hipMid(W)[0]; y -= gluteMin(W) - (SEAT + seatOff(g));
  }
  return base(r1(x), r1(y));
}
FEET = { r: { c: 'flat', x: FX, z: HALF }, l: { c: 'flat', x: FX, z: -HALF } };
const s0 = key(0, { l5: 0, t12: 0, t6: 0 });
let stand = F.pose(s0);
const gob = B3L.gobletArms(stand, { at: [25, 6, 5.4], elbow: [14, -16, 12], tilt: 0.45 });
const ARMS = ['sc_r', 'sc_l', 'shoulder_r', 'shoulder_l', 'elbow_r', 'elbow_l', 'wrist_r', 'wrist_l'];
const PITCH = +(process.env.P ?? -54);
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  const sp = { l5: r1(-4 * g), t12: r1(-1 * g), t6: r1(1 * g) };
  const p = F.pose(key(r1(PITCH * g), sp, g));
  for (const j of ARMS) p.ch[j] = clone(gob.ch[j]);
  const lean = -PITCH * g + sp.l5 + sp.t12 + sp.t6, nk = -lean * 0.2;
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.55) };
  return B.wrapPose(p);
}
const T = H.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.rise, D = meta.timeline.duration;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`h${i}`] = at(f); });
poses.settle = at(0.985);
const keyframes = [{ t: 0, pose: 'h0' }, ...H.easedKeys('h', FS, T0, T1), { t: T1 + 0.15, pose: 'settle' }, { t: T2, pose: `h${N}` }, ...H.easedKeys('h', FS, T2, T3, true), { t: D, pose: 'h0' }];
// bench: seat under the glutes (its +x end a little behind the knees), back pad flat behind
const W0 = F.fk(poses.h0);
const seatEnd = r1(Math.min(W0.knee_r.p[0] - 18, 16));
const bench = DBH.bench({ x: r1(seatEnd - 20), z: 0, seat: 40, height: SEAT, width: 30, angle: 0, back: 80, side: -1 });
const boxes = B.benchBoxes(bench);
const props = [bench.prop, B3L.heldProp('r', 'goblet', OFF)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const rep = B.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], boxes, bodySkip: ['buttock_r', 'buttock_l', 'pelvis', 'thigh_r', 'thigh_l'] });
const db = B3L.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const Wb = F.fk(poses[`h${N}`]);
const glu = FS.map((f, i) => r1(gluteMin(F.fk(poses[`h${i}`])) - SEAT)), hipX = FS.map((f, i) => r1(hipMid(F.fk(poses[`h${i}`]))[0]));
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.h0.ch.hip_r.flex)}° seated`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(poses[`h${N}`].ch.hip_r.flex)}° (joint channel), trunk ≈${Math.round(B.trunkLean(Wb))}° forward of vertical`);
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(W0, 'r'))}°, ankles ${2 * HALF} cm apart, toes out ${TOE}°`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}°`);
H.setKin(ex, 'Lumbar motion', 'setup', 'Neutral'); H.setKin(ex, 'Lumbar motion', 'peak', `Spine channels ${poses[`h${N}`].ch.spine_l5.flex}°/${poses[`h${N}`].ch.spine_t12.flex}°/${poses[`h${N}`].ch.spine_t6.flex}° (L5/T12/T6): neutral`);
H.setKin(ex, 'Tempo', 'setup', `Sit ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down, ${r1(T2 - T1)} s pause, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Seated Dumbbell Good Morning: wrote ${L.write(ex)}\n  trunk ${r1(B.trunkLean(Wb))}, hip ${poses[`h${N}`].ch.hip_r.flex}, knee ${Math.round(B.kneeOf(W0, 'r'))}, glute-pad ${glu}, hip x ${hipX}, seat x ${bench.seatX}; ${JSON.stringify(rep)} ${JSON.stringify(db)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
