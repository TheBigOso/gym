// 3 Leg Dog Pose (GymVisual #588713): high plank -> down dog -> right leg up and back (hips square) -> down dog -> plank.
// Hands stay planted (hand contacts). The balls of both feet stay on the same spot: the feet roll from tucked toes
// (plank) to heels reaching down (dog) with FK legs solved so the toes pivot in place, then the leg contacts take over
// (weight 1) once the dog is reached. The right leg contact is released (weight 0) while the leg is lifted.
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const meta = require('./meta/three-leg-dog-pose.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const lerp = (a, b, s) => a + (b - a) * s;
const smooth = (u) => u * u * (3 - 2 * u);
const HEEL = 15;     // dog: heels about 5 cm off the floor (foot pitched 15° heel-up); keeps dorsiflexion near the 30° research peak
const KNEE_DOG = 4;  // soft standing knee (research 2.5° ± 5.7°)
const ELBOW = 5;     // straight, not locked
const ARM_TRUNK = 8; // arms nearly in line with the trunk, head between the upper arms (shoulder flexion ≈ 172°)
const SHIFT = 0;     // hips stay put as the leg lifts (pelvis level and square); a forward shift changed the arm line too much
const LIFT_HIP = 0;  // lifted leg in line with the trunk line (pelvis -> C7), hips square

const footQ = (phi) => Q.axis([0, 0, 1], -phi); // foot pitched phi° heel-up (0 = flat), toes along +X
const footPitch = (q) => { const f = Q.rot(q, [1, 0, 0]); return -Math.atan2(f[1], f[0]) / R.DEG; };
const TOE_OFF = rig.byId.toe_r.offset;
const legLen = (kf) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(kf * R.DEG)); };
const ankleFor = (toe, phi) => V.sub(toe, Q.rot(footQ(phi), TOE_OFF));

// ---- Start: high plank from the shared helper. Its hand contacts stay planted for the whole clip.
const { pose: plank0, contacts: handC } = L.POSES.plank();
const W0 = L.fk(plank0, handC);
const TOE = { r: W0.toe_r.p.slice(), l: W0.toe_l.p.slice() };
const PHI_PLANK = footPitch(W0.ankle_l.q);
const footRotDog = footQ(HEEL).map((v) => +v.toFixed(6));
const contacts = [...handC, Object.assign(L.legContact('r'), { handRot: footRotDog }), Object.assign(L.legContact('l'), { handRot: footRotDog })];
const ANK = { r: ankleFor(TOE.r, HEEL).map(r3), l: ankleFor(TOE.l, HEEL).map(r3) };
const WT = { r: plank0.ik.arm_r.target, l: plank0.ik.arm_l.target };
plank0.ik.leg_r = { target: ANK.r, weight: 0 };
plank0.ik.leg_l = { target: ANK.l, weight: 0 };

// FK leg: hip flex and ankle dorsi (knee bend prescribed) so the ankle sits at `ank` with the foot pitched `phi`
// (the toe then lands on TOE). The trunk solve already set the hip-to-ankle distance for this knee bend.
function solveLeg(pose, side, ank, phi, kneeF) {
  const set = (x) => { const q = clone(pose); q.ch[`hip_${side}`] = { flex: x[0], abd: 0, rot: 0 }; q.ch[`knee_${side}`] = { flex: r3(kneeF) }; q.ch[`ankle_${side}`] = { dorsi: x[1] }; return q; };
  const res = (x) => { const W = L.fk(set(x)); return [...V.sub(W[`ankle_${side}`].p, ank).map((v) => v * 4), (footPitch(W[`ankle_${side}`].q) - phi) * 0.5]; };
  const c = pose.ch;
  const sol = R.solveLM([c[`hip_${side}`]?.flex ?? 0, c[`ankle_${side}`]?.dorsi ?? 10], res, { iters: 400 });
  return set(sol.x.map(r3));
}
// Trunk: root x/y (and optionally pitch) so the elbows keep a 5° bend and the hip-to-ankle distance matches the knee bend.
function solveTrunk(pose, ank, kneeF, opt = {}) {
  const paths = opt.pitch ? ['root.pos.0', 'root.pos.1', 'root.rot.pitch'] : ['root.pos.0', 'root.pos.1'];
  if (opt.fixX) paths.shift();
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => L.setPathV(q, p, x[i])); return q; };
  const res = (x) => {
    const W = L.fk(set(x));
    const r = [(V.len(V.sub(W.hip_l.p, ank.l)) - legLen(kneeF)) * 3, (V.len(V.sub(W.shoulder_l.p, WT.l)) - L.reach(ELBOW)) * 3];
    if (opt.pitch) r.push((V.angle(V.sub(WT.l, W.shoulder_l.p), V.sub(W.neck_c7.p, W.pelvis.p)) - ARM_TRUNK) * 0.3);
    return r;
  };
  const sol = R.solveLM(paths.map((p) => L.getPath(pose, p)), res, { iters: 400 });
  return set(sol.x.map(r3));
}
const withLegs = (pose, phi, kneeF) => {
  let p = pose;
  for (const s of ['r', 'l']) p = solveLeg(p, s, ankleFor(TOE[s], phi), phi, kneeF);
  return p;
};
const setIK = (p, wR, wL) => { p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 }, leg_r: { target: ANK.r, weight: wR }, leg_l: { target: ANK.l, weight: wL } }; return p; };

// ---- Plank (s = 0) and down dog (s = 1).
const TRUNK = {
  plank: { pitch: plank0.root.rot.pitch, sc: [6, 0], neck: 0, sh: { plane: 90, elev: 72, axial: 0 } },
  dog: { sc: [9, 14], neck: 4, sh: { plane: 90, elev: 165, axial: 0 } },
};
const base = clone(plank0);
['hip_r', 'hip_l'].forEach((j) => { base.ch[j] = { flex: 0, abd: 0, rot: 0 }; });
const ankAt = (phi) => ({ r: ankleFor(TOE.r, phi), l: ankleFor(TOE.l, phi) });
function trunkPose(s, pitch) {
  const p = clone(base);
  p.root.rot.pitch = pitch;
  p.ch.sc_r = { protract: r3(lerp(TRUNK.plank.sc[0], TRUNK.dog.sc[0], s)), elevate: r3(lerp(TRUNK.plank.sc[1], TRUNK.dog.sc[1], s)) };
  p.ch.sc_l = clone(p.ch.sc_r);
  const nf = r3(lerp(TRUNK.plank.neck, TRUNK.dog.neck, s));
  p.ch.neck_c7 = { rot: 0, flex: r3(nf * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r3(nf * 0.6) };
  const sh = { plane: 90, elev: r3(lerp(TRUNK.plank.sh.elev, TRUNK.dog.sh.elev, s)), axial: 0 };
  p.ch.shoulder_r = clone(sh); p.ch.shoulder_l = clone(sh);
  return p;
}
// Dog: solve pitch too (arms nearly in line with the trunk).
let dog = solveTrunk(Object.assign(trunkPose(1, -125), { root: { pos: [-32, 68, 0], rot: { pitch: -125 } } }), ankAt(HEEL), KNEE_DOG, { pitch: true });
dog = withLegs(dog, HEEL, KNEE_DOG);
TRUNK.dog.pitch = dog.root.rot.pitch;
let plank = withLegs(solveTrunk(trunkPose(0, TRUNK.plank.pitch), ankAt(PHI_PLANK), 0), PHI_PLANK, 0);

// ---- Roll between plank and dog: eased keys; at each key the trunk is re-solved (arms 5°, legs reach) and
// the FK legs put the toes back on their spot with the foot pitch blended from tucked toes to heels-down.
const ROLL_N = 16;
function rollPose(s) {
  if (s <= 0) return plank; if (s >= 1) return dog;
  const phi = lerp(PHI_PLANK, HEEL, s), kf = lerp(0, KNEE_DOG, s);
  let p = trunkPose(s, r3(lerp(TRUNK.plank.pitch, TRUNK.dog.pitch, s)));
  p.root.pos = [lerp(plank.root.pos[0], dog.root.pos[0], s), lerp(plank.root.pos[1], dog.root.pos[1], s), 0];
  p = solveTrunk(p, ankAt(phi), kf);
  return withLegs(p, phi, kf);
}

// ---- Three-legged dog: hips drift forward a little, pelvis stays square, right leg in line with the trunk.
function liftPose(extraHip) {
  let p = clone(dog);
  p.root.pos[0] = r3(p.root.pos[0] + SHIFT);
  p = solveTrunk(p, ankAt(HEEL), KNEE_DOG, { pitch: false, fixX: true });
  // re-solve pitch with x fixed so the elbows keep their bend: use pitch + y
  const set = (x) => { const q = clone(p); q.root.pos[1] = x[0]; q.root.rot.pitch = x[1]; return q; };
  const res = (x) => { const W = L.fk(set(x)); return [(V.len(V.sub(W.hip_l.p, ANK.l)) - legLen(KNEE_DOG)) * 3, (V.len(V.sub(W.shoulder_l.p, WT.l)) - L.reach(ELBOW)) * 3]; };
  p = set(R.solveLM([p.root.pos[1], p.root.rot.pitch], res, { iters: 300 }).x.map(r3));
  p = solveLeg(p, 'l', ANK.l, HEEL, KNEE_DOG);
  // Right leg: thigh along the trunk line (pelvis -> C7 reversed) plus extraHip° of extension, knee straight,
  // ankle flexed (heel reaching back, toes toward the floor), a little internal rotation so the toes point down, not out.
  const set2 = (x) => { const q = clone(p); q.ch.hip_r = { flex: x[0], abd: 0, rot: 4 }; q.ch.knee_r = { flex: 1 }; q.ch.ankle_r = { dorsi: 6 }; return q; };
  const res2 = (x) => { const W = L.fk(set2(x)); const tr = V.sub(W.pelvis.p, W.neck_c7.p), th = V.sub(W.knee_r.p, W.hip_r.p); const a = Math.atan2(th[1], -th[0]) - Math.atan2(tr[1], -tr[0]); return [(a / R.DEG - extraHip) * 1]; };
  return set2(R.solveLM([LIFT_HIP], res2, { iters: 200 }).x.map(r3));
}
const lift = liftPose(LIFT_HIP), liftBreath = liftPose(LIFT_HIP + 3);
// Lift-off / landing keys: eased blend of every channel between dog and lift, standing leg re-solved.
function blendPose(a, b, s) {
  const fa = {}, fb = {};
  const flat = (o, out, pre) => { for (const k in o) { const v = o[k], p = pre ? `${pre}.${k}` : k; if (typeof v === 'number') out[p] = v; else if (Array.isArray(v)) v.forEach((x, i) => { out[`${p}.${i}`] = x; }); else if (v && typeof v === 'object') flat(v, out, p); } return out; };
  flat(a, fa, ''); flat(b, fb, '');
  const p = clone(a);
  for (const k in fa) if (k in fb && !k.startsWith('ik.')) L.setPathV(p, k, r3(lerp(fa[k], fb[k], s)));
  return solveLeg(p, 'l', ANK.l, HEEL, KNEE_DOG);
}
const U_OFF = 0.6 / 1.8; // lift-off key 0.6 s into the 1.8 s lift
const liftOff = blendPose(dog, lift, smooth(U_OFF));
const landing = blendPose(dog, lift, smooth(0.6 / 1.6)); // 0.6 s before dog over the 1.6 s lower (mirrors liftOff)

// ---- Assemble poses and keyframes.
const poses = { plank: setIK(plank, 0, 0), dog: setIK(clone(dog), 1, 1), dogFree: setIK(clone(dog), 0, 0), liftOff: setIK(liftOff, 0, 1), lift: setIK(lift, 0, 1), liftBreath: setIK(liftBreath, 0, 1), landing: setIK(landing, 0, 1) };
const keyframes = [{ t: 0, pose: 'plank' }, { t: 0.8, pose: 'plank' }];
for (let i = 1; i < ROLL_N; i++) { const u = i / ROLL_N, name = `roll${i}`; poses[name] = setIK(rollPose(smooth(u)), 0, 0); keyframes.push({ t: r3(0.8 + 2.0 * u), pose: name }); }
keyframes.push({ t: 2.8, pose: 'dogFree' }, { t: 3.2, pose: 'dog' }, { t: 3.6, pose: 'dog' }, { t: 4.2, pose: 'liftOff' }, { t: 5.4, pose: 'lift' }, { t: 6.5, pose: 'liftBreath' }, { t: 7.6, pose: 'lift' }, { t: 8.6, pose: 'landing' }, { t: 9.2, pose: 'dog' }, { t: 9.6, pose: 'dogFree' });
// Back to plank over 9.6 -> 11.4 through the same roll keys in reverse.
for (let i = ROLL_N - 1; i >= 1; i--) { const u = (ROLL_N - i) / ROLL_N; keyframes.push({ t: r3(9.6 + 1.8 * u), pose: `roll${i}` }); }
keyframes.push({ t: 11.4, pose: 'plank' }, { t: 12, pose: 'plank' });

const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
};

// ---- Report + kinematics table from the solved poses.
const ANKLE_REST = V.angle(V.scale(rig.byId.ankle_r.offset, -1), TOE_OFF);
function stats(name) {
  const p = poses[name], W = L.fk(p, contacts), m = R.measures(W);
  const dorsi = (s) => ANKLE_REST - V.angle(V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p));
  const kneeL = 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p));
  const trunk = V.sub(W.neck_c7.p, W.pelvis.p);
  const shFlex = 180 - V.angle(V.sub(W.wrist_l.p, W.shoulder_l.p), trunk);
  const thighL = V.sub(W.knee_l.p, W.hip_l.p), thighR = V.sub(W.knee_r.p, W.hip_r.p);
  return { name, hipL: p.ch.hip_l.flex, hipR: p.ch.hip_r.flex, trunkThighL: 180 - V.angle(trunk, thighL), trunkThighR: 180 - V.angle(trunk, thighR), dorsiL: dorsi('l'), dorsiR: dorsi('r'), kneeL, kneeR: m.knee, elbowL: m.elbowL, elbowR: m.elbowR, shFlex, pelvisY: W.pelvis.p[1], toeL: V.len(V.sub(W.toe_l.p, TOE.l)), toeR: V.len(V.sub(W.toe_r.p, TOE.r)), ankleRY: W.ankle_r.p[1], minY: L.shapeMinY(W) };
}
const S = Object.fromEntries(Object.keys(poses).map((n) => [n, stats(n)]));
const d = (v) => `≈${Math.round(v)}°`, kin = ex.exercise.kinematics;
kin[0].peak = `${d(S.dog.hipL)} at the hip joint, ${d(S.dog.trunkThighL)} trunk to thigh; unchanged with the leg up`;
kin[1].setup = `${d(S.plank.shFlex)} (plank, arms vertical)`; kin[1].peak = d(S.dog.shFlex);
kin[2].setup = `${d(S.plank.dorsiL)} (plank, on the balls of the feet)`; kin[2].peak = `${d(S.dog.dorsiL)} in dog and with the leg up; heels about 5 cm off the floor`;
kin[3].setup = `${d(S.dog.hipR)} flexion (dog)`; kin[3].peak = `${d(S.lift.hipR)} flexion at the hip joint = thigh in line with the trunk line (${d(S.liftBreath.hipR)} at the top of the breath); pelvis level`;
kin[4].peak = d(S.dog.kneeL);
kin[5].setup = `${d(S.plank.elbowL)}`; kin[5].peak = `${d(S.dog.elbowL)}`;
console.log(`3LD: plank pitch ${plank.root.rot.pitch} footPitch ${PHI_PLANK.toFixed(1)} | dog root ${JSON.stringify(dog.root)} | wrote ${L.write(ex)}`);
for (const s of Object.values(S)) console.log('  ' + Object.entries(s).map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : typeof v === 'object' ? v.y.toFixed(2) + v.id : v}`).join(' '));
// Timeline sweep: toe drift (both feet while on the floor), wrist drift, floor.
const tl = R.buildTimeline(ex);
let drift = { l: 0, r: 0, wr: 0 }, floor = { y: 1e9 };
for (let i = 0; i <= 1200; i++) {
  const t = (i / 1200) * 12, W = R.evalPose(rig, tl.pose(t), contacts);
  drift.l = Math.max(drift.l, V.len(V.sub(W.toe_l.p, TOE.l)));
  if (t < 3.6 || t > 9.2) drift.r = Math.max(drift.r, V.len(V.sub(W.toe_r.p, TOE.r)));
  drift.wr = Math.max(drift.wr, V.len(V.sub(W.wrist_r.p, WT.r)), V.len(V.sub(W.wrist_l.p, WT.l)));
  const f = L.shapeMinY(W); if (f.y < floor.y) floor = { y: f.y, id: f.id, t };
}
console.log('  sweep', JSON.stringify({ toeL: +drift.l.toFixed(3), toeR: +drift.r.toFixed(3), wrists: +drift.wr.toFixed(3), floor: +floor.y.toFixed(2), floorId: floor.id, floorT: +floor.t.toFixed(2) }));
