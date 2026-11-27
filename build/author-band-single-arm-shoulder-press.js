// Band Single Arm Shoulder Press (GymVisual, Band Single Arm Shoulder Press; movement reference only): standing tall in a
// staggered stance, right foot forward standing on the band (anchorJoint toe_r), left foot back, knees soft (planted leg
// contacts), left hand on the hip. The band handle at the right shoulder, palm forward, elbow under the wrist and a little
// in front (scapular plane); press up and slightly in to a nearly straight arm (about 1.5 s), short pause, lower in about
// 2 s. The front foot is 40 cm ahead so the strand rises in front of the elbow rather than through it. Authored right
// (the player mirrors). Press path from family b4-shoulders2.js; stance and band from b5-bandpush.js.
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/band-single-arm-shoulder-press.json');

const B5 = require('./families/b5-bandpush');
const ENV = (k, d) => +(process.env[k] ?? d);
const FRONT = ENV('FRONT', 40), BACK = ENV('BACK', 10), STANCE = ENV('STANCE', 14);
const st = B5.staggered({ front: FRONT, back: BACK, stance: STANCE, knee: 8 });
st.pose.ch.spine_l5 = { rot: 0, flex: 1, latFlex: 0 };
const base = S.leftOnHip(st.pose);
const keys = S.pressKeys(base, { bottom: 0, p25: 0.25, p50: 0.5, p75: 0.75, top: 1 }, { plane: 30, elev0: 82 });
const poses = {};
const keepLeft = (p) => { const q = clone(p); for (const j of ["shoulder", "elbow", "wrist", "sc"]) q.ch[`${j}_l`] = clone(base.ch[`${j}_l`]); delete q.__err; return q; };
for (const [k, p] of Object.entries(keys.poses)) poses[k] = keepLeft(p);
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = r1(poses.top.ch.elbow_r.flex + 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.press.start, pose: 'bottom' }, { t: 1.2, pose: 'p25' }, { t: 1.55, pose: 'p50' }, { t: 1.9, pose: 'p75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'topHold' }, { t: 3.25, pose: 'p75' }, { t: 3.75, pose: 'p50' }, { t: 4.2, pose: 'p25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = S.handProps(['r']); // handle clearance checked as a dumbbell (conservative), then swapped for the band
const rep = S.scan(ex, { sides: ['r'] });
F.gate('band-single-arm-shoulder-press', rep);

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(S.humElev(Wb))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(S.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°, forearm vertical`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}° (nearly straight)`);
set('Plane of elevation', 'setup', `elbow ≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Trunk', 'setup', `upright, left hand on the hip; staggered stance, right foot ${FRONT} cm forward on the band, left foot ${BACK} cm back`); set('Trunk', 'peak', 'unchanged (no side lean)');
set('Tempo', 'setup', 'Pause 0.8 s at the shoulder'); set('Tempo', 'peak', '1.5 s up, 0.4 s at the top, 2.0 s down');
ex.props = B5.bandProps({ anchorJoint: 'toe_r', sides: ['r'], color: B5.COLOR.medium });
const brep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'], skip: /^(hand|thumb|forearm|foot|toe)_/ });
B5.gateBands('band-single-arm-shoulder-press', brep);
set('Band', 'setup', `Under the right forefoot; strand ${brep.bandLen[0]} cm at the shoulder`); set('Band', 'peak', `Strand ${brep.bandLen[1]} cm overhead; at least ${r1(brep.band.d)} cm from the body (closest at the ${brep.band.id.replace('_r', '')})`);
console.log(`Band Single Arm Shoulder Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err: keys.err, ...rep, band: brep.band, len: brep.bandLen })}`);
