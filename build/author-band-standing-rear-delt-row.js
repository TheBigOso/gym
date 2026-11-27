// Band Standing Rear Delt Row (GymVisual, Band standing rear delt row; movement reference only): standing tall facing a
// power rack, feet about hip width (planted leg contacts), knees soft. A band is looped round the rack's upright at
// shoulder height; the hands hold the two strands with an overhand grip (palms down), arms reaching toward the upright.
// The elbows pull back wide, a little below shoulder height (upper arms about 80 degrees from the trunk), the forearms
// staying in line with the band, until the upper arms are a little behind the shoulders and the elbows are bent about 90
// degrees, the shoulder blades squeezing together; then a slow return. No turn-out at the end (that is the face pull).
// Bilateral (right arm solved, left mirrored). 1.2 s pull, 0.5 s squeeze, 2 s back, 0.6 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const C = require('./families/eq-cable');
const B = require('./families/b5-bandpull');
const meta = require('./meta/band-standing-rear-delt-row.json');

const st = F.standing({ stance: 12, knee: 6 });
const S0 = L.fk(st.pose, st.contacts).shoulder_r.p;
const AY = +(process.env.AY ?? r1(S0[1])), AX = +(process.env.AX ?? 112);  // anchor on the upright at shoulder height
const RK = B.rackAnchor({ x: r1(S0[0] + AX), y: AY });
const ANCHOR = RK.anchor;
const U0 = V.norm(V.sub(ANCHOR, S0).map((v, i) => (i === 2 ? v + 30 : i === 1 ? v - 6 : v))), U1 = V.norm([-0.2, -0.17, 1]);
const PALM = [0, -1, 0], FMIX = +(process.env.FMIX ?? 0.7); // late in the row the forearms point more straight ahead (hands about shoulder width)
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {}, err = {};
let g = { plane: 75, elev: 90, axial: 0, flex: 15, pron: 170 };
FS.forEach((f, i) => {
  const e = B.ease(f);
  const q = B.armFrom(st.pose, st.contacts, { sc: { protract: r1(6 - 20 * e), elevate: r1(1 * e) }, u: B.slerp(U0, U1, e), fTo: ANCHOR, f: [1, -0.05, 0], fMix: FMIX * e, palm: PALM, guess: g });
  err[`p${i}`] = q.__err; g = F.armGuess(q); poses[`p${i}`] = F.mirrorArm(q);
});
const N = FS.length - 1;
poses.squeeze = clone(poses[`p${N}`]); poses.squeeze.ch.sc_r.protract = poses.squeeze.ch.sc_l.protract = r1(poses[`p${N}`].ch.sc_r.protract - 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const tAt = (a, b, f) => +(a + (b - a) * f).toFixed(3);
const keyframes = [{ t: 0, pose: 'p0' }, { t: ph.pull.start, pose: 'p0' }];
FS.slice(1).forEach((f, i) => keyframes.push({ t: tAt(ph.pull.start, ph.pull.end, f), pose: `p${i + 1}` }));
keyframes.push({ t: ph.squeeze.end, pose: 'squeeze' });
[...FS].reverse().slice(1).forEach((f, i) => keyframes.push({ t: tAt(ph.return.start, ph.return.end, 1 - f), pose: `p${N - 1 - i}` }));
keyframes.push({ t: D, pose: 'p0' });

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [RK.rack, RK.band];
const rep = B.scan(ex, { strands: B.rackStrands(ANCHOR) });
B.gate('band-standing-rear-delt-row', rep, { minLine: 1 });
C.limits(poses);

const Wb = L.fk(poses.p0, st.contacts), Wt = L.fk(poses[`p${N}`], st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const flare = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const hAbd = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
set('Elbow flare', 'setup', `Arms reaching to the upright, ${d(flare(Wb))} from the trunk`); set('Elbow flare', 'peak', `Upper arm ${d(flare(Wt))} from the trunk, elbow ${Math.round(S0[1] - Wt.elbow_r.p[1])} cm below the shoulder joint`);
set('Horizontal abduction', 'setup', `Upper arm ${d(hAbd(Wb))} in front of the frontal plane`); set('Horizontal abduction', 'peak', `Upper arm ${d(Math.abs(hAbd(Wt)))} ${hAbd(Wt) < 0 ? 'behind' : 'in front of'} the frontal plane`);
set('Elbow flexion', 'setup', d(C.elbowAng(Wb))); set('Elbow flexion', 'peak', d(C.elbowAng(Wt)));
set('Grip', 'setup', 'Overhand, palms down'); set('Grip', 'peak', 'Unchanged');
set('Band', 'setup', `Looped round the upright ${ANCHOR[1]} cm high (shoulder height), ${Math.round(ANCHOR[0] - S0[0])} cm in front of the shoulders; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm`);
set('Tempo', 'setup', 'Pause 0.6 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.5 s squeeze, 2 s back');
console.log(`Band Standing Rear Delt Row: wrote ${L.write(ex)}\n  anchor ${ANCHOR} keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
