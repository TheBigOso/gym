// Dead Bug (GymVisual #027612). Bilateral: supine, low back flat, arms straight up over the shoulders, hips and knees at
// 90 degrees (tabletop). The right arm reaches overhead while the left leg straightens toward the floor, both stopping just
// above the mat; return; then the left arm and right leg. No planted contacts: the pelvis and trunk stay still on the mat.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const C = require('./families/core-b');
const meta = require('./meta/dead-bug.json');

/* ---------------- Lying base: flat low back, head on the mat ---------------- */
let base = C.lie({ kneeFlex: 90, spine: { l5: 3, t12: 2, t6: 4 }, pitch: 93 });
base = C.headDown(base, 0.2);
const P = base.root.rot.pitch;

// Arms straight up: wrist directly above the shoulder (world vertical), palms facing each other.
function armUp(pose, s, elbow = 4) {
  const p = clone(pose);
  p.ch[`elbow_${s}`] = { flex: elbow }; p.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 };
  p.ch[`shoulder_${s}`] = { plane: 90, elev: 90, axial: 0 };
  return L.solvePose(p, [`ch.shoulder_${s}.elev`], [(W) => [(W[`wrist_${s}`].p[0] - W[`shoulder_${s}`].p[0]) * 2]]).pose;
}
// Arm overhead, beside the ear, the hand hovering `hover` cm above the mat.
function armOver(pose, s, hover = 4) {
  const p = clone(pose);
  p.ch[`elbow_${s}`] = { flex: 6 }; p.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 };
  p.ch[`shoulder_${s}`] = { plane: 90, elev: 160, axial: 0 };
  const ids = (s === 'r' ? C.ARM_R : C.ARM_L);
  return L.solvePose(p, [`ch.shoulder_${s}.elev`], [(W) => [(Math.min(...ids.map((id) => C.bottomOf(W, id))) - hover) * 2]]).pose;
}
// Tabletop leg: thigh vertical, shin level.
function legTable(pose, s) {
  const p = clone(pose);
  p.ch[`hip_${s}`] = { flex: 90, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: 90 }; p.ch[`ankle_${s}`] = { dorsi: -12 };
  return L.solvePose(p, [`ch.hip_${s}.flex`, `ch.knee_${s}.flex`], [(W) => [(W[`knee_${s}`].p[0] - W[`hip_${s}`].p[0]) * 2, (W[`ankle_${s}`].p[1] - W[`knee_${s}`].p[1]) * 2]]).pose;
}
// Lowered leg: knee almost straight, heel hovering `hover` cm above the mat.
function legLow(pose, s, hover = 9, knee = 6) {
  const p = clone(pose);
  p.ch[`hip_${s}`] = { flex: 20, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi: -18 };
  const ids = (s === 'r' ? C.LEG_R : C.LEG_L).filter((id) => !/thigh|quad/.test(id));
  return L.solvePose(p, [`ch.hip_${s}.flex`], [(W) => [(Math.min(...ids.map((id) => C.bottomOf(W, id))) - hover) * 2]]).pose;
}
let top = armUp(armUp(legTable(legTable(base, 'r'), 'l'), 'r'), 'l');
// Reach A: right arm overhead, left leg long. Hold: a touch further (exhale).
const reachA = armOver(legLow(top, 'l', 9), 'r', 4);
const holdA = armOver(legLow(top, 'l', 7.5, 4), 'r', 3);
const poses = { top, reachA, holdA, reachB: C.mirror(reachA), holdB: C.mirror(holdA) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 2.0, pose: 'reachA' }, { t: 2.6, pose: 'holdA' }, { t: 3.8, pose: 'top' }, { t: 4.2, pose: 'top' },
  { t: 5.4, pose: 'reachB' }, { t: 6.0, pose: 'holdB' }, { t: 7.2, pose: 'top' }, { t: 8.0, pose: 'top' }];
const ex = C.moduleOf(meta, poses, keyframes, []);
const hipBand = [top.ch.hip_r.flex, top.ch.hip_l.flex];
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.max(...hipBand)) - 3, max: Math.ceil(Math.max(...hipBand)) + 3 };

const rep = C.scan(ex, { still: ['pelvis'] });
const Wt = L.fk(top), Wh = L.fk(holdA), Wr = L.fk(reachA);
const heel = (W, s) => Math.min(C.bottomOf(W, `foot_${s}`), C.bottomOf(W, `calf_${s}`), C.bottomOf(W, `shank_${s}`));
const hand = (W, s) => Math.min(...(s === 'r' ? C.ARM_R : C.ARM_L).map((id) => C.bottomOf(W, id)));
Object.assign(rep, { pitch: P, spine: [base.ch.spine_l5.flex, base.ch.spine_t12.flex, base.ch.spine_t6.flex], tabletop: { hip: top.ch.hip_r.flex, knee: r1(C.kneeOf(Wt, 'r')), shoulder: top.ch.shoulder_r.elev },
  reach: { hip: reachA.ch.hip_l.flex, knee: r1(C.kneeOf(Wr, 'l')), heel: r1(heel(Wr, 'l')), shoulder: reachA.ch.shoulder_r.elev, hand: r1(hand(Wr, 'r')) },
  hold: { hip: holdA.ch.hip_l.flex, heel: r1(heel(Wh, 'l')), shoulder: holdA.ch.shoulder_r.elev, hand: r1(hand(Wh, 'r')) }, measure: ex.checks.measure });
const thighW = (W, s) => Math.atan2(W[`knee_${s}`].p[1] - W[`hip_${s}`].p[1], W[`knee_${s}`].p[0] - W[`hip_${s}`].p[0]) / R.DEG;
C.setKin(ex, 'Tabletop', `Hip ${C.deg(top.ch.hip_r.flex)} (thigh ${C.deg(thighW(Wt, 'r'))} from the floor), knee ${C.deg(C.kneeOf(Wt, 'r'))}`, 'The other leg stays in tabletop');
C.setKin(ex, 'Lowered leg', 'Tabletop', `Hip ${C.deg(holdA.ch.hip_l.flex)}, knee ${C.deg(C.kneeOf(Wh, 'l'))}, heel ${Math.round(heel(Wh, 'l'))} cm above the mat`);
C.setKin(ex, 'Reaching arm', `Shoulder flexion ${C.deg(top.ch.shoulder_r.elev)} (arm vertical)`, `${C.deg(holdA.ch.shoulder_r.elev)} overhead, hand ${Math.round(hand(Wh, 'r'))} cm above the mat`);
C.setKin(ex, 'Low back', `Lumbar segment ${C.deg(base.ch.spine_l5.flex)} (flat)`, 'Unchanged: pelvis and trunk do not move');
C.setKin(ex, 'Tempo', 'Tabletop 0.8 s', '1.2 s reach, 0.6 s pause, 1.2 s return, per side; 8 s loop');
C.finish(ex, rep, 'Dead Bug');
