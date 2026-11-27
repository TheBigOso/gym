// Seated Dumbbell Front Raise (GymVisual #039212): seated tall on the end of a flat bench (no back support), thighs on the
// seat, feet flat (planted leg contacts). Dumbbells hang beside the bench, palms in, elbows soft. Both arms rise forward:
// they leave the sides a little outside the thighs and come in to shoulder width over the knees as they rise, palms turning
// down, to shoulder height: 1.8 s up, 0.4 s pause, 2 s down (Coratella 2020 used 2-0.5-2). Bilateral, handle grip.
// Seat placement as for the seated lateral raise (skinned mesh on the seat, b2/b3sh_mesh.mjs).
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/seated-dumbbell-front-raise.json');

const base = S.benchEnd({ pitchAdj: -6, footAhead: -8, seatDrop: Number(process.env.SEAT_DROP ?? 3.0) });
const E0 = Number(process.env.E0 ?? 22), P0 = Number(process.env.P0 ?? 18), P1 = 80;
const sm = (x) => x * x * (3 - 2 * x);
// plane swings in from beside the hips to straight forward over the first ~60% of the lift (dumbbells clear the thighs)
const key = (name, f) => {
  const elev = E0 + (88 - E0) * f, w = sm(Math.min(1, f / 0.6)), plane = P0 + (P1 - P0) * w;
  return { name, plane, elev, axial: -20 - 40 * w, flex: 12 - 2 * f, pron: 90 + 70 * w, palm: S.palmDown(elev, plane), sc: { protract: r1(2 + 4 * f), elevate: r1(4 * f * f) } };
};
const { poses, err } = F.armKeys(base.pose, [key('bottom', 0), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], base.contacts);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }, { t: 1.05, pose: 'r25' }, { t: 1.5, pose: 'r50' }, { t: 1.95, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, ...F.DUMBBELLS];
const box = { center: base.bench.prop.center, size: base.bench.prop.size };
const rep = S.scan(ex, { box });
F.gate('seated-dumbbell-front-raise', rep, { minClear: 0.5 });
const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts), set = H.setKin(ex);
const tf = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(tf - 3)), max: Math.ceil(tf + 3) };
set('Shoulder flexion', 'setup', `≈${Math.round(S.humElev(Wb))}° (dumbbells beside the bench)`); set('Shoulder flexion', 'peak', `≈${Math.round(S.humElev(Wt))}° (hands at shoulder height, ${Math.round(Wt.wrist_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint)`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Grip', 'setup', 'palms in'); set('Grip', 'peak', `palms down, hands ${Math.round(2 * Wt.wrist_r.p[2])} cm apart`);
set('Seat', 'setup', `bench end, seat 45 cm; trunk ≈${Math.round(tf)}° forward of vertical, knees ≈${Math.round(H.kneeOf(Wb, 'r'))}°`); set('Seat', 'peak', 'unchanged (no rocking back)');
set('Tempo', 'setup', 'Pause 0.6 s at the bottom'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Seated Dumbbell Front Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
