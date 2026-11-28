// Standing Scapula Rotation (GymVisual #17583; page not readable here, movement from the name and standard coaching):
// shoulder blade circles. Stand tall, feet hip width (both feet planted), arms hanging relaxed. The shoulder blades trace
// two slow circles: up toward the ears (elevation), back and together (retraction), down (depression), forward around
// the ribs (protraction). Each circle is eight keys on an ellipse in the clavicle channels (protraction about +-18
// degrees, elevation from -8 to +24 degrees, inside the rig limits of -25..30 and -10..40). Arms and trunk do not move
// otherwise. Bilateral, body weight only.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const CA = require('./families/core-a');
const B = require('./families/b6-18');
const meta = require('./meta/standing-scapula-rotation.json');

const S = B.standing({ stance: 10, toeOut: 6, knee: 3 });
const base = clone(S.pose);
Object.assign(base.ch, { shoulder_r: { plane: 10, elev: 7, axial: 0 }, shoulder_l: { plane: 10, elev: 7, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } });
const PA = 18, EC = 8, EA = 16;
// theta (deg) on the circle: 90 = top, 180 = back, 270 = bottom, 0/360 = forward. k: 0..1 blend from neutral.
function blade(theta, k = 1, extra = 0) {
  const p = clone(base), a = theta * Math.PI / 180;
  const pr = r1(k * PA * Math.cos(a)), el = r1(k * (EC + EA * Math.sin(a)));
  p.ch.sc_r = { protract: pr, elevate: el }; p.ch.sc_l = { protract: pr, elevate: el };
  // the upper back extends a touch as the blades squeeze back and rounds a touch as they glide forward
  p.ch.spine_t6 = { rot: 0, flex: r1(0.08 * pr + extra), latFlex: 0 };
  return p;
}
const poses = { stand: blade(0, 0) };
const ANG = [45, 90, 135, 180, 225, 270, 315, 360];
// enter the circle from neutral: first key on the way up (front-top quadrant), half size
poses.enter = blade(60, 0.55);
ANG.forEach((a, i) => { poses[`a${i}`] = blade(a); });
poses.exit = blade(30, 0.4);
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.15, pose: 'enter' }];
let t = 1.15;
for (let i = 0; i < 15; i++) { t = +(t + 0.33).toFixed(2); keyframes.push({ t, pose: `a${(i + 1) % 8}` }); }
keyframes.push({ t: 6.45, pose: 'exit' }, { t: 6.85, pose: 'stand' }, { t: 7.2, pose: 'stand' });
const ex = H.module_(meta, S.contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
const lim = CA.scan(ex).limits;
const W0 = L.fk(poses.stand, S.contacts), Wt = L.fk(poses.a1, S.contacts), Wb = L.fk(poses.a3, S.contacts), Wd = L.fk(poses.a5, S.contacts), Wf = L.fk(poses.a7, S.contacts);
const set = H.setKin(ex);
set('Scapular elevation', 'setup', 'Neutral (clavicle elevation 0°)'); set('Scapular elevation', 'peak', `+${poses.a1.ch.sc_r.elevate}° up (shoulder joint ${r1(Wt.shoulder_r.p[1] - W0.shoulder_r.p[1])} cm higher) to ${poses.a5.ch.sc_r.elevate}° down (${r1(Wd.shoulder_r.p[1] - W0.shoulder_r.p[1])} cm)`);
set('Scapular retraction', 'setup', 'Neutral'); set('Scapular retraction', 'peak', `${poses.a3.ch.sc_r.protract}° back (shoulder ${r1(W0.shoulder_r.p[0] - Wb.shoulder_r.p[0])} cm back) to +${poses.a7.ch.sc_r.protract}° forward (${r1(Wf.shoulder_r.p[0] - W0.shoulder_r.p[0])} cm forward)`);
set('Arms', 'setup', 'Hanging, elbows soft'); set('Arms', 'peak', 'Ride along with the shoulder blades');
set('Trunk and head', 'setup', 'Tall'); set('Trunk and head', 'peak', 'Unchanged apart from a slight upper-back extension in the squeeze');
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Two circles of about 2.6 s');
ex.exercise.reference.note = B.NOTE;
console.log(`Standing Scapula Rotation: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} limits ${lim.length}`);
if (rep.slide > 0.05 || rep.floor < -0.5 || lim.length) { console.error('FAIL standing-scapula-rotation', lim.slice(0, 4)); process.exitCode = 1; }
