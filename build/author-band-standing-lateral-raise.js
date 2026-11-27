// Band Standing Lateral Raise (GymVisual, Standing Lateral Raise with Band; movement reference only): standing tall on the
// band, feet about hip width (planted leg contacts), knees soft. One band per hand, each looped under the ball of its own
// foot (anchorJoint toe_r / toe_l). The hands start beside the front of the thighs, palms in, elbows soft; the arms rise
// out to the sides in the scapular plane (30 degrees in front of the frontal plane) to about shoulder height with the
// thumbs forward, then lower slowly against the band. Same arm path as the dumbbell lateral raise, but the hands start a
// little wider so the strands run from the feet outside the thighs. 1.8 s up, 0.4 s pause, 2 s down. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const C = require('./families/eq-cable');
const B = require('./families/b5-bandpull');
const meta = require('./meta/band-standing-lateral-raise.json');

const st = F.standing({ stance: 12, knee: 6 });
const PLANE = 30, E0 = Number(process.env.E0 ?? 12), E1 = 86;
const key = (name, f) => { const elev = E0 + (E1 - E0) * f; return { name, plane: PLANE, elev, axial: -20, flex: 14 + 4 * f, pron: 90, palm: S.palmDown(elev, PLANE), sc: { protract: r1(2 + 2 * f), elevate: r1(6 * f * f) } }; };
const FS = { bottom: 0, r25: 0.25, r50: 0.5, r75: 0.75, top: 1 };
const { poses, err } = F.armKeys(st.pose, Object.entries(FS).map(([n, f]) => key(n, f)), st.contacts);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }, { t: 1.05, pose: 'r25' }, { t: 1.5, pose: 'r50' }, { t: 1.95, pose: 'r75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'top' }, { t: 3.3, pose: 'r75' }, { t: 3.8, pose: 'r50' }, { t: 4.3, pose: 'r25' }, { t: ph.reset.start, pose: 'bottom' }, { t: D, pose: 'bottom' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = B.feetBands();
// the strands run from the balls of the feet to the hands; the feet (under the band) and the hands are skipped
const rep = B.scan(ex, { strands: B.feetStrands, skip: /^(hand|thumb|forearm|foot)_/ });
B.gate('band-standing-lateral-raise', rep, { minLine: 0.3 });
C.limits(poses);

const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex);
set('Shoulder abduction', 'setup', `≈${Math.round(S.humElev(Wb))}° (hands just outside the thighs)`); set('Shoulder abduction', 'peak', `≈${Math.round(S.humElev(Wt))}° (elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint)`);
set('Plane of elevation', 'setup', `≈${Math.round(S.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(S.planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Band', 'setup', `Under the balls of the feet; strand ${rep.strand[0]} cm`); set('Band', 'peak', `Strand ${rep.strand[1]} cm at the top (most stretch, most tension)`);
set('Tempo', 'setup', 'Pause 0.6 s at the sides'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Band Standing Lateral Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
