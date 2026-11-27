// Dumbbell Front Raise (GymVisual #031012): standing tall, feet about hip width (planted leg contacts), knees soft,
// dumbbells in front of the thighs with palms facing the thighs. Both arms rise together straight forward, palms down,
// elbows soft, to shoulder height: 1.8 s up, 0.4 s pause, 2 s down (Coratella 2020 used 2-0.5-2). Bilateral, a dumbbell in
// each hand (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const meta = require('./meta/dumbbell-front-raise.json');

const base = F.standing({ stance: 12, knee: 6 });
const PLANE = 80, D2R = Math.PI / 180; // hands about shoulder width (just outside the flexion plane)
const palmFor = (elev, plane) => { const e = elev * D2R, p = plane * D2R; return [-Math.cos(e) * Math.sin(p), -Math.sin(e), -Math.cos(e) * Math.cos(p)]; };
const key = (name, f) => { const elev = 20 + (88 - 20) * f; return { name, plane: PLANE, elev, axial: -60, flex: 10, pron: 160, palm: palmFor(elev, PLANE), sc: { protract: r1(2 + 4 * f), elevate: r1(4 * f * f) } }; };
const { poses, err } = F.armKeys(base.pose, [key('bottom', 0), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], base.contacts);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.6, pose: 'bottom' }, { t: 1.05, pose: 'r25' }, { t: 1.5, pose: 'r50' }, { t: 1.95, pose: 'r75' }, { t: 2.4, pose: 'top' },
  { t: 2.8, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: 4.8, pose: 'bottom' }, { t: 5.4, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = F.scan(ex);
F.gate('dumbbell-front-raise', rep);

const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const humElev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const set = H.setKin(ex);
set('Shoulder flexion', 'setup', `≈${Math.round(humElev(Wb))}° (dumbbells just in front of the thighs)`); set('Shoulder flexion', 'peak', `≈${Math.round(humElev(Wt))}° (hands at shoulder height)`);
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}°`);
set('Grip', 'setup', 'palms facing the thighs'); set('Grip', 'peak', 'palms down');
set('Trunk', 'setup', 'upright, knees soft'); set('Trunk', 'peak', 'unchanged (no lean back)');
set('Tempo', 'setup', 'Pause 0.6 s at the thighs'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Dumbbell Front Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
