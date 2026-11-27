// Dumbbell Arnold Press (GymVisual #213712): seated on the adjustable bench (back pad 85 degrees, back on the pad, feet
// planted), the reference-typical seated form. Start with the dumbbells in front of the shoulders at chin height, palms
// facing you, elbows in front and close together. Press up while the elbows open out to the sides and the palms turn
// through facing each other to facing forward (about 1.8 s), finish with nearly straight arms, then reverse it on the way
// down (about 2.5 s). Bilateral, a dumbbell in each hand (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const meta = require('./meta/dumbbell-arnold-press.json');

const ANGLE = 85;
// same bench set-up as the seated shoulder press (back and buttocks measured on the skinned mesh with b2/b3sh_mesh.mjs)
const base = F.seated({ angle: ANGLE, pitchAdj: -6, padOffset: 7.6, seatDrop: 3.6 });
const D2R = Math.PI / 180, ss = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

// f: 0 = start (palms toward the face, chin height) -> 1 = top (palms forward, arms nearly straight overhead)
function targets(f, Sh) {
  const plane = (85 - 55 * ss(f / 0.8)) * D2R, elev = (55 + (158 - 55) * f) * D2R;   // elbow: in front -> out and up
  const dir = [Math.sin(elev) * Math.sin(plane), -Math.cos(elev), Math.sin(elev) * Math.cos(plane)];
  const e = V.add(Sh, V.scale(dir, L.UA)), wLow = V.add(e, [0, L.FA, 0]);              // forearm vertical over the elbow
  const reach = L.reach(12), wTop = V.add(Sh, [3, Math.sqrt(reach * reach - 9 - 4), 2]);
  const k = ss((f - 0.45) / 0.55), wrist = V.add(V.scale(wLow, 1 - k), V.scale(wTop, k));
  const th = Math.PI * ss(f / 0.8); // palm: toward the face (-X) -> facing in (-Z) -> forward (+X)
  return { wrist, hint: dir, palm: [-Math.cos(th), 0, -Math.sin(th)] };
}
function poseAt(f, guess) {
  const p = clone(base.pose);
  p.ch.sc_r = { protract: r1(6 - 3 * f), elevate: r1(12 * f * f) };
  const Sh = L.fk(p).shoulder_r.p, tg = targets(f, Sh), elbow = F.elbowFor(Sh, tg.wrist, tg.hint);
  return F.solveArm(p, { wrist: tg.wrist, elbow, palm: tg.palm, wPalm: 4, wristFlex: -5, guess });
}
const keysF = { start: 0, a20: 0.2, a40: 0.4, a60: 0.6, a80: 0.8, top: 1 };
const poses = {}, err = {};
let g = { plane: 85, elev: 55, axial: 0, flex: 125, pron: 5 };
for (const [name, f] of Object.entries(keysF)) { const q = poseAt(f, g); err[name] = q.__err; g = F.armGuess(q); poses[name] = F.mirrorArm(q); }
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = poses.topHold.ch.elbow_l.flex = r1(poses.top.ch.elbow_r.flex + 2);
const keyframes = [{ t: 0, pose: 'start' }, { t: 0.8, pose: 'start' }, { t: 1.15, pose: 'a20' }, { t: 1.5, pose: 'a40' }, { t: 1.85, pose: 'a60' }, { t: 2.2, pose: 'a80' }, { t: 2.6, pose: 'top' },
  { t: 3.0, pose: 'topHold' }, { t: 3.5, pose: 'a80' }, { t: 4.0, pose: 'a60' }, { t: 4.5, pose: 'a40' }, { t: 5.0, pose: 'a20' }, { t: 5.5, pose: 'start' }, { t: 6.5, pose: 'start' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, ...F.DUMBBELLS];
const rep = F.scan(ex, { pad: base.bench, box: { center: base.bench.prop.center, size: base.bench.prop.size } });
F.gate('dumbbell-arnold-press', rep);

const Ws = L.fk(poses.start, base.contacts), Wt = L.fk(poses.top, base.contacts);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const humElev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const planeDeg = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) * 180 / Math.PI; };
const set = H.setKin(ex);
set('Forearm rotation', 'setup', `palms toward the face (wrist pron ${poses.start.ch.wrist_r.pron}°, shoulder axial ${poses.start.ch.shoulder_r.axial}°)`);
set('Forearm rotation', 'peak', `palms forward (pron ${poses.top.ch.wrist_r.pron}°, axial ${poses.top.ch.shoulder_r.axial}°)`);
set('Shoulder elevation', 'setup', `≈${Math.round(humElev(Ws))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(humElev(Wt))}°`);
set('Plane of elevation', 'setup', `elbows ≈${Math.round(planeDeg(Ws))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Ws))}°`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}°`);
set('Tempo', 'setup', 'Pause 0.8 s at the chin, 1.0 s at the bottom of each rep'); set('Tempo', 'peak', '1.8 s up with the turn, 0.4 s at the top, 2.5 s down');
console.log(`Dumbbell Arnold Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
