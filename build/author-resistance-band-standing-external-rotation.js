// Resistance Band Standing External Rotation (GymVisual #18909, Resistance Band Standing External Rotation; movement
// reference only, the page could not be read here, so the movement follows the name and standard rehab coaching: the
// elbow-at-the-side version). Standing tall, feet hip width (planted leg contacts), side-on to a power rack: the band is
// looped round the near upright on the athlete's left at elbow height, the right hand holds the other end. The right
// upper arm stays by the side (elbow a fist's width from the ribs, bent 90 degrees, thumb up); the forearm swings out
// about the upper arm from across the front of the belly to about 50 degrees out to the side while the elbow stays put,
// then returns slowly against the band. The left arm hangs relaxed. 1.6 s out, 0.5 s hold, 2 s back. Authored right
// (the player mirrors for the left).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F3 = require('./families/b3-shoulders');
const B = require('./families/b5-bandpull');
const BC = require('./families/b5-bandcore');
const CB = require('./families/eq-cable');
const F = require('./families/b6-11');
const meta = require('./meta/resistance-band-standing-external-rotation.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const base = F3.standing({ stance: 12, knee: 6 });
const P0 = clone(base.pose);
P0.ch.sc_r = { protract: 0, elevate: 0 };
P0.ch.shoulder_l = { plane: 10, elev: 8, axial: 10 }; P0.ch.elbow_l = { flex: 12 }; P0.ch.wrist_l = { pron: 80, flex: 0, dev: 0 };
const D2R = Math.PI / 180, S = L.fk(P0, base.contacts).shoulder_r.p;
// upper arm hanging by the side, a little out (towel-roll gap) and a touch forward
const u = V.norm([ENV('UF', 0.05), -1, ENV('UO', 0.17)]), E = V.add(S, V.scale(u, L.UA - 0.05));
const fwd = V.norm(V.sub([1, 0, 0], V.scale(u, u[0]))), out = V.norm(V.cross(fwd, u)).map((v) => -v); // out: +Z side, perpendicular
const ROT = [ENV('R0', -40), -18, 5, 28, ENV('R1', 50)]; // forearm angle from straight ahead (deg, + = out to the side)
const poses = {}, err = {};
let g = { plane: 40, elev: 12, axial: 0, flex: 90, pron: 90 };
ROT.forEach((phi, i) => {
  const d = V.add(V.scale(fwd, Math.cos(phi * D2R)), V.scale(out, Math.sin(phi * D2R))), palm = V.norm(V.cross([0, 1, 0], d));
  const Wt = V.add(E, V.scale(d, L.FA - 0.3));
  const q = F3.solveArm(P0, { wrist: Wt, elbow: E, palm, wPalm: 5, guess: g });
  err[`r${i}`] = q.__err; delete q.__err; g = F3.armGuess(q); poses[`r${i}`] = q;
});
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), Dur = meta.timeline.duration;
const at = (p, k) => +(p.start + (p.end - p.start) * k).toFixed(2);
const keyframes = [{ t: 0, pose: 'r0' }, { t: ph.rotate.start, pose: 'r0' }, ...[1, 2, 3].map((i) => ({ t: at(ph.rotate, i / 4), pose: `r${i}` })), { t: ph.rotate.end, pose: 'r4' },
  { t: ph.lower.start, pose: 'r4' }, ...[3, 2, 1].map((i) => ({ t: at(ph.lower, (4 - i) / 4), pose: `r${i}` })), { t: ph.lower.end, pose: 'r0' }, { t: Dur, pose: 'r0' }];
// band round the rack's near upright on the left, at the height of the hand, a little in front of the hand's path
const W0 = L.fk(poses.r0, base.contacts), g0 = B.feetStrands(W0)[0][1];
const AX = r1(g0[0] + ENV('AXD', 4)), AZ = ENV('AZ', -62), AY = r1(g0[1]);
const rk = BC.uprightZ(AX, AZ, { toward: -1, hookY: 140 }), ANCHOR = rk.anchor(AY);
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [rk.prop, BC.band('band', { joint: 'wrist_r' }, ANCHOR)];
const STR = (W) => [[ANCHOR, B.feetStrands(W)[0][1]]];
const rep = B.scan(ex, { strands: STR });
B.gate('resistance-band-standing-external-rotation', rep, { minLine: 0.3 });
CB.limits(poses);
// the elbow stays put through the rotation
let elbowMove = 0; for (const k of Object.keys(poses)) elbowMove = Math.max(elbowMove, V.len(V.sub(L.fk(poses[k], base.contacts).elbow_r.p, W0.elbow_r.p)));
if (elbowMove > 1) { console.error(`FAIL: elbow moves ${elbowMove.toFixed(2)} cm`); process.exitCode = 1; }
const Wt = L.fk(poses.r4, base.contacts), set = H.setKin(ex);
const foreOut = (W) => { const v = V.sub(W.wrist_r.p, W.elbow_r.p); return Math.round(Math.atan2(v[2], v[0]) / D2R); };
set('Upper arm', 'setup', `By the side, ≈${Math.round(F.humElev(W0))}° from the trunk (elbow ${Math.round(W0.elbow_r.p[2] - W0.shoulder_r.p[2] + 0)} cm out from below the shoulder joint)`); set('Upper arm', 'peak', `Unchanged (elbow moves ${elbowMove.toFixed(1)} cm)`);
set('External rotation', 'setup', `Forearm ${-foreOut(W0)}° across the belly (internal rotation)`); set('External rotation', 'peak', `Forearm ${foreOut(Wt)}° out from straight ahead`);
set('Elbow flexion', 'setup', `≈${Math.round(F.elbowAng(W0))}°`); set('Elbow flexion', 'peak', `≈${Math.round(F.elbowAng(Wt))}°`);
F.bandRow(ex, `Looped round the rack upright on the left at ${AY} cm (hand height), ${-AZ} cm left of the midline; strand ${rep.strand[0]} cm`, `Strand ${rep.strand[1]} cm with the forearm turned out`);
set('Tempo', 'setup', 'Pause 0.6 s across the belly'); set('Tempo', 'peak', '1.6 s out, 0.5 s hold, 2.0 s back');
console.log(`Resistance Band Standing External Rotation: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, elbowMove: +elbowMove.toFixed(2), anchor: ANCHOR, ...rep })}`);
