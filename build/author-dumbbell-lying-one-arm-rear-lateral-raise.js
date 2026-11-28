// Dumbbell Lying One Arm Rear Lateral Raise (GymVisual #5043; page not read, movement from the name): side-lying rear delt
// raise. Authored on the right: lying on the left side on a mat, hips and knees bent and stacked, the bottom (left) hand
// under the side of the head. The right arm, long with a soft fixed elbow and a neutral grip (thumb toward the head),
// starts in front of the chest angled down toward the floor and sweeps up and back in the body's transverse plane
// (horizontal abduction) until it points at the ceiling; pause; slow lowering. The trunk stays stacked (pelvis still).
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-lying-one-arm-rear-lateral-raise.json');
const ID = meta.exercise.id;

const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const FLEX = 12, TH1 = +(process.env.TH1 || 172), CLR = +(process.env.CLR || 4);
const side = G.sideLie();
const base = side.pose;
base.ch.sc_r = { protract: 6, elevate: 0 };
const W0 = L.fk(base);
const axis = V.norm(V.sub(W0.neck_c7.p, W0.pelvis.p));                       // trunk long axis (toward the head)
const fwd0 = Q.rot(W0.spine_t6.q, [1, 0, 0]), fr = V.norm(V.sub(fwd0, V.scale(axis, V.dot(fwd0, axis))));
let dn = V.norm(V.cross(axis, fr)); if (dn[1] > 0) dn = V.scale(dn, -1);    // toward the floor, perpendicular to the trunk
const D2R = Math.PI / 180;
const armDir = (th) => V.add(V.scale(dn, Math.cos(th * D2R)), V.scale(fr, Math.sin(th * D2R)));
let g = { plane: 90, elev: 60, axial: 0, flex: FLEX, pron: 90 };
function key(th, sc) {
  const p = clone(base); p.ch.sc_r = sc;
  const S = L.fk(p).shoulder_r.p, wrist = V.add(S, V.scale(armDir(th), L.reach(FLEX)));
  const elbow = F.elbowFor(S, wrist, V.cross(armDir(th), axis)); // the soft elbow points away from the palm
  const q = F.solveArm(p, { wrist, elbow, wElbow: 1, thumb: axis, wThumb: 5, guess: g });
  g = F.armGuess(q);
  return q;
}
// start angle: the lowest dumbbell plate CLR cm above the floor
const lowAt = (th) => Math.min(...K.platePoints(L.fk(key(th, { protract: 10, elevate: 0 })), 'r', 'handle', null, SZ).map((p) => p[1]));
let lo = 10, hi = 120; for (let i = 0; i < 25; i++) { const m = (lo + hi) / 2; g = { plane: 90, elev: 60, axial: 0, flex: FLEX, pron: 90 }; if (lowAt(m) < CLR) lo = m; else hi = m; }
const TH0 = r1(hi);
g = { plane: 90, elev: 60, axial: 0, flex: FLEX, pron: 90 };
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {}, err = {};
FS.forEach((f, i) => { const q = key(G.lerp(TH0, TH1, f), { protract: r1(10 - 18 * f), elevate: 0 }); err[`k${i}`] = q.__err; poses[`k${i}`] = G.strip(q); });
const up = G.easeTimes(FS.slice(1), 0.6, 2.1), dnT = G.easeTimes(FS.slice(1), 2.6, 4.6);
const keyframes = [{ t: 0, pose: 'k0' }, { t: 0.6, pose: 'k0' }, ...up.map((t, i) => ({ t, pose: `k${i + 1}` })), { t: 2.6, pose: 'k5' }, ...dnT.map((t, i) => ({ t, pose: `k${4 - i}` })), { t: 5.2, pose: 'k0' }];
const ex = H.module_(meta, [], poses, keyframes);
const rep = K.scanHeld(ex, [{ side: 'r', grip: 'handle', size: SZ }], { planted: [] });
const Wa = L.fk(poses.k0), Wb = L.fk(poses.k5);
const fromDown = (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, -1, 0]);
const set = H.setKin(ex), dg = G.deg;
set('Horizontal abduction', 'setup', `Arm ${dg(fromDown(Wa))} from pointing at the floor, in front of the chest`); set('Horizontal abduction', 'peak', `Arm ${dg(180 - fromDown(Wb))} from vertical (${dg(fromDown(Wb) - fromDown(Wa))} of sweep)`);
set('Elbow flexion', 'setup', dg(K.elbowAng(Wa))); set('Elbow flexion', 'peak', dg(K.elbowAng(Wb)));
set('Grip', 'setup', 'Neutral, thumb toward the head'); set('Grip', 'peak', 'Unchanged (thumb toward the head)');
set('Body position', 'setup', `On the left side, hips ${dg(base.ch.hip_l.flex)}, knees ${dg(base.ch.knee_l.flex)}, left hand under the head`); set('Body position', 'peak', 'Unchanged (trunk stays stacked)');
set('Tempo', 'setup', 'Pause 0.6 s'); set('Tempo', 'peak', '1.5 s up, 0.5 s at the top, 2.0 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ TH0, err, ...rep })}`);
G.fail(ID, [rep.floor < -0.5 && 'below floor', rep.clear.d < 0 && `dumbbell clearance ${JSON.stringify(rep.clear)}`, rep.dbFloor < 0 && 'dumbbell below floor', rep.jump.v > 4 && `channel jump ${JSON.stringify(rep.jump)}`, ...G.limits(poses)]);
