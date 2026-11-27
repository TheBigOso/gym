// Barbell Bench Press (GymVisual "Barbell Bench Press"): lying on a flat bench (same lying base as the dumbbell bench press:
// glutes on the seat, upper back and head on the pad, shoulder blades drawn back and down), feet planted (leg contacts,
// constant targets). Overhand grip, 78 cm between the handle centres (about 1.5x shoulder width). From straight arms with
// the bar over the shoulders, the bar lowers to the lower chest with the forearms about vertical and the elbows about 55
// degrees from the trunk, touches without bouncing, and is pressed back up and slightly toward the head (a shallow J path)
// to straight arms over the shoulders. Bench-press stands at the head end, J-hooks a few centimetres below the bar's top
// height and over the eyes (where the bar is unracked). Bilateral; the left arm mirrors the right.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const meta = require('./meta/barbell-bench-press.json');

const GW = 78, BOTTOM_DX = 16, TOP_DX = 2, TOP_ELBOW = 8; // bar touches 16 cm toward the feet from the shoulder joints
const PALM = V.norm([1, 0.6, 0]), THUMB = [0, 0, -1];         // palms toward the feet and up under the bar
const SEEDS = [[0, 55, 0, 100, 120], [30, 70, 60, 90, 60], [30, 70, -60, 90, 170], [10, 80, 0, 90, 90], [60, 85, 30, 30, 90]];
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, Fr = C.trunkFrame(W0);
const vertFore = (w) => (W) => { const d = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); return [d[0] * w, d[2] * w]; };
let gripWorst = 0;
// Bar grip (heel of the palm): the wrist is extended about 20 degrees at the bottom (palm turned up under the bar), easing to
// about 10 at the top. Elbow target: 55 degrees of flare, 35 below the back plane (as high as the rig allows with the bar on
// the chest and the forearms within about 10 degrees of vertical; see the note at the end of the file).
const wristExt = (v, w) => (W, q) => [(q.ch.wrist_r.flex - v) * w, Math.min(0, q.ch.wrist_r.flex + 35) * 3, Math.max(0, q.ch.wrist_r.flex - 10) * 3];
function arm(c, f, seed) {
  const grips = EQ.barGrips(c, BB.AX, GW), E = V.add(S, V.scale(C.upperArmDir(Fr, 55, 35), L.UA));
  const q = BB.armsOnBar(base, grips.r, { palm: PALM, thumb: THUMB, dirW: 0.4, wristW: 0.01, guesses: seed ? [seed] : SEEDS, elbow: f < 1 ? E : null, elbowW: 0.5 * (1 - f), extra: [vertFore(1.2 * (1 - f) + 0.3), wristExt(-20 + 10 * f, 0.3)] });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q, contacts), grips));
  return q;
}
const seedOf = (q) => [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
// bottom: bar resting on the lower chest (0.3 cm off the rig chest / ribcage shapes)
const xb = r1(S[0] + BOTTOM_DX), cb = [xb, r1(BB.chestTop(W0, xb) + 0.3), 0];
// top: over the shoulders with the elbows nearly straight (bisection on the bar height)
const xt = r1(S[0] + TOP_DX);
let ya = cb[1] + 20, yb = cb[1] + 60;
for (let i = 0; i < 24; i++) { const y = (ya + yb) / 2, q = BB.armsOnBar(base, EQ.barGrips([xt, y, 0], BB.AX, GW).r, { palm: PALM, thumb: THUMB, dirW: 0.4, wristW: 0.01, guesses: SEEDS, extra: [wristExt(-10, 0.3)] }); const e = BB.gripErr(L.fk(q, contacts), EQ.barGrips([xt, y, 0], BB.AX, GW)); if (e < 0.1 && q.ch.elbow_r.flex > TOP_ELBOW) ya = y; else yb = y; }
const ct = [xt, r1(ya), 0];
// press path f = 0 (bottom) ... 1 (top): the bar moves toward the head mostly early in the press (J curve)
const N = 18, path = [];
let prev = null;
for (let i = 0; i <= N; i++) {
  const f = i / N, gx = 1 - Math.pow(1 - f, 1.8), c = [r1(cb[0] + (ct[0] - cb[0]) * gx), r1(cb[1] + (ct[1] - cb[1]) * f), 0];
  const q = C.strip(arm(c, f, prev && seedOf(prev)));
  path.push({ f, pose: q }); prev = q;
}
const settle = C.strip(arm([cb[0], cb[1] - 0.2, 0], 0, seedOf(path[0].pose))); // the chest gives a little under the bar
const { poses, keyframes } = C.repKeys(path, T, settle);
for (const k in poses) delete poses[k].__cost;
const ex = H.module_(meta, contacts, poses, keyframes);
// props: bench, barbell, bench-press stands at the head end (the bar rests in the hooks over the eyes, 5 cm below its top
// height, 5 cm in front of the uprights)
const eyeX = r1(L.R.shapeWorld(W0, L.rig.shapes.find((x) => x.id === 'eye_r')).c[0]), HOOK_Y = Math.round(ct[1] - 5), RACK_X = r1(eyeX - 5);
const rack = EQ.rack({ x: RACK_X, hookY: HOOK_Y, height: HOOK_Y + 25, width: 120, id: 'stands' }).prop;
ex.props = [B.prop, BB.barbellProp(), rack];

const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t, o) => { o.elbowMax = Math.max(o.elbowMax || 0, BB.elbowOf(W, 'r')); o.elbowLow = Math.min(o.elbowLow ?? 1e9, +W.elbow_r.p[1].toFixed(1), +W.elbow_l.p[1].toFixed(1)); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), fit = C.benchFit(B, W0);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench angle', 'setup', 'Flat (0°)'); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad (rig shapes)');
set('Grip width', 'setup', `${GW} cm between the handle centres (≈${(GW / (2 * S[2])).toFixed(1)}x the shoulder-joint width)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar on the chest`);
set('Elbow flare', 'setup', 'Arms vertical over the shoulders'); const fo = V.norm(V.sub(Wb.wrist_r.p, Wb.elbow_r.p)), tilt = Math.acos(fo[1]) / L.R.DEG;
set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom; upper arms ${d(C.armDip(Wb))} below the back plane, elbows ${r1(B.top - Wb.elbow_r.p[1])} cm below the bench top; forearms ${d(tilt)} from vertical, wrists extended ${d(-poses.bottom.ch.wrist_r.flex)}`);
set('Bar path', 'setup', `Top: over the shoulder joints, ${r1(ct[1] - B.top)} cm above the bench`); set('Bar path', 'peak', `Bottom: lower chest, ${BOTTOM_DX} cm toward the feet from the shoulder joints; ${r1(ct[1] - cb[1])} cm of travel, ${BOTTOM_DX - TOP_DX} cm toward the head on the way up`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Barbell Bench Press: wrote ${L.write(ex)}\n  bench ${JSON.stringify(fit)} bar bottom ${cb} top ${ct} hooks x ${RACK_X} y ${HOOK_Y}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)} elbow y ${r1(Wb.elbow_r.p[1])} (bench top ${B.top}) forearm tilt ${tilt.toFixed(0)} wrist ${poses.bottom.ch.wrist_r.flex}; top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)}\n  sweep ${JSON.stringify(sw)} gripErr ${gripWorst.toFixed(2)}`);
if (sw.widthRange > 1.0 || gripWorst > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: bar through the body or plates through the floor'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
// Note (rig v2 geometry): lying, the shoulder joints sit 8 cm above the bench top and the chest top 23 cm above it. With the
// bar on the chest, the bar grip about 4.5 cm above the wrist and a 25.7 cm forearm, vertical forearms put the elbows about
// 7 cm below the bench top (upper arms about 40 degrees below the back plane). Elbows at the bench top need the forearms
// about 40 degrees off vertical, with the elbows either tucked to the ribs (flare under 15) or flared to a "T" (90+).
