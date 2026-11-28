// Hamstring Bridge (GymVisual #19374, page not readable; movement from the name): supine bridge with the heels planted well
// past the knees and the toes pulled up (foot pitched 35 degrees toes-up, resting on the heel), knees only slightly bent
// (about 45 degrees at the top). Dig the heels in and lift the pelvis until shoulders, hips and knees line up, squeeze, lower.
// Bilateral. The author-glute-bridge.js solve via b6-14 makeBridge (feet x chosen for the top knee angle); feet planted
// with leg contacts (heel on the floor, world-fixed toes-up feet), hands beside the hips (arm contacts).
const L = require('./lib');
const { R, V, Q, r1 } = L;
const H = require('./families/hips');
const Bf = require('./families/b4-floorpush');
const X = require('./families/b6-14');
const meta = require('./meta/hamstring-bridge.json');

const PITCH = -35, KNEE_TOP = 45;
const qR = H.footQ(PITCH, 0), rot = (s) => (s === 'r' ? qR : Q.mirrorZ(qR));
const ankleY = (s) => { const A = [0, 20, s === 'r' ? 10 : -10]; return +(20 - Bf.footMin(A, rot(s), s) + 0.03).toFixed(2); };  // heel just on the floor
const Bq = X.makeBridge({ kneeTop: KNEE_TOP, footRot: rot, ankleY });
const poses = { lie: Bq.poseAt(0), u25: Bq.poseAt(0.25), u50: Bq.poseAt(0.5), u75: Bq.poseAt(0.75), top: Bq.poseAt(1), squeeze: Bq.poseAt(1.03), d75: Bq.poseAt(0.75), d50: Bq.poseAt(0.5), d25: Bq.poseAt(0.25), touch: Bq.poseAt(0.03) };
const keyframes = [{ t: 0, pose: 'lie' }, { t: 0.8, pose: 'lie' }, { t: 1.2, pose: 'u25' }, { t: 1.6, pose: 'u50' }, { t: 1.95, pose: 'u75' }, { t: 2.3, pose: 'top' }, { t: 2.8, pose: 'squeeze' }, { t: 3.3, pose: 'top' },
  { t: 3.8, pose: 'd75' }, { t: 4.3, pose: 'd50' }, { t: 4.8, pose: 'd25' }, { t: 5.3, pose: 'touch' }, { t: 5.6, pose: 'lie' }, { t: 6.0, pose: 'lie' }];
X.wrapPoses(poses);
const ex = H.module_(meta, Bq.contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'] });
const Wl = L.fk(poses.lie, Bq.contacts), Wt = L.fk(poses.top, Bq.contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° (lying)`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° (line ${Math.round(Bq.lineAt(Wt))}°)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wl, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}° at the top`);
set('Ankle', 'setup', `Toes up ${-PITCH}° off the floor, heel down (ankle ≈${Math.round(H.dorsiOf(Wl, 'r'))}°)`); set('Ankle', 'peak', `Unchanged foot; ankle ≈${Math.round(H.dorsiOf(Wt, 'r'))}°`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm (+${r1(Wt.hip_r.p[1] - Wl.hip_r.p[1])} cm)`);
set('Tempo', 'setup', 'Lying 0.8 s'); set('Tempo', 'peak', '1.5 s up, 1.0 s squeeze, 2.0 s down, 0.7 s reset');
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'rootTravel', 2);
console.log(`Hamstring Bridge: feet x ${Bq.AX}, roll ${Bq.DP_TOP}°, ankle y ${ankleY('r')} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} travel ${pk.toFixed(1)}`);
X.finishChecks(ex, 'hamstring-bridge', rep);
