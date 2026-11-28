// Kneeling Pulse (GymVisual #10803; page not readable here, movement from the name and standard coaching): tall kneeling
// on a mat, knees hip width, toes tucked (planted shin/foot contacts from the b5-misc tall-kneel base), hands on the hips.
// The hips sit back toward the heels (thighs tip back about the knees, which stay on the mat; the trunk leans forward a
// little to balance), then pulse up and down a few centimetres near the bottom, squeezing the glutes, and finally drive
// forward and up to tall kneeling. Bilateral.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const M = require('./families/b5-misc');
const F = require('./families/b6-20');
const meta = require('./meta/kneeling-pulse.json');

const TK = M.tallKneel({ kneeY: 5.0, toePitch: 88, width: 10, thigh: 4, toe: 6 });
const contacts = TK.contacts, T = { r: TK.info.tR, l: TK.info.tL };
const tall0 = H.handsOnHips(TK.pose);
const W0 = L.fk(tall0, contacts);
const K = { r: W0.knee_r.p.slice(), l: W0.knee_l.p.slice() };
const TH = V.len(rig.byId.knee_r.offset);
// Thighs tipped back phi degrees from vertical about the (fixed) knees; trunk pitch `pitch` (negative = leaning forward)
function sit(phi, pitch, spineL5 = 0) {
  let p = clone(tall0);
  p.root.rot.pitch = r1(pitch);
  p.ch.spine_l5 = { rot: 0, latFlex: 0, flex: r1(spineL5) };
  const hipT = V.add(K.r, [-TH * Math.sin(phi * R.DEG), TH * Math.cos(phi * R.DEG), 0]);
  p = L.solvePose(p, ['root.pos.0', 'root.pos.1'], [(W) => [(W.hip_r.p[0] - hipT[0]) * 3, (W.hip_r.p[1] - hipT[1]) * 3]]).pose;
  p.ik = clone(tall0.ik);
  for (const s of ['r', 'l']) { p = H.fitLeg(p, s, contacts.find((c) => c.id === `leg_${s}`), T[s]); }
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  delete p.__cost;
  // neck keeps the eyes about level as the trunk leans
  p.ch.neck_c7 = { rot: 0, flex: r1(pitch * 0.35) }; p.ch.head_c1 = { rot: 0, flex: r1(pitch * 0.3) };
  return H.handsOnHips(p);
}
const PHI0 = TK.pose.root.rot.pitch;   // tall: as built
const tall = sit(4, 0), q1 = sit(9, -4), mid = sit(15, -9), q3 = sit(21, -14), low = sit(27, -19, 2), up = sit(19, -13, 1), upm = sit(23, -16, 1.5), low2 = sit(28, -20, 2);
const poses = { tall, q1, mid, q3, low, up, upm, low2 };
const keyframes = [['tall', 0], ['tall', 0.6], ['q1', 0.85], ['mid', 1.1], ['q3', 1.35], ['low', 1.6], ['upm', 1.8], ['up', 2.0], ['upm', 2.2], ['low', 2.4], ['upm', 2.6], ['up', 2.8], ['upm', 3.0], ['low2', 3.2], ['upm', 3.4], ['up', 3.6], ['upm', 3.8], ['low2', 4.0], ['upm', 4.2], ['up', 4.4], ['q3', 4.6], ['mid', 4.8], ['q1', 5.0], ['tall', 5.2], ['tall', 6.0]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, contacts, poses, keyframes);
const kneeAt = (p) => { const W = L.fk(p, contacts); return Math.max(H.kneeOf(W, 'r'), H.kneeOf(W, 'l')); };
const pk = Math.max(...Object.values(poses).map(kneeAt));
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

// the knees stay on the mat: IK places them from the hips and the planted shins, so they can drift a few mm sideways
const rep = F.report(ex, { kneeY: (W) => W.knee_r.p[1], kneeDrift: (W) => V.len(V.sub(W.knee_r.p, K.r)), knee: (W) => H.kneeOf(W, 'r'), seat: (W) => Math.min(F.bottomOf(W, 'buttock_r'), F.bottomOf(W, 'buttock_l')) - Math.max(W.ankle_r.p[1], W.ankle_l.p[1]), lean: (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) });
const Wt = L.fk(tall, contacts), Wl = L.fk(low2, contacts), Wu = L.fk(up, contacts);
F.setKin(ex, 'Knee flexion', `${F.deg(H.kneeOf(Wt, 'r'))} (tall kneeling)`, `${F.deg(H.kneeOf(Wl, 'r'))} at the bottom; buttocks ${Math.round(rep.seat[0])} cm above the heels`);
F.setKin(ex, 'Pulse', '–', `${F.deg(H.kneeOf(Wu, 'r'))} to ${F.deg(H.kneeOf(Wl, 'r'))} (hips move ${Math.round(V.len(V.sub(Wu.pelvis.p, Wl.pelvis.p)))} cm)`);
F.setKin(ex, 'Trunk lean', `${F.deg(V.angle(V.sub(Wt.neck_c7.p, Wt.pelvis.p), [0, 1, 0]))} (upright)`, `${F.deg(V.angle(V.sub(Wl.neck_c7.p, Wl.pelvis.p), [0, 1, 0]))} forward at the bottom`);
F.setKin(ex, 'Tempo', 'Tall 0.6 s', '1 s sit back, 7 pulses of 0.4 s, 0.8 s rise');
console.log(`Kneeling Pulse: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
F.CA.guard('kneeling-pulse', rep, [rep.kneeDrift[1] > 2 && `knees slide on the mat (${rep.kneeDrift[1]} cm)`, rep.seat[0] < 3 && `buttocks reach the heels (${rep.seat[0]})`]);
if (process.env.DBG) for (const k in poses) { const W = L.fk(poses[k], contacts); console.log(k, r1(V.len(V.sub(W.knee_r.p, K.r)) * 100) / 100, W.knee_r.p.map(r1), r1(V.len(V.sub(W.hip_r.p, K.r)))); }
