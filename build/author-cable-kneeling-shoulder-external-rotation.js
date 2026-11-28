// Cable Kneeling Shoulder External Rotation (GymVisual 16811; movement reference only, page not readable): tall kneeling
// on both knees, toes tucked (planted leg contacts), side-on to a cable tower on the left with the pulley at elbow
// height. The right hand holds a D-handle (cable attachment 'handle'), the elbow bent 90 degrees and tucked at the side;
// the left hand rests on the left hip. With the upper arm still (shoulder plane and elevation held, so the elbow does not
// move) the shoulder turns out: the forearm swings like a door from across the stomach (about 40 degrees of internal
// rotation from straight ahead) to about 50 degrees out, palm toward the midline turning forward, then back under
// control. The cable runs across the front of the body to the pulley on the left. Authored right (the player mirrors
// the clip and the tower for the left arm). Tempo: 1.8 s out, 0.5 s hold, 2.1 s back, 0.6 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CA = require('./families/b5-cablearms');
const B = require('./families/b5-cablepull');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/cable-kneeling-shoulder-external-rotation.json');

const ID = 'cable-kneeling-shoulder-external-rotation';
const TK = CA.tallKneel({ toePitch: 76 });
let base = clone(TK.pose);
base.ch.sc_r = { protract: 0, elevate: 0 }; base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 0 };
base = B.leftHandOnHip(base);
const W0 = L.fk(base, TK.contacts), S = W0.shoulder_r.p;
const u = V.norm([0.05, -1, 0.16]), E = V.add(S, V.scale(u, L.UA)); // upper arm hanging, elbow a little out from the ribs
const fwd = V.norm(V.sub([1, 0, 0], V.scale(u, u[0]))), lat = V.norm(V.cross(fwd, u)).map((v) => -v); // lat: toward +Z
const dirAt = (phi) => { const c = Math.cos(phi * Math.PI / 180), s = Math.sin(phi * Math.PI / 180); return V.add(V.scale(fwd, c), V.scale(lat, s)); };
const palmAt = (phi) => { const c = Math.cos(phi * Math.PI / 180), s = Math.sin(phi * Math.PI / 180); return V.add(V.scale(fwd, s), V.scale(lat, -c)); };
const g0 = { plane: 20, elev: 10, axial: 0, pron: 90, flex: 90 };
const m0 = C.armR(base, TK.contacts, { flex: 90, elbow: E, wElbow: 4, grip: V.add(E, V.scale(dirAt(0), 30)), wGrip: 1, palm: palmAt(0), guess: g0, axialRef: 0, wAxial: 0.01, wDev: 0.05 });
const Wm = L.fk(m0, TK.contacts), gd = V.len(V.sub(EQ.gripPoint(Wm, 'r').p, Wm.elbow_r.p)), Em = Wm.elbow_r.p;
const ROT = [-40, -18, 5, 28, 50];
const poses = {}, err = { m0: m0.__err };
let g = C.guessOf(m0);
ROT.forEach((phi, i) => {
  const q = C.armR(base, TK.contacts, { flex: 90, lockUA: true, grip: V.add(Em, V.scale(dirAt(phi), gd)), palm: palmAt(phi), guess: { ...g, flex: 90 }, axialRef: g.axial, wAxial: 0.002, wDev: 0.05 });
  err[`r${i}`] = q.__err; g = C.guessOf(q); poses[`r${i}`] = C.strip(q);
});
const up = K.easeTimes([0.25, 0.5, 0.75, 1], 0.6, 2.4), down = K.easeTimes([0.25, 0.5, 0.75, 1], 2.9, 5.0);
const keyframes = [{ t: 0, pose: 'r0' }, { t: 0.6, pose: 'r0' }, ...up.map((t, i) => ({ t, pose: `r${i + 1}` })), { t: 2.9, pose: 'r4' }, ...down.map((t, i) => ({ t, pose: `r${3 - i}` })), { t: 5.6, pose: 'r0' }];

const ex = H.module_(meta, TK.contacts, poses, keyframes);
const Wb = L.fk(poses.r0, TK.contacts), Wt = L.fk(poses.r4, TK.contacts), gb = EQ.gripPoint(Wb, 'r').p;
const ANCHOR = [r1(gb[0] + 4), r1(gb[1]), -85];
ex.props = [EQ.cableTower(ANCHOR, { offset: [0, -12] }), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => { const c = CA.handleClear(W); if (c.d < hc.d) hc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wb.elbow_r.p))); } });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (hc.d < 0) fail(`handle into the body ${JSON.stringify(hc)}`);
if (drift > 0.04) fail(`elbow moves ${drift.toFixed(3)} cm`);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const foreAng = (W) => { const f = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); return Math.atan2(f[2], f[0]) * 180 / Math.PI; };
set('Upper arm', 'setup', `${d(K.humElev(Wb))} from the trunk, elbow at the side`); set('Upper arm', 'peak', `Unchanged (elbow moves ${drift.toFixed(2)} cm over the loop)`);
set('External rotation', 'setup', `Forearm ${d(Math.abs(foreAng(Wb)))} across the body from straight ahead`); set('External rotation', 'peak', `Forearm ${d(foreAng(Wt))} out from straight ahead (range ${d(foreAng(Wt) - foreAng(Wb))})`);
set('Elbow flexion', 'setup', d(C.elbowAng(Wb))); set('Elbow flexion', 'peak', d(C.elbowAng(Wt)));
set('Cable', 'setup', `Pulley on the left at ${ANCHOR[1]} cm (elbow height)`); set('Cable', 'peak', `Clear of the body by at least ${rep.line.d} cm`);
set('Tempo', 'setup', 'Pause 0.6 s, forearm across the stomach'); set('Tempo', 'peak', '1.8 s out, 0.5 s hold, 2.1 s back');
console.log(`Cable Kneeling Shoulder External Rotation: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)} gd ${gd.toFixed(1)}\n  anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(hc)} drift ${drift.toFixed(3)}`);
