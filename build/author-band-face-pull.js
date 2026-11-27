// Band Face Pull (GymVisual, Band Face Pull; movement reference only): standing tall facing a power rack, feet about hip
// width (planted leg contacts), knees soft. A band is looped round the rack's upright at about face height, and the hands
// hold the two strands, overhand, arms reaching toward the upright at a little above shoulder height. The elbows pull
// back and out, high (about shoulder height), the forearms staying in line with the band, until the hands reach the
// sides of the face; the shoulders then turn out so the forearms point up (hands beside the ears, palms forward), the
// shoulder blades squeezing together. Slow return to straight arms. Bilateral (right arm solved, left mirrored).
// 1.2 s pull, 0.5 s hold, 2 s back, 0.6 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const C = require('./families/eq-cable');
const B = require('./families/b5-bandpull');
const meta = require('./meta/band-face-pull.json');

const st = F.standing({ stance: 12, knee: 6 });
const S0 = L.fk(st.pose, st.contacts).shoulder_r.p;
const AY = +(process.env.AY ?? 152), AX = +(process.env.AX ?? 112);       // anchor on the upright: about face height, ~1 m ahead
const RK = B.rackAnchor({ x: r1(S0[0] + AX), y: AY });
const ANCHOR = RK.anchor;
// upper arm: from reaching toward the upright to out to the side at shoulder height, a little behind the frontal plane
const U0 = V.norm(V.sub(ANCHOR, S0).map((v, i) => (i === 2 ? v + 30 : v))), U1 = V.norm([-0.2, 0.06, 1]);
// forearm: in line with the band until late in the pull, then turned up (external rotation) for the finish
const F1 = V.norm([0.4, 1, -0.08]);
const PALM0 = [0, -1, 0], PALM1 = V.norm([1, -0.15, -0.25]);
const FS = [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1];
const poses = {}, err = {};
let g = { plane: 75, elev: 95, axial: 0, flex: 15, pron: 170 };
FS.forEach((f, i) => {
  const e = B.ease(f), rot = Math.max(0, (f - 0.55) / 0.45);
  const q = B.armFrom(st.pose, st.contacts, {
    sc: { protract: r1(6 - 20 * e), elevate: r1(2 * e) },
    u: B.slerp(U0, U1, e), fTo: ANCHOR, f: F1, fMix: B.ease(rot), flexCap: 0.3,
    palm: B.slerp(PALM0, PALM1, B.ease(rot)), guess: g,
  });
  err[`p${i}`] = q.__err; g = F.armGuess(q); poses[`p${i}`] = F.mirrorArm(q);
});
poses.hold = clone(poses.p6); poses.hold.ch.sc_r.protract = poses.hold.ch.sc_l.protract = r1(poses.p6.ch.sc_r.protract - 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const tAt = (a, b, f) => +(a + (b - a) * f).toFixed(3);
const keyframes = [{ t: 0, pose: 'p0' }, { t: ph.pull.start, pose: 'p0' }];
FS.slice(1).forEach((f, i) => keyframes.push({ t: tAt(ph.pull.start, ph.pull.end, f), pose: `p${i + 1}` }));
keyframes.push({ t: ph.hold.end, pose: 'hold' });
[...FS].reverse().slice(1).forEach((f, i) => keyframes.push({ t: tAt(ph.return.start, ph.return.end, 1 - f), pose: `p${FS.length - 2 - i}` }));
keyframes.push({ t: D, pose: 'p0' });

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [RK.rack, RK.band];
const rep = B.scan(ex, { strands: B.rackStrands(ANCHOR) });
B.gate('band-face-pull', rep, { minLine: 1 });
C.limits(poses);

const Wb = L.fk(poses.p0, st.contacts), Wt = L.fk(poses.p6, st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const hAbd = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
const foreUp = (W) => V.angle(V.sub(W.wrist_r.p, W.elbow_r.p), [0, 1, 0]);
set('Elbow height', 'setup', `Arms reaching to the upright, ${d(elevOf(Wb))} of elevation`); set('Elbow height', 'peak', `${d(elevOf(Wt))} of elevation, elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint`);
set('Horizontal abduction', 'setup', `Upper arm ${d(hAbd(Wb))} in front of the frontal plane`); set('Horizontal abduction', 'peak', `Upper arm ${d(Math.abs(hAbd(Wt)))} ${hAbd(Wt) < 0 ? 'behind' : 'in front of'} the frontal plane`);
set('External rotation', 'setup', `Forearm in line with the band (${d(foreUp(Wb))} from vertical)`); set('External rotation', 'peak', `Forearm ${d(foreUp(Wt))} from vertical, hands beside the face (${Math.round(Wt.wrist_r.p[1] - Wt.head_c1.p[1])} cm vs the top of the neck)`);
set('Elbow flexion', 'setup', d(C.elbowAng(Wb))); set('Elbow flexion', 'peak', d(C.elbowAng(Wt)));
set('Band', 'setup', `Looped round the upright ${ANCHOR[1]} cm high, ${Math.round(ANCHOR[0] - S0[0])} cm in front of the shoulders; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm, clear of the face by ${rep.line.d} cm or more`);
set('Tempo', 'setup', 'Pause 0.6 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.5 s hold, 2 s back');
console.log(`Band Face Pull: wrote ${L.write(ex)}\n  anchor ${ANCHOR} keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
