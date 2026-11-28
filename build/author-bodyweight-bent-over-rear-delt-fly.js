// Bodyweight Bent Over Rear Delt Fly (GymVisual 14318, movement reference only; page not readable at authoring time): the
// dumbbell rear delt fly (author-dumbbell-rear-delt-fly.js) without weights. Bent-over standing form: feet hip width
// (planted leg contacts), knees soft, hip hinge with a flat back until the trunk is about 15-20 degrees above horizontal,
// arms hanging under the shoulders with the palms facing each other. The arms sweep out to the sides with soft elbows to
// about level with the back while the shoulder blades squeeze together: 1.5 s up, 0.5 s squeeze, 2 s down. Bilateral,
// hands empty.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const meta = require('./meta/bodyweight-bent-over-rear-delt-fly.json');

const TRUNK = 17; // pelvis-to-C7 line above horizontal
const base = F.hinge({ stance: 13, knee: 24, trunk: TRUNK });
const W0 = L.fk(base.pose, base.contacts), D2R = Math.PI / 180;
// hanging direction in the trunk frame: arm vertical at the bottom; the sweep is about the trunk's long axis
const PLANE0 = 86, PLANE1 = -4, ELEV0 = 90 - TRUNK - 2, ELEV1 = 78;
// Bottom: solved with the palms facing each other. The sweep is a rotation about the trunk's long axis (ISB plane), with
// humeral axial rotation and forearm rotation held (thumbs keep pointing toward the head, so the palms end facing down).
const bottom = F.armKeys(base.pose, [{ name: 'bottom', plane: PLANE0, elev: ELEV0, axial: -PLANE0, flex: 16, pron: 0, palm: [0, 0, -1], sc: { protract: 6, elevate: 0 } }], base.contacts);
const B = bottom.poses.bottom, AX = B.ch.shoulder_r.axial, PRON = B.ch.wrist_r.pron, P0 = B.ch.shoulder_r.plane, E0 = B.ch.shoulder_r.elev;
const err = bottom.err, poses = { bottom: B };
for (const [name, f] of [['r25', 0.25], ['r50', 0.5], ['r75', 0.75], ['top', 1]]) {
  const p = clone(B), k = f * f * (3 - 2 * f) * 0.3 + f * 0.7;
  p.ch.shoulder_r = { plane: r1(P0 + (PLANE1 - P0) * f), elev: r1(E0 + (ELEV1 - E0) * k), axial: AX };
  p.ch.elbow_r = { flex: r1(16 + 4 * f) }; p.ch.wrist_r = { pron: PRON, flex: 0, dev: 0 };
  p.ch.sc_r = { protract: r1(6 - 20 * f), elevate: 0 };
  poses[name] = F.mirrorArm(p);
}
poses.squeeze = clone(poses.top); poses.squeeze.ch.sc_r.protract = poses.squeeze.ch.sc_l.protract = r1(poses.top.ch.sc_r.protract - 2);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.2, pose: 'r25' }, { t: 1.55, pose: 'r50' }, { t: 1.9, pose: 'r75' }, { t: 2.3, pose: 'top' },
  { t: 2.55, pose: 'squeeze' }, { t: 2.8, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: 4.8, pose: 'bottom' }, { t: 5.6, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [];   // no equipment: the hands are empty (the scan still checks a virtual dumbbell's clearance, which is conservative)
const rep = F.scan(ex);
F.gate('bodyweight-bent-over-rear-delt-fly', rep);

const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const trunkUp = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) / D2R;
const armFromDown = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]); // world: 0 = hanging, 90 = level
const set = H.setKin(ex);
set('Trunk inclination', 'setup', `≈${Math.round(trunkUp(Wb))}° above horizontal (≈${Math.round(90 - trunkUp(Wb))}° from vertical)`); set('Trunk inclination', 'peak', 'unchanged');
set('Horizontal abduction', 'setup', `arms hanging (upper arm ≈${Math.round(armFromDown(Wb))}° from vertical)`); set('Horizontal abduction', 'peak', `upper arm ≈${Math.round(armFromDown(Wt))}° from vertical, about level with the back`);
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}°`);
set('Grip', 'setup', 'neutral, palms facing each other'); set('Grip', 'peak', 'palms down, thumbs toward the head');
set('Knee flexion', 'setup', `≈${Math.round(rep.kneeR[0])}°`); set('Knee flexion', 'peak', 'unchanged');
set('Tempo', 'setup', 'Hold the hinge 0.8 s'); set('Tempo', 'peak', '1.5 s up, 0.5 s squeeze, 2.0 s down');
console.log(`Bodyweight Bent Over Rear Delt Fly: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, root: base.pose.root, ...rep })}`);
