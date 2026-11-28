// Band Clamshell (GymVisual #487012, Hip Clam Shell, with the usual mini band around the thighs just above the knees):
// lying on the left side on a mat, head on the outstretched left arm, right hand on the floor in front of the chest
// (planted contact), hips flexed about 45 degrees and knees about 90 degrees with the knees and feet stacked. Keeping the
// feet together and the pelvis stacked, the top (right) knee opens against the band about 40 degrees around the hip-ankle
// axis (hip abduction with external rotation), pauses, and closes slowly. Authored on the right (top) leg.
// Gear: GA.bandLoop (src/gear/attach.js band loop prop, moving cuffs and strands around both knees).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const GA = require('./families/gear-attach');
const meta = require('./meta/band-clamshell.json');

const ROT = { yaw: -90, roll: -90 }; // head toward +X, front of the body toward +Z, right side up
const zero = () => ({ rot: 0, flex: 0, latFlex: 0 });
const HF = 45, KF = 90, OPEN = 40;
function body() {
  return { root: { pos: [0, 20, 0], rot: { ...ROT } }, ch: {
    spine_l5: zero(), spine_t12: zero(), spine_t6: zero(), neck_c7: { rot: 0, flex: 4, latFlex: -12 }, head_c1: { rot: 0, flex: 4, latFlex: -10 },
    sc_r: { protract: 8, elevate: 0 }, sc_l: { protract: 0, elevate: 12 },
    shoulder_l: { plane: 80, elev: 168, axial: 0 }, elbow_l: { flex: 12 }, wrist_l: { pron: 0, flex: 0, dev: 0 },
    shoulder_r: { plane: 60, elev: 40, axial: 0 }, elbow_r: { flex: 40 }, wrist_r: { pron: 0, flex: 0, dev: 0 },
    hip_l: { flex: HF, abd: 0, rot: 0 }, knee_l: { flex: KF }, ankle_l: { dorsi: -10 },
    hip_r: { flex: HF, abd: 0, rot: 0 }, knee_r: { flex: KF }, ankle_r: { dorsi: -10 } } };
}
// resting on the mat: pelvis, bottom shoulder, outer thigh, knee and shin of the bottom leg
const base = L.solvePose(body(), ['root.pos.1', 'ch.spine_l5.latFlex', 'ch.spine_t12.latFlex', 'ch.spine_t6.latFlex', 'ch.hip_l.abd', 'ch.hip_l.rot'], [
  (W) => [(H.bottomOf(W, 'pelvis') - 0.6) * 3, H.bottomOf(W, 'deltoid_l') * 3, (H.bottomOf(W, 'thigh_l') - 0.3) * 2, (H.bottomOf(W, 'shank_l') - 0.3) * 2, Math.min(0, H.bottomOf(W, 'foot_l')) * 4,
    ...['ribcage', 'chest', 'abdomen', 'buttock_l', 'upperarm_l', 'hand_l', 'forearm_l', 'thigh_l', 'shank_l', 'foot_l', 'pelvis'].map((id) => Math.min(0, H.bottomOf(W, id) - 0.1) * 20)],
  L.obj.reg('ch.spine_l5.latFlex', 0, 0.05), L.obj.reg('ch.spine_t12.latFlex', 0, 0.05), L.obj.reg('ch.spine_t6.latFlex', 0, 0.05), L.obj.reg('ch.hip_l.rot', 0, 0.1)], { iters: 400 }).pose;
const Wb = L.fk(base);
const up = V.norm(V.sub(Wb.hip_r.p, Wb.hip_l.p)); // pelvis axis (points to the ceiling)
// top leg closed: knee and ankle stacked on the bottom ones (one limb thickness up)
const K_CLOSED = V.add(Wb.knee_l.p, V.scale(up, 2 * GA.limbR('thigh', 1) + 0.6)), A_TOP = V.add(Wb.ankle_l.p, V.scale(up, 2 * GA.limbR('shank', 1) + 0.6));
const closed = F.legTo(base, 'r', { knee: K_CLOSED, ankle: A_TOP }); delete closed.__cost;
const HAND_R = [r1(Wb.spine_t12.p[0] + 6), 2.7, r1(Wb.shoulder_r.p[2] + 4)];
const contacts = [H.handC('r', [-0.3, 1, 0.6])];
const Wc = L.fk(closed);
function poseAt(f) { // f: 0 = knees together, 1 = open OPEN degrees about the hip-ankle axis
  let p = clone(closed);
  if (f > 0.001) {
    const ax = V.norm(V.sub(A_TOP, Wc.hip_r.p)), kq = Q.axis(ax, OPEN * f * Math.sign(V.dot(V.cross(ax, V.sub(Wc.knee_r.p, Wc.hip_r.p)), up) || 1));
    let kn = V.add(Wc.hip_r.p, Q.rot(kq, V.sub(Wc.knee_r.p, Wc.hip_r.p)));
    if (kn[1] < Wc.knee_r.p[1]) kn = V.add(Wc.hip_r.p, Q.rot(Q.axis(ax, -OPEN * f), V.sub(Wc.knee_r.p, Wc.hip_r.p))); // open toward the ceiling
    p = F.legTo(p, 'r', { knee: kn, ankle: A_TOP }); delete p.__cost;
  }
  p.ik = { arm_r: { target: HAND_R.slice(), weight: 1 } };
  p = H.fitArm(p, 'r', contacts[0], HAND_R, [{ shoulder_r: { plane: 60, elev: 40, axial: 0 }, elbow_r: { flex: 40 }, wrist_r: { pron: 0, flex: -60, dev: 0 } }]); delete p.__cost;
  return p;
}
const e = F.easeIO;
const poses = { rest: poseAt(0), o25: poseAt(e(0.25)), o50: poseAt(0.5), o75: poseAt(e(0.75)), top: poseAt(1), hold: poseAt(1.03), c70: poseAt(e(0.7)), c40: poseAt(e(0.4)), c15: poseAt(e(0.15)), touch: poseAt(0.02) };
F.wrapAll ? F.wrapAll(poses) : null;
const keyframes = [{ t: 0, pose: 'rest' }, { t: 0.8, pose: 'rest' }, { t: 1.1, pose: 'o25' }, { t: 1.4, pose: 'o50' }, { t: 1.7, pose: 'o75' }, { t: 2.0, pose: 'top' }, { t: 2.3, pose: 'hold' }, { t: 2.6, pose: 'top' },
  { t: 3.1, pose: 'c70' }, { t: 3.6, pose: 'c40' }, { t: 4.0, pose: 'c15' }, { t: 4.3, pose: 'touch' }, { t: 4.6, pose: 'rest' }, { t: 5.0, pose: 'rest' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'knees', id: 'miniband' });
ex.props = ex.props.concat([band]);
let feet = 0, gap = [1e9, -1e9], clr = 1e9, kneeTouch = 1e9;
const rep = H.loopReport(ex, { planted: ['arm_r'], probe: (W) => {
  feet = Math.max(feet, V.len(V.sub(W.ankle_r.p, A_TOP))); const b = GA.bandLoopAt(W, band); gap = [Math.min(gap[0], b.gap), Math.max(gap[1], b.gap)]; clr = Math.min(clr, b.clear);
  kneeTouch = Math.min(kneeTouch, V.len(V.sub(W.knee_r.p, W.knee_l.p)) - 2 * GA.limbR('thigh', 1)); } });
const Wr = L.fk(poses.rest, contacts), Wt = L.fk(poses.top, contacts);
const low = {}; for (const id of ['pelvis', 'deltoid_l', 'thigh_l', 'shank_l', 'foot_l', 'head', 'hand_r']) low[id] = +H.bottomOf(Wr, id).toFixed(1);
const set = H.setKin(ex);
set('Top hip (clam)', 'setup', 'Knees together, feet stacked'); set('Top hip (clam)', 'peak', `Top knee opens ${OPEN}° about the hip-ankle axis (hip abd ${poses.top.ch.hip_r.abd}°, rot ${poses.top.ch.hip_r.rot}°)`);
set('Knees and feet', 'setup', `Hips ≈${HF}°, knees ≈${Math.round(H.kneeOf(Wr, 'l'))}°`); set('Knees and feet', 'peak', `Feet stay together (drift ${feet.toFixed(1)} cm)`);
set('Band', 'setup', `Around both thighs just above the knees (legs ${gap[0].toFixed(0)} cm apart)`); set('Band', 'peak', `Stretched to ${gap[1].toFixed(0)} cm between the thighs`);
set('Tempo', 'setup', 'Rest 0.8 s'); set('Tempo', 'peak', '1.2 s open, 0.6 s hold, 1.7 s close');
const kneeLift = Wt.knee_r.p[1] - Wr.knee_r.p[1];
console.log(`Band Clamshell: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} lowest ${JSON.stringify(low)} feet drift ${feet.toFixed(2)} band gap ${gap.map(r1)} clear ${clr.toFixed(1)} kneeTouch ${kneeTouch.toFixed(1)} kneeLift ${kneeLift.toFixed(1)}`);
console.log('  hipR', JSON.stringify([poses.rest.ch.hip_r, poses.top.ch.hip_r]), 'hipL', JSON.stringify(poses.rest.ch.hip_l), 'root', JSON.stringify(base.root));
if (rep.slide > 0.05) { console.error('FAIL: planted hand slides'); process.exitCode = 1; }
if (feet > 1.5) { console.error('FAIL: feet separate'); process.exitCode = 1; }
