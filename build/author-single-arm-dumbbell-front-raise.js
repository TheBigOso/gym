// Single-Arm Dumbbell Front Raise (GymVisual #391312): standing tall, feet about hip width (planted leg contacts), knees soft,
// left hand on the hip. The dumbbell starts in front of the right thigh, palm facing the thigh; the arm rises straight
// forward, palm down, elbow soft, to shoulder height: 1.8 s up, 0.4 s pause, 2 s down (Coratella 2020 used 2-0.5-2).
// Authored right (the player mirrors), one dumbbell (handle grip).
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/single-arm-dumbbell-front-raise.json');

const st = F.standing({ stance: 12, knee: 6 });
const base = S.leftOnHip(st.pose);
const PLANE = 80; // hand about in line with the shoulder
const key = (name, f) => { const elev = 20 + (88 - 20) * f; return { name, plane: PLANE, elev, axial: -60, flex: 10, pron: 160, palm: S.palmDown(elev, PLANE), sc: { protract: r1(2 + 4 * f), elevate: r1(4 * f * f) } }; };
const { poses: raw, err } = F.armKeys(base, [key('bottom', 0), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], st.contacts);
const keepLeft = (p) => { const q = clone(p); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) q.ch[`${j}_l`] = clone(base.ch[`${j}_l`]); delete q.__err; return q; };
const poses = Object.fromEntries(Object.entries(raw).map(([k, p]) => [k, keepLeft(p)]));
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }, { t: 1.05, pose: 'r25' }, { t: 1.5, pose: 'r50' }, { t: 1.95, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = S.handProps(['r']);
const rep = S.scan(ex, { sides: ['r'] });
F.gate('single-arm-dumbbell-front-raise', rep);

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex);
set('Shoulder flexion', 'setup', `≈${Math.round(S.humElev(Wb))}° (dumbbell just in front of the thigh)`); set('Shoulder flexion', 'peak', `≈${Math.round(S.humElev(Wt))}° (hand at shoulder height)`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Grip', 'setup', 'palm facing the thigh'); set('Grip', 'peak', 'palm down');
set('Trunk', 'setup', 'upright, left hand on the hip'); set('Trunk', 'peak', 'unchanged (no lean back or twist)');
set('Tempo', 'setup', 'Pause 0.6 s at the thigh'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Single-Arm Dumbbell Front Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
