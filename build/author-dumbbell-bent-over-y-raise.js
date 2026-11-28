// Dumbbell Bent-Over Y Raise (GymVisual #19371; page not read, movement from the name): bent-over standing form like the
// rear delt fly. Feet hip width (planted), knees soft, hip hinge with a flat back (trunk about 17 degrees above
// horizontal). The dumbbells hang under the shoulders, palms facing in; the straight arms (soft elbows) rise forward and
// out into a Y in line with the trunk, about 45 degrees out from the head, with the thumbs turning up toward the ceiling
// and the shoulder blades drawn back and down; pause; lower slowly. Bilateral, light dumbbells (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-bent-over-y-raise.json');
const ID = meta.exercise.id;

const TRUNK = 17, PL1 = +(process.env.PL1 || 45), EL1 = +(process.env.EL1 || 150);
const base = F.hinge({ stance: 13, knee: 24, trunk: TRUNK });
const PLANE0 = 86, ELEV0 = 90 - TRUNK - 2;
const FS = [0, 0.25, 0.5, 0.75, 1];
const keys = FS.map((f, i) => {
  const k = G.ease(f) * 0.4 + f * 0.6;
  return { name: i === 0 ? 'bottom' : i === FS.length - 1 ? 'top' : `r${i}`, plane: r1(G.lerp(PLANE0, PL1, f)), elev: r1(G.lerp(ELEV0, EL1, k)), axial: r1(G.lerp(-PLANE0, -40, f)), flex: r1(14 - 6 * f), pron: 0,
    sc: { protract: r1(6 - 14 * f), elevate: r1(10 * f * f) }, thumb: () => G.blendDir([1, 0, 0], [0, 1, 0], f) };
});
const { poses, err } = G.raiseKeys(base.pose, keys, base.contacts);
poses.hold = clone(poses.top); poses.hold.ch.sc_r.protract = poses.hold.ch.sc_l.protract = r1(poses.top.ch.sc_r.protract - 2);
const up = G.easeTimes([0.25, 0.5, 0.75, 1], 0.8, 2.4), dn = G.easeTimes([0.25, 0.5, 0.75, 1], 2.9, 4.9);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, ...up.map((t, i) => ({ t, pose: keys[i + 1].name })), { t: 2.65, pose: 'hold' }, { t: 2.9, pose: 'top' },
  ...dn.map((t, i) => ({ t, pose: keys[3 - i].name })), { t: 5.6, pose: 'bottom' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const rep = K.scanHeld(ex, ['r', 'l'].map((side) => ({ side, grip: 'handle', size: SZ })));
F.gate(ID, rep);

const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts);
const trunkUp = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) * 180 / Math.PI;
const armTrunk = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.neck_c7.p, W.pelvis.p));
const outFromHead = (W) => { const a = V.sub(W.wrist_r.p, W.shoulder_r.p), t = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)); return Math.atan2(a[2], V.dot(a, t)) * 180 / Math.PI; };
const set = H.setKin(ex), d = G.deg;
set('Trunk inclination', 'setup', `${d(trunkUp(Wb))} above horizontal`); set('Trunk inclination', 'peak', 'Unchanged');
set('Arm elevation', 'setup', 'Arms hanging under the shoulders'); set('Arm elevation', 'peak', `Upper arm ${d(armTrunk(Wt))} from the trunk line, hands ${d(outFromHead(Wt))} out from the head line, ${r1(Wt.wrist_r.p[1] - Wt.shoulder_r.p[1])} cm above shoulder height`);
set('Elbow flexion', 'setup', d(K.elbowAng(Wb))); set('Elbow flexion', 'peak', d(K.elbowAng(Wt)));
set('Grip', 'setup', 'Palms facing in'); set('Grip', 'peak', 'Thumbs up toward the ceiling');
set('Knee flexion', 'setup', d(rep.kneeR[0])); set('Knee flexion', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Hold the hinge 0.8 s'); set('Tempo', 'peak', '1.6 s up, 0.5 s hold, 2.0 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, top: poses.top.ch.shoulder_r, ...rep })}`);
G.fail(ID, G.limits(poses));
