// Single-Leg Dumbbell Romanian Deadlift (GymVisual #975212): stand on the right leg (knee soft), a dumbbell in the left
// hand (contralateral load, Mo 2023), the left foot just off the floor. Hinge at the right hip with a flat back while the
// left leg reaches back in line with the trunk, toes pointing down and the pelvis square, until the trunk is close to level;
// the dumbbell hangs straight down by the standing shin. Drive the hip forward to stand tall, the free leg swinging back
// under the body. The whole body (with the dumbbell) is balanced over the right mid-foot in both directions at every key.
// Right foot planted (constant IK target). Authored with the right leg standing (the player mirrors for the left).
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/single-leg-dumbbell-romanian-deadlift.json');

const F = makeFamily({ toe: 6, half: 9 });
const SIZE = [30, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] }, KG = 10;
const PITCH = +(process.env.P ?? -84), KNEE_TOP = 8, KNEE = +(process.env.K ?? 20);
const MID = [5, 9];   // right mid-foot (x, z)
// free (left) leg channels: hovering beside the standing ankle at the top, in line with the trunk at the bottom
const FREE = { top: { hip: +(process.env.TH ?? 12), knee: +(process.env.TK ?? 65), dorsi: -25 }, bottom: { hip: +(process.env.FH ?? 8), knee: 6, dorsi: -8 } };
function build(f, rx, rz) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  const kn = KNEE_TOP + (KNEE - KNEE_TOP) * Math.min(1, f / 0.4);
  let spec = { root: [rx, 85, rz], pitch: r1(PITCH * g), spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, feet: { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: -10, z: -9, lift: 12, w: 0 } } };
  spec = F.rootY(spec, kn);
  let p = F.pose(spec);
  const lean = -spec.pitch + spec.spine.l5 + spec.spine.t6, nk = -Math.min(lean, 80) * 0.16;
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.55) };
  const u = Math.pow(f, 0.9), lerp = (a, b) => r1(a + (b - a) * u);
  p.ch.hip_l = { flex: lerp(FREE.top.hip, FREE.bottom.hip), abd: 0, rot: 0 }; p.ch.knee_l = { flex: lerp(FREE.top.knee, FREE.bottom.knee) }; p.ch.ankle_l = { dorsi: lerp(FREE.top.dorsi, FREE.bottom.dorsi) };
  p.ch.sc_r = { protract: r1(2 - 2 * g), elevate: -2 }; p.ch.sc_l = clone(p.ch.sc_r);
  const q = B.hangToLegs(p, F, { mode: 'front', size: DSZ, clear: 3.8 }); delete q.__handle; B.mirrorArm(q); p = B.wrapPose(q);
  const W = F.fk(p);
  return { pose: p, W, dbs: [{ c: DBH.dumbbellAt(W, 'l', 'handle', DSZ).c, kg: KG }] };
}
// balance: root x and z so the centre of mass (body + dumbbell) sits over the right mid-foot
function at(f) {
  let rx = 0, rz = 6, r;
  for (let i = 0; i < 8; i++) { r = build(f, rx, rz); const c = B.comX(r.W, r.dbs); const ex = c[0] - MID[0], ez = c[2] - MID[1]; if (Math.hypot(ex, ez) < 0.08) break; rx -= ex * 1.1; rz -= ez * 1.1; }
  r.com = B.comX(r.W, r.dbs);
  return r;
}
const T = H.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.rise, D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {}, coms = [];
FS.forEach((f, i) => { const r = at(f); poses[`h${i}`] = r.pose; coms.push(r.com.map(r1)); });
poses.settle = at(0.985).pose;
const keyframes = [{ t: 0, pose: 'h0' }, ...H.easedKeys('h', FS, T0, T1), { t: T1 + 0.15, pose: 'settle' }, { t: T2, pose: `h${N}` }, ...H.easedKeys('h', FS, T2, T3, true), { t: D, pose: 'h0' }];
const props = [B.heldProp('l', 'handle', SIZE)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const rep = B.sweep(ex, { held: [{ side: 'l', grip: 'handle', size: DSZ }], fixed: ['ankle_r', 'toe_r'] });
const Wt = F.fk(poses.h0), Wb = F.fk(poses[`h${N}`]), dbB = DBH.dumbbellAt(Wb, 'l', 'handle', DSZ);
const legLine = r1(V.angle(V.sub(Wb.ankle_l.p, Wb.hip_l.p), V.sub(Wb.neck_c7.p, Wb.pelvis.p)));   // 180 = free leg in line with the trunk
const footUp = r1(Math.min(...[Wt, F.fk(poses.h1)].map((W) => Math.min(W.toe_l.p[1], W.ankle_l.p[1]))));
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.h0.ch.hip_r.flex)}° (standing hip)`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(poses[`h${N}`].ch.hip_r.flex)}° (joint channel), trunk ≈${Math.round(90 - B.trunkLean(Wb))}° above horizontal`);
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}° (standing knee)`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}°`);
H.setKin(ex, 'Free leg', 'setup', `Hovering beside the standing ankle (toe ${footUp} cm up)`); H.setKin(ex, 'Free leg', 'peak', `Hip-to-ankle line ${legLine}° to the trunk line (180 = straight line), pelvis level`);
H.setKin(ex, 'Load position', 'setup', 'Dumbbell in the left hand (opposite the standing leg)'); H.setKin(ex, 'Load position', 'peak', `Hangs by the standing shin, handle ${r1(dbB.c[1])} cm up; centre of mass kept over the right mid-foot (max offset ${r1(Math.max(...coms.map((c) => Math.hypot(c[0] - MID[0], c[2] - MID[1]))))} cm)`);
H.setKin(ex, 'Tempo', 'setup', `Balance ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down, ${r1(T2 - T1)} s pause, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Single-Leg Dumbbell RDL: wrote ${L.write(ex)}\n  hip ${poses.h0.ch.hip_r.flex}->${poses[`h${N}`].ch.hip_r.flex}, knee ${Math.round(B.kneeOf(Wb, 'r'))}, trunk ${r1(90 - B.trunkLean(Wb))} above horiz, free leg line ${legLine}, foot up ${footUp}, handle y ${r1(dbB.c[1])}, coms ${JSON.stringify(coms)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
