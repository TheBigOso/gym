// Dumbbell Lying Rear Delt Row (GymVisual #5289, page not readable here): lying face down on a flat bench raised so the
// arms can hang (bench top BENCH_H cm), chest on the pad with the chin just past its end, legs straddling the bench with
// the balls of the feet planted on the floor. The dumbbells hang under the shoulders with a pronated grip (palms toward
// the feet, handles across the body); the elbows pull up and out wide, in line with the shoulders, until the upper arms
// are about level with the back and the elbows bent about 90 degrees (forearms hanging about vertical), shoulder blades
// squeezing; pause; lower slowly. The chest stays on the pad; only the arms and shoulder blades move. Same lying set-up
// as the chest-supported row (b3-back benchBoxes / rowArm / sweep) with the pad flat. Bilateral.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const B = require('./families/b3-back');
const P = require('./families/prone');
const DBH = require('./families/dumbbell');
const { makeFamily, BALL_PITCH } = require('./families/lunge');
const meta = require('./meta/dumbbell-lying-rear-delt-row.json');

const SIZE = [32, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] };
const ANG = 0, PAD = 80, BW = 28, SEAT = 40, BENCH_H = +(process.env.BH ?? 61);
const S_ALONG = +(process.env.SA ?? 23);                                   // pelvis this far up the pad (cm): the chin clears the top
const CHEST_OFF = +(process.env.CO ?? 0);              // extra gap (cm) between the rig chest shapes and the pad
const FOOT = [+(process.env.FX ?? -14), null, +(process.env.FZ ?? 26)];                          // balls of the feet behind and beside the seat
const bench = DBH.bench({ x: -SEAT / 2, z: 0, seat: SEAT, height: BENCH_H, width: BW, angle: ANG, back: PAD, side: 1 });
const boxes = B.benchBoxes(bench);
const dir = bench.padDir, nrm = [-dir[1], dir[0], 0];
const FAM = makeFamily({ toe: 15, half: 10 });
const fq = (pitch, yaw) => P.qArr(Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)));
const HEEL = +(process.env.HEEL ?? BALL_PITCH);                // heel-up angle of the feet (on the balls of the feet)
const contacts = [Object.assign(L.legContact('r'), { label: 'Right foot (ball)', pole: [1, 0, 0.7], handRot: fq(HEEL, -15) }),
  Object.assign(L.legContact('l'), { label: 'Left foot (ball)', pole: [1, 0, -0.7], handRot: fq(HEEL, 15) })];
// ankle height that puts the ball of the foot (rig foot shape) on the floor at this heel angle
const footSh = L.rig.shapes.find((s) => s.id === 'foot_r');
const ANK = (() => { let a = 2, b = 30; for (let i = 0; i < 40; i++) { const y = (a + b) / 2, st = L.POSES.standing().pose; st.ik = { leg_r: { target: [0, y, 10], weight: 1 } }; const g = R.shapeWorld(L.fk(st, [contacts[0]]), footSh); const lo = g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); if (lo > 0.15) b = y; else a = y; } return r1((a + b) / 2 + 0.05); })();
const FT = { r: [FOOT[0], ANK, FOOT[2]], l: [FOOT[0], ANK, -FOOT[2]] };
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const PITCH = -(90 - ANG) - 8;   // the rig trunk line (pelvis to C7) sits about 8 degrees behind the pelvis axis
function base(pos) {
  return { root: { pos, rot: { pitch: PITCH } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: +(process.env.NK ?? -14) }, head_c1: { rot: 0, flex: +(process.env.HD ?? -16) },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, hip_r: { flex: 70, abd: 28, rot: -25 }, hip_l: { flex: 70, abd: 28, rot: -25 }, knee_r: { flex: 60 }, knee_l: { flex: 60 }, ankle_r: { dorsi: -8 }, ankle_l: { dorsi: -8 },
    shoulder_r: { plane: 90, elev: 60, axial: 0 }, shoulder_l: { plane: 90, elev: 60, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, wrist_l: { pron: 90, flex: 0, dev: 0 } },
    ik: { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } } };
}
const TRUNK = L.rig.shapes.filter((s) => /^(chest|pecs_r|pecs_l|ribcage|abdomen)$/.test(s.id));
const frontGap = (W) => { let m = 1e9; for (const s of TRUNK) { const g = R.shapeWorld(W, s); const ext = Math.sqrt(g.axes.reduce((a, ax) => a + V.dot(ax, nrm) ** 2, 0)); m = Math.min(m, V.dot(V.sub(g.c, bench.hinge), nrm) - ext); } return m; };
let pos = V.add(V.add(bench.hinge, V.scale(dir, S_ALONG)), V.scale(nrm, 20));
for (let it = 0; it < 40; it++) { const g = frontGap(L.fk(base(pos))) - CHEST_OFF; pos = V.sub(pos, V.scale(nrm, g)); if (Math.abs(g) < 0.005) break; }
let body = base(pos.map((v) => +v.toFixed(2)));
body = P.fitLeg(body, 'r', contacts, 'leg_r'); body = P.fitLeg(body, 'l', contacts, 'leg_l'); B.wrapPose(body);
// rowing arms: hang straight outside the pad, row to the lower ribs
// wide row: the elbow goes out to the side in line with the shoulder (du ~ 0 along the trunk, dz out), forearm hanging;
// pronated grip: palm toward the feet (-X), thumb side of the handle toward the midline
const ROW = { top: { du: +(process.env.TDU ?? 1), dz: +(process.env.TDZ ?? 22.5), wz: 0, flex: +(process.env.TFL ?? 90), tilt: 0 }, sc: [{ protract: 8, elevate: 0 }, { protract: -16, elevate: 0 }], hang: [0, 6],
  palm: [-1, 0, 0], thumb: () => [0, 0, -1], bend: 4 };
const state = {};
function at(f) { const q = B.rowArm(body, f, ROW, state); B.mirrorArm(q); return B.wrapPose(q); }
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
const T0 = 0.8, T1 = 2.0, T2 = 2.4, T3 = 4.4, D = 5.2, N = FS.length - 1;
const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const keyframes = [{ t: 0, pose: 'r0' }];
FS.forEach((f, i) => keyframes.push({ t: +(T0 + (T1 - T0) * inv(f)).toFixed(3), pose: `r${i}` }));
keyframes.push({ t: T2, pose: `r${N}` });
for (let i = N - 1; i >= 0; i--) keyframes.push({ t: +(T2 + (T3 - T2) * inv(1 - FS[i])).toFixed(3), pose: `r${i}` });
keyframes.push({ t: D, pose: 'r0' });
const props = [bench.prop, B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = B.NOTE;
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] });
const W0 = L.fk(poses.r0, contacts), W1 = L.fk(poses[`r${N}`], contacts);
const along = (j) => r1(V.dot(V.sub(W0[j].p, bench.hinge), dir));
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Bench and chest support', 'setup', `Flat bench ${BENCH_H} cm high (${SEAT + PAD} cm long); chest on the pad, head ${r1(along('head_c1') - PAD)} cm past the end`); set('Bench and chest support', 'peak', `Trunk ≈${Math.round(90 - B.trunkLean(W0))}° from horizontal, unchanged (the trunk does not move); dumbbells ${r1(rep.dbFloor)} cm above the floor at the lowest`);
set('Elbow flare', 'setup', 'Arms hanging under the shoulders'); set('Elbow flare', 'peak', `Upper arm ≈${Math.round(V.angle(V.sub(W1.elbow_r.p, W1.shoulder_r.p), V.sub(W1.neck_c7.p, W1.pelvis.p)))}° from the trunk line (head direction), elbow ${r1(W1.elbow_r.p[1] - W1.shoulder_r.p[1])} cm from shoulder height`);
set('Grip', 'setup', 'Pronated: palms toward the feet'); set('Grip', 'peak', 'Pronated (held)');
set('Feet', 'setup', `Straddling the bench, balls of the feet on the floor ${2 * FOOT[2]} cm apart`); set('Feet', 'peak', 'Unchanged (planted)');
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}°, shoulder blades retracted (clavicle ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
set('Tempo', 'setup', 'Hang 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.4 s squeeze, 2.0 s down, 0.8 s pause');
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 5), max: Math.ceil(tf + 5) };
console.log(`Dumbbell Lying Rear Delt Row: wrote ${L.write(ex)}\n  pelvis ${body.root.pos}, along pad: pelvis ${along('pelvis')} neck ${along('neck_c7')} head ${along('head_c1')}; legs ${JSON.stringify(body.ch.hip_r)} knee ${body.ch.knee_r.flex}; elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))}, cost ${state.cost.toFixed(2)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.dbBox < 0) { console.error('FAIL: dumbbell through the floor, the bench or the body'); process.exitCode = 1; }
