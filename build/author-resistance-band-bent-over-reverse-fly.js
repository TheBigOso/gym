// Resistance Band Bent Over Reverse Fly (GymVisual, Resistance Band Bent Over Reverse Fly; movement reference only, page
// not readable): standing on the bands, feet about hip width (planted leg contacts), knees soft, hip hinge with a flat back
// until the trunk is about 25 degrees above horizontal. One band per hand, each anchored under the ball of its own foot
// (anchorJoint toe_r / toe_l); the hands hang under the shoulders, palms facing each other, elbows soft. The arms sweep out
// to the sides with a fixed slight elbow bend until about level with the back, the shoulder blades squeezing, then lower
// against the band. Arm keys as the dumbbell rear delt fly (sweep about the trunk's long axis, humeral and forearm rotation
// held). Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const B5 = require('./families/b5-bandpush');
const G = require('./families/b6-10');
const meta = require('./meta/resistance-band-bent-over-reverse-fly.json');

const TRUNK = +(process.env.TRUNK ?? 25); // pelvis-to-C7 line above horizontal
const base = F.hinge({ stance: 13, knee: 22, trunk: TRUNK });
const PLANE0 = 86, PLANE1 = -4, ELEV0 = 90 - TRUNK - 2, ELEV1 = 80;
const bottom = F.armKeys(base.pose, [{ name: 'bottom', plane: PLANE0, elev: ELEV0, axial: -PLANE0, flex: 14, pron: 0, palm: [0, 0, -1], sc: { protract: 6, elevate: 0 } }], base.contacts);
const B = bottom.poses.bottom, AX = B.ch.shoulder_r.axial, PRON = B.ch.wrist_r.pron, P0 = B.ch.shoulder_r.plane, E0 = B.ch.shoulder_r.elev;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1], keys = [];
for (const f of FS) {
  const p = clone(B), k = f * f * (3 - 2 * f) * 0.3 + f * 0.7;
  p.ch.shoulder_r = { plane: r1(P0 + (PLANE1 - P0) * f), elev: r1(E0 + (ELEV1 - E0) * k), axial: AX };
  p.ch.elbow_r = { flex: r1(14 + 4 * f) }; p.ch.wrist_r = { pron: PRON, flex: 0, dev: 0 };
  p.ch.sc_r = { protract: r1(6 - 20 * f), elevate: 0 };
  keys.push(F.mirrorArm(p));
}
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = B5.bandProps({ anchorJoint: 'toe_r', color: B5.COLOR.light });
const rep = G.bandCheck('resistance-band-bent-over-reverse-fly', ex, { minLine: 0.5, skip: /^(hand|thumb|forearm|foot)_/ });
const N = FS.length - 1, Wb = L.fk(poses.k0, base.contacts), Wt = L.fk(poses[`k${N}`], base.contacts), set = H.setKin(ex), d = G.d0;
const trunkUp = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) * 180 / Math.PI;
const armFromDown = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
set('Trunk', 'setup', `${d(trunkUp(Wb))} above horizontal (${d(90 - trunkUp(Wb))} from vertical), knees ${d(rep.kneeR[0])}`); set('Trunk', 'peak', 'Unchanged');
set('Arm path', 'setup', `Arms hanging (upper arm ${d(armFromDown(Wb))} from vertical), palms facing`); set('Arm path', 'peak', `Upper arm ${d(armFromDown(Wt))} from vertical, about level with the back; palms down`);
set('Elbow flexion', 'setup', d(G.elbowAng(Wb))); set('Elbow flexion', 'peak', d(G.elbowAng(Wt)));
set('Band', 'setup', `One band per hand under the ball of each foot; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at the top; at least ${r1(rep.line.d)} cm from the body`);
set('Tempo', 'setup', 'Hold the hinge 0.6 s'); set('Tempo', 'peak', '1.1 s up, 0.4 s squeeze, 1.8 s down, 0.4 s pause');
console.log(`Resistance Band Bent Over Reverse Fly: wrote ${L.write(ex)}\n  ${JSON.stringify({ err: bottom.err, trunk: r1(G.trunkFromVertical(Wb)), ...rep })}`);
