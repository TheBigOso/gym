// L-sit (GymVisual #4244; page not readable here, movement from the name and standard coaching): floor L-sit on a mat.
// Sit tall with the legs straight and together, hands flat beside the hips (fingers forward, planted contacts). Lock the
// elbows, push the floor away and pull the shoulders down (clavicle depression to the rig's -10 degree limit): the hips
// and the straight legs lift off the mat together, legs level, toes pointed; hold 4 s, lower. With the rig's arm length
// the floor version clears the mat by a few centimetres, as on a real person without parallettes.
const L = require('./lib');
const { V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const CA = require('./families/core-a');
const B = require('./families/b6-18');
const meta = require('./meta/l-sit.json');

const st = clone(L.POSES.standing().pose); delete st.ik;
const BUT = ['buttock_r', 'buttock_l', 'pelvis'], LEGS = ['thigh_r', 'thigh_l', 'calf_r', 'calf_l', 'shank_r', 'shank_l', 'foot_r', 'foot_l', 'quad_r', 'quad_l'];
const contacts = [Object.assign(L.handContact('r'), { pole: [-1, 0.1, 0.35] }), Object.assign(L.handContact('l'), { pole: [-1, 0.1, -0.35] })];
// Seated frame: pitch (deg, - = trunk leans forward), sc elevation, root height chosen by the caller.
function seated({ y, pitch = -4, hip = 94, elev = 0, ankle = 0, spine = 0 }) {
  const p = clone(st); p.root.pos = [0, y, 0]; p.root.rot = { pitch };
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: r1(hip), abd: 1, rot: 0 }; p.ch[`knee_${s}`] = { flex: 2 }; p.ch[`ankle_${s}`] = { dorsi: ankle }; p.ch[`sc_${s}`] = { protract: 2, elevate: elev }; p.ch[`shoulder_${s}`] = { plane: 20, elev: 12, axial: 0 }; p.ch[`elbow_${s}`] = { flex: 20 }; p.ch[`wrist_${s}`] = { pron: 0, flex: -70, dev: 0 }; }
  p.ch.spine_l5 = { rot: 0, flex: r1(spine * 0.6), latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: r1(spine * 0.4), latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: r1(-pitch * 0.4 + 4) }; p.ch.head_c1 = { rot: 0, flex: r1(-pitch * 0.4 + 2) };
  return p;
}
// Sitting: buttocks resting on the mat (pelvis height by bisection), legs straight on the mat.
const sit0 = (() => { const p = seated({ y: 10 }); let a = 0, b = 20; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; p.root.pos[1] = m; if (Math.min(CA.minOf(L.fk(p), BUT), CA.minOf(L.fk(p), LEGS)) < 0.15) a = m; else b = m; } p.root.pos[1] = r1(b); return p; })();
const W0 = L.fk(sit0);
// Hands beside the hips: a little outside the shoulders, level with the hip joints.
const HX = r1(W0.shoulder_r.p[0] + 6), HZ = r1(W0.shoulder_r.p[2] + 6); // a little ahead of and outside the shoulders, beside the upper thighs
const HT = { r: [HX, P.PALM, HZ], l: [HX, P.PALM, -HZ] };
const withHands = (p) => { p.ik = { arm_r: { target: HT.r.slice(), weight: 1 }, arm_l: { target: HT.l.slice(), weight: 1 } }; return P.fitAll(p, contacts); };
// Lifted: u = 0..1 from sitting to the full L. Shoulders depress, the root rises until the elbows are nearly straight.
const ELB_TOP = 4;
function lifted(u, extra = {}) {
  const e = B.ease(u);
  const p = seated({ y: sit0.root.pos[1], pitch: -4 - 4 * e, hip: 94 + 6 * e, elev: -10 * e, ankle: -35 * e, spine: 4 * e, ...extra });
  p.ik = { arm_r: { target: HT.r.slice(), weight: 1 }, arm_l: { target: HT.l.slice(), weight: 1 } };
  if (u > 0) { // root height: elbow flexion goes from the sitting value to ELB_TOP
    const elb0 = P.elbowAngle(L.fk(withHands(clone(sit0)), contacts), 'r'), target = elb0 + (ELB_TOP - elb0) * e;
    let a = sit0.root.pos[1], b = sit0.root.pos[1] + 10;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; p.root.pos[1] = m; if (P.elbowAngle(L.fk(p, contacts), 'r') > target) a = m; else b = m; }
    p.root.pos[1] = r1((a + b) / 2);
  }
  return P.fitAll(p, contacts);
}
const poses = { sit: withHands(clone(sit0)), p1: lifted(0.35), p2: lifted(0.7), top: lifted(1), hold: lifted(1, { hip: 101 }) };
const keyframes = [{ t: 0, pose: 'sit' }, { t: 1.0, pose: 'sit' }, { t: 1.2, pose: 'p1' }, { t: 1.4, pose: 'p2' }, { t: 1.6, pose: 'top' }, { t: 3.6, pose: 'hold' }, { t: 5.6, pose: 'top' },
  { t: 5.85, pose: 'p2' }, { t: 6.1, pose: 'p1' }, { t: 6.4, pose: 'sit' }, { t: 8.0, pose: 'sit' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const hp = Math.max(poses.hold.ch.hip_r.flex, poses.top.ch.hip_r.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(hp - 3), max: Math.ceil(hp + 3) };
const rep = CA.scan(ex, { butt: (W) => CA.minOf(W, BUT), legs: (W) => CA.minOf(W, LEGS), elbow: (W) => P.elbowAngle(W, 'r') });
const Wt = L.fk(poses.top, contacts), Ws = L.fk(poses.sit, contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `${B.deg(poses.sit.ch.hip_r.flex)}, legs on the mat`); set('Hip flexion', 'peak', `${B.deg(hp)}, legs level`);
set('Elbow', 'setup', `${B.deg(P.elbowAngle(Ws, 'r'))} (hands beside the hips)`); set('Elbow', 'peak', `${B.deg(P.elbowAngle(Wt, 'r'))} (locked)`);
set('Shoulder depression', 'setup', 'Neutral'); set('Shoulder depression', 'peak', `Clavicle elevation ${poses.top.ch.sc_r.elevate}° (rig limit -10°)`);
set('Clearance', 'setup', 'Buttocks and legs on the mat'); set('Clearance', 'peak', `Hips ${r1(CA.minOf(Wt, BUT))} cm, legs ${r1(CA.minOf(Wt, LEGS))} cm off the mat`);
set('Tempo', 'setup', 'Sit 1 s'); set('Tempo', 'peak', '0.6 s press, 4 s hold, 0.8 s lower, 1.6 s rest');
ex.exercise.reference.note = B.NOTE;
console.log(`L-sit: wrote ${L.write(ex)}  hands=${JSON.stringify(HT)} measure=${JSON.stringify(ex.checks.measure)}\n  ${JSON.stringify(rep)}`);
for (const n of Object.keys(poses)) { const W = L.fk(poses[n], contacts); console.log(`  ${n.padEnd(5)} y=${poses[n].root.pos[1]} butt=${r1(CA.minOf(W, BUT))} legs=${r1(CA.minOf(W, LEGS))} elbow=${r1(P.elbowAngle(W, 'r'))} sh=${JSON.stringify(poses[n].ch.shoulder_r)} wr=${JSON.stringify(poses[n].ch.wrist_r)}`); }
CA.guard('l-sit', rep, [CA.minOf(Wt, BUT) < 1.5 && 'hips do not clear the mat', CA.minOf(Wt, LEGS) < 1.5 && 'legs do not clear the mat']);
