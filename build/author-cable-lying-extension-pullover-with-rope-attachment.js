// Cable Lying Extension Pullover (with rope attachment) (GymVisual 11493; movement reference only, page not readable):
// lying face up on a flat 42 cm bench with the head toward a low pulley, head, upper back and buttocks on the pad, feet
// flat on the floor (planted leg contacts). A rope (cable attachment 'rope') in both hands, palms facing, the hands about
// shoulder width (kept constant: both arms move in their sagittal planes). From the arms straight up over the chest the
// elbows bend while the upper arms swing back past the head (to about 58 degrees past vertical), so the rope goes down
// behind the head (a lying triceps extension blended with a pullover); then the elbows are pulled back up over the face
// while the arms straighten, finishing straight over the chest. The cable runs from the pulley behind and below the head
// end of the bench to the rope knot. Bilateral (right arm solved, left mirrored). Built like
// author-cable-lying-triceps-extension.js; family b6-08.js.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-08');
const meta = require('./meta/cable-lying-extension-pullover-with-rope-attachment.json');

const ID = 'cable-lying-extension-pullover-with-rope-attachment';
const ENV = (k, d) => +(process.env[k] ?? d);
const BENCH_H = 42, TOP_FLEX = 6, BOT_FLEX = ENV('BOT', 85), UA_MAX = ENV('UAM', 58);
const base = T.lieOnBench(BENCH_H, 0);
const W0 = L.fk(base);
// the head end of the pad sits just past the head so the hands and rope can drop behind it (a 100 cm bench: 20 cm seat
// section + 80 cm pad)
const headX0 = L.R.shapeWorld(W0, rig.shapes.find((s) => s.id === 'head')).c[0];
const PAD_END = r1(headX0 - ENV('PAST', 6)), BENCH_END = r1(PAD_END + 100);
const bench = DBF.bench({ x: BENCH_END - 10, seat: 20, height: BENCH_H, width: 30, angle: 0, back: 80 });
const benchBox = { center: [BENCH_END - 50, 0, 0], size: [100, BENCH_H, 30] };
base.ch.sc_r = { protract: 4, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
const contacts = [H.legC('r', { pole: [0.6, 1, 0.2] }), H.legC('l', { pole: [0.6, 1, -0.2] })];
const FOOT = { r: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, 19], l: [r1(W0.hip_r.p[0] + 36), L.ANKLE_H, -19] };
let p0 = clone(base);
p0.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } };
p0 = H.fitLeg(p0, 'r', contacts[0], FOOT.r, { rot: 0, abd: 6 }); p0 = H.fitLeg(p0, 'l', contacts[1], FOOT.l, { rot: 0, abd: 6 });
// key at f: upper arm theta past vertical toward the head (sagittal plane), elbow flexion bending the forearm toward the
// head; neutral grip (palm facing in)
const N = 8, FS = [...Array(N + 1).keys()].map((i) => i / N);
let prev = null;
const keyAt = (f) => {
  const k = T.ease(f), th = UA_MAX * k * R.DEG, flex = TOP_FLEX + (BOT_FLEX - TOP_FLEX) * k;
  const ua = [-Math.sin(th), Math.cos(th), 0], perp = [-Math.cos(th), -Math.sin(th), 0], fl = flex * R.DEG;
  const fa = V.add(V.scale(ua, Math.cos(fl)), V.scale(perp, Math.sin(fl)));
  const q = clone(p0);
  const seeds = [...(prev ? [[prev.plane, prev.elev, prev.axial]] : []), [90, 100, 0], [90, 100, -90], [0, 100, 90]];
  const s = T.upperArm(q, 'r', ua, perp, seeds); // the helper orients the arm with a 90-degree forearm: pass the bending direction
  q.ch.shoulder_r = s.ch; q.ch.elbow_r = { flex: r1(flex) }; prev = s.ch;
  const W = L.fk(q), fw = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)), w = T.wristTo(q, 'r', fw, [0, 0, -1]);
  q.ch.wrist_r = { pron: w.pron, flex: 0, dev: 0 };
  return { pose: T.mirrorArm(q), cost: s.cost };
};
const keys = FS.map(keyAt);
const poses = {}, names = keys.map((_, i) => (i === 0 ? 'top' : i === N ? 'bottom' : `k${i}`));
keys.forEach((k, i) => { poses[names[i]] = k.pose; });
poses.bottomHold = clone(poses.bottom); poses.bottomHold.ch.elbow_r.flex = poses.bottomHold.ch.elbow_l.flex = r1(BOT_FLEX + 1.5);
const ph = Object.fromEntries(meta.timeline.phases.map((q) => [q.id, q])), D = meta.timeline.duration, tAt = (a, b, f) => +(a + (b - a) * f).toFixed(3);
const keyframes = [{ t: 0, pose: 'top' }];
FS.forEach((f, i) => keyframes.push({ t: tAt(ph.lower.start, ph.lower.end, f), pose: names[i] }));
keyframes.push({ t: +((ph.bottom.start + ph.bottom.end) / 2).toFixed(3), pose: 'bottomHold' });
FS.forEach((f, i) => keyframes.push({ t: tAt(ph.press.start, ph.press.end, f), pose: names[N - i] }));
keyframes.push({ t: D, pose: 'top' });
const ex = H.module_(meta, contacts, poses, keyframes);
// low pulley behind the head end of the bench
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const headX = L.R.shapeWorld(Wt, rig.shapes.find((s) => s.id === 'head')).c[0];
const ANCHOR = [r1(headX - ENV('BEHIND', 75)), ENV('AY', 30), 0];
ex.props = [bench.prop, EQ.cableTower(ANCHOR, { offset: [-12, 0] }), X.ropeProp(ANCHOR)];

// loop checks: feet, floor, jumps, constant grip width, cable and rope strands clear of the head and body, hands and
// knot clear of the bench, body on the bench
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, rope: true });
const rep = ck.rep;
let onBench = 1e9, handBench = 1e9, lineBench = 1e9;
const benchX0 = PAD_END;
const knot = (W) => EQ.attachPoint(W, { two: true, rope: true, anchor: ANCHOR });
H.loopReport(ex, { probe: (W) => {
  onBench = Math.min(onBench, T.bodyOverBox(W, benchBox).d);
  for (const s of ['r', 'l']) { const g = EQ.gripPoint(W, s).p; if (g[0] > benchX0 - 3 && Math.abs(g[2]) < 18) handBench = Math.min(handBench, g[1] - 4 - BENCH_H); }
  const k = knot(W); if (k[0] > benchX0) lineBench = Math.min(lineBench, k[1] - BENCH_H);
  // the cable from the pulley to the knot passes over the head end of the bench
  if (ANCHOR[0] < benchX0 && k[0] > benchX0) { const t = (benchX0 - ANCHOR[0]) / (k[0] - ANCHOR[0]); lineBench = Math.min(lineBench, ANCHOR[1] + t * (k[1] - ANCHOR[1]) - BENCH_H); }
} });
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (handBench < 0) fail(`hands into the bench ${handBench.toFixed(2)}`);
if (lineBench < 1) fail(`cable / knot through the bench ${lineBench.toFixed(2)}`);
if (onBench < -2.5) fail(`body into the bench ${onBench.toFixed(2)}`);

const set = H.setKin(ex), d = X.d;
const uaPast = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, 1, 0]);
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} with the rope behind the head`);
set('Shoulder flexion', 'setup', 'Upper arms vertical over the shoulders'); set('Shoulder flexion', 'peak', `Upper arms ${d(uaPast(Wb))} past vertical toward the head (beside the head)`);
set('Grip', 'setup', `Neutral, hands ${r1(EQ.barAt(Wt).width)} cm apart on the rope ends`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Cable', 'setup', `Low pulley ${ANCHOR[1]} cm high, ${r1(headX - ANCHOR[0])} cm behind the head`); set('Cable', 'peak', `Cable clear of the body by at least ${rep.line.d} cm, rope strands by ${ck.strand.d} cm; ${r1(lineBench)} cm over the bench end`);
set('Back on the bench', 'setup', `Bench ${BENCH_H} cm; buttocks, upper back and head on the pad`); set('Back on the bench', 'peak', 'Unchanged (the trunk does not move)');
set('Tempo', 'setup', 'Pause 0.6 s with the arms straight'); set('Tempo', 'peak', '2.4 s back, 0.4 s stretch, 1.8 s pull-over and extension, 0.6 s squeeze');
console.log(`Cable Lying Extension Pullover: wrote ${L.write(ex)}\n  costs ${keys.map((k) => k.cost.toFixed(3))} hands top ${EQ.barAt(Wt).c.map(r1)} bottom ${EQ.barAt(Wb).c.map(r1)} anchor ${ANCHOR} headX ${r1(headX)} benchX0 ${benchX0}\n  ${JSON.stringify(rep)}\n  strand ${JSON.stringify(ck.strand)} onBench ${r1(onBench)} handBench ${r1(handBench)} lineBench ${r1(lineBench)} peak ${ck.peak}`);
