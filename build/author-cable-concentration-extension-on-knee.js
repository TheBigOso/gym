// Cable Concentration Extension (on knee) (GymVisual 14630; movement reference only, page not readable): half-kneeling
// facing a cable pulley set about 150 cm high, left knee down (toes tucked), right foot forward with the knee at about 90 degrees (planted leg
// contacts). The trunk leans forward about 35 degrees from the hips and the back of the right upper arm, just above the
// elbow, is braced against the inside of the right thigh near the knee; the left hand rests on the left hip. The right
// hand holds a D-handle underhand. With the upper arm held still on the thigh (shoulder plane and elevation constant,
// the elbow fixed in space), the elbow straightens from about 120 degrees to nearly straight, pushing the handle down,
// then bends again under control. The cable runs forward and up from the hand to the pulley, in front of the face.
// Authored right (the player mirrors the clip and the tower for the left arm). Tempo: 1 s down, 0.4 s, 2 s up, 0.5 s.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const S3 = require('./families/b4-shoulders3');
const CA = require('./families/b5-cablearms');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-09');
const meta = require('./meta/cable-concentration-extension-on-knee.json');

const ID = 'cable-concentration-extension-on-knee';
const LEAN = 30, T = 0.75;
const K = S3.halfKneel({ down: 'l', width: 14, frontKnee: 90, thigh: 4, toePitch: 76 });
let base = CA.pitchAboutHips(K.pose, K.contacts, -LEAN);
base.ch.spine_l5 = { rot: 0, flex: 8, latFlex: 0 }; base.ch.spine_t12 = { rot: -6, flex: 8, latFlex: 0 }; base.ch.spine_t6 = { rot: -4, flex: 4, latFlex: 0 };
base.ch.sc_r = { protract: 6, elevate: -2 };
base.ch.neck_c7 = { rot: 0, flex: -14 }; base.ch.head_c1 = { rot: 0, flex: -6 }; // eyes on the arm, chin up
base = B.leftHandOnHip(base);
const W0 = L.fk(base, K.contacts), ti = X.thighInner(W0, 'r', T);
const E = V.add(V.add(ti.c, V.scale(ti.m, ti.r + 3.6 - 1)), [0, 2, 0]); // elbow surface pressed 1 cm into the thigh surface
const FLEX = { top: 110, e1: 90, e2: 68, e3: 46, e4: 24, bottom: 8 };
const { poses, err } = X.elbowKeys(base, K.contacts, { E, flexes: FLEX, palm: 'front', mid: 60, guess: { plane: 60, elev: 15, axial: 0, pron: 10, flex: 60 } });
poses.bottomHold = clone(poses.bottom);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'top' }, { t: ph.push.start, pose: 'top' }, { t: 0.72, pose: 'e1' }, { t: 0.94, pose: 'e2' }, { t: 1.15, pose: 'e3' }, { t: 1.33, pose: 'e4' }, { t: ph.lockout.start, pose: 'bottom' },
  { t: ph.lockout.end, pose: 'bottomHold' }, { t: 2.25, pose: 'e4' }, { t: 2.6, pose: 'e3' }, { t: 3.05, pose: 'e2' }, { t: 3.5, pose: 'e1' }, { t: ph.reset.start, pose: 'top' }, { t: D, pose: 'top' }];

const ex = H.module_(meta, K.contacts, poses, keyframes);
const Wt = L.fk(poses.top, K.contacts), Wb = L.fk(poses.bottom, K.contacts), gt = EQ.gripPoint(Wt, 'r').p;
const ANCHOR = [r1(E[0] + 100), 150, r1(gt[2])];
ex.props = [EQ.cableTower(ANCHOR, { offset: [12, 0] }), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => { const c = CA.handleClear(W); if (c.d < hc.d) hc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p))); } });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (hc.d < 0) fail(`handle into the body ${JSON.stringify(hc)}`);
if (drift > 0.04) fail(`elbow moves ${drift.toFixed(3)} cm`);
const brace = +(V.len(V.sub(Wt.elbow_r.p, ti.c)) - ti.r - 3.6).toFixed(1);
if (Math.abs(brace) > 2) fail(`elbow not on the thigh (gap ${brace} cm)`);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaV = V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, -1, 0]);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (well bent)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (arm straight, not locked hard)`);
set('Upper arm', 'setup', `${d(uaV)} from vertical, braced on the inner right thigh (gap ${brace} cm)`); set('Upper arm', 'peak', `Unchanged (elbow moves ${drift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', 'Underhand on the D-handle'); set('Grip', 'peak', 'Palm forward with the arm straight');
set('Trunk', 'setup', `Half-kneeling on the left knee, ${d(B.trunkDeg(Wt))} forward lean`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the elbow bent'); set('Tempo', 'peak', '1 s down, 0.4 s at the bottom, 2 s up');
console.log(`Cable Concentration Extension (on knee): wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  E ${E.map(r1)} anchor ${ANCHOR} brace ${brace}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(hc)} drift ${drift.toFixed(3)}`);
