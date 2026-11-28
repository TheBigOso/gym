// Smith Bench Press (GymVisual "Smith Bench Press"): flat bench press in a Smith machine. Same lying base as the barbell
// bench press (glutes on the seat, upper back and head on the pad, shoulder blades drawn back and down, feet planted).
// The bench sits square under the vertical rails so the bar comes down on the middle of the chest, 10 cm toward the feet
// from the shoulder joints, and goes back up the same line (no J curve: the rails fix the path) to nearly straight arms.
// Overhand grip, 78 cm between the bar grips (about 1.5x shoulder width), elbows about 55 degrees from the trunk at the
// bottom. Pegs (hookY) a few centimetres under the top bar height, safety stops just under the chest. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const SG = require('./families/gear-smith');
const H = require('./families/hips');
const meta = require('./meta/smith-bench-press.json');

const GW = 78, BAR_DX = 10, TOP_ELBOW = 8;                  // bar line 10 cm toward the feet from the shoulder joints
const PALM = V.norm([1, 0.6, 0]), THUMB = [0, 0, -1];         // palms toward the feet and up under the bar
const SEEDS = [[0, 55, 0, 100, 120], [30, 70, 60, 90, 60], [30, 70, -60, 90, 170], [10, 80, 0, 90, 90], [60, 85, 30, 30, 90]];
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, Fr = C.trunkFrame(W0);
const RAIL_X = r1(S[0] + BAR_DX), sm0 = SG.smith({ x: RAIL_X });
const vertFore = (w) => (W) => { const d = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); return [d[0] * w, d[2] * w]; };
const wristExt = (v, w) => (W, q) => [(q.ch.wrist_r.flex - v) * w, Math.min(0, q.ch.wrist_r.flex + 35) * 3, Math.max(0, q.ch.wrist_r.flex - 10) * 3];
let gripWorst = 0;
// f = 0 bottom ... 1 top: elbow target (55 degrees of flare, 35 below the back plane) fading out toward the top
function arm(y, f, seed) {
  const E = V.add(S, V.scale(C.upperArmDir(Fr, 55, 35), L.UA));
  const q = SG.armsOnSmith(base, sm0, y, GW, { palm: PALM, thumb: THUMB, dirW: 0.4, wristW: 0.01, guesses: seed ? [seed] : SEEDS, elbow: f < 1 ? E : null, elbowW: 0.5 * (1 - f), extra: [vertFore(1.2 * (1 - f) + 0.3), wristExt(-20 + 10 * f, 0.3)] });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q, contacts), SG.grips(sm0, y, GW)));
  return q;
}
const seedOf = (q) => [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron, q.ch.wrist_r.flex, q.ch.wrist_r.dev];
// bottom: bar resting on the chest (0.3 cm off the rig chest / ribcage shapes); top: highest bar with the elbows still a
// little bent (bisection)
const yb = r1(BB.chestTop(W0, RAIL_X) + 0.3);
let ya = yb + 20, yz = yb + 60;
for (let i = 0; i < 24; i++) { const y = (ya + yz) / 2, q = SG.armsOnSmith(base, sm0, y, GW, { palm: PALM, thumb: THUMB, dirW: 0.4, wristW: 0.01, guesses: SEEDS, extra: [wristExt(-10, 0.3)] }); const e = BB.gripErr(L.fk(q, contacts), SG.grips(sm0, y, GW)); if (e < 0.1 && q.ch.elbow_r.flex > TOP_ELBOW) ya = y; else yz = y; }
const yt = r1(ya);
const N = 18, path = [];
let prev = null;
// keys denser toward the top, where the elbows straighten quickly for each cm of bar travel (keeps the grip width constant
// between keys)
for (let i = 0; i <= N; i++) { const f = 1 - Math.pow(1 - i / N, 1.5), q = C.strip(arm(r1(yb + (yt - yb) * f), f, prev && seedOf(prev))); path.push({ f, pose: q }); prev = q; }
const settle = C.strip(arm(yb - 0.2, 0, seedOf(path[0].pose))); // the chest gives a little under the bar
const { poses, keyframes } = C.repKeys(path, T, settle);
for (const k in poses) delete poses[k].__cost;
const ex = H.module_(meta, contacts, poses, keyframes);
// props: bench and the Smith machine (pegs 5 cm under the top bar height, safety stops 4 cm under the chest touch)
const HOOK_Y = Math.round(yt - 5), SAFETY_Y = Math.floor(yb - 4);
const sm = SG.smith({ x: RAIL_X, hookY: HOOK_Y, safetyY: SAFETY_Y, restY: HOOK_Y });
ex.props = [B.prop, ...sm.props];

const sw = SG.sweep(ex, sm, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t, o) => { o.elbowMax = Math.max(o.elbowMax || 0, BB.elbowOf(W, 'r')); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), fit = C.benchFit(B, W0);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench angle', 'setup', 'Flat (0°)'); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad (rig shapes)');
set('Grip width', 'setup', `${GW} cm between the bar grips (≈${(GW / (2 * S[2])).toFixed(1)}x the shoulder-joint width)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar on the chest`);
set('Elbow flare', 'setup', 'Arms reaching up to the bar'); set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom; upper arms ${d(C.armDip(Wb))} below the back plane`);
set('Bar path', 'setup', `Vertical rails ${BAR_DX} cm toward the feet from the shoulder joints; top ${r1(yt - B.top)} cm above the bench`); set('Bar path', 'peak', `Bottom on the middle of the chest, ${r1(yt - yb)} cm of travel`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Smith Bench Press: wrote ${L.write(ex)}\n  bench ${JSON.stringify(fit)} rail x ${RAIL_X} bar ${yb} -> ${yt} hookY ${HOOK_Y} safetyY ${SAFETY_Y}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)}; top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)}\n  sweep ${JSON.stringify(sw)} gripErr ${gripWorst.toFixed(2)}`);
SG.fail(sw);
if (gripWorst > 0.5) { console.error('FAIL: hands off the bar grip points'); process.exitCode = 1; }
