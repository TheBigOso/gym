// Cable Lying Triceps Extension (GymVisual, Cable Lying Triceps Extension; movement reference only, the page could not be
// read): lying face up on a flat 42 cm bench with the head toward a low pulley, head, upper back and buttocks on the pad,
// feet flat on the floor (planted leg contacts). A straight bar (cable attachment 'bar') in both hands, overhand, the hands
// about shoulder width. The upper arms are angled about 15 degrees past vertical toward the head and stay still (constant
// shoulder channels, both elbows fixed in space) while only the elbows bend, lowering the bar in an arc to just above and
// behind the forehead, then straighten. The cable runs from the pulley behind and below the head, over the head, to the bar.
// Bilateral (right arm solved, left mirrored). Built like author-dumbbell-skull-crusher.js; family b5-cablepush.js.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-lying-triceps-extension.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const BENCH_H = 42, TOP_FLEX = 8, BOT_FLEX = ENV('BOT', 105), UA_BACK = ENV('UAB', 15) * R.DEG;
const base = T.lieOnBench(BENCH_H, 0);
const W0 = L.fk(base);
const BENCH_END = r1(W0.pelvis.p[0] + 13);
const bench = DBF.bench({ x: BENCH_END - 20, seat: 40, height: BENCH_H, width: 30, angle: 0, back: 80 });
const benchBox = { center: [BENCH_END - 60, 0, 0], size: [120, BENCH_H, 30] };
base.ch.sc_r = { protract: 4, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
const contacts = [H.legC('r', { pole: [0.6, 1, 0.2] }), H.legC('l', { pole: [0.6, 1, -0.2] })];
const FOOT = { r: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, 19], l: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, -19] };
let p = clone(base);
p.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } };
p = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: 0, abd: 6 }); p = H.fitLeg(p, 'l', contacts[1], FOOT.l, { rot: 0, abd: 6 });
// upper arm UA_BACK past vertical toward the head (sagittal plane, so the grip width stays constant); forearm bends toward
// the head in the same plane
const uaDir = [-Math.sin(UA_BACK), Math.cos(UA_BACK), 0], faDir = [-Math.cos(UA_BACK), -Math.sin(UA_BACK), 0];
const ua = T.upperArm(p, 'r', uaDir, faDir, [[90, 100, 0], [90, 100, -90], [0, 100, 90]]);
p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: TOP_FLEX };
// overhand: the palm faces the feet side of the forearm (perpendicular to it in the sagittal plane), bar across the body
{ const W = L.fk(p), fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)), palm = V.norm([fa[1], -fa[0], 0]); const w = T.wristTo(p, 'r', fa, palm[0] > 0 ? palm : V.scale(palm, -1)); p.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 }; }
const armAt = (flex) => { const q = clone(p); q.ch.elbow_r = { flex: r1(flex) }; return T.mirrorArm(q); };
const poses = { top: armAt(TOP_FLEX), bottom: armAt(BOT_FLEX), bottomHold: armAt(BOT_FLEX - 1.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 2.8, pose: 'bottom' }, { t: 2.95, pose: 'bottomHold' }, { t: 3.1, pose: 'bottom' }, { t: 4.5, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
// low pulley behind the head, on the line of the forearms at mid range (cable pulls along the forearm)
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), bt = EQ.barAt(Wt), bb = EQ.barAt(Wb);
const headX = L.R.shapeWorld(Wt, rig.shapes.find((s) => s.id === 'head')).c[0];
const ANCHOR = [r1(headX - ENV('BEHIND', 60)), ENV('AY', 40), 0];
ex.props = [bench.prop, EQ.cableTower(ANCHOR, { offset: [-12, 0] }), { id: 'bar', kind: 'cable', attachment: 'bar', size: [50, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, cable line clear of the head and body, bar clear of the head / body, bench under the body,
// constant grip width, elbows still
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, elbowDrift = 0, onBench = 1e9, benchClr = 1e9, lineBench = 1e9;
const BAR_HALF = 25;
H.loopReport(ex, { probe: (W, pz, t) => {
  const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, BAR_HALF)), V.sub(b.c, V.scale(b.ax, BAR_HALF)), 1.5, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  elbowDrift = Math.max(elbowDrift, V.len(V.sub(W.elbow_r.p, Wt.elbow_r.p)), V.len(V.sub(W.elbow_l.p, Wt.elbow_l.p)));
  const ob = T.bodyOverBox(W, benchBox); onBench = Math.min(onBench, ob.d);
  benchClr = Math.min(benchClr, b.c[1] - 1.5 - BENCH_H);
  // cable above the bench pad where it passes over the head end of the bench
  const x0 = bench.prop.center[0] - 20 - 80; if (ANCHOR[0] < x0) { const k = (x0 - ANCHOR[0]) / (b.c[0] - ANCHOR[0]); lineBench = Math.min(lineBench, ANCHOR[1] + k * (b.c[1] - ANCHOR[1]) - BENCH_H); }
} });
C.gate('cable-lying-triceps-extension', rep, { minLine: 1 });
C.limits(poses);
if (barClr.d < 0.5) { console.error(`FAIL cable-lying-triceps-extension: bar into the body ${JSON.stringify(barClr)}`); process.exitCode = 1; }
if (lineBench < 1) { console.error(`FAIL cable-lying-triceps-extension: cable through the bench end (${lineBench.toFixed(2)} cm)`); process.exitCode = 1; }
if (elbowDrift > 0.04) { console.error(`FAIL cable-lying-triceps-extension: elbows move ${elbowDrift.toFixed(3)} cm`); process.exitCode = 1; }

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} past vertical toward the head`); set('Upper arm angle', 'peak', `Unchanged (elbows move ${elbowDrift.toFixed(2)} cm over the loop)`);
set('Grip', 'setup', `Overhand, ${r1(bt.width)} cm between the hands on a 50 cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Cable', 'setup', `Low pulley ${ANCHOR[1]} cm high, ${r1(headX - ANCHOR[0])} cm behind the head`); set('Cable', 'peak', `Cable clear of the head and body by at least ${rep.line.d} cm; bar ${r1(barClr.d)} cm from the head at the closest`);
set('Back on the bench', 'setup', `Bench ${BENCH_H} cm; buttocks, upper back and head on the pad`); set('Back on the bench', 'peak', 'Unchanged (the trunk does not move)');
set('Tempo', 'setup', 'Pause 0.6 s with the arms straight'); set('Tempo', 'peak', '2.2 s down, 0.3 s pause, 1.4 s up, 0.5 s at the top');
console.log(`Cable Lying Triceps Extension: wrote ${L.write(ex)}\n  shoulder ${JSON.stringify(ua.ch)} cost ${ua.cost.toFixed(3)} wrist ${JSON.stringify(p.ch.wrist_r)} bar top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} anchor ${ANCHOR} headX ${r1(headX)}\n  ${JSON.stringify(rep)}\n  barClear ${JSON.stringify(barClr)} elbowDrift ${elbowDrift.toFixed(3)} onBench ${r1(onBench)} barAboveBench ${r1(benchClr)} cableAboveBenchEnd ${r1(lineBench)}`);
