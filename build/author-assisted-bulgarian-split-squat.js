// Assisted Bulgarian Split Squat (GymVisual; movement reference only, the page could not be read): the authored dumbbell
// Bulgarian split squat (laces of the left foot on a bench behind, right foot a leg length ahead, the back knee dropping
// straight down until the front thigh is about parallel) done holding suspension straps for assistance instead of the
// dumbbells. Both straps hang from one anchor on a pull-up bar 70 cm in front of the shoulders (rings held items, style
// 'handle', src/gear/bars.js). The base loop is resampled densely; at each key both hands are solved onto their strap's
// sphere about the anchor (constant strap length: taut straps), as close as possible to a chest-height hold that moves with
// the trunk, so the arms straighten a little as the body goes down. The handles are turned in the hand to sit along the
// straps (gear-bars.js ringTiltFit). Authored with the right leg in front. Family gear-g3lower.js (resample, armTo).
const L = require('./lib');
const { V, R, r1, clone } = L;
const G = require('./families/gear-g3lower');
const GB = require('./families/gear-bars');
const H = require('./families/hips');
const EQ = require('./families/equip');
const meta = require('./meta/assisted-bulgarian-split-squat.json');

const base = G.fromBase('dumbbell-bulgarian-split-squat'), contacts = base.contacts;
const { poses, keyframes } = G.resample(base, 0.1);
const W0 = L.fk(poses[keyframes[0].pose], contacts), S0 = V.scale(V.add(W0.shoulder_r.p, W0.shoulder_l.p), 0.5);
const BAR_Y = 225, anchor = [r1(S0[0] + 70), BAR_Y - 3, 0];
const HOLD = { r: [30, -24, 14], l: [30, -24, -14] }; // chest-height hold from the shoulders' midpoint (world, trunk upright)
const len = { r: V.len(V.sub(V.add(S0, HOLD.r), anchor)), l: V.len(V.sub(V.add(S0, HOLD.l), anchor)) };
let prev = null, gripWorst = 0;
for (const k of keyframes) {
  let p = poses[k.pose]; const W = L.fk(p, contacts), S = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
  for (const sd of ['r', 'l']) {
    const h = V.add(S, HOLD[sd]), g = V.add(anchor, V.scale(V.norm(V.sub(h, anchor)), len[sd]));
    const start = clone(p); if (prev) for (const j of [`shoulder_${sd}`, `elbow_${sd}`, `wrist_${sd}`]) start.ch[j] = clone(prev.ch[j]);
    p = G.armTo(start, sd, g, { grip: 'handle', axis: [0, 0, 1], palm: [0.2, -1, 0], contacts, iters: 300, guesses: prev ? null : [[60, 60, 0, 80, 0], [80, 70, -30, 60, 90], [40, 50, 30, 100, 0], [90, 80, 0, 40, 0]] });
    gripWorst = Math.max(gripWorst, p.__err); delete p.__err;
  }
  poses[k.pose] = G.round(p); prev = p;
}
const ex = G.attachMeta(clone(base), meta); ex.poses = poses; ex.keyframes = keyframes;
const tl = R.buildTimeline(ex), D = ex.timeline.duration, Ws = []; for (let i = 0; i <= 120; i++) Ws.push(R.evalPose(L.rig, tl.pose((i / 120) * D), contacts));
const tilt = { r: GB.ringTiltFit(Ws, 'r', anchor), l: GB.ringTiltFit(Ws, 'l', anchor) };
const bar = EQ.pullupBar({ x: anchor[0], height: BAR_Y, width: 120 });
ex.props = [...base.props.filter((p) => p.kind === 'bench'), bar.prop, ...GB.ringProps({ anchors: { r: anchor, l: anchor }, style: 'handle', tilt: { r: tilt.r.tilt, l: tilt.l.tilt } })];
G.kinFromBase(ex, base);
const lp = { strap: [1e9, -1e9], clear: { d: 1e9 } };
Ws.forEach((W, i) => { for (const s of ['r', 'l']) { const st = GB.strap(W, s, anchor); lp.strap = [Math.min(lp.strap[0], st.len), Math.max(lp.strap[1], st.len)]; const c = GB.strapClear(W, s, anchor); if (c.d < lp.clear.d) lp.clear = { d: r1(c.d), id: c.id, t: r1((i / 120) * D) }; } });
const rep = H.loopReport(ex, { planted: ex.checks.plantedContacts });
const set = H.setKin(ex);
set('Straps', 'setup', `One anchor ${BAR_Y - 3} cm high, 70 cm in front of the shoulders; handles at chest height`); set('Straps', 'peak', `Strap length ${r1(lp.strap[0])}-${r1(lp.strap[1])} cm over the loop (taut); handles turned ${r1(tilt.r.tilt)}° in the hand`);
console.log(`Assisted Bulgarian Split Squat: wrote ${L.write(ex)}\n  ${JSON.stringify({ gripErr: +gripWorst.toFixed(2), strap: lp.strap.map(r1), clear: lp.clear, tilt: [tilt.r.worst, tilt.l.worst], floor: rep.floor, slide: rep.slide, knee: rep.kneeR })}`);
if (gripWorst > 0.6) { console.error('FAIL: hands off the strap handles'); process.exitCode = 1; }
if (lp.strap[1] - lp.strap[0] > 1) { console.error('FAIL: strap length changes (slack)'); process.exitCode = 1; }
if (lp.clear.d < -0.5) { console.error('FAIL: strap through the body'); process.exitCode = 1; }
