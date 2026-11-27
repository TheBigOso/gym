// Dumbbell Upright Row (GymVisual #043712): standing tall, feet about hip width (planted leg contacts), knees soft. Dumbbells
// hang in front of the thighs, palms facing the body, hands about shoulder width. Leading with the elbows, the dumbbells
// travel straight up close to the body until the elbows reach about shoulder height (about 90 degrees of elevation, the
// limit suggested by the impingement study 2014), hands at the lower chest and below the elbows; 1.4 s up, 0.4 s pause,
// 2 s down. Bilateral, a dumbbell in each hand (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const DB = require('./families/dumbbell');
const meta = require('./meta/dumbbell-upright-row.json');

const st = F.standing({ stance: 12, knee: 6 });
const base = st.pose;
const ELBOW_TOP = +(process.env.ELBOW_TOP ?? -2); // elbow height vs the shoulder joint at the top (cm)
// Wrist target at fraction f: x in front of the body (thigh -> lower chest), z about shoulder width, y rising; elbow on its
// circle closest to "out to the side and up". Scapulae elevate / upwardly rotate a little near the top.
const CLR = +(process.env.CLR ?? 2.5); // cm between the plates and the body at the keys (rig v2's wider pelvis: the in-between frames pass about 2 cm closer)
function solveAt(f, guess, y, x) {
  // wrist deviation that keeps the handle level (the forearm slants in from the elbow to the hand near the top)
  let best = null;
  for (const dev of [-20, -12, -5, 0, 6, 12, 20, 28, 35]) { const q = solveAt1(f, guess, y, x, dev), ay = Math.abs(DB.dumbbellAt(L.fk(q), 'r').ax[1]); if (!best || ay < best.ay) best = { q, ay, dev }; }
  let a = Math.max(-20, best.dev - 7), b = Math.min(35, best.dev + 7);
  for (let i = 0; i < 8; i++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; const f1 = Math.abs(DB.dumbbellAt(L.fk(solveAt1(f, guess, y, x, m1)), 'r').ax[1]), f2 = Math.abs(DB.dumbbellAt(L.fk(solveAt1(f, guess, y, x, m2)), 'r').ax[1]); if (f1 < f2) b = m2; else a = m1; }
  return solveAt1(f, guess, y, x, r1((a + b) / 2));
}
function solveAt1(f, guess, y, x, dev) {
  const p = clone(base);
  p.ch.sc_r = { protract: r1(2 + 3 * f), elevate: r1(10 * f * f) };
  const Sh = L.fk(p).shoulder_r.p, k = f * f * (3 - 2 * f);
  const wrist = [x, y, 20.5 + 2.5 * k];
  const elbow = F.elbowFor(Sh, wrist, [-0.25, 0.15 + 0.85 * k, 1]);
  const palm = V.norm([-1, -0.1 - 0.5 * k, 0]);
  return F.solveArm(p, { wrist, elbow, wElbow: 1, palm, wPalm: 3, wristFlex: r1(5 + 15 * k), wristDev: dev, guess });
}
// Wrist target at fraction f: height rising from the hanging arm to the lower chest, hands about shoulder width; the
// distance in front of the body is the smallest that keeps the plates CLR cm off the thighs, belly and chest.
function poseAt(f, guess, wy) {
  const Sh = L.fk(base).shoulder_r.p, k = f * f * (3 - 2 * f);
  const yBot = Sh[1] - L.reach(10) + 2, y = wy ?? (yBot + (Sh[1] - 22 - yBot) * k);
  let a = Sh[0] + 4, b = Sh[0] + 30, q = null;
  for (let i = 0; i < 12; i++) { const m = (a + b) / 2; q = solveAt(f, guess, y, m); const W = L.fk(mirror(q)); if (S.clearance(W, { sides: ['r'] }).d < CLR) a = m; else b = m; }
  return solveAt(f, guess, y, b);
}
const mirror = (q) => F.mirrorArm(clone(q));
// top: wrist height for the elbow at ELBOW_TOP cm vs the shoulder joint
function topPose(guess) {
  let a = 105, b = 140, q = null;
  for (let i = 0; i < 12; i++) { const m = (a + b) / 2; q = poseAt(1, guess, m); const W = L.fk(q); if (W.elbow_r.p[1] - W.shoulder_r.p[1] < ELBOW_TOP) a = m; else b = m; }
  return q;
}
const poses = {}, err = {};
let g = { plane: 60, elev: 18, axial: 40, flex: 12, pron: 160 };
const order = { bottom: 0, r25: 0.25, r50: 0.5, r75: 0.75, top: 1 };
for (const [name, f] of Object.entries(order)) { const q = name === 'top' ? topPose(g) : poseAt(f, g); err[name] = q.__err; g = F.armGuess(q); poses[name] = F.mirrorArm(q); console.error(name, JSON.stringify(q.ch.shoulder_r), q.ch.elbow_r.flex, q.ch.wrist_r.pron, JSON.stringify(q.__err), L.fk(q).wrist_r.p.map(r1)); }
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.pull.start, pose: 'bottom' }, { t: 0.95, pose: 'r25' }, { t: 1.3, pose: 'r50' }, { t: 1.65, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 2.9, pose: 'r75' }, { t: 3.4, pose: 'r50' }, { t: 3.9, pose: 'r25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = S.scan(ex);
F.gate('dumbbell-upright-row', rep, { minClear: 0.3 });

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex);
set('Shoulder abduction', 'setup', `≈${Math.round(S.humElev(Wb))}° (arms long)`); set('Shoulder abduction', 'peak', `≈${Math.round(S.humElev(Wt))}° (elbow ${r1(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint, ${r1(Wt.elbow_r.p[1] - Wt.wrist_r.p[1])} cm above the wrist)`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Hand path', 'setup', `hands ${Math.round(2 * Wb.wrist_r.p[2])} cm apart in front of the thighs`); set('Hand path', 'peak', `hands ${Math.round(2 * Wt.wrist_r.p[2])} cm apart, ${Math.round(Wt.shoulder_r.p[1] - Wt.wrist_r.p[1])} cm below the shoulder joints (lower chest), rise ${Math.round(Wt.wrist_r.p[1] - Wb.wrist_r.p[1])} cm`);
set('Trunk', 'setup', `upright, knees ≈${Math.round(H.kneeOf(Wb, 'r'))}°`); set('Trunk', 'peak', 'unchanged (no lean back)');
set('Tempo', 'setup', 'Pause 0.6 s at the thighs'); set('Tempo', 'peak', '1.4 s up, 0.4 s at the top, 2.0 s down');
console.log(`Dumbbell Upright Row: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, top: poses.top.ch.shoulder_r, elbow: poses.top.ch.elbow_r, wrist: poses.top.ch.wrist_r, ...rep })}`);
