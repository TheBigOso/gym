// Band Alternating Front Raise (GymVisual #25614, Band Alternating Front Raise; movement reference only, the page could not
// be read here, so the movement follows the name): standing tall on the middle of the band, feet about hip width (planted
// leg contacts), knees soft, one band end under the ball of each foot. Hands in front of the thighs, palms facing the
// thighs, elbows soft. The right arm rises straight forward, palms down, to shoulder height and lowers slowly while the
// left hand stays at the thigh; then the left arm does the same. Both sides in one loop (bilateral, alternating). Arm path
// as the dumbbell front raise.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F3 = require('./families/b3-shoulders');
const S2 = require('./families/b4-shoulders2');
const B = require('./families/b5-bandpull');
const CB = require('./families/eq-cable');
const F = require('./families/b6-11');
const meta = require('./meta/band-alternating-front-raise.json');

const base = F3.standing({ stance: 12, knee: 6 });
const PLANE = 80, D2R = Math.PI / 180; // hands about shoulder width (just outside the flexion plane)
const palmFor = (elev, plane) => { const e = elev * D2R, p = plane * D2R; return [-Math.cos(e) * Math.sin(p), -Math.sin(e), -Math.cos(e) * Math.cos(p)]; };
const key = (name, f) => { const elev = 20 + (88 - 20) * f; return { name, plane: PLANE, elev, axial: -60, flex: 10, pron: 160, palm: palmFor(elev, PLANE), sc: { protract: r1(2 + 4 * f), elevate: r1(4 * f * f) } }; };
const { poses: A, err } = F3.armKeys(base.pose, [key('bottom', 0), key('r25', 0.25), key('r50', 0.5), key('r75', 0.75), key('top', 1)], base.contacts);
// right arm from A[k] with the left hand at the thigh, and the mirror
const poses = { bottom: A.bottom };
for (const k of ['r25', 'r50', 'r75', 'top']) { poses[`R_${k}`] = S2.combine(A.bottom, A[k], A.bottom); poses[`L_${k}`] = S2.combine(A.bottom, A.bottom, A[k]); }
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const side = (s, up, top, down) => [{ t: up.start, pose: 'bottom' }, { t: up.start + 0.45, pose: `${s}_r25` }, { t: up.start + 0.9, pose: `${s}_r50` }, { t: up.start + 1.35, pose: `${s}_r75` }, { t: top.start, pose: `${s}_top` },
  { t: top.end, pose: `${s}_top` }, { t: top.end + 0.5, pose: `${s}_r75` }, { t: top.end + 1.0, pose: `${s}_r50` }, { t: top.end + 1.5, pose: `${s}_r25` }, { t: down.end, pose: 'bottom' }];
const keyframes = [{ t: 0, pose: 'bottom' }, ...side('R', ph.raiseR, ph.topR, ph.lowerR), ...side('L', ph.raiseL, ph.topL, ph.lowerL), { t: D, pose: 'bottom' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = B.feetBands();
const rep = F.feetScan(ex);
B.gate('band-alternating-front-raise', rep, { minLine: 0.3 });
CB.limits(poses);
const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.R_top, base.contacts);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const set = H.setKin(ex);
set('Shoulder flexion', 'setup', `≈${Math.round(S2.humElev(Wb))}° (hands just in front of the thighs)`); set('Shoulder flexion', 'peak', `≈${Math.round(S2.humElev(Wt))}° (hand at shoulder height; the other arm stays down)`);
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}°`);
set('Grip', 'setup', 'palms facing the thighs'); set('Grip', 'peak', 'palm down');
set('Trunk', 'setup', 'upright, knees soft'); set('Trunk', 'peak', 'unchanged (no lean back or twist)');
F.bandRow(ex, `One band per hand, under the ball of each foot; strand ${rep.strand[0]} cm at the thigh`, `Strand ${rep.strand[1]} cm at shoulder height (most stretch, most tension)`);
set('Tempo', 'setup', 'Pause 0.6 s at the thighs'); set('Tempo', 'peak', 'Each arm 1.8 s up, 0.3 s at the top, 1.8 s down');
console.log(`Band Alternating Front Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, ...rep })}`);
