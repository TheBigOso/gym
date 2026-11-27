// Band Seated Lateral Raise (GymVisual, Band Seated Lateral Raise; movement reference only): seated tall on the end of a
// flat bench (no back support), thighs on the seat, feet flat and a little wider than the hips (planted leg contacts). One
// band per hand, each looped under the ball of its own foot (anchorJoint toe_r / toe_l), so the strands run up from the
// feet outside the knees to the hands beside the bench. The arms rise out to the sides in the scapular plane (30 degrees in
// front of the frontal plane) to about shoulder height with the thumbs forward, then lower slowly against the band.
// Same seat and arm path as the seated dumbbell lateral raise. 1.8 s up, 0.4 s pause, 2 s down. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const C = require('./families/eq-cable');
const B = require('./families/b5-bandpull');
const meta = require('./meta/band-seated-lateral-raise.json');

const STANCE = +(process.env.ST ?? 22), FA = +(process.env.FA ?? -8);
const base = S.benchEnd({ footAhead: FA, stance: STANCE });
const PLANE = 30, E0 = +(process.env.E0 ?? 24), E1 = 86;
const key = (name, f) => { const elev = E0 + (E1 - E0) * f, plane = PLANE - 14 * (1 - f); return { name, plane, elev, axial: -20, flex: 14 + 4 * f, pron: 90, palm: S.palmDown(elev, plane), sc: { protract: r1(2 + 2 * f), elevate: r1(6 * f * f) } }; };
const { poses, err } = F.armKeys(base.pose, [key('bottom', 0), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], base.contacts);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }, { t: 1.05, pose: 'r25' }, { t: 1.5, pose: 'r50' }, { t: 1.95, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, ...B.feetBands()];
// hands and arms clear of the bench (the seated dumbbell module's check, with no dumbbells), strands clear of the body
const box = { center: base.bench.prop.center, size: base.bench.prop.size };
const sh = S.scan({ ...ex, props: [] }, { box });
const rep = B.scan(ex, { strands: B.feetStrands, skip: /^(hand|thumb|forearm|foot)_/ });
B.gate('band-seated-lateral-raise', rep, { minLine: 0.3 });
C.limits(poses);
const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts), set = H.setKin(ex);
const tf = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(tf - 3)), max: Math.ceil(tf + 3) };
set('Shoulder abduction', 'setup', `≈${Math.round(S.humElev(Wb))}° (hands beside the bench)`); set('Shoulder abduction', 'peak', `≈${Math.round(S.humElev(Wt))}° (elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint)`);
set('Plane of elevation', 'setup', `≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Seat', 'setup', `bench end, seat 45 cm; trunk ≈${Math.round(tf)}° forward of vertical, knees ≈${Math.round(H.kneeOf(Wb, 'r'))}°`); set('Seat', 'peak', 'unchanged (no rocking)');
set('Band', 'setup', `Under the balls of the feet, ${2 * STANCE} cm apart; strand ${rep.strand[0]} cm`); set('Band', 'peak', `Strand ${rep.strand[1]} cm at the top (most stretch, most tension)`);
set('Tempo', 'setup', 'Pause 0.6 s at the bottom'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Band Seated Lateral Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  bench ${JSON.stringify({ clear: sh.clear, jump: sh.jump })}\n  ${JSON.stringify(rep)}`);
