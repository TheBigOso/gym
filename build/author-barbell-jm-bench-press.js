// Barbell JM-Bench Press (GymVisual #4992, Barbell JM-Bench Press): lying on a flat bench (the barbell bench press base: glutes
// on the seat, upper back and head on the pad, shoulder blades set, feet planted). Overhand grip a little inside shoulder
// width (34 cm between the handle centres), elbows tucked over the shoulders. A hybrid of the close-grip press and the
// skull crusher: as the elbows bend, the upper arms tilt down toward the feet (to about 45 degrees from vertical) so the
// bar travels back and down toward the upper chest / chin, stopping a few centimetres above it; then the elbows extend and
// the upper arms return to vertical. Each key sets the upper-arm tilt and the elbow bend together (the dumbbell JM press
// recipe) and the hands are solved onto the bar at a constant grip width. Bench-press stands at the head end. Bilateral.
// Family b5-bbpress.js (extDirs / extKey / refine).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const F = require('./families/b5-bbpress');
const meta = require('./meta/barbell-jm-bench-press.json');

const GW = 34, TILT = +(process.env.TILT ?? 55), FLEX_BOT = +(process.env.FLEXB ?? 128), TILT_TOP = 0, FLEX_TOP = 4;
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), Fr = C.trunkFrame(W0), S = W0.shoulder_r.p, dG = F.elbowToGrip(base);
const SEEDS = [[90, 90, -90, 10, -170], [90, 90, 0, 10, 90], [60, 80, -60, 30, 170], [100, 70, -80, 60, 170], [90, 80, 90, 40, 0]];
// f = 0 bottom ... 1 top (phase s = 1 - f: tilt and bend grow together, eased a little so the elbows lead)
const solve = (f, prev) => { const s = 1 - f, dirs = F.extDirs([0, 1, 0], [-1, 0, 0], TILT_TOP + (TILT - TILT_TOP) * s, FLEX_TOP + (FLEX_BOT - FLEX_TOP) * s); return F.strip(F.extKey(base, contacts, dirs, { S, GW, d: dG, seeds: prev ? [F.seedOf(prev)] : SEEDS, wrist: -6 })); };
const path = F.refine(solve, 12, GW, contacts, { from: -1 });
const settle = solve(0.012, path[0].pose);
const { poses, keyframes } = F.repKeysF(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const st = F.stands(W0, bt.c);
ex.props = [B.prop, BB.barbellProp(), st.prop];
let head = { d: 1e9 }, gripErr = 0;
for (const k of path) gripErr = Math.max(gripErr, F.widthErr(k.pose, contacts, GW));
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => { const h = F.clearHead(W); if (h.d < head.d) head = { d: +h.d.toFixed(2), id: h.id, t: +t.toFixed(2) }; } });
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, uaAng = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, 1, 0]);
const jaw = L.R.shapeWorld(Wb, L.rig.shapes.find((s) => s.id === 'jaw'));
set('Grip width', 'setup', `${GW} cm between the handle centres (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} (arms straight over the shoulders)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} at the bottom`);
set('Upper arm angle', 'setup', `${d(uaAng(Wt))} from vertical`); set('Upper arm angle', 'peak', `${d(uaAng(Wb))} from vertical toward the feet at the bottom`);
set('Bar path', 'setup', `Over the shoulder joints, ${r1(bt.c[1] - B.top)} cm above the bench`); set('Bar path', 'peak', `Bottom: ${r1(bb.c[1] - S[1])} cm above the shoulder joints and ${r1(bb.c[0] - S[0])} cm toward the feet from them (over the upper chest, ${r1(bb.c[0] - jaw.c[0])} cm toward the feet from the chin); ${sw.barBody} cm from the chest, ${head.d} cm from the head / neck at the closest`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Barbell JM-Bench Press: wrote ${L.write(ex)}\n  keys ${path.length} bar top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} elbow ${r1(BB.elbowOf(Wt, 'r'))}/${r1(BB.elbowOf(Wb, 'r'))} ua ${r1(uaAng(Wb))} wrist ${poses.bottom.ch.wrist_r.flex}\n  sweep ${JSON.stringify(sw)} head ${JSON.stringify(head)} keyWidthErr ${gripErr.toFixed(2)}`);
if (sw.widthRange > 1.0 || gripErr > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0.5 || head.d < 2) { console.error('FAIL: bar too close to the body or head'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
