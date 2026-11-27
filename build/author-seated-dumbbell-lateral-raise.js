// Seated Dumbbell Lateral Raise (GymVisual #039612): seated tall on the end of a flat bench (no back support), thighs on the
// seat, feet flat and a little wider than the hips (planted leg contacts). Dumbbells hang beside the bench, palms in, elbows
// soft; the arms rise out to the sides in the scapular plane (30 degrees in front of the frontal plane) to about shoulder
// height with the thumbs forward: 1.8 s up, 0.4 s pause, 2 s down (Coratella 2020 used 2-0.5-2). Bilateral, handle grip.
// The rig is lowered SEAT_DROP cm so the skinned buttocks and thighs rest on the seat (measured with b2/b3sh_mesh.mjs).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/seated-dumbbell-lateral-raise.json');

const base = S.benchEnd({ pitchAdj: -6, footAhead: -8, seatDrop: Number(process.env.SEAT_DROP ?? 3.0) });
const PLANE = 30, E0 = Number(process.env.E0 ?? 22);
const key = (name, f) => { const elev = E0 + (86 - E0) * f, plane = PLANE - 14 * (1 - f); return { name, plane, elev, axial: -20, flex: 14 + 4 * f, pron: 90, palm: S.palmDown(elev, plane), sc: { protract: r1(2 + 2 * f), elevate: r1(6 * f * f) } }; };
const { poses, err } = F.armKeys(base.pose, [key('bottom', 0), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], base.contacts);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }, { t: 1.05, pose: 'r25' }, { t: 1.5, pose: 'r50' }, { t: 1.95, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, ...F.DUMBBELLS];
const box = { center: base.bench.prop.center, size: base.bench.prop.size };
const rep = S.scan(ex, { box });
F.gate('seated-dumbbell-lateral-raise', rep, { minClear: 0.5 });
const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts), set = H.setKin(ex);
const tf = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(tf - 3)), max: Math.ceil(tf + 3) };
set('Shoulder abduction', 'setup', `≈${Math.round(S.humElev(Wb))}° (dumbbells clear of the bench)`); set('Shoulder abduction', 'peak', `≈${Math.round(S.humElev(Wt))}° (elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint)`);
set('Plane of elevation', 'setup', `≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Seat', 'setup', `bench end, seat 45 cm; trunk ≈${Math.round(tf)}° forward of vertical, knees ≈${Math.round(H.kneeOf(Wb, 'r'))}°`); set('Seat', 'peak', 'unchanged (no rocking)');
set('Tempo', 'setup', 'Pause 0.6 s at the bottom'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Seated Dumbbell Lateral Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, bench: base.bench.prop.center, root: base.pose.root, ...rep })}`);
