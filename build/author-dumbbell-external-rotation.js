// Dumbbell External Rotation, side-lying (GymVisual #11216; page not read, movement from the name; the classic dumbbell
// external rotation is done lying on the side). Authored on the right: lying on the left side on a mat, hips and knees
// bent and stacked, the bottom (left) hand under the side of the head as a pillow. The right upper arm rests along the
// side of the trunk with the elbow bent 90 degrees; the forearm starts across the front of the belly, angled toward the
// floor, and turns up about the upper arm (humeral external rotation only: shoulder plane / elevation and the elbow are
// constant, so the elbow does not move) until it points almost straight up; slow lowering. Light dumbbell, neutral grip.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-external-rotation.json');
const ID = meta.exercise.id;

const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const PHI0 = +(process.env.PHI0 || -45), PHI1 = +(process.env.PHI1 || 80), LIFT = +(process.env.LIFT || 0.32);
const side = G.sideLie();
const base = side.pose;
base.ch.sc_r = { protract: 0, elevate: 0 };
const W0 = L.fk(base);
const down = V.norm(V.sub(W0.pelvis.p, W0.neck_c7.p)), fwd = Q.rot(W0.spine_t6.q, [1, 0, 0]);
const uaDir = V.norm(V.add(down, V.scale([0, 1, 0], LIFT)));               // along the side, resting on the ribs
const E = V.add(W0.shoulder_r.p, V.scale(uaDir, L.UA - 0.05));
const f0 = V.norm(V.sub(fwd, V.scale(uaDir, V.dot(fwd, uaDir))));          // forearm forward (horizontal-ish, in front)
let s0 = V.norm(V.cross(uaDir, f0)); if (s0[1] < 0) s0 = V.scale(s0, -1);  // forearm up (toward the ceiling)
const D2R = Math.PI / 180;
const d = (ph) => V.add(V.scale(f0, Math.cos(ph * D2R)), V.scale(s0, Math.sin(ph * D2R)));
const palm = (ph) => V.add(V.scale(s0, -Math.cos(ph * D2R)), V.scale(f0, Math.sin(ph * D2R)));
const FS = [0, 0.25, 0.5, 0.75, 1];
const rk = G.rotKeys(base, E, d, palm, 20, FS.map((f) => G.lerp(PHI0, PHI1, f)), { guess: { plane: 10, elev: 20, axial: 0, flex: 90, pron: 90 } });
const poses = rk.poses;
const up = G.easeTimes([0.25, 0.5, 0.75, 1], 0.6, 2.6), dn = G.easeTimes([0.25, 0.5, 0.75, 1], 3.1, 5.6);
const keyframes = [{ t: 0, pose: 'r0' }, { t: 0.6, pose: 'r0' }, ...up.map((t, i) => ({ t, pose: `r${i + 1}` })), { t: 3.1, pose: 'r4' }, ...dn.map((t, i) => ({ t, pose: `r${3 - i}` })), { t: 6.0, pose: 'r0' }];
const ex = H.module_(meta, [], poses, keyframes);
const rep = K.scanHeld(ex, [{ side: 'r', grip: 'handle', size: SZ }], { planted: [] });
const Wa = L.fk(poses.r0), Wb = L.fk(poses.r4);
const set = H.setKin(ex), dg = G.deg;
set('External rotation', 'setup', `Forearm ${dg(-rk.phiOf(Wa))} below horizontal, across the belly`); set('External rotation', 'peak', `Forearm ${dg(rk.phiOf(Wb))} above horizontal (${dg(rk.phiOf(Wb) - rk.phiOf(Wa))} of rotation); elbow fixed`);
set('Elbow position', 'setup', `Elbow ${dg(K.elbowAng(Wa))}, upper arm ${dg(V.angle(V.sub(Wa.elbow_r.p, Wa.shoulder_r.p), down))} off the trunk line, resting on the ribs`); set('Elbow position', 'peak', 'Unchanged (shoulder plane, elevation and elbow constant)');
set('Body position', 'setup', `On the left side, hips ${dg(base.ch.hip_l.flex)}, knees ${dg(base.ch.knee_l.flex)}, left hand under the head`); set('Body position', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s'); set('Tempo', 'peak', '2.0 s up, 0.5 s at the top, 2.5 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ side: side.info, err: rk.err, sign: rk.sign, arm: rk.arm.ch.shoulder_r, phi: [rk.phiOf(Wa), rk.phiOf(Wb)].map(r1), axial: [poses.r0.ch.shoulder_r.axial, poses.r4.ch.shoulder_r.axial], ...rep })}`);
G.fail(ID, [rep.floor < -0.5 && 'below floor', rep.clear.d < 0 && `dumbbell clearance ${JSON.stringify(rep.clear)}`, rep.dbFloor < 0 && 'dumbbell below floor', rep.jump.v > 4 && 'channel jump', ...G.limits(poses)]);
