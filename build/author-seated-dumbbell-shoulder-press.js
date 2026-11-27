// Seated Dumbbell Shoulder Press (GymVisual #040512): seated on the adjustable bench with the back pad at 85 degrees, back
// and buttocks on the pad, feet flat (planted leg contacts). Dumbbells at shoulder height with the elbows under the wrists
// and a little in front of the body (scapular plane), palms forward; press up and slightly in to nearly straight arms
// (about 1.5 s), short pause, lower in about 2 s. Bilateral, a dumbbell in each hand (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const meta = require('./meta/seated-dumbbell-shoulder-press.json');

const ANGLE = 85;
// back on the pad and buttocks on the seat, measured on the skinned mesh (b2/b3sh_mesh.mjs)
const SEAT = { pitchAdj: Number(process.env.PITCH_ADJ ?? -6), padOffset: Number(process.env.PAD_OFFSET ?? 7.6), seatDrop: Number(process.env.SEAT_DROP ?? 3.6) };
const base = F.seated({ angle: ANGLE, ...SEAT });
const W0 = L.fk(base.pose, base.contacts), S = W0.shoulder_r.p;
const PLANE = 30 * Math.PI / 180; // elbows about 30 degrees in front of the frontal plane

// Wrist path: bottom = forearm vertical over an elbow at 82 degrees of elevation, 30 degrees in front of the frontal plane
// (upper arm about level); top = over the shoulder, 2 cm outside it, elbows about 12 degrees from straight. The path
// bows outward a little (hands stay over the elbows through the lower half), and the elbow sits on its circle closest to
// "out to the side and slightly forward".
function wristAt(f, Sh) {
  const elev = 82 * Math.PI / 180;
  const e0 = V.add(Sh, V.scale([Math.sin(elev) * Math.sin(PLANE), -Math.cos(elev), Math.sin(elev) * Math.cos(PLANE)], L.UA));
  const w0 = V.add(e0, [0, L.FA, 0]), reach = L.reach(12), w1 = V.add(Sh, [3, Math.sqrt(reach * reach - 9 - 4), 2]);
  const k = f * f * (3 - 2 * f), w = V.add(V.scale(w0, 1 - k), V.scale(w1, k));
  w[2] += 5 * Math.sin(Math.PI * f) * (1 - f); // stay over the elbows a little longer
  return w;
}
function poseAt(f, guess) {
  const p = clone(base.pose);
  p.ch.sc_r = { protract: r1(3 + 2 * f), elevate: r1(12 * f * f) }; // shoulder blades rotate up / elevate overhead
  const Sh = L.fk(p).shoulder_r.p, wrist = wristAt(f, Sh);
  const elbow = F.elbowFor(Sh, wrist, [Math.sin(PLANE), -0.25, Math.cos(PLANE)]);
  return F.solveArm(p, { wrist, elbow, wElbow: 1, palm: [1, 0, 0], wPalm: 4, wristFlex: -8, guess });
}
const keysF = { bottom: 0, p25: 0.25, p50: 0.5, p75: 0.75, top: 1 };
const poses = {}, err = {};
let g = { plane: 30, elev: 85, axial: -85, flex: 92, pron: 88 };
for (const [name, f] of Object.entries(keysF)) { const q = poseAt(f, g); err[name] = q.__err; g = F.armGuess(q); poses[name] = F.mirrorArm(q); }
// the lowering uses the same keys (same path), the top gets a slightly softer lockout hold
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = poses.topHold.ch.elbow_l.flex = r1(poses.top.ch.elbow_r.flex + 2);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.2, pose: 'p25' }, { t: 1.55, pose: 'p50' }, { t: 1.9, pose: 'p75' }, { t: 2.3, pose: 'top' },
  { t: 2.7, pose: 'topHold' }, { t: 3.25, pose: 'p75' }, { t: 3.75, pose: 'p50' }, { t: 4.2, pose: 'p25' }, { t: 4.7, pose: 'bottom' }, { t: 5.5, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, ...F.DUMBBELLS];
const rep = F.scan(ex, { pad: base.bench, box: { center: base.bench.prop.center, size: base.bench.prop.size } });
F.gate('seated-dumbbell-shoulder-press', rep);

const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const humElev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p)); // vs the trunk axis
const planeDeg = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) * 180 / Math.PI; };
const set = H.setKin(ex);
set('Back pad angle', 'setup', `${ANGLE}° from the floor; back and buttocks on the pad`); set('Back pad angle', 'peak', 'unchanged (trunk still)');
set('Shoulder elevation', 'setup', `≈${Math.round(humElev(Wb))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Wb))}°, forearm vertical`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}° (nearly straight)`);
set('Plane of elevation', 'setup', `elbows ≈${Math.round(planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(planeDeg(Wt))}°`);
set('Tempo', 'setup', 'Pause 0.8 s at the shoulders'); set('Tempo', 'peak', '1.5 s up, 0.4 s at the top, 2.0 s down');
console.log(`Seated Dumbbell Shoulder Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, bench: base.bench.prop.center, back: base.backGap, ...rep })}`);
