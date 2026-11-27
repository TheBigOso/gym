// Plank Jack (GymVisual #393012). Bilateral: high plank, hands planted under the shoulders (palms flat, planted contacts),
// body in one line on the balls of the feet. Hop both feet out to about twice hip width and back in, like a jumping jack,
// while the hips stay level and the hands do not move. The feet are planted (weight 1, constant targets) while on the
// floor and released (weight 0) for the short flight; the leg channels are fitted to each landing so the blends are
// seamless. Built on the push-up family (push.js): the same plank solve with two foot widths.
const L = require('./lib');
const { V, r1, clone } = L;
const { makePush } = require('./families/push');
const meta = require('./meta/plank-jack.json');

const HAND_X = 46, HAND_Z = 22, IN_Z = 8, OUT_Z = +(process.env.OUT_Z || 30), HOP = 0, TOE_CLEAR = 2.5;
const FI = makePush({ handY: 0, handZ: HAND_Z, ankleZ: IN_Z, footTilt: -8, flarePole: [-1, 0.4, 0.45] });
const FO = makePush({ handY: 0, handZ: HAND_Z, ankleZ: OUT_Z, footTilt: -8, flarePole: [-1, 0.4, 0.45] });
const contacts = FI.contacts;
const pin = FI.key(HAND_X, { armD: L.reach(8), u: 0 }).pose;
const pout = FO.key(HAND_X, { armD: L.reach(8), u: 0 }).pose;
const legs = (p, w) => { const q = clone(p); q.ik.leg_r.weight = w; q.ik.leg_l.weight = w; return q; };
// Released copies: same channels (fitted to the planted legs) and target, weight 0.
const inOff = legs(pin, 0), outOff = legs(pout, 0);
// Mid-flight: channels halfway between the two landings; hips and knees flex a little so the toes clear the floor.
function air(from, to, s) {
  const q = clone(from);
  for (const j of Object.keys(from.ch)) for (const c of Object.keys(from.ch[j])) if (to.ch[j] && typeof to.ch[j][c] === 'number') q.ch[j][c] = r1((from.ch[j][c] + to.ch[j][c]) / 2);
  q.root.pos = from.root.pos.map((v, i) => r1((v + to.root.pos[i]) / 2 + (i === 1 ? HOP : 0)));
  q.root.rot.pitch = r1((from.root.rot.pitch + to.root.rot.pitch) / 2);
  q.ik = clone(s.ik);
  for (const sd of ['r', 'l']) { q.ik[`leg_${sd}`].weight = 0; q.ch[`hip_${sd}`].flex = r1(q.ch[`hip_${sd}`].flex + 6); q.ch[`knee_${sd}`].flex = r1(q.ch[`knee_${sd}`].flex + 14); }
  return q;
}
const poses = { in: pin, inOff, outOff, out: pout, airOut: air(pin, pout, outOff), airIn: air(pout, pin, inOff) };
// keep the toes clear of the floor in flight (the hands stay planted, so the hips cannot hop): flex the knees a bit more
for (const n of ['airOut', 'airIn']) for (let i = 0; i < 20; i++) {
  const W = L.fk(poses[n], contacts), toe = Math.min(W.toe_r.p[1], W.toe_l.p[1]);
  if (toe >= TOE_CLEAR) break;
  for (const sd of ['r', 'l']) poses[n].ch[`knee_${sd}`].flex = r1(poses[n].ch[`knee_${sd}`].flex + 2);
}
// timeline: plank 0.5 s, then four jacks; each foot contact ~0.32 s, each flight ~0.14 s
const keyframes = [{ t: 0, pose: 'in' }, { t: 0.5, pose: 'in' }];
let t = 0.5;
const push = (dt, pose) => { t = +(t + dt).toFixed(3); keyframes.push({ t, pose }); };
for (let i = 0; i < 4; i++) {
  push(0.04, 'inOff'); push(0.08, 'airOut'); push(0.08, 'outOff'); push(0.04, 'out'); push(0.26, 'out');
  push(0.04, 'outOff'); push(0.08, 'airIn'); push(0.08, 'inOff'); push(0.04, 'in'); if (i < 3) push(0.26, 'in');
}
push(0.5, 'in');
const D = t;
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: Object.assign(clone(meta.timeline), { duration: D }), poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
if (Math.abs(D - meta.timeline.duration) > 1e-6) throw new Error(`timeline ${D} s differs from the meta (${meta.timeline.duration} s)`);

// loop scan: planted slides (only while weight 1), floor, hip height range, toe clearance in flight
const CA = require('./families/core-a');
const rep = CA.scan(ex, { hipY: (W) => W.pelvis.p[1], feetW: (W) => W.ankle_r.p[2] - W.ankle_l.p[2], toe: (W) => Math.min(W.toe_r.p[1], W.toe_l.p[1]) });
const si = FI.stats(pin), so = FO.stats(pout), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`;
const Wi = L.fk(pin, contacts), Wo = L.fk(pout, contacts);
const legAbd = (W) => V.angle(V.sub(W.ankle_r.p, W.hip_r.p), V.sub(W.ankle_l.p, W.hip_l.p));
kin[0].setup = `Trunk ${d(si.bodyAng)} above horizontal, trunk-to-leg bend ${si.bend.toFixed(1)}°`; kin[0].peak = `Feet out: trunk ${d(so.bodyAng)}, bend ${so.bend.toFixed(1)}°; pelvis height ${r1(rep.hipY[0])}-${r1(rep.hipY[1])} cm`;
kin[1].setup = `Feet ${2 * IN_Z} cm apart (ankles)`; kin[1].peak = `${2 * OUT_Z} cm apart; legs ${d(legAbd(Wo))} apart (from ${d(legAbd(Wi))})`;
kin[2].setup = `Hands ${2 * HAND_Z} cm apart under the shoulders, elbows ${d(si.elbow)}`; kin[2].peak = `Unchanged (planted); elbows ${d(so.elbow)}`;
kin[3].setup = 'On the balls of the feet'; kin[3].peak = `Toes ${r1(rep.toe[1])} cm off the floor at most in flight`;
kin[4].setup = 'Plank 0.5 s'; kin[4].peak = '4 jacks in 3.7 s: about 0.32 s per landing, 0.14 s per hop';
console.log(`Plank jack: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  in: elbow ${si.elbow.toFixed(0)} body ${si.bodyAng.toFixed(1)} knee ${si.knee.toFixed(0)} dorsi ${si.dorsi.toFixed(0)} | out: elbow ${so.elbow.toFixed(0)} body ${so.bodyAng.toFixed(1)} knee ${so.knee.toFixed(0)} dorsi ${so.dorsi.toFixed(0)} hipAbd ${pout.ch.hip_r.abd}`);
CA.guard('plank-jack', rep, [rep.toe[0] < -0.5 && 'toes through the floor']);
