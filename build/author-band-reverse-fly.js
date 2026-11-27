// Band Reverse Fly (GymVisual, Band Reverse fly; movement reference only): standing tall facing a power rack, feet about
// hip width (planted leg contacts), knees soft. A band is looped round the rack's upright at shoulder height; the hands
// hold the two strands with a neutral grip (palms facing each other), arms straight out in front at shoulder height,
// hands a little narrower than the shoulders. The straight arms sweep out and back (horizontal abduction) to a T, in line
// with the shoulders, palms turning to face forward, the shoulder blades squeezing; then a slow return. Unlike the
// pull-apart, the band pulls from the front (anchored), so the load stays on the rear deltoids through the whole arc.
// Bilateral (right arm solved, left mirrored). 1 s out, 0.5 s squeeze, 1.8 s back, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const C = require('./families/eq-cable');
const B = require('./families/b5-bandpull');
const meta = require('./meta/band-reverse-fly.json');

const st = F.standing({ stance: 12, knee: 6 });
const S0 = L.fk(st.pose, st.contacts).shoulder_r.p;
const AX = +(process.env.AX ?? 120), RK = B.rackAnchor({ x: r1(S0[0] + AX), y: r1(S0[1]) });
const ANCHOR = RK.anchor;
const P0 = +(process.env.P0 ?? 82), P1 = +(process.env.P1 ?? 10), ELEV = 86, FLEX = 6, PROT0 = 6, PROT1 = -14;
const D2R = Math.PI / 180;
// neutral grip: the palm faces the midline in front and turns to face forward at the T
const palmFor = (plane) => [Math.cos(plane * D2R), 0, -Math.sin(plane * D2R)];
const keyAt = (name, f) => { const plane = P0 + (P1 - P0) * f; return { name, plane, elev: ELEV, axial: 0, flex: FLEX, pron: 90, palm: palmFor(plane), sc: { protract: r1(PROT0 + (PROT1 - PROT0) * f), elevate: 0 } }; };
const FR = { start: 0, a25: 0.25, a50: 0.5, a75: 0.75, a90: 0.9, end: 1 };
const { poses, err } = F.armKeys(st.pose, Object.entries(FR).map(([n, f]) => keyAt(n, f)), st.contacts);
Object.values(poses).forEach((p) => delete p.__err);
poses.endHold = clone(poses.end);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'start' }, { t: ph.pull.start, pose: 'start' }, { t: 0.78, pose: 'a25' }, { t: 1.02, pose: 'a50' }, { t: 1.26, pose: 'a75' }, { t: 1.4, pose: 'a90' }, { t: ph.squeeze.start, pose: 'end' },
  { t: ph.squeeze.end, pose: 'endHold' }, { t: 2.3, pose: 'a90' }, { t: 2.6, pose: 'a75' }, { t: 3.05, pose: 'a50' }, { t: 3.45, pose: 'a25' }, { t: ph.reset.start, pose: 'start' }, { t: D, pose: 'start' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [RK.rack, RK.band];
const rep = B.scan(ex, { strands: B.rackStrands(ANCHOR) });
B.gate('band-reverse-fly', rep, { minLine: 1 });
C.limits(poses);

const Ws = L.fk(poses.start, st.contacts), We = L.fk(poses.end, st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const hAbd = (W) => { const u = V.sub(W.wrist_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const hands = (W) => Math.round(V.len(V.sub(W.wrist_r.p, W.wrist_l.p)));
set('Horizontal abduction', 'setup', `Arms ${d(hAbd(Ws))} in front of the frontal plane, wrists ${hands(Ws)} cm apart`); set('Horizontal abduction', 'peak', `Arms ${d(hAbd(We))} from the frontal plane (a T)`);
set('Arm height', 'setup', `${d(elevOf(Ws))} of elevation, hands at shoulder height`); set('Arm height', 'peak', d(elevOf(We)));
set('Elbow flexion', 'setup', d(C.elbowAng(Ws))); set('Elbow flexion', 'peak', d(C.elbowAng(We)));
set('Shoulder blades', 'setup', `Slightly forward (protraction ${PROT0}°)`); set('Shoulder blades', 'peak', `Squeezed together (retraction ${-PROT1}°)`);
set('Grip', 'setup', 'Neutral, palms facing each other'); set('Grip', 'peak', 'Palms facing forward at the T');
set('Band', 'setup', `Looped round the upright ${ANCHOR[1]} cm high (shoulder height), ${Math.round(ANCHOR[0] - S0[0])} cm in front of the shoulders; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at the T`);
set('Tempo', 'setup', 'Pause 0.5 s in front'); set('Tempo', 'peak', '1 s out, 0.5 s squeeze, 1.8 s back');
console.log(`Band Reverse Fly: wrote ${L.write(ex)}\n  anchor ${ANCHOR} keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
