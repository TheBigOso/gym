// Cable High Pulley Overhead Tricep Extension (GymVisual 3734, Cable High Pulley Overhead Tricep Extension; movement
// reference only, page not readable): standing facing away from a high pulley, feet about hip width (planted leg
// contacts), knees soft, trunk leaning forward about 25 degrees from the hips. A rope (cable attachment 'rope') in both
// hands, palms facing; the upper arms point forward and up beside the head (about 45 degrees forward of vertical, elbows
// about shoulder width) and stay still while only the elbows bend, letting the rope draw the hands back behind the head,
// then straighten in line with the upper arms. The rope knot stays behind the head; the cable runs back and up over the
// head to the pulley. A square stance is used (the common staggered stance is not modelled). Bilateral (right arm solved,
// left mirrored). Built like author-cable-high-pulley-overhead-tricep-extension.js; family b6-08.js.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const F = require('./families/b3-shoulders');
const X = require('./families/b6-08');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-high-pulley-overhead-tricep-extension.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const LEAN = ENV('LEAN', 25), UA = ENV('UA', 45) * R.DEG, TOP_FLEX = 10, BOT_FLEX = ENV('BOT', 118);
const st = F.standing({ stance: 13, knee: 14 }), contacts = st.contacts;
// lean forward from the hips (pelvis and trunk pitched about the hip joints, the hips pushed back over the heels a little)
const st0 = clone(st.pose); st0.root.pos[0] = r1(st0.root.pos[0] - ENV('BACK', 6));
let p = X.kneelLean({ pose: st0, contacts }, LEAN);
p.ch.neck_c7 = { rot: 0, flex: -6 }; p.ch.head_c1 = { rot: 0, flex: -6 }; // eyes ahead, not at the floor
p.ch.sc_r = { protract: 4, elevate: 8 }; p.ch.sc_l = clone(p.ch.sc_r);
// upper arm UA forward of vertical (sagittal plane: constant grip width); the forearm folds back behind the head
const uaDir = [Math.sin(UA), Math.cos(UA), 0], faDir = [-Math.cos(UA), Math.sin(UA), 0];
const ua = T.upperArm(p, 'r', uaDir, faDir, [[90, 150, 0], [90, 150, 90], [90, 150, -90], [60, 160, 0]]);
p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: TOP_FLEX };
{ const W = L.fk(p, contacts), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = T.wristTo(p, 'r', fa, [0, 0, -1]); p.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(p); q.ch.elbow_r = { flex: r1(flex) }; return T.mirrorArm(q); };
const poses = { top: armAt(TOP_FLEX), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 2.8, pose: 'bottom' }, { t: 2.95, pose: 'bottomHold' }, { t: 3.1, pose: 'bottom' }, { t: 4.5, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
// high pulley behind and above the hands' path
const ANCHOR = [r1(Wt.pelvis.p[0] - ENV('BEHIND', 80)), ENV('AY', 220), 0];
ex.props = [EQ.cableTower(ANCHOR, { offset: [-12, 0], height: 230 }), X.ropeProp(ANCHOR)];

// loop checks: knees / feet, floor, cable (pulley to knot) and rope strands (knot to hands) clear of the head and body,
// constant grip width, elbows still
const knot = (W) => EQ.attachPoint(W, { two: true, rope: true, anchor: ANCHOR });
const rep = C.scan(ex, { line: (W) => [ANCHOR, knot(W)] });
let strand = { d: 1e9 }, elbowDrift = 0;
H.loopReport(ex, { probe: (W, pz, t) => {
  const k = knot(W);
  for (const s of ['r', 'l']) { const c = EQ.segmentClear(W, k, EQ.gripPoint(W, s).p, 1.2, { skip: /^(hand|thumb|forearm)_/ }); if (c.d < strand.d) strand = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; }
  elbowDrift = Math.max(elbowDrift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wt.elbow_l.p)));
} });
C.gate('cable-high-pulley-overhead-tricep-extension', rep, { minLine: 1 });
C.limits(poses);
if (strand.d < 0) { console.error(`FAIL cable-high-pulley-overhead-tricep-extension: rope strand into the body ${JSON.stringify(strand)}`); process.exitCode = 1; }
if (elbowDrift > 0.04) { console.error(`FAIL cable-high-pulley-overhead-tricep-extension: elbows move ${elbowDrift.toFixed(3)} cm`); process.exitCode = 1; }
const peak = X.checkMeasure('cable-high-pulley-overhead-tricep-extension', ex);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (arms long, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} with the hands behind the head`);
set('Shoulder elevation', 'setup', `Upper arm ${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), V.sub(Wt.neck_c7.p, Wt.pelvis.p)))} from the trunk line, ${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} forward of vertical`); set('Shoulder elevation', 'peak', `Unchanged (elbows move ${elbowDrift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Neutral, hands ${r1(EQ.barAt(Wt).width)} cm apart on the rope ends`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Cable', 'setup', `High pulley ${ANCHOR[1]} cm high, ${r1(Wt.pelvis.p[0] - ANCHOR[0])} cm behind the hips`); set('Cable', 'peak', `Cable clear by at least ${rep.line.d} cm, rope strands by ${strand.d} cm (knot behind the head)`);
set('Trunk', 'setup', `Standing, ${P.leanText(Wt)} (hips flexed ${d(poses.top.ch.hip_r.flex)}), knees ${d(H.kneeOf(Wt, 'r'))}`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s with the arms extended'); set('Tempo', 'peak', '2.2 s back, 0.3 s pause, 1.4 s extending, 0.5 s pause');
console.log(`Cable High Pulley Overhead Tricep Extension: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} cost ${ua.cost.toFixed(3)} wrist ${JSON.stringify(p.ch.wrist_r)} hip ${JSON.stringify(p.ch.hip_r)} peak ${peak} dorsi ${r1(H.dorsiOf(Wt, 'r'))}\n  hands top ${EQ.barAt(Wt).c.map(r1)} bottom ${EQ.barAt(Wb).c.map(r1)} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  strand ${JSON.stringify(strand)} elbowDrift ${elbowDrift.toFixed(3)}`);
