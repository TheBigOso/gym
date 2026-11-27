// Standing Dumbbell Overhead Press (GymVisual #042612): standing tall, feet about hip width (planted leg contacts), knees
// soft. Dumbbells at shoulder height with the elbows under the wrists and a little in front of the body (scapular plane),
// palms forward; press up and slightly in to nearly straight arms (about 1.5 s), short pause, lower in about 2 s.
// Bilateral, a dumbbell in each hand (handle grip). Press path shared with the seated press (family b4-shoulders2.js).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/standing-dumbbell-overhead-press.json');

const base = F.standing({ stance: 12, knee: 6 });
base.pose.ch.spine_l5 = { rot: 0, flex: 1, latFlex: 0 }; // ribs down: no extra lumbar arch
const { poses, err } = S.pressKeys(base.pose, { bottom: 0, p25: 0.25, p50: 0.5, p75: 0.75, top: 1 }, { plane: 30, elev0: 82 });
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = poses.topHold.ch.elbow_l.flex = r1(poses.top.ch.elbow_r.flex + 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.press.start, pose: 'bottom' }, { t: 1.2, pose: 'p25' }, { t: 1.55, pose: 'p50' }, { t: 1.9, pose: 'p75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'topHold' }, { t: 3.25, pose: 'p75' }, { t: 3.75, pose: 'p50' }, { t: 4.2, pose: 'p25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = S.scan(ex);
F.gate('standing-dumbbell-overhead-press', rep);

const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts), set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(S.humElev(Wb))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(S.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°, forearm vertical`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}° (nearly straight)`);
set('Plane of elevation', 'setup', `elbows ≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Trunk', 'setup', `upright, knees ≈${Math.round(H.kneeOf(Wb, 'r'))}°`); set('Trunk', 'peak', 'unchanged (no lean back, no leg drive)');
set('Tempo', 'setup', 'Pause 0.8 s at the shoulders'); set('Tempo', 'peak', '1.5 s up, 0.4 s at the top, 2.0 s down');
console.log(`Standing Dumbbell Overhead Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
