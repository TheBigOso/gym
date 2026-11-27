// Single-Arm Dumbbell Shoulder Press (GymVisual #036012): standing tall, feet about hip width (planted leg contacts), knees
// soft, left hand on the hip. One dumbbell at the right shoulder, palm forward, elbow under the wrist and a little in front
// (scapular plane); press up and slightly in to a nearly straight arm (about 1.5 s), short pause, lower in about 2 s.
// Authored right (the player mirrors), one dumbbell (handle grip). Press path from family b4-shoulders2.js.
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/single-arm-dumbbell-shoulder-press.json');

const st = F.standing({ stance: 12, knee: 6 });
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
ex.props = S.handProps(['r']);
const rep = S.scan(ex, { sides: ['r'] });
F.gate('single-arm-dumbbell-shoulder-press', rep);

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(S.humElev(Wb))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(S.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°, forearm vertical`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}° (nearly straight)`);
set('Plane of elevation', 'setup', `elbow ≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Trunk', 'setup', 'upright, left hand on the hip'); set('Trunk', 'peak', 'unchanged (no side lean)');
set('Tempo', 'setup', 'Pause 0.8 s at the shoulder'); set('Tempo', 'peak', '1.5 s up, 0.4 s at the top, 2.0 s down');
console.log(`Single-Arm Dumbbell Shoulder Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err: keys.err, ...rep })}`);
