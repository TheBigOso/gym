// Hip Abduction, side-lying (GymVisual #218012, standard body-weight form): lying on the left side on a mat, head resting on
// the outstretched left arm, right hand on the floor in front of the chest (planted contact), hips stacked, legs straight in
// line with the trunk. The top (right) leg lifts straight to about 40 degrees of abduction with the toes forward and the hip
// slightly extended, pauses, and lowers more slowly. Authored on the right (top) leg.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const meta = require('./meta/hip-abduction.json');

// Root orientation: head toward +X, front of the body toward +Z, right side up (yaw -90 after roll -90)
const ROT = { yaw: -90, roll: -90 };
const zero = () => ({ rot: 0, flex: 0, latFlex: 0 });
const ABD_TOP = 40;
function body() {
  const p = { root: { pos: [0, 20, 0], rot: { ...ROT } }, ch: {
    spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 4, latFlex: -12 }, head_c1: { rot: 0, flex: 4, latFlex: -10 },
    sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 0, elevate: 12 },
    // bottom arm reaches overhead along the floor under the head
    shoulder_l: { plane: 80, elev: 168, axial: 0 }, elbow_l: { flex: 12 }, wrist_l: { pron: 0, flex: 0, dev: 0 },
    shoulder_r: { plane: 60, elev: 40, axial: 0 }, elbow_r: { flex: 40 }, wrist_r: { pron: 0, flex: 0, dev: 0 },
    hip_l: { flex: 4, abd: 0, rot: 0 }, knee_l: { flex: 6 }, ankle_l: { dorsi: -12 },
    hip_r: { flex: -4, abd: 0, rot: 0 }, knee_r: { flex: 2 }, ankle_r: { dorsi: -10 } } };
  return p;
}
// Lowest body point on the mat (shapes): root height by grounding, arms and head excluded from nothing
// The waist sags toward the mat: lateral spine bend and the bottom hip adducted/abducted so the pelvis, the shoulder and the
// bottom leg all rest on the mat (the shoulder alone would otherwise prop the body up)
const base = L.solvePose(body(), ['root.pos.1', 'ch.spine_l5.latFlex', 'ch.spine_t12.latFlex', 'ch.spine_t6.latFlex', 'ch.hip_l.abd', 'ch.hip_l.flex'], [
  (W) => [(H.bottomOf(W, 'pelvis') - 0.6) * 3, H.bottomOf(W, 'deltoid_l') * 3, (H.bottomOf(W, 'thigh_l') - 0.4) * 2, Math.min(0, H.bottomOf(W, 'thigh_l') - 0.1) * 8, (H.bottomOf(W, 'shank_l') - 0.6) * 2, Math.min(0, H.bottomOf(W, 'foot_l')) * 4,
    ...['ribcage', 'chest', 'abdomen', 'buttock_l', 'upperarm_l', 'hand_l', 'forearm_l'].map((id) => Math.min(0, H.bottomOf(W, id)) * 4)],
  L.obj.reg('ch.spine_l5.latFlex', 0, 0.05), L.obj.reg('ch.spine_t12.latFlex', 0, 0.05), L.obj.reg('ch.spine_t6.latFlex', 0, 0.05), L.obj.reg('ch.hip_l.flex', 4, 0.1)], { iters: 400 }).pose;
const Wb = L.fk(base);
// Resting top leg: adducted until the right ankle lies on the left one (one shin thickness above it)
const ABD_REST = (() => { let a = -25, b = 10; for (let i = 0; i < 40; i++) { const m = (a + b) / 2, p = clone(base); p.ch.hip_r.abd = m; const W = L.fk(p); if (W.ankle_r.p[1] - W.ankle_l.p[1] > 7) b = m; else a = m; } return r1((a + b) / 2); })();
// Right hand planted on the floor in front of the chest, palm down, fingers toward the head
const HAND_R = [r1(Wb.spine_t12.p[0] + 6), 2.7, r1(Wb.shoulder_r.p[2] + 2)];
const contacts = [H.handC('r', [-0.3, 1, 0.6])];
function poseAt(f) { // f: 0 = legs stacked, 1 = top leg at ABD_TOP
  let p = clone(base);
  p.ch.hip_r = { flex: r1(-4 - 4 * f), abd: r1(ABD_REST + (ABD_TOP - ABD_REST) * f), rot: 0 };
  p.ik = { arm_r: { target: HAND_R.slice(), weight: 1 } };
  p = H.fitArm(p, 'r', contacts[0], HAND_R, [{ shoulder_r: { plane: 60, elev: 40, axial: 0 }, elbow_r: { flex: 40 }, wrist_r: { pron: 0, flex: -60, dev: 0 } }]); delete p.__cost;
  return p;
}
const poses = { rest: poseAt(0), u25: poseAt(0.25), u50: poseAt(0.5), u75: poseAt(0.75), top: poseAt(1), hold: poseAt(1.02), d70: poseAt(0.7), d40: poseAt(0.4), d15: poseAt(0.15), touch: poseAt(0.02) };
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.8, pose: 'rest' }, { t: 1.1, pose: 'u25' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.25, pose: 'hold' }, { t: 2.5, pose: 'top' },
  { t: 3.0, pose: 'd70' }, { t: 3.5, pose: 'd40' }, { t: 3.9, pose: 'd15' }, { t: 4.2, pose: 'touch' }, { t: 4.5, pose: 'rest' }, { t: 5.0, pose: 'rest' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['arm_r'] });
const Wt = L.fk(poses.top, contacts), Wr = L.fk(poses.rest, contacts);
// geometric abduction: angle of the top thigh from the bottom thigh in the frontal plane
const legAngle = (W) => { const a = V.sub(W.knee_r.p, W.hip_r.p), b = V.sub(W.knee_l.p, W.hip_l.p); return Math.atan2(a[1], Math.hypot(a[0], a[2])) / R.DEG - Math.atan2(b[1], Math.hypot(b[0], b[2])) / R.DEG; };
const low = {}; for (const id of ['pelvis', 'deltoid_l', 'upperarm_l', 'head', 'hair', 'thigh_l', 'shank_l', 'foot_l', 'ribcage', 'chest', 'hand_r']) low[id] = +H.bottomOf(Wr, id).toFixed(1);
const set = H.setKin(ex);
set('Hip abduction', 'setup', `≈${ABD_REST}° (legs stacked, top leg resting)`); set('Hip abduction', 'peak', `≈${poses.top.ch.hip_r.abd}° (joint channel); thigh ≈${Math.round(legAngle(Wt))}° above the bottom leg`);
set('Hip flexion', 'setup', `≈${poses.rest.ch.hip_r.flex}°`); set('Hip flexion', 'peak', `≈${poses.top.ch.hip_r.flex}° (slightly behind the body line)`);
set('Hip rotation', 'setup', '0° (toes forward)'); set('Hip rotation', 'peak', '0° (toes forward)');
set('Bottom leg', 'setup', `Straight (knee ≈${Math.round(H.kneeOf(Wr, 'l'))}°)`); set('Bottom leg', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Rest 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s hold, 1.7 s down');
console.log(`Hip Abduction: root ${JSON.stringify(base.root)} hand ${HAND_R} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} lowest ${JSON.stringify(low)} legAngle ${r1(legAngle(Wt))}`);
console.log('  arm', JSON.stringify([poses.rest.ch.shoulder_r, poses.rest.ch.elbow_r, poses.rest.ch.wrist_r]));
if (rep.slide > 0.05) { console.error('FAIL: planted hand slides'); process.exitCode = 1; }
