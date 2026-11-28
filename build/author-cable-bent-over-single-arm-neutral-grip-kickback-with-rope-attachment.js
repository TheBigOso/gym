// Cable Bent Over Single Arm Neutral Grip Kickback with Rope Attachment (GymVisual 14731; movement reference only, page
// not readable): standing facing a low pulley, feet about hip width (planted leg contacts), knees bent about 20 degrees,
// hinged forward from the hips with a flat back (trunk about 50 degrees from vertical, still); left hand on the hip. The
// right hand holds one end of a rope with a neutral grip (palm toward the body). The schema's rope is a two-hand item, so
// the single rope end is drawn as a D-handle (cable attachment 'handle') with the same grip. The right upper arm is held
// along the trunk (constant shoulder channels, so the elbow does not move) while only the elbow moves: from about 95
// degrees (forearm pointing down and a little forward) to straight back, squeeze, and slowly back. The cable runs forward and
// down from the hand to the pulley. Authored right (the player mirrors the clip and the tower for the left arm).
// Tempo: 1 s out, 0.6 s squeeze, 1.8 s back, 0.7 s reset. Built like author-dumbbell-kickback.js (b3-triceps.js).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CA = require('./families/b5-cablearms');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-bent-over-single-arm-neutral-grip-kickback-with-rope-attachment.json');

const ID = 'cable-bent-over-single-arm-neutral-grip-kickback-with-rope-attachment';
const LEAN = +(process.env.LEAN ?? 50);
const st = F.standing({ stance: 13, knee: 20, lean: LEAN });
let base = clone(st.pose);
base.ch.spine_l5 = { rot: 0, flex: 2, latFlex: 0 }; base.ch.spine_t12 = { rot: 0, flex: 2, latFlex: 0 }; base.ch.spine_t6 = { rot: 0, flex: 2, latFlex: 0 };
base.ch.neck_c7 = { rot: 0, flex: -16 }; base.ch.head_c1 = { rot: 0, flex: -8 }; // neck long, eyes ahead and down
base.ch.sc_r = { protract: -4, elevate: 0 };
base = B.leftHandOnHip(base);
const W0 = L.fk(base, st.contacts);
// upper arm along the trunk (shoulder toward the hips), a little out from the ribs
const down = V.norm(V.sub(W0.pelvis.p, W0.neck_c7.p)), UA = V.norm(V.add(down, [0, 0, 0.2]));
const FA = V.norm(V.sub([0, -1, 0], V.scale(UA, -UA[1]))); // forearm at 90 degrees: perpendicular to the upper arm, pointing down and forward
const ua = T.upperArm(base, 'r', UA, FA, [[0, 10, 0], [90, 10, 0], [-60, 20, 0], [0, 20, 90], [0, 20, -90]]);
base.ch.shoulder_r = ua.ch; base.ch.elbow_r = { flex: 90 };
{ const W = L.fk(base, st.contacts), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(base, 'r', fa, [0, 0, -1]); base.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(base); q.ch.elbow_r = { flex: r1(flex) }; return q; };
const BOT = 95, TOP = 4;
const poses = { bent: armAt(BOT), e1: armAt(70), e2: armAt(45), e3: armAt(22), straight: armAt(TOP), squeeze: armAt(TOP - 1.5) };
const keyframes = [{ t: 0, pose: 'bent' }, { t: 0.5, pose: 'bent' }, { t: 0.78, pose: 'e1' }, { t: 1.02, pose: 'e2' }, { t: 1.26, pose: 'e3' }, { t: 1.5, pose: 'straight' }, { t: 1.8, pose: 'squeeze' }, { t: 2.1, pose: 'straight' },
  { t: 2.6, pose: 'e3' }, { t: 3.0, pose: 'e2' }, { t: 3.45, pose: 'e1' }, { t: 3.9, pose: 'bent' }, { t: 4.6, pose: 'bent' }];
const ex = H.module_(meta, st.contacts, poses, keyframes);
const Wb = L.fk(poses.bent, st.contacts), Ws = L.fk(poses.straight, st.contacts), gb = EQ.gripPoint(Wb, 'r').p;
const ANCHOR = [r1(gb[0] + 75), 15, r1(gb[2] + 4)];
ex.props = [EQ.cableTower(ANCHOR), { id: 'rope_end', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 }, drift = 0;
H.loopReport(ex, { probe: (W, pz, t) => { const c = CA.handleClear(W); if (c.d < hc.d) hc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; drift = Math.max(drift, V.len(V.sub(W.elbow_r.p, Wb.elbow_r.p))); } });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (hc.d < 0) fail(`handle into the body ${JSON.stringify(hc)}`);
if (drift > 0.04) fail(`elbow moves ${drift.toFixed(3)} cm`);
if (ua.cost > 0.5) fail(`upper arm off its direction (cost ${ua.cost.toFixed(3)})`);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const uaTr = V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), down);
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wb, 'r'))} (forearm hanging)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Ws, 'r'))} (arm straight back)`);
set('Upper arm to trunk', 'setup', `${d(uaTr)} from the trunk line, along the side`); set('Upper arm to trunk', 'peak', `Unchanged (elbow moves ${drift.toFixed(2)} cm over the loop)`);
set('Trunk inclination', 'setup', `${d(B.trunkDeg(Wb))} forward of vertical, knees ${d(H.kneeOf(Wb, 'r'))}`); set('Trunk inclination', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Elbow bent 0.5 s'); set('Tempo', 'peak', '1 s out, 0.6 s squeeze, 1.8 s back');
set('Cable', 'setup', `Low pulley ${Math.round(ANCHOR[0] - gb[0])} cm in front of the hand, ${ANCHOR[1]} cm high`); set('Cable', 'peak', `Clear of the body and legs by at least ${rep.line.d} cm`);
console.log(`Cable Bent Over Single Arm Kickback: wrote ${L.write(ex)}\n  ua ${JSON.stringify(ua.ch)} cost ${ua.cost.toFixed(3)} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(hc)} drift ${drift.toFixed(3)}`);
