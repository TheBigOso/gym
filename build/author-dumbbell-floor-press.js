// Dumbbell Floor Press (GymVisual #366812): lying on the mat, knees bent and feet flat (planted leg contacts), a dumbbell in
// each hand (handle grip, palms toward the feet). From straight arms over the chest the dumbbells lower with the elbows about
// 45 degrees from the trunk and the forearms vertical until the backs of the upper arms rest on the floor, pause, then press
// up and slightly in. Bilateral (single: right arm only, the free left arm resting on the floor out to the side, planted).
// The bottom depth is solved so the arm shapes rest on the floor (rig v2 shapes match the drawn arm). Families b4-floorpush.js (floor lying, sweep) and
// b3-chest.js (press path with the forearm stacked under the dumbbell).
const L = require('./lib');
const { V, r1, clone } = L;
const B = require('./families/b4-floorpush');
const C = require('./families/b3-chest');
const H = require('./families/hips');
const CA = require('./families/core-a');
module.exports = function floorPress(meta, { single = false, flare = 45, label }) {
  const T = C.phaseT(meta), { base: b0, contacts: legC, foot } = B.lieFloor();
  let base = b0, contacts = legC.slice();
  if (single) { // free left arm on the floor, about 40 degrees out from the side, palm down (planted hand contact)
    const hc = CA.handContacts().find((c) => c.id === 'arm_l');
    const tg = CA.handTargets(base, { abd: 40, flex: 12, wristY: 2.6 });
    base = CA.fitArm(base, 'l', tg.l, [hc]); base.ik = Object.assign(base.ik, { arm_l: { target: tg.l, weight: 1 } });
    contacts = contacts.concat([hc]);
  }
  const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = V.scale(F.w, -1);
  const topTilt = single ? [0.02, 1, 0.02] : [0.03, 1, 0.12];
  const bottomAt = (dip) => C.pressPath(base, { flare, dip, topDir: topTilt, ax, n: 1 })[0].pose;
  const DIP = r1(B.bisect((dip) => B.armMinY(L.fk(bottomAt(dip), contacts)) - 0.05, 0, 35));
  const fin = (p) => { const q = C.strip(p); if (!single) C.mirrorArm(q); else { for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) q.ch[j] = clone(base.ch[j]); } return q; };
  const path = C.pressPath(base, { flare, dip: DIP, topDir: topTilt, ax, n: 6 }).map((k) => ({ f: k.f, pose: fin(k.pose) }));
  const settle = fin(C.pressPath(base, { flare, dip: DIP - 1.2, topDir: topTilt, ax, n: 1 })[0].pose);
  const { poses, keyframes } = C.repKeys(path, T, settle);
  for (const p of Object.values(poses)) p.ik = clone(base.ik);
  const ex = H.module_(meta, contacts, poses, keyframes);
  const grips = single ? [{ side: 'r', grip: 'handle' }] : [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }];
  const sw = B.floorSweep(ex, { grips });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  const dbT = C.dbAt(Wt, 'r'), dbB = C.dbAt(Wb, 'r');
  set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (arm straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} with the upper arm on the floor`);
  set('Elbow flare', 'setup', 'Arm vertical over the shoulder'); set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom`);
  set('Range of motion', 'setup', `Dumbbell centre ${r1(dbT.c[1])} cm above the floor at the top`); set('Range of motion', 'peak', `${r1(dbB.c[1])} cm at the bottom: ${r1(dbT.c[1] - dbB.c[1])} cm of travel; upper arm ${d(C.armDip(Wb))} below the back plane`);
  set('Upper arm on the floor', 'setup', '–'); set('Upper arm on the floor', 'peak', `Arm shapes ${r1(B.armMinY(Wb))} cm above the floor (resting)`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause on the floor, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
  if (single) { const Wl = L.fk(poses.top, contacts); set('Free arm', 'setup', `Left arm on the floor, about 40° out from the side, palm down`); set('Free arm', 'peak', `Unchanged (hand planted); dumbbell centre ${r1(dbB.c[2] - Wl.shoulder_r.p[2])} cm outside the shoulder at the bottom`); }
  const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
  console.log(`${label}: wrote ${L.write(ex)}\n  dip ${DIP} top elbow ${C.elbowFlexOf(Wt).toFixed(0)} bottom elbow ${C.elbowFlexOf(Wb).toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} trunk ${tf.toFixed(1)} knee ${H.kneeOf(W0, 'r').toFixed(0)}\n  sweep ${JSON.stringify(sw)}`);
  if (sw.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
  if (sw.floor < -0.5 || sw.dbFloor < 0 || sw.dbBody > 0.5 || (sw.dbGap && sw.dbGap[0] < 1)) { console.error('FAIL: floor or dumbbell collision'); process.exitCode = 1; }
  return ex;
};
if (require.main === module) module.exports(require('./meta/dumbbell-floor-press.json'), { label: 'Dumbbell Floor Press' });
