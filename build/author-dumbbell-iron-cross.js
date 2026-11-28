// Dumbbell Iron Cross (GymVisual 5042; movement reference only, the page could not be read, so the movement follows the
// name and standard coaching): feet about hip width (planted leg contacts), a dumbbell in each hand held together in
// front at shoulder height on long arms (neutral grip, thumbs up, elbows soft). From a quarter squat, drive up to
// standing while both arms sweep out in a horizontal arc to a T at shoulder height (the "iron cross"), hold, then bring
// the dumbbells back together in front as you sink back into the quarter squat. The arms stay at shoulder height the
// whole time; only the horizontal angle changes. Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const G = require('./families/b6-07');
const meta = require('./meta/dumbbell-iron-cross.json');

const ID = 'dumbbell-iron-cross';
const KNEE_SQ = 42, KNEE_UP = 6, ELEV = 86, FLEX = 12, HAND_Z = 11.5; // HAND_Z: wrist half-gap in front (dumbbells side by side)
// plane (deg) that puts the wrist at z = HAND_Z for a given shoulder
const planeFront = (pose) => { const S = L.fk(pose).shoulder_r.p, h = L.reach(FLEX) * Math.sin(ELEV * G.D2R); return Math.acos(Math.max(-1, Math.min(1, (HAND_Z - S[2]) / h))) / G.D2R; };
// key: u = 0 (front, quarter squat) .. 1 (T, standing)
function key(u) {
  const knee = KNEE_SQ + (KNEE_UP - KNEE_SQ) * u;
  const b = G.standAt(knee, { stance: 12, lean: 8 * (1 - u), sc: { protract: r1(6 - 12 * u), elevate: r1(2 + 2 * u) } });
  const p0 = planeFront(b.pose), plane = p0 + (-4 - p0) * u;
  const pr = plane * G.D2R, palm = [Math.cos(pr), 0, -Math.sin(pr)]; // thumbs up, palms facing the way back to the front
  return { b, spec: { dir: G.dirOf(plane, ELEV), flex: FLEX, palm }, plane };
}
const U = { sq: 0, o1: 0.2, o2: 0.4, o3: 0.6, o4: 0.8, T: 1 };
const poses = {}, err = {};
let g = { plane: 100, elev: 86, axial: -10, flex: FLEX, pron: 90 }, base = null, info = {};
for (const [n, u] of Object.entries(U)) {
  const k = key(u); base = base || k.b;
  const q = G.armDirKey(k.b.pose, k.spec, g);
  err[n] = q.__err; g = F.armGuess(q); poses[n] = F.mirrorArm(q); info[n] = r1(k.plane);
}
poses.hold = clone(poses.T); poses.sqHold = clone(poses.sq);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'sq' }, ...G.timesEven(ph.rise.start, ph.rise.end, ['sq', 'o1', 'o2', 'o3', 'o4', 'T']), { t: ph.hold.end, pose: 'hold' },
  ...G.timesEven(ph.lower.start, ph.lower.end, ['hold', 'o4', 'o3', 'o2', 'o1', 'sqHold']).slice(1), { t: D, pose: 'sq' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = F.scan(ex);
F.gate(ID, rep);
const Ws = L.fk(poses.sq, base.contacts), Wt = L.fk(poses.T, base.contacts), set = H.setKin(ex);
const hz = (W) => { const u = V.sub(W.wrist_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / G.D2R; }; // 90 = straight ahead, 0 = out to the side
set('Knee flexion', 'setup', `${G.deg(H.kneeOf(Ws, 'r'))} (quarter squat)`); set('Knee flexion', 'peak', `${G.deg(H.kneeOf(Wt, 'r'))} (standing)`);
set('Horizontal arm angle', 'setup', `Arms ${G.deg(hz(Ws))} from the side (dumbbells together in front, ${Math.round(2 * Ws.wrist_r.p[2])} cm between the wrists)`); set('Horizontal arm angle', 'peak', `${G.deg(hz(Wt))} (a T in line with the shoulders)`);
set('Shoulder elevation', 'setup', `${G.deg(G.humElev(Ws))} from the trunk (shoulder height)`); set('Shoulder elevation', 'peak', `${G.deg(G.humElev(Wt))} (held)`);
set('Elbow flexion', 'setup', G.deg(G.elbowAng(Ws))); set('Elbow flexion', 'peak', G.deg(G.elbowAng(Wt)));
set('Tempo', 'setup', 'Pause 0.5 s in the quarter squat'); set('Tempo', 'peak', '1.4 s up and open, 0.5 s hold, 1.8 s back down');
console.log(`Dumbbell Iron Cross: wrote ${L.write(ex)}\n  planes ${JSON.stringify(info)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
